import { DeepRhymeEngine } from '../../../codex/core/rhyme-astrology/deepRhyme.engine.js';

async function test() {
  const engine = new DeepRhymeEngine();
  const text = `Bastard never falls in line\nMaster with an awkward mind`;
  
  const result = await engine.analyzeDocument(text);
  const phraseConnections = result.allConnections.filter(c => c.type === 'phrase_compound');
  for (const c of phraseConnections) {
     console.log(`Matched: [${c.wordA.word}] <-> [${c.wordB.word}] (score=${c.score})`);
  }
}
test();
