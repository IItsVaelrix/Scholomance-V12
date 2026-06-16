/**
 * Level 1 Integration Test — QBIT-Voxel Synthesis Pipeline
 * Wires all 9 pipeline modules together to produce a 32³ voxel crystal rendered as SVG.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { writeFileSync, mkdirSync } from 'fs';

import { createVoxelVolume, cellIndex, getCellMaterialId, isCellOccupied, setCellMaterial, ENERGY_TYPES } from '../../codex/core/pixelbrain/voxel-volume.js';
import { generateFibonacciSeeds } from '../../codex/core/pixelbrain/wand-seed-lift.js';
import { propagate, assignMaterial } from '../../codex/core/pixelbrain/qbit-field.js';
import { applyHollownessAMP } from '../../codex/core/pixelbrain/hollowness-amp.js';
import { runBiomeCoherenceAMP } from '../../codex/core/pixelbrain/biome-coherence-amp.js';
import { collectFaces } from '../../codex/core/pixelbrain/iso-projector.js';
import { renderFacesToSVG } from '../../codex/core/pixelbrain/voxel-svg-renderer.js';

const SIZE = 32;

function runPipeline() {
  // Step 1: Create volume
  const volume = createVoxelVolume(SIZE, SIZE, SIZE);

  // Step 2: Generate Fibonacci seeds
  // generateFibonacciSeeds returns { vx, vy, vz, energy, energyType }
  // propagate expects { x, y, z, energy, energyType }
  // iterations=6 yields 18 seeds; initialEnergy=0.5 + decay=0.15 gives multi-material
  // gradient across the 32-voxel volume (avoids full saturation at energy=1.0)
  const rawSeeds = generateFibonacciSeeds(
    { iterations: 6, scale: 0.75 },
    volume,
    { energyType: ENERGY_TYPES.STRUCTURAL, initialEnergy: 0.5 }
  );
  const seeds = rawSeeds.map(s => ({
    x: s.vx,
    y: s.vy,
    z: s.vz,
    energy: s.energy,
    energyType: s.energyType,
  }));

  // Step 3: QBITField propagation
  const field = propagate(seeds, SIZE, SIZE, SIZE, { decay: 0.15, iterations: 3 });

  // Step 4: Assign materials from energy field — propagate does NOT write to volume
  for (let y = 0; y < SIZE; y++) {
    for (let z = 0; z < SIZE; z++) {
      for (let x = 0; x < SIZE; x++) {
        const energy = field.energyAt(x, y, z);
        volume.energyField[cellIndex(volume, x, y, z)] = energy;
        const matId = assignMaterial(energy);
        setCellMaterial(volume, x, y, z, matId);
      }
    }
  }

  // Step 5: HollownessAMP — punch cavities
  applyHollownessAMP(volume, 3);

  // Step 6: BiomeCoherenceAMP
  // biome-coherence-amp calls field.energyAt(cell) where cell is { x, y, z }
  // The QBITField's energyAt takes positional (x, y, z) — wrap it
  const biomeField = {
    energyAt: (cell) => field.energyAt(cell.x, cell.y, cell.z),
  };
  runBiomeCoherenceAMP(volume, biomeField);

  // Step 7: Collect faces via IsoProjector
  // collectFaces expects accessor functions as (x, y, z) — bind volume
  const boundGetMaterialId = (x, y, z) => getCellMaterialId(volume, x, y, z);
  const boundIsOccupied = (x, y, z) => isCellOccupied(volume, x, y, z);
  const rawFaces = collectFaces(volume, boundGetMaterialId, boundIsOccupied);

  // voxel-svg-renderer reads face.type but iso-projector stores face.faceType
  // remap faceType → type so the renderer can find the color
  const faces = rawFaces.map(f => ({ ...f, type: f.faceType }));

  // Step 8: Render to SVG
  const svg = renderFacesToSVG(faces);

  return { volume, field, faces, svg };
}

let result;

describe('QBIT-Voxel Level 1 Integration — 32³ Fibonacci Crystal', () => {
  beforeAll(() => {
    result = runPipeline();

    // Write SVG to disk
    mkdirSync('output/pixelbrain', { recursive: true });
    writeFileSync('output/pixelbrain/qbit-crystal-level1.svg', result.svg);
  });

  it('pipeline runs without errors', () => {
    expect(result).toBeDefined();
    expect(result.svg).toBeDefined();
    expect(typeof result.svg).toBe('string');
    expect(result.svg.length).toBeGreaterThan(0);
  });

  it('volume has at least some occupied cells', () => {
    const { volume } = result;
    const total = SIZE * SIZE * SIZE;
    let solidCount = 0;
    for (let y = 0; y < SIZE; y++) {
      for (let z = 0; z < SIZE; z++) {
        for (let x = 0; x < SIZE; x++) {
          if (isCellOccupied(volume, x, y, z)) solidCount++;
        }
      }
    }
    const density = solidCount / total;
    expect(solidCount).toBeGreaterThan(0);
    expect(density).toBeGreaterThan(0.05);
    expect(density).toBeLessThan(0.90);
  });

  it('multiple material types present', () => {
    const { volume } = result;
    const materialIds = new Set();
    for (let y = 0; y < SIZE; y++) {
      for (let z = 0; z < SIZE; z++) {
        for (let x = 0; x < SIZE; x++) {
          const matId = getCellMaterialId(volume, x, y, z);
          if (matId > 0) materialIds.add(matId);
        }
      }
    }
    expect(materialIds.size).toBeGreaterThanOrEqual(2);
  });

  it('faces are sorted back-to-front', () => {
    const { faces } = result;
    expect(faces.length).toBeGreaterThan(0);
    for (let i = 1; i < faces.length; i++) {
      expect(faces[i].sortKey).toBeGreaterThanOrEqual(faces[i - 1].sortKey);
    }
  });

  it('SVG contains polygons', () => {
    const { svg } = result;
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('<polygon');
  });

  it('pipeline is deterministic', () => {
    const result2 = runPipeline();
    expect(result2.svg).toBe(result.svg);
  });
});
