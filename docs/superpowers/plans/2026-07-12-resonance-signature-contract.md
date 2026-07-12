# Resonance Signature Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace pairwise `phrase_compound` rhyme connections with per-token quantized phonetic signatures, so `/api/analysis/panels` is O(n) instead of O(n²) and stops OOM-killing the backend — while gaining slant-rhyme detection.

**Architecture:** Every token and multi-token window gets a `sign`: a **Resonance Fingerprint** — 64 hex chars in 8 blocks, SCD64 discipline, each block `sha256(canonical)`. Two tokens share a block IFF that canonical is identical, so sharing a rhyme-bearing block **is** the bucket: deterministic, guaranteed recall. Bucket-mates are *candidates*; the existing `scoreMultiSyllableMatch` **verifies** them, so bucketing changes only which pairs are examined, never a score, and therefore never a colour. The wire carries per-window fingerprints (O(n)); pairs are implied by shared blocks and never enumerated.

**Rejected (measured, do not revisit):** a SimHash/TurboQuant design. Band collision is probabilistic (~`1 - theta/pi` per bit; an 8-bit band matches only ~22% of the time at cosine 0.85), so real rhymes were missed at random — and a missed candidate can never be emitted. It failed in both directions at once: SIN~SIM stopped colliding while DESIRE~BANANA started.

**Tech Stack:** Node 20, Fastify, better-sqlite3, Vitest (`npm test`), existing `PHONOLOGICAL_FEATURES_V1` articulatory table, SCD64 fingerprint discipline (mirrored from `src/core/scd64/`, not imported — see Task 2).

## Global Constraints

- **Coloring must not regress.** The committed deterministic fixture is `tests/fixtures/rhyme/dense-verse.txt` (75 words, 370 chars). Measured on the code as it stands *before* this plan:

  | type | count |
  |---|---|
  | perfect | 34 |
  | assonance | 44 |
  | near | 29 |
  | slant | 6 |
  | phrase_compound | **1335** |

  The four **coloured** types (`perfect`, `assonance`, `near`, `slant`) must still be **34 / 44 / 29 / 6** after every task. Any delta is a review gate, not a pass. `phrase_compound` is expected to collapse — that is the point. Never use a randomly generated verse as a baseline.
- **The gate stays backend-authoritative.** The backend assigns the sign; the frontend groups by it. The browser never recomputes a vowel family and never compares phonetics (`BUGPATTERN_COLOR_DRAGON_FRONTEND_FALLBACK`).
- **Never widen scope into the palette.** Do not touch colour values. This is a data-contract change.
- **A missed candidate is invisible forever.** Recall failures are far more serious than precision failures: a false candidate is merely rejected later by `scoreMultiSyllableMatch`, but a rhyme that never becomes a candidate can never be emitted. Never trade recall for precision.
- **`codex/` must not import `src/core/scd64/*.ts`.** The server runs `node codex/server/index.js` with no TypeScript loader; such an import breaks it at runtime. Mirror the discipline in plain JS, keeping the relationship thresholds identical so the taxonomy does not fork.
- Vowel entries in `PHONOLOGICAL_FEATURES_V1` carry `cPlace`; consonant entries carry `vPlace`. The feature key list must be the **union** of both (11 keys), with missing keys read as `0`.
- Tests live in `tests/lib/`, run with `npx vitest run <path>`.

---

### Task 1: Articulatory tail embedding

Turns a phoneme sequence into a numeric vector whose geometry encodes slant relationships. `N` vs `M` differ only in `place`; `T` vs `D` differ only in `voicing` — so articulatory distance *is* slant distance.

**Files:**
- Create: `codex/core/phonology/tailEmbedding.js`
- Test: `tests/lib/tailEmbedding.test.js`

**Interfaces:**
- Consumes: `PHONOLOGICAL_FEATURES_V1`, `ARPABET_VOWELS` from `codex/core/phonology/phoneme.constants.js`
- Produces: `FEATURE_KEYS`, `TAIL_MAX_PHONEMES` (4), `TAIL_VECTOR_DIM` (64), `stripStress(p) -> string`, `extractRhymeTail(phonemes: string[]) -> string[]`, `buildTailFeatureVector(phonemes: string[]) -> Float32Array(64)`, `tailCosine(a: Float32Array, b: Float32Array) -> number`

- [ ] **Step 1: Write the failing test**

`tests/lib/tailEmbedding.test.js`:

```js
import { describe, expect, it } from 'vitest';
import {
  extractRhymeTail,
  buildTailFeatureVector,
  tailCosine,
  TAIL_VECTOR_DIM,
} from '../../codex/core/phonology/tailEmbedding.js';

// ARPABET pronunciations (CMU)
const FIRE    = ['F', 'AY1', 'ER0'];
const DESIRE  = ['D', 'IH0', 'Z', 'AY1', 'ER0'];
const HIGHER  = ['HH', 'AY1', 'ER0'];
const BANANA  = ['B', 'AH0', 'N', 'AE1', 'N', 'AH0'];
const SIN     = ['S', 'IH1', 'N'];
const SIM     = ['S', 'IH1', 'M'];
const SIT     = ['S', 'IH1', 'T'];
const BRIGHT  = ['B', 'R', 'AY1', 'T'];

const sim = (a, b) => tailCosine(buildTailFeatureVector(a), buildTailFeatureVector(b));

describe('extractRhymeTail', () => {
  it('takes the last vowel plus its coda', () => {
    expect(extractRhymeTail(BRIGHT)).toEqual(['AY', 'T']);
  });

  it('strips stress digits', () => {
    expect(extractRhymeTail(SIN)).toEqual(['IH', 'N']);
  });
});

describe('buildTailFeatureVector', () => {
  it('is a fixed power-of-two dimension (fastHadamardTransform requires it)', () => {
    expect(buildTailFeatureVector(FIRE)).toHaveLength(TAIL_VECTOR_DIM);
    expect(TAIL_VECTOR_DIM & (TAIL_VECTOR_DIM - 1)).toBe(0);
  });
});

describe('tailCosine — the invariant the old vector-nn stub inverted', () => {
  it('scores a real rhyme HIGH (fire ~ desire)', () => {
    expect(sim(FIRE, DESIRE)).toBeGreaterThan(0.95);
  });

  it('scores a real compound rhyme HIGH (higher ~ desire)', () => {
    expect(sim(HIGHER, DESIRE)).toBeGreaterThan(0.95);
  });

  it('scores an unrelated word LOW (desire ~ banana)', () => {
    expect(sim(DESIRE, BANANA)).toBeLessThan(0.8);
  });

  it('ranks a slant coda (sin~sim, place only) above a distant coda (sin~sit)', () => {
    expect(sim(SIN, SIM)).toBeGreaterThan(sim(SIN, SIT));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/tailEmbedding.test.js`
Expected: FAIL — `Failed to resolve import ... tailEmbedding.js`

- [ ] **Step 3: Write the implementation**

`codex/core/phonology/tailEmbedding.js`:

