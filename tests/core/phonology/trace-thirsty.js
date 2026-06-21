import { DeepRhymeEngine } from '../../../codex/core/rhyme-astrology/deepRhyme.engine.js';

async function test() {
  const engine = new DeepRhymeEngine();
  const text = `Birthdays was the worst days\nNow we sip champagne when we thirsty`;
  
  const result = await engine.analyzeDocument(text);
  for (const c of result.allConnections) {
     const wA = c.wordA.word;
     const wB = c.wordB.word;
     if ((wA.includes("worst days") || wB.includes("worst days")) && (wA.includes("thirsty") || wB.includes("thirsty"))) {
        console.log(`Matched: [${wA}] <-> [${wB}] (score=${c.score})`);
     }
  }
}
test();
