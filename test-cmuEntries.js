import { CmuPhonemeEngine } from './codex/core/phonology/cmu.phoneme.engine.js';
async function test() {
  await CmuPhonemeEngine.init();
  const entries = Array.from(CmuPhonemeEngine._entriesByWord.entries());
  console.log("Entries count:", entries.length);
  console.log("Sample 0:", entries[0]);
  console.log("Sample for 'FALLS':", CmuPhonemeEngine._entriesByWord.get("FALLS"));
}
test();
