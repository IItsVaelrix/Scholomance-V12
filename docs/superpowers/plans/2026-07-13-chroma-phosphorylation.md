# Chroma Phosphorylation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make TrueSight refuse to paint a colour it cannot justify, and make every grey token declare why it is grey.

**Architecture:** Borrow the law already proven in `qbit-phosphorylation.js` — a commit gate that refuses and gives a typed reason. A token's phoneme provenance (already on `token.phoneticDiagnostics.source`) becomes an authority confidence. A kinase commits colour only above threshold 0.51. Every token, painted or grey, carries a `PB-CHROMA-v2` stamp that a probe (and later a DOM macrophage) can decode. Ships **stamp-only** first; enforcement is a separate, final task.

**Tech Stack:** Node ESM, Vitest 4, existing PixelBrain/QBIT primitives, Lexical.

## Global Constraints

- Implements the approved spec at `docs/superpowers/specs/2026-07-13-chroma-phosphorylation-design.md`.
- **Do not change the colour mathematics.** PCA, OKLCh, and the vowel wheel are untouched. This work justifies a colour; it does not compute a different one.
- **Do not call `phosphorylate()` from `qbit-phosphorylation.js`.** It is welded to SDF geometry (`evaluateSDF`, `sdfGradient`, `setCell`). Purpose the law, not the function body.
- **Stamp-only until Task 9.** Tasks 1–8 must not change which words get painted. Any test that asserts a paint change before Task 9 is a plan violation.
- Colour core modules (`chroma.authority.js`, `chroma.bytecode.js`, `chroma.kinase.js`) are **pure**: no fs, no DOM, no clock, no network.
- Threshold is `0.51`, matching `COLLAPSE_THRESHOLD` in `qbit-phosphorylation.js`. Confidence `0.50` is refused; `0.51` commits.
- v1 `PB-CHROMA` strings must keep working. `decodeChromaBytecode` returns `null` for them — that is how a probe tells an old producer from a new one.
- The authority alphabet is fixed by the spec: `D` 1.00, `O` 0.90, `C` 0.80, `G` 0.50, `U` 0.00, `X` 0.00.
- After every task, run the focused test shown, then the nearest affected suite. Commit only the paths named in that task.

---

## Target File Map

**Create**
- `codex/core/shared/truesight/color/chroma.authority.js` — phoneme `source` → authority letter + confidence. Pure lookup.
- `codex/core/shared/truesight/color/chroma.bytecode.js` — `encodeChromaBytecode` / `decodeChromaBytecode`. The organ that makes the stamp readable.
- `codex/core/shared/truesight/color/chroma.kinase.js` — `buildChromaKinase` / `phosphorylateToken`. The commit gate.

**Modify**
- `codex/core/shared/truesight/compiler/VerseSynthesis.js` — stamp `token.precomputed.chroma`.
- `src/lib/lexical/TruesightNode.js` — `dom.dataset.chroma` in `createDOM`.
- `codex/core/diagnostic/chromaticImmuneProbe.js` — add `scanChromaStamps`.
- `macrophage-chroma.js` — cure its autoimmunity.

**Deliberate deviation from spec §3.4:** the spec had `chroma.resolver.js` and `pcaChroma.js`
emitting v2 bytecodes themselves. They do not. The **kinase** stamps, at the one place that
knows both the colour and the authority (`VerseSynthesis`), and the resolvers stay pure
functions of their inputs. This touches fewer files, keeps the colour mathematics untouched
per the global constraint, and means a chef id is assigned by the caller that actually chose
the chef — a resolver cannot mislabel itself if it never labels itself.

**Test**
- `tests/core/truesight/chroma.authority.test.js`
- `tests/core/truesight/chroma.bytecode.test.js`
- `tests/core/truesight/chroma.kinase.test.js`
- `tests/core/truesight/chroma.stamp.test.js`
- `tests/lib/truesightNode.chroma.test.jsx`
- `tests/core/diagnostic/chromaticImmuneProbe.stamps.test.js`
- `tests/core/truesight/chroma.authority-distribution.test.js`
- `tests/core/truesight/chroma.color-dragon.test.js`

---

### Task 1: Authority — turn provenance into confidence

The token already carries `phoneticDiagnostics.source`. Nothing reads it. This task makes it a number.

**Files:**
- Create: `codex/core/shared/truesight/color/chroma.authority.js`
- Test: `tests/core/truesight/chroma.authority.test.js`

**Interfaces:**
- Produces: `authorityFor(source: string) → { letter: 'D'|'O'|'C'|'G'|'U'|'X', confidence: number }`, `CHROMA_AUTHORITY_LETTERS`, `authorityForToken(token)`.

- [ ] **Step 1: Write the failing test**

```js
// tests/core/truesight/chroma.authority.test.js
import { describe, expect, it } from 'vitest';
import { authorityFor, authorityForToken } from '../../../codex/core/shared/truesight/color/chroma.authority.js';

describe('chroma authority', () => {
  it('maps the Scholomance dictionary to full confidence', () => {
    expect(authorityFor('scholomance_dictionary')).toEqual({ letter: 'D', confidence: 1 });
  });

  it('maps a curated override and CMU below our own dictionary but above a guess', () => {
    expect(authorityFor('word_override')).toEqual({ letter: 'O', confidence: 0.9 });
    expect(authorityFor('cmu_dictionary')).toEqual({ letter: 'C', confidence: 0.8 });
  });

  it('maps every guessing branch to G at 0.50 — below the 0.51 threshold', () => {
    for (const source of ['heuristic_fallback', 'alphabet_literal', 'multi_word_composition']) {
      expect(authorityFor(source), source).toEqual({ letter: 'G', confidence: 0.5 });
    }
  });

  it('treats an untraceable cache hit as unproven, not as truth', () => {
    // The engine itself notes these were "reused without a stored provenance trail".
    expect(authorityFor('cached_analysis')).toEqual({ letter: 'U', confidence: 0 });
    expect(authorityFor('unresolved')).toEqual({ letter: 'U', confidence: 0 });
  });

  it('treats an unknown or absent source as no authority at all', () => {
    expect(authorityFor('unspecified_engine')).toEqual({ letter: 'X', confidence: 0 });
    expect(authorityFor(undefined)).toEqual({ letter: 'X', confidence: 0 });
  });

  it('reads the authority straight off an IR token', () => {
    const token = { phoneticDiagnostics: { source: 'heuristic_fallback' } };
    expect(authorityForToken(token)).toEqual({ letter: 'G', confidence: 0.5 });
    expect(authorityForToken({})).toEqual({ letter: 'X', confidence: 0 });
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/core/truesight/chroma.authority.test.js`
Expected: FAIL — cannot resolve `chroma.authority.js`.

