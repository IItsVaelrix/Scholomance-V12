import { PhonemeEngine } from './codex/core/phonology/phoneme.engine.js';

async function test() {
  await PhonemeEngine.primeAuthorityBatch(['FALLSINLINE', 'AWKWARDMIND']);
  const f = PhonemeEngine.analyzeDeepWithDiagnostics('FALLSINLINE');
  console.log("FALLSINLINE phonemes:", f.analysis.phonemes);
  console.log("FALLSINLINE syllables:", JSON.stringify(f.analysis.syllables, null, 2));
  console.log("FALLSINLINE diag:", f.diagnostics);
  
  const a = PhonemeEngine.analyzeDeepWithDiagnostics('AWKWARDMIND');
  console.log("AWKWARDMIND phonemes:", a.analysis.phonemes);
}

test();
