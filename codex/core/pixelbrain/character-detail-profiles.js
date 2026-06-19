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

registerPartProfile('character.detail.jacketConstellation', (params = {}) => {
  const cx = roundInt(params.cx ?? 16);
  const shoulderY = roundInt(params.shoulderY ?? 21);
  const color = String(params.color || '').startsWith('#') ? params.color : '#56F0C8';
  const gold = String(params.gold || '').startsWith('#') ? params.gold : '#D99A2B';
  const cells = [];

  for (const [dx, dy] of [[0, 2], [-1, 3], [1, 3], [0, 4], [0, 6]]) {
    pushCell(cells, cx + dx, shoulderY + dy, color);
  }
  for (const [dx, dy] of [[-1, 4], [0, 4], [1, 4], [0, 5], [0, 6]]) {
    pushCell(cells, cx + dx, shoulderY + dy, gold);
  }

  return { cells, anchors: { center: { x: cx, y: shoulderY + 4 } } };
}, { shader: 'ice-glow' });

registerPartProfile('character.detail.cheekPixelBlush', (params = {}, options = {}) => {
  const cx = roundInt(params.cx ?? 16);
  const y = roundInt(params.y ?? 14);
  const color = params.color || '#F08A78';
  const direction = String(options.direction || 'south');
  const cells = [];

  // Profile views: only the near cheek (facing the viewer) is visible
  const sides = direction === 'east' ? [1]
    : direction === 'west' ? [-1]
    : [-1, 1];

  for (const side of sides) {
    pushCell(cells, cx + side * 5, y, color);
    pushCell(cells, cx + side * 6, y, color);
    pushCell(cells, cx + side * 5, y + 1, color);
  }

  return { cells, anchors: { center: { x: cx, y } } };
});

// Flat oval shadow placed 2px below the ankle — sits on the ground plane.
// Uses an explicit dark color so it bypasses the material ramp and always
// renders as a fixed void-tinted dark, regardless of character skin/school.
registerPartProfile('character.detail.castShadow', (params = {}, options = {}) => {
  const cx = roundInt(params.cx ?? 16);
  const direction = String(options.direction || 'south');
  const bodyAnchors = options.bodyAnchors || {};
  const ankleY = bodyAnchors.ankleL?.y ?? 40;
  // footBot = ankleY + 1; shadow starts 2px below that
  const shadowTopY = ankleY + 3;
  const color = params.color || '#1c1c2e';
  const cells = [];

  // Narrower in profile — the ground ellipse foreshortens on a side view
  const isProfile = direction === 'east' || direction === 'west';
  const halfWidths = isProfile
    ? [1, 2, 2, 1]
    : [2, 3, 3, 2];

  for (let row = 0; row < halfWidths.length; row += 1) {
    const halfW = halfWidths[row];
    const y = shadowTopY + row;
    for (let dx = -halfW; dx <= halfW; dx += 1) {
      pushCell(cells, cx + dx, y, color);
    }
  }

  return { cells, anchors: {} };
});
