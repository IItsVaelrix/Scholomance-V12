# PDR: Rhyme Color Registry — YouTube-Style Adaptive Rhyme Coloring

**Subtitle:** Each rhyme sound earns its color. The same sound always glows the same way.

**Status:** Ready for Implementation  
**Classification:** Color Engine + Codex Contract + UI Wire  
**Priority:** High  
**Primary Owner:** Codex (core module + schema) → Claude (UI wire)  
**Secondary Owner:** Minimax (QA)

---

## 1. Executive Summary

TrueSight currently colors words by their phonemic position in vowel formant space (PCA → HSL). Every word with the same vowel family gets the same color, and colors are computed per-token with no awareness of the full verse context.

This is acoustically correct but narratively blind. It doesn't answer the question players actually ask: *"which words rhyme with each other?"*

YouTube lyric visualizers — RapGenius, Genius annotations, and Spotify Canvas lyrics — answer this with a simple, powerful pattern: the first rhyme sound in a verse gets color slot 0, the second gets slot 1, and so on. When a rhyme sound recurs, it snaps back to its assigned color. The registry is built from the verse, not from an external lookup table.

This PDR defines that system for Scholomance TrueSight: a **verse-scoped rhyme color registry** that assigns colors in order of first appearance, reuses colors on recurrence, and produces a palette that reads the verse's rhyme structure at a glance.

---

## 2. Problem Statement

**Current flow (per-token, context-free):**
```
token.vowelFamily → PCA formant (F1, F2) → HSL projection → hex color
```

**What's wrong:**
- "NIGHT" and "LIGHT" have the same vowel family (AY) and do get the same color — but only by coincidence of phonemic family, not because the system *knows* they rhyme
- "FIRE" and "DESIRE" share a terminal sound but may differ in stressed vowel family — they get different colors despite rhyming
- Words with the same vowel family but no rhyme relationship (e.g., "CAT" and "THAT" mid-line) get the same color as if they rhyme
- There is no visual signal for *internal* rhymes, multi-syllabic rhymes, or slant rhymes — the rhymeKey exists in the IR but never reaches the color layer
- The color registry is stateless: it cannot distinguish verse 1 rhyme scheme from verse 2's

**The `rhymeKey` already exists.** `VerseTokenIR` carries it. `VisualBytecode` does not propagate it. It never reaches `bytecodeRenderer.js` or `ScrollEditor.jsx`.

---

## 3. Product Goal

1. **Rhyme group identity is visual** — words that share a `rhymeKey` always share a color in TrueSight, within a given verse
2. **First-seen ordering** — the first rhyme group in the verse gets color slot 0, the second slot 1, etc. Color assignment is deterministic and verse-scoped
3. **Colors are maximally distinct** — each new slot uses golden-angle hue spacing (137.5°) so adjacent slots are never similar
4. **School law is preserved** — the registry color modulates within the token's school hue range; SONIC words are still purple-adjacent, but rhyme identity creates a consistent sub-hue
5. **Non-rhyming words are unchanged** — INERT tokens and tokens with no `rhymeKey` continue using the existing PCA color path

---

## 4. Non-Goals

- Not replacing the PCA color system for non-rhyming words
- Not changing `rhymeKey` computation — that logic in `compileVerseToIR.js` is correct and stays
- Not affecting combat result rendering
- Not a global cross-verse registry — registry is scoped to the current analysis window (the scroll in the editor)
- Not changing scoring, weights, or any mechanic values

---

## 5. Core Design

### 5.1 The Registry Algorithm

```
Input: tokens[] (all VerseTokenIR tokens from the current verse)
Output: Map<rhymeKey, hexColor>

1. Initialize: registry = new Map(), slotIndex = 0
2. For each token in document order:
   a. If token.rhymeKey is null or effectClass is INERT → skip
   b. If registry.has(token.rhymeKey) → skip (already assigned)
   c. Assign: hue = (slotIndex * 137.508) % 360   // golden angle
              registry.set(token.rhymeKey, hslToHex(hue, 72, 62))
              slotIndex++
3. Return registry
```

**Golden angle (137.508°):** The golden angle is derived from the golden ratio (φ). Spacing hues by this interval guarantees that no two adjacent slots share a visually similar hue regardless of how many slots are created. This is the same mechanism used by D3's categorical color scales and YouTube lyric renderers.

**Fixed saturation/lightness (72%, 62%):** High saturation, mid-high lightness produces vivid but not harsh colors on the dark parchment background. These values are tunable via constants.

### 5.2 School Modulation (Optional Phase 2)

In Phase 1, registry colors are pure golden-angle hues — school-agnostic. 

In Phase 2, modulate the hue to stay within 30° of the token's school anchor, creating school-tinted rhyme colors. This preserves school visual identity while adding rhyme identity on top.

```
schoolAnchorHue = SCHOOLS[token.school]?.colorHsl?.h ?? 0
baseHue = (slotIndex * 137.508) % 360
finalHue = schoolAnchorHue + ((baseHue % 60) - 30)  // ±30° from school anchor
```