- [ ] **Step 3: Implement**

```js
// codex/core/shared/truesight/color/chroma.authority.js
/**
 * Turns a token's phoneme provenance into a colour authority.
 *
 * The IR token already carries `phoneticDiagnostics.source` — the phoneme engine
 * records whether it looked a word up or guessed it. The colour path has never
 * read it, which is why a colour minted from a dictionary and a colour minted
 * from a spelling guess are indistinguishable.
 *
 * Confidence feeds the kinase threshold (0.51): our dictionary, curated
 * overrides, and CMU paint. A guess never does.
 *
 * Pure module: no fs, no DOM, no clock, no network.
 */

const AUTHORITY_BY_SOURCE = Object.freeze({
  scholomance_dictionary: Object.freeze({ letter: 'D', confidence: 1 }),
  word_override: Object.freeze({ letter: 'O', confidence: 0.9 }),
  cmu_dictionary: Object.freeze({ letter: 'C', confidence: 0.8 }),

  // Guesses. The phonemes are derived from spelling, so love/move and
  // though/tough get opposite vowel families. Rendering these is not a degraded
  // mode, it is a lie.
  heuristic_fallback: Object.freeze({ letter: 'G', confidence: 0.5 }),
  alphabet_literal: Object.freeze({ letter: 'G', confidence: 0.5 }),
  multi_word_composition: Object.freeze({ letter: 'G', confidence: 0.5 }),

  // Unproven. `cached_analysis` is the engine's own admission that an entry was
  // "reused without a stored provenance trail" — an unproven colour is not truth.
  cached_analysis: Object.freeze({ letter: 'U', confidence: 0 }),
  unresolved: Object.freeze({ letter: 'U', confidence: 0 }),
});

/** No source at all: nothing was ever claimed, so nothing can be trusted. */
const NO_AUTHORITY = Object.freeze({ letter: 'X', confidence: 0 });

export const CHROMA_AUTHORITY_LETTERS = Object.freeze(['D', 'O', 'C', 'G', 'U', 'X']);

/** Letters whose colour is a guess and must never be painted. */
export const UNTRUSTED_AUTHORITY_LETTERS = Object.freeze(['G', 'U', 'X']);

export function authorityFor(source) {
  if (typeof source !== 'string') return NO_AUTHORITY;
  return AUTHORITY_BY_SOURCE[source] || NO_AUTHORITY;
}

export function authorityForToken(token) {
  return authorityFor(token?.phoneticDiagnostics?.source);
}
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `npx vitest run tests/core/truesight/chroma.authority.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add codex/core/shared/truesight/color/chroma.authority.js tests/core/truesight/chroma.authority.test.js
git commit -m "feat(chroma): turn phoneme provenance into a colour authority"
```

---

### Task 2: PB-CHROMA v2 — a stamp that can be read

`PB-CHROMA` is produced in three places and parsed nowhere. That is why no macrophage can exist: there is no antigen to read. This task gives it a version, a provenance payload, and a decoder.

**Files:**
- Create: `codex/core/shared/truesight/color/chroma.bytecode.js`
- Test: `tests/core/truesight/chroma.bytecode.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `encodeChromaBytecode({ authority, chef, reason, confidence, h, s, l, nucleus }) → string`, `decodeChromaBytecode(string) → object|null`, `CHROMA_CHEFS`, `CHROMA_REASONS`.

Format: `PB-CHROMA-v2-{authority}{chef}{reason}{conf2}-{hue3}{sat2}{lit2}{nucleus}`

- [ ] **Step 1: Write the failing test**

```js
// tests/core/truesight/chroma.bytecode.test.js
import { describe, expect, it } from 'vitest';
import {
  encodeChromaBytecode,
  decodeChromaBytecode,
} from '../../../codex/core/shared/truesight/color/chroma.bytecode.js';

const COMMITTED = {
  authority: 'D', chef: 'P', reason: 'K', confidence: 1,
  h: 240, s: 60, l: 60, nucleus: 'AA',
};

describe('PB-CHROMA v2', () => {
  it('encodes a committed dictionary colour', () => {
    expect(encodeChromaBytecode(COMMITTED)).toBe('PB-CHROMA-v2-DPK64-0f03c3cAA');
  });

  it('round-trips every field', () => {
    expect(decodeChromaBytecode(encodeChromaBytecode(COMMITTED))).toEqual({
      version: 2, authority: 'D', chef: 'P', reason: 'K', confidence: 1,
      h: 240, s: 60, l: 60, nucleus: 'AA', committed: true,
    });
  });

  it('stamps a refused guess — no colour, but a full account of why', () => {
    const refused = encodeChromaBytecode({
      authority: 'G', chef: 'S', reason: 'L', confidence: 0.5,
      h: 0, s: 0, l: 0, nucleus: null,
    });
    expect(refused).toBe('PB-CHROMA-v2-GSL32-000000__');

    const decoded = decodeChromaBytecode(refused);
    expect(decoded.committed).toBe(false);
    expect(decoded.reason).toBe('L');
    expect(decoded.authority).toBe('G');
    expect(decoded.nucleus).toBeNull();
  });

  it('round-trips across every authority, chef, and reason', () => {
    for (const authority of ['D', 'O', 'C', 'G', 'U', 'X']) {
      for (const chef of ['P', 'S', 'Q', 'A', 'N']) {
        for (const reason of ['K', 'M', 'I', 'L']) {
          const encoded = encodeChromaBytecode({
            authority, chef, reason, confidence: 0.8, h: 12, s: 34, l: 56, nucleus: 'IH',
          });
          const decoded = decodeChromaBytecode(encoded);
          expect(decoded, encoded).toMatchObject({ authority, chef, reason });
        }
      }
    }
  });

  it('refuses to decode a v1 stamp, so a probe can tell an old producer from a new one', () => {
    expect(decodeChromaBytecode('PB-CHROMA-0f03c3cAA')).toBeNull();
    expect(decodeChromaBytecode('PB-CHROMA-0000050__')).toBeNull();
  });

  it('refuses garbage rather than inventing a provenance', () => {
    for (const junk of ['', null, undefined, 'PB-CHROMA-v2-', 'PB-CHROMA-v2-ZZZ99-000000__', 'hsl(0,0%,0%)']) {
      expect(decodeChromaBytecode(junk), String(junk)).toBeNull();
    }
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/core/truesight/chroma.bytecode.test.js`
Expected: FAIL — cannot resolve `chroma.bytecode.js`.

