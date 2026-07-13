// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { synthesizeVerse } from '../../../codex/core/shared/truesight/compiler/VerseSynthesis.js';
import { decodeChromaBytecode } from '../../../codex/core/shared/truesight/color/chroma.bytecode.js';

const VERSE = readFileSync('tests/fixtures/rhyme/dense-verse.txt', 'utf8');

describe('authority distribution on real text', () => {
  it('reports how much of a real verse can justify its colour', () => {
    const artifact = synthesizeVerse(VERSE, {});
    const tokens = artifact.verseIR?.tokens || [];

    const histogram = {};
    for (const token of tokens) {
      const stamp = decodeChromaBytecode(token.precomputed?.chroma?.bytecode);
      const letter = stamp ? stamp.authority : '?';
      histogram[letter] = (histogram[letter] || 0) + 1;
    }

    const trusted = (histogram.D || 0) + (histogram.O || 0) + (histogram.C || 0);
    const share = trusted / tokens.length;

    // eslint-disable-next-line no-console
    console.log('[chroma authority]', JSON.stringify(histogram), `trusted=${(share * 100).toFixed(1)}%`);

    expect(tokens.length).toBeGreaterThan(0);
    // This is a MEASUREMENT, not yet a gate. It records the number Task 9 needs.
    // Tighten this bound only once the real distribution is known.
    expect(share).toBeGreaterThanOrEqual(0);
  });
});
