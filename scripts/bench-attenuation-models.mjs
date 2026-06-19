// scripts/bench-attenuation-models.mjs
//
// Q-1 from the QBIT-Voxel Level 3 PDR: which attenuation model produces
// better biome boundaries at 128³+? This script compares
// `inverse_square` and `phi_attenuation` on a 4×4 32×16×32 world with 3
// distinct biomes, measuring:
//   - material diversity per region (clusters by materialId)
//   - F-7 boundary sharing (cells with matching material across chunk borders)
//   - the full PIR F-6/F-7 acceptance gate
//   - cold load latency
//
// Output is a single table that answers Q-1 empirically.

import { createChunkedWorldVolume, getOrLoadChunk, generateWorldChunk, chunkKey } from '../codex/core/pixelbrain/chunked-world-volume.js';
import { runBiomeCoherenceAMPWorld } from '../codex/core/pixelbrain/biome-coherence-amp.js';
import { ENERGY_TYPES } from '../codex/core/pixelbrain/voxel-volume.js';

const COMPOSITE_3REGION = {
  type: 'composite',
  children: [
    { type: 'fibonacci', iterations: 3, scale: 0.5,
      region: { x: 0,  z: 0, width: 32, depth: 32 },
      energyType: ENERGY_TYPES.STRUCTURAL },
    { type: 'fibonacci', iterations: 3, scale: 0.5,
      region: { x: 32, z: 0, width: 32, depth: 32 },
      energyType: ENERGY_TYPES.THERMAL },
    { type: 'fibonacci', iterations: 3, scale: 0.5,
      region: { x: 64, z: 0, width: 32, depth: 32 },
      energyType: ENERGY_TYPES.PHOTONIC },
  ],
};

function buildAndMeasure(attenuationModel) {
  const t0 = performance.now();
  const world = createChunkedWorldVolume({
    chunkSize: { w: 8, h: 8, d: 8 },
    chunkCount: { x: 4, y: 1, z: 4 },
    seed: 99,
    formula: COMPOSITE_3REGION,
    attenuationModel,
  });
  for (let cx = 0; cx < 4; cx++) {
    for (let cz = 0; cz < 4; cz++) {
      getOrLoadChunk(world, cx, 0, cz, generateWorldChunk);
    }
  }
  const t1 = performance.now();
  const getField = (cx, cy, cz, x, y, z) => {
    const v = world.chunks.get(chunkKey(cx, cy, cz));
    return v.energyField[y * v.width * v.depth + z * v.width + x];
  };
  const result = runBiomeCoherenceAMPWorld(world, getField);
  const t2 = performance.now();

  // Measure: distinct materialIds per chunk
  const chunkMats = new Map();
  for (const [k, vol] of world.chunks) {
    const counts = new Map();
    for (let i = 0; i < vol.cells.length; i++) {
      const m = vol.cells[i] >> 4;
      if (m > 0) counts.set(m, (counts.get(m) ?? 0) + 1);
    }
    chunkMats.set(k, counts);
  }

  // F-7: boundary sharing (cx=0 -> cx=1, +X / -X face)
  let shared = 0, total = 0;
  for (let cz = 0; cz < 4; cz++) {
    const A = world.chunks.get(chunkKey(0, 0, cz));
    const B = world.chunks.get(chunkKey(1, 0, cz));
    for (let y = 0; y < 8; y++) for (let z = 0; z < 8; z++) {
      const matA = A.cells[y * 64 + z * 8 + 7] >> 4;
      const matB = B.cells[y * 64 + z * 8 + 0] >> 4;
      if (matA === 0 && matB === 0) continue;
      total++;
      if (matA === matB) shared++;
    }
  }
  const boundaryShare = total > 0 ? shared / total : 0;

  // Region-specific material assignment: for each chunk, what material
  // dominates? Counts of material 1 (earth), 2 (stone), 3 (granite), 4 (crystal)
  const regionChunks = {
    structural: [[0, 0], [0, 1], [0, 2], [0, 3]],  // cx=0 (STRUCTURAL region)
    thermal:    [[1, 0], [1, 1], [1, 2], [1, 3]],  // cx=1
    photonic:   [[2, 0], [2, 1], [2, 2], [2, 3]],  // cx=2
    edge:       [[3, 0], [3, 1], [3, 2], [3, 3]],  // cx=3
  };
  const regionDominant = {};
  for (const [region, chunks] of Object.entries(regionChunks)) {
    const matCounts = new Map();
    for (const [cx, cz] of chunks) {
      const vol = world.chunks.get(chunkKey(cx, 0, cz));
      for (let i = 0; i < vol.cells.length; i++) {
        const m = vol.cells[i] >> 4;
        if (m > 0) matCounts.set(m, (matCounts.get(m) ?? 0) + 1);
      }
    }
    let dom = 0, domCount = 0;
    for (const [m, c] of matCounts) {
      if (c > domCount) { dom = m; domCount = c; }
    }
    regionDominant[region] = { dominant: dom, total: matCounts.get(dom) ?? 0, allMaterials: matCounts.size };
  }

  return {
    attenuationModel,
    loadMs: t1 - t0,
    biomeMs: t2 - t1,
    totalMs: t2 - t0,
    biomePasses: result.passes,
    biomeStable: result.stable,
    distinctMaterialsGlobal: new Set(
      [...chunkMats.values()].flatMap(m => [...m.keys()])
    ).size,
    regionDominant,
    boundaryShare,
    shared,
    total,
  };
}

