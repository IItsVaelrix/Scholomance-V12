import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';

import { createPixelBrainAssetPacket } from '../codex/core/pixelbrain/pixelbrain-asset-packet.js';
import { hashString } from '../codex/core/pixelbrain/shared.js';
import { renderPng } from '../codex/core/pixelbrain/item-foundry.js';
import { createPixelBrainArtifact } from '../src/lib/godot-export/artifactSchemas.js';
import { serializeStable } from '../src/lib/godot-export/stableSerialize.js';

const SPEC_PATH = resolve('specs/voidmetal-pickaxe.v1.json');
const OUT_DIR = resolve('output/foundry/voidmetal-pickaxe');
const GODOT_ITEM_DIR = resolve('godot_project/assets/items');

const rawSpec = JSON.parse(readFileSync(SPEC_PATH, 'utf8'));
const canvas = rawSpec.canvas || { width: 64, height: 64, gridSize: 1 };
const bytecode = rawSpec.bytecode || 'VW-VOID-WILL-KINETIC-TRANSCENDENT';

const PALETTE = Object.freeze({
  outline: '#03020A',
  voidEdge: '#090516',
  voidDeep: '#12072D',
  voidBody: '#1E0B45',
  voidMid: '#32106D',
  voidLit: '#5B21B6',
  rune: '#5B21B6',
  runeCore: '#A66BE0',
  steelDark: '#161B27',
  steel: '#465178',
  steelLight: '#7580A8',
  woodDark: '#2E1A0C',
  wood: '#5C3A1F',
  woodLight: '#9A6F4A',
  wrapDark: '#130910',
  wrapRed: '#512122',
});

function cellKey(x, y, z, partId) {
  return `${x},${y},${z},${partId}`;
}

function colorFromShade(shade, x, y) {
  return typeof shade === 'function' ? shade(x, y) : shade;
}

