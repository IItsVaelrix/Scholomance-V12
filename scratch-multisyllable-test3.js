import { PhonemeEngine } from "./codex/core/phonology/phoneme.engine.js";

async function main() {
  const analysis1 = await PhonemeEngine.analyzeWord("crazy");
  console.log(JSON.stringify(analysis1, null, 2));
}
main();
