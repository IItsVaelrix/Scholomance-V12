import { isValidVote, G2P_JUROR_IDS } from '../schemas.js';

export function createHHMJuror() {
  return {
    id: G2P_JUROR_IDS.HHM,
    vote(candidate, syntaxContext = null) {
      if (!candidate || !Array.isArray(candidate.phonemes)) {
        return null;
      }

      const tokenWeight = 0.6;
      const confidence = 0.5;
      const stageSignal = 1;
      const syntaxModifier = 1;

      const rationale = `Hidden-state analysis: token weight=${tokenWeight}, stage signal=${stageSignal}, modifier=${syntaxModifier}.`;

      return {
        candidateKey: candidate.phonemes.join(' '),
        jurorId: G2P_JUROR_IDS.HHM,
        tokenWeight,
        confidence,
        stageSignal,
        syntaxModifier,
        rationale,
        fidelityGrade: 'C',
      };
    },
  };
}
