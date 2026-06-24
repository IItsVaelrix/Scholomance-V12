import { DeepRhymeEngine } from './codex/core/rhyme-astrology/deepRhyme.engine.js';
import { PhonemeEngine } from './codex/core/phonology/phoneme.engine.js';
import { VerseIRCompiler } from './codex/core/rhyme-astrology/verse-ir.compiler.js';
import { SyntaxLayer } from './codex/core/rhyme-astrology/syntax.layer.js';

const text = `The quick brown fox
Jumps over the lazy dog
Because the dog is slow
And the fox is quick.`;

async function runTest() {
  const compiler = new VerseIRCompiler();
  const ir = compiler.compile(text, { mode: 'balanced' });
  const syntax = new SyntaxLayer(ir);
  
  // Need to prime the async engine first
  await PhonemeEngine.primeG2PBatch(text);

  const engine = new DeepRhymeEngine(PhonemeEngine, { enableSyntaxGate: true });
  const result = engine.analyzeDocument(ir, syntax);
  
  console.log("=== CONNECTIONS ===");
  for (const conn of result.allConnections) {
    if (conn.score >= 0.95) {
      console.log(`[${conn.score.toFixed(3)}] ${conn.wordA.word} - ${conn.wordB.word} (${conn.type}) [Syntax Gate: ${conn.syntax?.gate} (x${conn.syntax?.multiplier})]`);
    }
  }
}

runTest().catch(console.error);
