import { PhonemeEngine } from './codex/core/phonology/phoneme.engine.js';

async function test() {
  await PhonemeEngine.init();
  const words = ["Bastard", "never", "falls", "in", "line", "Master", "with", "an", "awkward", "mind", "Habit", "is", "to", "back", "stab", "pattern", "ends", "slaughtered", "spines"];
  for (const word of words) {
    const analysis = PhonemeEngine.analyzeDeepWithDiagnostics(word);
    console.log(word, "=>", analysis.diagnostics.source);
  }
}

test().catch(console.error);
