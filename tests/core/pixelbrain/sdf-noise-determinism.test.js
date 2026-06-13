import { describe, it, expect } from 'vitest';
import { forgeItemAsset } from '../../../codex/core/pixelbrain/item-foundry.js';
import { normalizeItemSpec } from '../../../codex/core/pixelbrain/item-spec.js';
import { registerPartProfile } from '../../../codex/core/pixelbrain/part-profile-library.js';

// Dummy profile for the test part (real ones are in the library)
registerPartProfile('weapon.sword.blade', (params = {}) => ({
  cells: [],
  anchors: { root: { x: 32, y: 40 } }
}));

describe('SDF+Noise Determinism', () => {
  it('same ITEM-SPEC with SDF/noise produces identical assetPacket and PNG hash', () => {
    const baseSpec = {
      contract: 'ITEM-SPEC-v1',
      id: 'test.sdf.noise.v1',
      class: 'weapon',
      archetype: 'sword',
      canvas: { width: 64, height: 80, gridSize: 1 },
      seed: 12345,
      bytecode: 'VW-TEST',
      parts: [
        {
          id: 'blade',
          profile: 'weapon.sword.blade',
          sdf: {
            contract: 'PB-SDF-v1',
            primitives: [{ type: 'capsule', params: { p1: {x:32,y:10}, p2: {x:32,y:60}, radius: 5 } }],
            operations: []
          },
          noise: {
            contract: 'PB-NOISE-v1',
            id: 'wear',
            type: 'fbm',
            seed: 999,
            frequency: 0.05,
            amplitude: 0.3
          }
        }
      ]
    };
    const specA = normalizeItemSpec(baseSpec);
    const specB = normalizeItemSpec(baseSpec);
    const a = forgeItemAsset(specA, { includePng: true, includeShader: false });
    const b = forgeItemAsset(specB, { includePng: true, includeShader: false });
    expect(JSON.stringify(a.assetPacket)).toBe(JSON.stringify(b.assetPacket));
    expect(Buffer.compare(a.png, b.png)).toBe(0);
  });
});
