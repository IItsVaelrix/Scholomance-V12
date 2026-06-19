import { registerPartProfile } from './part-profile-library.js';
// When adding a profile with shader metadata, also update PART_SHADER_FALLBACK in character-to-svg.js
// if the part's slot name (spec.accessories[].id) differs from its profile key.

function roundInt(value) {
  return Math.round(Number(value) || 0);
}

function pushCell(cells, x, y, color) {
  cells.push({ x: roundInt(x), y: roundInt(y), ...(color ? { color } : {}) });
}

registerPartProfile('character.accessory.halo.ice', (params = {}) => {
  const cx = roundInt(params.cx ?? 16);
  const cy = roundInt(params.cy ?? 2);
  const color = params.color || '#dff6ff';
  const cells = [];

  for (let dx = -5; dx <= 5; dx += 1) {
    if (Math.abs(dx) <= 2) continue;
    pushCell(cells, cx + dx, cy, color);
  }
  for (const dx of [-4, -3, 3, 4]) {
    pushCell(cells, cx + dx, cy - 1, color);
    pushCell(cells, cx + dx, cy + 1, color);
  }

  return { cells, anchors: { center: { x: cx, y: cy } } };
}, { shader: 'ice-glow' });

registerPartProfile('character.accessory.crown.crystal', (params = {}) => {
  const cx = roundInt(params.cx ?? 16);
  const baseY = roundInt(params.baseY ?? 4);
  const color = params.color || '#e9fbff';
  const accent = params.accent || '#42d9ff';
  const cells = [];

  for (let dx = -4; dx <= 4; dx += 1) pushCell(cells, cx + dx, baseY, color);
  for (const dx of [-4, 0, 4]) {
    pushCell(cells, cx + dx, baseY - 1, color);
    pushCell(cells, cx + dx, baseY - 2, accent);
  }
  pushCell(cells, cx, baseY - 3, accent);

  return { cells, anchors: { base: { x: cx, y: baseY } } };
}, { shader: 'crystal-rim' });

registerPartProfile('character.accessory.wings.snow', (params = {}) => {
  const cx = roundInt(params.cx ?? 16);
  const cy = roundInt(params.cy ?? 17);
  const color = params.color || '#edf9ff';
  const shade = params.shade || '#bfefff';
  const cells = [];

  for (const side of [-1, 1]) {
    for (let row = 0; row < 13; row += 1) {
      const span = Math.max(1, 6 - Math.floor(row / 2));
      const y = cy + row - 6;
      const baseX = cx + side * (7 + Math.floor(row / 3));
      for (let i = 0; i < span; i += 1) {
        const x = baseX + side * i;
        pushCell(cells, x, y, i === span - 1 || row % 3 === 0 ? shade : color);
      }
    }
  }

  return { cells, anchors: { center: { x: cx, y: cy } } };
}, { shader: 'ice-glow' });

registerPartProfile('character.accessory.shoulderMantle', (params = {}) => {
  const cx = roundInt(params.cx ?? 16);
  const y = roundInt(params.y ?? 13);
  const color = params.color || '#f4fbff';
  const trim = params.trim || '#d6b35f';
  const cells = [];

  for (let dx = -9; dx <= 9; dx += 1) pushCell(cells, cx + dx, y, trim);
  for (let dy = 1; dy <= 3; dy += 1) {
    const span = 9 - dy;
    for (let dx = -span; dx <= span; dx += 1) pushCell(cells, cx + dx, y + dy, color);
  }

  return { cells, anchors: { center: { x: cx, y } } };
});

registerPartProfile('character.accessory.jewelry.runePendant', (params = {}) => {
  const cx = roundInt(params.cx ?? 16);
  const y = roundInt(params.y ?? 18);
  const chain = params.chain || '#d6b35f';
  const gem = params.gem || '#42d9ff';
  const cells = [];

  for (const [dx, dy] of [[-2, -2], [-1, -1], [0, 0], [1, -1], [2, -2]]) {
    pushCell(cells, cx + dx, y + dy, chain);
  }
  pushCell(cells, cx, y + 1, gem);
  pushCell(cells, cx - 1, y + 2, gem);
  pushCell(cells, cx, y + 2, '#e9fbff');
  pushCell(cells, cx + 1, y + 2, gem);
  pushCell(cells, cx, y + 3, gem);

  return { cells, anchors: { pendant: { x: cx, y: y + 2 } } };
}, { shader: 'crystal-rim' });

registerPartProfile('character.accessory.signalAntenna', (params = {}) => {
  const cx = roundInt(params.cx ?? 16);
  const topY = roundInt(params.topY ?? 2);
  const stem = params.stem || 'trim_comet_gold';
  const signal = params.signal || 'neon_mint_signal';
  const cells = [];

  for (let i = 1; i < 5; i += 1) {
    pushCell(cells, cx - 2 - i, topY - i, stem);
    pushCell(cells, cx + 2 + i, topY - i, stem);
  }
  for (const side of [-1, 1]) {
    const sx = cx + side * 7;
    const sy = topY - 5;
    pushCell(cells, sx, sy, signal);
    pushCell(cells, sx - side, sy, signal);
    pushCell(cells, sx, sy - 1, signal);
    pushCell(cells, sx + side, sy + 1, signal);
  }

  return { cells, anchors: { center: { x: cx, y: topY - 3 } } };
}, { shader: 'ice-glow' });

registerPartProfile('character.accessory.starVisor', (params = {}) => {
  const cx = roundInt(params.cx ?? 16);
  const y = roundInt(params.y ?? 10);
  const frame = params.frame || 'trim_comet_gold';
  const lens = params.lens || 'neon_mint_signal';
  const cells = [];

  for (let dx = -6; dx <= 6; dx += 1) pushCell(cells, cx + dx, y, frame);
  for (const dx of [-5, -4, -3, 3, 4, 5]) pushCell(cells, cx + dx, y + 1, lens);
  pushCell(cells, cx - 2, y + 1, frame);
  pushCell(cells, cx + 2, y + 1, frame);

  return { cells, anchors: { center: { x: cx, y } } };
}, { shader: 'crystal-rim' });