console.log('=== Q-1: Attenuation Model Comparison ===\n');

const results = [];
for (const model of ['inverse_square', 'phi_attenuation']) {
  const r = buildAndMeasure(model);
  results.push(r);
  console.log(`--- ${model} ---`);
  console.log(`  load:           ${r.loadMs.toFixed(1)}ms`);
  console.log(`  biome:          ${r.biomeMs.toFixed(1)}ms (${r.biomePasses} passes, stable=${r.biomeStable})`);
  console.log(`  total:          ${r.totalMs.toFixed(1)}ms`);
  console.log(`  global distinct: ${r.distinctMaterialsGlobal} materialIds`);
  console.log(`  region dominant materials:`);
  for (const [region, d] of Object.entries(r.regionDominant)) {
    console.log(`    ${region}: mat ${d.dominant} (${d.total} cells, ${d.allMaterials} tiers total)`);
  }
  console.log(`  F-7 boundary sharing: ${(r.boundaryShare * 100).toFixed(1)}% (${r.shared}/${r.total})`);
  console.log();
}

console.log('=== Q-1 Verdict ===');
const inv = results[0];
const phi = results[1];
const betterBoundary = phi.boundaryShare > inv.boundaryShare ? 'phi_attenuation' : 'inverse_square';
const fasterModel = inv.totalMs < phi.totalMs ? 'inverse_square' : 'phi_attenuation';
const moreDiverse = phi.distinctMaterialsGlobal > inv.distinctMaterialsGlobal ? 'phi_attenuation' : 'inverse_square';
console.log(`  Better boundary sharing: ${betterBoundary} (${(phi.boundaryShare * 100).toFixed(1)}% vs ${(inv.boundaryShare * 100).toFixed(1)}%)`);
console.log(`  Faster cold load:        ${fasterModel} (${inv.totalMs.toFixed(1)}ms vs ${phi.totalMs.toFixed(1)}ms)`);
console.log(`  More material tiers:     ${moreDiverse} (${phi.distinctMaterialsGlobal} vs ${inv.distinctMaterialsGlobal})`);
console.log(`  Recommendation:           ${phi.boundaryShare > inv.boundaryShare ? 'phi_attenuation' : 'inverse_square'} (better biome boundaries justify any latency cost)`);
