import { isValidVote, G2P_JUROR_IDS } from '../schemas.js';

function scoreSyntactic(candidate, syntaxContext) {
  if (!candidate || !Array.isArray(candidate.phonemes)) {
    return null;
  }

  const phonemes = candidate.phonemes;
  const lastVowel = phonemes[phonemes.length - 2];
  const hasStress = lastVowel && /\d/.test(lastVowel);

  let tokenWeight = 0.5;
  let confidence = 0.5;
  let stageSignal = 1;
  let syntaxModifier = 1;

  if (syntaxContext) {
    if (syntaxContext.role === 'content') {
      confidence = clamp(confidence + 0.15, 0, 1);
      syntaxModifier = clamp(syntaxModifier * 1.1, 0.2, 2.8);
    }

    if (syntaxContext.stressRole === 'primary' && hasStress) {
      tokenWeight = clamp(tokenWeight + 0.2, 0.05, 1.5);
      stageSignal = clamp(stageSignal + 0.1, 0.05, 1.6);
    }

    if (syntaxContext.stressRole === 'unstressed') {
      confidence = clamp(confidence - 0.1, 0, 1);
      stageSignal = clamp(stageSignal - 0.2, 0.05, 1.6);
    }
  }

  const rationale = `Syntactic analysis: role=${syntaxContext?.role || 'unknown'}, stressRole=${syntaxContext?.stressRole || 'unknown'}, hasStress=${hasStress}.`;

  return {
    candidateKey: candidate.phonemes.join(' '),
    jurorId: G2P_JUROR_IDS.SYNTACTIC,
    tokenWeight,
    confidence,
    stageSignal,
    syntaxModifier,
    rationale,
    fidelityGrade: 'B',
  };
}

export function createSyntacticJuror() {
  return {
    id: G2P_JUROR_IDS.SYNTACTIC,
    vote(candidate, syntaxContext = null) {
      const vote = scoreSyntactic(candidate, syntaxContext);
      if (!vote || !isValidVote(vote)) return null;
      return vote;
    },
  };
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}
