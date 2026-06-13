import { describe, expect, it } from 'vitest';

import { forgeItemAsset } from '../../../codex/core/pixelbrain/item-foundry.js';
import { normalizeItemSpec, hashItemSpec } from '../../../codex/core/pixelbrain/item-spec.js';
import { MATERIAL_PALETTES } from '../../../codex/core/pixelbrain/material-registry.js';
import { validateMirroredTrimPairs, MIRRORED_TRIM_PAIRS } from '../../../codex/core/pixelbrain/mirrored-trim-validator.js';
import { buildVoidChestplateSpec, forgeVoidChestplate } from '../../../scripts/generate-void-chestplate.mjs';

const VOID_MATERIALS = [
  'voidsteel',
  'obsidian',
  'deep_indigo_steel',
  'void_gold',
  'void_core',
  'amethyst_resonance',
  'void_rune_glow',
  'void_cloth',
  'blacksteel',
];

function countByPart(coordinates) {
  const counts = {};
  for (const cell of coordinates) counts[cell.partId] = (counts[cell.partId] || 0) + 1;
  return counts;
}

describe('VOID Chestplate PDR implementation', () => {
  it('registers the VOID material slots as full deterministic ramps', () => {
    for (const id of VOID_MATERIALS) {
      const def = MATERIAL_PALETTES[id];
      expect(def, id).toBeDefined();
      for (const anchor of ['void', 'shadow', 'deep', 'body', 'frost', 'spectral', 'whiteCore']) {
        expect(def.anchors[anchor], `${id}.${anchor}`).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    }
  });

  it('normalizes the canonical spec with trim and strict symmetry intact', () => {
    const spec = normalizeItemSpec(buildVoidChestplateSpec());
    expect(spec.contract).toBe('ITEM-SPEC-v1');
    expect(spec.symmetry).toEqual({ axis: 'vertical', mode: 'strict' });
    expect(spec.proportions).toMatchObject({
      profile: 'human_regular',
      allowOversizedPauldrons: false,
    });
    expect(spec.fidelity).toMatchObject({
      qualityTarget: 'pro_game_icon',
      paletteBudget: 64,
    });
    expect(spec.parts.find((part) => part.id === 'body').trim.material).toBe('void_gold');
    expect(spec.parts.find((part) => part.id === 'body').profile).toBe('armor.chestplate.void_royal_human');
    expect(spec.parts.find((part) => part.id === 'left_pauldron').profile).toBe('armor.pauldron.void_reference_human');
    expect(spec.parts.find((part) => part.id === 'right_pauldron').mirrorOf).toBe('left_pauldron');
    expect(spec.shader.kind).toBe('void-armor-breath');
  });

  it('forges a readable armor artifact with required chestplate parts', () => {
    const bundle = forgeItemAsset(buildVoidChestplateSpec());
    const coords = bundle.assetPacket.geometry.coordinates;
    const counts = countByPart(coords);

    expect(coords.length).toBeGreaterThan(900);
    expect(counts.body).toBeGreaterThan(700);
    expect(counts.left_pauldron).toBeGreaterThan(50);
    expect(counts.right_pauldron).toBeGreaterThan(50);
    expect(counts.center_core).toBeGreaterThan(20);
    expect(counts.harness).toBeGreaterThan(50);
    expect(counts.top_crystal).toBeGreaterThan(20);
    expect(counts.lower_drop).toBeGreaterThan(10);
    expect(counts.rune_channels).toBeGreaterThan(10);
    expect(bundle.fills.heraldry?.[0]).toMatchObject({ id: 'emblem', mark: 'eye' });
    expect(bundle.fills.heraldry?.[0].cells).toBeGreaterThan(0);
    expect(bundle.fills.heraldry?.[0].warnings).toEqual([]);
    expect(bundle.fills.diagnostics.motifCells).toBeGreaterThan(0);
    expect(bundle.template.chestplateDiagnostics?.ok).toBe(true);
    expect(bundle.template.chestplateDiagnostics?.metadata.pauldronCount).toBe(2);
    expect(bundle.fills.chestplateBevel.changedCount).toBeGreaterThan(0);
    expect(bundle.fills.crystalCore.changedCount).toBeGreaterThan(0);
    expect(bundle.geometry.amp).toBe('pixelbrain.geometry-amp');
    expect(bundle.geometry.parts.some((part) => part.role === 'body_voidsteel')).toBe(true);
    expect(bundle.geometry.parts.some((part) => part.role === 'shoulder_enamel')).toBe(true);
    expect(bundle.assetPacket.metadata.compatibility.geometry.hash).toBe(bundle.geometry.hash);
  });

  it('enforces human-sized shoulder proportions for the deterministic pro profile', () => {
    const bundle = forgeItemAsset(buildVoidChestplateSpec());
    const proportions = bundle.fidelity.proportions.diagnostics;

    expect(proportions.profile).toBe('human_regular');
    expect(proportions.shoulderRatio).toBeLessThanOrEqual(1.28);
    expect(proportions.pauldronHeightRatio).toBeLessThanOrEqual(0.22);
    expect(proportions.pauldronOuterDropRatio).toBeLessThanOrEqual(0.18);
    expect(proportions.neckGapRatio).toBeGreaterThanOrEqual(0.24);
    expect(proportions.waistRatio).toBeGreaterThanOrEqual(0.58);
    expect(proportions.waistRatio).toBeLessThanOrEqual(0.78);
  });

  it('rejects oversized pauldrons unless an exaggerated profile opts in', () => {
    const oversized = buildVoidChestplateSpec();
    oversized.parts = oversized.parts.map((part) => {
      if (part.id === 'body') return { ...part, profile: 'armor.chestplate.void_royal', params: {} };
      if (part.id === 'left_pauldron') return { ...part, profile: 'armor.pauldron.angular_royal' };
      return part;
    });

    expect(() => forgeItemAsset(oversized)).toThrow(/human_regular chestplate proportions failed/);

    const ceremonial = {
      ...oversized,
      proportions: {
        profile: 'ceremonial_exaggerated',
        allowOversizedPauldrons: true,
      },
    };
    expect(forgeItemAsset(ceremonial).fidelity.proportions.ok).toBe(true);
  });

  it('quantizes final output under the deterministic palette budget', () => {
    const bundle = forgeItemAsset(buildVoidChestplateSpec());
    const palette = bundle.fidelity.palette;
    const finalColors = new Set(bundle.assetPacket.geometry.coordinates.map((cell) => cell.color));

    expect(palette.ok).toBe(true);
    expect(palette.uniqueColors).toBeLessThanOrEqual(64);
    expect(finalColors.size).toBe(palette.uniqueColors);
    expect(bundle.assetPacket.metadata.compatibility.fidelity.palette.uniqueColors).toBe(palette.uniqueColors);
  });

  it('emits shader metadata and a material slot manifest for export', () => {
    const { bundle, diagnostics } = forgeVoidChestplate();
    expect(bundle.shader.packet.contract).toBe('PB-SHADER-v1');
    expect(bundle.shader.packet.id).toContain('void-armor-breath');
    expect(bundle.shader.fragmentSource).toContain('float fbm(vec2 p)');
    expect(bundle.shader.fragmentSource).toContain('vec2 domainWarp(vec2 p, float time)');
    expect(bundle.shader.fragmentSource).toContain('float maskBody(vec2 uv)');
    expect(bundle.shader.fragmentSource).toContain('float maskShoulder(vec2 uv)');
    expect(bundle.shader.fragmentSource).toContain('Geometry AMP hash:');
    expect(diagnostics.materialSlotManifest.body).toMatchObject({
      fill: 'voidsteel',
      trim: 'void_gold',
      outline: 'blacksteel',
    });
    expect(diagnostics.materialSlotManifest.right_pauldron).toEqual(diagnostics.materialSlotManifest.left_pauldron);
    expect(diagnostics.heraldry?.[0].cells).toBeGreaterThan(0);
    expect(diagnostics.fills.motifCells).toBeGreaterThan(0);
    expect(diagnostics.chestplate.metadata.pauldronCount).toBe(2);
    expect(diagnostics.shader).toMatchObject({ contract: 'PB-SHADER-v1' });
  });

  it('is deterministic across repeated forge runs', () => {
    const a = forgeItemAsset(buildVoidChestplateSpec());
    const b = forgeItemAsset(buildVoidChestplateSpec());
    expect(hashItemSpec(a.spec)).toBe(hashItemSpec(b.spec));
    expect(JSON.stringify(a.assetPacket)).toBe(JSON.stringify(b.assetPacket));
    expect(a.godotArtifact).toBe(b.godotArtifact);
    expect(a.shader.hash).toBe(b.shader.hash);
    expect(Buffer.compare(a.png, b.png)).toBe(0);
  });

  describe('mirrored trim pair validator', () => {
    it('passes all levels on the canonical VOID chestplate', () => {
      const bundle = forgeItemAsset(buildVoidChestplateSpec(), { includePng: false });
      const pairs = MIRRORED_TRIM_PAIRS['armor.chestplate.sovereign-v1'];
      const result = validateMirroredTrimPairs(bundle.assetPacket.geometry.coordinates, pairs);
      expect(result.ok).toBe(true);
      expect(result.failures).toEqual([]);
    });

    it('fails loud at silhouette level when a mirrored rim cell is removed', () => {
      const bundle = forgeItemAsset(buildVoidChestplateSpec(), { includePng: false });
      const pairs = MIRRORED_TRIM_PAIRS['armor.chestplate.sovereign-v1'];
      // Strip one rim cell from the right pauldron — breaks silhouette symmetry
      const sabotaged = bundle.assetPacket.geometry.coordinates.filter(c => {
        if (c.partId === 'right_pauldron' && c.isRim && c.y === 10) return false;
        return true;
      });
      const result = validateMirroredTrimPairs(sabotaged, pairs);
      expect(result.ok).toBe(false);
      expect(result.failures).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'PB_TRIM_MIRROR_CELL_MISSING',
            pair: 'pauldron-outer-trim',
          }),
        ]),
      );
    });

    it('fails at material level when a mirrored cell has wrong color', () => {
      const bundle = forgeItemAsset(buildVoidChestplateSpec(), { includePng: false });
      const pairs = MIRRORED_TRIM_PAIRS['armor.chestplate.sovereign-v1'];
      // Repaint one rim cell on the right pauldron to the wrong color
      const sabotaged = bundle.assetPacket.geometry.coordinates.map(c => {
        if (c.partId === 'right_pauldron' && c.isRim && c.y === 10 && c.x > 50) {
          return { ...c, color: '#FF00FF' }; // non-gold, non-enamel color
        }
        return c;
      });
      const result = validateMirroredTrimPairs(sabotaged, pairs);
      const materialFailures = result.failures.filter(f => f.code === 'PB_TRIM_MIRROR_MATERIAL_MISMATCH');
      expect(materialFailures.length).toBeGreaterThan(0);
      expect(result.ok).toBe(false);
    });

    it('validates that manual polish import does not collapse trim identity', () => {
      const bundle = forgeItemAsset(buildVoidChestplateSpec(), { includePng: false });
      const coords = bundle.assetPacket.geometry.coordinates;
      // Verify left pauldron has rim cells with the correct partId
      const leftRim = coords.filter(c => c.partId === 'left_pauldron' && c.isRim);
      const rightRim = coords.filter(c => c.partId === 'right_pauldron' && c.isRim);
      expect(leftRim.length).toBeGreaterThan(20);
      expect(rightRim.length).toBeGreaterThan(20);
      // Every rim cell must carry the correct partId, not a lookalike
      for (const c of leftRim) {
        expect(c.partId).toBe('left_pauldron');
      }
      for (const c of rightRim) {
        expect(c.partId).toBe('right_pauldron');
      }
      // Shader does not invent trim geometry — the mask exists from lattice
      expect(bundle.geometry.masks.left_pauldron.length).toBeGreaterThan(0);
      expect(bundle.geometry.masks.right_pauldron.length).toBeGreaterThan(0);
      expect(bundle.shader.packet.contract).toBe('PB-SHADER-v1');
    });
  });
});
