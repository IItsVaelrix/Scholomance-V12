import { PhonemeEngine } from "./codex/core/phonology/phoneme.engine.js";

async function testRhyme(word1, word2) {
  const analysis1 = await PhonemeEngine.analyzeDeep(word1);
  const analysis2 = await PhonemeEngine.analyzeDeep(word2);
  const result = PhonemeEngine.scoreMultiSyllableMatch(analysis1, analysis2);
  console.log(`${word1} vs ${word2}:`, result);
}

async function main() {
  await testRhyme("crazy", "daisy");
  await testRhyme("water", "daughter");
  await testRhyme("nation", "station");
  await testRhyme("remember", "september");
}
main();
