// Three light levels per material: top (brightest), left (mid), right (darkest)
const MATERIAL_COLORS = {
  top:   { 1: '#6b7280', 2: '#9ca3af', 3: '#d1d5db', 4: '#bae6fd' },
  left:  { 1: '#374151', 2: '#4b5563', 3: '#6b7280', 4: '#7dd3fc' },
  right: { 1: '#1f2937', 2: '#374151', 3: '#4b5563', 4: '#38bdf8' },
};

function clamp01(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function hexToRgb(hex) {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  const toHex = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function applyAmbientOcclusion(hex, ao, strength) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const factor = 1 - clamp01(ao) * Math.max(0, Math.min(0.9, strength));
  return rgbToHex({
    r: rgb.r * factor,
    g: rgb.g * factor,
    b: rgb.b * factor,
  });
}

function applyLighting(hex, light, strength) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const factor = 1 + (clamp01(light) - 0.5) * 2 * Math.max(0, Math.min(1.5, strength));
  return rgbToHex({
    r: rgb.r * factor,
    g: rgb.g * factor,
    b: rgb.b * factor,
  });
}

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
  const {
    tileSize = 16,
    padding = 40,
    background = '#0f172a',
    materialColors = MATERIAL_COLORS,
    ambientOcclusion = true,
    ambientOcclusionStrength = 0.42,
    lighting = true,
    lightingStrength = 0.32,
    antialias = false,
  } = options;

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
      const baseFill = materialColors[face.type]?.[face.materialId];
      const aoFill = ambientOcclusion
        ? applyAmbientOcclusion(baseFill, face.ao ?? 0, ambientOcclusionStrength)
        : baseFill;
      const fill = lighting
        ? applyLighting(aoFill, face.light ?? 0.5, lightingStrength)
        : aoFill;
      if (!fill) return '';
      const pts = facePoints(face, tileSize)
        .map(([px, py]) => `${px + ox},${py + oy}`)
        .join(' ');
      const edgeBlend = antialias
        ? ` stroke="${fill}" stroke-width="${Math.max(0.25, tileSize * 0.035).toFixed(3)}" stroke-linejoin="round"`
        : '';
      return `  <polygon points="${pts}" fill="${fill}"${edgeBlend} />`;
    })
    .filter(Boolean)
    .join('\n');

  const renderHints = antialias
    ? ' style="shape-rendering: geometricPrecision; text-rendering: geometricPrecision;"'
    : '';

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"${renderHints}>`,
    `  <rect width="${width}" height="${height}" fill="${background}" />`,
    polys,
    `</svg>`,
  ].join('\n');
}