```js
/**
 * Articulatory embedding of a rhyme tail.
 *
 * Two words rhyme because of a property each holds independently — its tail.
 * Embedding that tail over articulatory features makes slant rhyme a distance:
 * N and M differ only in `place`; T and D differ only in `voicing`.
 *
 * This replaces the pairwise scan as a CANDIDATE GENERATOR only. Scores are
 * still produced by scoreMultiSyllableMatch, so quantization can never change
 * a colour — it can only change which pairs get looked at.
 */
import { PHONOLOGICAL_FEATURES_V1, ARPABET_VOWELS } from './phoneme.constants.js';

// Vowel rows carry `cPlace`, consonant rows carry `vPlace`. Use the union and
// read a missing key as 0 so both row shapes embed into the same space.
export const FEATURE_KEYS = Object.freeze([
  'height', 'contour', 'place', 'length', 'voicing',
  'nasality', 'manner', 'affrication', 'sibilance', 'cPlace', 'vPlace',
]);

export const TAIL_MAX_PHONEMES = 4;
// 4 phonemes x 11 features = 44, padded to the next power of two because
// fastHadamardTransform requires one.
export const TAIL_VECTOR_DIM = 64;

// The nucleus carries the rhyme. Weight it above the coda so `AY-T` and `AY-D`
// stay near each other while `AY-T` and `OW-T` do not.
const NUCLEUS_WEIGHT = 2;

export function stripStress(phoneme) {
  return String(phoneme || '').replace(/[0-9]/g, '').toUpperCase();
}

export function extractRhymeTail(phonemes) {
  const arr = (Array.isArray(phonemes) ? phonemes : []).map(stripStress).filter(Boolean);
  let lastVowel = -1;
  for (let i = arr.length - 1; i >= 0; i -= 1) {
    if (ARPABET_VOWELS.has(arr[i])) { lastVowel = i; break; }
  }
  const tail = lastVowel < 0 ? arr.slice(-TAIL_MAX_PHONEMES) : arr.slice(lastVowel);
  return tail.slice(0, TAIL_MAX_PHONEMES);
}

export function buildTailFeatureVector(phonemes) {
  const tail = extractRhymeTail(phonemes);
  const vec = new Float32Array(TAIL_VECTOR_DIM);
  for (let i = 0; i < tail.length; i += 1) {
    const features = PHONOLOGICAL_FEATURES_V1[tail[i]];
    if (!features) continue;
    const weight = i === 0 ? NUCLEUS_WEIGHT : 1;
    const base = i * FEATURE_KEYS.length;
    for (let k = 0; k < FEATURE_KEYS.length; k += 1) {
      vec[base + k] = Number(features[FEATURE_KEYS[k]] ?? 0) * weight;
    }
  }
  return vec;
}

export function tailCosine(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < TAIL_VECTOR_DIM; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/tailEmbedding.test.js`
Expected: PASS, 6 tests.

If `sim(DESIRE, BANANA)` is not below 0.8, raise `NUCLEUS_WEIGHT` to 3 and re-run — do not weaken the assertion.

- [ ] **Step 5: Commit**

```bash
git add codex/core/phonology/tailEmbedding.js tests/lib/tailEmbedding.test.js
git commit -m "feat(phonology): articulatory rhyme-tail embedding

Embeds a rhyme tail over the existing PHONOLOGICAL_FEATURES_V1 table so slant
relationships become geometric: N/M differ only in place, T/D only in voicing.
Replaces nothing yet — this is the candidate-generation basis for the signature
contract."
```

---

### Task 2: The Resonance Fingerprint (SCD64 discipline)

Turns each token into ONE fixed-width code. Two tokens are rhyme candidates when they share a rhyme-bearing block. This replaces the SimHash/TurboQuant approach, which was measured and **failed**: SimHash collision is probabilistic (~`1 - theta/pi` per bit, so an 8-bit band matches only ~22% of the time at cosine 0.85), and a missed candidate is invisible forever. Deterministic block equality gives guaranteed recall.

**Files:**
- Create: `codex/core/rhyme-astrology/resonanceFingerprint.js`
- Test: `tests/lib/resonanceFingerprint.test.js`

**Interfaces:**
- Consumes: `extractRhymeTail` from `codex/core/phonology/tailEmbedding.js` (Task 1 — anchored at the LAST STRESSED VOWEL); `PHONOLOGICAL_FEATURES_V1` from `codex/core/phonology/phoneme.constants.js`
- Produces: `RESONANCE_SLOTS` (8 names), `RESONANCE_VERSION_BYTE` (`'R1'`), `buildResonanceFingerprint(phonemes: string[]) -> string | null` (64 uppercase hex chars, or `null` for a tailless token), `parseResonanceBlocks(fp: string) -> string[]` (8 blocks of 8), `compareResonanceByBlocks(a: string, b: string) -> { matchingBlocks: number, similarity: number, relationship: string }`, `areRhymeCandidates(a: string, b: string) -> boolean`, `rhymeBucketKeys(fp: string) -> string[]` (the rhyme-bearing blocks, each prefixed with its slot index so blocks from different slots can never collide)

**WHY SCD64 AND NOT AN IMPORT:** `src/core/scd64/` is UI-layer TypeScript. `codex/` runs under plain Node ESM with **no TypeScript loader** (the server is started with `node codex/server/index.js`), so importing those `.ts` files would break the server at runtime. Reimplement the *discipline* — 64 hex, 8 blocks, `sha256(canonical).slice(0,8)`, block-exact comparison — in plain JS. Keep the same relationship thresholds as `src/core/scd64/compareSCD64.ts` so the taxonomy stays consistent across the codebase.

**THE KEY PROPERTY:** each block is `sha256(canonical_string)`, so two fingerprints share a block **if and only if** their canonical string for that slot is identical. Sharing a block *is* the bucket. There is no probability involved.

- [ ] **Step 1: Write the failing test**

`tests/lib/resonanceFingerprint.test.js`:

