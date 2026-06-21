import { DeepRhymeEngine } from './codex/core/rhyme-astrology/deepRhyme.engine.js';
import { PhonemeEngine } from './codex/core/phonology/phoneme.engine.js';

async function test() {
  const engine = new DeepRhymeEngine();
  const text = `Bastard never falls in line
Master with an awkward mind`;

  const result = await engine.analyzeDocument(text);
  
  const f = PhonemeEngine.analyzeDeep('FALLSINLINE');
  const a = PhonemeEngine.analyzeDeep('AWKWARDMIND');
  const score = PhonemeEngine.scoreMultiSyllableMatch(f, a);
  console.log("direct score:", score);
}

test();
