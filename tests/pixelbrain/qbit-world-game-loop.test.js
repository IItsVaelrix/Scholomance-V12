import { describe, expect, it } from 'vitest';

import {
  buildQbitWorldGameLoop,
  harvestFaceResource,
  QBIT_WORLD_PRESETS,
} from '../../codex/core/pixelbrain/qbit-world-game-loop.js';

function materialSignature(world) {
  return JSON.stringify(world.telemetry.materialHistogram);
}

describe('qbit-world-game-loop', () => {
  it('builds a playable face/resource surface from school weights', () => {
    const world = buildQbitWorldGameLoop(QBIT_WORLD_PRESETS.VOID, { size: 16, maxRadius: 12 });
    expect(world.faces.length).toBeGreaterThan(0);
    expect(world.telemetry.solidCount).toBeGreaterThan(0);
    expect(world.telemetry.faceCount).toBe(world.faces.length);
    expect(world.params.dominantSchoolId).toBe('VOID');
  });

  it('returns deterministic worlds for the same school signature', () => {
    const a = buildQbitWorldGameLoop(QBIT_WORLD_PRESETS.ALCHEMY, { size: 16, maxRadius: 12 });
    const b = buildQbitWorldGameLoop(QBIT_WORLD_PRESETS.ALCHEMY, { size: 16, maxRadius: 12 });

    expect(a.faces.map((face) => face.id)).toEqual(b.faces.map((face) => face.id));
    expect(materialSignature(a)).toBe(materialSignature(b));
  });

  it('school swaps alter the world material signature', () => {
    const voidWorld = buildQbitWorldGameLoop(QBIT_WORLD_PRESETS.VOID, { size: 16, maxRadius: 12 });
    const alchemyWorld = buildQbitWorldGameLoop(QBIT_WORLD_PRESETS.ALCHEMY, { size: 16, maxRadius: 12 });

    expect(voidWorld.params.dominantSchoolId).toBe('VOID');
    expect(alchemyWorld.params.dominantSchoolId).toBe('ALCHEMY');
    expect(materialSignature(voidWorld)).not.toBe(materialSignature(alchemyWorld));
  });

  it('harvestFaceResource exposes material, school, energy, and position', () => {
    const world = buildQbitWorldGameLoop(QBIT_WORLD_PRESETS.SONIC, { size: 16, maxRadius: 12 });
    const resource = harvestFaceResource(world.faces[0]);

    const VALID_SCHOOLS = new Set(['SONIC','PSYCHIC','VOID','ALCHEMY','WILL','NECROMANCY','ABJURATION','DIVINATION']);
    expect(resource.materialName).toBeTruthy();
    expect(VALID_SCHOOLS.has(resource.schoolId)).toBe(true);
    expect(resource.amount).toBeGreaterThanOrEqual(1);
    expect(resource.position).toEqual({
      x: world.faces[0].x,
      y: world.faces[0].y,
      z: world.faces[0].z,
    });
  });

  it('emits PixelBrain, Wand, and DivWand assembly contracts', () => {
    const world = buildQbitWorldGameLoop(QBIT_WORLD_PRESETS.VOID, { size: 16, maxRadius: 12 });

    expect(world.pixelBrainAsset.contract).toBe('PB-QBIT-WORLD-ASSET-v1');
    expect(world.pixelBrainAsset.assembledBy ?? world.pixelBrainAsset.fidelity.assembledBy).toBe('PixelBrain');
    expect(world.wandProposal.proposedFormula.role).toBe('voxel.terrain');
    expect(world.wandProposal.proposedFormula.formula.type).toBe('fibonacci');
    expect(world.divWandNode.type).toBe('world');
    expect(world.divWandNode.role).toBe('world-scene');
  });

  it('rejects harvesting a face without resource metadata', () => {
    expect(() => harvestFaceResource({ x: 0, y: 0, z: 0 })).toThrow(/resource metadata/);
  });
});

