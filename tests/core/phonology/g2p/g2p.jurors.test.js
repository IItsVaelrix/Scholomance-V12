import { describe, it, expect } from 'vitest';
import {
  createPhonotacticJuror,
  createSyntacticJuror,
  createSemanticJuror,
  createGraphJuror,
  createHHMJuror,
  G2P_JUROR_IDS,
  isValidVote,
} from '../../../../codex/core/phonology/g2p/jurors/index.js';

const mockCandidate = {
  word: 'KELDOMN',
  phonemes: ['K', 'EH1', 'L', 'D', 'AA1', 'M', 'AH0', 'N'],
  source: 'rule',
  generatedBy: 'rule-v1',
};

describe('G2P Jurors', () => {
  it('createPhonotacticJuror returns valid vote', () => {
    const juror = createPhonotacticJuror([]);
    expect(juror.id).toBe(G2P_JUROR_IDS.PHONOTACTIC);

    const vote = juror.vote(mockCandidate);
    expect(vote).not.toBeNull();
    expect(isValidVote(vote)).toBe(true);
    expect(vote.jurorId).toBe('PHONOTACTIC');
  });

  it('createSyntacticJuror returns valid vote', () => {
    const juror = createSyntacticJuror();
    expect(juror.id).toBe(G2P_JUROR_IDS.SYNTACTIC);

    const vote = juror.vote(mockCandidate, { role: 'content', stressRole: 'primary' });
    expect(vote).not.toBeNull();
    expect(isValidVote(vote)).toBe(true);
    expect(vote.jurorId).toBe('SYNTACTIC');
  });

  it('createSemanticJuror returns valid vote', () => {
    const juror = createSemanticJuror();
    expect(juror.id).toBe(G2P_JUROR_IDS.SEMANTIC);

    const vote = juror.vote(mockCandidate);
    expect(vote).not.toBeNull();
    expect(isValidVote(vote)).toBe(true);
    expect(vote.jurorId).toBe('SEMANTIC');
  });

  it('createGraphJuror returns valid vote', () => {
    const juror = createGraphJuror(null);
    expect(juror.id).toBe(G2P_JUROR_IDS.GRAPH);

    const vote = juror.vote(mockCandidate);
    expect(vote).not.toBeNull();
    expect(isValidVote(vote)).toBe(true);
    expect(vote.jurorId).toBe('GRAPH');
  });

  it('createHHMJuror returns valid vote', () => {
    const juror = createHHMJuror();
    expect(juror.id).toBe(G2P_JUROR_IDS.HHM);

    const vote = juror.vote(mockCandidate);
    expect(vote).not.toBeNull();
    expect(isValidVote(vote)).toBe(true);
    expect(vote.jurorId).toBe('HHM');
  });

  it('jurors return null for invalid candidate', () => {
    const phonotactic = createPhonotacticJuror([]);
    expect(phonotactic.vote(null)).toBeNull();
    expect(phonotactic.vote({ word: 'X' })).toBeNull();
  });
});
