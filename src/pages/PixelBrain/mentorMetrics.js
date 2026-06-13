/**
 * MENTOR METRICS — pure heuristics for the MentorCritiquePanel.
 *
 * Accepts either a layered template grid (cells in `layers[].cells` Maps),
 * a packet-like object with `coordinates` / `geometry.coordinates`, or a
 * plain coordinate array. Kept free of React and adapter imports so the
 * panel stays presentation-only and the heuristics stay unit-testable.
 *
 * (Savage-audit regression: the panel previously read only `.coordinates`
 * while the page passed a layered grid, so every critique ran on zero
 * coordinates and produced the identical canned diagnosis.)
 */

function collectCoords(gridOrCoords) {
  if (Array.isArray(gridOrCoords)) return gridOrCoords;
  if (!gridOrCoords || typeof gridOrCoords !== 'object') return [];

  if (Array.isArray(gridOrCoords.layers) && gridOrCoords.layers.length > 0) {
    const coords = [];
    for (const layer of gridOrCoords.layers) {
      if (!layer || layer.visible === false) continue;
      if (!layer.cells || typeof layer.cells.forEach !== 'function') continue;
      layer.cells.forEach(cell => coords.push(cell));
    }
    return coords;
  }

  return gridOrCoords.coordinates
    || gridOrCoords.geometry?.coordinates
    || [];
}

export function computeMentorMetrics(gridOrCoords, analysis) {
  const coords = collectCoords(gridOrCoords);
  const count = coords.length || 0;
  const hasSym = !!(
    analysis?.composition?.hasSymmetry
    || analysis?.symmetry
    || (Array.isArray(gridOrCoords?.symmetryAxes) && gridOrCoords.symmetryAxes.length > 0)
  );

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  coords.forEach(c => {
    const x = c.snappedX ?? c.x ?? 0;
    const y = c.snappedY ?? c.y ?? 0;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  });
  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);
  const aspect = w / h;
  const compact = count > 0 ? (count / (w * h + 1)) : 0;

  // Drift is measured against the actual grid centre when the caller
  // provides one; 32 is only the fallback for bare coordinate arrays.
  const centerRef = Number.isFinite(gridOrCoords?.width)
    ? (gridOrCoords.width - 1) / 2
    : 32;

  return {
    coordCount: count,
    aspect: Number(aspect.toFixed(2)),
    compact: Number(compact.toFixed(3)),
    hasSymmetry: hasSym,
    weakSilhouette: aspect < 0.7 || aspect > 1.45 || compact < 0.08,
    likelyCenterDrift: !hasSym || (count > 0 && Math.abs((minX + maxX) / 2 - centerRef) > 1.5),
  };
}