describe('block attribution via PhotonicBridge', () => {
  const VALID_SCHOOLS = new Set(['SONIC','PSYCHIC','VOID','ALCHEMY','WILL','NECROMANCY','ABJURATION','DIVINATION']);

  it('every face resource carries a non-empty blockId', () => {
    const world = buildQbitWorldGameLoop(QBIT_WORLD_PRESETS.VOID, { size: 16, maxRadius: 12 });
    for (const face of world.faces) {
      expect(typeof face.resource.blockId).toBe('string');
      expect(face.resource.blockId.length).toBeGreaterThan(0);
    }
  });

  it('every face resource carries a valid schoolId', () => {
    const world = buildQbitWorldGameLoop(QBIT_WORLD_PRESETS.VOID, { size: 16, maxRadius: 12 });
    for (const face of world.faces) {
      expect(VALID_SCHOOLS.has(face.resource.schoolId)).toBe(true);
    }
  });

  it('blockId and schoolId are deterministic for the same world build', () => {
    const a = buildQbitWorldGameLoop(QBIT_WORLD_PRESETS.ALCHEMY, { size: 16, maxRadius: 12 });
    const b = buildQbitWorldGameLoop(QBIT_WORLD_PRESETS.ALCHEMY, { size: 16, maxRadius: 12 });
    for (let i = 0; i < a.faces.length; i++) {
      expect(a.faces[i].resource.blockId).toBe(b.faces[i].resource.blockId);
      expect(a.faces[i].resource.schoolId).toBe(b.faces[i].resource.schoolId);
    }
  });

  it('face schoolIds are not all identical to dominantSchoolId (per-position attribution)', () => {
    const world = buildQbitWorldGameLoop(QBIT_WORLD_PRESETS.QBIT, { size: 16, maxRadius: 12 });
    const uniqueSchools = new Set(world.faces.map(f => f.resource.schoolId));
    expect(uniqueSchools.size).toBeGreaterThan(1);
  });

  it('returns lightPoints array with projected screen coords', () => {
    const world = buildQbitWorldGameLoop(QBIT_WORLD_PRESETS.VOID, { size: 16, maxRadius: 12 });
    expect(Array.isArray(world.lightPoints)).toBe(true);
    expect(world.lightPoints.length).toBeGreaterThan(0);
    for (const lp of world.lightPoints) {
      expect(typeof lp.sx).toBe('number');
      expect(typeof lp.sy).toBe('number');
      expect(typeof lp.r).toBe('number');
      expect(lp.energy).toBeGreaterThanOrEqual(0);
      expect(lp.energy).toBeLessThanOrEqual(1);
      expect(typeof lp.schoolId).toBe('string');
    }
  });

  it('vol.tags has an entry for every occupied cell', () => {
    const world = buildQbitWorldGameLoop(QBIT_WORLD_PRESETS.VOID, { size: 16, maxRadius: 12 });
    const vol = world.volume;
    let solidCount = 0;
    for (let y = 0; y < vol.height; y++)
      for (let z = 0; z < vol.depth; z++)
        for (let x = 0; x < vol.width; x++)
          if (vol.cells[y * vol.width * vol.depth + z * vol.width + x] >> 4 > 0) solidCount++;
    expect(world.volume.tags.size).toBe(solidCount);
  });

  it('every face carries ao in [0,1] and light in [0,1]', () => {
    const world = buildQbitWorldGameLoop(QBIT_WORLD_PRESETS.VOID, { size: 16, maxRadius: 12 });
    for (const face of world.faces) {
      expect(typeof face.ao).toBe('number');
      expect(face.ao).toBeGreaterThanOrEqual(0);
      expect(face.ao).toBeLessThanOrEqual(1);
      expect(typeof face.light).toBe('number');
      expect(face.light).toBeGreaterThanOrEqual(0);
      expect(face.light).toBeLessThanOrEqual(1);
    }
  });
});