function buildReferenceCoordinates() {
  const cells = new Map();
  let order = 0;

  const place = (x, y, partId, shade, options = {}) => {
    const gx = Math.round(x);
    const gy = Math.round(y);
    if (gx < 0 || gx >= canvas.width || gy < 0 || gy >= canvas.height) return;
    const z = Number(options.z ?? 0);
    const color = colorFromShade(shade, gx, gy);
    const key = cellKey(gx, gy, z, partId);
    cells.set(key, {
      x: gx,
      y: gy,
      z,
      snappedX: gx,
      snappedY: gy,
      slot: cells.size % 32,
      emphasis: Number(options.emphasis ?? 1),
      isRim: Boolean(options.isRim),
      isMotif: partId === 'void_inlay',
      motifRole: partId === 'void_inlay' ? 'glow' : null,
      nx: 0,
      ny: 0,
      partId,
      color,
      source: 'reference-lattice',
      shading: options.shading || 'authored',
      order: order += 1,
    });
  };

  const rect = (x, y, w, h, partId, shade, options = {}) => {
    for (let yy = y; yy < y + h; yy += 1) {
      for (let xx = x; xx < x + w; xx += 1) place(xx, yy, partId, shade, options);
    }
  };

  const line = (x0, y0, x1, y1, thickness, partId, shade, options = {}) => {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0;
    let y = y0;
    for (;;) {
      for (let oy = -thickness; oy <= thickness; oy += 1) {
        for (let ox = -thickness; ox <= thickness; ox += 1) {
          if (Math.abs(ox) + Math.abs(oy) <= thickness + 1) place(x + ox, y + oy, partId, shade, options);
        }
      }
      if (x === x1 && y === y1) break;
      const e2 = err * 2;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  };

  const polygon = (points, partId, shade, options = {}) => {
    const xs = points.map((point) => point[0]);
    const ys = points.map((point) => point[1]);
    const minX = Math.floor(Math.min(...xs));
    const maxX = Math.ceil(Math.max(...xs));
    const minY = Math.floor(Math.min(...ys));
    const maxY = Math.ceil(Math.max(...ys));
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        if (pointInPolygon(x + 0.5, y + 0.5, points)) place(x, y, partId, shade, options);
      }
    }
  };

  const woodShade = (x, y) => {
    if (x === 29 || x === 34) return PALETTE.woodDark;
    if ((x + y) % 7 === 0 || x === 31) return PALETTE.woodLight;
    return PALETTE.wood;
  };
  const headShade = (x, y) => {
    if ((x > 47 && y < 17) || (x - y) % 13 === 0) return PALETTE.voidMid;
    if (x > 45 || y > 22) return PALETTE.voidDeep;
    return PALETTE.voidBody;
  };
  const steelShade = (x, y) => {
    if (y % 5 === 0 || x < 25) return PALETTE.steelLight;
    if (y % 5 === 3 || x > 38) return PALETTE.steelDark;
    return PALETTE.steel;
  };
  const wrapShade = (x, y) => ((y - 46) % 4 < 2 ? PALETTE.wrapRed : PALETTE.wrapDark);

  // Handle behind the head: tall bark shaft with readable vertical grain.
  rect(27, 24, 10, 36, 'handle', PALETTE.outline, { z: -0.3, isRim: true });
  rect(29, 25, 6, 34, 'handle', woodShade, { z: -0.25 });
  line(31, 28, 31, 56, 0, 'handle', PALETTE.woodDark, { z: -0.2 });
  line(33, 27, 33, 55, 0, 'handle', PALETTE.woodLight, { z: -0.18 });

  polygon([[29, 56], [35, 56], [37, 60], [34, 63], [30, 63], [28, 60]], 'handle', PALETTE.outline, { z: -0.22, isRim: true });
  polygon([[30, 57], [34, 57], [36, 60], [33, 62], [31, 62], [29, 60]], 'handle', woodShade, { z: -0.18 });

  // Lower leather-and-void wrap.
  rect(26, 44, 12, 11, 'handle_wrap', PALETTE.outline, { z: 0.28, isRim: true });
  rect(27, 45, 10, 9, 'handle_wrap', wrapShade, { z: 0.38 });
  line(27, 48, 36, 48, 0, 'handle_wrap', PALETTE.outline, { z: 0.46 });
  line(27, 52, 36, 52, 0, 'handle_wrap', PALETTE.outline, { z: 0.46 });

  // Socket collars around the head and shaft.
  rect(25, 24, 14, 6, 'collar', PALETTE.outline, { z: 0.2, isRim: true });
  rect(26, 25, 12, 4, 'collar', steelShade, { z: 0.3 });

  // Left curved pick and left wing.
  polygon([[25, 14], [11, 18], [7, 23], [22, 25], [29, 20]], 'head_core', PALETTE.outline, { z: 0.1, isRim: true });
  polygon([[24, 16], [12, 19], [10, 22], [22, 23], [27, 20]], 'head_core', headShade, { z: 0.18 });
  polygon([[17, 22], [9, 27], [3, 37], [5, 41], [12, 34], [19, 24]], 'head_core', PALETTE.outline, { z: 0.08, isRim: true });
  polygon([[16, 23], [10, 28], [6, 36], [7, 38], [12, 33], [18, 24]], 'head_core', headShade, { z: 0.16 });
  rect(3, 36, 4, 3, 'head_core', PALETTE.voidEdge, { z: 0.2 });

  // Right blade: blocky, stepped, and broader than the left pick.
  polygon([[37, 10], [51, 7], [60, 12], [60, 18], [51, 22], [38, 19]], 'head_core', PALETTE.outline, { z: 0.12, isRim: true });
  polygon([[38, 12], [51, 9], [57, 13], [57, 17], [50, 20], [39, 18]], 'head_core', headShade, { z: 0.24 });
  rect(51, 12, 7, 5, 'head_core', PALETTE.voidMid, { z: 0.3 });
  rect(55, 14, 4, 4, 'head_core', PALETTE.voidDeep, { z: 0.34 });

  // Central socket block.
  rect(23, 13, 18, 17, 'head_core', PALETTE.outline, { z: 0.22, isRim: true });
  rect(25, 15, 14, 13, 'head_core', headShade, { z: 0.34 });
  rect(26, 16, 3, 11, 'head_core', PALETTE.voidDeep, { z: 0.38 });
  rect(35, 16, 3, 11, 'head_core', PALETTE.voidMid, { z: 0.42 });

  rect(22, 10, 21, 6, 'collar', PALETTE.outline, { z: 0.62, isRim: true });
  rect(23, 11, 19, 4, 'collar', steelShade, { z: 0.7 });

  // Wooden top cap, matching the small cuboid on the reference.
  polygon([[27, 5], [35, 5], [38, 8], [38, 13], [26, 13], [24, 9]], 'handle_cap', PALETTE.outline, { z: 0.7, isRim: true });
  polygon([[28, 6], [35, 6], [37, 8], [37, 12], [27, 12], [25, 9]], 'handle_cap', woodShade, { z: 0.78 });
  rect(29, 6, 6, 2, 'handle_cap', PALETTE.woodLight, { z: 0.86 });
  line(30, 8, 30, 12, 0, 'handle_cap', PALETTE.woodDark, { z: 0.9 });
  line(34, 8, 34, 12, 0, 'handle_cap', PALETTE.woodDark, { z: 0.9 });

  // Violet inlay strips and glowing runes.
  line(14, 21, 23, 20, 1, 'void_inlay', PALETTE.rune, { z: 0.9, emphasis: 1.5 });
  line(40, 14, 52, 12, 1, 'void_inlay', PALETTE.rune, { z: 0.92, emphasis: 1.5 });
  rect(47, 18, 6, 2, 'void_inlay', PALETTE.rune, { z: 0.95, emphasis: 1.6 });
  line(33, 18, 33, 27, 1, 'void_inlay', PALETTE.rune, { z: 0.98, emphasis: 1.7 });
  place(16, 19, 'void_inlay', PALETTE.runeCore, { z: 1.0, emphasis: 2 });
  place(50, 12, 'void_inlay', PALETTE.runeCore, { z: 1.0, emphasis: 2 });
  place(34, 23, 'void_inlay', PALETTE.runeCore, { z: 1.0, emphasis: 2 });

  return [...cells.values()].sort((a, b) => a.order - b.order);
}

