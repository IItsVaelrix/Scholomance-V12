import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { normalizeItemSpec, hashItemSpec } from '../../../codex/core/pixelbrain/item-spec.js';
import { forgeItemAsset } from '../../../codex/core/pixelbrain/item-foundry.js';
import {
  applyHeraldryTemplate,
  applyHeraldryFills,
} from '../../../codex/core/pixelbrain/heraldry-amp.js';
import { composeSilhouette, computeOutline } from '../../../codex/core/pixelbrain/silhouette-composer.js';
import { sketchToSilhouette } from '../../../codex/core/pixelbrain/sketch-amp.js';
import { applyRegionFills } from '../../../codex/core/pixelbrain/region-fill-amp.js';
import { MATERIAL_PALETTES, hexToRgb, luminanceFromRgb } from '../../../codex/core/pixelbrain/material-registry.js';

const SCIMITAR_SPEC = JSON.parse(readFileSync('specs/scimitar.hd.v1.json', 'utf8'));

const luma = (hex) => luminanceFromRgb(hexToRgb(hex));

// Round shield-face fixture: an ellipse face + a virtual emblem part.
function mkSpec(heraldry, extraPartFields = {}) {
  return {
    contract: 'ITEM-SPEC-v1',
    id: 'targe.test.v1',
    class: 'armor',
    archetype: 'targe',
    canvas: { width: 48, height: 64 },
    seed: 11,
    bytecode: 'VW-VOID-RARE-HARMONIC',
    parts: [
      { id: 'face', profile: 'gem.ellipse', params: { cx: 24, cy: 32, rx: 16, ry: 22 }, fill: { material: 'sapphire' } },
      { id: 'emblem', profile: 'none', attach: { parent: 'face', at: 'base' }, fill: { material: 'gold' }, ...extraPartFields },
    ],
    heraldry,
  };
}

function runToFills(rawSpec) {
  const spec = normalizeItemSpec(rawSpec);
  const silhouette = composeSilhouette(spec);
  let template = sketchToSilhouette(
    silhouette.cells,
    { width: spec.canvas.width, height: spec.canvas.height },
    { bands: spec.bands, symmetry: 'none' },
  );
  template = applyHeraldryTemplate(template, silhouette, spec);
  const fills = applyRegionFills({ silhouette, template, spec, motifCells: new Map() });
  return { spec, silhouette, template, fills: applyHeraldryFills(fills, spec, silhouette) };
}

function emblemCells(fills) {
  return fills.coordinates.filter((c) => c.partId === 'emblem');
}

describe('ITEM-SPEC-v1 — heraldry passthrough', () => {
  it('keeps heraldry entries through normalization', () => {
    const spec = normalizeItemSpec(mkSpec([{ id: 'emblem', mark: 'cross', target: 'face' }]));
    expect(spec.heraldry).toHaveLength(1);
    expect(spec.heraldry[0].mark).toBe('cross');
  });

  it('omits the heraldry key entirely when absent (hash back-compat)', () => {
    const spec = normalizeItemSpec(SCIMITAR_SPEC);
    expect('heraldry' in spec).toBe(false);
    expect(hashItemSpec(spec)).toBe('fnv1a_7cde379c');
  });

  it('rejects unknown marks', () => {
    expect(() => normalizeItemSpec(mkSpec([{ mark: 'unicorn-rampant' }]))).toThrow(/mark/);
  });

  it('rejects a target that references no declared part', () => {
    expect(() => normalizeItemSpec(mkSpec([{ mark: 'cross', target: 'nose' }]))).toThrow(/target/);
  });

  it('rejects unknown style effects and symmetry values', () => {
    expect(() => normalizeItemSpec(mkSpec([{ mark: 'cross', style: { effect: 'hologram' } }]))).toThrow(/effect/);
    expect(() => normalizeItemSpec(mkSpec([{ mark: 'cross', symmetry: 'radial5' }]))).toThrow(/symmetry/);
  });
});

