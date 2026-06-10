import { describe, it, expect } from 'vitest';
import {
  computeWeightedScore,
  tallyJuryVotes,
  resolveWinner,
  createDeterministicVerdict,
  serializeDeterministicVerdictForHash,
  verdictHash,
  generateCandidateId,
  dedupeCandidates,
  isValidVote,
  isValidVerdict,
} from '../../../../codex/core/phonology/g2p/schemas.js';

describe('G2P Schemas and Tally', () => {
  it('computeWeightedScore returns deterministic value', () => {
    const vote = {
      candidateKey: 'K EH1 L D',
      jurorId: 'PHONOTACTIC',
      tokenWeight: 0.5,
      confidence: 0.8,
      stageSignal: 0.9,
      syntaxModifier: 0.7,
      rationale: 'Bigram match',
      fidelityGrade: 'B',
    };

    const score = computeWeightedScore(vote);
    expect(score).toBeCloseTo(0.028, 3);
  });

  it('tallyJuryVotes aggregates scores by candidate key', () => {
    const candidates = [
      { id: 'c1', word: 'WORD', phonemes: ['W', 'ER1', 'D'], source: 'rule', generatedBy: 'rule-v1' },
      { id: 'c2', word: 'WORD', phonemes: ['W', 'AO1', 'R', 'D'], source: 'rule', generatedBy: 'rule-v1' },
    ];

    const votes = [
      { candidateKey: 'W ER1 D', jurorId: 'PHONOTACTIC', tokenWeight: 0.5, confidence: 0.8, stageSignal: 0.9, syntaxModifier: 0.7, rationale: 'r1', fidelityGrade: 'B' },
      { candidateKey: 'W AO1 R D', jurorId: 'SYNTACTIC', tokenWeight: 0.4, confidence: 0.75, stageSignal: 0.8, syntaxModifier: 0.6, rationale: 'r2', fidelityGrade: 'B' },
    ];

    const aggregate = tallyJuryVotes(candidates, votes);

    expect(aggregate['W ER1 D']).toBeCloseTo(0.028, 3);
    expect(aggregate['W AO1 R D']).toBeCloseTo(0.0168, 3);
  });

  it('resolveWinner selects highest aggregate then shortest', () => {
    const candidates = [
      { id: 'c1', word: 'WORD', phonemes: ['W', 'ER1', 'D'], source: 'rule', generatedBy: 'rule-v1' },
      { id: 'c2', word: 'WORD', phonemes: ['W', 'AO1', 'R', 'D'], source: 'rule', generatedBy: 'rule-v1' },
    ];

    const aggregate = {
      'W ER1 D': 0.5,
      'W AO1 R D': 0.3,
    };

    const winner = resolveWinner(candidates, aggregate);
    expect(winner.phonemes).toEqual(['W', 'ER1', 'D']);
    expect(winner.aggregate).toBeCloseTo(0.5, 3);
  });

  it('resolveWinner tie-breaks by phonotactic then source confidence', () => {
    const candidates = [
      { id: 'c1', word: 'WORD', phonemes: ['W', 'ER1', 'D'], source: 'rule', generatedBy: 'rule-v1', confidence: 0.6 },
      { id: 'c2', word: 'WORD', phonemes: ['W', 'AO1', 'R', 'D'], source: 'rule', generatedBy: 'rule-v1', confidence: 0.7 },
    ];

    const aggregate = {
      'W ER1 D': 1.0,
      'W AO1 R D': 1.0,
    };

    const votes = [
      { candidateKey: 'W ER1 D', jurorId: 'PHONOTACTIC', tokenWeight: 0.8, confidence: 0.9, stageSignal: 1, syntaxModifier: 1, rationale: 'r', fidelityGrade: 'A' },
      { candidateKey: 'W AO1 R D', jurorId: 'SYNTACTIC', tokenWeight: 0.5, confidence: 0.9, stageSignal: 1, syntaxModifier: 1, rationale: 'r', fidelityGrade: 'A' },
    ];

    const winner = resolveWinner(candidates, aggregate, votes);
    expect(winner.phonemes).toEqual(['W', 'AO1', 'R', 'D']);
  });

  it('isValidVote rejects malformed votes', () => {
    expect(isValidVote(null)).toBe(false);
    expect(isValidVote({})).toBe(false);
    expect(isValidVote({
      candidateKey: 'X',
      jurorId: 'PHONOTACTIC',
      tokenWeight: 0.5,
      confidence: 0.5,
      stageSignal: 0.5,
      syntaxModifier: 1,
      rationale: 'r',
      fidelityGrade: 'B',
    })).toBe(true);
    expect(isValidVote({
      candidateKey: 'X',
      jurorId: 'INVALID',
      tokenWeight: 0.5,
      confidence: 0.5,
      stageSignal: 0.5,
      syntaxModifier: 1,
      rationale: 'r',
      fidelityGrade: 'B',
    })).toBe(false);
  });

  it('isValidVerdict checks structural contract', () => {
    expect(isValidVerdict(null)).toBe(false);
    expect(isValidVerdict({ ok: true })).toBe(false);
    expect(isValidVerdict(createDeterministicVerdict({
      ok: true,
      word: 'TEST',
      candidates: [],
      votes: [],
      aggregateScores: {},
      winner: null,
    }))).toBe(true);
  });

  it('dedupeCandidates keeps highest confidence per phoneme key', () => {
    const candidates = [
      { word: 'X', phonemes: ['K'], source: 'rule', generatedBy: 'r1', confidence: 0.4 },
      { word: 'X', phonemes: ['K'], source: 'rule', generatedBy: 'r2', confidence: 0.7 },
      { word: 'X', phonemes: ['S'], source: 'rule', generatedBy: 'r3', confidence: 0.5 },
    ];

    const deduped = dedupeCandidates(candidates);
    expect(deduped).toHaveLength(2);
    const kCandidate = deduped.find((c) => c.phonemes.join(' ') === 'K');
    expect(kCandidate.confidence).toBe(0.7);
  });

  it('generateCandidateId is stable across calls', () => {
    const id1 = generateCandidateId('WORD', ['W', 'ER1', 'D'], 'rule', 0);
    const id2 = generateCandidateId('WORD', ['W', 'ER1', 'D'], 'rule', 0);
    expect(id1).toBe(id2);
  });
});
