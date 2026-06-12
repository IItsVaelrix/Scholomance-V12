import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  normalizeItemSpec,
  hashItemSpec,
} from '../../../codex/core/pixelbrain/item-spec.js';
import { forgeItemAsset } from '../../../codex/core/pixelbrain/item-foundry.js';
import { MATERIAL_PALETTES } from '../../../codex/core/pixelbrain/material-registry.js';

const SCIMITAR_SPEC = JSON.parse(readFileSync('specs/scimitar.hd.v1.json', 'utf8'));
const LIGHT = Object.freeze({ angle: Math.PI * 1.25, ambient: 0.3 });

describe('ITEM-SPEC-v1 — light field', () => {
  it('normalizes a light field with angle and ambient', () => {
    const spec = normalizeItemSpec({ ...SCIMITAR_SPEC, light: { angle: Math.PI, ambient: 0.4 } });
    expect(spec.light).toEqual({ angle: Math.PI, ambient: 0.4 });
  });

  it('clamps ambient into [0, 1] and defaults it to 0.3', () => {
    expect(normalizeItemSpec({ ...SCIMITAR_SPEC, light: { angle: 1, ambient: 9 } }).light.ambient).toBe(1);
    expect(normalizeItemSpec({ ...SCIMITAR_SPEC, light: { angle: 1, ambient: -2 } }).light.ambient).toBe(0);
    expect(normalizeItemSpec({ ...SCIMITAR_SPEC, light: { angle: 1 } }).light.ambient).toBe(0.3);
  });

  it('rejects a light field without a finite angle', () => {
    expect(() => normalizeItemSpec({ ...SCIMITAR_SPEC, light: { ambient: 0.3 } })).toThrow(/light\.angle/);
    expect(() => normalizeItemSpec({ ...SCIMITAR_SPEC, light: { angle: 'noon' } })).toThrow(/light\.angle/);
  });

  it('keeps specs WITHOUT light hash-identical to the pre-light contract', () => {
    // The archived scimitar provenance hash must not move when the light
    // feature lands: absent fields stay absent in the normalized shape.
    const spec = normalizeItemSpec(SCIMITAR_SPEC);
    expect('light' in spec).toBe(false);
    expect(hashItemSpec(spec)).toBe('fnv1a_7cde379c');
  });

  it('changes the spec hash when light is declared', () => {
    const base = hashItemSpec(normalizeItemSpec(SCIMITAR_SPEC));
    const lit = hashItemSpec(normalizeItemSpec({ ...SCIMITAR_SPEC, light: LIGHT }));
    expect(lit).not.toBe(base);
  });
});

describe('ITEM-SPEC-v1 — part shading passthrough', () => {
  const withShading = (shading) => ({
    ...SCIMITAR_SPEC,
    parts: SCIMITAR_SPEC.parts.map((p) => (p.id === 'bezel' ? { ...p, shading } : p)),
  });

  it('keeps shading: "faceted" on a part through normalization', () => {
    const spec = normalizeItemSpec(withShading('faceted'));
    expect(spec.parts.find((p) => p.id === 'bezel').shading).toBe('faceted');
  });

  it('omits shading from parts that do not declare it (hash back-compat)', () => {
    const spec = normalizeItemSpec(SCIMITAR_SPEC);
    for (const part of spec.parts) expect('shading' in part).toBe(false);
  });

  it('rejects unknown shading values', () => {
    expect(() => normalizeItemSpec(withShading('glossy'))).toThrow(/shading/);
  });
});

describe('Forge activation — light wakes the dormant finish passes', () => {
  const litSpec = {
    ...SCIMITAR_SPEC,
    light: LIGHT,
    parts: SCIMITAR_SPEC.parts.map((p) => (p.id === 'bezel' ? { ...p, shading: 'faceted' } : p)),
  };

  it('directional shading replaces radial: template emits lit/shadow classes', () => {
    const bundle = forgeItemAsset(litSpec);
    const classes = new Set(bundle.template.coordinates.map((c) => c.shading));
    expect(classes.has('lit')).toBe(true);
    expect(classes.has('shadow')).toBe(true);
  });

  it('selout fires: blade rim colors vary by orientation instead of one flat anchor', () => {
    const lit = forgeItemAsset(litSpec);
    const flat = forgeItemAsset(SCIMITAR_SPEC);
    const rimColors = (bundle) => new Set(
      bundle.fills.coordinates.filter((c) => c.partId === 'blade' && c.isRim).map((c) => c.color),
    );
    expect(rimColors(flat).size).toBe(1);             // dormant: one declared anchor
    expect(rimColors(lit).size).toBeGreaterThan(1);   // active: orientation-shifted
  });

  it('facets fire on shading:"faceted" parts with registry-anchored tones', () => {
    const bundle = forgeItemAsset(litSpec);
    const interior = bundle.fills.coordinates.filter((c) => c.partId === 'bezel' && !c.isRim);
    const tones = new Set(interior.map((c) => c.color));
    expect(tones.size).toBeGreaterThanOrEqual(2);
    const anchors = new Set(Object.values(MATERIAL_PALETTES.diamond.anchors));
    for (const c of interior) expect(anchors.has(c.color), c.color).toBe(true);
  });

  it('stays deterministic with light enabled', () => {
    const a = forgeItemAsset(litSpec);
    const b = forgeItemAsset(litSpec);
    expect(JSON.stringify(a.assetPacket)).toBe(JSON.stringify(b.assetPacket));
    expect(a.fills.hash).toBe(b.fills.hash);
  });

  it('the archived scimitar (no light) is byte-identical to its pre-feature output', () => {
    const bundle = forgeItemAsset(SCIMITAR_SPEC);
    expect(hashItemSpec(bundle.spec)).toBe('fnv1a_7cde379c');
    expect(bundle.shader.hash).toBe('fnv1a_FC53ECBB');
    expect(bundle.assetPacket.geometry.coordinates.length).toBe(596);
  });
});