```js
import { describe, expect, it } from 'vitest';
import {
  buildResonanceFingerprint,
  parseResonanceBlocks,
  compareResonanceByBlocks,
  areRhymeCandidates,
} from '../../codex/core/rhyme-astrology/resonanceFingerprint.js';

const W = {
  FIRE:   ['F', 'AY1', 'ER0'],
  DESIRE: ['D', 'IH0', 'Z', 'AY1', 'ER0'],
  HIGHER: ['HH', 'AY1', 'ER0'],
  SIN:    ['S', 'IH1', 'N'],
  SIM:    ['S', 'IH1', 'M'],
  OLD:    ['OW1', 'L', 'D'],
  OWED:   ['OW1', 'D'],
  WORLD:  ['W', 'ER1', 'L', 'D'],
  HERD:   ['HH', 'ER1', 'D'],
  BRIGHT: ['B', 'R', 'AY1', 'T'],
  LIGHT:  ['L', 'AY1', 'T'],
  NIGHT:  ['N', 'AY1', 'T'],
  STONE:  ['S', 'T', 'OW1', 'N'],
  BONE:   ['B', 'OW1', 'N'],
  THRONE: ['TH', 'R', 'OW1', 'N'],
  CREATE: ['K', 'R', 'IY0', 'EY1', 'T'],
  ELATE:  ['IH0', 'L', 'EY1', 'T'],
  BANANA: ['B', 'AH0', 'N', 'AE1', 'N', 'AH0'],
  GLOW:   ['G', 'L', 'OW1'],
};
const fp = (w) => buildResonanceFingerprint(W[w]);

describe('fingerprint shape', () => {
  it('is 64 uppercase hex characters', () => {
    expect(fp('FIRE')).toMatch(/^[0-9A-F]{64}$/);
  });

  it('splits into 8 blocks of 8', () => {
    const blocks = parseResonanceBlocks(fp('FIRE'));
    expect(blocks).toHaveLength(8);
    expect(blocks.every((b) => b.length === 8)).toBe(true);
  });

  it('carries the R1 version byte', () => {
    expect(fp('FIRE').slice(0, 2)).toBe('R1');
  });

  it('is deterministic', () => {
    expect(fp('DESIRE')).toBe(fp('DESIRE'));
  });

  it('returns null for a token with no rhyme tail', () => {
    expect(buildResonanceFingerprint([])).toBeNull();
  });
});

// A MISSED candidate is invisible forever and can never be emitted.
// A FALSE candidate merely gets rejected later by scoreMultiSyllableMatch.
// Recall failures are therefore far more serious than precision failures.
describe('areRhymeCandidates — recall (must never miss)', () => {
  const MUST = [
    ['FIRE', 'DESIRE'], ['FIRE', 'HIGHER'],   // r-coloured tails
    ['SIN', 'SIM'],                            // slant coda: differ only in `place`
    ['OLD', 'OWED'], ['WORLD', 'HERD'],        // coda-length shear
    ['BRIGHT', 'LIGHT'], ['LIGHT', 'NIGHT'],
    ['STONE', 'BONE'], ['BONE', 'THRONE'],
    ['CREATE', 'ELATE'],                       // hiatus
  ];
  it.each(MUST)('%s ~ %s are candidates', (a, b) => {
    expect(areRhymeCandidates(fp(a), fp(b))).toBe(true);
  });
});

describe('areRhymeCandidates — precision', () => {
  const MUST_NOT = [
    ['DESIRE', 'BANANA'], ['FIRE', 'GLOW'],
    ['SIN', 'BANANA'], ['BRIGHT', 'BANANA'],
  ];
  it.each(MUST_NOT)('%s ~ %s are NOT candidates', (a, b) => {
    expect(areRhymeCandidates(fp(a), fp(b))).toBe(false);
  });
});

describe('compareResonanceByBlocks — the block count grades the rhyme', () => {
  it('rates a perfect rhyme above a slant rhyme, and both above a non-rhyme', () => {
    const perfect = compareResonanceByBlocks(fp('LIGHT'), fp('NIGHT')).matchingBlocks;
    const slant   = compareResonanceByBlocks(fp('SIN'), fp('SIM')).matchingBlocks;
    const none    = compareResonanceByBlocks(fp('DESIRE'), fp('BANANA')).matchingBlocks;
    expect(perfect).toBeGreaterThan(slant);
    expect(slant).toBeGreaterThan(none);
  });

  it('uses the same relationship tiers as src/core/scd64/compareSCD64.ts', () => {
    expect(compareResonanceByBlocks(fp('LIGHT'), fp('NIGHT')).relationship).toBe('MUTATION');
    expect(compareResonanceByBlocks(fp('DESIRE'), fp('BANANA')).relationship).toBe('WEAK_NEIGHBOR');
  });

  it('a fingerprint is IDENTICAL to itself', () => {
    expect(compareResonanceByBlocks(fp('FIRE'), fp('FIRE')).relationship).toBe('IDENTICAL');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/resonanceFingerprint.test.js`
Expected: FAIL — `Failed to resolve import ... resonanceFingerprint.js`

- [ ] **Step 3: Write the implementation**

`codex/core/rhyme-astrology/resonanceFingerprint.js`:

```js
/**
 * The Resonance Fingerprint — one fixed-width code per token.
 *
 * A rhyme is a property each token holds INDEPENDENTLY (its tail), so the pair
 * is derivable and never needs storing. This is that property, in the SCD64
 * discipline already used across the codebase: 64 uppercase hex characters,
 * 8 blocks of 8, each block sha256(canonical).slice(0,8).
 *
 * Because a block is a hash of its canonical string, two fingerprints share a
 * block IF AND ONLY IF that canonical is identical. Sharing a block IS the
 * bucket — deterministic, with no probability involved. (An earlier SimHash /
 * TurboQuant design was measured and rejected: band collision is ~22% likely at
 * cosine 0.85, so real rhymes were missed at random, and a missed candidate can
 * never be emitted.)
 *
 * Block-match count grades the rhyme for free, on the SAME tiers as
 * src/core/scd64/compareSCD64.ts:
 *   7-8/8 MUTATION/IDENTICAL  perfect rhyme
 *   6/8   MUTATION            slant (SIN/SIM — differ only in `place`)
 *   4-5/8 RELATED_FAMILY      coda-length shear (OLD/OWED, WORLD/HERD)
 *   2-3/8 WEAK_NEIGHBOR       unrelated
 *
 * NOT imported from src/core/scd64: that is UI-layer TypeScript, and codex runs
 * under plain Node ESM with no TS loader. The discipline is reimplemented; the
 * thresholds are kept identical so the taxonomy does not fork.
 */
import crypto from 'node:crypto';
import { extractRhymeTail } from '../phonology/tailEmbedding.js';
import { PHONOLOGICAL_FEATURES_V1 } from '../phonology/phoneme.constants.js';

export const RESONANCE_SLOTS = Object.freeze([
  'TAIL',       // the exact rhyme tail            -> perfect rhyme
  'NUCLEUS',    // the stressed nucleus            -> assonance
  'CODALAST',   // nucleus + FINAL phoneme         -> coda-length shear (OLD/OWED)
  'CODACLASS',  // nucleus + coda manner/nasality  -> slant (SIN/SIM)
  'SYLLABLES',
  'STRESS',
  'ONSET',
  'VERSION',
]);

export const RESONANCE_VERSION_BYTE = 'R1';

// Blocks that carry rhyme identity. Sharing ANY of these makes two tokens
// candidates. NUCLEUS is deliberately NOT included: sharing only a vowel is
// assonance, not a rhyme, and it would bucket a third of the document together.
const RHYME_BEARING_BLOCKS = Object.freeze([0, 2, 3]);

function hashBlock(canonical) {
  return crypto.createHash('sha256').update(canonical).digest('hex').toUpperCase().slice(0, 8);
}

function buildCanonicals(phonemes) {
  const tail = extractRhymeTail(phonemes);
  if (!tail.length) return null;

  const nucleus = tail[0];
  const coda = tail.slice(1);
  const last = coda.length ? coda[coda.length - 1] : null;
  const features = last ? PHONOLOGICAL_FEATURES_V1[last] : null;

  // Coda class drops `place` ON PURPOSE: place is exactly what separates slant
  // partners (N/M, T/P). Keeping it would make SIN and SIM look unrelated.
  const codaClass = features
    ? `m${features.manner}n${features.nasality}`
    : 'open';

  return {
    TAIL: `TAIL:${tail.join('-')}`,
    NUCLEUS: `NUC:${nucleus}`,
    CODALAST: `CL:${nucleus}:${last ?? 'open'}`,
    CODACLASS: `CC:${nucleus}:${codaClass}`,
    SYLLABLES: `SYL:${tail.length}`,
    STRESS: `STR:${phonemes.filter((p) => /[12]/.test(String(p))).length}`,
    ONSET: `ONS:${phonemes[0] ?? 'none'}`,
    VERSION: `V:${RESONANCE_VERSION_BYTE}`,
  };
}

export function buildResonanceFingerprint(phonemes) {
  const canonicals = buildCanonicals(phonemes);
  if (!canonicals) return null;

  return RESONANCE_SLOTS
    .map((slot, index) => {
      const block = hashBlock(canonicals[slot]);
      // Slot 0 carries the version byte, matching SCD64's BUGCLASS convention.
      return index === 0 ? RESONANCE_VERSION_BYTE + block.slice(0, 6) : block;
    })
    .join('');
}

export function parseResonanceBlocks(fingerprint) {
  if (typeof fingerprint !== 'string' || !/^[0-9A-F]{64}$/.test(fingerprint)) {
    throw new Error('[Resonance] fingerprints must be exactly 64 uppercase hex characters.');
  }
  return fingerprint.match(/.{8}/g) ?? [];
}

export function compareResonanceByBlocks(a, b) {
  const blocksA = parseResonanceBlocks(a);
  const blocksB = parseResonanceBlocks(b);

  let matchingBlocks = 0;
  const differentBlocks = [];
  for (let i = 0; i < 8; i += 1) {
    if (blocksA[i] === blocksB[i]) matchingBlocks += 1;
    else differentBlocks.push(RESONANCE_SLOTS[i]);
  }

  // Same thresholds as src/core/scd64/compareSCD64.ts — do not fork the taxonomy.
  let relationship;
  if (matchingBlocks === 8) relationship = 'IDENTICAL';
  else if (matchingBlocks >= 6) relationship = 'MUTATION';
  else if (matchingBlocks >= 4) relationship = 'RELATED_FAMILY';
  else if (matchingBlocks >= 2) relationship = 'WEAK_NEIGHBOR';
  else relationship = 'UNRELATED';

  return { matchingBlocks, differentBlocks, similarity: matchingBlocks / 8, relationship };
}

export function areRhymeCandidates(a, b) {
  if (!a || !b) return false;
  const blocksA = parseResonanceBlocks(a);
  const blocksB = parseResonanceBlocks(b);
  return RHYME_BEARING_BLOCKS.some((i) => blocksA[i] === blocksB[i]);
}

/**
 * The bucket keys for a fingerprint. Two tokens sharing ANY of these are
 * candidates. The slot index is prefixed so that an identical hex value landing
 * in two different slots can never collide by accident.
 */
export function rhymeBucketKeys(fingerprint) {
  if (!fingerprint) return [];
  const blocks = parseResonanceBlocks(fingerprint);
  return RHYME_BEARING_BLOCKS.map((i) => `${i}:${blocks[i]}`);
}
```

