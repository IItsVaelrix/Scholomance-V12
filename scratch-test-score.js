import { PhoneticSimilarity } from "./codex/core/phonology/phoneticSimilarity.js";

function scoreMultiSyllableMatch(wordA, wordB) {
    if (!wordA?.syllables || !wordB?.syllables) return { syllablesMatched: 0, score: 0, type: 'none' };
    const revA = [...wordA.syllables].reverse(), revB = [...wordB.syllables].reverse();
    let matched = 0, totalScore = 0;

    for (let i = 0; i < Math.min(revA.length, revB.length); i++) {
      const sA = revA[i], sB = revB[i];
      const vowelScore = PhoneticSimilarity.getVowelSimilarity(sA.vowel, sB.vowel);
      const codaScore = PhoneticSimilarity.getArraySimilarity(sA.codaPhonemes, sB.codaPhonemes);

      const stressMatch = (sA.stress > 0) === (sB.stress > 0);
      
      let effectiveCodaScore = codaScore;
      if (sA.codaPhonemes.length === 0 && sB.codaPhonemes.length === 0 && !stressMatch) {
          effectiveCodaScore = 0.0;
      }

      // Lessen coda penalty if vowel score is very high (pure assonance)
      let s;
      if (vowelScore >= 0.85) {
         s = (vowelScore * 0.80) + (effectiveCodaScore * 0.20);
      } else {
         s = (vowelScore * 0.60) + (effectiveCodaScore * 0.40);
      }

      const finalS = stressMatch ? s : Math.min(s, 0.55);
      if (finalS < 0.60) break;
      matched++; totalScore += finalS;
    }
    let score = matched > 0 ? totalScore / matched : 0;
    
    if (matched === 1 && revA.length > 1 && revB.length > 1 && !(revA[0].stress > 0) && !(revB[0].stress > 0)) {
        score *= 0.5;
    }

    if (score < 0.60) return { syllablesMatched: 0, score: 0, type: 'none' };
    let type = 'none';
    if (matched >= 3) type = 'dactylic'; else if (matched === 2) type = 'feminine'; else if (matched === 1) type = 'masculine';
    return { syllablesMatched: matched, score, type };
}

import('./codex/core/phonology/phoneme.engine.js').then(async m => {
  await m.PhonemeEngine.init();
  const pairs = [
    ['Nuclear Winter', 'Jupiter splinter'],
    ['Sorrow Stain', 'Borrowed Pain'],
    ['Glossary rhymer', 'Lossily Brighter'],
    ['Metaphor', 'Get the horn'],
    ['Believe me', 'We need these'],
    ['Steel Core', 'Real Bored']
  ];
  for (const [w1, w2] of pairs) {
    const a1 = m.PhonemeEngine.analyzeDeep(w1);
    const a2 = m.PhonemeEngine.analyzeDeep(w2);
    console.log(w1, 'vs', w2, ':', scoreMultiSyllableMatch(a1, a2));
  }
})
