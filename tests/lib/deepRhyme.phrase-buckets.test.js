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
import { DeepRhymeEngine, PHRASE_BUCKET_CANDIDATE_CAP } from '../../codex/core/rhyme-astrology/deepRhyme.engine.js';

const VERSE = readFileSync('tests/fixtures/rhyme/dense-verse.txt', 'utf8');

// Measured on the pre-change code. phrase_compound was 1335 — 92% of all
// connections, from only 75 words.
//
// UPDATED 2026-07-13 by the line-proximity failsafe (MAX_CONNECTION_LINE_DISTANCE,
// see tests/lib/deepRhyme.line-proximity.test.js). The engine had no bound on how
// far apart two words could be and still "rhyme", so it chained an -old family at
// the top of a poem to an -old family ninety lines down. This fixture is only
// TWELVE lines long, and the connections that disappeared spanned 5 to 11 of them
// — a vowel echo in the first line tinting a word in the last. That is not a
// rhyme a reader hears; it is the over-colouring the resonance gate was already
// fighting.
//
//   perfect    34 -> 34   UNCHANGED — true end rhymes are naturally close.
//   near       29 -> 20   long-range pairs removed
//   slant       6 ->  3   long-range pairs removed
//   assonance  44 -> 28   long-range pairs removed
//
// `perfect` holding at 34 is the load-bearing part: the strong tier is untouched.
// If perfect ever moves, the change IS wrong. The other three may only ever fall
// by removing pairs that exceed the line window — never for any other reason.
//
// UPDATED 2026-07-14 by the rhyme domain (codex/core/phonology/rhymeDomain.js).
//
// This is the ONE kind of change that is allowed to move `perfect`, because it
// changes what a rhyme IS rather than which rhymes get searched. rhymeKey used to
// be `${familyOfFirstStressedSyllable}-${codaOfLastSyllable}` — two different
// syllables stitched together — which lumped every AY word into one AY-open
// bucket regardless of what followed the vowel. It asserted, at the PERFECT tier:
//
//   i (AY1)          rhymes with  fire (F AY1 ER0)
//   my (M AY1)       rhymes with  desire (D IH0 Z AY1 ER0)
//   river (R IH1 V ER0) rhymes with whisper (W IH1 S P ER0)
//   ember (EH1 M B ER0) rhymes with every (EH1 V ER0 IY0)
//
// Twenty such pairs existed in this fixture; every one is false. Keying on the
// rhyme domain splits the bucket correctly — {i, my} = AY-open, {fire, pyre,
// desire, liar, choir, entire} = AY-ER — while river/shiver (IH-VER) and the
// fire/desire family keep rhyming, because they actually do.
//
// Exactly one of those false pairs fell inside the line window, so:
//
//   perfect    34 -> 33   the "I rhymes with fire" class, removed
//   assonance  28 -> 27   the same split, one tier down
//   near       20 -> 20   UNCHANGED
//   slant       3 ->  3   UNCHANGED
//
// UPDATED 2026-07-14 again, by rhyme-domain TYPING (deepRhyme.engine scoreConnection).
//
// The engine typed a connection PERFECT whenever the dictionary said both words
// shared a `rhyme_family` — which is the bare VOWEL family ("AY", "IH"), shared by
// thousands of unrelated words. Every such pair was forced to type 'perfect' at
// exactly RHYME_TYPES.PERFECT.minScore (0.92). In this fixture that minted:
//
//   entire ~ sight    AY-ER vs AY-T     -> now assonance 0.62
//   climb  ~ higher   AY-M  vs AY-ER    -> now assonance 0.62
//   i      ~ fire     AY-open vs AY-ER  -> now assonance 0.55
//   light  ~ pyre     AY-T  vs AY-ER    -> now assonance 0.62
//   in     ~ sings    IH-N  vs IH-NGZ   -> now assonance 0.57
//
// None of those rhyme. A shared vowel family is ASSONANCE. Perfect now requires
// the rhyme DOMAINS to be identical, which is decidable, so the type no longer
// depends on a similarity threshold at all.
//
//   perfect    33 -> 28   the five false pairs above, demoted
//   assonance  27 -> 27   UNCHANGED
//   near       20 -> 25   the demoted pairs that ARE near rhymes land here
//                         (e.g. night ~ ignites, AY-T vs AY-TS, 0.88)
//   slant       3 ->  3   UNCHANGED
//
// The 28 survivors are every one a true rhyme: fire/desire/entire/pyre/liar/choir,
// sight/light/night/bright, stone/alone/throne/bone/own/overgrown, dark/spark,
// river/shiver, pass/glass — all at 1.00.
//
// The guard still stands for every other kind of change: a perf/bucketing change
// must NEVER move these numbers. Only a change to the definition of a rhyme may,
// and only with the false pairs it removes enumerated, as above.
const BASELINE_COLOURED = { perfect: 28, assonance: 27, near: 25, slant: 3 };

