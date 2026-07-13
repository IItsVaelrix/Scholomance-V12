// @vitest-environment node
//
// PhonemeEngine's dictionary loader branches on `typeof window === "undefined"`
// (codex/core/phonology/phoneme.engine.js ~L366) to pick Node fs/worker_threads
// loading vs. browser fetch/webworker loading. Under the default vitest
// environment (jsdom), `window` exists, so it silently takes the browser fetch
// path — which has no server to hit inside the test sandbox and falls back to
// degraded phoneme resolution, changing perfect/assonance/near/slant counts
// (measured: 34/44/29/6 -> 22/42/72/24 with jsdom's default environment).
// This file uses the real DeepRhymeEngine (real PhonemeEngine, not the mock
// used by deepRhyme.engine.test.js), so it needs the real dictionary — hence
// this file-level override, the same pattern already used by
// tests/lib/cmu.phoneme.engine.test.js for the same reason.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { DeepRhymeEngine } from '../../codex/core/rhyme-astrology/deepRhyme.engine.js';

const VERSE = readFileSync('tests/fixtures/rhyme/dense-verse.txt', 'utf8');

// Measured on the pre-change code. phrase_compound was 1335 — 92% of all
// connections, from only 75 words.
const BASELINE_COLOURED = { perfect: 34, assonance: 44, near: 29, slant: 6 };

async function analyse() {
  const engine = new DeepRhymeEngine();
  const analysis = await engine.analyzeDocument(VERSE, { mode: 'balanced' });
  const counts = {};
  for (const c of analysis.allConnections) counts[c.type] = (counts[c.type] ?? 0) + 1;
  const words = analysis.lines.reduce((n, line) => n + line.words.length, 0);
  return { analysis, counts, words };
}

describe('findPhraseConnections — bucketed', () => {
  it('THE LOAD-BEARING INVARIANT: the coloured types are untouched', async () => {
    const { counts } = await analyse();
    // perfect/assonance/near/slant come from findEndRhymeConnections,
    // findInternalRhymes and the assonance scan — none of which this task touches.
    // If any of these move, the change is wrong. Do not update these numbers.
    expect({
      perfect: counts.perfect ?? 0,
      assonance: counts.assonance ?? 0,
      near: counts.near ?? 0,
      slant: counts.slant ?? 0,
    }).toEqual(BASELINE_COLOURED);
  });

  it('does not explode: phrase connections stay a small multiple of the words', async () => {
    const { counts, words } = await analyse();
    // The old pairwise scan emitted 1335 from 75 words. Bucketed must stay linear-ish.
    expect(counts.phrase_compound ?? 0).toBeLessThan(words * 8);
  });

  it('still scores every emitted connection with the real scorer', async () => {
    const { analysis } = await analyse();
    for (const c of analysis.allConnections.filter((x) => x.type === 'phrase_compound')) {
      expect(c.syllablesMatched).toBeGreaterThanOrEqual(2);
      expect(c.score).toBeGreaterThanOrEqual(0.6);
    }
  });
});
