import { runG2PJury } from './codex/core/phonology/g2p/g2p.adapter.js';
import { PhonemeEngine } from './codex/core/phonology/phoneme.engine.js';

async function test() {
  await PhonemeEngine.init();
  const wordA = "falls in line";
  const wordB = "awkward mind";

  // Use the PhonemeEngine to generate phonemes. We'll simulate what G2P would do.
  // Actually, let's just analyze them as full strings.
  const a = PhonemeEngine.analyzeDeep(wordA.replace(/\s+/g, ''));
  const b = PhonemeEngine.analyzeDeep(wordB.replace(/\s+/g, ''));

  console.log("A syllables:", a.syllables);
  console.log("B syllables:", b.syllables);

  const score = PhonemeEngine.scoreMultiSyllableMatch(a, b);
  console.log("Score:", score);
}

test().catch(console.error);