async function analyse(text = VERSE) {
  const engine = new DeepRhymeEngine();
  const analysis = await engine.analyzeDocument(text, { mode: 'balanced' });
  const counts = {};
  for (const c of analysis.allConnections) counts[c.type] = (counts[c.type] ?? 0) + 1;
  const words = analysis.lines.reduce((n, line) => n + line.words.length, 0);
  return { analysis, counts, words };
}

const repeat = (text, n) => Array(n).fill(text).join('\n');

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

  it('phrase connections are bounded by the cap, not an invented multiple', async () => {
    const { counts, words } = await analyse();
    // `< words * 8` was an invented bound — already violated at 4x this very
    // fixture (300 words -> 2,673+ connections, ~8.9/word) before this fix.
    // The REAL guarantee the sliding-window scan makes is that every node
    // does at most PHRASE_BUCKET_CANDIDATE_CAP comparisons per bucket-tag it
    // belongs to (tail/head/vslant), so assert against the cap itself —
    // imported, not re-typed as a second copy of the number — with the small
    // constant-tag headroom the bucketing scheme documents above.
    expect(counts.phrase_compound ?? 0).toBeLessThanOrEqual(words * PHRASE_BUCKET_CANDIDATE_CAP);
  });

  it('still scores every emitted connection with the real scorer', async () => {
    const { analysis } = await analyse();
    for (const c of analysis.allConnections.filter((x) => x.type === 'phrase_compound')) {
      expect(c.syllablesMatched).toBeGreaterThanOrEqual(2);
      expect(c.score).toBeGreaterThanOrEqual(0.6);
    }
  });

  it('scales linearly: phrase_compound-per-word flattens as the text grows', async () => {
    // Naively comparing 1x -> 4x of THIS fixture is not a fair linearity
    // probe: dense-verse.txt is only 75 words / 12 lines, and its bucket
    // sizes at 1x sit BELOW PHRASE_BUCKET_CANDIDATE_CAP, so the sliding
    // window isn't cap-saturated yet — comparisons per node there are
    // bounded by (bucket_size - 1), not by CAP. Once the fixture is
    // repeated enough that bucket sizes cross the cap (empirically, by 4x:
    // 300 words), the window IS saturated and every further doubling adds
    // work at the same CAP-bounded rate per node — which is exactly the
    // O(n * cap) guarantee, and is what should be measured as flat.
    // Measured (PHRASE_BUCKET_CANDIDATE_CAP = 16): 1x -> 4x per-word rate
    // moves ~9.25 -> ~23.68 (the below-cap -> at-cap transient, not evidence
    // of an unbounded scan); 4x -> 8x moves ~23.68 -> ~30.11 (x1.27) and
    // 8x -> 16x moves ~30.11 -> ~33.88 (x1.13) — converging, which is the
    // real signature of a linear-in-n, cap-bounded scan. Assert on the
    // post-saturation pair (4x vs 8x) where the comparison is
    // apples-to-apples.
    const at4x = await analyse(repeat(VERSE, 4));
    const at8x = await analyse(repeat(VERSE, 8));
    const rate4x = (at4x.counts.phrase_compound ?? 0) / at4x.words;
    const rate8x = (at8x.counts.phrase_compound ?? 0) / at8x.words;
    expect(rate8x).toBeLessThanOrEqual(rate4x * 1.5);
  });
});