Phase 1 ships without this. Phase 2 is additive.

### 5.3 `rhymeKey` Propagation Gap

`rhymeKey` exists on `VerseTokenIR` but is not included in `VisualBytecode`. The renderer (`bytecodeRenderer.js`) and the overlay (`ScrollEditor.jsx`) have no access to it.

**Fix:** Pass `rhymeKey` through as a field on the analysis object that `ScrollEditor.jsx` already reads. It does not need to enter `VisualBytecode` — it can travel as a parallel property on the token analysis object alongside `visualBytecode`.

---

## 6. Architecture

```
compileVerseToIR(scrollText)
        │
        ▼
VerseIR.tokens[].rhymeKey   ←── already exists
        │
        ▼
buildRhymeColorRegistry(tokens)          ← NEW: src/lib/truesight/color/rhymeColorRegistry.js
        │
        ▼
Map<rhymeKey, hexColor>                  ← verse-scoped, first-seen ordering
        │
        ▼
ScrollEditor.jsx                         ← consume registry, override color for rhyme tokens
        │
  For each token:
    if registry.has(token.rhymeKey)
      → use registry color (rhyme identity wins)
    else
      → use decoded?.color (PCA path, existing behavior)
```

---

## 7. Module Breakdown

### 7.1 Codex — New Module: `rhymeColorRegistry.js`

**File:** `src/lib/truesight/color/rhymeColorRegistry.js` *(new)*

**Exports:**

```js
/**
 * Build a verse-scoped rhyme color registry.
 * Assigns one hex color per unique rhymeKey, in order of first appearance.
 * Uses golden-angle hue spacing for maximum perceptual distinctiveness.
 *
 * @param {VerseTokenIR[]} tokens - All tokens from the current VerseIR
 * @returns {Map<string, string>} rhymeKey → hex color
 */
export function buildRhymeColorRegistry(tokens) { ... }

/**
 * Resolve the display color for a single token.
 * Registry color takes priority over PCA color for rhyme tokens.
 *
 * @param {string|null} rhymeKey
 * @param {Map<string, string>} registry
 * @param {string|null} pcaColor - fallback from visualBytecode.color
 * @returns {string|null}
 */
export function resolveTokenColor(rhymeKey, registry, pcaColor) { ... }

// Tunable constants (exported for testing)
export const REGISTRY_SATURATION = 72;   // %
export const REGISTRY_LIGHTNESS  = 62;   // %
export const GOLDEN_ANGLE_DEG    = 137.508;
```

**Implementation notes:**
- Pure function — no side effects, no imports from `codex/` backend
- Uses the same `hslToHex` already in `pcaChroma.js` — import from there, do not duplicate
- Skips tokens where `effectClass === 'INERT'` or `rhymeKey` is null
- First token in document order wins slot assignment for a given `rhymeKey`

### 7.2 Codex — Schema: Expose `rhymeKey` to Renderer

**File:** `codex/core/verseir-amplifier/plugins/phoneticColor.js`

The `VisualBytecode` produced here does not need a new field. Instead, ensure the analysis object that `ReadPage.jsx` normalizes (the `wordAnalyses` map) carries `rhymeKey` as a top-level property alongside `visualBytecode`. This field is already present on `VerseTokenIR` — it just needs to survive the normalization step into `wordAnalyses`.

**File:** `src/pages/Read/ReadPage.jsx` (lines ~355–425, the normalization block)

Confirm `rhymeKey` is passed through in the normalized word analysis object. It is already read for the tooltip (`rhymeKey: profile?.rhymeKey || null`) — verify the same field is present on the objects stored in `wordAnalyses` / `analyzedWordsByIdentity` that `ScrollEditor.jsx` receives.

### 7.3 UI — Wire Registry into ScrollEditor

**File:** `src/pages/Read/ScrollEditor.jsx`

When `isTruesight` is active and `analyzedWordsByIdentity` is populated:

1. **Build registry once per analysis update** (not per render):
```js
const rhymeRegistry = useMemo(() => {
  const tokens = Array.from(analyzedWordsByIdentity.values());
  return buildRhymeColorRegistry(tokens);
}, [analyzedWordsByIdentity]);
```

2. **Override color in the word render loop** (currently ~line 1053):
```js
const color = resolveTokenColor(analysis?.rhymeKey, rhymeRegistry, decoded?.color)
  || (vowelColorResolver && wordVowelFamily ? vowelColorResolver(wordVowelFamily, phase) : null)
  || (typeof familyData === 'string' ? familyData : familyData?.color)
  || null;
```

`resolveTokenColor` checks the registry first, falls back to `pcaColor` — existing behavior preserved for non-rhyme tokens.

### 7.4 Dependency on `color-byte-mapping.js`

The hash-to-hue logic in `resolveSchoolColor` (`color-byte-mapping.js`) is superseded by the golden-angle registry for rhyme coloring. No changes to `color-byte-mapping.js` are required. The registry is the authoritative color source for rhyme tokens; `color-byte-mapping.js` remains the authoritative source for PixelBrain bytecode palettes.

