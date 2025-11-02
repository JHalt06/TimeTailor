import { useEffect, useMemo, useRef, useState } from "react";
import { mmToPx } from "../utils/geometry";

/**
 * Builder preview:
 *  - Always draws movement circle + guides
 *  - If selection parts include image_url + align_meta, draws each layered with its transform
 *  - Accepts either `{movements, dials, straps, hands, crowns, cases}` (objects)
 *    OR legacy `{movements_id, ...}` (in which case we only show the guides/placeholders)
 */
export default function WatchCanvas({ selection = {} }) {
  const cRef = useRef(null);
  const [imgs, setImgs] = useState({}); // { key: HTMLImageElement }

  const movementPart = selection.movements || selection.movements_id || {};
  const dialPart     = selection.dials     || selection.dials_id     || {};
  const strapPart    = selection.straps    || selection.straps_id    || {};
  const handsPart    = selection.hands     || selection.hands_id     || {};
  const crownPart    = selection.crowns    || selection.crowns_id    || {};
  const casePart     = selection.cases     || selection.cases_id     || {};

  const movementMm = Number(movementPart?.align_meta?.movementDiameterMm) ||
                     Number(movementPart?.diameter_mm) || 40;

  const canvasPx = useMemo(() => {
    const px = mmToPx(Math.max(movementMm + 60, 120));
    return { w: px, h: px };
  }, [movementMm]);

  useEffect(() => {
    const c = cRef.current;
    if (c) { c.width = canvasPx.w; c.height = canvasPx.h; }
  }, [canvasPx]);

  // Load any images present
  useEffect(() => {
    const candidates = {
      movements: movementPart,
      cases: casePart,
      dials: dialPart,
      straps: strapPart,
      hands: handsPart,
      crowns: crownPart
    };
    const next = {};
    let pending = 0, cancelled = false;

    Object.entries(candidates).forEach(([k, p]) => {
      if (p?.image_url) {
        pending++;
        const im = new Image();
        im.crossOrigin = "anonymous";
        im.onload = () => { if (!cancelled) { next[k] = im; if (--pending === 0) setImgs(next); } };
        im.onerror = () => { if (!cancelled) { if (--pending === 0) setImgs(next); } };
        im.src = p.image_url;
      }
    });
    if (pending === 0) setImgs({});
    return () => { cancelled = true; };
  }, [movementPart, dialPart, strapPart, handsPart, crownPart, casePart]);

  const center = useMemo(() => ({ x: canvasPx.w / 2, y: canvasPx.h / 2 }), [canvasPx]);

  const drawTemplate = (ctx) => {
    const W = canvasPx.w, H = canvasPx.h;
    ctx.clearRect(0,0,W,H);
    // soft background
    ctx.fillStyle = "#fff";
    ctx.fillRect(0,0,W,H);

    // grid
    ctx.strokeStyle = "#eef2f7";
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 20) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 20) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

    // movement circle
    const r = mmToPx(movementMm) / 2;
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.beginPath();
    ctx.arc(0,0,r,0,Math.PI*2);
    ctx.strokeStyle = "#93c5fd";
    ctx.lineWidth = 2;
    ctx.stroke();

    // strap placeholders when no strap image
    if (!strapPart?.image_url) {
      const barW = mmToPx(Number(strapPart?.width_mm) || 20);
      const barL = Math.min(mmToPx(Number(strapPart?.length_mm) || 80), r);
      ctx.fillStyle = "#fde68a";
      ctx.fillRect(-barW/2, -r-8-barL, barW, barL);
      ctx.fillRect(-barW/2,  r+8,      barW, barL);
    }
    // crown placeholder when no crown
    if (!crownPart?.image_url) {
      const cr = mmToPx(Number(crownPart?.diameter_mm) || 6) / 2;
      ctx.beginPath();
      ctx.arc(r + cr + 8, 0, cr, 0, Math.PI*2);
      ctx.fillStyle = "#fef3c7";
      ctx.strokeStyle = "#fca5a5";
      ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  };

  const drawPart = (ctx, key, part) => {
    const im = imgs[key]; if (!im) return;
    const m = part.align_meta;
    if (!m) return;
    ctx.save();
    ctx.translate(center.x + (m.transform?.offsetPx?.x || 0), center.y + (m.transform?.offsetPx?.y || 0));
    ctx.rotate(((m.transform?.angleDeg || 0) * Math.PI) / 180);
    ctx.scale(m.transform?.scale || 1, m.transform?.scale || 1);
    ctx.drawImage(im, -im.width/2, -im.height/2);
    ctx.restore();
  };

  useEffect(() => {
    const ctx = cRef.current?.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    drawTemplate(ctx);

    // Layering order: case → movement → dial → hands → straps → crown
    drawPart(ctx, "cases", casePart);
    drawPart(ctx, "movements", movementPart);
    drawPart(ctx, "dials", dialPart);
    drawPart(ctx, "hands", handsPart);
    drawPart(ctx, "straps", strapPart);
    drawPart(ctx, "crowns", crownPart);
  }, [imgs, canvasPx, movementMm, center, movementPart, dialPart, strapPart, handsPart, crownPart, casePart]);

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6">
      <h2 className="font-semibold mb-3">Watch Builder</h2>
      <div className="relative rounded-2xl border-2 border-dashed border-gray-200">
        <canvas ref={cRef} className="block w-full" width={canvasPx.w} height={canvasPx.h} />
      </div>
      <div className="mt-4 text-xs text-gray-500">
        {(!movementPart?.image_url && !dialPart?.image_url && !strapPart?.image_url && !handsPart?.image_url && !crownPart?.image_url)
          ? "No parts selected yet."
          : "Preview uses saved alignment metadata from each part."}
      </div>
    </div>
  );
}
