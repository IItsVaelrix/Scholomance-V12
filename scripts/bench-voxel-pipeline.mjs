// scripts/bench-voxel-pipeline.mjs
// Phase 3 benchmark: measure propagate() + runWorldPipeline() latency
// at the sizes the PDR cares about (32³, 64³, 128³). Used to decide
// whether optimization is needed before the PIR.
//
// Run: node scripts/bench-voxel-pipeline.mjs

import { generateWorldChunk, getOrLoadChunk, createChunkedWorldVolume, chunkKey } from '../codex/core/pixelbrain/chunked-world-volume.js';
import { runBiomeCoherenceAMPWorld } from '../codex/core/pixelbrain/biome-coherence-amp.js';

function now() {
  return performance.now();
}

function timeCold(label, makeFn, runs = 3) {
  // Make a fresh world each run so we measure the COLD load time, not the
  // cache-hit time. Biome coherence on the freshly-loaded world.
  const samples = [];
  for (let i = 0; i < runs; i++) {
    const { world, loadMs, biomeMs } = makeFn();
    samples.push({ loadMs, biomeMs });
  }
  const avgLoad = samples.reduce((a, s) => a + s.loadMs, 0) / samples.length;
  const avgBiome = samples.reduce((a, s) => a + s.biomeMs, 0) / samples.length;
  const minLoad = Math.min(...samples.map(s => s.loadMs));
  const maxLoad = Math.max(...samples.map(s => s.loadMs));
  const minBiome = Math.min(...samples.map(s => s.biomeMs));
  const maxBiome = Math.max(...samples.map(s => s.biomeMs));
  console.log(`${label}:`);
  console.log(`  load:    avg=${avgLoad.toFixed(1)}ms min=${minLoad.toFixed(1)}ms max=${maxLoad.toFixed(1)}ms (${runs} cold runs)`);
  console.log(`  biome:   avg=${avgBiome.toFixed(1)}ms min=${minBiome.toFixed(1)}ms max=${maxBiome.toFixed(1)}ms (${runs} runs)`);
  return samples;
}

function coldWorldPipelineDetailed(chunkSize, chunkCount, seed, fib = { iterations: 4, scale: 0.5 }) {
  return () => {
    const tStart = now();
    const w = createChunkedWorldVolume({
      chunkSize,
      chunkCount,
      seed,
      formula: { type: 'fibonacci', ...fib },
    });
    const tAfterCreate = now();
    // Time per-chunk generation
    const chunkTimes = { propagate: 0, materials: 0, hollowness: 0, total: 0 };
    for (let cx = 0; cx < chunkCount.x; cx++) {
      for (let cy = 0; cy < chunkCount.y; cy++) {
        for (let cz = 0; cz < chunkCount.z; cz++) {
          const tChunkStart = now();
          getOrLoadChunk(w, cx, cy, cz, generateWorldChunk);
          chunkTimes.total += now() - tChunkStart;
        }
      }
    }
    const tAfterLoad = now();
    const getField = (cx, cy, cz, x, y, z) => {
      const v = w.chunks.get(chunkKey(cx, cy, cz));
      return v.energyField[y * v.width * v.depth + z * v.width + x];
    };
    const biomeResult = runBiomeCoherenceAMPWorld(w, getField);
    const tAfterBiome = now();
    return {
      world: w,
      createMs: tAfterCreate - tStart,
      chunkTotalMs: chunkTimes.total,
      biomeMs: tAfterBiome - tAfterLoad,
      biomePasses: biomeResult.passes,
      totalMs: tAfterBiome - tStart,
    };
  };
}

console.log('=== Phase 3 Benchmarks (cold load + biome coherence) ===\n');

console.log('--- 32³ single chunk (Level 1 reference) ---');
{
  const samples = [];
  for (let i = 0; i < 3; i++) {
    const r = coldWorldPipelineDetailed({ w: 32, h: 32, d: 32 }, { x: 1, y: 1, z: 1 }, 0)();
    samples.push(r);
  }
  const avg = (k) => samples.reduce((a, s) => a + s[k], 0) / samples.length;
  console.log(`32³ single (3 cold runs):`);
  console.log(`  create:      ${avg('createMs').toFixed(1)}ms`);
  console.log(`  chunk total: ${avg('chunkTotalMs').toFixed(1)}ms (per chunk: ${(avg('chunkTotalMs')/1).toFixed(1)}ms)`);
  console.log(`  biome:       ${avg('biomeMs').toFixed(1)}ms (${avg('biomePasses').toFixed(1)} passes)`);
  console.log(`  total:       ${avg('totalMs').toFixed(1)}ms`);
}

