import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { forgeItemAsset } from '../../../codex/core/pixelbrain/item-foundry.js';
import {
  normalizeItemSpec,
  validateItemSpec,
  hashItemSpec,
} from '../../../codex/core/pixelbrain/item-spec.js';
import { composeSilhouette, computeOutline } from '../../../codex/core/pixelbrain/silhouette-composer.js';
import { sketchToSilhouette } from '../../../codex/core/pixelbrain/sketch-amp.js';
import { applyRegionFills } from '../../../codex/core/pixelbrain/region-fill-amp.js';
import { MATERIAL_PALETTES } from '../../../codex/core/pixelbrain/material-registry.js';

const SCIMITAR_SPEC = JSON.parse(readFileSync('specs/scimitar.hd.v1.json', 'utf8'));
const PICKAXE_SPEC = JSON.parse(readFileSync('specs/voidmetal-pickaxe.v1.json', 'utf8'));

// Empirically pinned from the recovered scimitar.hd.v1 spec (seed 1337).
// The shader hash matches the original team forge exactly; the spec hash is
// the new provenance authority after the bundle was superseded on 2026-06-12.
const GOLDEN = Object.freeze({
  specHash: 'fnv1a_7cde379c',
  shaderHash: 'fnv1a_FC53ECBB',
  cells: 596,
  partCells: { blade: 370, bezel: 100, grip: 66, pommel: 60 },
  motifCells: new Set(
    ('21,28:core 22,28:glow 21,29:core 22,29:glow 20,30:glow 21,30:core 22,30:glow '
      + '21,31:glow 22,31:core 23,31:glow 21,32:glow 22,32:core 23,32:glow 22,33:glow '
      + '23,33:core 22,34:glow 23,34:core').split(' '),
  ),
});

const MINI_SPEC = Object.freeze({
  contract: 'ITEM-SPEC-v1',
  id: 'mini.test.v1',
  class: 'weapon',
  archetype: 'dirk',
  canvas: { width: 24, height: 48 },
  seed: 7,
  bytecode: 'VW-VOID-RARE-HARMONIC',
  parts: [
    { id: 'blade', profile: 'blade.straight', params: { cx: 12, span: [0, 23] }, fill: { material: 'silver' } },
    { id: 'grip', profile: 'grip.uniform', params: { cx: 12, half: 1, height: 10 }, attach: { parent: 'blade', at: 'base' }, fill: { material: 'bronze' } },
    { id: 'pommel', profile: 'pommel.round', attach: { parent: 'grip', at: 'tip' }, fill: { material: 'ruby' } },
  ],
});

// 8-connectivity: the no-floating-islands invariant. Whole-silhouette
// 4-connectivity does NOT hold (curved blade tips step diagonally); the
// composer only bridges 4-connectivity at part attach points.
function bfs8Connected(cells) {
  if (cells.length === 0) return true;
  const keys = new Set(cells.map((c) => `${c.x},${c.y}`));
  const queue = [cells[0]];
  const seen = new Set([`${cells[0].x},${cells[0].y}`]);
  while (queue.length) {
    const { x, y } = queue.pop();
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        if (dx === 0 && dy === 0) continue;
        const key = `${x + dx},${y + dy}`;
        if (keys.has(key) && !seen.has(key)) {
          seen.add(key);
          queue.push({ x: x + dx, y: y + dy });
        }
      }
    }
  }
  return seen.size === keys.size;
}

