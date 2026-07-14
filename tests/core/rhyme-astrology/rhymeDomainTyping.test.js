/**
 * Regression Guard — a shared VOWEL FAMILY is not a rhyme.
 *
 * deepRhyme.engine typed a connection PERFECT whenever matchDictionaryFamily
 * reported that both words shared a `rhyme_family`. That field is the bare vowel
 * family ("AY", "IH", "EH") — thousands of unrelated words share it. So the engine
 * asserted, at its strongest tier and at exactly RHYME_TYPES.PERFECT.minScore:
 *
 *   survival ~ liars ~ igniting   (all AY)    perfect 0.920
 *   still ~ isn't                 (both IH)   perfect 0.920
 *   skin ~ pretty                 (IH / IY)   perfect 0.920
 *   steady ~ against              (both EH)   perfect 0.920
 *
 * 108 such pairs in one 16-line verse, all at the identical 0.920. The only thing
 * keeping them off the page was the resonance gate's 0.95 bar — which then also
 * censored the REAL rhymes scoring just under it. The gate was doing the scorer's
 * job, and doing it by accident.
 *
 * PERFECT now requires identical rhyme DOMAINS (rhymeDomain.js): the phoneme tail
 * from the last stressed vowel. That is decidable, so the strong tier no longer
 * depends on a similarity threshold at all. A shared vowel family is assonance.
 *
 * gene BUGPATTERN_COLOR_DRAGON_FRONTEND_FALLBACK — a coarse backend family must
 * not outrank real phonology.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { DeepRhymeEngine } from '../../../codex/core/rhyme-astrology/deepRhyme.engine.js';
import { PhonemeEngine } from '../../../codex/core/phonology/phoneme.engine.js';
import { buildSelfDictionaryAPI } from '../../../codex/server/adapters/selfDictionary.authority.js';

const dictionaryAPI = buildSelfDictionaryAPI();

async function analyse(text) {
  const words = text.match(/[A-Za-z']+/g) || [];
  const engine = new DeepRhymeEngine();
  await PhonemeEngine.primeAuthorityBatch(words, dictionaryAPI);
  await engine.primeRhymeFamilies(words, dictionaryAPI);
  return engine.analyzeDocument(text);
}

function connection(result, a, b) {
  return result.allConnections.find((c) => {
    const pair = [c.wordA.word.toLowerCase(), c.wordB.word.toLowerCase()].sort().join('~');
    return pair === [a, b].sort().join('~');
  }) || null;
}

describe('[Core] rhyme-domain typing', () => {
  beforeEach(() => {
    PhonemeEngine.clearCache();
  });

  it('does NOT call a shared vowel family a perfect rhyme', async () => {
    // "survival" (AY-VAHL) and "liars" (AY-ERZ) share only the stressed AY.
    const result = await analyse('Silent, a frame that survival erased\nStill, I was labeled by liars and shame');
    const conn = connection(result, 'survival', 'liars');

    expect(conn).not.toBeNull();
    expect(conn.type).not.toBe('perfect'); // was perfect 0.920
    expect(conn.type).toBe('assonance');
  });

  it('reserves perfect for identical rhyme domains', async () => {
    // emotion (OW-SHAHN) / ocean (OW-SHAHN) — the domains are equal.
    const result = await analyse('Vast emotion, the ocean inside is still the worst');
    const conn = connection(result, 'emotion', 'ocean');

    expect(conn).not.toBeNull();
    expect(conn.type).toBe('perfect');
    expect(conn.score).toBe(1);
    expect(conn.subtype).toBe('rhyme-domain');
  });

  it('a true rhyme scores 1.0, so the resonance gate can never censor it', async () => {
    // The old code lifted a family match only to PERFECT.minScore (0.92), which
    // sits BELOW the gate's 0.95 bar — so even a genuine rhyme could be greyed.
    const result = await analyse('carving corpses like gravestones made to reinforce\nWhile the mortician learned every curve of my body, of course');
    const conn = connection(result, 'course', 'reinforce');

    expect(conn).not.toBeNull();
    expect(conn.type).toBe('perfect');
    expect(conn.score).toBeGreaterThanOrEqual(0.95);
  });

  it('the similarity heuristic alone can never mint a perfect rhyme', async () => {
    // Whatever the phonetic score, a connection whose domains differ is at best
    // a NEAR rhyme. Letting a high heuristic score mint 'perfect' on its own is
    // how a vowel-family match masqueraded as a rhyme in the first place.
    const result = await analyse('I believe in Socrates\nI leave with all the keys');
    for (const conn of result.allConnections) {
      if (conn.type !== 'perfect' || conn.subtype === 'identity') continue;
      // Every perfect must be domain-backed, never score-backed.
      expect(conn.subtype).toBe('rhyme-domain');
    }
  });
});
