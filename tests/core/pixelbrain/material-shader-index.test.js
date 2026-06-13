/**
 * QA Validation: Material → shader index authority
 *
 * Regression for the opencode disparity finding: materialIndex() hardcoded
 * 6 materials while the registry holds 29 — every other material (including
 * the entire void-chestplate manifest) silently resolved to 0/'source' in
 * u_pixelbrain_material. The index must live in material-registry.js as an
 * append-only map, and this contract test pins both sides:
 *   - every registry material has an index (adding one without fails here)
 *   - legacy indices 0-5 never move (existing shader exports keep meaning)
 */

import { describe, it, expect } from 'vitest';
import {
  MATERIAL_PALETTES,
  MATERIAL_SHADER_INDEX,
} from '../../../codex/core/pixelbrain/material-registry.js';
import { resolvePixelBrainShaderUniforms } from '../../../codex/core/pixelbrain/pixelbrain-shader-uniform-providers.js';

describe('MATERIAL_SHADER_INDEX contract', () => {
  it('covers every material in the registry', () => {
    const missing = Object.keys(MATERIAL_PALETTES)
      .filter(id => !Number.isInteger(MATERIAL_SHADER_INDEX[id]));
    expect(missing).toEqual([]);
  });

  it('assigns unique indices', () => {
    const values = Object.values(MATERIAL_SHADER_INDEX);
    expect(new Set(values).size).toBe(values.length);
  });

  it('never moves the legacy six (append-only law)', () => {
    expect(MATERIAL_SHADER_INDEX.source).toBe(0);
    expect(MATERIAL_SHADER_INDEX.icy_fire).toBe(1);
    expect(MATERIAL_SHADER_INDEX.shadow_fire).toBe(2);
    expect(MATERIAL_SHADER_INDEX.holy_fire).toBe(3);
    expect(MATERIAL_SHADER_INDEX.poison_flame).toBe(4);
    expect(MATERIAL_SHADER_INDEX.void_ice).toBe(5);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(MATERIAL_SHADER_INDEX)).toBe(true);
  });
});

describe('u_pixelbrain_material uniform', () => {
  const uniformFor = (materialId) => resolvePixelBrainShaderUniforms({
    packet: { material: { id: materialId } },
  }).u_pixelbrain_material;

  it('resolves chestplate materials to distinct non-zero indices', () => {
    const voidsteel = uniformFor('voidsteel');
    const voidGold = uniformFor('void_gold');
    const amethyst = uniformFor('amethyst_resonance');
    expect(voidsteel).not.toBe(0);
    expect(voidGold).not.toBe(0);
    expect(amethyst).not.toBe(0);
    expect(new Set([voidsteel, voidGold, amethyst]).size).toBe(3);
  });

  it('keeps legacy materials at their original indices', () => {
    expect(uniformFor('source')).toBe(0);
    expect(uniformFor('void_ice')).toBe(5);
  });

  it('resolves unknown materials to 0 (source) as the explicit fallback', () => {
    expect(uniformFor('definitely_not_a_material')).toBe(0);
  });
});
