import { PhonemeEngine } from './codex/core/phonology/phoneme.engine.js';
async function test() {
  await PhonemeEngine.init();
  console.log("awkward:", PhonemeEngine.analyzeDeep("awkward").phonemes.join(' '));
  console.log("mind:", PhonemeEngine.analyzeDeep("mind").phonemes.join(' '));
  console.log("falls:", PhonemeEngine.analyzeDeep("falls").phonemes.join(' '));
  console.log("in:", PhonemeEngine.analyzeDeep("in").phonemes.join(' '));
  console.log("line:", PhonemeEngine.analyzeDeep("line").phonemes.join(' '));
}
test();