describe('ITEM-SPEC-v1 contract', () => {
  it('rejects a spec without an id', () => {
    expect(() => normalizeItemSpec({ ...MINI_SPEC, id: '' })).toThrow(/id is required/);
  });

  it('rejects a wrong contract literal', () => {
    expect(() => normalizeItemSpec({ ...MINI_SPEC, contract: 'ITEM-SPEC-v0' })).toThrow(/contract/);
  });

  it('rejects empty parts', () => {
    expect(() => normalizeItemSpec({ ...MINI_SPEC, parts: [] })).toThrow(/parts/);
  });

  it('rejects duplicate part ids', () => {
    const parts = [MINI_SPEC.parts[0], { ...MINI_SPEC.parts[1], id: 'blade' }];
    expect(() => normalizeItemSpec({ ...MINI_SPEC, parts })).toThrow(/unique/);
  });

  it('rejects a child part without an attach', () => {
    const parts = [MINI_SPEC.parts[0], { ...MINI_SPEC.parts[1], attach: undefined }];
    expect(() => normalizeItemSpec({ ...MINI_SPEC, parts })).toThrow(/attach/);
  });

  it('rejects an attach that references a non-preceding part', () => {
    const parts = [
      MINI_SPEC.parts[0],
      { ...MINI_SPEC.parts[1], attach: { parent: 'pommel', at: 'tip' } },
      MINI_SPEC.parts[2],
    ];
    expect(() => normalizeItemSpec({ ...MINI_SPEC, parts })).toThrow(/preceding/);
  });

  it('rejects an unknown material at validation', () => {
    const spec = normalizeItemSpec({
      ...MINI_SPEC,
      parts: [{ ...MINI_SPEC.parts[0], fill: { material: 'unobtanium' } }],
    });
    expect(() => validateItemSpec(spec)).toThrow(/not in registry/);
    expect(() => normalizeItemSpec({
      ...MINI_SPEC,
      parts: [{ ...MINI_SPEC.parts[0], motif: { kind: 'bolt', core: { material: 'sapphire', anchor: 'notAnAnchor' } } }],
    })).toThrow(/anchor/);
  });

  it('hashes are key-order independent and default-stable', () => {
    const reordered = JSON.parse(JSON.stringify(SCIMITAR_SPEC));
    reordered.parts = reordered.parts.map((p) => {
      const entries = Object.entries(p).reverse();
      return Object.fromEntries(entries);
    });
    const a = hashItemSpec(normalizeItemSpec(SCIMITAR_SPEC));
    const b = hashItemSpec(normalizeItemSpec(reordered));
    expect(a).toBe(b);
    // bands omitted normalizes to the default 6 → same hash as explicit 6
    const { bands: _bands, ...withoutBands } = SCIMITAR_SPEC;
    expect(hashItemSpec(normalizeItemSpec(withoutBands))).toBe(a);
  });
});

