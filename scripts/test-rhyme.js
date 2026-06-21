import { createPanelAnalysisService } from '../codex/server/services/panelAnalysis.service.js';
import { PhonemeEngine } from '../codex/core/phonology/phoneme.engine.js';

const text = `The quick brown fox
Jumps over the lazy dog
Because the dog is slow
And the fox is quick.
To see the bee and the tree
It was a good day for me
We can go to the show
Oh yes we can do so
My cat in the hat
Sat on the mat`;

async function runTest() {
  const service = await createPanelAnalysisService({ phonemeEngine: PhonemeEngine });
  const result = await service.analyzePanels(text);
  
  console.log("=== CONNECTIONS >= 0.60 ===");
  const allConnections = result.analysis?.syntaxSummary?.allConnections || result.analysis?.allConnections || [];
  for (const conn of allConnections) {
    if (conn.score >= 0.8) {
      console.log(`[${conn.score.toFixed(3)}] ${conn.wordA.word} - ${conn.wordB.word} (${conn.type}) [Gate: ${conn.syntax?.gate} x${conn.syntax?.multiplier}]`);
    }
  }
}

runTest().catch(console.error);
