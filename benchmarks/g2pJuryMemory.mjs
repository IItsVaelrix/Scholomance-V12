import { measureMemory, printMemoryResults, assertMemoryGate } from './g2pJury.benchmark.js';

async function runMemoryBenchmark() {
  const words = ['KELDOMN', 'QUANTUM', 'PIXEL', 'XENON'];
  const iterations = 100;

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

  console.log('\n=== G2P Jury Memory Benchmark Suite ===');
  console.log(`Target: <500KB heap delta per jury session\n`);

  let allPassed = true;
  const memoryResults = [];

  for (const word of words) {
    const result = await measureMemory(verdictFactory, word, iterations);
    memoryResults.push(result);
    const passed = printMemoryResults(result);
    if (!passed) allPassed = false;

    try {
      assertMemoryGate(result);
    } catch (error) {
      console.error(`Memory gate failed for ${word}:`, error.message);
      allPassed = false;
    }
  }

  const maxMemory = Math.max(...memoryResults.map(r => r.maxBytes));
  const meanMemory = memoryResults.reduce((sum, r) => sum + r.meanBytes, 0) / memoryResults.length;

  console.log(`\n=== Memory Benchmark Summary ===`);
  console.log(`Words tested: ${words.length}`);
  console.log(`Max delta across all words:  ${(maxMemory / 1024).toFixed(2)} KB`);
  console.log(`Mean delta across all words: ${(meanMemory / 1024).toFixed(2)} KB`);
  console.log(`Result: ${allPassed ? 'ALL PASSED' : 'SOME FAILED'}`);

  process.exit(allPassed ? 0 : 1);
}

runMemoryBenchmark().catch((error) => {
  console.error('Memory benchmark failed:', error);
  process.exit(1);
});
