import { describe, it, expect } from 'vitest';
import { SDFShapeAMP } from '../../../codex/core/pixelbrain/sdf-shape-amp.js';
import { normalizePB_SDF_v1 } from '../../../codex/core/pixelbrain/pixelbrain-asset-packet.js';

describe('SDFShapeAMP', () => {
  it('quantizes capsule SDF to integer cells using construction bounds', () => {
    const sdf = normalizePB_SDF_v1({
      contract: 'PB-SDF-v1',
      primitives: [
        { type: 'capsule', params: { p1: {x:32,y:10}, p2: {x:32,y:50}, radius: 4 } }
      ],
      operations: []
    });
    const construction = { skeleton: { center: {x:32,y:30}, rings: [{radius:20}] } };
    const result = SDFShapeAMP({ construction, silhouette: { cells: [] } }, { sdf, partId: 'blade', minCells: 1 });
    expect(result.partCells.length).toBeGreaterThan(0);
    expect(result.partCells.every(c => Number.isInteger(c.x) && Number.isInteger(c.y))).toBe(true);
  });

  it('loud fails if minCells not met', () => {
    const sdf = normalizePB_SDF_v1({ contract: 'PB-SDF-v1', primitives: [], operations: [] });
    expect(() => SDFShapeAMP({}, { sdf, partId: 'empty', minCells: 10 })).toThrow(/emitted 0 cells/);
  });
});