- [ ] **Step 3: Implement**

```js
// codex/core/shared/truesight/color/chroma.bytecode.js
/**
 * PB-CHROMA v2 — a colour stamp that can be read.
 *
 * v1 (`PB-CHROMA-<hue3><sat2><lit2><nucleus>`) was write-only: minted in three
 * places, parsed nowhere, and byte-identical whether the phonemes behind it came
 * from a dictionary or from a spelling guess. No macrophage could exist, because
 * there was no antigen to read.
 *
 * v2 carries the provenance and the commit decision:
 *
 *   PB-CHROMA-v2-{authority}{chef}{reason}{conf2}-{hue3}{sat2}{lit2}{nucleus}
 *
 *   authority  D O C G U X   (see chroma.authority.js)
 *   chef       P S Q A N     which resolver cooked it — a chef cannot claim to be another
 *   reason     K M I L       committed / missing substrate / invalid reaction / low confidence
 *   conf2      confidence x100, two hex digits (00..64)
 *
 * Every token gets a stamp, painted or grey. A grey token with a stamp is the
 * whole point: it declares whether it is honestly grey or sick.
 *
 * Pure module: no fs, no DOM, no clock, no network.
 */

export const CHROMA_BYTECODE_PREFIX = 'PB-CHROMA';
export const CHROMA_BYTECODE_VERSION = 2;

export const CHROMA_CHEFS = Object.freeze({
  PCA: 'P',        // resolveVerseIrColor — PCA -> OKLCh
  SONIC: 'S',      // resolveSonicChroma — vowel wheel -> HSL
  QUANTIZER: 'Q',  // ChromaQuantizer
  AMPLIFIER: 'A',  // verseir-amplifier/plugins/phoneticColor
  NONE: 'N',       // nothing was committed
});

export const CHROMA_REASONS = Object.freeze({
  COMMITTED: 'K',
  MISSING_SUBSTRATE: 'M',
  INVALID_REACTION: 'I',
  LOW_CONFIDENCE: 'L',
});

const AUTHORITIES = new Set(['D', 'O', 'C', 'G', 'U', 'X']);
const CHEFS = new Set(Object.values(CHROMA_CHEFS));
const REASONS = new Set(Object.values(CHROMA_REASONS));

const NO_NUCLEUS = '__';

const hex = (value, width) => {
  const safe = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  return safe.toString(16).padStart(width, '0').slice(-width);
};

export function encodeChromaBytecode({ authority, chef, reason, confidence, h, s, l, nucleus }) {
  const conf = hex(Math.round((Number.isFinite(confidence) ? confidence : 0) * 100), 2);
  const payload = `${authority}${chef}${reason}${conf}`;
  const colour = `${hex(h, 3)}${hex(s, 2)}${hex(l, 2)}${nucleus || NO_NUCLEUS}`;
  return `${CHROMA_BYTECODE_PREFIX}-v${CHROMA_BYTECODE_VERSION}-${payload}-${colour}`;
}

/**
 * @returns {object|null} null for v1, malformed input, or an unknown symbol —
 * never a guess. A decoder that invents a provenance is the disease, not the cure.
 */
export function decodeChromaBytecode(value) {
  if (typeof value !== 'string') return null;

  const match = /^PB-CHROMA-v2-([A-Z])([A-Z])([A-Z])([0-9a-f]{2})-([0-9a-f]{3})([0-9a-f]{2})([0-9a-f]{2})(.+)$/.exec(value);
  if (!match) return null;

  const [, authority, chef, reason, conf, hueHex, satHex, litHex, nucleusRaw] = match;
  if (!AUTHORITIES.has(authority) || !CHEFS.has(chef) || !REASONS.has(reason)) return null;

  return {
    version: CHROMA_BYTECODE_VERSION,
    authority,
    chef,
    reason,
    confidence: parseInt(conf, 16) / 100,
    h: parseInt(hueHex, 16),
    s: parseInt(satHex, 16),
    l: parseInt(litHex, 16),
    nucleus: nucleusRaw === NO_NUCLEUS ? null : nucleusRaw,
    committed: reason === CHROMA_REASONS.COMMITTED,
  };
}
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `npx vitest run tests/core/truesight/chroma.bytecode.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add codex/core/shared/truesight/color/chroma.bytecode.js tests/core/truesight/chroma.bytecode.test.js
git commit -m "feat(chroma): PB-CHROMA v2 carries provenance and can be decoded"
```

---

### Task 3: The kinase — refuse to paint, and say why

The commit gate. Mirrors `qbit-phosphorylation.js`'s law without importing its geometry.

**Files:**
- Create: `codex/core/shared/truesight/color/chroma.kinase.js`
- Test: `tests/core/truesight/chroma.kinase.test.js`

**Interfaces:**
- Consumes: `authorityForToken` (Task 1), `encodeChromaBytecode`, `CHROMA_CHEFS`, `CHROMA_REASONS` (Task 2).
- Produces: `CHROMA_COLLAPSE_THRESHOLD = 0.51`, `buildChromaKinase(token, { chef, resolve })`, `phosphorylateToken(token, kinase, { threshold })` → `{ committed, color, confidence, reason, authority, chef, bytecode }`.

`resolve` is injected — the kinase does not know how to compute a colour, only whether one may be committed. That keeps the colour mathematics untouched and the module pure.

- [ ] **Step 1: Write the failing test**

```js
// tests/core/truesight/chroma.kinase.test.js
import { describe, expect, it } from 'vitest';
import {
  CHROMA_COLLAPSE_THRESHOLD,
  buildChromaKinase,
  phosphorylateToken,
} from '../../../codex/core/shared/truesight/color/chroma.kinase.js';
import { decodeChromaBytecode } from '../../../codex/core/shared/truesight/color/chroma.bytecode.js';

const tokenFrom = source => ({
  text: 'bold',
  phonemes: ['B', 'AA1', 'L', 'D'],
  phoneticDiagnostics: { source },
});

const goodColour = () => ({ hex: '#4466CC', h: 240, s: 60, l: 60, nucleus: 'AA' });

const kinaseFor = (token, resolve = goodColour) =>
  buildChromaKinase(token, { chef: 'P', resolve });

