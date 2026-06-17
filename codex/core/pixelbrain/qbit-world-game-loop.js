import {
  createVoxelVolume,
  cellIndex,
  getCellMaterialId,
  isCellOccupied,
  setCellMaterial,
  ENERGY_TYPES,
} from './voxel-volume.js';
import { generateFibonacciSeeds } from './wand-seed-lift.js';
import { assignMaterial } from './qbit-field.js';
import { collectHollowDeltas } from './hollowness-amp.js';
import { applyVoxelDeltas } from './voxel-delta.js';
import { runBiomeCoherenceAMP } from './biome-coherence-amp.js';
import { collectFaces } from './iso-projector.js';
import {
  generateVoxelFieldFromScrollAnalysis,
  schoolWeightsToEnergyMix,
} from './scroll-to-voxel-world.js';

export const QBIT_WORLD_SIZE = 32;

export const QBIT_WORLD_PRESETS = Object.freeze({
  QBIT: Object.freeze({ ALCHEMY: 0.32, SONIC: 0.24, PSYCHIC: 0.20, WILL: 0.16, DIVINATION: 0.08 }),
  VOID: Object.freeze({ VOID: 0.75, NECROMANCY: 0.15, ABJURATION: 0.10 }),
  ALCHEMY: Object.freeze({ ALCHEMY: 0.70, DIVINATION: 0.20, WILL: 0.10 }),
  SONIC: Object.freeze({ SONIC: 0.72, WILL: 0.18, PSYCHIC: 0.10 }),
  PSYCHIC: Object.freeze({ PSYCHIC: 0.74, DIVINATION: 0.16, SONIC: 0.10 }),
  WILL: Object.freeze({ WILL: 0.76, SONIC: 0.14, ALCHEMY: 0.10 }),
});

export const MATERIAL_NAMES = Object.freeze({
  0: 'air',
  1: 'earth',
  2: 'stone',
  3: 'granite',
  4: 'crystal',
});

export const ENERGY_TYPE_NAMES = Object.freeze(
  Object.fromEntries(Object.entries(ENERGY_TYPES).map(([name, id]) => [id, name]))
);

function buildSeeds(volume, seedOptions = {}) {
  const raw = generateFibonacciSeeds(
    {
      iterations: seedOptions.iterations ?? 6,
      scale: seedOptions.scale ?? 0.75,
    },
    volume,
    {
      energyType: ENERGY_TYPES.STRUCTURAL,
      initialEnergy: seedOptions.initialEnergy ?? 0.5,
    }
  );

  return raw.map((seed, index) => ({
    vx: seed.vx,
    vy: seed.vy,
    vz: seed.vz,
    energy: seed.energy,
    index,
  }));
}

function buildPixelBrainAssembly(params, telemetry) {
  return Object.freeze({
    contract: 'PB-QBIT-WORLD-ASSET-v1',
    renderer: 'pixelbrain.voxel.iso',
    dominantSchoolId: params.dominantSchoolId,
    dominantEnergyTypeId: params.dominantEnergyTypeId,
    materialHistogram: Object.freeze({ ...telemetry.materialHistogram }),
    faceCount: telemetry.faceCount,
    density: telemetry.density,
    fidelity: Object.freeze({
      source: 'qbit-world-game-loop',
      assembledBy: 'PixelBrain',
      wandSeed: 'fibonacci',
      divWandNodeType: 'world',
    }),
  });
}

function buildWandProposal(schoolWeights) {
  return Object.freeze({
    rationale: 'Level 5 QBIT world seed: TrueSight school weights drive the voxel field.',
    confidence: 0.95,
    reviewRequired: false,
    sourceIntentHash: `qbit-world-${JSON.stringify(schoolWeights)}`,
    evalSuiteId: 'suite-qbit-world-level5',
    proposedFormula: Object.freeze({
      role: 'voxel.terrain',
      material: 'qbit-field',
      paletteChannel: 0,
      formula: Object.freeze({
        type: 'fibonacci',
        iterations: 6,
        scale: 0.75,
      }),
    }),
  });
}

function buildDivWandWorldNode(params, schoolWeights) {
  return Object.freeze({
    id: `qbit-world-${String(params.dominantSchoolId).toLowerCase()}`,
    type: 'world',
    role: 'world-scene',
    layout: Object.freeze({
      width: 960,
      height: 640,
    }),
    props: Object.freeze({
      schoolWeights: Object.freeze({ ...schoolWeights }),
      interactive: true,
      source: 'PixelBrain QBIT Level 5',
    }),
  });
}

