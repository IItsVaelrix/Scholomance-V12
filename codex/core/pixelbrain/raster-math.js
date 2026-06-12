/**
 * raster-math.js
 * Universal rasterization primitives for drawing vector-like shapes onto the PixelBrain grid.
 */

export function rasterLine(x0, y0, x1, y1, emit) {
  let x = Math.round(x0);
  let y = Math.round(y0);
  const endX = Math.round(x1);
  const endY = Math.round(y1);
  const dx = Math.abs(endX - x);
  const dy = -Math.abs(endY - y);
  const sx = x < endX ? 1 : -1;
  const sy = y < endY ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    emit(x, y);
    if (x === endX && y === endY) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}

export function rasterArc(cx, cy, r, emit, startAngle = 0, endAngle = Math.PI * 2) {
  const steps = Math.max(8, Math.ceil(r * Math.PI * 2 * 2)); 
  for (let i = 0; i <= steps; i++) {
    const angle = startAngle + (endAngle - startAngle) * (i / steps);
    const x = Math.round(cx) + Math.round(Math.cos(angle) * r);
    const y = Math.round(cy) + Math.round(Math.sin(angle) * r);
    emit(x, y);
  }
}

export function rasterCircle(cx, cy, r, emit) {
  rasterArc(cx, cy, r, emit, 0, Math.PI * 2);
}

export function rasterPolygon(points, emit) {
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    rasterLine(p1[0], p1[1], p2[0], p2[1], emit);
  }
}

export function rasterPath(points, emit) {
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    rasterLine(p1[0], p1[1], p2[0], p2[1], emit);
  }
}
