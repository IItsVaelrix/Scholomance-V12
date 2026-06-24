import { PhonemeEngine } from "./codex/core/phonology/phoneme.engine.js";

async function main() {
  const analysis1 = await PhonemeEngine.analyzeWord("crazy");
  const analysis2 = await PhonemeEngine.analyzeWord("daisy");
  console.log(JSON.stringify(analysis1.syllables, null, 2));
  console.log(JSON.stringify(analysis2.syllables, null, 2));
}
main();