function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    const intersects = ((yi > y) !== (yj > y))
      && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

function countParts(coordinates) {
  const partCounts = {};
  for (const coord of coordinates) {
    const partId = coord.partId || 'unknown';
    partCounts[partId] = (partCounts[partId] || 0) + 1;
  }
  return partCounts;
}

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(GODOT_ITEM_DIR, { recursive: true });

const coordinates = buildReferenceCoordinates();
const partCounts = countParts(coordinates);
const colors = [...new Set(coordinates.map((coord) => coord.color))];
const assetPacket = createPixelBrainAssetPacket({
  source: {
    kind: 'procedural',
    id: rawSpec.id,
    label: 'reference voxel voidmetal pickaxe',
  },
  canvas: {
    width: canvas.width,
    height: canvas.height,
    cellSize: canvas.gridSize || 1,
    gridSize: canvas.gridSize || 1,
    transparent: true,
    background: '#00000000',
  },
  palettes: [{ key: 'voidmetal_pickaxe_reference', colors, source: 'reference-lattice' }],
  geometry: {
    mode: 'coordinates',
    coordinates,
  },
  bytecode,
  material: { id: 'source' },
  metadata: {
    tags: ['voidmetal', 'pickaxe', 'reference-lattice', 'voxel'],
    notes: ['Authored to match the supplied chunky purple voidmetal pickaxe reference.'],
  },
  provenance: {
    createdBy: 'scripts/generate-voidmetal-pickaxe.mjs',
    operations: ['reference-lattice', 'godot-artifact-export'],
  },
});

const godotArtifact = createPixelBrainArtifact({
  canvas: assetPacket.canvas,
  palettes: assetPacket.palette.sourcePalette,
  coordinates,
  formula: null,
  bytecode,
});
const png = renderPng(coordinates, canvas.width, canvas.height, 16);
const specHash = `fnv1a_${hashString(serializeStable(rawSpec)).toString(16).padStart(8, '0')}`;
const fillHash = `fnv1a_${hashString(serializeStable(coordinates)).toString(16).padStart(8, '0')}`;

const assetPacketPath = resolve(OUT_DIR, 'voidmetal-pickaxe.json');
const artifactPath = resolve(OUT_DIR, 'voidmetal-pickaxe.pbrain');
const pngPath = resolve(OUT_DIR, 'voidmetal-pickaxe.png');
const diagnosticsPath = resolve(OUT_DIR, 'voidmetal-pickaxe.forge.diagnostics.json');

writeFileSync(assetPacketPath, JSON.stringify(assetPacket, null, 2), 'utf8');
writeFileSync(artifactPath, serializeStable(godotArtifact), 'utf8');
writeFileSync(pngPath, png);

writeFileSync(
  diagnosticsPath,
  JSON.stringify(
    {
      spec: { file: SPEC_PATH, id: rawSpec.id, hash: specHash },
      cells: coordinates.length,
      partCounts,
      fillHash,
      assetPacketId: assetPacket.id,
      routeDiagnostics: {
        ok: true,
        failures: [],
        mode: 'reference-authored-lattice',
      },
      expansion: {
        contract: 'PB-SHAPE-GRAMMAR-v1',
        grammarId: 'weapon.tool.pickaxe-reference-v1',
        source: 'scripts/generate-voidmetal-pickaxe.mjs',
      },
    },
    null,
    2,
  ),
  'utf8',
);

copyFileSync(assetPacketPath, resolve(GODOT_ITEM_DIR, 'voidmetal_pickaxe.json'));
copyFileSync(artifactPath, resolve(GODOT_ITEM_DIR, 'voidmetal_pickaxe.pbrain'));
copyFileSync(pngPath, resolve(GODOT_ITEM_DIR, 'voidmetal_pickaxe.png'));

console.log('==================================================');
console.log(`  VOIDMETAL PICKAXE REFERENCE FORGE — ${rawSpec.id}`);
console.log('==================================================');
console.log(`  spec hash    : ${specHash}`);
console.log(`  cells        : ${coordinates.length}`);
console.log(`  part counts  : ${JSON.stringify(partCounts)}`);
console.log(`  artifact     : ${artifactPath}`);
console.log(`  godot copy   : ${resolve(GODOT_ITEM_DIR, 'voidmetal_pickaxe.pbrain')}`);
console.log('==================================================');
