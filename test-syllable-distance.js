import { DeepRhymeEngine } from './codex/core/rhyme-astrology/deepRhyme.engine.js';
import { multisyllabicRhymeHeuristic } from './codex/core/heuristics/multisyllabic_rhyme.js';
import fs from 'fs';

async function run() {
  const text = `Bastard never falls in line
Master with an awkward mind
Habit is to back stab
pattern ends with slaughtered spines
And they never draw the line
But I'm drawing mine`;

  const engine = new DeepRhymeEngine();
  const analysis = await engine.analyzeDocument(text);
  
  console.log("Analysis:", JSON.stringify(analysis, null, 2));

  const heuristic = await multisyllabicRhymeHeuristic.scorer({ raw: text, allWords: analysis.words });
  console.log("Heuristic:", JSON.stringify(heuristic, null, 2));
}

run().catch(console.error);
