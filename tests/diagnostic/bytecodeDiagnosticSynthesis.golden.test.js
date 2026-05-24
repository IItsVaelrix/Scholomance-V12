import { describe, expect, it } from 'vitest';
import input from '../fixtures/bytecodeDiagnosticSynthesis/authMismatch.input.json';
import expected from '../fixtures/bytecodeDiagnosticSynthesis/authMismatch.expected.json';
import { evaluateCleriRaidMind } from '../../codex/core/diagnostic/CleriRaidMind.js';

describe('ByteCode Diagnostic Synthesis Golden Tests', () => {
  it('matches the approved auth mismatch output', () => {
    const result = evaluateCleriRaidMind(input);
    expect(result).toEqual(expected);
  });
});
