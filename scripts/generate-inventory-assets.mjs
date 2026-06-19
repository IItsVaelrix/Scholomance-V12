import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { renderPng } from '../codex/core/pixelbrain/item-foundry.js';
import { createPixelBrainAssetPacket } from '../codex/core/pixelbrain/pixelbrain-asset-packet.js';
import { buildPixelBrainGodotExport } from '../src/lib/godot-export/pixelbrainGodotExport.js';
import { routeRetinaPacketToPhotonicBridge } from '../src/lib/photonic-retina/index.js';

const OUT_DIR = resolve('output/foundry/scholomance-inventory');
const GODOT_DIR = resolve('godot_project/assets/inventory');

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(GODOT_DIR, { recursive: true });

const PALETTE = {
  void: '#050611',
  panel: '#0b0d1a',
  panelMid: '#121728',
  blue: '#63e6ff',
  blueDim: '#16788c',
  violet: '#7b6cff',
  violetDim: '#2b225d',
  gold: '#d49f55',
  goldDim: '#6f431d',
  silver: '#d9fbff',
  ink: '#02030a',
};

function put(coords, x, y, color, meta = {}) {
  coords.push({ x, y, snappedX: x, snappedY: y, color, ...meta });
}

function rect(coords, x, y, w, h, color, meta = {}) {
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) put(coords, xx, yy, color, meta);
  }
}

function border(coords, x, y, w, h, color, thickness = 1, meta = {}) {
  rect(coords, x, y, w, thickness, color, meta);
  rect(coords, x, y + h - thickness, w, thickness, color, meta);
  rect(coords, x, y, thickness, h, color, meta);
  rect(coords, x + w - thickness, y, thickness, h, color, meta);
}

function diagonal(coords, x0, y0, len, color, meta = {}) {
  for (let i = 0; i < len; i += 1) put(coords, x0 + i, y0 + i, color, meta);
}

function makePanel() {
  const coords = [];
  rect(coords, 0, 0, 640, 420, PALETTE.ink, { layer: 'shadow' });
  rect(coords, 8, 8, 624, 404, PALETTE.panel, { layer: 'panel' });
  rect(coords, 22, 52, 596, 336, PALETTE.panelMid, { layer: 'well' });
  border(coords, 8, 8, 624, 404, PALETTE.violetDim, 3, { layer: 'rim' });
  border(coords, 14, 14, 612, 392, PALETTE.blueDim, 1, { layer: 'inner-rim' });
  border(coords, 22, 52, 596, 336, PALETTE.goldDim, 1, { layer: 'slot-field' });

  for (let x = 34; x < 606; x += 18) {
    put(coords, x, 28, PALETTE.blue, { layer: 'photonic-tick' });
    put(coords, x + 1, 28, PALETTE.blueDim, { layer: 'photonic-tick' });
  }
  for (let i = 0; i < 38; i += 1) {
    diagonal(coords, 40 + i * 14, 386 - (i % 2) * 4, 6, i % 3 === 0 ? PALETTE.gold : PALETTE.violet, { layer: 'divwand-rune' });
  }
  rect(coords, 46, 24, 152, 12, PALETTE.gold, { layer: 'title-rule' });
  rect(coords, 46, 38, 92, 4, PALETTE.blue, { layer: 'title-rule' });
  return { canvas: { width: 640, height: 420 }, coordinates: coords };
}

function makeSlot() {
  const coords = [];
  rect(coords, 0, 0, 72, 72, PALETTE.ink, { layer: 'shadow' });
  rect(coords, 4, 4, 64, 64, '#090b17', { layer: 'socket' });
  rect(coords, 10, 10, 52, 52, '#111629', { layer: 'well' });
  border(coords, 4, 4, 64, 64, PALETTE.violetDim, 2, { layer: 'rim' });
  border(coords, 9, 9, 54, 54, PALETTE.blueDim, 1, { layer: 'inner-rim' });
  put(coords, 8, 8, PALETTE.gold, { layer: 'corner' });
  put(coords, 63, 8, PALETTE.gold, { layer: 'corner' });
  put(coords, 8, 63, PALETTE.goldDim, { layer: 'corner' });
  put(coords, 63, 63, PALETTE.goldDim, { layer: 'corner' });
  for (let i = 0; i < 12; i += 1) put(coords, 30 + i, 6 + (i % 2), PALETTE.blue, { layer: 'photonic-thread' });
  return { canvas: { width: 72, height: 72 }, coordinates: coords };
}

