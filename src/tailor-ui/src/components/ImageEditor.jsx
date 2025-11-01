import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Card from "./Card"
import Button from "./Button"

const clamp = (v, lo, hi) => (v < lo ? lo : (v > hi ? hi : v))
const lerp = (a,b,t) => a + (b - a) * t

// Prefer CDN (no bundling) and only fall back to local with @vite-ignore
async function loadRemoveBackgroundFn() {
  // 1) CDN path (works without installing anything)
  try {
    const mod = await import("https://cdn.jsdelivr.net/npm/@imgly/background-removal/+esm")
    return mod.removeBackground
  } catch (e) {
    console.warn("CDN load failed, trying local package…", e)
  }
  // 2) Local package (only if installed) – tell Vite not to analyze this import
  try {
    const mod = await import(/* @vite-ignore */ "@imgly/background-removal")
    return mod.removeBackground
  } catch (e2) {
    console.error("Local package load failed:", e2)
    throw new Error("Could not load @imgly/background-removal from CDN or local install.")
  }
}

export default function ImageEditor({ onExportPng }) {
  const canvasRef = useRef(null)
  const fileRef = useRef(null)

  const [file, setFile] = useState(null)
  const [status, setStatus] = useState("Load an image to begin.")
  const [busy, setBusy] = useState(false)
  const [tool, setTool] = useState("restore") // restore | erase
  const [brush, setBrush] = useState(40)
  const [soft, setSoft] = useState(65) // 0..100
  const [showOriginal, setShowOriginal] = useState(false)

  const [W, setW] = useState(0)
  const [H, setH] = useState(0)
  const [imageBitmap, setImageBitmap] = useState(null)
  const [alpha0, setAlpha0] = useState(null)         // Uint8 base alpha
  const [corr, setCorr] = useState(null)             // Int16 corrections
  const [strokes, setStrokes] = useState([])         // undo stack
  const [redos, setRedos] = useState([])             // redo stack

  const paintingRef = useRef({ isPainting: false, last: null, curStroke: null })

  const ctx = useMemo(() => {
    const c = canvasRef.current
    return c ? c.getContext("2d", { willReadFrequently: true }) : null
  }, [canvasRef.current])

  const setCanvasSize = (nw, nh) => {
    const MAX = 1600
    let w = nw, h = nh
    if (w > MAX || h > MAX) {
      const s = Math.min(MAX/w, MAX/h)
      w = Math.round(w*s); h = Math.round(h*s)
    }
    const c = canvasRef.current
    c.width = w; c.height = h
    setW(w); setH(h)
  }

  const drawChecker = (dstCtx, w, h) => {
    const s = 16
    dstCtx.fillStyle = '#f8fafc'
    dstCtx.fillRect(0,0,w,h)
    for (let y=0; y<h; y+=s) {
      for (let x=0; x<w; x+=s) {
        dstCtx.fillStyle = ((x/s + y/s) % 2) < 1 ? '#eef2f7' : '#e9eef6'
        dstCtx.fillRect(x,y,s,s)
      }
    }
  }

  const compositeToCanvas = useCallback(() => {
    if (!ctx || !imageBitmap || !alpha0 || !corr) return
    const off = new OffscreenCanvas(W, H)
    const octx = off.getContext("2d", { willReadFrequently: true })
    octx.clearRect(0,0,W,H)
    octx.drawImage(imageBitmap, 0,0,W,H)
    const id = octx.getImageData(0,0,W,H)
    const px = id.data
    for (let j=0, p=0; j<alpha0.length; j++, p+=4) px[p+3] = clamp(alpha0[j] + corr[j], 0, 255)
    octx.putImageData(id, 0, 0)

    drawChecker(ctx, W, H)
    ctx.drawImage(off, 0,0)

    if (showOriginal) {
      ctx.globalAlpha = 1.0
      ctx.drawImage(imageBitmap, 0,0,W,H)
      const heat = new OffscreenCanvas(W,H)
      const hctx = heat.getContext('2d', { willReadFrequently: true })
      const mask = hctx.createImageData(W,H)
      const m = mask.data
      for (let j=0, p=0; j<alpha0.length; j++, p+=4) {
        const a = clamp(alpha0[j] + corr[j], 0, 255)
        const missing = 255 - a
        m[p+0] = 30; m[p+1] = 120; m[p+2] = 255; m[p+3] = Math.round(missing * 0.5)
      }
      hctx.putImageData(mask,0,0)
      ctx.drawImage(heat, 0,0)
    }
  }, [ctx, imageBitmap, alpha0, corr, W, H, showOriginal])

  const rebuildFromStrokes = useCallback(() => {
    if (!alpha0) return
    const c = new Int16Array(W * H)

    const paintDot = (cx, cy, r, softK, sign) => {
      const x0 = Math.max(0, Math.floor(cx-r))
      const y0 = Math.max(0, Math.floor(cy-r))
      const x1 = Math.min(W-1, Math.ceil(cx+r))
      const y1 = Math.min(H-1, Math.ceil(cy+r))
      const r2 = r*r
      for (let y=y0; y<=y1; y++){
        for (let x=x0; x<=x1; x++){
          const dx = x - cx, dy = y - cy
          const d2 = dx*dx + dy*dy; if (d2 > r2) continue
          const d = Math.sqrt(d2)/r
          const fall = softK>0 ? (1 - Math.min(1, (d - (1-softK)) / (softK || 1e-6))) : 1
          const idx = y*W + x
          const delta = Math.round(255 * fall) * sign
          let v = c[idx] + delta
          c[idx] = v < -255 ? -255 : (v > 255 ? 255 : v)
        }
      }
    }

    const applySegment = (a, b, sTool, radius, softPct) => {
      const softK = softPct / 100
      const sign = (sTool === 'restore') ? +1 : -1
      const step = Math.hypot(b.x-a.x, b.y-a.y) / (radius*0.5+1)
      const steps = Math.max(1, Math.ceil(step))
      for (let i=0; i<=steps; i++){
        const t = i/steps
        const x = lerp(a.x,b.x,t), y = lerp(a.y,b.y,t)
        paintDot(x,y,radius,softK,sign)
      }
    }

    for (const s of strokes) {
      for (let i=1; i<s.points.length; i++) {
        applySegment(s.points[i-1], s.points[i], s.tool, s.radius, s.soft)
      }
    }
    setCorr(c)
  }, [alpha0, strokes, W, H])

  useEffect(() => { compositeToCanvas() }, [corr, imageBitmap, alpha0, W, H, compositeToCanvas])

  const loadFile = async (f) => {
    setBusy(true); setStatus("Loading image…")
    try {
      const bmp = await createImageBitmap(f)
      setCanvasSize(bmp.width, bmp.height)
      setImageBitmap(bmp)

      // initial base alpha (supports transparent uploads)
      const tmp = new OffscreenCanvas(canvasRef.current.width, canvasRef.current.height)
      const tctx = tmp.getContext('2d', { willReadFrequently: true })
      tctx.drawImage(bmp, 0,0, tmp.width, tmp.height)
      const id = tctx.getImageData(0,0,tmp.width,tmp.height)
      const base = new Uint8ClampedArray(tmp.width * tmp.height)
      for (let i=0, j=0; i<id.data.length; i+=4, j++) base[j] = id.data[i+3]
      setAlpha0(base)
      setCorr(new Int16Array(tmp.width * tmp.height))
      setStrokes([]); setRedos([])
      setStatus("Image ready. Click “Remove Background”.")
    } finally {
      setBusy(false)
    }
  }

  const runRemoveBg = async () => {
    if (!file && !imageBitmap) return
    setBusy(true); setStatus("Removing background… (model runs in your browser)")
    try {
      const removeBackground = await loadRemoveBackgroundFn()
      const inputBlob =
        file ||
        (canvasRef.current.convertToBlob
          ? await canvasRef.current.convertToBlob({ type: "image/png" })
          : await new Promise(r => canvasRef.current.toBlob(r, "image/png")))
      const out = await removeBackground(inputBlob)
      const cutout = await createImageBitmap(out)

      // Extract alpha from cutout at preview size
      const tmp = new OffscreenCanvas(W,H)
      const tctx = tmp.getContext('2d', { willReadFrequently: true })
      tctx.drawImage(cutout, 0,0,W,H)
      const id = tctx.getImageData(0,0,W,H)
      const arr = new Uint8ClampedArray(W*H)
      for (let i=0, j=0; i<id.data.length; i+=4, j++) arr[j] = id.data[i+3]
      setAlpha0(arr)
      setCorr(new Int16Array(W*H))
      setStrokes([]); setRedos([])
      setStatus("Background removed. Use Restore/Erase to fine-tune.")
    } catch (e) {
      console.error(e)
      setStatus("Error running model (check console).")
    } finally {
      setBusy(false)
    }
  }

  const exportPng = async () => {
    if (!alpha0 || !imageBitmap) return
    const off = new OffscreenCanvas(W,H)
    const octx = off.getContext('2d', { willReadFrequently: true })
    octx.drawImage(imageBitmap, 0,0,W,H)
    const id = octx.getImageData(0,0,W,H)
    const px = id.data
    for (let j=0, p=0; j<alpha0.length; j++, p+=4) px[p+3] = clamp(alpha0[j] + corr[j], 0, 255)
    octx.putImageData(id,0,0)
    const blob = await off.convertToBlob({ type:'image/png' })
    onExportPng?.(blob)
  }

  const getPt = (e) => {
    const r = canvasRef.current.getBoundingClientRect()
    return {
      x: (e.clientX - r.left) * (W / r.width),
      y: (e.clientY - r.top) * (H / r.height),
    }
  }

  const applySegment = (a, b, sTool, radius, softPct, corrArr) => {
    const softK = softPct / 100
    const sign = (sTool === 'restore') ? +1 : -1
    const step = Math.hypot(b.x-a.x, b.y-a.y) / (radius*0.5+1)
    const steps = Math.max(1, Math.ceil(step))

    const paintDot = (cx, cy) => {
      const x0 = Math.max(0, Math.floor(cx-radius))
      const y0 = Math.max(0, Math.floor(cy-radius))
      const x1 = Math.min(W-1, Math.ceil(cx+radius))
      const y1 = Math.min(H-1, Math.ceil(cy+radius))
      const r2 = radius*radius
      for (let y=y0; y<=y1; y++){
        for (let x=x0; x<=x1; x++){
          const dx = x - cx, dy = y - cy
          const d2 = dx*dx + dy*dy; if (d2 > r2) continue
          const d = Math.sqrt(d2)/radius
          const fall = softK>0 ? (1 - Math.min(1, (d - (1-softK)) / (softK || 1e-6))) : 1
          const idx = y*W + x
          const delta = Math.round(255 * fall) * sign
          let v = corrArr[idx] + delta
          corrArr[idx] = v < -255 ? -255 : (v > 255 ? 255 : v)
        }
      }
    }

    for (let i=0; i<=steps; i++){
      const t = i/steps
      paintDot(lerp(a.x,b.x,t), lerp(a.y,b.y,t))
    }
  }

  const onDown = (e) => {
    if (!alpha0) return
    const pt = getPt(e)
    paintingRef.current.isPainting = true
    paintingRef.current.last = pt
    paintingRef.current.curStroke = { tool, radius: brush, soft, points: [pt] }
    const next = new Int16Array(corr)
    applySegment(pt, pt, tool, brush, soft, next)
    setCorr(next)
  }
  const onMove = (e) => {
    if (!paintingRef.current.isPainting) return
    const pt = getPt(e)
    const cur = paintingRef.current
    const next = new Int16Array(corr)
    applySegment(cur.last, pt, cur.curStroke.tool, cur.curStroke.radius, cur.curStroke.soft, next)
    cur.last = pt
    cur.curStroke.points.push(pt)
    setCorr(next)
  }
  const onUp = () => {
    if (!paintingRef.current.isPainting) return
    const cur = paintingRef.current
    setStrokes(prev => [...prev, cur.curStroke])
    setRedos([])
    paintingRef.current = { isPainting:false, last:null, curStroke:null }
  }

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    c.addEventListener('pointerdown', onDown)
    c.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      c.removeEventListener('pointerdown', onDown)
      c.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [alpha0, corr, tool, brush, soft])

  const undo = () => { if (!strokes.length) return; const s = strokes[strokes.length-1]; setStrokes(strokes.slice(0,-1)); setRedos([...redos, s]); }
  const redo = () => { if (!redos.length) return; const s = redos[redos.length-1]; setRedos(redos.slice(0,-1)); setStrokes([...strokes, s]); }
  useEffect(() => { rebuildFromStrokes() }, [strokes])
  useEffect(() => { if (alpha0) compositeToCanvas() }, [alpha0])

  const resetMask = () => {
    if (!alpha0) return
    setStrokes([]); setRedos([]); setCorr(new Int16Array(W*H))
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/*"
          className="text-sm"
          onChange={(e) => { const f = e.target.files?.[0]; if (f){ setFile(f); loadFile(f) } }}
        />
        <Button onClick={runRemoveBg} disabled={!imageBitmap || busy}>
          {busy ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600"></span>
              Processing…
            </span>
          ) : "Remove Background"}
        </Button>
        <Button onClick={exportPng} disabled={!alpha0}>Use This Image</Button>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-xs flex items-center gap-2">
            <input type="checkbox" checked={showOriginal} onChange={e=>setShowOriginal(e.target.checked)} />
            Show original overlay
          </label>
          <Button variant="subtle" onClick={resetMask} disabled={!alpha0}>Reset</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="tool" value="restore" checked={tool==='restore'} onChange={()=>setTool('restore')} />
            Restore
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="tool" value="erase" checked={tool==='erase'} onChange={()=>setTool('erase')} />
            Erase
          </label>
        </div>
        <label className="text-sm">Brush
          <input className="ml-2" type="range" min="3" max="120" value={brush} onChange={e=>setBrush(parseInt(e.target.value,10))} />
        </label>
        <label className="text-sm">Softness
          <input className="ml-2" type="range" min="0" max="100" value={soft} onChange={e=>setSoft(parseInt(e.target.value,10))} />
        </label>
        <Button onClick={undo} disabled={!strokes.length}>Undo</Button>
        <Button onClick={redo} disabled={!redos.length}>Redo</Button>
      </div>

      <div className="rounded-2xl border border-gray-200 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="block w-full"
          width={W}
          height={H}
          style={{
            backgroundImage:
              "linear-gradient(45deg,#f3f4f6 25%,transparent 25%,transparent 75%,#f3f4f6 75%,#f3f4f6),linear-gradient(45deg,#f3f4f6 25%,transparent 25%,transparent 75%,#f3f4f6 75%,#f3f4f6)",
            backgroundSize: "20px 20px",
            backgroundPosition: "0 0,10px 10px"
          }}
        />
      </div>

      <div className="mt-2 text-xs text-gray-500">{status}</div>
    </Card>
  )
}
