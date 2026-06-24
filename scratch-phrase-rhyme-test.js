import { PhonemeEngine } from "./codex/core/phonology/phoneme.engine.js";

function getPhraseSyllables(phrase) {
  const words = phrase.split(' ');
  const syllables = [];
  for (const w of words) {
    const a = PhonemeEngine.analyzeDeep(w);
    if (a && a.syllables) {
      syllables.push(...a.syllables);
    }
  }
  return syllables;
}

async function testPhraseRhyme(phrase1, phrase2) {
  const syllables1 = getPhraseSyllables(phrase1);
  const syllables2 = getPhraseSyllables(phrase2);
  
  const mockAnalysis1 = { syllables: syllables1 };
  const mockAnalysis2 = { syllables: syllables2 };
  
  const result = PhonemeEngine.scoreMultiSyllableMatch(mockAnalysis1, mockAnalysis2);
  console.log(`"${phrase1}" vs "${phrase2}":`, result);
}

async function main() {
  await PhonemeEngine.init();

  console.log("=== True Phrase Rhyme Tests ===");
  const tests = [
  // A-rhymes: AE - ER/IH
  { a: "Bastard", b: "Master" },
  { a: "Master", b: "pattern" },
  { a: "pattern", b: "Habit" },
  
  // B-rhymes: AO - ER/IH - AY
  { a: "falls in line", b: "awkward mind" },
  { a: "awkward mind", b: "slaughtered spines" },
  { a: "slaughtered spines", b: "draw the line" },
  { a: "draw the line", b: "drawing mine" }
];
  for (const t of tests) {
    await testPhraseRhyme(t.a, t.b);
  }
}

main();
