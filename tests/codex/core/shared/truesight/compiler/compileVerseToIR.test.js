import { describe, it, expect } from 'vitest';
import {
  createEmptyVerseIR,
  compileVerseToIR,
} from '../../../../../../codex/core/shared/truesight/compiler/compileVerseToIR.js';

const MOCK_ENGINE = {};

describe('codex createEmptyVerseIR', () => {
  it('returns a frozen object with version', () => {
    const ir = createEmptyVerseIR();
    expect(typeof ir.version).toBe('string');
    expect(Object.isFrozen(ir)).toBe(true);
  });

  it('has empty collections', () => {
    const ir = createEmptyVerseIR();
    expect(ir.tokens).toHaveLength(0);
    expect(ir.lines).toHaveLength(0);
    expect(ir.rawText).toBe('');
  });

  it('metadata defaults to balanced mode', () => {
    expect(createEmptyVerseIR().metadata.mode).toBe('balanced');
  });
});

describe('codex compileVerseToIR', () => {
  it('returns empty IR for empty string', () => {
    const ir = compileVerseToIR('');
    expect(ir.rawText).toBe('');
    expect(ir.tokens).toHaveLength(0);
  });

  it('tokenizes words with a mock engine', () => {
    const ir = compileVerseToIR('hello world', { phonemeEngine: MOCK_ENGINE });
    expect(ir.tokens).toHaveLength(2);
    expect(ir.tokens[0].text).toBe('hello');
  });

  it('metadata tokenCount matches tokens length', () => {
    const ir = compileVerseToIR('the quick fox', { phonemeEngine: MOCK_ENGINE });
    expect(ir.metadata.tokenCount).toBe(ir.tokens.length);
  });
});