- [ ] **Step 6: Remove the code Task 1 wrote that this task makes dead**

Task 2 supersedes the vector path: bucketing is now block-exact, so the SimHash/cosine machinery has no consumer. Leaving it is a YAGNI violation.

In `codex/core/phonology/tailEmbedding.js`, DELETE: `FEATURE_KEYS`, `TAIL_VECTOR_DIM`, `NUCLEUS_WEIGHT`, `buildTailFeatureVector`, `tailCosine`, and the `PHONOLOGICAL_FEATURES_V1` import if it becomes unused. KEEP: `stripStress`, `extractRhymeTail`, `TAIL_MAX_PHONEMES`, and the `ARPABET_VOWELS` import — the fingerprint depends on them.

In `tests/lib/tailEmbedding.test.js`, DELETE the `buildTailFeatureVector` and `tailCosine` describe blocks. KEEP every `extractRhymeTail` test, including the hiatus cases (CREATE -> EY,T and REACT -> AE,K,T) — that logic is still live and was hard-won.

DELETE `tests/lib/tailSign.test.js` entirely (it tests the rejected SimHash design).

Update the file's doc comment: it no longer describes an embedding, it describes stress-anchored rhyme-tail extraction.

Run: `npx vitest run tests/lib/tailEmbedding.test.js tests/lib/resonanceFingerprint.test.js`
Expected: PASS, with no reference to the deleted symbols anywhere (`grep -rn "buildTailFeatureVector\|tailCosine\|buildTailSignBands" codex/ src/ tests/` must return nothing).

- [ ] **Step 7: Commit the cleanup**

```bash
git add codex/core/phonology/tailEmbedding.js tests/lib/tailEmbedding.test.js
git rm tests/lib/tailSign.test.js
git commit -m "refactor(phonology): drop the vector path superseded by the fingerprint

Bucketing is block-exact now, so the SimHash bands and the cosine embedding have
no consumer. Stress-anchored tail extraction stays — the fingerprint is built
from it."
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/resonanceFingerprint.test.js tests/lib/tailEmbedding.test.js`
Expected: PASS. Task 1's tests must stay green — this task does not modify `tailEmbedding.js`.

Every recall case MUST pass. If any `MUST` pair misses, do **not** weaken the test: the canonical for one of the rhyme-bearing slots is wrong, and a missed candidate can never be emitted downstream.

- [ ] **Step 5: Commit**

```bash
git add codex/core/rhyme-astrology/resonanceFingerprint.js tests/lib/resonanceFingerprint.test.js
git commit -m "feat(rhyme): the Resonance Fingerprint — one SCD64-discipline code per token

A rhyme is a property each token holds independently, so the pair is derivable
and never needs storing. Each token gets 64 hex chars in 8 blocks; a block is
sha256(canonical), so two tokens share a block IFF that canonical is identical.
Sharing a block IS the bucket — deterministic, guaranteed recall.

Replaces a SimHash/TurboQuant design that was measured and failed: band collision
is ~22% likely at cosine 0.85, so real rhymes were missed at random, and a missed
candidate can never be emitted. Block-match count also grades the rhyme for free,
on the same tiers as src/core/scd64: perfect 7-8/8, slant 6/8, coda-shear 4-5/8,
unrelated 2-3/8."
```

---

### Task 3: Bucket the phrase scan (kills the O(n²))

`findPhraseConnections` currently pairs every window with every other window: 18,032 of 18,243 connections on a 1,500-char verse. Replace the nested loop with sign-band bucketing, then verify candidates with the **existing** scorer so no score changes.

**Files:**
- Modify: `codex/core/rhyme-astrology/deepRhyme.engine.js:386-425` (the nested loop inside `findPhraseConnections`)
- Test: `tests/lib/deepRhyme.phrase-buckets.test.js`

**Interfaces:**
- Consumes: `buildResonanceFingerprint`, `rhymeBucketKeys` (Task 2); existing `this.engine.scoreMultiSyllableMatch(analysisA, analysisB)`
- Produces: no API change — `findPhraseConnections(verseIR)` still returns `Array<{type:'phrase_compound', score, syllablesMatched, wordA, wordB, ...}>`, just far fewer and far faster.

- [ ] **Step 1: Write the failing test**

`tests/lib/deepRhyme.phrase-buckets.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/deepRhyme.phrase-buckets.test.js`
Expected: FAIL on the first test — phrase count far exceeds `words * 8` (the current scan is quadratic).

- [ ] **Step 3: Write the implementation**

In `codex/core/rhyme-astrology/deepRhyme.engine.js`, add to the imports at the top:

```js
import { buildResonanceFingerprint, rhymeBucketKeys } from './resonanceFingerprint.js';
```

Replace the nested pairwise loop (currently `const connections = []; for (let i = 0; ...)` through the closing of the double loop, i.e. lines 386–423) with:

