import { describe, it, expect } from 'vitest';
import { serializeVerseIR } from '../../../../../../codex/core/shared/truesight/compiler/verseIRSerialization.js';
import { createEmptyVerseIR, compileVerseToIR } from '../../../../../../codex/core/shared/truesight/compiler/compileVerseToIR.js';

const MOCK_ENGINE = {};

describe('codex serializeVerseIR', () => {
  it('serializes empty IR without throwing', () => {
    expect(() => serializeVerseIR(createEmptyVerseIR())).not.toThrow();
  });

  it('output is JSON-serializable', () => {
    expect(() => JSON.stringify(serializeVerseIR(createEmptyVerseIR()))).not.toThrow();
  });

  it('preserves version', () => {
    const ir = createEmptyVerseIR();
    expect(serializeVerseIR(ir).version).toBe(ir.version);
  });

  it('serializes token text for non-empty IR', () => {
    const ir = compileVerseToIR('magic', { phonemeEngine: MOCK_ENGINE });
    const payload = serializeVerseIR(ir);
    expect(payload.tokens[0].text).toBe('magic');
  });

  it('handles null gracefully', () => {
    expect(() => serializeVerseIR(null)).not.toThrow();
  });
});
