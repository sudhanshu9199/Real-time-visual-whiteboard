import * as fabric from "fabric";

// ─── Unique ID helper ────────────────────────────────────────────────────────
export const uid = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// ─── Arrow shape factory ──────────────────────────────────────────────────────
export const createArrowGroup = (x1, y1, x2, y2, color, strokeWidth) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const headSize = Math.max(12, strokeWidth * 4);

  const line = new fabric.Line([x1, y1, x2, y2], {
    stroke: color,
    strokeWidth,
    selectable: false,
    evented: false,
  });

  const head = new fabric.Triangle({
    left: x2,
    top: y2,
    originX: "center",
    originY: "center",
    width: headSize,
    height: headSize,
    fill: color,
    angle: angle + 90,
    selectable: false,
    evented: false,
  });

  return new fabric.Group([line, head], {
    selectable: true,
    hasControls: true,
    hasBorders: true,
  });
};
