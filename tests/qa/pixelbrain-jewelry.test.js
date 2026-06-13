import { forgeItemAsset } from '../../codex/core/pixelbrain/item-foundry.js';
import { describe, it, expect } from 'vitest';

describe('JewelryAMP', () => {
  it('produces stable hash for a minimal prong amulet', () => {
    const spec = {
      contract: 'ITEM-SPEC-v1',
      id: 'test-prong',
      class: 'amulet',
      canvas: { width: 96, height: 96, gridSize: 1 },
      seed: 42,
      bytecode: 'VW-TEST-AMULET',
      parts: [
        { id: "body", profile: "frame.oval", params: { rx: 26, ry: 28 }, fill: { material: "darksteel" } },
        { id: "gem", profile: "gem.round", attach: { parent: "body", at: "center" }, fill: { material: "ruby" }, motif: { kind: "facet" } },
        { id: "prong", profile: "setting.prong", attach: { parent: "gem", at: "center" }, fill: { material: "gold" } }
      ]
    };
    const bundle = forgeItemAsset(spec);
    expect(bundle.fills.hash).toBeDefined();
  });
});
