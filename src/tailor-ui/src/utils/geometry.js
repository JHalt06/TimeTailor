// Simple geometry helpers shared by the editor + builder.
// A reasonable default scale: ~0.25 mm per CSS pixel (≈96 DPI ≈ 0.2646 mm/px).
export const DEFAULT_MM_PER_PX = 0.25; // mm per px
export const pxToMm = (px) => px * DEFAULT_MM_PER_PX;
export const mmToPx = (mm) => Math.round(mm / DEFAULT_MM_PER_PX);
