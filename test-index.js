import { generateCandidates } from './codex/core/phonology/g2p/candidates/index.js';
import { CmuPhonemeEngine } from './codex/core/phonology/cmu.phoneme.engine.js';

async function test() {
  await CmuPhonemeEngine.init();
  const cmuEntries = Array.from(CmuPhonemeEngine._entriesByWord.entries());
  console.log("Compound candidates test for AWKWARDMIND:");
  const c = generateCandidates("AWKWARDMIND", cmuEntries);
  console.log(c.length);
  console.log(c[0]);
}

test();
