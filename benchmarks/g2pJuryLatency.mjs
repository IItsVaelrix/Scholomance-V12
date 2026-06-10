import { measureLatency, printLatencyResults, assertLatencyGate } from './g2pJury.benchmark.js';

async function runLatencyBenchmark() {
  const words = ['KELDOMN', 'QUANTUM', 'PIXEL', 'XENON'];
  const candidateCounts = [3, 6, 10];
  const baseIterations = 1000;

  let g2pJury;
  try {
    g2pJury = await import('../codex/core/phonology/g2p/g2p.adapter.js');
  } catch (error) {
    console.error('Failed to import G2P adapter:', error);
    process.exit(1);
  }

  const verdictFactory = async (word) => {
    const result = await g2pJury.runG2PJury(word, null, { policy: 'pass' });
    return result.verdict;
  };

  console.log('\n=== G2P Jury Latency Benchmark Suite ===');
  console.log(`Target: P95 < 16ms on Steam Deck-class CPU\n`);

  let allPassed = true;

  for (const word of words) {
    console.log(`\n--- Word: ${word} ---`);
    const result = await measureLatency(verdictFactory, word, baseIterations);
    const passed = printLatencyResults(result);
    if (!passed) allPassed = false;
  }

  for (const candidateCount of candidateCounts) {
    console.log(`\n--- Candidate count test: ${candidateCount} ---`);
    const result = await measureLatency(
      (word) => g2pJury.runG2PJury(word, null, { policy: 'pass', maxCandidates: candidateCount }).then(r => r.verdict),
      'KELDOMN',
      baseIterations
    );
    const p95 = result.p95;
    console.log(`P95: ${p95.toFixed(3)} ms (${p95 < 16 ? 'PASSED' : 'FAILED'})`);
    if (p95 >= 16) allPassed = false;
  }

  console.log(`\n=== Latency Benchmark Summary ===`);
  console.log(`Result: ${allPassed ? 'ALL PASSED' : 'SOME FAILED'}`);

  process.exit(allPassed ? 0 : 1);
}

runLatencyBenchmark().catch((error) => {
  console.error('Latency benchmark failed:', error);
  process.exit(1);
});
