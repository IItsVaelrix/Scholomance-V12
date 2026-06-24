import { PhonemeEngine } from './codex/core/phonology/phoneme.engine.js';
import { PhoneticSimilarity } from './codex/core/phonology/phoneticSimilarity.js';

function isSingleNasalCodaSubstitution(codaA, codaB) {
  if (!codaA || !codaB) return false;
  if (codaA.length !== 1 || codaB.length !== 1) return false;
  const nasals = new Set(['M', 'N', 'NG']);
  return nasals.has(codaA[0]) && nasals.has(codaB[0]);
}

async function test() {
  await PhonemeEngine.primeG2PBatch(['FALLSINLINE', 'AWKWARDMIND']);
  const f = PhonemeEngine.analyzeDeep('FALLSINLINE');
  const a = PhonemeEngine.analyzeDeep('AWKWARDMIND');
  
  const revA = [...f.syllables].reverse();
  const revB = [...a.syllables].reverse();
  
  console.log("revA:", revA.map(s => `${s.vowel} ${s.codaPhonemes.join('')}`));
  console.log("revB:", revB.map(s => `${s.vowel} ${s.codaPhonemes.join('')}`));
  
  for (let i = 0; i < Math.min(revA.length, revB.length); i++) {
      const sA = revA[i], sB = revB[i];
      const vowelScore = PhoneticSimilarity.getVowelSimilarity(sA.vowel, sB.vowel);
      const codaScore = PhoneticSimilarity.getArraySimilarity(sA.codaPhonemes, sB.codaPhonemes);
      console.log(`Syl ${i} vowelScore=${vowelScore} codaScore=${codaScore} stressA=${sA.stress} stressB=${sB.stress}`);
      
      if (i === 0) {
          const hasCodaA = sA.codaPhonemes.length > 0;
          const hasCodaB = sB.codaPhonemes.length > 0;
          if ((hasCodaA || hasCodaB) && codaScore < 0.85) {
               console.log("Failed coda check. isSingleNasalCodaSubstitution?", isSingleNasalCodaSubstitution(sA.codaPhonemes, sB.codaPhonemes));
          }
      }
  }
}

test();
