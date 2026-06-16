// Three light levels per material: top (brightest), left (mid), right (darkest)
const MATERIAL_COLORS = {
  top:   { 1: '#6b7280', 2: '#9ca3af', 3: '#d1d5db', 4: '#bae6fd' },
  left:  { 1: '#374151', 2: '#4b5563', 3: '#6b7280', 4: '#7dd3fc' },
  right: { 1: '#1f2937', 2: '#374151', 3: '#4b5563', 4: '#38bdf8' },
};

function facePoints(face, tileSize) {
  const { type, sx, sy } = face;
  const hw = tileSize;
  const hh = tileSize / 2;
  const fh = tileSize;

  switch (type) {
    case 'top':
      return [[sx, sy], [sx + hw, sy + hh], [sx, sy + 2 * hh], [sx - hw, sy + hh]];
    case 'left':
      return [[sx - hw, sy + hh], [sx, sy + 2 * hh], [sx, sy + 2 * hh + fh], [sx - hw, sy + hh + fh]];
    case 'right':
      return [[sx, sy + 2 * hh], [sx + hw, sy + hh], [sx + hw, sy + hh + fh], [sx, sy + 2 * hh + fh]];
    default:
      return [];
  }
}

export function renderFacesToSVG(faces, options = {}) {
  const { tileSize = 16, padding = 40, background = '#0f172a' } = options;

  if (faces.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1" width="1" height="1"></svg>`;
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const face of faces) {
    for (const [px, py] of facePoints(face, tileSize)) {
      if (px < minX) minX = px;
      if (py < minY) minY = py;
      if (px > maxX) maxX = px;
      if (py > maxY) maxY = py;
    }
  }

  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;
  const ox = -minX + padding;
  const oy = -minY + padding;

  const polys = faces
    .map(face => {
      const fill = MATERIAL_COLORS[face.type]?.[face.materialId];
      if (!fill) return '';
      const pts = facePoints(face, tileSize)
        .map(([px, py]) => `${px + ox},${py + oy}`)
        .join(' ');
      return `  <polygon points="${pts}" fill="${fill}" />`;
    })
    .filter(Boolean)
    .join('\n');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
    `  <rect width="${width}" height="${height}" fill="${background}" />`,
    polys,
    `</svg>`,
  ].join('\n');
}
