import { DeepRhymeEngine } from '../../../codex/core/rhyme-astrology/deepRhyme.engine.js';

async function test() {
  const engine = new DeepRhymeEngine();
  const text = `It's pretty obvious\nWe run the mafia`;
  
  const result = await engine.analyzeDocument(text);
  for (const c of result.allConnections) {
     const wA = c.wordA.word;
     const wB = c.wordB.word;
     if ((wA.includes("obvious") || wB.includes("obvious")) && (wA.includes("mafia") || wB.includes("mafia"))) {
        console.log(`Matched: [${wA}] <-> [${wB}] (score=${c.score})`);
     }
  }
}
test();