```js
    // Candidates come from the Resonance Fingerprint's rhyme-bearing blocks.
    // The old scan compared every window with every other — 1,335 of the 1,448
    // connections on the 75-word fixture, growing quadratically and OOM-killing
    // the server past ~12,000 chars. Bucketing only changes which pairs we LOOK
    // at; every emitted connection is still scored by scoreMultiSyllableMatch,
    // so no score and no colour can move.
    const connections = [];
    const buckets = new Map();

    for (const node of phraseNodes) {
      node.fingerprint = buildResonanceFingerprint(node.analysis?.phonemes || []);
      // A tailless token gets no fingerprint and therefore no bucket. Do NOT
      // bucket them together — that would collide every unknown token at once.
      if (!node.fingerprint) continue;
      for (const key of rhymeBucketKeys(node.fingerprint)) {
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(node);
      }
    }

    const seenPairs = new Set();

    for (const [, groupNodes] of buckets) {
      if (groupNodes.length < 2) continue;

      for (let i = 0; i < groupNodes.length; i += 1) {
        for (let j = i + 1; j < groupNodes.length; j += 1) {
          const nodeA = groupNodes[i];
          const nodeB = groupNodes[j];

          // A node sits in several bands, so the same pair can surface more than once.
          const spanA = `${nodeA.charStart}:${nodeA.charEnd}`;
          const spanB = `${nodeB.charStart}:${nodeB.charEnd}`;
          const pairKey = spanA < spanB ? `${spanA}|${spanB}` : `${spanB}|${spanA}`;
          if (seenPairs.has(pairKey)) continue;
          seenPairs.add(pairKey);

          if (nodeA.charEnd > nodeB.charStart && nodeA.charStart < nodeB.charEnd) continue;
          if (nodeA.word.toLowerCase() === nodeB.word.toLowerCase()) continue;

          const match = this.engine.scoreMultiSyllableMatch(nodeA.analysis, nodeB.analysis);
          if (match && match.syllablesMatched >= 2 && match.score >= 0.6) {
            connections.push({
              type: 'phrase_compound',
              subtype: match.type || 'none',
              score: match.score,
              syllablesMatched: match.syllablesMatched,
              phoneticWeight: match.syllablesMatched * match.score,
              wordA: {
                lineIndex: nodeA.lineIndex,
                wordIndex: nodeA.wordIndex,
                charStart: nodeA.charStart,
                charEnd: nodeA.charEnd,
                word: nodeA.word
              },
              wordB: {
                lineIndex: nodeB.lineIndex,
                wordIndex: nodeB.wordIndex,
                charStart: nodeB.charStart,
                charEnd: nodeB.charEnd,
                word: nodeB.word
              },
              groupLabel: null,
              syntax: { gate: 'allow', multiplier: 1, reasons: ['phrase_connection'] }
            });
          }
        }
      }
    }
    return connections;
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/deepRhyme.phrase-buckets.test.js tests/lib/deepRhyme.engine.test.js`
Expected: PASS. The pre-existing `deepRhyme.engine.test.js` must **also** still pass — if it asserts a phrase-connection count, that count legitimately changed; update it only after confirming the coloured types are untouched.

- [ ] **Step 5: Verify the scaling claim against the real server**

```bash
node --env-file=.env codex/server/index.js &
sleep 8
for N in 3000 6000 12000; do
  python3 -c "
import json,random
w='fire desire higher ember flame ash smoke pyre stone bone night light bright sight'.split()
t=''
while len(t) < $N: t += ' '.join(random.choice(w) for _ in range(8)) + '\n'
json.dump({'text': t[:$N]}, open('/tmp/v$N.json','w'))"
  printf "%6s chars -> " $N
  curl -s -o /dev/null -w "HTTP %{http_code}  %{time_total}s\n" --max-time 60 \
    -X POST -H 'Content-Type: application/json' --data @/tmp/v$N.json \
    http://localhost:8080/api/analysis/panels
done
```