---

## 8. Implementation Phases

### Phase 1 — Core (Codex)
- [ ] Create `src/lib/truesight/color/rhymeColorRegistry.js` with `buildRhymeColorRegistry` and `resolveTokenColor`
- [ ] Verify `rhymeKey` survives normalization into `wordAnalyses` in `ReadPage.jsx`
- [ ] Update `SCHEMA_CONTRACT.md` to document `rhymeKey` as a required field on the word analysis object passed to ScrollEditor

### Phase 2 — UI Wire (Claude)
- [ ] Import `buildRhymeColorRegistry`, `resolveTokenColor` into `ScrollEditor.jsx`
- [ ] Add `useMemo` registry build on `analyzedWordsByIdentity`
- [ ] Replace `decoded?.color` priority line with `resolveTokenColor(...)` call
- [ ] Verify INERT tokens still render grey (no registry override)

### Phase 3 — QA (Minimax)
- [ ] Unit: `buildRhymeColorRegistry` assigns distinct colors to 12 unique rhymeKeys
- [ ] Unit: same `rhymeKey` always gets the same color within one registry build
- [ ] Unit: tokens with null `rhymeKey` not present in registry
- [ ] Unit: INERT tokens not assigned colors
- [ ] Visual regression: TrueSight overlay with known rhyme scheme (AABB, ABAB) — colors match structure
- [ ] Regression: non-rhyming words still use PCA color path

---

## 9. QA Requirements

| Test | Type | Pass Criteria |
|------|------|---------------|
| First-seen slot assignment | Unit | "NIGHT" appears before "LIGHT", both get slot-0 color |
| Golden-angle distinctness | Unit | Slots 0–11 produce 12 hues all >30° apart |
| Registry reuse | Unit | Second occurrence of rhymeKey returns identical hex |
| INERT skip | Unit | INERT tokens absent from registry output |
| Null rhymeKey skip | Unit | Tokens with null rhymeKey absent from registry |
| PCA fallback | Integration | Words with no rhymeKey still colored by PCA path |
| AABB scheme | Visual | 4-line AABB poem: lines 1+2 same color, lines 3+4 same color, different from 1+2 |
| ABAB scheme | Visual | Lines 1+3 share color, lines 2+4 share a different color |
| Multisyllabic rhymes | Visual | "DESIRE" and "FIRE" share a color when rhymeKey matches |

---

## 10. Success Criteria

1. A player can read the rhyme scheme of their verse from the TrueSight overlay without needing to count syllables
2. Recurring rhyme sounds create a visual "pattern" — the eye tracks the repetition
3. Non-rhyming words remain colored by phonemic character (PCA path) — the two systems coexist
4. No performance regression — registry builds in O(n) on token count, `useMemo` prevents per-render rebuilds
5. Works for AABB, ABAB, AAAA, and free verse (no scheme) — graceful in all cases

---

## 11. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `rhymeKey` not surviving normalization | Medium | High | Verify in ReadPage normalization block before wiring ScrollEditor |
| Golden-angle produces low-contrast colors for some slots | Low | Medium | Saturate to 72% minimum; lightness clamped 55–68% for parchment readability |
| Registry rebuild on every keystroke (perf) | Medium | Medium | `useMemo` on `analyzedWordsByIdentity` reference — only rebuilds on analysis tick |
| School color identity lost | Low | Low | Phase 1 uses pure golden angle; Phase 2 adds school modulation optionally |
| Slant rhymes with different `rhymeKey` not grouped | Low | Low | Known limitation of `rhymeKey` granularity — out of scope for this PDR |

---

## 12. World-Law Connection

In Scholomance, words are not decoration — they are spells. Rhyme is the resonance structure of the spell: sounds that recur create constructive interference, amplifying the cast.

TrueSight is the player seeing this resonance made visible. When NIGHT and LIGHT glow the same color, the player isn't reading a UI annotation — they're watching the acoustic structure of their spell light up. The color is not a label. It's the sound repeating, made visible.

The registry pattern maps perfectly to this world-law: the first rhyme group *earns* its color. The color doesn't exist until the rhyme does. When the sound recurs, the color recurs — because the resonance does.

---

## 13. File Manifest

| File | Action | Owner |
|------|--------|-------|
| `src/lib/truesight/color/rhymeColorRegistry.js` | **CREATE** | Codex |
| `src/pages/Read/ReadPage.jsx` | Verify `rhymeKey` in normalization | Codex |
| `SCHEMA_CONTRACT.md` | Add `rhymeKey` to word analysis contract | Codex |
| `src/pages/Read/ScrollEditor.jsx` | Wire registry, update color resolution | Claude |

---

*PDR Author: claude-ui*  
*Date: 2026-04-13*  
*Classification: Color Engine + Codex Contract + UI Wire*  
*Owner: Phase 1 → Codex / Phase 2 → Claude / Phase 3 → Minimax*
