import { performance } from 'node:perf_hooks';

export async function measureLatency(verdictFactory, word, iterations = 1000) {
  const durations = [];
  const warmupIterations = Math.min(10, iterations);

  for (let i = 0; i < warmupIterations; i += 1) {
    await verdictFactory(word);
  }

  for (let i = 0; i < iterations; i += 1) {
    const start = performance.now();
    await verdictFactory(word);
    const end = performance.now();
    durations.push(end - start);
  }

  durations.sort((a, b) => a - b);

  const p50 = durations[Math.floor(durations.length * 0.5)];
  const p95 = durations[Math.floor(durations.length * 0.95)];
  const p99 = durations[Math.floor(durations.length * 0.99)];
  const max = durations[durations.length - 1];
  const min = durations[0];
  const mean = durations.reduce((sum, d) => sum + d, 0) / durations.length;

  return {
    word,
    iterations,
    p50,
    p95,
    p99,
    max,
    min,
    mean,
    under16ms: p95 < 16,
    unit: 'ms',
  };
}

export async function measureMemory(verdictFactory, word, iterations = 100) {
  const memoryDeltas = [];
  const warmupIterations = Math.min(5, iterations);

  for (let i = 0; i < warmupIterations; i += 1) {
    await verdictFactory(word);
  }

  for (let i = 0; i < iterations; i += 1) {
    if (process.memoryUsage) {
      const before = process.memoryUsage().heapUsed;
      await verdictFactory(word);
      const after = process.memoryUsage().heapUsed;
      memoryDeltas.push(Math.max(0, after - before));
    }
  }

  if (memoryDeltas.length === 0) {
    return {
      word,
      iterations,
      maxBytes: 0,
      meanBytes: 0,
      under500KB: true,
      unit: 'bytes',
    };
  }

  memoryDeltas.sort((a, b) => a - b);
  const max = memoryDeltas[memoryDeltas.length - 1];
  const mean = memoryDeltas.reduce((sum, d) => sum + d, 0) / memoryDeltas.length;
  const under500KB = max < 500 * 1024;

  return {
    word,
    iterations,
    maxBytes: max,
    meanBytes: mean,
    under500KB,
    unit: 'bytes',
  };
}

export function printLatencyResults(results) {
  console.log(`\n=== G2P Jury Latency Benchmark ===`);
  console.log(`Word: ${results.word}`);
  console.log(`Iterations: ${results.iterations}`);
  console.log(`P50:  ${results.p50.toFixed(3)} ms`);
  console.log(`P95:  ${results.p95.toFixed(3)} ms`);
  console.log(`P99:  ${results.p99.toFixed(3)} ms`);
  console.log(`Mean: ${results.mean.toFixed(3)} ms`);
  console.log(`Min:  ${results.min.toFixed(3)} ms`);
  console.log(`Max:  ${results.max.toFixed(3)} ms`);
  console.log(`Gate: ${results.under16ms ? 'PASSED (<16ms)' : 'FAILED (>=16ms)'}`);
  return results.under16ms;
}

export function printMemoryResults(results) {
  console.log(`\n=== G2P Jury Memory Benchmark ===`);
  console.log(`Word: ${results.word}`);
  console.log(`Iterations: ${results.iterations}`);
  console.log(`Max delta:  ${(results.maxBytes / 1024).toFixed(2)} KB`);
  console.log(`Mean delta: ${(results.meanBytes / 1024).toFixed(2)} KB`);
  console.log(`Gate: ${results.under500KB ? 'PASSED (<500KB)' : 'FAILED (>=500KB)'}`);
  return results.under500KB;
}

export function assertLatencyGate(results) {
  if (!results.under16ms) {
    throw new Error(`Latency gate failed: P95 was ${results.p95.toFixed(3)} ms (target <16ms)`);
  }
  console.log(`Latency gate passed: ${results.p95.toFixed(3)} ms P95`);
}

export function assertMemoryGate(results) {
  if (!results.under500KB) {
    throw new Error(`Memory gate failed: max delta was ${(results.maxBytes / 1024).toFixed(2)} KB (target <500KB)`);
  }
  console.log(`Memory gate passed: ${(results.maxBytes / 1024).toFixed(2)} KB max delta`);
}