function makeVoidmetalIcon() {
  const coords = [];
  rect(coords, 0, 0, 64, 64, PALETTE.ink, { layer: 'transparent-key' });
  rect(coords, 23, 9, 18, 8, PALETTE.violet, { layer: 'ore-highlight' });
  rect(coords, 18, 17, 30, 10, '#4a3fd0', { layer: 'ore-body' });
  rect(coords, 14, 27, 38, 12, '#2b225d', { layer: 'ore-body' });
  rect(coords, 20, 39, 28, 9, '#171144', { layer: 'ore-shadow' });
  rect(coords, 26, 48, 16, 6, '#0c0824', { layer: 'ore-shadow' });
  rect(coords, 28, 14, 8, 2, PALETTE.silver, { layer: 'specular' });
  rect(coords, 40, 28, 7, 2, PALETTE.blue, { layer: 'photonic-glint' });
  rect(coords, 16, 32, 5, 2, PALETTE.gold, { layer: 'scholomance-inlay' });
  for (let i = 0; i < 18; i += 1) put(coords, 24 + (i * 7) % 20, 19 + (i * 11) % 26, i % 2 ? PALETTE.blue : PALETTE.violet, { layer: 'mineral-spark' });
  return { canvas: { width: 64, height: 64 }, coordinates: coords };
}

function makeEmptyIcon() {
  const coords = [];
  rect(coords, 0, 0, 64, 64, PALETTE.ink, { layer: 'transparent-key' });
  border(coords, 18, 18, 28, 28, '#101626', 1, { layer: 'ghost-rim' });
  rect(coords, 31, 22, 2, 20, PALETTE.violetDim, { layer: 'ghost-line' });
  rect(coords, 22, 31, 20, 2, PALETTE.blueDim, { layer: 'ghost-line' });
  return { canvas: { width: 64, height: 64 }, coordinates: coords };
}

function writeAsset(name, asset, scale = 1) {
  const packet = createPixelBrainAssetPacket({
    id: `inventory.${name}`,
    source: {
      kind: 'pixelbrain-foundry',
      id: `scholomance.inventory.${name}`,
      label: `Scholomance Inventory ${name}`,
    },
    canvas: { ...asset.canvas, gridSize: 1 },
    coordinates: asset.coordinates,
    palettes: [{ key: 'void-inventory', colors: Object.values(PALETTE), source: 'PixelBrain Foundry / DivWand / Wand / Photonic Bridge' }],
    formula: {
      type: 'inventory-ui-sigil',
      divWandNode: 'inventory.surface.void-scholar',
      wandSeed: 'voidmetal-cave-inventory',
      photonicRoute: 'retina-lowbit-ui-preview',
    },
    material: { id: 'source' },
  });
  const png = renderPng(asset.coordinates, asset.canvas.width, asset.canvas.height, scale);
  const pbrain = buildPixelBrainGodotExport({
    canvas: { ...asset.canvas, gridSize: 1 },
    palettes: [{ key: 'void-inventory', colors: Object.values(PALETTE) }],
    coordinates: asset.coordinates,
    formula: packet.formula,
  });

  writeFileSync(resolve(OUT_DIR, `${name}.json`), JSON.stringify(packet, null, 2));
  writeFileSync(resolve(OUT_DIR, `${name}.png`), png);
  writeFileSync(resolve(OUT_DIR, `${name}.pbrain`), pbrain);
  copyFileSync(resolve(OUT_DIR, `${name}.png`), resolve(GODOT_DIR, `${name}.png`));
  return { packetId: packet.id, png: `res://assets/inventory/${name}.png`, cells: asset.coordinates.length };
}

const assets = {
  panel: writeAsset('inventory_panel', makePanel()),
  slot: writeAsset('inventory_slot', makeSlot()),
  voidmetal: writeAsset('voidmetal_icon', makeVoidmetalIcon()),
  empty: writeAsset('empty_icon', makeEmptyIcon()),
};

const retinaInput = {
  sourceKind: 'pixelbrain.asset',
  payload: {
    assetIds: Object.keys(assets),
    palette: PALETTE,
    surface: 'scholomance-inventory',
  },
  dimensions: { width: 640, height: 420 },
};

const photonic = routeRetinaPacketToPhotonicBridge(retinaInput, {
  bridge: { mode: 'shadow' },
});

const manifest = {
  kind: 'scholomance.inventory.assets.v1',
  generatedAt: '2026-06-17',
  sourceSystems: ['PixelBrain Foundry', 'DivWand', 'Wand', 'Photonic Bridge'],
  divWandNode: {
    id: 'inventory.surface.void-scholar',
    role: 'inventory-ui',
    layout: { width: 640, height: 420, slots: 24 },
    props: { schoolWeights: { VOID: 0.62, QBIT: 0.2, WILL: 0.18 }, interactive: true },
  },
  wandProposal: {
    sourceIntentHash: 'inventory-voidmetal-cave-alt-i',
    proposedFormula: { type: 'inventory-grid', columns: 6, rows: 4, motif: 'photonic-sigil-slot' },
    confidence: 0.91,
    reviewRequired: false,
  },
  photonicBridge: photonic,
  assets,
};

writeFileSync(resolve(OUT_DIR, 'inventory-assets.manifest.json'), JSON.stringify(manifest, null, 2));
writeFileSync(resolve(GODOT_DIR, 'inventory-assets.manifest.json'), JSON.stringify(manifest, null, 2));

console.log(JSON.stringify({ out: OUT_DIR, godot: GODOT_DIR, assets }, null, 2));