function histogramOccupiedMaterials(volume) {
  const materialHistogram = {};
  let solidCount = 0;

  for (let y = 0; y < volume.height; y++) {
    for (let z = 0; z < volume.depth; z++) {
      for (let x = 0; x < volume.width; x++) {
        if (!isCellOccupied(volume, x, y, z)) continue;
        solidCount += 1;
        const materialId = getCellMaterialId(volume, x, y, z);
        materialHistogram[materialId] = (materialHistogram[materialId] ?? 0) + 1;
      }
    }
  }

  return {
    solidCount,
    density: solidCount / (volume.width * volume.height * volume.depth),
    materialHistogram,
  };
}

function buildFaceResource(face, field, params) {
  const energy = field.energyAt(face.x, face.y, face.z);
  const materialName = MATERIAL_NAMES[face.materialId] ?? `material-${face.materialId}`;
  const energyType = ENERGY_TYPE_NAMES[params.dominantEnergyTypeId] ?? 'UNKNOWN';

  return Object.freeze({
    id: `${materialName}.${energyType}.${face.x}.${face.y}.${face.z}.${face.faceType}`,
    materialId: face.materialId,
    materialName,
    energyType,
    schoolId: params.dominantSchoolId,
    amount: Math.max(1, Math.round((energy + params.emission + 0.1) * 10)),
    energy: Number(energy.toFixed(4)),
    position: Object.freeze({ x: face.x, y: face.y, z: face.z }),
    faceType: face.faceType,
  });
}

/**
 * Build the first playable QBIT loop artifact:
 * language-school weights -> Level 5 voxel world -> inspectable faces ->
 * deterministic harvest resources.
 */
export function buildQbitWorldGameLoop(schoolWeights, options = {}) {
  const size = options.size ?? QBIT_WORLD_SIZE;
  const volume = createVoxelVolume(size, size, size);
  const seeds = buildSeeds(volume, options.seed);
  const { field, params, mix, seeds: taggedSeeds } = generateVoxelFieldFromScrollAnalysis(
    seeds,
    schoolWeights,
    volume,
    { maxRadius: options.maxRadius ?? Math.floor(size * 0.75) }
  );

  for (let y = 0; y < size; y++) {
    for (let z = 0; z < size; z++) {
      for (let x = 0; x < size; x++) {
        const energy = field.energyAt(x, y, z);
        volume.energyField[cellIndex(volume, x, y, z)] = energy;
        setCellMaterial(volume, x, y, z, assignMaterial(energy));
      }
    }
  }

  // Crystal context: no surface lock (not terrain), no energy floor (PHI
  // works on all occupied cells). Terrain contexts use energyMin + surfaceLockDepth.
  const { deltas: hollowDeltas, surfaceLocked } = collectHollowDeltas(volume, {
    iterations: options.hollowIterations ?? 3,
    surfaceLockDepth: 0,
    energyMin: 0,
  });
  applyVoxelDeltas(volume, hollowDeltas, surfaceLocked);
  runBiomeCoherenceAMP(volume, {
    energyAt: (cell) => field.energyAt(cell.x, cell.y, cell.z),
  });

  const faces = collectFaces(
    volume,
    (x, y, z) => getCellMaterialId(volume, x, y, z),
    (x, y, z) => isCellOccupied(volume, x, y, z)
  ).map((face, index) => {
    const typedFace = { ...face, type: face.faceType };
    return Object.freeze({
      ...typedFace,
      id: `${face.x}:${face.y}:${face.z}:${face.faceType}:${index}`,
      resource: buildFaceResource(face, field, params),
    });
  });

  const telemetry = Object.freeze({
    ...histogramOccupiedMaterials(volume),
    faceCount: faces.length,
    seedCount: taggedSeeds.length,
    energyMix: schoolWeightsToEnergyMix(schoolWeights),
  });

  return Object.freeze({
    volume,
    field,
    faces: Object.freeze(faces),
    params,
    mix,
    seeds: taggedSeeds,
    telemetry,
    pixelBrainAsset: buildPixelBrainAssembly(params, telemetry),
    wandProposal: buildWandProposal(schoolWeights),
    divWandNode: buildDivWandWorldNode(params, schoolWeights),
  });
}

export function harvestFaceResource(face) {
  if (!face?.resource) {
    throw new TypeError('harvestFaceResource requires a face with resource metadata');
  }
  return face.resource;
}