describe('Heraldry microprocessor — emblem shape & centering', () => {
  it('stamps the mark onto the face, never touching the rim', () => {
    const { fills, silhouette } = runToFills(mkSpec([{ id: 'emblem', mark: 'cross', target: 'face', style: { effect: 'inlay' } }]));
    const cells = emblemCells(fills);
    expect(cells.length).toBeGreaterThan(10);
    const outline = computeOutline(silhouette);
    for (const c of cells) {
      expect(outline.has(`${c.x},${c.y}`), `emblem on rim at ${c.x},${c.y}`).toBe(false);
    }
  });

  it('centers the emblem on the target part centroid by default', () => {
    const { fills } = runToFills(mkSpec([{ id: 'emblem', mark: 'cross', target: 'face', style: { effect: 'inlay' } }]));
    const cells = emblemCells(fills);
    const mx = cells.reduce((s, c) => s + c.x, 0) / cells.length;
    const my = cells.reduce((s, c) => s + c.y, 0) / cells.length;
    expect(Math.abs(mx - 24)).toBeLessThanOrEqual(1.5);
    expect(Math.abs(my - 32)).toBeLessThanOrEqual(1.5);
  });

  it('placement dx/dy offsets the centered emblem', () => {
    const base = runToFills(mkSpec([{ id: 'emblem', mark: 'cross', target: 'face', style: { effect: 'inlay' } }]));
    const moved = runToFills(mkSpec([{ id: 'emblem', mark: 'cross', target: 'face', style: { effect: 'inlay' }, placement: { dx: 0, dy: -6 } }]));
    const meanY = (fills) => {
      const cells = emblemCells(fills);
      return cells.reduce((s, c) => s + c.y, 0) / cells.length;
    };
    expect(meanY(moved.fills)).toBeLessThan(meanY(base.fills) - 3);
  });

  it('scale shrinks or grows the mark deterministically', () => {
    const small = emblemCells(runToFills(mkSpec([{ id: 'emblem', mark: 'flame', target: 'face', scale: 0.5, style: { effect: 'inlay' } }])).fills);
    const big = emblemCells(runToFills(mkSpec([{ id: 'emblem', mark: 'flame', target: 'face', scale: 1.5, style: { effect: 'inlay' } }])).fills);
    expect(small.length).toBeGreaterThan(0);
    expect(big.length).toBeGreaterThan(small.length * 2);
  });
});

describe('Heraldry microprocessor — contrast & readability', () => {
  it('auto-contrasts an emblem that would vanish into the face', () => {
    // Emblem declared in the same family as the face (sapphire-on-sapphire).
    const { fills } = runToFills(mkSpec(
      [{ id: 'emblem', mark: 'cross', target: 'face', style: { effect: 'inlay', material: 'sapphire', anchor: 'body' } }],
      { fill: { material: 'sapphire' } },
    ));
    const faceLuma = luma(MATERIAL_PALETTES.sapphire.anchors.body);
    const cells = emblemCells(fills);
    for (const c of cells) {
      expect(Math.abs(luma(c.color) - faceLuma)).toBeGreaterThanOrEqual(0.25);
    }
    const entry = fills.heraldry.find((h) => h.id === 'emblem');
    expect(entry.autoContrasted).toBe(true);
  });

  it('keeps a declared color that already contrasts', () => {
    const { fills } = runToFills(mkSpec(
      [{ id: 'emblem', mark: 'cross', target: 'face', style: { effect: 'inlay', material: 'gold', anchor: 'frost' } }],
    ));
    const expected = MATERIAL_PALETTES.gold.anchors.frost;
    for (const c of emblemCells(fills)) expect(c.color).toBe(expected);
    expect(fills.heraldry[0].autoContrasted).toBe(false);
  });

  it('reports readability diagnostics: coverage, contrast, warnings', () => {
    const { fills } = runToFills(mkSpec([{ id: 'emblem', mark: 'cross', target: 'face', style: { effect: 'inlay' } }]));
    const entry = fills.heraldry[0];
    expect(entry.coverage).toBeGreaterThan(0);
    expect(entry.coverage).toBeLessThan(1);
    expect(entry.contrast).toBeGreaterThanOrEqual(0.25);
    expect(Array.isArray(entry.warnings)).toBe(true);
  });

  it('warns when the emblem is too small to read', () => {
    const { fills } = runToFills(mkSpec([{ id: 'emblem', mark: 'cross', target: 'face', scale: 0.2, style: { effect: 'inlay' } }]));
    expect(fills.heraldry[0].warnings.join(' ')).toMatch(/small/i);
  });

  it('fails required emblems that stamp zero cells', () => {
    expect(() => runToFills(mkSpec([{
      id: 'emblem',
      mark: 'cross',
      target: 'face',
      placement: { dx: 999, dy: 999 },
      style: { effect: 'inlay' },
    }]))).toThrow(/stamped zero cells/);
  });
});