describe('Item Foundry — golden scimitar (specs/scimitar.hd.v1.json)', () => {
  const bundle = forgeItemAsset(SCIMITAR_SPEC);

  it('reproduces the archived spec hash and shader hash', () => {
    expect(hashItemSpec(bundle.spec)).toBe(GOLDEN.specHash);
    expect(bundle.shader.hash).toBe(GOLDEN.shaderHash);
    expect(bundle.assetPacket.metadata.compatibility.spec.hash).toBe(GOLDEN.specHash);
  });

  it('reproduces the golden geometry exactly', () => {
    const coords = bundle.assetPacket.geometry.coordinates;
    expect(coords.length).toBe(GOLDEN.cells);
    const counts = {};
    for (const c of coords) counts[c.partId] = (counts[c.partId] || 0) + 1;
    expect(counts).toEqual(GOLDEN.partCells);
  });

  it('reproduces the golden motif cells and roles exactly', () => {
    const motif = bundle.assetPacket.geometry.coordinates.filter((c) => c.isMotif);
    expect(motif.length).toBe(GOLDEN.motifCells.size);
    for (const c of motif) {
      expect(GOLDEN.motifCells.has(`${c.x},${c.y}:${c.motifRole}`), `${c.x},${c.y}:${c.motifRole}`).toBe(true);
    }
  });

  it('is deterministic: two forges produce byte-identical artifacts', () => {
    const again = forgeItemAsset(SCIMITAR_SPEC);
    expect(JSON.stringify(again.assetPacket)).toBe(JSON.stringify(bundle.assetPacket));
    expect(again.godotArtifact).toBe(bundle.godotArtifact);
    expect(again.fills.hash).toBe(bundle.fills.hash);
    expect(again.shader.hash).toBe(bundle.shader.hash);
    expect(Buffer.compare(again.png, bundle.png)).toBe(0);
  });

  it('renders a PNG buffer under real ESM (no global require)', () => {
    // Regression: encodePng previously called require('node:zlib'), which only
    // worked when a CJS eval context leaked `require` onto globalThis.
    expect(Buffer.isBuffer(bundle.png)).toBe(true);
    expect(bundle.png.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  });

  it('exports a Godot shader with only canonical uniforms', () => {
    expect(bundle.godotShader).toContain('shader_type canvas_item;');
    // No custom uniform block content — canonical six only.
    const customBlock = bundle.godotShader.split('// Custom uniforms defined in packet')[1].split('//')[0];
    expect(customBlock.trim()).toBe('');
  });
});

describe('Item Foundry — voidmetal pickaxe (specs/voidmetal-pickaxe.v1.json)', () => {
  const bundle = forgeItemAsset(PICKAXE_SPEC, { includeShader: false });

  it('routes through the pickaxe grammar without required-output failures', () => {
    expect(bundle.expansion.contract).toBe('PB-SHAPE-GRAMMAR-v1');
    expect(bundle.expansion.grammarId).toBe('weapon.tool.pickaxe-v1');
    expect(bundle.routeDiagnostics.ok).toBe(true);
    expect(bundle.routeDiagnostics.failures).toEqual([]);
  });

  it('emits a dense Minecraft-readable silhouette with Scholomance inlay parts', () => {
    const counts = {};
    for (const c of bundle.assetPacket.geometry.coordinates) {
      counts[c.partId] = (counts[c.partId] || 0) + 1;
    }
    expect(counts.head_core).toBeGreaterThanOrEqual(120);
    expect(counts.handle).toBeGreaterThanOrEqual(70);
    expect(counts.handle_wrap).toBeGreaterThanOrEqual(8);
    expect(counts.collar).toBeGreaterThanOrEqual(20);
    expect(counts.void_inlay).toBeGreaterThanOrEqual(8);
  });

  it('is deterministic: two forges produce byte-identical exported artifacts', () => {
    const again = forgeItemAsset(PICKAXE_SPEC, { includeShader: false });
    expect(JSON.stringify(again.assetPacket)).toBe(JSON.stringify(bundle.assetPacket));
    expect(again.godotArtifact).toBe(bundle.godotArtifact);
    expect(again.fills.hash).toBe(bundle.fills.hash);
    expect(Buffer.compare(again.png, bundle.png)).toBe(0);
  });
});

describe('Item Foundry — structural invariants', () => {
  it.each([
    ['scimitar', SCIMITAR_SPEC],
    ['mini dirk', MINI_SPEC],
  ])('composes a silhouette with no floating islands (%s)', (_label, rawSpec) => {
    const silhouette = composeSilhouette(normalizeItemSpec(rawSpec));
    expect(silhouette.cells.length).toBeGreaterThan(0);
    expect(bfs8Connected(silhouette.cells)).toBe(true);
  });

  it.each([
    ['scimitar', SCIMITAR_SPEC],
    ['mini dirk', MINI_SPEC],
    ['voidmetal pickaxe', PICKAXE_SPEC],
  ])('outline is exactly the missing-4-neighbor rim (%s)', (_label, rawSpec) => {
    const silhouette = composeSilhouette(normalizeItemSpec(rawSpec));
    const outline = computeOutline(silhouette);
    const keys = new Set(silhouette.cells.map((c) => `${c.x},${c.y}`));
    for (const c of silhouette.cells) {
      const expectRim = [[1, 0], [-1, 0], [0, 1], [0, -1]]
        .some(([dx, dy]) => !keys.has(`${c.x + dx},${c.y + dy}`));
      expect(outline.has(`${c.x},${c.y}`), `${c.x},${c.y}`).toBe(expectRim);
    }
  });

  it('motif cells never claim a rim cell (outline closure)', () => {
    const bundle = forgeItemAsset(SCIMITAR_SPEC);
    for (const c of bundle.assetPacket.geometry.coordinates) {
      if (c.isMotif) expect(c.isRim, `motif on rim at ${c.x},${c.y}`).toBe(false);
    }
  });

  it('region fills emit only registry-anchored colors', () => {
    const spec = normalizeItemSpec(MINI_SPEC);
    const silhouette = composeSilhouette(spec);
    const template = sketchToSilhouette(
      silhouette.cells,
      { width: spec.canvas.width, height: spec.canvas.height },
      { bands: spec.bands, symmetry: 'none' },
    );
    const fills = applyRegionFills({ silhouette, template, spec, motifCells: new Map() });
    const allowed = new Set();
    for (const def of Object.values(MATERIAL_PALETTES)) {
      for (const hex of Object.values(def.anchors || {})) allowed.add(hex.toUpperCase());
    }
    for (const c of fills.coordinates) {
      expect(allowed.has(String(c.color).toUpperCase()), `${c.x},${c.y} → ${c.color}`).toBe(true);
    }
  });
});
