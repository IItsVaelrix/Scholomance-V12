/** Order boundary cells into a deterministic contour by angle about centroid. */
export function traceContour(cells) {
  if (!Array.isArray(cells) || cells.length === 0) return [];

  const unique = new Map();
  for (const cell of cells) {
    const x = Math.round(cell.snappedX ?? cell.x);
    const y = Math.round(cell.snappedY ?? cell.y);
    unique.set(`${x},${y}`, { x, y });
  }

  const points = [...unique.values()];
  const cx = points.reduce((sum, cell) => sum + cell.x, 0) / points.length;
  const cy = points.reduce((sum, cell) => sum + cell.y, 0) / points.length;

  return points
    .map((cell) => ({
      cell,
      angle: Math.atan2(cell.y - cy, cell.x - cx),
      radius: (cell.x - cx) ** 2 + (cell.y - cy) ** 2,
    }))
    .sort((left, right) => (
      left.angle - right.angle
      || left.radius - right.radius
      || left.cell.x - right.cell.x
      || left.cell.y - right.cell.y
    ))
    .map(({ cell }) => [cell.x, cell.y]);
}

function contourLine(contour) {
  return contour.map(([x, y]) => `${x},${y}`).join(' ');
}

/** Emit a SILH_START..SILH_END form block. Animation is authored separately. */
export function buildSilhFormBlock({ id, source = 'scanned', grid, tolerance, views }) {
  const lines = [
    'SILH_START',
    `ID ${id}`,
    `SOURCE ${source}`,
    `GRID ${grid.width} ${grid.height} ${grid.depth}`,
    'SNAP integer',
    `TOLERANCE front ${tolerance.front} side ${tolerance.side} top ${tolerance.top}`,
  ];

  for (const view of ['front', 'side', 'top']) {
    lines.push(`VIEW ${view}`);
    lines.push(`CONTOUR ${contourLine(views[view])}`);
  }

  lines.push(
    'CONSTRAINT DETERMINISTIC true',
    'QA INVARIANT shadows-match-blueprint',
    'QA INVARIANT digest-stable',
    'SILH_END',
  );

  return `${lines.join('\n')}\n`;
}