describe('Heraldry microprocessor — symmetry & style variants', () => {
  it('optional vertical symmetry mirrors the mark across the face axis', () => {
    const { fills } = runToFills(mkSpec([{ id: 'emblem', mark: 'wing', target: 'face', symmetry: 'vertical', style: { effect: 'inlay' } }]));
    const cells = new Set(emblemCells(fills).map((c) => `${c.x},${c.y}`));
    expect(cells.size).toBeGreaterThan(0);
    for (const key of cells) {
      const [x, y] = key.split(',').map(Number);
      expect(cells.has(`${48 - x},${y}`), `mirror of ${key}`).toBe(true);
    }
  });

  it('emboss raises emblem slots, engrave lowers them', () => {
    const embossed = runToFills(mkSpec([{ id: 'emblem', mark: 'cross', target: 'face', style: { effect: 'emboss' } }]));
    const engraved = runToFills(mkSpec([{ id: 'emblem', mark: 'cross', target: 'face', style: { effect: 'engrave' } }]));
    const meanSlot = (run) => {
      const cells = run.template.coordinates.filter((c) => run.silhouette.partOf.get(`${c.x},${c.y}`) === 'emblem');
      return cells.reduce((s, c) => s + c.slot, 0) / cells.length;
    };
    expect(meanSlot(embossed)).toBeGreaterThan(meanSlot(engraved));
  });

  it('outline style recolors only the emblem border, leaving the interior ramped', () => {
    const { fills } = runToFills(mkSpec([{ id: 'emblem', mark: 'flame', target: 'face', scale: 1.5, style: { effect: 'outline', material: 'gold', anchor: 'frost' } }]));
    const cells = emblemCells(fills);
    const keys = new Set(cells.map((c) => `${c.x},${c.y}`));
    const border = cells.filter((c) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !keys.has(`${c.x + dx},${c.y + dy}`)));
    const interior = cells.filter((c) => !border.includes(c));
    expect(border.length).toBeGreaterThan(0);
    expect(interior.length).toBeGreaterThan(0);
    for (const c of border) expect(c.color).toBe(MATERIAL_PALETTES.gold.anchors.frost);
    expect(interior.some((c) => c.color !== MATERIAL_PALETTES.gold.anchors.frost)).toBe(true);
  });

  it('is deterministic across runs', () => {
    const a = runToFills(mkSpec([{ id: 'emblem', mark: 'serpent', target: 'face', symmetry: 'vertical', style: { effect: 'inlay' } }]));
    const b = runToFills(mkSpec([{ id: 'emblem', mark: 'serpent', target: 'face', symmetry: 'vertical', style: { effect: 'inlay' } }]));
    expect(JSON.stringify(a.fills.coordinates)).toBe(JSON.stringify(b.fills.coordinates));
  });
});

describe('Heraldry microprocessor — forge integration', () => {
  it('forges an emblem end-to-end through forgeItemAsset', () => {
    const bundle = forgeItemAsset(mkSpec([{ id: 'emblem', mark: 'cross', target: 'face', style: { effect: 'inlay' } }]), { includeShader: false });
    const cells = bundle.assetPacket.geometry.coordinates.filter((c) => c.partId === 'emblem');
    expect(cells.length).toBeGreaterThan(10);
    // Readability diagnostics must survive into the bundle.
    expect(bundle.fills.heraldry).toHaveLength(1);
    expect(bundle.fills.heraldry[0]).toMatchObject({ id: 'emblem', mark: 'cross' });
  });

  it('archived scimitar (no heraldry) stays byte-stable', () => {
    const bundle = forgeItemAsset(SCIMITAR_SPEC);
    expect(hashItemSpec(bundle.spec)).toBe('fnv1a_7cde379c');
    expect(bundle.shader.hash).toBe('fnv1a_FC53ECBB');
  });
});