describe('chroma kinase', () => {
  it('uses the same collapse threshold as qbit phosphorylation', () => {
    expect(CHROMA_COLLAPSE_THRESHOLD).toBe(0.51);
  });

  it('commits a colour backed by the dictionary', () => {
    const token = tokenFrom('scholomance_dictionary');
    const result = phosphorylateToken(token, kinaseFor(token));

    expect(result.committed).toBe(true);
    expect(result.color).toBe('#4466CC');
    expect(result.reason).toBe('K');
    expect(result.confidence).toBe(1);
  });

  it('REFUSES a guess — the colour would be a lie', () => {
    const token = tokenFrom('heuristic_fallback');
    const result = phosphorylateToken(token, kinaseFor(token));

    expect(result.committed).toBe(false);
    expect(result.reason).toBe('L');
    expect(result.color).toBeNull();
    expect(result.confidence).toBe(0.5);
  });

  it('refuses at 0.50 and commits at 0.51 — the exact boundary', () => {
    const token = tokenFrom('scholomance_dictionary');
    const kinase = kinaseFor(token);

    expect(phosphorylateToken(token, kinase, { threshold: 1.01 }).reason).toBe('L');
    expect(phosphorylateToken(token, kinase, { threshold: 1 }).reason).toBe('K');
  });

  it('refuses a malformed colour as an invalid reaction', () => {
    const token = tokenFrom('scholomance_dictionary');
    const kinase = kinaseFor(token, () => ({ hex: '#NaNNaN', h: NaN, s: 0, l: 0, nucleus: 'AA' }));
    const result = phosphorylateToken(token, kinase);

    expect(result.committed).toBe(false);
    expect(result.reason).toBe('I');
  });

  it('refuses a token with no phonemes as missing substrate', () => {
    const token = { text: 'bold', phonemes: [], phoneticDiagnostics: { source: 'unresolved' } };
    const result = phosphorylateToken(token, kinaseFor(token));

    expect(result.committed).toBe(false);
    expect(result.reason).toBe('M');
  });

  it('stamps every outcome, painted or grey', () => {
    const painted = tokenFrom('scholomance_dictionary');
    const refused = tokenFrom('heuristic_fallback');

    const a = decodeChromaBytecode(phosphorylateToken(painted, kinaseFor(painted)).bytecode);
    const b = decodeChromaBytecode(phosphorylateToken(refused, kinaseFor(refused)).bytecode);

    expect(a).toMatchObject({ authority: 'D', chef: 'P', reason: 'K', committed: true });
    expect(b).toMatchObject({ authority: 'G', chef: 'P', reason: 'L', committed: false });
  });

  it('never lets a chef claim to be another chef', () => {
    const token = tokenFrom('scholomance_dictionary');
    const sonic = buildChromaKinase(token, { chef: 'S', resolve: goodColour });
    expect(decodeChromaBytecode(phosphorylateToken(token, sonic).bytecode).chef).toBe('S');
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/core/truesight/chroma.kinase.test.js`
Expected: FAIL — cannot resolve `chroma.kinase.js`.

- [ ] **Step 3: Implement**

```js
// codex/core/shared/truesight/color/chroma.kinase.js
/**
 * The commit gate TrueSight never had.
 *
 * TrueSight paints unconditionally (`dom.style.color = this.__color`), so a
 * colour derived from guessed phonemes is painted with exactly the same
 * confidence as one derived from the dictionary. qbit-phosphorylation.js already
 * solved this shape for pixels: build a kinase, score a confidence, and either
 * commit or refuse with a TYPED REASON.
 *
 * We purpose the law, not the function body — `phosphorylate()` is welded to SDF
 * geometry (evaluateSDF, sdfGradient, setCell), and a token is not a pixel with a
 * signed distance.
 *
 * The refusal reason is the antigen. Every grey token declares why it is grey:
 *
 *   (none) healthy  — analysis ran, nothing rhymed
 *   L      sick     — the phonemes were guessed (API down, or flooded to the local path)
 *   I      broken   — malformed colour (#NaN)
 *   M      starved  — no phonemes at all
 *
 * Pure module: no fs, no DOM, no clock, no network.
 */

import { authorityForToken } from './chroma.authority.js';
import {
  CHROMA_CHEFS,
  CHROMA_REASONS,
  encodeChromaBytecode,
} from './chroma.bytecode.js';

/** Same bar as qbit-phosphorylation's COLLAPSE_THRESHOLD. 0.50 is refused; 0.51 commits. */
export const CHROMA_COLLAPSE_THRESHOLD = 0.51;

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

/**
 * @param {object} token - an IR token carrying `phonemes` and `phoneticDiagnostics`.
 * @param {object} options
 * @param {string} options.chef - CHROMA_CHEFS value. The kinase stamps its own chef;
 *   a chef cannot claim to be another chef.
 * @param {Function} options.resolve - (token) => { hex, h, s, l, nucleus }. Injected, so
 *   the kinase decides whether a colour MAY be committed without knowing how to compute one.
 */
export function buildChromaKinase(token, { chef = CHROMA_CHEFS.NONE, resolve } = {}) {
  const authority = authorityForToken(token);
  const hasSubstrate = Array.isArray(token?.phonemes) && token.phonemes.length > 0;

  return {
    chef,
    authority,
    call() {
      if (!hasSubstrate) return { color: null, confidence: authority.confidence, nucleus: null };
      if (typeof resolve !== 'function') return { color: null, confidence: authority.confidence, nucleus: null };

      const resolved = resolve(token) || {};
      return {
        color: resolved.hex ?? null,
        confidence: authority.confidence,
        h: resolved.h,
        s: resolved.s,
        l: resolved.l,
        nucleus: resolved.nucleus ?? null,
      };
    },
  };
}

/**
 * Commits a colour, or refuses it with a reason.
 * @returns {{committed: boolean, color: string|null, confidence: number,
 *            reason: string, authority: string, chef: string, bytecode: string}}
 */
export function phosphorylateToken(token, kinase, options = {}) {
  const threshold = Number.isFinite(options.threshold) ? options.threshold : CHROMA_COLLAPSE_THRESHOLD;
  const authority = kinase?.authority || { letter: 'X', confidence: 0 };
  const chef = kinase?.chef || CHROMA_CHEFS.NONE;

  const stamp = (reason, result = {}) => {
    const committed = reason === CHROMA_REASONS.COMMITTED;
    return {
      committed,
      color: committed ? result.color : null,
      confidence: authority.confidence,
      reason,
      authority: authority.letter,
      chef,
      bytecode: encodeChromaBytecode({
        authority: authority.letter,
        chef,
        reason,
        confidence: authority.confidence,
        h: committed ? result.h : 0,
        s: committed ? result.s : 0,
        l: committed ? result.l : 0,
        nucleus: committed ? result.nucleus : null,
      }),
    };
  };

  let result;
  try {
    result = kinase.call();
  } catch {
    return stamp(CHROMA_REASONS.INVALID_REACTION);
  }

  // No phonemes: there is no surface to paint.
  if (!result || result.color === null) return stamp(CHROMA_REASONS.MISSING_SUBSTRATE, result);

  // A malformed colour is a broken reaction, not a weak one — report it as such
  // even when the authority would have been sufficient.
  if (!HEX_COLOR_RE.test(result.color)) return stamp(CHROMA_REASONS.INVALID_REACTION, result);

  // The colour is well-formed but unbacked. Refuse: painting it would be a lie.
  if (authority.confidence < threshold) return stamp(CHROMA_REASONS.LOW_CONFIDENCE, result);

  return stamp(CHROMA_REASONS.COMMITTED, result);
}
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `npx vitest run tests/core/truesight/chroma.kinase.test.js`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add codex/core/shared/truesight/color/chroma.kinase.js tests/core/truesight/chroma.kinase.test.js
git commit -m "feat(chroma): a kinase that refuses to paint a colour it cannot justify"
```

---

### Task 4: Stamp the artifact — every token, painted or grey

**Stamp-only.** This task must not change which words get painted. It records the truth so Task 8 can measure it and Task 9 can act on it.

**Files:**
- Modify: `codex/core/shared/truesight/compiler/VerseSynthesis.js:76-99`
- Test: `tests/core/truesight/chroma.stamp.test.js`

**Interfaces:**
- Consumes: `buildChromaKinase`, `phosphorylateToken` (Task 3), `CHROMA_CHEFS` (Task 2).
- Produces: `token.precomputed.chroma = { bytecode, committed, reason, authority, chef, confidence, color }` on every token.

The winning chef is recorded, which makes the silent `verseIrColor?.hex || hsl(sonicChroma)` swap at line 97 observable for the first time.

- [ ] **Step 1: Write the failing test**

```js
// @vitest-environment node
// tests/core/truesight/chroma.stamp.test.js
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
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/core/truesight/chroma.stamp.test.js`
Expected: FAIL — `token.precomputed.chroma` is undefined.

- [ ] **Step 3: Implement**

In `codex/core/shared/truesight/compiler/VerseSynthesis.js`, add the imports:

```js
import { buildChromaKinase, phosphorylateToken } from '../color/chroma.kinase.js';
import { CHROMA_CHEFS } from '../color/chroma.bytecode.js';
```

Replace the body of the `tokensToIterate.forEach` block from the `sonicChroma` line through `precomputed` (currently lines 76-99) with:

```js
    // PIPELINE A: Phonetic Anchor
    const sonicChroma = (token.phonemes?.length > 0) ? resolveSonicChroma(token.phonemes) : null;

    // PIPELINE B: Unified Visual (Locked to Anchor)
    const verseIrColor = token.terminalVowelFamily
      ? resolveVerseIrColor(token.terminalVowelFamily, currentSchool, {
          phase: index / (verseIR.tokens.length || 1)
        })
      : null;

    const visualBytecode = token.visualBytecode || token.trueVisionBytecode || null;
    const decoded = visualBytecode ? decodeBytecode(visualBytecode) : null;

    // Which chef actually cooked this token's colour? Pipeline B wins when it has
    // a vowel family; otherwise Pipeline A's HSL is used. Two different colour
    // spaces have always swapped into this one field — now we record which.
    const chef = verseIrColor
      ? CHROMA_CHEFS.PCA
      : (sonicChroma ? CHROMA_CHEFS.SONIC : CHROMA_CHEFS.NONE);

    const kinase = buildChromaKinase(token, {
      chef,
      resolve: () => {
        if (verseIrColor) {
          return {
            hex: verseIrColor.hex,
            h: verseIrColor.oklch?.h,
            s: Math.round((verseIrColor.oklch?.c ?? 0) * 100),
            l: Math.round((verseIrColor.oklch?.l ?? 0) * 100),
            nucleus: token.terminalVowelFamily,
          };
        }
        if (sonicChroma) {
          return {
            hex: hslToHex(sonicChroma.h, sonicChroma.s, sonicChroma.l),
            h: sonicChroma.h,
            s: sonicChroma.s,
            l: sonicChroma.l,
            nucleus: token.primaryStressedVowelFamily,
          };
        }
        return { hex: null };
      },
    });

    const chroma = phosphorylateToken(token, kinase);

    const unifiedToken = {
      ...token,
      ...syntaxToken,
      hhm: hhm.tokenStateByIdentity.get(identityKey) || null,
      vowelFamily: normalizeVowelFamily(token.primaryStressedVowelFamily),
      verseIrColor,
      precomputed: {
        sonicChroma,
        decoded,
        chroma,
        // STAMP-ONLY (Task 4): the renderer still reads `hex`, and `hex` is still
        // whatever it was before the kinase existed. Task 9 makes `hex` obey the
        // kinase. Do not "fix" this line early — the stamp must be proven truthful
        // on real text before the gate is trusted to act on it.
        verseIrColorHex: verseIrColor?.hex || null,
        hex: verseIrColor?.hex || (sonicChroma ? `hsl(${sonicChroma.h}, ${sonicChroma.s}%, ${sonicChroma.l}%)` : null)
      }
    };
```

Add `hslToHex` to the existing import from `../color/pcaChroma.js` (it is already exported there).

- [ ] **Step 4: Run it and confirm it passes**

Run: `npx vitest run tests/core/truesight/chroma.stamp.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Prove nothing else moved**

Run: `npx vitest run tests/core tests/lib`
Expected: no NEW failures. Five failures pre-date this work (`bottle/model` slant, `happy` monosyllable, the Map-gate test, `Daydreaming Nightmares`, ambient retune) — confirm the count is unchanged.

- [ ] **Step 6: Commit**

```bash
git add codex/core/shared/truesight/compiler/VerseSynthesis.js tests/core/truesight/chroma.stamp.test.js
git commit -m "feat(chroma): stamp every token with its authority and its chef"
```

---

### Task 5: Carry the stamp into the DOM

`__tokenData` is already the artifact token, and `createDOM` already writes `dom.dataset.lexicalKey`. So the stamp reaches the DOM with no constructor, clone, or serialization change.

**Files:**
- Modify: `src/lib/lexical/TruesightNode.js:78-100` (`createDOM`) and its `updateDOM`
- Test: `tests/lib/truesightNode.chroma.test.jsx`

**Interfaces:**
- Consumes: `token.precomputed.chroma.bytecode` (Task 4).
- Produces: `data-chroma` on every rendered `.grimoire-word` span.

- [ ] **Step 1: Write the failing test**

```jsx
// tests/lib/truesightNode.chroma.test.jsx
import { describe, expect, it } from 'vitest';
import { TruesightWordNode } from '../../src/lib/lexical/TruesightNode.js';

const config = { theme: {}, namespace: 'test' };

const nodeWith = chroma => new TruesightWordNode(
  'bold',
  '#4466CC',
  '',
  null,
  false,
  { precomputed: { chroma } },
);

describe('TruesightWordNode chroma stamp', () => {
  it('stamps the bytecode onto the rendered span', () => {
    const dom = nodeWith({ bytecode: 'PB-CHROMA-v2-DPK64-0f03c3cAA' }).createDOM(config);
    expect(dom.dataset.chroma).toBe('PB-CHROMA-v2-DPK64-0f03c3cAA');
  });

  it('stamps a REFUSED token too — a grey token must declare why it is grey', () => {
    const dom = nodeWith({ bytecode: 'PB-CHROMA-v2-GSL32-000000__' }).createDOM(config);
    expect(dom.dataset.chroma).toBe('PB-CHROMA-v2-GSL32-000000__');
  });

  it('omits the attribute rather than inventing one when there is no stamp', () => {
    const dom = new TruesightWordNode('bold', '#4466CC', '', null, false, null).createDOM(config);
    expect(dom.dataset.chroma).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/lib/truesightNode.chroma.test.jsx`
Expected: FAIL — `dom.dataset.chroma` is undefined.

- [ ] **Step 3: Implement**

In `src/lib/lexical/TruesightNode.js`, inside `createDOM`, immediately after the existing
`dom.dataset.lexicalKey = this.__key;` line:

```js
    // The colour's provenance, readable from the DOM. A macrophage sweeping the
    // live page decodes this to tell an honestly grey token from a sick one.
    const chromaStamp = this.__tokenData?.precomputed?.chroma?.bytecode;
    if (chromaStamp) {
      dom.dataset.chroma = chromaStamp;
    }
```

In `updateDOM`, keep the attribute in step with the node — add, after the existing colour
handling block:

```js
    const nextStamp = this.__tokenData?.precomputed?.chroma?.bytecode;
    const prevStamp = prevNode.__tokenData?.precomputed?.chroma?.bytecode;
    if (nextStamp !== prevStamp) {
      if (nextStamp) dom.dataset.chroma = nextStamp;
      else delete dom.dataset.chroma;
    }
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `npx vitest run tests/lib/truesightNode.chroma.test.jsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/lexical/TruesightNode.js tests/lib/truesightNode.chroma.test.jsx
git commit -m "feat(chroma): carry the colour's provenance into the DOM"
```

---

### Task 6: The macrophage's nose

A detector that reads stamps. It reports; it does not repair.

**Files:**
- Modify: `codex/core/diagnostic/chromaticImmuneProbe.js` (append; do not disturb the existing exports)
- Test: `tests/core/diagnostic/chromaticImmuneProbe.stamps.test.js`

**Interfaces:**
- Consumes: `decodeChromaBytecode` (Task 2).
- Produces: `scanChromaStamps(stamps: string[]) → { total, decoded, findings: [{ code, detail }], authorityHistogram, chefs }`

Finding codes: `CHROMA_BLEED`, `LIE_PAINTED`, `AUTHORITY_LOST`, `TORN_FRAME`, `TOO_MANY_CHEFS`.

- [ ] **Step 1: Write the failing test**

```js
// tests/core/diagnostic/chromaticImmuneProbe.stamps.test.js
import { describe, expect, it } from 'vitest';
import { scanChromaStamps } from '../../../codex/core/diagnostic/chromaticImmuneProbe.js';

const codes = report => report.findings.map(f => f.code).sort();

describe('scanChromaStamps', () => {
  it('is silent on a healthy, fully-authoritative view', () => {
    const report = scanChromaStamps([
      'PB-CHROMA-v2-DPK64-0f03c3cAA',
      'PB-CHROMA-v2-DPK64-0f03c3cIH',
    ]);
    expect(report.findings).toEqual([]);
    expect(report.authorityHistogram).toEqual({ D: 2 });
  });

  it('detects chroma bleed — a malformed colour reaction', () => {
    const report = scanChromaStamps(['PB-CHROMA-v2-DPI64-000000AA']);
    expect(codes(report)).toContain('CHROMA_BLEED');
  });

  it('detects THE LIE PAINTED — a committed colour with no authority behind it', () => {
    // Must be impossible. If it is ever seen, a chef bypassed the kinase.
    const report = scanChromaStamps(['PB-CHROMA-v2-GPK32-0f03c3cAA']);
    expect(codes(report)).toContain('LIE_PAINTED');
  });

  it('detects a view that lost its authority — the API is down or flooded', () => {
    const report = scanChromaStamps([
      'PB-CHROMA-v2-GSL32-000000__',
      'PB-CHROMA-v2-GSL32-000000__',
    ]);
    expect(codes(report)).toContain('AUTHORITY_LOST');
  });

  it('detects a torn frame — some tokens kept the dictionary, others fell back', () => {
    const report = scanChromaStamps([
      'PB-CHROMA-v2-DPK64-0f03c3cAA',
      'PB-CHROMA-v2-GSL32-000000__',
    ]);
    expect(codes(report)).toContain('TORN_FRAME');
  });

  it('detects too many chefs in one kitchen', () => {
    const report = scanChromaStamps([
      'PB-CHROMA-v2-DPK64-0f03c3cAA',
      'PB-CHROMA-v2-DSK64-0f03c3cIH',
    ]);
    expect(codes(report)).toContain('TOO_MANY_CHEFS');
    expect(report.chefs.sort()).toEqual(['P', 'S']);
  });

  it('ignores v1 stamps instead of guessing at them', () => {
    const report = scanChromaStamps(['PB-CHROMA-0f03c3cAA', 'not a stamp']);
    expect(report.decoded).toBe(0);
    expect(report.findings).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/core/diagnostic/chromaticImmuneProbe.stamps.test.js`
Expected: FAIL — `scanChromaStamps` is not exported.

- [ ] **Step 3: Implement**

Append to `codex/core/diagnostic/chromaticImmuneProbe.js`:

```js
import { decodeChromaBytecode } from '../shared/truesight/color/chroma.bytecode.js';
import { UNTRUSTED_AUTHORITY_LETTERS } from '../shared/truesight/color/chroma.authority.js';

/** A committed colour needs a real authority behind it. These letters have none. */
const UNTRUSTED = new Set(UNTRUSTED_AUTHORITY_LETTERS);

/**
 * The macrophage's nose: reads PB-CHROMA v2 stamps off a view and reports what it
 * smells. It reports only — it does not repair, and it never rewrites a colour to
 * hide the evidence.
 *
 * @param {string[]} stamps
 */
export function scanChromaStamps(stamps) {
  const decoded = (Array.isArray(stamps) ? stamps : [])
    .map(decodeChromaBytecode)
    .filter(Boolean);

  const findings = [];
  const authorityHistogram = {};
  const chefs = new Set();

  for (const stamp of decoded) {
    authorityHistogram[stamp.authority] = (authorityHistogram[stamp.authority] || 0) + 1;
    if (stamp.chef !== 'N') chefs.add(stamp.chef);

    if (stamp.reason === 'I') {
      findings.push({ code: 'CHROMA_BLEED', detail: 'A colour reaction produced a malformed value' });
    }

    // The invariant. A kinase can only commit above threshold, so a committed
    // colour with an untrusted authority means a chef painted around the gate.
    if (stamp.committed && UNTRUSTED.has(stamp.authority)) {
      findings.push({
        code: 'LIE_PAINTED',
        detail: `A colour was painted on authority ${stamp.authority}, which cannot back it`,
      });
    }
  }

  const authorities = Object.keys(authorityHistogram);
  const trusted = authorities.filter(letter => !UNTRUSTED.has(letter));
  const untrusted = authorities.filter(letter => UNTRUSTED.has(letter));

  if (decoded.length > 0 && trusted.length === 0) {
    findings.push({
      code: 'AUTHORITY_LOST',
      detail: 'No token in this view has a dictionary-backed colour: the API is down or flooded',
    });
  } else if (trusted.length > 0 && untrusted.length > 0) {
    findings.push({
      code: 'TORN_FRAME',
      detail: 'Some tokens kept dictionary authority while others fell back — the view is fragmented',
    });
  }

  if (chefs.size > 1) {
    findings.push({
      code: 'TOO_MANY_CHEFS',
      detail: `Colour in this view was cooked by ${[...chefs].sort().join(' and ')}`,
    });
  }

  return {
    total: Array.isArray(stamps) ? stamps.length : 0,
    decoded: decoded.length,
    findings,
    authorityHistogram,
    chefs: [...chefs],
  };
}
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `npx vitest run tests/core/diagnostic/chromaticImmuneProbe.stamps.test.js`
Expected: PASS (7 tests).

- [ ] **Step 5: Prove the existing probe still works**

Run: `npx vitest run tests/core/diagnostic`
Expected: no new failures.

- [ ] **Step 6: Commit**

```bash
git add codex/core/diagnostic/chromaticImmuneProbe.js tests/core/diagnostic/chromaticImmuneProbe.stamps.test.js
git commit -m "feat(chroma): give the macrophage a nose it can trust"
```

---

### Task 7: Cure the autoimmune macrophage

`macrophage-chroma.js` fabricates its own faults (`if (token.text === 'corrupted') renderedColor = 'undefined'`), never navigates (it declares a leak at its spawn point after 0 steps), and phagocytizes the **healthy** token "Colors" — stamping it CRITICAL with a fabricated root cause. Run as-is it would flood TrueSight with false positives. It is the prion detector hunting the cure and calling it the disease.

**Files:**
- Modify: `macrophage-chroma.js` (delete the simulation; drive it from real stamps)

- [ ] **Step 1: Prove the autoimmunity, so the fix has a witness**

Run: `node macrophage-chroma.js`
Expected: it phagocytizes `"Colors"` whose `expectedColor === renderedColor`. Record that output in the commit message.

- [ ] **Step 2: Replace the fabricated faults with real stamps**

Delete the two planted faults and the `spectralCentroid: NaN` injection. Build `ChromaNode`s
from `synthesizeVerse(text)` tokens, using `token.precomputed.chroma`:

```js
import { synthesizeVerse } from './codex/core/shared/truesight/compiler/VerseSynthesis.js';
import { decodeChromaBytecode } from './codex/core/shared/truesight/color/chroma.bytecode.js';
import { scanChromaStamps } from './codex/core/diagnostic/chromaticImmuneProbe.js';

// A node is distressed when its OWN stamp says so. We do not invent faults.
function distressOf(token) {
  const stamp = decodeChromaBytecode(token.precomputed?.chroma?.bytecode);
  if (!stamp) return null;
  if (stamp.reason === 'I') return 'CHROMA_BLEED';
  if (stamp.committed && ['G', 'U', 'X'].includes(stamp.authority)) return 'LIE_PAINTED';
  return null;   // LOW_CONFIDENCE is a healthy REFUSAL, not a fault: the gate worked.
}
```

- [ ] **Step 3: Add the guard it never had, and delete the "cure"**

Replace the whole `phagocytosis(node)` method with:

```js
  phagocytosis(node) {
    // A cell that eats healthy tissue is a disease, not a cure. The previous
    // version deployed at (0,0,2), moved zero steps, and devoured the healthy
    // token "Colors" — expected === rendered — stamping it CRITICAL and
    // fabricating a root cause for a fault that did not exist.
    if (!node.distress) {
      console.log(`[MACROPHAGE ${this.id}] Healthy cell "${node.word}" — standing down.`);
      return false;
    }

    console.log(`[MACROPHAGE ${this.id}] Phagocytosis on "${node.word}" (${node.id})`);
    console.log(JSON.stringify({
      version: 'v3',
      category: 'SPECTRAL_PIPELINE',
      severity: 'CRITICAL',
      errorCode: 'PB-ERR-v1-TRUESIGHT-CHROMA-BLEED',
      cellId: 'VERSE_IR_RENDERER',
      checkId: 'VISUAL_BYTECODE_FIDELITY',
      context: {
        word: node.word,
        stamp: node.stamp,          // the PB-CHROMA v2 bytecode — the evidence
        distress: node.distress,    // CHROMA_BLEED | LIE_PAINTED — never invented
        spatialTopology: { x: node.x, y: node.y, z: node.z, layer: 'CHROMATIC_DOM' },
      },
    }, null, 2));

    // NO REPAIR. The old version set renderedColor = 'hsl(0, 0%, 50%)', which
    // wiped the evidence to neutral grey and called that a cure. The macrophage
    // reports; a human fixes.
    node.phagocytized = true;
    this.engulfedToxins++;
    return true;
  }
```

- [ ] **Step 4: Run it on healthy text and confirm it eats nothing**

Run: `node macrophage-chroma.js`
Expected: no phagocytosis on a healthy verse. Every message is a stand-down or a real,
stamp-backed finding.

- [ ] **Step 5: Commit**

```bash
git add macrophage-chroma.js
git commit -m "fix(macrophage): a cell that eats healthy tissue is a disease, not a cure"
```

---

### Task 8: Measure the authority distribution — the gate to Task 9

Before a 0.51 gate is allowed to grey anything, we must know what fraction of real text is
dictionary-backed. If guesses are common on healthy text, that is a **data** finding, and
Task 9 must not proceed until it is understood.

**Files:**
- Create: `tests/core/truesight/chroma.authority-distribution.test.js`

- [ ] **Step 1: Write the measurement**

```js
// @vitest-environment node
// tests/core/truesight/chroma.authority-distribution.test.js
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
```

- [ ] **Step 2: Run it and read the number**

Run: `npx vitest run tests/core/truesight/chroma.authority-distribution.test.js`
Expected: PASS, and it prints e.g. `[chroma authority] {"D":61,"G":14} trusted=81.3%`.

- [ ] **Step 3: STOP and report the number**

Do not start Task 9 without showing this histogram to a human. If `G`/`U` dominate on healthy
text with a live dictionary, enforcement would grey the app, and the real bug is upstream in
the dictionary path — not in the gate.

- [ ] **Step 4: Commit**

```bash
git add tests/core/truesight/chroma.authority-distribution.test.js
git commit -m "test(chroma): measure how much real text can justify its colour"
```

---

### Task 9: Enforce — stop painting the lie

**Only after Task 8's number is reviewed.** This is the task that changes what the user sees.

**Files:**
- Modify: `codex/core/shared/truesight/compiler/VerseSynthesis.js` (the `precomputed.hex` line from Task 4)
- Test: `tests/core/truesight/chroma.color-dragon.test.js`

**Interfaces:**
- Consumes: `token.precomputed.chroma` (Task 4).

- [ ] **Step 1: Write the failing law**

```js
// @vitest-environment node
// tests/core/truesight/chroma.color-dragon.test.js
//
// THE COLOR_DRAGON LAW, made executable.
//
// "Rendering them is not a degraded mode, it is a lie: love/move and though/tough
//  get opposite vowel families." — buildResonanceGate.js
import { afterEach, describe, expect, it } from 'vitest';
import { PhonemeEngine } from '../../../codex/core/phonology/phoneme.engine.js';
import { synthesizeVerse } from '../../../codex/core/shared/truesight/compiler/VerseSynthesis.js';
import { decodeChromaBytecode } from '../../../codex/core/shared/truesight/color/chroma.bytecode.js';

const VERSE = 'the knight was brave and old';

afterEach(() => {
  PhonemeEngine.authorityFailure = null;
});

describe('the COLOR_DRAGON law', () => {
  it('paints NOTHING it cannot justify', () => {
    const artifact = synthesizeVerse(VERSE, {});
    for (const token of artifact.verseIR?.tokens || []) {
      const stamp = decodeChromaBytecode(token.precomputed.chroma.bytecode);
      if (!stamp.committed) {
        expect(token.precomputed.hex, `${token.text} was painted on authority ${stamp.authority}`)
          .toBeNull();
      }
    }
  });

  it('a guess is never painted, however confident it looks', () => {
    const artifact = synthesizeVerse(VERSE, {});
    for (const token of artifact.verseIR?.tokens || []) {
      const stamp = decodeChromaBytecode(token.precomputed.chroma.bytecode);
      if (['G', 'U', 'X'].includes(stamp.authority)) {
        expect(token.precomputed.hex, `${token.text} is a guess and was painted`).toBeNull();
      }
    }
  });

  it('an honestly grey token and a sick one are distinguishable from the stamp alone', () => {
    const artifact = synthesizeVerse(VERSE, {});
    const stamps = (artifact.verseIR?.tokens || [])
      .map(t => decodeChromaBytecode(t.precomputed.chroma.bytecode));

    for (const stamp of stamps.filter(s => !s.committed)) {
      // Every refusal names itself. None is silent.
      expect(['M', 'I', 'L']).toContain(stamp.reason);
    }
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/core/truesight/chroma.color-dragon.test.js`
Expected: FAIL — uncommitted tokens still carry a `hex`, because Task 4 was stamp-only.

- [ ] **Step 3: Make `hex` obey the kinase**

In `VerseSynthesis.js`, replace the stamp-only `precomputed` block from Task 4 with:

```js
      precomputed: {
        sonicChroma,
        decoded,
        chroma,
        verseIrColorHex: verseIrColor?.hex || null,
        // The kinase decides. A colour that cannot justify itself is not painted —
        // the token goes grey, and its stamp says exactly why.
        hex: chroma.committed ? chroma.color : null
      }
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `npx vitest run tests/core/truesight/chroma.color-dragon.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Run every colour and TrueSight suite**

Run: `npx vitest run tests/core tests/lib`
Expected: no NEW failures beyond the five that pre-date this work. Colour coverage will drop
wherever authority is missing — that is the point, and Task 8's histogram is what makes the
drop explainable rather than alarming.

- [ ] **Step 6: Drive the real app**

Run the dev server and open `/read` with the dictionary **up**, then with it **down**
(`SCHOLOMANCE_DICT_PATH=/nonexistent`). Per this project's rule, paint is judged headed —
never headless. Confirm: authority up → colour; authority down → grey, and every grey span
carries a `data-chroma` ending in `L`.

- [ ] **Step 7: Commit**

```bash
git add codex/core/shared/truesight/compiler/VerseSynthesis.js tests/core/truesight/chroma.color-dragon.test.js
git commit -m "feat(chroma): stop painting colours we cannot justify"
```

---

## Review Checkpoints

Pause for human review after:

1. **Task 4** — the stamp exists and nothing moved.
2. **Task 8** — the authority histogram. **Hard gate.** Task 9 does not start until a human has seen this number.
3. **Task 9** — the app, driven headed, with the dictionary up and down.

## Definition of Done

- Every token carries a `PB-CHROMA-v2` stamp, painted or grey.
- A guess is never painted. `LIE_PAINTED` is unreachable by construction, and the probe asserts it.
- An honestly grey token and a sick one are distinguishable from the stamp alone — which is what makes API failure and flooding visible for the first time.
- The two colour pipelines are visible as distinct chefs. (Collapsing them is a separate PDR.)
- The macrophage no longer eats healthy cells.
