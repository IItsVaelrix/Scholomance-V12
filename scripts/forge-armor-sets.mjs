/**
 * ARMOR SET CLASS — slot-bound armor-piece generator.
 *
 * One bindings object forges a coherent set: helm, cuirass, gauntlets,
 * greaves — same materials, same light, same glyph identity. Combined with
 * the matching shield (forge-resonance-shields.mjs) and weapon, a full kit.
 *
 *   slots = {
 *     shell:  primary plate surface
 *     plate:  secondary/under plate (belt, cuffs, soles)
 *     trim:   outline material (selout turns it into directional edge light)
 *     energy: accent material (helm crest, knuckle studs)
 *     core:   chest medallion plate
 *     glyph:  set sigil inlay (chest medallion)
 *   }
 *
 * All pieces share inventory-icon canvases and the canonical top-left key
 * light, so they read as one set in a grid.
 *
 * Usage:
 *   node scripts/forge-armor-sets.mjs                 # all sets, all pieces
 *   node scripts/forge-armor-sets.mjs void-sonic      # one set
 *   node scripts/forge-armor-sets.mjs void-sonic helm # one piece
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { forgeItemAsset, renderBundlePng } from '../codex/core/pixelbrain/item-foundry.js';
import { registerPartProfile } from '../codex/core/pixelbrain/part-profile-library.js';
import { hashItemSpec } from '../codex/core/pixelbrain/item-spec.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_ROOT = resolve(__dirname, '..', 'output', 'foundry');

function roundInt(value) { return Math.round(Number(value) || 0); }

// Emit cells from a per-row half-width map around a center column, with an
// optional per-row "cut" map that omits a centered window (neck holes, visor
// slits). Used by every armor profile.
function emitHalfWidthRows({ cx, halfAt, cutAt = {} }) {
  const cells = [];
  for (const [yKey, half] of Object.entries(halfAt)) {
    const y = Number(yKey);
    const cut = cutAt[yKey];
    for (let dx = -roundInt(half); dx <= roundInt(half); dx += 1) {
      if (cut !== undefined && Math.abs(dx) <= roundInt(cut)) continue;
      cells.push({ x: cx + dx, y });
    }
  }
  return cells;
}

// HELM — dome, visor slit, cheek guards, neck guard.
registerPartProfile('armor.helm', (params = {}) => {
  const cx = roundInt(params.cx ?? 24);
  const halfAt = {
    8: 7, 9: 9, 10: 10, 11: 11, 12: 12, 13: 12, 14: 13, 15: 13, 16: 13,
    17: 13, 18: 13, 19: 13, 20: 13, 21: 13,
    22: 13, 23: 13, 24: 13,            // visor band (slit cut below)
    25: 12, 26: 12, 27: 11, 28: 11, 29: 10, 30: 10, 31: 9, 32: 9,
    33: 8, 34: 8,                       // chin
    35: 9, 36: 9,                       // neck guard flare
  };
  const cutAt = { 22: 9, 23: 9 };       // visor slit — void shows through
  const cells = emitHalfWidthRows({ cx, halfAt, cutAt });
  return {
    cells,
    anchors: { base: { x: cx, y: 8 }, tip: { x: cx, y: 36 }, center: { x: cx, y: 22 } },
  };
});

// HELM CREST — thin fin on top of the dome.
registerPartProfile('armor.helm-crest', (params = {}) => {
  const cx = roundInt(params.cx ?? 24);
  const halfAt = { 3: 0, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1 };
  return {
    cells: emitHalfWidthRows({ cx, halfAt }),
    anchors: { base: { x: cx, y: roundInt(params.anchorY ?? 3) }, center: { x: cx, y: 6 } },
  };
});

// CUIRASS — shoulders, neck hole, waist taper, fauld flare.
registerPartProfile('armor.cuirass', (params = {}) => {
  const cx = roundInt(params.cx ?? 24);
  const halfAt = {
    8: 14, 9: 16, 10: 17, 11: 17, 12: 17, 13: 17, 14: 16,   // shoulders/pauldrons
    15: 15, 16: 15, 17: 14, 18: 14, 19: 13, 20: 13,
    21: 12, 22: 12, 23: 12, 24: 12, 25: 12, 26: 12, 27: 12, 28: 12,
    29: 11, 30: 11, 31: 11, 32: 10, 33: 10, 34: 10,          // waist
    35: 10, 36: 11, 37: 11, 38: 12, 39: 12, 40: 12,          // fauld flare
  };
  const cutAt = { 8: 5, 9: 4, 10: 3 };                        // neck hole
  return {
    cells: emitHalfWidthRows({ cx, halfAt, cutAt }),
    anchors: { base: { x: cx, y: 8 }, tip: { x: cx, y: 40 }, center: { x: cx, y: 24 } },
  };
});

// BELT — plate band across the waist.
registerPartProfile('armor.belt', (params = {}) => {
  const cx = roundInt(params.cx ?? 24);
  const halfAt = { 33: 10, 34: 10, 35: 10 };
  return {
    cells: emitHalfWidthRows({ cx, halfAt }),
    anchors: { base: { x: cx, y: roundInt(params.anchorY ?? 33) }, center: { x: cx, y: 34 } },
  };
});

// MEDALLION — circular chest plate (the set sigil's containment).
registerPartProfile('armor.medallion', (params = {}) => {
  const cx = roundInt(params.cx ?? 24);
  const cy = roundInt(params.cy ?? 21);
  const r = roundInt(params.r ?? 6);
  const cells = [];
  for (let y = cy - r; y <= cy + r; y += 1) {
    for (let x = cx - r; x <= cx + r; x += 1) {
      if (Math.hypot(x - cx, y - cy) <= r) cells.push({ x, y });
    }
  }
  return {
    cells,
    anchors: { base: { x: cx, y: roundInt(params.anchorY ?? cy - r) }, center: { x: cx, y: cy } },
  };
});

// PAIRED LIMB — mirrors one half-width column piece around the canvas
// center, producing the left+right of gauntlets or greaves in one part.
function emitPair({ cxLeft, cxRight, halfAt }) {
  return [
    ...emitHalfWidthRows({ cx: cxLeft, halfAt }),
    ...emitHalfWidthRows({ cx: cxRight, halfAt }),
  ];
}

// GAUNTLETS — flared cuff, tapered forearm, fist block (pair).
registerPartProfile('armor.gauntlets', (params = {}) => {
  const cxLeft = roundInt(params.cxLeft ?? 13);
  const cxRight = roundInt(params.cxRight ?? 35);
  const halfAt = {
    8: 7, 9: 7, 10: 6, 11: 6,                                  // cuff flare
    12: 5, 13: 5, 14: 4, 15: 4, 16: 4, 17: 4, 18: 4, 19: 4,
    20: 4, 21: 4, 22: 4, 23: 4,                                // forearm
    24: 5, 25: 6, 26: 6, 27: 6, 28: 6, 29: 6, 30: 5, 31: 4,    // fist
  };
  return {
    cells: emitPair({ cxLeft, cxRight, halfAt }),
    anchors: { base: { x: cxLeft, y: 8 }, center: { x: roundInt((cxLeft + cxRight) / 2), y: 20 } },
  };
});

// KNUCKLE PLATES — small energy studs on each fist.
registerPartProfile('armor.knuckles', (params = {}) => {
  const cxLeft = roundInt(params.cxLeft ?? 13);
  const cxRight = roundInt(params.cxRight ?? 35);
  const halfAt = { 25: 4, 26: 4 };
  return {
    cells: emitPair({ cxLeft, cxRight, halfAt }),
    anchors: { base: { x: cxLeft, y: roundInt(params.anchorY ?? 25) }, center: { x: 24, y: 25 } },
  };
});

// GREAVES — knee cap, shin, ankle, foot (pair).
registerPartProfile('armor.greaves', (params = {}) => {
  const cxLeft = roundInt(params.cxLeft ?? 14);
  const cxRight = roundInt(params.cxRight ?? 34);
  const halfAt = {
    6: 4, 7: 5, 8: 5, 9: 5, 10: 5, 11: 4,                       // knee cap
    12: 4, 13: 4, 14: 4, 15: 4, 16: 4, 17: 4, 18: 4, 19: 4,
    20: 4, 21: 4, 22: 4, 23: 4, 24: 4, 25: 4, 26: 4, 27: 4,
    28: 4, 29: 4, 30: 4, 31: 4, 32: 4, 33: 3, 34: 3,            // shin/ankle
    35: 4, 36: 5, 37: 6, 38: 6, 39: 6, 40: 6,                   // foot
  };
  return {
    cells: emitPair({ cxLeft, cxRight, halfAt }),
    anchors: { base: { x: cxLeft, y: 6 }, center: { x: 24, y: 22 } },
  };
});

// ── Slot-bound piece builders ──────────────────────────────────────────────

function basePieceSpec(set, pieceName, archetype, canvas) {
  return {
    contract: 'ITEM-SPEC-v1',
    id: `${set.idPrefix}.${pieceName}.v1`,
    class: 'armor',
    archetype,
    canvas,
    seed: 1337,
    bytecode: set.bytecode,
    bands: 7,
    light: { angle: Math.PI * 1.25, ambient: 0.28 },
    parts: [],
  };
}

function buildPieceSpec(set, pieceName) {
  const { slots, mark } = set;
  const c48 = { width: 48, height: 48, gridSize: 1 };

  if (pieceName === 'helm') {
    const spec = basePieceSpec(set, 'helm', 'void_helm', c48);
    spec.parts = [
      { id: 'helm', profile: 'armor.helm', params: { cx: 24 }, fill: { material: slots.shell }, outline: { material: slots.trim, anchor: 'body' } },
      { id: 'crest', profile: 'armor.helm-crest', params: { cx: 24, anchorY: 9 }, attach: { parent: 'helm', at: 'base' }, fill: { material: slots.energy }, outline: { material: slots.energy, anchor: 'deep' } },
    ];
    return spec;
  }

  if (pieceName === 'cuirass') {
    const spec = basePieceSpec(set, 'cuirass', 'void_cuirass', c48);
    spec.parts = [
      { id: 'cuirass', profile: 'armor.cuirass', params: { cx: 24 }, fill: { material: slots.shell }, outline: { material: slots.trim, anchor: 'body' } },
      { id: 'belt', profile: 'armor.belt', params: { cx: 24, anchorY: 9 }, attach: { parent: 'cuirass', at: 'base' }, fill: { material: slots.plate } },
      { id: 'medallion', profile: 'armor.medallion', params: { cx: 24, cy: 21, r: 6, anchorY: 9 }, attach: { parent: 'cuirass', at: 'base' }, fill: { material: slots.core } },
      { id: 'glyph', profile: 'none', attach: { parent: 'medallion', at: 'center' }, fill: { material: slots.glyph } },
    ];
    spec.heraldry = [
      { id: 'glyph', mark, target: 'medallion', scale: 0.7, symmetry: 'vertical', style: { effect: 'inlay', material: slots.glyph, anchor: 'frost' } },
    ];
    return spec;
  }

  if (pieceName === 'gauntlets') {
    const spec = basePieceSpec(set, 'gauntlets', 'void_gauntlets', c48);
    spec.parts = [
      { id: 'gauntlets', profile: 'armor.gauntlets', params: {}, fill: { material: slots.shell }, outline: { material: slots.trim, anchor: 'body' } },
      { id: 'knuckles', profile: 'armor.knuckles', params: { anchorY: 9 }, attach: { parent: 'gauntlets', at: 'base' }, fill: { material: slots.energy } },
    ];
    return spec;
  }

  if (pieceName === 'greaves') {
    const spec = basePieceSpec(set, 'greaves', 'void_greaves', c48);
    spec.parts = [
      { id: 'greaves', profile: 'armor.greaves', params: {}, fill: { material: slots.shell }, outline: { material: slots.trim, anchor: 'body' } },
    ];
    return spec;
  }

  throw new Error(`unknown piece "${pieceName}"`);
}

const PIECES = ['helm', 'cuirass', 'gauntlets', 'greaves'];

// ── Sets ───────────────────────────────────────────────────────────────────

const SETS = [
  {
    name: 'void-sonic',
    label: 'Void Sonic Plate',
    idPrefix: 'voidplate.hd',
    bytecode: 'VW-VOID-INEXPLICABLE-HARMONIC',
    mark: 'eye',
    slots: {
      shell: 'onyx',
      plate: 'black_steel',
      trim: 'gold',
      energy: 'amethyst',
      core: 'darksteel',
      glyph: 'gold',
    },
  },
];

// ── Forge ──────────────────────────────────────────────────────────────────

const onlySet = process.argv[2];
const onlyPiece = process.argv[3];

for (const set of SETS) {
  if (onlySet && set.name !== onlySet) continue;
  for (const pieceName of PIECES) {
    if (onlyPiece && pieceName !== onlyPiece) continue;
    const spec = buildPieceSpec(set, pieceName);
    const bundle = forgeItemAsset(spec, { includeShader: false });
    const outDir = resolve(OUT_ROOT, `${set.name}-armor`);
    mkdirSync(outDir, { recursive: true });

    writeFileSync(resolve(outDir, `${pieceName}.json`), JSON.stringify(bundle.assetPacket, null, 2), 'utf8');
    writeFileSync(resolve(outDir, `${pieceName}.pbrain`), bundle.godotArtifact, 'utf8');
    writeFileSync(resolve(outDir, `${pieceName}.png`), renderBundlePng(bundle, 6));
    writeFileSync(resolve(outDir, `${pieceName}.1x.png`), renderBundlePng(bundle, 1));
    writeFileSync(
      resolve(outDir, `${pieceName}.forge.diagnostics.json`),
      JSON.stringify(
        {
          label: `${set.label} — ${pieceName}`,
          slots: set.slots,
          spec: { id: bundle.spec.id, hash: hashItemSpec(bundle.spec) },
          cells: bundle.assetPacket.geometry.coordinates.length,
          heraldry: bundle.fills.heraldry ?? null,
        },
        null,
        2,
      ),
      'utf8',
    );
    const heraldryNote = (bundle.fills.heraldry ?? [])
      .map((h) => ` glyph ${h.cells} cells contrast ${h.contrast}${h.warnings.length ? ` WARN: ${h.warnings.join('; ')}` : ''}`)
      .join('');
    console.log(`forged ${set.name}/${pieceName.padEnd(10)} ${hashItemSpec(bundle.spec)}  ${String(bundle.assetPacket.geometry.coordinates.length).padStart(5)} cells${heraldryNote}`);
  }
}
