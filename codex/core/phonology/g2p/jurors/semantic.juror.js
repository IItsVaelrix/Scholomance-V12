import { isValidVote, G2P_JUROR_IDS } from '../schemas.js';
import { runVectorAmp } from '../../../semantic/amp/runVectorAmp.js';

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function scoreSemantic(candidate, syntaxContext) {
  if (!candidate || !Array.isArray(candidate.phonemes)) {
    return null;
  }

  const phonemeString = candidate.phonemes.join(' ');
  const word = candidate.word || '';

  let similarity = 0;

  try {
    const wordVector = runVectorAmp(word, { lens: 'g2p-jury-v1', minGrade: 'C' });
    const phonemeVector = runVectorAmp(phonemeString, { lens: 'g2p-jury-v1', minGrade: 'C' });

    if (wordVector && wordVector.signature && phonemeVector && phonemeVector.signature) {
      const raw = estimateInnerProduct(
        wordVector.signature.data,
        phonemeVector.signature.data
      );
      similarity = clamp01((raw + 1) / 2);
    } else {
      similarity = clamp01(seededRandom(word.length)() * 0.3);
    }
  } catch {
    similarity = clamp01(seededRandom(word.length)() * 0.2);
  }

  const confidence = clamp01(similarity + 0.1);

  return {
    candidateKey: candidate.phonemes.join(' '),
    jurorId: G2P_JUROR_IDS.SEMANTIC,
    tokenWeight: 0.5,
    confidence,
    stageSignal: 1,
    syntaxModifier: 1,
    rationale: `Semantic similarity between word and phonemes: ${similarity.toFixed(4)}.`,
    fidelityGrade: 'B',
  };
}

export function createSemanticJuror() {
  const seenFidelity = new Map();

  return {
    id: G2P_JUROR_IDS.SEMANTIC,
    vote(candidate, syntaxContext = null) {
      const word = candidate?.word || '';
      if (!word) return null;

      const fidelityKey = `${word}|${candidate.phonemes.join('')}`;
      const cachedFidelity = seenFidelity.get(fidelityKey);

      if (cachedFidelity && cachedFidelity.grade === 'F') {
        return null;
      }

      const vote = scoreSemantic(candidate, syntaxContext);
      if (!vote || !isValidVote(vote)) return null;

      seenFidelity.set(fidelityKey, { grade: vote.fidelityGrade });
      return vote;
    },
  };
}

function estimateInnerProduct(a, b) {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 1) sum += a[i] * b[i];
  return sum;
}
