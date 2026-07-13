// @vitest-environment node
//
// Uses the real PhonemeEngine, which needs the node environment — see the header
// of tests/lib/deepRhyme.phrase-buckets.test.js for why.
import { describe, expect, it } from 'vitest';
import { synthesizeVerse } from '../../../codex/core/shared/truesight/compiler/VerseSynthesis.js';
import { decodeChromaBytecode } from '../../../codex/core/shared/truesight/color/chroma.bytecode.js';

const tokensOf = artifact => artifact.verseIR?.tokens || artifact.tokens || [];

describe('chroma stamp', () => {
  it('stamps EVERY token, painted or grey', () => {
    const artifact = synthesizeVerse('the knight was brave and old', {});
    const tokens = tokensOf(artifact);

    expect(tokens.length).toBeGreaterThan(0);
    for (const token of tokens) {
      const stamp = token.precomputed?.chroma;
      expect(stamp, token.text).toBeTruthy();
      expect(decodeChromaBytecode(stamp.bytecode), token.text).not.toBeNull();
    }
  });

  it('records which chef cooked the colour', () => {
    const artifact = synthesizeVerse('the knight was brave and old', {});
    for (const token of tokensOf(artifact)) {
      const decoded = decodeChromaBytecode(token.precomputed.chroma.bytecode);
      expect(['P', 'S', 'N']).toContain(decoded.chef);
    }
  });

  it('does not change what gets painted (stamp-only)', () => {
    // precomputed.hex is the field the renderer reads. Until Task 9 it must be
    // exactly what it was before the kinase existed.
    const artifact = synthesizeVerse('the knight was brave and old', {});
    for (const token of tokensOf(artifact)) {
      const expected = token.precomputed.verseIrColorHex
        ?? (token.precomputed.sonicChroma
          ? `hsl(${token.precomputed.sonicChroma.h}, ${token.precomputed.sonicChroma.s}%, ${token.precomputed.sonicChroma.l}%)`
          : null);
      expect(token.precomputed.hex).toBe(expected);
    }
  });
});
