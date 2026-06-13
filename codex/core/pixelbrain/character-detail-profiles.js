import { registerPartProfile } from './part-profile-library.js';
// When adding a profile with shader metadata, also update PART_SHADER_FALLBACK in character-to-svg.js
// if the part's slot name (spec.details[].id) differs from its profile key.

function roundInt(value) {
  return Math.round(Number(value) || 0);
}

function pushCell(cells, x, y, color) {
  cells.push({ x: roundInt(x), y: roundInt(y), ...(color ? { color } : {}) });
}

registerPartProfile('character.detail.robeTrim.snow', (params = {}) => {
  const cx = roundInt(params.cx ?? 16);
  const shoulderY = roundInt(params.shoulderY ?? 13);
  const hemY = roundInt(params.hemY ?? 35);
  const color = params.color || '#e9fbff';
  const cells = [];

  for (let y = shoulderY; y <= hemY; y += 1) {
    if (y % 2 === 0) pushCell(cells, cx, y, color);
  }
  for (let dx = -6; dx <= 6; dx += 1) {
    if (Math.abs(dx) % 2 === 0) pushCell(cells, cx + dx, hemY, color);
  }
  for (const dx of [-5, 5]) {
    for (let y = shoulderY + 2; y <= hemY - 2; y += 4) pushCell(cells, cx + dx, y, color);
  }

  return { cells, anchors: { center: { x: cx, y: shoulderY } } };
}, { shader: 'crystal-rim' });

registerPartProfile('character.detail.eyeGlow', (params = {}) => {
  const cx = roundInt(params.cx ?? 16);
  const y = roundInt(params.y ?? 9);
  const color = params.color || '#42d9ff';
  const cells = [];

  for (const dx of [-2, 2]) {
    pushCell(cells, cx + dx, y, color);
    pushCell(cells, cx + dx, y + 1, '#e9fbff');
  }

  return { cells, anchors: { center: { x: cx, y } } };
}, { shader: 'ice-glow' });

registerPartProfile('character.detail.hairShine', (params = {}) => {
  const cx = roundInt(params.cx ?? 16);
  const topY = roundInt(params.topY ?? 4);
  const color = params.color || '#ffffff';
  const cells = [];

  for (let i = 0; i < 9; i += 1) {
    pushCell(cells, cx - 3 + Math.floor(i / 3), topY + i, color);
  }
  for (let i = 0; i < 7; i += 1) {
    pushCell(cells, cx + 4, topY + 3 + i, color);
  }

  return { cells, anchors: { top: { x: cx, y: topY } } };
}, { shader: 'ice-glow' });

registerPartProfile('character.detail.cheekSigil.snow', (params = {}) => {
  const cx = roundInt(params.cx ?? 16);
  const y = roundInt(params.y ?? 12);
  const color = params.color || '#bfefff';
  const cells = [];

  for (const side of [-1, 1]) {
    pushCell(cells, cx + side * 4, y, color);
    pushCell(cells, cx + side * 5, y + 1, color);
    pushCell(cells, cx + side * 4, y + 2, color);
  }

  return { cells, anchors: { center: { x: cx, y } } };
}, { shader: 'ice-glow' });

