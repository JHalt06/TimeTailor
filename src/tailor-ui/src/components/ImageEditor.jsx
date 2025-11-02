import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Card from "./Card";
import Button from "./Button";
import { mmToPx, DEFAULT_MM_PER_PX } from "../utils/geometry";

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, t) => a + (b - a) * t;

// Load @imgly/background-removal from CDN first; fall back to local if present.
async function loadRemoveBackgroundFn() {
  try {
    const mod = await import("https://cdn.jsdelivr.net/npm/@imgly/background-removal/+esm");
    return mod.removeBackground;
  } catch {}
  const mod = await import(/* @vite-ignore */ "@imgly/background-removal");
  return mod.removeBackground;
}

/**
 * Powerful editor:
 *  • Brush erase/restore with softness + undo/redo and overlay preview
 *  • Rotate / Scale / Drag (pan) the cutout to align with a watch template
 *  • Export PNG + transform/meta so the builder can layer correctly
 *
 * Props:
 *  - type: part type ("movements","dials","straps","hands","crowns","cases")
 *  - form: current part fields (e.g., diameter_mm, width_mm, length_mm)
 *  - onExport: (blob, meta) -> void
 */
export default function ImageEditor({ type = "dials", form = {}, onExport }) {
  const canvasRef = useRef(null);
  const fileRef = useRef(null);

  // -------- image + mask state --------
  const [imageBitmap, setImageBitmap] = useState(null);
  const [imgW, setImgW] = useState(0);
  const [imgH, setImgH] = useState(0);

  // mask arrays are in **image pixel space**
  const [alpha0, setAlpha0] = useState(null);          // Uint8ClampedArray (base alpha)
  const [corr, setCorr] = useState(null);              // Int16Array (+/- adjustments)
  const [strokes, setStrokes] = useState([]);          // undo stack
  const [redos, setRedos] = useState([]);              // redo stack
  const [showOriginal, setShowOriginal] = useState(false);

  // -------- transform state (template space) --------
  const [angle, setAngle] = useState(0);          // degrees
  const [scale, setScale] = useState(1);          // 1 == 100%
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // px from template center

  // drag / brush modes
  const [mode, setMode] = useState("move"); // "move" | "brush"
  const dragRef = useRef({ start: null, at: null });
  const paintRef = useRef({ isDown: false, last: null, stroke: null });

  // UI state
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Load an image to begin.");
  const [brush, setBrush] = useState(40); // px in IMAGE space
  const [soft, setSoft] = useState(65);   // 0..100

  // -------- template geometry --------
  const movementMm = useMemo(() => {
    const v =
      Number(form?.diameter_mm) ||
      Number(form?.movement_diameter_mm) ||
      40;
    return clamp(v, 10, 60);
  }, [form]);

  const dialMm   = useMemo(() => Number(form?.diameter_mm) || movementMm, [form, movementMm]);
  const strapWmm = useMemo(() => Number(form?.width_mm)    || 20, [form]);
  const strapLmm = useMemo(() => Number(form?.length_mm)   || 80, [form]);
  const crownMm  = useMemo(() => Number(form?.crown_diameter_mm) || 6, [form]);

  const canvasPx = useMemo(() => {
    // Square canvas sized around movement + comfortable padding.
    const sceneMm = Math.max(movementMm + 60, 120);
    const px = mmToPx(sceneMm);
    return { w: px, h: px };
  }, [movementMm]);

  const center = useMemo(() => ({ x: canvasPx.w / 2, y: canvasPx.h / 2 }), [canvasPx]);

  // -------- file load / background removal --------
  const readBaseAlpha = async (bmp) => {
    const off = new OffscreenCanvas(bmp.width, bmp.height);
    const c = off.getContext("2d", { willReadFrequently: true });
    c.drawImage(bmp, 0, 0);
    const id = c.getImageData(0, 0, bmp.width, bmp.height);
    const base = new Uint8ClampedArray(bmp.width * bmp.height);
    for (let i = 0, j = 0; i < id.data.length; i += 4, j++) base[j] = id.data[i + 3];
    return base;
  };

  const loadFile = async (f) => {
    setBusy(true); setStatus("Loading image…");
    try {
      const bmp = await createImageBitmap(f);
      setImageBitmap(bmp);
      setImgW(bmp.width); setImgH(bmp.height);
      setAlpha0(await readBaseAlpha(bmp));
      setCorr(new Int16Array(bmp.width * bmp.height));
      setStrokes([]); setRedos([]);
      setAngle(0); setScale(1); setOffset({ x: 0, y: 0 });
      setStatus("Image ready. Optional: Remove background, then align and brush refine.");
    } finally { setBusy(false); }
  };

  const runRemoveBg = async () => {
    if (!imageBitmap) return;
    setBusy(true); setStatus("Removing background… (runs in your browser)");
    try {
      const removeBackground = await loadRemoveBackgroundFn();
      const off = new OffscreenCanvas(imgW, imgH);
      const c = off.getContext("2d");
      c.drawImage(imageBitmap, 0, 0);
      const blob = await off.convertToBlob({ type: "image/png" });
      const out = await removeBackground(blob);
      const cut = await createImageBitmap(out);
      setImageBitmap(cut);
      setAlpha0(await readBaseAlpha(cut));
      setCorr(new Int16Array(cut.width * cut.height));
      setStrokes([]); setRedos([]);
      setStatus("Background removed. Use Brush to restore/erase details.");
    } catch (e) {
      console.error(e);
      setStatus("Error running model (see console).");
    } finally { setBusy(false); }
  };

  // -------- painting in IMAGE space (inverse-transform mouse) --------
  const imageInvMap = (canvasX, canvasY) => {
    // Convert canvas pt → image pixel coords (u,v)
    const x = canvasX - (center.x + offset.x);
    const y = canvasY - (center.y + offset.y);
    const rad = (-angle * Math.PI) / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const xr = (x * cos - y * sin) / scale;
    const yr = (x * sin + y * cos) / scale;
    const u = xr + imgW / 2;
    const v = yr + imgH / 2;
    return { u, v };
  };

  const paintDot = (arr, cx, cy, radius, softPct, sign) => {
    const softK = softPct / 100;
    const x0 = Math.max(0, Math.floor(cx - radius));
    const y0 = Math.max(0, Math.floor(cy - radius));
    const x1 = Math.min(imgW - 1, Math.ceil(cx + radius));
    const y1 = Math.min(imgH - 1, Math.ceil(cy + radius));
    const r2 = radius * radius;

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx, dy = y - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 > r2) continue;
        const d = Math.sqrt(d2) / radius;
        const fall = softK > 0 ? (1 - Math.min(1, (d - (1 - softK)) / (softK || 1e-6))) : 1;
        const idx = y * imgW + x;
        const delta = Math.round(255 * fall) * sign;
        let v = arr[idx] + delta;
        arr[idx] = v < -255 ? -255 : v > 255 ? 255 : v;
      }
    }
  };

  const startPaint = (pt) => {
    paintRef.current.isDown = true;
    paintRef.current.last = pt;
    paintRef.current.stroke = { tool: "restore", radius: brush, soft, points: [pt] };
    const next = new Int16Array(corr);
    const { u, v } = imageInvMap(pt.x, pt.y);
    paintDot(next, u, v, brush, soft, +1); // "restore" adds alpha
    setCorr(next);
  };
  const movePaint = (pt) => {
    const cur = paintRef.current;
    if (!cur.isDown) return;
    const next = new Int16Array(corr);
    const steps = Math.max(1, Math.ceil(Math.hypot(pt.x - cur.last.x, pt.y - cur.last.y) / (brush * 0.5 + 1)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = lerp(cur.last.x, pt.x, t);
      const y = lerp(cur.last.y, pt.y, t);
      const { u, v } = imageInvMap(x, y);
      paintDot(next, u, v, brush, soft, +1); // restore
    }
    cur.last = pt;
    cur.stroke.points.push(pt);
    setCorr(next);
  };
  const endPaint = () => {
    if (!paintRef.current.isDown) return;
    setStrokes((s) => [...s, paintRef.current.stroke]);
    setRedos([]);
    paintRef.current = { isDown: false, last: null, stroke: null };
  };

  const undo = () => {
    if (!strokes.length) return;
    const s = strokes[strokes.length - 1];
    setStrokes(strokes.slice(0, -1));
    setRedos([...redos, s]);
  };
  const redo = () => {
    if (!redos.length) return;
    const s = redos[redos.length - 1];
    setRedos(redos.slice(0, -1));
    setStrokes([...strokes, s]);
  };

  useEffect(() => {
    // rebuild corr from strokes when they change
    if (!alpha0) return;
    const arr = new Int16Array(imgW * imgH);
    for (const s of strokes) {
      for (let i = 1; i < s.points.length; i++) {
        const a = s.points[i - 1], b = s.points[i];
        const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (s.radius * 0.5 + 1)));
        for (let k = 0; k <= steps; k++) {
          const t = k / steps;
          const x = lerp(a.x, b.x, t), y = lerp(a.y, b.y, t);
          const { u, v } = imageInvMap(x, y);
          paintDot(arr, u, v, s.radius, s.soft, +1);
        }
      }
    }
    setCorr(arr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes]); // depend only on strokes

  // -------- composite cutout image (imageBitmap + alpha0 + corr) --------
  const buildCutoutCanvas = useCallback(() => {
    if (!imageBitmap || !alpha0 || !corr) return null;
    const off = new OffscreenCanvas(imgW, imgH);
    const c = off.getContext("2d", { willReadFrequently: true });
    c.clearRect(0, 0, imgW, imgH);
    c.drawImage(imageBitmap, 0, 0);
    const id = c.getImageData(0, 0, imgW, imgH);
    const px = id.data;
    for (let j = 0, p = 0; j < alpha0.length; j++, p += 4) {
      px[p + 3] = clamp(alpha0[j] + corr[j], 0, 255);
    }
    c.putImageData(id, 0, 0);
    return off;
  }, [imageBitmap, alpha0, corr, imgW, imgH]);

  // -------- drawing template + transformed cutout --------
  const getCtx = () => canvasRef.current?.getContext("2d", { willReadFrequently: true });

  const caption = (ctx, x, y, text) => {
    ctx.save();
    ctx.fillStyle = "#374151";
    ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text, x, y);
    ctx.restore();
  };

  const drawTemplate = (ctx) => {
    const W = canvasPx.w, H = canvasPx.h;

    // checker background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.strokeStyle = "#eef2f7";
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.restore();

    const r = mmToPx(movementMm) / 2;
    ctx.save();
    ctx.translate(center.x, center.y);

    // movement circle
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = "#93c5fd";
    ctx.lineWidth = 2;
    ctx.stroke();

    // cross hair
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(-r - 12, 0); ctx.lineTo(r + 12, 0);
    ctx.moveTo(0, -r - 12); ctx.lineTo(0, r + 12);
    ctx.strokeStyle = "#9ca3af";
    ctx.stroke();
    ctx.setLineDash([]);

    // type-specific guides
    if (type === "dials") {
      const rr = mmToPx(dialMm) / 2;
      ctx.beginPath();
      ctx.arc(0, 0, rr, 0, Math.PI * 2);
      ctx.strokeStyle = "#34d399";
      ctx.lineWidth = 2;
      ctx.stroke();
      caption(ctx, 0, rr + 16, `${dialMm} mm dial`);
    }
    if (type === "straps") {
      const barW = mmToPx(strapWmm);
      const barL = Math.min(mmToPx(strapLmm), r);
      ctx.fillStyle = "#fde68a";
      ctx.fillRect(-barW / 2, -r - 8 - barL, barW, barL); // top
      ctx.fillRect(-barW / 2, r + 8, barW, barL);          // bottom
      caption(ctx, 0, -r - barL - 16, `${strapWmm} mm strap`);
    }
    if (type === "crowns") {
      const cr = mmToPx(crownMm) / 2;
      ctx.beginPath();
      ctx.arc(r + cr + 8, 0, cr, 0, Math.PI * 2);
      ctx.strokeStyle = "#fca5a5";
      ctx.lineWidth = 2;
      ctx.stroke();
      caption(ctx, r + cr + 8, cr + 16, `${crownMm} mm crown`);
    }
    if (type === "hands") {
      ctx.beginPath();
      ctx.arc(0, 0, mmToPx(1.5), 0, Math.PI * 2);
      ctx.fillStyle = "#6ee7b7";
      ctx.fill();
      caption(ctx, 0, 24, "pinion");
    }

    ctx.restore();

    ctx.fillStyle = "#6b7280";
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText(`Movement baseline: ${movementMm} mm`, 10, H - 10);
  };

  const redraw = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasPx.w, canvasPx.h);

    // 1) template
    drawTemplate(ctx);

    // 2) transformed cutout
    const cut = buildCutoutCanvas();
    if (cut) {
      ctx.save();
      ctx.translate(center.x + offset.x, center.y + offset.y);
      ctx.rotate((angle * Math.PI) / 180);
      ctx.scale(scale, scale);
      ctx.drawImage(cut, -imgW / 2, -imgH / 2);
      ctx.restore();
    }

    // 3) optional debug overlay
    if (showOriginal && imageBitmap) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.translate(center.x + offset.x, center.y + offset.y);
      ctx.rotate((angle * Math.PI) / 180);
      ctx.scale(scale, scale);
      ctx.drawImage(imageBitmap, -imgW / 2, -imgH / 2);
      ctx.restore();
    }
  }, [canvasPx, buildCutoutCanvas, imageBitmap, imgW, imgH, center, offset, angle, scale, type, movementMm, dialMm, strapWmm, strapLmm, crownMm, showOriginal]);

  useEffect(() => { redraw(); }, [redraw]);

  // -------- pointer handlers --------
  const canvasPt = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e) => {
    if (!imageBitmap) return;
    const p = canvasPt(e);
    if (mode === "move") {
      dragRef.current.start = p;
      dragRef.current.at = { ...offset };
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    } else {
      startPaint(p);
      window.addEventListener("pointermove", onPointerPaintMove);
      window.addEventListener("pointerup", onPointerPaintUp);
    }
  };
  const onPointerMove = (e) => {
    const p = canvasPt(e);
    const dx = p.x - dragRef.current.start.x;
    const dy = p.y - dragRef.current.start.y;
    setOffset({ x: dragRef.current.at.x + dx, y: dragRef.current.at.y + dy });
  };
  const onPointerUp = () => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  };
  const onPointerPaintMove = (e) => movePaint(canvasPt(e));
  const onPointerPaintUp = () => {
    endPaint();
    window.removeEventListener("pointermove", onPointerPaintMove);
    window.removeEventListener("pointerup", onPointerPaintUp);
  };

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.addEventListener("pointerdown", onPointerDown);
    return () => c.removeEventListener("pointerdown", onPointerDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, imageBitmap, offset, angle, scale, brush, soft]);

  // -------- export --------
  const exportPng = async () => {
    const cut = buildCutoutCanvas();
    if (!cut) return;
    const blob = await cut.convertToBlob({ type: "image/png" });
    onExport?.(blob, {
      movementDiameterMm: movementMm,
      templateCanvas: { w: canvasPx.w, h: canvasPx.h, mmPerPx: DEFAULT_MM_PER_PX },
      transform: { angleDeg: angle, scale, offsetPx: { ...offset }, anchor: "center" },
      partHint: { type, dialMm, strap: { widthMm: strapWmm, lengthMm: strapLmm }, crownMm }
    });
  };

  const resetTransform = () => { setOffset({ x: 0, y: 0 }); setScale(1); setAngle(0); };

  return (
    <Card>
      {/* row 1: basics */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/*"
          className="text-sm"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); }}
        />
        <Button onClick={runRemoveBg} disabled={!imageBitmap || busy}>
          {busy ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600"></span>
              Processing…
            </span>
          ) : "Remove Background"}
        </Button>
        <Button onClick={exportPng} disabled={!imageBitmap}>Use This Image</Button>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-xs flex items-center gap-2">
            <input type="checkbox" checked={showOriginal} onChange={e => setShowOriginal(e.target.checked)} />
            Show original overlay
          </label>
          <Button variant="subtle" onClick={resetTransform} disabled={!imageBitmap}>Reset Transform</Button>
        </div>
      </div>

      {/* row 2: transforms + mode */}
      <div className="grid gap-3 sm:grid-cols-3 mb-3">
        <label className="text-sm flex items-center gap-2">
          Rotation
          <input type="range" min="0" max="359" value={angle} onChange={e => setAngle(parseInt(e.target.value, 10))} />
          <span className="w-10 text-right text-xs">{angle}°</span>
        </label>
        <label className="text-sm flex items-center gap-2">
          Scale
          <input type="range" min="10" max="300" value={Math.round(scale * 100)} onChange={e => setScale(parseInt(e.target.value, 10) / 100)} />
          <span className="w-10 text-right text-xs">{Math.round(scale * 100)}%</span>
        </label>
        <div className="text-xs text-gray-600">
          <div>Offset: {Math.round(offset.x)}, {Math.round(offset.y)} px</div>
          <div>Movement: {movementMm} mm</div>
        </div>
      </div>

      {/* row 3: brush controls */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio" name="mode" value="move" checked={mode === "move"}
              onChange={() => setMode("move")}
            /> Move
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio" name="mode" value="brush" checked={mode === "brush"}
              onChange={() => setMode("brush")}
            /> Brush
          </label>
        </div>
        <label className="text-sm">Brush
          <input className="ml-2" type="range" min="3" max="120" value={brush} onChange={e => setBrush(parseInt(e.target.value, 10))} />
        </label>
        <label className="text-sm">Softness
          <input className="ml-2" type="range" min="0" max="100" value={soft} onChange={e => setSoft(parseInt(e.target.value, 10))} />
        </label>
        <Button onClick={undo} disabled={!strokes.length}>Undo</Button>
        <Button onClick={redo} disabled={!redos.length}>Redo</Button>
      </div>

      {/* canvas */}
      <div className="rounded-2xl border border-gray-200 overflow-hidden">
        <canvas
          ref={canvasRef}
          className={`block w-full ${mode === "move" ? "cursor-move" : "cursor-crosshair"} touch-none select-none`}
          width={canvasPx.w}
          height={canvasPx.h}
          style={{
            backgroundImage:
              "linear-gradient(45deg,#f3f4f6 25%,transparent 25%,transparent 75%,#f3f4f6 75%,#f3f4f6),linear-gradient(45deg,#f3f4f6 25%,transparent 25%,transparent 75%,#f3f4f6 75%,#f3f4f6)",
            backgroundSize: "20px 20px",
            backgroundPosition: "0 0,10px 10px",
          }}
        />
      </div>

      <div className="mt-2 text-xs text-gray-500">{status}</div>
    </Card>
  );
}
