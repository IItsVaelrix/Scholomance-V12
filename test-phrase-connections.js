import { DeepRhymeEngine } from './codex/core/rhyme-astrology/deepRhyme.engine.js';
import { PhonemeEngine } from './codex/core/phonology/phoneme.engine.js';

async function test() {
  const engine = new DeepRhymeEngine();
  const text = `Bastard never falls in line
Master with an awkward mind
Habit is to back stab
pattern ends with slaughtered spines
And they never draw the line
But I'm drawing mine`;

  const result = await engine.analyzeDocument(text);
  
  console.log("Phrase Connections found:", result.allConnections.filter(c => c.type === 'phrase_compound').length);
  const phrases = result.allConnections.filter(c => c.type === 'phrase_compound');
  for (const p of phrases) {
    console.log(`${p.wordA.word} <-> ${p.wordB.word} (score: ${p.score})`);
  }
}

test();
