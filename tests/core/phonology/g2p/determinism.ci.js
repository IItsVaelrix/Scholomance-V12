import { verdictHash, isValidVerdict, serializeDeterministicVerdictForHash } from '../codex/core/phonology/g2p/schemas.js';

export function runDeterminismCI(word, verdictFactory, iterations = 100) {
  const hashes = new Set();

  for (let i = 0; i < iterations; i += 1) {
    const verdict = verdictFactory(word);
    if (!verdict || !isValidVerdict(verdict)) {
      throw new Error(`Iteration ${i}: invalid verdict`);
    }
    hashes.add(verdictHash(verdict));
  }

  return {
    passed: hashes.size === 1,
    uniqueHashes: hashes.size,
    iterations,
    word,
    sampleHash: Array.from(hashes)[0],
  };
}

export function validateRuntimeExcludedFromHash(verdict) {
  const verdictStr = serializeDeterministicVerdictForHash(verdict);
  const hasLatency = verdictStr.includes('latencyMs');
  const hasMemory = verdictStr.includes('memoryDeltaBytes');
  const hasHealth = verdictStr.includes('bytecodeHealth');

  return {
    passed: !hasLatency && !hasMemory && !hasHealth,
    latencyExcluded: !hasLatency,
    memoryExcluded: !hasMemory,
    bytecodeHealthExcluded: !hasHealth,
  };
}

export function generateDeterminismTestFixtures() {
  return ['KELDOMN', 'QUANTUM', 'PIXEL', 'XENON', 'QUASAR'];
}

export async function runCIFixtures(verdictFactory, words, iterations = 100) {
  const results = {
    passed: true,
    totalWords: words.length,
    passedWords: 0,
    failedWords: 0,
    failures: [],
  };

  for (const word of words) {
    try {
      const determinism = runDeterminismCI(word, verdictFactory, iterations);
      const verdict = verdictFactory(word);
      const runtimeExcluded = validateRuntimeExcludedFromHash(verdict);

      if (determinism.passed && runtimeExcluded.passed) {
        results.passedWords += 1;
      } else {
        results.passed = false;
        results.failedWords += 1;
        results.failures.push({
          word,
          determinism,
          runtimeExcluded,
        });
      }
    } catch (error) {
      results.passed = false;
      results.failedWords += 1;
      results.failures.push({ word, error: String(error) });
    }
  }

  return results;
}

export function assertCIResults(results) {
  if (!results.passed) {
    const messages = results.failures.map((f) => `${f.word}: ${f.error || 'determinism/runtime check failed'}`);
    throw new Error(`G2P Determinism CI failed:\n${messages.join('\n')}`);
  }
  console.log(`G2P Determinism CI passed: ${results.passedWords}/${results.totalWords} words × ${results.iterations || 100} iterations`);
}

export function printCIResults(results) {
  console.log(`\n=== G2P Determinism CI Results ===`);
  console.log(`Overall: ${results.passed ? 'PASSED' : 'FAILED'}`);
  console.log(`Words tested: ${results.totalWords}`);
  console.log(`Passed: ${results.passedWords}`);
  console.log(`Failed: ${results.failedWords}`);

  for (const failure of results.failures) {
    console.log(`\n  FAILED: ${failure.word}`);
    if (failure.determinism) {
      console.log(`    Unique hashes: ${failure.determinism.uniqueHashes}`);
    }
    if (failure.runtimeExcluded) {
      console.log(`    latencyExcluded: ${failure.runtimeExcluded.latencyExcluded}`);
      console.log(`    memoryExcluded: ${failure.runtimeExcluded.memoryExcluded}`);
      console.log(`    bytecodeHealthExcluded: ${failure.runtimeExcluded.bytecodeHealthExcluded}`);
    }
    if (failure.error) {
      console.log(`    Error: ${failure.error}`);
    }
  }
}
