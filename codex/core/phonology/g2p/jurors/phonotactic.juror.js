import {
  G2P_JUROR_IDS,
  isValidVote,
} from '../schemas.js';

let cachedBigramStats = null;
let cachedEntries = null;

function computeBigramStats(entries) {
  const bigrams = new Map();

  for (const [, phonemeVariants] of entries) {
    for (const phonemes of phonemeVariants) {
      for (let i = 0; i < phonemes.length - 1; i += 1) {
        const a = phonemes[i].replace(/[0-9]/g, '');
        const b = phonemes[i + 1].replace(/[0-9]/g, '');
        const key = `${a}|${b}`;
        bigrams.set(key, (bigrams.get(key) || 0) + 1);
      }
    }
  }

  const total = Array.from(bigrams.values()).reduce((sum, count) => sum + count, 0) || 1;
  const stats = new Map();
  for (const [key, count] of bigrams) {
    stats.set(key, count / total);
  }

  return stats;
}

function getBigramStats(entries) {
  if (cachedBigramStats === null || cachedEntries !== entries) {
    cachedBigramStats = computeBigramStats(entries);
    cachedEntries = entries;
  }
  return cachedBigramStats;
}

function scorePhonotactic(phonemes, bigramStats) {
  if (!Array.isArray(phonemes) || phonemes.length < 2) {
    return {
      candidateKey: phonemes.join(' '),
      jurorId: G2P_JUROR_IDS.PHONOTACTIC,
      tokenWeight: 0.1,
      confidence: 0.1,
      stageSignal: 0.5,
      syntaxModifier: 1,
      rationale: 'Insufficient phonemes for bigram scoring.',
      fidelityGrade: 'D',
    };
  }

  const truncated = phonemes.slice(0, 4).map((p) => p.replace(/[0-9]/g, ''));
  let validBigrams = 0;
  let totalScore = 0;

  for (let i = 0; i < truncated.length - 1; i += 1) {
    const key = `${truncated[i]}|${truncated[i + 1]}`;
    const probability = bigramStats.get(key) || 0;
    totalScore += probability;
    validBigrams += 1;
  }

  const avgProbability = validBigrams > 0 ? totalScore / validBigrams : 0;
  const confidence = clamp01(avgProbability * 10 + 0.2);
  const tokenWeight = clamp(avgProbability * 5 + 0.5, 0.05, 1.5);

  const rationale = `Average CMU bigram probability: ${avgProbability.toFixed(4)}. Confidence derived from ${validBigrams} bigram(s).`;

  return {
    candidateKey: phonemes.join(' '),
    jurorId: G2P_JUROR_IDS.PHONOTACTIC,
    tokenWeight,
    confidence,
    stageSignal: 1,
    syntaxModifier: 1,
    rationale,
    fidelityGrade: 'A',
  };
}

export function createPhonotacticJuror(cmuEntries) {
  const bigramStats = getBigramStats(cmuEntries);

  return {
    id: G2P_JUROR_IDS.PHONOTACTIC,
    vote(candidate) {
      if (!candidate || !Array.isArray(candidate.phonemes)) {
        return null;
      }

      const vote = scorePhonotactic(candidate.phonemes, bigramStats);
      if (!isValidVote(vote)) return null;

      return vote;
    },
  };
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}