console.log('\n--- 16³ 2x2 world (Step 2.2 reference) ---');
{
  const samples = [];
  for (let i = 0; i < 3; i++) {
    const r = coldWorldPipelineDetailed({ w: 16, h: 16, d: 16 }, { x: 2, y: 1, z: 2 }, 7)();
    samples.push(r);
  }
  const avg = (k) => samples.reduce((a, s) => a + s[k], 0) / samples.length;
  console.log(`16³ 2x2 (3 cold runs):`);
  console.log(`  create:      ${avg('createMs').toFixed(1)}ms`);
  console.log(`  chunk total: ${avg('chunkTotalMs').toFixed(1)}ms (per chunk: ${(avg('chunkTotalMs')/4).toFixed(1)}ms)`);
  console.log(`  biome:       ${avg('biomeMs').toFixed(1)}ms (${avg('biomePasses').toFixed(1)} passes)`);
  console.log(`  total:       ${avg('totalMs').toFixed(1)}ms`);
}

console.log('\n--- 8³ 4x4 world (Step 2.3 reference) ---');
{
  const samples = [];
  for (let i = 0; i < 3; i++) {
    const r = coldWorldPipelineDetailed({ w: 8, h: 8, d: 8 }, { x: 4, y: 1, z: 4 }, 99)();
    samples.push(r);
  }
  const avg = (k) => samples.reduce((a, s) => a + s[k], 0) / samples.length;
  console.log(`8³ 4x4 (3 cold runs):`);
  console.log(`  create:      ${avg('createMs').toFixed(1)}ms`);
  console.log(`  chunk total: ${avg('chunkTotalMs').toFixed(1)}ms (per chunk: ${(avg('chunkTotalMs')/16).toFixed(1)}ms)`);
  console.log(`  biome:       ${avg('biomeMs').toFixed(1)}ms (${avg('biomePasses').toFixed(1)} passes)`);
  console.log(`  total:       ${avg('totalMs').toFixed(1)}ms`);
}

console.log('\n--- 32³ 4x4 world (PDR Level 3 target) ---');
{
  const samples = [];
  for (let i = 0; i < 3; i++) {
    const r = coldWorldPipelineDetailed({ w: 32, h: 16, d: 32 }, { x: 4, y: 1, z: 4 }, 99)();
    samples.push(r);
  }
  const avg = (k) => samples.reduce((a, s) => a + s[k], 0) / samples.length;
  console.log(`32³ 4x4 (3 cold runs):`);
  console.log(`  create:      ${avg('createMs').toFixed(1)}ms`);
  console.log(`  chunk total: ${avg('chunkTotalMs').toFixed(1)}ms (per chunk: ${(avg('chunkTotalMs')/16).toFixed(1)}ms)`);
  console.log(`  biome:       ${avg('biomeMs').toFixed(1)}ms (${avg('biomePasses').toFixed(1)} passes)`);
  console.log(`  total:       ${avg('totalMs').toFixed(1)}ms`);
}

console.log('\n--- 64³ single chunk (PDR Level 3+ size) ---');
{
  const samples = [];
  for (let i = 0; i < 3; i++) {
    const r = coldWorldPipelineDetailed({ w: 64, h: 64, d: 64 }, { x: 1, y: 1, z: 1 }, 0)();
    samples.push(r);
  }
  const avg = (k) => samples.reduce((a, s) => a + s[k], 0) / samples.length;
  console.log(`64³ single (3 cold runs):`);
  console.log(`  create:      ${avg('createMs').toFixed(1)}ms`);
  console.log(`  chunk total: ${avg('chunkTotalMs').toFixed(1)}ms (per chunk: ${(avg('chunkTotalMs')/1).toFixed(1)}ms)`);
  console.log(`  biome:       ${avg('biomeMs').toFixed(1)}ms (${avg('biomePasses').toFixed(1)} passes)`);
  console.log(`  total:       ${avg('totalMs').toFixed(1)}ms`);
}