Expected: all three under **5.0s** (the client's `AbortController` limit). Before this task, 6,000 chars took 8.4s and 12,000 took 47s.

- [ ] **Step 6: Commit**

```bash
git add codex/core/rhyme-astrology/deepRhyme.engine.js tests/lib/deepRhyme.phrase-buckets.test.js
git commit -m "perf(rhyme): bucket the phrase scan by sign band, killing the O(n^2)

findPhraseConnections paired every multi-token window with every other. Now
candidates come from the Resonance Fingerprint's rhyme-bearing blocks, and every
surviving candidate is still scored by scoreMultiSyllableMatch — so bucketing
changes only which pairs are examined, never a score, and never a colour."
```

---

### Task 4: Per-window signs on the wire

Stop shipping pairs; ship one sign per window. Commit `4fd7e5ba` already filters `phrase_compound` out of the response — this replaces that filter with the positive contract.

**Files:**
- Modify: `codex/server/services/panelAnalysis.service.js` (the `toTransmittableConnections` helper and `toMinimalAnalysisPayload`)
- Modify: `codex/core/rhyme-astrology/deepRhyme.engine.js` (expose `phraseWindows` on the analysis result, around line 221)
- Test: `tests/lib/panelAnalysis.phraseWindows.test.js`

**Interfaces:**
- Consumes: `node.fingerprint` set in Task 3
- Produces: analysis result gains `phraseWindows: Array<{charStart:number, charEnd:number, sign:string, syllableCount:number}>`; the wire payload gains the same array. `sign` is the 64-hex Resonance Fingerprint itself, or `''` when the token has no rhyme tail. Windows sharing a sign rhyme; the client groups by it and never recomputes phonetics.

- [ ] **Step 1: Write the failing test**

`tests/lib/panelAnalysis.phraseWindows.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { DeepRhymeEngine } from '../../codex/core/rhyme-astrology/deepRhyme.engine.js';

const VERSE = 'the ember flame climbs higher\nand every word i wrote is fire';

describe('phraseWindows', () => {
  it('emits one entry per phrase window, not one per pair', async () => {
    const engine = new DeepRhymeEngine();
    const analysis = await engine.analyzeDocument(VERSE, { mode: 'balanced' });
    expect(Array.isArray(analysis.phraseWindows)).toBe(true);
    const phrasePairs = analysis.allConnections.filter((c) => c.type === 'phrase_compound').length;
    // The whole point: windows are linear, pairs are not.
    expect(analysis.phraseWindows.length).toBeLessThanOrEqual(Math.max(phrasePairs, 1) * 4);
  });

  it('carries a sign and a span on every window', async () => {
    const engine = new DeepRhymeEngine();
    const analysis = await engine.analyzeDocument(VERSE, { mode: 'balanced' });
    for (const w of analysis.phraseWindows) {
      expect(typeof w.sign).toBe('string');
      expect(Number.isInteger(w.charStart)).toBe(true);
      expect(Number.isInteger(w.charEnd)).toBe(true);
      expect(w.charEnd).toBeGreaterThan(w.charStart);
    }
  });

  it('gives rhyming windows the same sign (higher / fire)', async () => {
    const engine = new DeepRhymeEngine();
    const analysis = await engine.analyzeDocument(VERSE, { mode: 'balanced' });
    const signs = new Map();
    for (const w of analysis.phraseWindows) {
      if (!w.sign) continue;
      if (!signs.has(w.sign)) signs.set(w.sign, []);
      signs.get(w.sign).push(w);
    }
    // At least one sign is shared by two or more windows — that shared sign IS the rhyme.
    expect([...signs.values()].some((group) => group.length >= 2)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/panelAnalysis.phraseWindows.test.js`
Expected: FAIL — `analysis.phraseWindows` is `undefined`.

- [ ] **Step 3: Write the implementation**

In `deepRhyme.engine.js`, change `findPhraseConnections` to also record the windows. At the end of the sign-band bucketing loop added in Task 3, before `return connections;`, capture them on the instance:

```js
    this.lastPhraseWindows = phraseNodes.map((node) => ({
      charStart: node.charStart,
      charEnd: node.charEnd,
      sign: node.fingerprint ?? '',
      syllableCount: node.syllableLength ?? 0,
    }));

    return connections;
  }
```

Then in `analyzeDocument`, add `phraseWindows` to the result object (it sits alongside `allConnections`, around line 225):

```js
      allConnections,
      phraseWindows: this.lastPhraseWindows ?? [],
```

In `codex/server/services/panelAnalysis.service.js`, replace the interim `toTransmittableConnections` comment block and helper with the positive contract, and add `phraseWindows` to `toMinimalAnalysisPayload`:

```js
// phrase_compound is the legacy REFERENTIAL encoding of a rhyme: one object per
// PAIR. It is O(n^2) — 18,032 of 18,243 connections on a 1,500-char verse — and
// no client reads it (buildResonanceGate colours only identity/perfect/near/slant
// and assonance). The same information now travels as one `sign` per window:
// windows sharing a sign rhyme. Pairs are implied and never enumerated.
//
// It IS still consumed server-side (multisyllabic_rhyme density), so it stays in
// `analysis` — it just must not cross the wire.
const WIRE_EXCLUDED_CONNECTION_TYPES = new Set(['phrase_compound']);

function toTransmittableConnections(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((connection) => (
    connection && !WIRE_EXCLUDED_CONNECTION_TYPES.has(connection.type)
  ));
}

function toTransmittablePhraseWindows(value) {
  if (!Array.isArray(value)) return [];
  return value.map((window) => ({
    charStart: Number(window?.charStart) || 0,
    charEnd: Number(window?.charEnd) || 0,
    sign: typeof window?.sign === 'string' ? window.sign : '',
    syllableCount: Number(window?.syllableCount) || 0,
  }));
}
```

and inside the returned object of `toMinimalAnalysisPayload`, immediately after `allConnections`:

```js
    allConnections: toTransmittableConnections(analysis.allConnections),
    phraseWindows: toTransmittablePhraseWindows(analysis.phraseWindows),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/panelAnalysis.phraseWindows.test.js`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add codex/core/rhyme-astrology/deepRhyme.engine.js codex/server/services/panelAnalysis.service.js tests/lib/panelAnalysis.phraseWindows.test.js
git commit -m "feat(analysis): ship per-window signs instead of pairwise connections

A rhyme is a property each window holds independently — its tail sign. Windows
sharing a sign rhyme, so the pair is derivable and never needs storing. The wire
goes from O(n^2) pairs to O(n) windows."
```

---

### Task 5: Density heuristic from capped intra-bucket pairs

`multisyllabic_rhyme` genuinely needs pairs and calls `rhymeEngine.analyzeDocument()` itself — it does not read the wire. Its `density` divides by `allConnections.length`, which just collapsed. Re-base it so the score means the same thing.

**Files:**
- Modify: `codex/core/heuristics/multisyllabic_rhyme.js:192` (the `density` calculation)
- Test: `tests/lib/multisyllabic_rhyme.density.test.js`

**Interfaces:**
- Consumes: `analysis.allConnections` (now bucketed), `analysis.phraseWindows` (Task 4)
- Produces: no API change — still returns `{ heuristic, rawScore, weight, contribution, explanation, diagnostics }`

- [ ] **Step 1: Write the failing test**

`tests/lib/multisyllabic_rhyme.density.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { DeepRhymeEngine } from '../../codex/core/rhyme-astrology/deepRhyme.engine.js';

const DENSE = [
  'the ember flame will climb up higher',
  'and every word i wrote is fire',
  'i light the pyre of my desire',
  'a liar in the choir sings entire',
].join('\n');

describe('multisyllabic density after bucketing', () => {
  it('density stays a real fraction in [0,1] and is not degenerate', async () => {
    const engine = new DeepRhymeEngine();
    const analysis = await engine.analyzeDocument(DENSE, { mode: 'balanced' });
    const all = analysis.allConnections.length;
    const multi = analysis.allConnections.filter((c) => (Number(c.syllablesMatched) || 0) >= 2).length;
    expect(all).toBeGreaterThan(0);
    const density = multi / Math.max(1, all);
    expect(density).toBeGreaterThanOrEqual(0);
    expect(density).toBeLessThanOrEqual(1);
    // Before bucketing, `all` was inflated ~90x by junk phrase pairs, which
    // crushed density toward 0. It must no longer be pinned at the floor.
    expect(density).toBeGreaterThan(0.01);
  });
});
```

- [ ] **Step 2: Run test to verify it fails or passes**

Run: `npx vitest run tests/lib/multisyllabic_rhyme.density.test.js`

This test may already PASS once Task 3 lands (bucketing shrinks the denominator). Run it and observe. If it passes, the density is already re-based correctly by construction — record that, keep the test as a regression guard, and skip Step 3.

- [ ] **Step 3: Only if it fails — re-base the denominator**

In `codex/core/heuristics/multisyllabic_rhyme.js`, the density currently divides by every connection including phrase pairs:

```js
  const density = clamp01(eligibleConnections.length / Math.max(1, allConnections.length));
```

Change the denominator to the multisyllabic candidate pool, so it measures "how many of the multi-syllable chains are real" rather than "how many of ALL connections happen to be multi-syllable":

```js
  // Denominator is the multisyllabic candidate pool, not every connection in the
  // document. Dividing by allConnections made density a function of how much junk
  // the phrase scan produced, which is not a property of the verse.
  const density = clamp01(eligibleConnections.length / Math.max(1, multiConnections.length));
```

- [ ] **Step 4: Run the full heuristic suite**

Run: `npx vitest run tests/lib/multisyllabic_rhyme.density.test.js && npx vitest run tests/lib`
Expected: PASS. Any scoring test that asserts an exact `rawScore` will move — that is the documented, accepted density shift. Update the expected value only after confirming the new number is defensible.

- [ ] **Step 5: Commit**

```bash
git add codex/core/heuristics/multisyllabic_rhyme.js tests/lib/multisyllabic_rhyme.density.test.js
git commit -m "fix(heuristics): re-base multisyllabic density on the candidate pool

Density divided by allConnections, so it measured how much junk the phrase scan
emitted rather than a property of the verse. Now it divides by the multisyllabic
candidate pool."
```

---

### Task 6: Fill the g2p grapheme stub

Independent live bug. `createVectorNNPhonemeSignature` is seeded on `word.length` and carries **zero** phonetic information, yet it feeds OOV pronunciation candidates via `substring.candidate.generator.js:56`. Measured today: `DESIRE~BANANA = 1.0000`, `FIRE~DESIRE = -0.0398`. It is *inverted*.

This is **grapheme** space (spelled-like → borrow pronunciation), not the phoneme-tail space of Tasks 1–2. Do not merge them.

**Files:**
- Modify: `codex/core/phonology/g2p/candidates/vector-nn.candidate.generator.js:14-32`
- Test: `tests/lib/g2p.vector-nn.test.js`

**Interfaces:**
- Consumes: nothing new
- Produces: `createVectorNNPhonemeSignature(word: string) -> { word, vector: number[], dimension: number, norm: 1, seed: number }` — same shape as today, so `retrieveVectorNNPhonemeCandidates` needs no change.

- [ ] **Step 1: Write the failing test**

`tests/lib/g2p.vector-nn.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { createVectorNNPhonemeSignature } from '../../codex/core/phonology/g2p/candidates/vector-nn.candidate.generator.js';

const cos = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const sig = (w) => createVectorNNPhonemeSignature(w).vector;

describe('grapheme signature — the stub inverted every one of these', () => {
  it('scores spelling-similar words HIGH (fire ~ hire)', () => {
    expect(cos(sig('FIRE'), sig('HIRE'))).toBeGreaterThan(0.5);
  });

  it('scores a shared-suffix pair HIGH across different lengths (fire ~ desire)', () => {
    // The stub scored this -0.0398 purely because the lengths differ.
    expect(cos(sig('FIRE'), sig('DESIRE'))).toBeGreaterThan(0.35);
  });

  it('scores unrelated same-length words LOW (desire ~ banana)', () => {
    // The stub scored this 1.0000 purely because both are 6 letters.
    expect(cos(sig('DESIRE'), sig('BANANA'))).toBeLessThan(0.3);
  });

  it('is not a function of word length', () => {
    expect(cos(sig('FIRE'), sig('GLOW'))).toBeLessThan(0.99);
  });

  it('is deterministic', () => {
    expect(sig('DESIRE')).toEqual(sig('DESIRE'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/g2p.vector-nn.test.js`
Expected: FAIL — `fire ~ glow` returns 1.0 (both 4 letters) and `desire ~ banana` returns 1.0.

- [ ] **Step 3: Write the implementation**

Replace `createVectorNNPhonemeSignature` in `codex/core/phonology/g2p/candidates/vector-nn.candidate.generator.js` (delete `seededRandom` and `VECTOR_AMP_SEED` if now unused):

```js
const VECTOR_AMP_DIMENSION = 256;
const NGRAM_SIZES = [2, 3];
// Suffix graphemes decide English pronunciation far more than prefixes
// (-IRE, -IGHT, -TION), and this generator exists to guess a pronunciation.
const SUFFIX_WEIGHT = 2.5;
const SUFFIX_LENGTH = 4;

function hashToken(token) {
  let h = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % VECTOR_AMP_DIMENSION;
}

/**
 * Hashed character-n-gram embedding of a word's SPELLING.
 *
 * This is grapheme space, not phoneme space: its job is "this unknown word is
 * spelled like these dictionary words, so borrow their pronunciation".
 *
 * The previous implementation seeded a random vector on word.LENGTH, so it
 * carried no information about the word at all: DESIRE~BANANA scored 1.0000
 * (both six letters) while FIRE~DESIRE scored -0.0398 (a real rhyme, different
 * lengths). It ranked by length and called it a phoneme signature.
 */
export function createVectorNNPhonemeSignature(word) {
  const upper = String(word || '').toUpperCase().replace(/[^A-Z]/g, '');
  const vec = new Array(VECTOR_AMP_DIMENSION).fill(0);

  const padded = `^${upper}$`;
  for (const n of NGRAM_SIZES) {
    for (let i = 0; i + n <= padded.length; i += 1) {
      const gram = padded.slice(i, i + n);
      const isSuffix = i + n >= padded.length - SUFFIX_LENGTH;
      vec[hashToken(gram)] += isSuffix ? SUFFIX_WEIGHT : 1;
    }
  }

  let sumSq = 0;
  for (let i = 0; i < VECTOR_AMP_DIMENSION; i += 1) sumSq += vec[i] * vec[i];
  const norm = Math.sqrt(sumSq) || 1;
  const normalized = vec.map((value) => value / norm);

  return {
    word: upper,
    vector: normalized,
    dimension: VECTOR_AMP_DIMENSION,
    norm: 1,
    seed: 0,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/g2p.vector-nn.test.js`
Expected: PASS, 5 tests.

If `fire ~ desire` falls below 0.35, raise `SUFFIX_WEIGHT` to 4 — the shared `IRE$` suffix must dominate. Do not weaken the assertion.

- [ ] **Step 5: Commit**

```bash
git add codex/core/phonology/g2p/candidates/vector-nn.candidate.generator.js tests/lib/g2p.vector-nn.test.js
git commit -m "fix(g2p): replace the length-keyed random 'phoneme signature' stub

createVectorNNPhonemeSignature seeded a random vector on word.LENGTH, so every
word of the same length got an identical vector. Measured: DESIRE~BANANA=1.0000,
FIRE~DESIRE=-0.0398 — it scored non-rhymes as perfect and real rhymes as
unrelated, and fed OOV pronunciation candidates on that basis.

Now a hashed character-n-gram embedding with suffix weighting, since suffixes
decide English pronunciation."
```

---

### Task 7: Fail loud when the Oracle dies

The empty `catch` is why a dead backend makes the system "feel stupid" instead of showing an error: every word silently falls back to spelling-based vowel families and TrueSight colours **confidently wrong** (`love`/`move`, `though`/`tough` invert).

**Files:**
- Modify: `codex/core/phonology/phoneme.engine.js:503-510` (`ensureAuthorityBatch`)
- Test: `tests/lib/phoneme.authority-failure.test.js`

**Interfaces:**
- Consumes: nothing new
- Produces: `PhonemeEngine.authorityFailure` — `null` when healthy, otherwise `{ message: string, at: number }`. `ensureAuthorityBatch` still resolves (it must not break callers) but records the failure instead of discarding it.

- [ ] **Step 1: Write the failing test**

`tests/lib/phoneme.authority-failure.test.js`:

```js
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PhonemeEngine } from '../../codex/core/phonology/phoneme.engine.js';
import { ScholomanceDictionaryAPI } from '../../codex/core/shared/scholomanceDictionary.api.js';

describe('ensureAuthorityBatch — Oracle failure must not be silent', () => {
  beforeEach(() => {
    PhonemeEngine.authorityFailure = null;
    vi.restoreAllMocks();
  });

  it('records the failure instead of swallowing it', async () => {
    vi.spyOn(ScholomanceDictionaryAPI, 'isEnabled').mockReturnValue(true);
    vi.spyOn(ScholomanceDictionaryAPI, 'lookupBatch').mockRejectedValue(
      new Error('Dictionary Oracle timed out'),
    );

    await PhonemeEngine.ensureAuthorityBatch(['FIRE', 'DESIRE']);

    expect(PhonemeEngine.authorityFailure).not.toBeNull();
    expect(PhonemeEngine.authorityFailure.message).toContain('Dictionary Oracle timed out');
  });

  it('clears the failure on a subsequent success', async () => {
    vi.spyOn(ScholomanceDictionaryAPI, 'isEnabled').mockReturnValue(true);
    const spy = vi.spyOn(ScholomanceDictionaryAPI, 'lookupBatch');

    spy.mockRejectedValueOnce(new Error('Dictionary Oracle timed out'));
    await PhonemeEngine.ensureAuthorityBatch(['FIRE']);
    expect(PhonemeEngine.authorityFailure).not.toBeNull();

    spy.mockResolvedValueOnce({ DESIRE: { family: 'AY', phonemes: ['D', 'IH0', 'Z', 'AY1', 'ER0'] } });
    await PhonemeEngine.ensureAuthorityBatch(['DESIRE']);
    expect(PhonemeEngine.authorityFailure).toBeNull();
  });

  it('still resolves rather than throwing, so callers are unbroken', async () => {
    vi.spyOn(ScholomanceDictionaryAPI, 'isEnabled').mockReturnValue(true);
    vi.spyOn(ScholomanceDictionaryAPI, 'lookupBatch').mockRejectedValue(new Error('boom'));
    await expect(PhonemeEngine.ensureAuthorityBatch(['FIRE'])).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/phoneme.authority-failure.test.js`
Expected: FAIL — `PhonemeEngine.authorityFailure` is `undefined`; the catch discards the error.

- [ ] **Step 3: Write the implementation**

In `codex/core/phonology/phoneme.engine.js`, add the field next to `AUTHORITY_CACHE` (line 397):

```js
  AUTHORITY_CACHE: new Map(),
  // null when the Oracle is healthy. Set when an authority lookup fails, so the
  // renderer can tell "no resonance data" apart from "no resonance".
  authorityFailure: null,
```

Replace the empty catch in `ensureAuthorityBatch`:

```js
    try {
        const batchResults = await ScholomanceDictionaryAPI.lookupBatch(missing);
        for (const [word, data] of Object.entries(batchResults)) {
            // data is { family: string, phonemes: string[] | null }
            this.AUTHORITY_CACHE.set(word.toUpperCase(), data);
        }
        this.authorityFailure = null;
    } catch (error) {
        // NEVER swallow this. Without authority data every word silently drops to
        // spelling-based heuristic vowel families (heuristic_fallback below), and
        // TrueSight does not stop colouring — it colours CONFIDENTLY WRONG
        // (love/move, though/tough invert). Callers must be able to render
        // "unavailable" rather than a lie.
        this.authorityFailure = {
            message: error instanceof Error ? error.message : String(error),
            at: Date.now(), // EXEMPT
        };
        console.warn('[PhonemeEngine] Dictionary authority unavailable:', this.authorityFailure.message);
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/phoneme.authority-failure.test.js && npx vitest run tests/lib/phoneme.engine.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add codex/core/phonology/phoneme.engine.js tests/lib/phoneme.authority-failure.test.js
git commit -m "fix(phonology): stop swallowing Dictionary Oracle failures

An empty catch discarded authority-lookup errors, so AUTHORITY_CACHE stayed empty
and every word fell back to spelling-based vowel families. TrueSight did not stop
colouring — it coloured confidently wrong. The failure is now recorded so callers
can render 'unavailable' instead of a lie."
```

---

### Task 8: Render uncolored, not wrong, when authority is unavailable

Task 7 makes the failure *knowable*. This makes it *honest*. Per the gene: *"frontend renders confirmed indices only"* and *"do not trust frontend-only phoneme analysis over backend truth."* With no authority data, the correct output is **no colour** — not colour derived from spelling.

**Files:**
- Modify: `codex/server/services/panelAnalysis.service.js` (`toMinimalAnalysisPayload` — carry the flag)
- Modify: `src/lib/truesight/buildResonanceGate.js` (`buildResonanceGate` — honour it)
- Test: `tests/lib/buildResonanceGate.authority.test.js`

**Interfaces:**
- Consumes: `PhonemeEngine.authorityFailure` (Task 7)
- Produces: payload gains `authorityUnavailable: boolean`; `buildResonanceGate(connections, opts)` accepts `opts.authorityUnavailable` and returns an **empty Map** when it is `true`.

- [ ] **Step 1: Write the failing test**

`tests/lib/buildResonanceGate.authority.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { buildResonanceGate } from '../../src/lib/truesight/buildResonanceGate.js';

const CONNECTIONS = [
  { type: 'perfect', score: 1, wordA: { charStart: 0 }, wordB: { charStart: 20 } },
  { type: 'assonance', score: 0.8, wordA: { charStart: 5 }, wordB: { charStart: 25 } },
];

describe('buildResonanceGate — authority gating', () => {
  it('colours normally when authority is available', () => {
    const gate = buildResonanceGate(CONNECTIONS, {});
    expect(gate.size).toBeGreaterThan(0);
  });

  it('colours NOTHING when authority is unavailable', () => {
    // Without dictionary truth the phonemes are spelling guesses. Colouring from
    // them is worse than not colouring: love/move and though/tough invert.
    const gate = buildResonanceGate(CONNECTIONS, { authorityUnavailable: true });
    expect(gate.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/buildResonanceGate.authority.test.js`
Expected: FAIL on the second test — the gate colours regardless, because it ignores the flag.

- [ ] **Step 3: Write the implementation**

In `src/lib/truesight/buildResonanceGate.js`, at the top of `buildResonanceGate`, before any connection is read:

```js
export function buildResonanceGate(connections, opts = {}) {
  // No backend authority means the phonemes behind these connections are
  // spelling-derived guesses. Rendering them is not a degraded mode, it is a
  // lie: love/move and though/tough get opposite vowel families. Render nothing.
  if (opts.authorityUnavailable) return new Map();

  const minResonanceScore = typeof opts.minResonanceScore === 'number'
    ? opts.minResonanceScore
    : DEFAULT_MIN_RESONANCE_SCORE;
  // ...rest unchanged
```

In `codex/server/services/panelAnalysis.service.js`, import the engine and carry the flag in `toMinimalAnalysisPayload`'s returned object, immediately after `phraseWindows`:

```js
import { PhonemeEngine } from '../../core/phonology/phoneme.engine.js';
```

```js
    phraseWindows: toTransmittablePhraseWindows(analysis.phraseWindows),
    authorityUnavailable: Boolean(PhonemeEngine.authorityFailure),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/buildResonanceGate.authority.test.js`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/truesight/buildResonanceGate.js codex/server/services/panelAnalysis.service.js tests/lib/buildResonanceGate.authority.test.js
git commit -m "fix(truesight): render uncolored when dictionary authority is unavailable

With no authority data the phonemes are spelling guesses, so colouring from them
inverts love/move and though/tough. The gate now renders nothing rather than
something wrong — frontend renders confirmed indices only."
```

---

### Task 9: Full-system verification

- [ ] **Step 1: Run the whole suite**

Run: `npm test -- --run`
Expected: PASS. Investigate any failure before proceeding — do not update an expectation without understanding why it moved.

- [ ] **Step 2: Verify the coloured invariant on the real endpoint**

```bash
node --env-file=.env codex/server/index.js &
sleep 8
python3 -c "
import json,random
w='fire desire higher ember flame ash smoke pyre stone bone alone throne night light bright sight heart start dark spark'.split()
t=''
while len(t) < 1500: t += ' '.join(random.choice(w) for _ in range(8)) + '\n'
json.dump({'text': t[:1500]}, open('/tmp/fixture.json','w'))"
curl -s -X POST -H 'Content-Type: application/json' --data @/tmp/fixture.json \
  http://localhost:8080/api/analysis/panels \
  | node -e "
let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{
  const r=JSON.parse(s); const c=r.data.analysis.allConnections;
  const by={}; for(const x of c) by[x.type]=(by[x.type]??0)+1;
  console.log('connections by type:', by);
  console.log('phraseWindows      :', r.data.analysis.phraseWindows?.length);
  console.log('payload            :', (s.length/1048576).toFixed(2), 'MB');
});"
```

Expected:
- `phrase_compound` **absent** from the wire.
- `phraseWindows` present, length on the order of the word count (not its square).
- Payload well under 1 MB (was 7.7 MB).

- [ ] **Step 3: Verify the large-verse ceiling is gone**

Re-run the scaling loop from Task 3 Step 5 at 6,000 / 12,000 / 24,000 chars.
Expected: all return HTTP 200, all under 5.0s, and the server does **not** die (24,000 chars previously produced `FATAL ERROR: JavaScript heap out of memory`).

- [ ] **Step 4: Commit any expectation updates**

```bash
git add -A
git commit -m "test: update expectations for the signature contract"
```
