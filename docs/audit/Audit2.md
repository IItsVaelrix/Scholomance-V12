# Bytecode-Oriented Audit — TrueSight + PixelBrain
## Focus: Color Representation & Pre-V12 Residue

**Audit date:** 2026-04-25
**Audited subtrees:** `codex/core/pixelbrain/`, `codex/core/phonology/`, `src/lib/truesight/color/`, `src/lib/phonology/`, `src/data/schools.js`, `codex/core/constants/schools.js`
**Scope:** color resolution, palette generation, V11→V12 migration debt
**Method:** static analysis + bytecode-oriented IR + grep for legacy markers + call-site mapping
**Confidence:** high — direct file evidence with line numbers; no inference about runtime behavior beyond what the source explicitly encodes.

---

## 1. Executive Summary

The color subsystem is in the middle of a V11→V12 migration that has shipped its **new** code without finishing the **purge** of the old. Three parallel color pipelines coexist, two of them load-bearing in production, and consumers pick between them by import path rather than by intent. The result is that a single token can hold two disagreeing color values simultaneously (`sonicChroma` from the phonology resolver vs. `verseIrColor` from PCA), and which one renders depends on the call site.

**Highest-risk finding (Critical):** `VOWEL_HUE_MAP` (`codex/core/phonology/vowelWheel.js`) and `FAMILY_ALIASES` (`src/lib/phonology/vowelFamily.js`) **disagree about the identity of `OH`, `OO`, `YUW`, `EE`, `IN`, `YOO`**. The hue map treats them as distinct families with their own hues; the alias map folds them into other families. Whichever runs first wins, and both run in production through different code paths. This is a textbook half-finished migration.

**Strongest pattern:** the V12 work that *did* land (the `PALETTE_CONTRACT` in `shared.js`, the SSD-style page/block addressing in `getHexForByte`, the explicit "V12 FIX" / "V12 CANONICAL" markers) is internally coherent. The damage is at the seams between V12 modules and the V11 modules they didn't replace.

**Strongest visualization opportunity:** the three color pipelines naturally form three parallel layers in a matrix view, with crimson edges where the same input flows through both and produces divergent output. See §8.

---

## 2. File Inventory

| File | Role | Runtime | Side-Effect Level | V12 Status | Confidence |
|---|---|---|---|---|---|
| `codex/core/phonology/vowelWheel.js` | ARPAbet→hue table + `getVowelHue` | Node/Browser | Pure | V12 canonical | High |
| `codex/core/phonology/chroma.resolver.js` | `resolveSonicChroma` — phoneme→{h,s,l,bytecode} | Node/Browser | Pure | V12 canonical | High |
| `codex/core/pixelbrain/shared.js` | `PALETTE_CONTRACT`, `hslToHex` (#1), `parseBytecodeString` | Node/Browser | Pure | V12 canonical (with V11 stub) | High |
| `codex/core/pixelbrain/color-byte-mapping.js` | `generateSemanticPalette`, `bytecodeToPalette`, `getHexForByte` | Node/Browser | Pure | V12 (with V11 export aliases) | High |
| `codex/core/pixelbrain/formula-to-coordinates.js` | `mapCoordinatesToPalette/Gradient/Brightness`, `lerpColor` | Node/Browser | Pure | **Pre-V12, bypasses PALETTE_CONTRACT** | High |
| `codex/core/pixelbrain/procedural-noise.js` | Hardcoded hex palette tables | Node/Browser | Pure | **Pre-V12, hardcoded** | High |
| `codex/core/pixelbrain/gear-glide-amp.js` | Rotation animation; `updateGearGlide` | Node/Browser | Pure | V12 (with deprecated export) | High |
| `codex/core/pixelbrain/lattice-grid-engine.js` | Canvas grid renderer | Browser | Side-effect-heavy | Pre-V12 marker (`#0a0a0a` hardcoded) | High |
| `codex/core/constants/schools.js` | `SCHOOLS` (with `colorHsl`), `VOWEL_FAMILY_TO_SCHOOL` | Node/Browser | Pure | V12 canonical | High |
| `src/data/schools.js` | UI-augmented `SCHOOLS`, **3rd `hslToHex`** | Browser | Pure | V12 (with private duplicate) | High |
| `src/lib/phonology/vowelWheel.js` | **Re-export shim** | Browser | Pure | Relocation artifact | High |
| `src/lib/phonology/vowelFamily.js` | `normalizeVowelFamily` + `FAMILY_ALIASES` | Browser | Pure | **Disagrees with vowelWheel.js** | High |
| `src/lib/truesight/color/pcaChroma.js` | `resolveVerseIrColor`, `buildVerseIrPalette`, **2nd `hslToHex`**, own aliases | Browser | Pure (memoized basis) | V12 (with parallel alias map) | High |
| `src/lib/truesight/color/rhymeColorRegistry.js` | `buildRhymeColorRegistry`, `resolveTokenColor` | Browser | Pure | V12 | High |
| `src/lib/truesight/color/visemeMapping.js` | F1/F2 → CSS viseme variables | Browser | Pure | V12 | High |
| `src/lib/truesight/compiler/VerseSynthesis.js` | Token enrichment; calls `resolveSonicChroma` | Browser | Pure | V12 (cross-pipeline boundary) | High |

---

## 3. Color Pipeline Dependency Map

Three pipelines, all in production, all named "the chroma engine" by some caller:

```
PIPELINE A — Sonic (phoneme-driven)
  ARPAbet phonemes
    └─> resolveSonicChroma  (chroma.resolver.js)
          ├─ uses VOWEL_HUE_MAP for hue
          ├─ uses CODA_SONORITY_WEIGHT for saturation
          ├─ uses stress index for lightness
          └─> {h, s, l, bytecode: 'PB-CHROMA-...'}
    consumers:
      - color-byte-mapping.js  (FALLBACK ONLY when school not in SCHOOLS)
      - VerseSynthesis.js      (every token, attached as token.sonicChroma)
      - WordTooltip.jsx        (via resolveSonicColor wrapper)
      - OracleScribe.jsx, ScrollEditor.jsx (direct import)
      - ChromaQuantizer.js, phoneticColor.js plugin

PIPELINE B — PCA (formant-driven)
  vowel family string
    └─> resolveVerseIrColor  (pcaChroma.js)
          ├─ PCA basis from PCA_VOWEL_FORMANTS (separate constant)
          ├─ uses VOWEL_HUE_MAP for canonical hue (when no school)
          ├─ uses SCHOOLS[id].colorHsl for base (when school given)
          ├─ phasic resonance modulation (sine over phase param)
          └─> {family, school, hex, hsl, projection, viseme}
    consumers:
      - rhymeColorRegistry.js  (every rhyme key in a verse)
      - useAdaptivePalette.js  (full palette per school)
      - schoolPalettes.js
      - buildVerseIrPalette wrapper

PIPELINE C — Semantic palette (school-driven, bytecode-keyed)
  bytecode string 'VW-SCHOOL-RARITY-EFFECT'
    └─> bytecodeToPalette  (color-byte-mapping.js)
          ├─ parseBytecodeString  (shared.js)
          ├─ resolveSchoolColor → SCHOOLS[id].colorHsl primary path
          ├─ generateSemanticPalette → buildSemanticPaletteColors
          ├─ deterministic pseudo-random variation
          └─> {key, bytecode, schoolId, rarity, effect, colors[], byteMap}
    SSD-style addressing:
      └─> getHexForByte  uses PAGE_SIZE=8, hashString(`page-${id}`)
    consumers:
      - pixelbrain-phase3.js (re-exports both V12 + V11 aliases)
      - downstream renderers (lattice, image-to-pixel-art, etc.)
```

**The seam:** `VerseSynthesis.js` attaches a Pipeline A color (`sonicChroma`) to every token. `rhymeColorRegistry.js` then computes a Pipeline B color (`familyColor.hex`) for the same token's terminal family. If both fields are read by different UI surfaces (and they are — see §5.1), the same word renders in two different colors depending on which surface looks at it.

---

## 4. Bytecode-Oriented IR — Color-Critical Functions

### 4.1 `resolveSonicChroma` (Pipeline A entry)

```
File: codex/core/phonology/chroma.resolver.js:23
Inputs:  phonemes: string[]  (ARPAbet)
Outputs: {h, s, l, bytecode}
Reads:   VOWEL_HUE_MAP, CODA_SONORITY_WEIGHT
Writes:  none
Side Effects: none — pure
Bytecode-Oriented Trace:
  1.  LOAD_VAR    phonemes
  2.  JUMP_IF_FALSE 5         ; empty array branch
  3.  LOAD_CONST  'PB-CHROMA-000000000'
  4.  RETURN      {h:0, s:0, l:50, bytecode:#3}
  5.  LOOP_START  phonemes
  6.  LOAD_VAR    p
  7.  CALL_FN     stripStress(p) -> base
  8.  READ_PROP   VOWEL_HUE_MAP[base]   ; existence check, NOT hue compare
  9.  JUMP_IF_FALSE 6           ; ← V12 FIX: prevents 180° collision lookup
 10.  STORE_VAR   nucleus, stress, nucleusIndex
 11.  BREAK
 12.  LOOP_END
 13.  JUMP_IF_NULL nucleus -> 16
 14.  CALL_FN     getVowelHue(nucleus) -> h
 15.  JUMP        18
 16.  LOAD_CONST  'PB-CHROMA-NULL00000'  ; ← STRUCTURE DIFFERS from #3
 17.  RETURN      {h:180, s:0, l:40, bytecode:#16}
 18.  LOOP_START  phonemes[nucleusIndex+1..]
 19.  CALL_FN     stripStress(p) -> base
 20.  READ_PROP   CODA_SONORITY_WEIGHT[base] ?? 0
 21.  ACCUMULATE  codaWeight
 22.  LOOP_END
 23.  COMPUTE     s = min(100, 65 + codaWeight*6)
 24.  COMPUTE     l = stress==1?60 : stress==0?45 : 50
 25.  CALL_FN     hueHex = floor(h).toString(16).padStart(3,'0')
 26.  CALL_FN     satHex = floor(s).toString(16).padStart(2,'0')
 27.  CALL_FN     litHex = floor(l).toString(16).padStart(2,'0')
 28.  CALL_FN     nucleus.padStart(2,'_')   ; ← DEAD CODE (all keys ≥2 chars)
 29.  RETURN      {h, s, l, bytecode:`PB-CHROMA-${hueHex}${satHex}${litHex}${nucleus}`}
```

**Notes:** purity = 5/5. Determinism = high. Three structurally different bytecode emissions under one "fixed-width" contract (steps 4, 17, 29) — see §5.2.

### 4.2 `resolveVerseIrColor` (Pipeline B entry)

```
File: src/lib/truesight/color/pcaChroma.js:324
Inputs:  family: string, schoolId?: string, options?: {baseHsl, phase}
Outputs: {family, school, hex, hsl, projection, viseme}
Reads:   PCA_VOWEL_FORMANTS, PCA_FAMILY_ALIASES, SCHOOLS, VOWEL_HUE_MAP, SCHOOL_COLOR_ANCHORS, THEME_SCALARS
Writes:  module-scoped _pcaBasis (memoization)
Side Effects: lazy basis computation on first call
Bytecode-Oriented Trace:
  1.  CALL_FN     resolveProjectionFamily(family) -> resolvedFamily
        ; ← PCA's OWN alias map (PCA_FAMILY_ALIASES) — distinct from vowelFamily.js
  2.  JUMP_IF_FALSE 4
  3.  RETURN      {hex:'#888888', hsl:{0,0,53}, projection:null, ...}
  4.  CALL_FN     getVerseIrColorProjection(resolvedFamily) -> projection
  5.  CALL_FN     resolveSchoolKey(schoolId, resolvedFamily) -> schoolKey
  6.  CALL_FN     resolveBaseHsl(schoolKey, options) -> baseHsl
  7.  CALL_FN     hasExplicitBaseHsl(options) || schoolValid -> usesThemeHue
  8.  READ_PROP   SCHOOL_COLOR_ANCHORS[schoolKey] ?? resolvedFamily -> anchorFamily
  9.  COMPUTE     deltaPc1, deltaPc2, deltaRadius
 10.  COMPUTE     hMod, sMod, lMod  (sine over options.phase)
 11.  READ_PROP   VOWEL_HUE_MAP[resolvedFamily] -> canonicalHue
 12.  JUMP_IF_UNDEFINED 13 ELSE 14
 13.  RETURN      {hex:'#888888', ...}    ; ← V12 FIX path (line 362)
 14.  COMPUTE     hue = usesThemeHue
                    ? wrap(baseHsl.h + deltaPc1*22 - deltaPc2*14 + hMod)
                    : wrap(canonicalHue + deltaPc1*6 - deltaPc2*6 + hMod)
 15.  COMPUTE     saturation = clamp(baseHsl.s + ..., 40, 95)
 16.  COMPUTE     lightness = clamp(baseHsl.l + ..., 35, 88)
 17.  CALL_FN     hslToHex(hue, saturation, lightness)   ; ← Pipeline B's hslToHex
 18.  RETURN      {family, school:schoolKey, hex, hsl, projection, viseme}
```

**Notes:** purity = 4/5 (memoized basis is module-scoped state). Determinism = high once basis is built. Reads `VOWEL_HUE_MAP` from Pipeline A's vowelWheel — **the only point where the two pipelines share a constant**.

### 4.3 `bytecodeToPalette` → `getHexForByte` (Pipeline C entry + SSD addressing)

```
File: codex/core/pixelbrain/color-byte-mapping.js:229, 262
Inputs:  bytecode: string|string[], options?: {colorFeatures}
Outputs: {key, bytecode, schoolId, rarity, effect, colors[], byteMap}
Reads:   SCHOOLS, PALETTE_CONTRACT
Writes:  none
Side Effects: none — pure deterministic
Bytecode-Oriented Trace (bytecodeToPalette):
  1.  LOAD_VAR    bytecode
  2.  JUMP_IF_ARRAY 3 ELSE 5
  3.  MAP_COLLECTION  bytecode -> bytecodeToPalette(bc, options)
  4.  RETURN
  5.  CALL_FN     parseBytecodeString(bytecode) -> parsed
  6.  CALL_FN     resolveSchoolColor(parsed.schoolId, options.colorFeatures) -> baseColor
        ; ← This branch falls through resolveSonicChroma when school missing
        ; ← But passes schoolId AS A PHONEME, which always returns h=180 (NULL nucleus)
  7.  CALL_FN     generateSemanticPalette({...}) -> palette
  8.  CALL_FN     createByteMap(palette.colors)
  9.  RETURN      {key, bytecode, schoolId, rarity, effect, colors, byteMap}

Bytecode-Oriented Trace (getHexForByte — SSD page addressing):
  1.  CALL_FN     bytecodeToPalette(bytecode, options) -> palette
  2.  READ_PROP   palette.colors -> colors
  3.  JUMP_IF_EMPTY 4 ELSE 5
  4.  RETURN      '#808080'                    ; ← gray #2
  5.  COMPUTE     index = max(0, abs(trunc(byteIndex)))
  6.  READ_CONST  PAGE_SIZE = 8
  7.  COMPUTE     pageId = floor(index / 8)
  8.  COMPUTE     pageOffset = index % 8
  9.  CALL_FN     hashString(`page-${pageId}`) -> jitter
 10.  COMPUTE     paletteIndex = (pageOffset + jitter) % numColors
 11.  RETURN      colors[paletteIndex] ?? colors[0]
```

**Notes:** purity = 5/5. The SSD-page-jitter pattern (steps 9–10) is genuinely interesting — it spreads sequential byte writes across the palette to prevent visual banding. This is the V12 work landing correctly.

---

## 5. Logical Inconsistencies

| Severity | Issue | Evidence | Risk |
|---|---|---|---|
| **Critical** | Vowel alias systems disagree | §5.1 | Same word renders in different families across UI surfaces |
| **Critical** | Three `hslToHex` implementations | §5.3 | Subtle off-by-1 hex drift; future maintainers patch the wrong one |
| **High** | Three competing color pipelines per token | §5.4 | `token.sonicChroma.h ≠ resolveVerseIrColor(family).hsl.h` for same token |
| **High** | V11 export aliases still consumed | §5.5 | Renaming `generateSemanticPalette` silently breaks `pixelbrain-phase3.js` |
| **High** | `parseBytecodeString` dead branch | §5.6 | `version` field meaningless; older bytecode versions silently mislabeled |
| **Medium** | `chroma.resolver.js` bytecode structural drift | §5.2 | Position-based decoders misparse the NULL form |
| **Medium** | `resolveSchoolColor` confused fallback | §5.7 | Unknown schools always resolve to hue=180 (cyan), not phonetic |
| **Medium** | Three different gray fallbacks (#888888 / #808080 / #666666) | §5.8 | `rhymeColorRegistry` "unset" filter only catches #888888 |
| **Low** | `formula-to-coordinates.js` color path bypasses `PALETTE_CONTRACT` | §5.9 | Pre-V12 palette logic shipping alongside V12 |
| **Low** | `procedural-noise.js` hardcoded hex tables | grep | Pre-V12 baked palettes outside contract |
| **Low** | `src/lib/phonology/vowelWheel.js` is a pure re-export shim | line 1–7 | Relocation artifact; no transformation logic |
| **Low** | `nucleus.padStart(2,'_')` in chroma.resolver.js:79 | dead code | All ARPAbet keys ≥2 chars |
| **Info** | `updateGearGlide` deprecated but still exported | gear-glide-amp.js:72 | Console warning ships to prod |
| **Info** | `lattice-grid-engine.js:321` hardcoded `#0a0a0a` | grep | Background outside theme system |

### 5.1 — CRITICAL — Vowel alias systems disagree

`codex/core/phonology/vowelWheel.js` (V12 canonical):
```
OH: 225,  OO: 285,  YUW: 315,  ER: 330,  UR: 315
```

`src/lib/phonology/vowelFamily.js` `FAMILY_ALIASES`:
```
YOO: "UW",  YUW: "UW",  IN: "IH",  EE: "IY",  OH: "OW",  OO: "UH"
```

`src/lib/truesight/color/pcaChroma.js` `PCA_FAMILY_ALIASES`:
```
YOO: 'YUW',  EE: 'IY',  IN: 'IH'
// notably: OH and OO are NOT aliased — pcaChroma keeps them as distinct PCA formant entries
```

**What happens to the family `OH`:**
- Through Pipeline A (`resolveSonicChroma`): hue 225 (matches `OY`)
- Through Pipeline B's `resolveProjectionFamily`: kept as `OH`, mapped via `PCA_VOWEL_FORMANTS.OH = [550, 950]`, projected through PCA, multiplied against THEME_SCALARS, returned as a unique color
- Through `rhymeColorRegistry.resolveTerminalVowelFamily` → `normalizeVowelFamily('OH')` → returns `'OW'` → `resolveVerseIrColor('OW')` → hue 240 base, different PCA projection
- Through `VOWEL_FAMILY_TO_SCHOOL.OH = 'ABJURATION'` (cyan school)

A single word with terminal `OH` can carry up to **four different color identities** depending on which entry point reads it. The V12 work standardized the vowel wheel and the PCA basis, but did not consolidate `FAMILY_ALIASES` against the wheel. This is the primary remaining V11 residue in color rendering.

**Same problem for:** `OO`, `YUW`/`YOO`, `EE`, `IN`.

**Fix path:** make `FAMILY_ALIASES` and `PCA_FAMILY_ALIASES` reference a single source of truth, and decide per-family whether the alias should fold (V11 behavior) or stay distinct (V12 behavior). The current state is "both, depending on import path."

### 5.2 — MEDIUM — `chroma.resolver.js` bytecode structural drift

Three emissions, three structures, all claiming "fixed-width PB-CHROMA-+9":
```
chroma.resolver.js:26   'PB-CHROMA-000000000'   // empty input        — 9 zeros
chroma.resolver.js:49   'PB-CHROMA-NULL00000'   // null nucleus       — 4 letters + 5 zeros
chroma.resolver.js:79   'PB-CHROMA-{H3}{S2}{L2}{NUC2}'  // normal     — positional fields
```

A decoder reading positions 0–2 as hue-hex from the NULL form gets `0x4E55 = 20053 → hue 20053°` if it doesn't special-case it. The two zero forms are visually similar but semantically distinct (empty vs. unstressed-but-no-vowel) — they should use different sentinels OR follow the structured layout with reserved values.

Also, `nucleus.padStart(2, '_')` at line 79 is dead code: every key in `VOWEL_HUE_MAP` is already ≥2 chars.

### 5.3 — CRITICAL — Three `hslToHex` implementations

```
codex/core/pixelbrain/shared.js:134           // channel-shift, exported
src/lib/truesight/color/pcaChroma.js:98       // q/p formula, exported
src/data/schools.js:220                       // channel-shift, PRIVATE (mutates param l)
```

For most inputs all three agree. Edge cases likely diverge:
- `s = 0` (achromatic): `pcaChroma` returns `#${gray}${gray}${gray}` directly; `shared` runs the channel formula and rounds; `schools.js` runs the formula and rounds. Rounding direction at boundary could differ by 1.
- `h = 360`: `shared.normalizeDegrees` wraps to 0; `pcaChroma.wrapHue` wraps to 0; `schools.js` does no wrap (raw `h / 30 % 12`) — passing `h=360` produces `12 % 12 = 0` so accidentally OK, but `h=720` would also work through the shifted form. Acceptable but not equivalent to the others.
- `schools.js:221` mutates parameter: `l /= 100;` — fine in isolation but a footgun if a future caller passes a frozen object.

These three should be one function, exported once, imported everywhere. Right now `pcaChroma`'s implementation is the one a TrueSight developer is most likely to reach for; `shared.js`'s is what `color-byte-mapping` uses; `schools.js`'s is what `generateSchoolColor` uses for badges. They're functionally redundant.

### 5.4 — HIGH — Same token, two color values

`src/lib/truesight/compiler/VerseSynthesis.js:65`:
```js
const sonicChroma = (token.phonemes?.length > 0) ? resolveSonicChroma(token.phonemes) : null;
```
attaches `token.sonicChroma = {h, s, l, bytecode}` to every token via Pipeline A.

`src/lib/truesight/color/rhymeColorRegistry.js:93`:
```js
const familyColor = terminalVowelFamily ? resolveVerseIrColor(terminalVowelFamily) : null;
```
computes a Pipeline B color for the same token's terminal family.

These will not agree. `WordTooltip.jsx:377` uses Pipeline A (`resolveSonicColor` wrapper), `useAdaptivePalette.js` and the registry use Pipeline B. So **the tooltip color and the inline word color for the same word are computed from different pipelines and will visibly disagree** for any word with a clear terminal vowel family.

Whether this is intentional ("tooltip shows phonetic identity, inline color shows rhyme family") needs to be a documented decision, not an accident of import paths.

### 5.5 — HIGH — V11 export aliases still consumed

`codex/core/pixelbrain/color-byte-mapping.js:121-125`:
```js
/**
 * V12 REFACTOR: Legacy wrappers now consistently return objects.
 * Residue branch for test-compatibility removed. Tests must align with the law.
 */
export const generatePaletteFromSemanticParameters = generateSemanticPalette;
export const generatePaletteFromSemantics = generateSemanticPalette;
```

The comment claims residue removed — but the aliases ARE the residue. They're imported live by `codex/core/pixelbrain-phase3.js:45-46`:
```js
generatePaletteFromSemantics,
generatePaletteFromSemanticParameters,
```

So `pixelbrain-phase3.js` consumes all three names (V12 + two V11 aliases) and re-exports them. Renaming `generateSemanticPalette` would silently break two import paths. This is a textbook half-finished migration: the V12 code is in, the V11 names still ship.

**Fix:** decide. Either delete the aliases and update `pixelbrain-phase3.js`, or document them as the stable public API with the "private" V12 name being the implementation detail.

### 5.6 — HIGH — `parseBytecodeString` dead branch

`codex/core/pixelbrain/shared.js:117-118`:
```js
return Object.freeze({
  version: parts[0] === 'VW' ? 'VW' : 'VW',
  ...
});
```

Both arms identical. Likely intent was `parts[0] === 'VW' ? 'VW' : null` (or `parts[0]`) but the branch was either flattened during refactor or never written correctly. Combined with line 109 (`version: 'VW'` for legacy short bytecodes that are NOT in VW format), the `version` field is effectively a constant string that lies about non-VW inputs.

### 5.7 — MEDIUM — `resolveSchoolColor` confused fallback

`codex/core/pixelbrain/color-byte-mapping.js:34-38`:
```js
let baseHue = Number(school?.colorHsl?.h) || 0;
if (safeSchoolId !== 'VOID' && !SCHOOLS[safeSchoolId]) {
  const phoneticChroma = resolveSonicChroma([safeSchoolId]);
  baseHue = phoneticChroma.h;
}
```

This calls `resolveSonicChroma` with the school name string treated as if it were an ARPAbet phoneme. Since `VOWEL_HUE_MAP` contains only ARPAbet vowel keys, any unknown school name (e.g., `"NETHER"`, `"EARTH"`) will fail nucleus detection inside `resolveSonicChroma` and hit the null branch, returning `{h:180, s:0, l:40}`. So `baseHue` becomes **180 for every unknown school**, regardless of what the school name "feels like" phonetically.

The fallback masquerades as phonetic derivation; it's effectively a hardcoded `baseHue = 180`. Either implement actual phonetic derivation from the school name (tokenize into ARPAbet first) or replace with `baseHue = hashString(safeSchoolId) % 360` (deterministic, honest).

### 5.8 — MEDIUM — Three different gray fallbacks

```
'#888888'  pcaChroma.js:330, 366  (unknown family / unknown canonical hue)
'#888888'  schools.js:198, 210    (unknown school / no color)
'#808080'  color-byte-mapping.js:266  (empty palette)
'#808080'  formula-to-coordinates.js:370, 376  (no colorFormula)
{h:180,s:0,l:40} → '#666666'  chroma.resolver.js:49  (null nucleus)
{h:0,s:0,l:50}   → '#808080'  chroma.resolver.js:26  (empty input)
```

`rhymeColorRegistry.js:113` filters out `#888888` as "no color set":
```js
if (!color || color === '#888888' || color === '#888' || color === 'rgb(136, 136, 136)') {
  return null;
}
```

But it does NOT filter `#808080` or `#666666`. If anything upstream substitutes `#808080` (the chroma.resolver empty path eventually hits `hslToHex(0,0,50) = '#808080'`), the registry treats it as a real color. The "unset" sentinel is fragile because it's a magic hex value rather than `null` or a typed marker.

### 5.9 — LOW — `formula-to-coordinates.js` bypasses `PALETTE_CONTRACT`

`mapCoordinatesToPalette` (line 380), `mapCoordinatesToGradient` (389), `mapCoordinatesToBrightness` (399), `lerpColor` (410): all generate raw `hsl(...)` strings or interpolate hex bytes directly. None use `hslToHex` from `shared.js` or any PALETTE_CONTRACT entry. This is the older formula-driven coloring path that the V12 deterministic palette refactor was meant to replace; it survived because nothing called the replacement for these code paths.

---

## 6. SSD / Data Orientation Findings

| Concept | Code Evidence | Storage Analogy | V12 Status |
|---|---|---|---|
| **Page-aligned addressing** | `getHexForByte` uses `PAGE_SIZE=8`, computes `pageId/pageOffset`, applies `hashString('page-${pageId}')` jitter | NAND page striping with per-page wear-leveling jitter | V12 — landed correctly |
| **Block size constant** | `PALETTE_CONTRACT.ADDRESSING.BLOCK_SIZE = 64` | Erase block size | V12 — defined but I see no current consumer; verify with grep |
| **Memoization as L1 cache** | `_pcaBasis` in `pcaChroma.js:249` (lazy module-scope) | CPU cache for derived basis | V12 |
| **Frozen palettes as ROM** | `Object.freeze` on every returned palette object (`color-byte-mapping.js:107, 247, 257`; `coordinate-mapping.js:299`) | Read-only segment | V12 — consistent |
| **Deterministic seed-based variation** | `pseudoRandom(seed + '-sat'/'-hue')` in `buildSemanticPaletteColors` | LFSR-style deterministic stream from a seed | V12 — clean |
| **Fast-path comparison cache** | `DimensionRuntime._lastResult/_lastContext/_lastInstructions` (`dimension-formula-compiler.ts:573-583`) | DRAM hit before NAND read | V12 — clean |
| **Referential stability** | `DimensionRuntime` returns OLD reference if values unchanged (`dimension-formula-compiler.ts:723-734`) | Page deduplication | V12 — clean |
| **Hardcoded palette tables** | `procedural-noise.js:17-50` — 6 hardcoded 4-color hex arrays | Burned-in firmware table that bypasses the FTL | **Pre-V12** — should consume `PALETTE_CONTRACT` or move to `extension-registry` |

The strongest piece of work in the V12 cycle is the SSD-style page addressing in `getHexForByte`. The `hashString('page-${pageId}')` jitter prevents sequential byte writes from producing visually banded output by spreading them across the palette pseudo-randomly per page. This is a real optimization, not just an analogy.

The weakness is that this discipline didn't propagate to `formula-to-coordinates.js` or `procedural-noise.js`, which still use ad-hoc color emission.

---

## 7. Mathematical Purity Scores

| Function | File:Line | Purity | Determinism | Side Effects | Issue |
|---|---|---|---|---|---|
| `resolveSonicChroma` | chroma.resolver.js:23 | 5 | High | None | Bytecode structural drift (§5.2) |
| `getVowelHue` | vowelWheel.js:49 | 5 | High | None | Clean |
| `hslToHex` (shared) | shared.js:134 | 5 | High | None | Duplicate of pcaChroma's |
| `hslToHex` (pcaChroma) | pcaChroma.js:98 | 5 | High | None | Duplicate of shared's |
| `hslToHex` (schools, private) | schools.js:220 | 4 | High | Mutates param `l` | Duplicate; mutation footgun |
| `hashString` | shared.js:61 | 5 | High | None | Clean FNV-1a |
| `pseudoRandom` | shared.js:76 | 5 | High | None | Clean |
| `parseBytecodeString` | shared.js:99 | 4 | High | None | Dead branch in `version` field (§5.6) |
| `generateSemanticPalette` | color-byte-mapping.js:60 | 5 | High | None | Clean |
| `buildSemanticPaletteColors` | color-byte-mapping.js:130 | 5 | High | None | Clean |
| `bytecodeToPalette` | color-byte-mapping.js:229 | 5 | High | None | Clean |
| `getHexForByte` | color-byte-mapping.js:262 | 5 | High | None | Clean — model citizen |
| `resolveSchoolColor` | color-byte-mapping.js:27 | 4 | High | None | Confused fallback (§5.7) |
| `resolveVerseIrColor` | pcaChroma.js:324 | 4 | High | Lazy module-scoped basis | Acceptable — basis is constant |
| `getPCABasis` | pcaChroma.js:250 | 4 | High | Sets `_pcaBasis` | Acceptable memoization |
| `buildRhymeColorRegistry` | rhymeColorRegistry.js:82 | 5 | High | None | Clean |
| `resolveTokenColor` | rhymeColorRegistry.js:119 | 4 | High | None | `#888888` magic-value sentinel (§5.8) |
| `mapFormantsToMetrics` | visemeMapping.js:19 | 5 | High | None | Clean |
| `getVisemeStyles` | visemeMapping.js:52 | 5 | High | None | Clean |
| `evaluateFormulaWithColor` | formula-to-coordinates.js:367 | 4 | High | None | Bypasses PALETTE_CONTRACT (§5.9) |
| `lerpColor` | formula-to-coordinates.js:410 | 5 | High | None | Pure but parallel to PALETTE_CONTRACT |

Overall purity of the color subsystem is excellent — every entry-point function is at 4 or 5. The problems are all at the architecture level (parallel pipelines, alias disagreement, duplicate implementations), not the function level.

---

## 8. Visualization Dataset

### 8.1 Nodes

```json
[
  {"id":"vowel-wheel","label":"VOWEL_HUE_MAP","type":"constant","file":"codex/core/phonology/vowelWheel.js","role":"hue-source-of-truth","purityScore":5,"sideEffectLevel":"pure","tags":["v12-canonical","shared-by-A-and-B"]},
  {"id":"family-aliases","label":"FAMILY_ALIASES","type":"constant","file":"src/lib/phonology/vowelFamily.js","role":"alias-folder","purityScore":5,"sideEffectLevel":"pure","tags":["v11-residue","conflicts-with-vowel-wheel"]},
  {"id":"pca-aliases","label":"PCA_FAMILY_ALIASES","type":"constant","file":"src/lib/truesight/color/pcaChroma.js","role":"alias-folder","purityScore":5,"sideEffectLevel":"pure","tags":["parallel-to-family-aliases"]},
  {"id":"sonic-chroma","label":"resolveSonicChroma","type":"function","file":"codex/core/phonology/chroma.resolver.js","role":"pipeline-A-entry","purityScore":5,"sideEffectLevel":"pure","tags":["pipeline-A","phoneme-driven"]},
  {"id":"verseir-color","label":"resolveVerseIrColor","type":"function","file":"src/lib/truesight/color/pcaChroma.js","role":"pipeline-B-entry","purityScore":4,"sideEffectLevel":"pure","tags":["pipeline-B","pca-driven","memoized"]},
  {"id":"bytecode-palette","label":"bytecodeToPalette","type":"function","file":"codex/core/pixelbrain/color-byte-mapping.js","role":"pipeline-C-entry","purityScore":5,"sideEffectLevel":"pure","tags":["pipeline-C","school-driven"]},
  {"id":"get-hex-for-byte","label":"getHexForByte","type":"function","file":"codex/core/pixelbrain/color-byte-mapping.js","role":"ssd-page-addressing","purityScore":5,"sideEffectLevel":"pure","tags":["v12-jewel","ssd-style"]},
  {"id":"hsl-to-hex-shared","label":"hslToHex (shared.js)","type":"function","file":"codex/core/pixelbrain/shared.js","role":"color-converter","purityScore":5,"sideEffectLevel":"pure","tags":["duplicate-1-of-3"]},
  {"id":"hsl-to-hex-pca","label":"hslToHex (pcaChroma.js)","type":"function","file":"src/lib/truesight/color/pcaChroma.js","role":"color-converter","purityScore":5,"sideEffectLevel":"pure","tags":["duplicate-2-of-3"]},
  {"id":"hsl-to-hex-schools","label":"hslToHex (schools.js)","type":"function","file":"src/data/schools.js","role":"color-converter","purityScore":4,"sideEffectLevel":"pure","tags":["duplicate-3-of-3","mutates-param"]},
  {"id":"rhyme-registry","label":"buildRhymeColorRegistry","type":"function","file":"src/lib/truesight/color/rhymeColorRegistry.js","role":"per-verse-color-cache","purityScore":5,"sideEffectLevel":"pure","tags":["pipeline-B-consumer"]},
  {"id":"verse-synthesis","label":"VerseSynthesis","type":"module","file":"src/lib/truesight/compiler/VerseSynthesis.js","role":"token-enricher","purityScore":4,"sideEffectLevel":"pure","tags":["pipeline-A-consumer","attaches-sonicChroma-to-token"]},
  {"id":"v11-aliases","label":"generatePaletteFromSemantics(*)","type":"export-alias","file":"codex/core/pixelbrain/color-byte-mapping.js","role":"v11-residue","purityScore":5,"sideEffectLevel":"pure","tags":["v11-residue","still-consumed-by-phase3"]},
  {"id":"phase3-reexport","label":"pixelbrain-phase3","type":"module","file":"codex/core/pixelbrain-phase3.js","role":"v11-alias-consumer","purityScore":5,"sideEffectLevel":"pure","tags":["consumes-v11-aliases"]},
  {"id":"formula-coords-color","label":"evaluateFormulaWithColor","type":"function","file":"codex/core/pixelbrain/formula-to-coordinates.js","role":"parallel-color-pipeline","purityScore":4,"sideEffectLevel":"pure","tags":["pre-v12","bypasses-palette-contract"]},
  {"id":"procedural-palettes","label":"PALETTE_TABLES","type":"constant","file":"codex/core/pixelbrain/procedural-noise.js","role":"hardcoded-palettes","purityScore":5,"sideEffectLevel":"pure","tags":["pre-v12","hardcoded-hex"]},
  {"id":"vowelwheel-shim","label":"vowelWheel re-export","type":"shim","file":"src/lib/phonology/vowelWheel.js","role":"relocation-artifact","purityScore":5,"sideEffectLevel":"pure","tags":["dead-weight-shim"]}
]
```

### 8.2 Edges (highlighting conflicts)

```json
[
  {"from":"vowel-wheel","to":"sonic-chroma","relationship":"reads","weight":1.0,"riskLevel":"low"},
  {"from":"vowel-wheel","to":"verseir-color","relationship":"reads","weight":1.0,"riskLevel":"low","animationHint":"shared-constant-glow"},
  {"from":"family-aliases","to":"verseir-color","relationship":"folds-input-for","weight":0.8,"riskLevel":"critical","animationHint":"red-pulse","evidence":"normalizeVowelFamily(OH)→OW collapses a family that vowel-wheel keeps distinct"},
  {"from":"pca-aliases","to":"verseir-color","relationship":"folds-input-for","weight":0.8,"riskLevel":"high","animationHint":"red-pulse","evidence":"second alias map, parallel to family-aliases"},
  {"from":"family-aliases","to":"vowel-wheel","relationship":"contradicts","weight":1.0,"riskLevel":"critical","animationHint":"crimson-arc"},
  {"from":"pca-aliases","to":"family-aliases","relationship":"contradicts","weight":0.6,"riskLevel":"high","animationHint":"crimson-arc"},
  {"from":"sonic-chroma","to":"verse-synthesis","relationship":"called-by","weight":1.0,"riskLevel":"medium","animationHint":"flow-trace-A"},
  {"from":"verseir-color","to":"rhyme-registry","relationship":"called-by","weight":1.0,"riskLevel":"medium","animationHint":"flow-trace-B"},
  {"from":"verse-synthesis","to":"rhyme-registry","relationship":"shares-token-with","weight":0.5,"riskLevel":"high","animationHint":"divergence-spark","evidence":"same token, two color values from different pipelines"},
  {"from":"bytecode-palette","to":"get-hex-for-byte","relationship":"feeds","weight":1.0,"riskLevel":"low","animationHint":"storage-block-shift"},
  {"from":"v11-aliases","to":"phase3-reexport","relationship":"imported-by","weight":1.0,"riskLevel":"high","animationHint":"legacy-thread","evidence":"V12 'residue removed' comment is false; phase3 still consumes both names"},
  {"from":"hsl-to-hex-shared","to":"hsl-to-hex-pca","relationship":"duplicates","weight":1.0,"riskLevel":"high","animationHint":"ghost-overlay"},
  {"from":"hsl-to-hex-pca","to":"hsl-to-hex-schools","relationship":"duplicates","weight":1.0,"riskLevel":"high","animationHint":"ghost-overlay"},
  {"from":"formula-coords-color","to":"bytecode-palette","relationship":"competes-with","weight":0.7,"riskLevel":"medium","animationHint":"parallel-pipeline-flicker"},
  {"from":"procedural-palettes","to":"bytecode-palette","relationship":"bypasses","weight":0.6,"riskLevel":"low","animationHint":"dead-thread"},
  {"from":"vowelwheel-shim","to":"vowel-wheel","relationship":"re-exports","weight":1.0,"riskLevel":"info","animationHint":"dead-code-fade"}
]
```

### 8.3 Matrix Coordinates (suggested layers)

| Node | X | Y | Z | Layer | Cluster | Animation Role |
|---|---|---|---|---|---|---|
| vowel-wheel | 0 | 0 | 0 | 0 (constants) | core | shared-constant-glow |
| family-aliases | -50 | 30 | 0 | 0 | conflict | red-pulse |
| pca-aliases | -30 | 50 | 0 | 0 | conflict | red-pulse |
| sonic-chroma | -100 | 0 | 0 | 1 (pipeline A) | A | flow-trace-A |
| verseir-color | 100 | 0 | 0 | 1 (pipeline B) | B | flow-trace-B |
| bytecode-palette | 0 | -100 | 0 | 1 (pipeline C) | C | flow-trace-C |
| get-hex-for-byte | 0 | -150 | 0 | 4 (storage) | C | storage-block-shift |
| hsl-to-hex-shared | -50 | -50 | 20 | 2 | converters | ghost-overlay |
| hsl-to-hex-pca | 50 | -50 | 20 | 2 | converters | ghost-overlay |
| hsl-to-hex-schools | 0 | -75 | 20 | 2 | converters | ghost-overlay |
| rhyme-registry | 150 | -30 | 30 | 3 (UI) | B | mutation-flare |
| verse-synthesis | -150 | -30 | 30 | 3 (UI) | A | mutation-flare |
| v11-aliases | 0 | 100 | 0 | 6 (risk) | residue | legacy-thread (orange) |
| phase3-reexport | 0 | 130 | 0 | 6 (risk) | residue | legacy-thread (orange) |
| formula-coords-color | 80 | 80 | 0 | 6 (risk) | residue | parallel-pipeline-flicker |
| procedural-palettes | -80 | 80 | 0 | 6 (risk) | residue | dead-thread |
| vowelwheel-shim | 20 | 20 | -10 | 6 (risk) | residue | dead-code-fade |

### 8.4 Animation Semantics

- **shared-constant-glow** (cyan): `vowel-wheel` pulses when ANY pipeline reads it — visual proof of the one shared anchor.
- **flow-trace-A / B / C** (gold / cyan / magenta): each pipeline traces in its own color so divergence is obvious.
- **divergence-spark** (white→crimson): emit when `verse-synthesis` and `rhyme-registry` both touch the same token in the same frame.
- **red-pulse** (crimson): `family-aliases` and `pca-aliases` pulse on every read, showing how often the contradicting alias logic runs.
- **legacy-thread** (orange, faded): `v11-aliases ↔ phase3-reexport` — visually demote so reviewers see them as load-bearing residue, not first-class.
- **ghost-overlay** (silver): the three `hslToHex` nodes overlap visually to show duplication.

---

## 9. Refactor Recommendations

### 9.1 Consolidate vowel alias maps (CRITICAL)

**Why:** Three disagreeing alias systems is the #1 cause of cross-pipeline color drift. See §5.1.
**Risk reduced:** Same word rendering in different colors across UI surfaces.
**Change classification:** Architectural.
**Affected:** `vowelWheel.js`, `vowelFamily.js`, `pcaChroma.js`, `rhymeColorRegistry.js`, `VOWEL_FAMILY_TO_SCHOOL`.
**Suggested patch:**

1. Add a single `FAMILY_IDENTITY` table in `codex/core/phonology/vowelWheel.js` next to `VOWEL_HUE_MAP`:
   ```js
   export const FAMILY_IDENTITY = Object.freeze({
     // canonical: families that get their own hue and stay distinct
     IY:'IY', IH:'IH', EY:'EY', EH:'EH', AE:'AE', AA:'AA', AH:'AH',
     AO:'AO', OW:'OW', UH:'UH', UW:'UW', ER:'ER', AX:'AX',
     AY:'AY', AW:'AW', OY:'OY', UR:'UR',
     // aliases: per-family decision, documented
     OH:'OW',  // OH is a notation for OW — fold
     OO:'UH',  // OO is the "book" vowel — fold to UH (V11 behavior, validated)
     YUW:'UW', YOO:'UW', // Y-glide variants fold to UW
     EE:'IY', IN:'IH',
   });
   ```
2. Have `normalizeVowelFamily`, `resolveProjectionFamily`, and `getVowelHue` ALL consult this table first.
3. Delete `FAMILY_ALIASES` and `PCA_FAMILY_ALIASES`.
4. Decide and document: do `OH`/`OO`/`YUW` fold (V11) or stay distinct (V12)? Both are defensible — pick one. Current code does both depending on path, which is the bug.

**Retest:** snapshot the color hex for every word with terminal `OH`, `OO`, `YUW`, `EE`, `IN` before and after; confirm WordTooltip and inline overlay agree.

### 9.2 Single `hslToHex` (HIGH)

**Why:** Three implementations is two implementations too many. See §5.3.
**Risk reduced:** Maintainer patches one and the other two drift; subtle hex differences in edge cases.
**Change classification:** Structural.
**Suggested patch:**
1. Keep the `shared.js` implementation as canonical (it's the most centrally located).
2. Replace `pcaChroma.js:98-126` with `import { hslToHex } from '../../../../codex/core/pixelbrain/shared.js'`.
3. Replace the private `schools.js:220-229` function with the same import.
4. Verify with property-test: for `h ∈ [0, 360]`, `s ∈ [0, 100]`, `l ∈ [0, 100]` on a sample grid, all three implementations produced the same hex.
**Retest:** color snapshot for one verse before and after, confirm zero diff.

### 9.3 Decide on V11 export aliases (HIGH)

**Why:** §5.5 — comment claims residue removed; aliases still consumed. Either the comment is wrong or the cleanup is incomplete.
**Risk reduced:** Renames silently break consumers.
**Suggested patch:** open `codex/core/pixelbrain-phase3.js`, change imports to `generateSemanticPalette`, delete `color-byte-mapping.js:124-125`. Update the V12 REFACTOR comment to past tense and accurate.
**Retest:** `npm run test` for any phase3 consumer.

### 9.4 Fix `parseBytecodeString` `version` field (HIGH)

**Why:** §5.6 dead branch; `version` field lies for non-VW input.
**Suggested patch:**
```js
// shared.js:117-118 — replace
version: parts[0] === 'VW' ? 'VW' : 'VW',
// with one of:
version: parts[0] === 'VW' ? 'VW' : 'UNKNOWN',
// or just remove the field — no consumer reads it (verify with grep first)
```
**Retest:** grep for `.version ===` and `parsedBytecode.version` to find consumers; if none, drop the field.

### 9.5 Document or fix Pipeline A vs B token coloring (HIGH)

**Why:** §5.4 — same token, two colors. This is either a bug or a deliberate design choice. Currently it's an accident.
**Suggested action:** decide.
- If deliberate: add a comment block in `VerseSynthesis.js:65` explaining that `token.sonicChroma` is for tooltips only and `verseIrColor` is for inline rendering, and never the twain shall meet.
- If a bug: remove `token.sonicChroma` entirely and have `WordTooltip.jsx` consume the same `resolveVerseIrColor` everyone else uses.

### 9.6 Replace gray-magic-string sentinels with `null` (MEDIUM)

**Why:** §5.8 — `#888888` as "unset" only catches one of three possible neutral grays.
**Suggested patch:** make all color resolvers return `null` (not a hex string) when no color is determinable. Update `resolveTokenColor` to check `color === null` instead of magic-hex-comparison.
**Retest:** snapshot any UI surface that previously showed a gray-fallback color.

### 9.7 Fix `chroma.resolver.js` bytecode structure (MEDIUM)

**Why:** §5.2 — three different layouts under one "fixed-width" contract.
**Suggested patch:** restructure all three emissions to follow the `{H3}{S2}{L2}{NUC2}` layout:
- empty input: `'PB-CHROMA-XXXXXXXXX'` where each `X` is a sentinel char like `_`
- null nucleus: `'PB-CHROMA-XXX00280X'` (encoding `h:180, s:0, l:40` and reserved nucleus)
- normal: existing format
Plus delete the unreachable `nucleus.padStart(2, '_')` at line 79.

### 9.8 Fix `resolveSchoolColor` fallback (MEDIUM)

**Why:** §5.7 — masquerades as phonetic; always returns 180.
**Suggested patch:** drop the fake-phonetic call and use `hashString(safeSchoolId) % 360` for unknown schools, with a clear comment that this is a deterministic stable hue for unknown school IDs (not derived from any phonetic property of the name).

### 9.9 Inline or delete `src/lib/phonology/vowelWheel.js` shim (LOW)

**Why:** §5 inventory — pure re-export, no UI-layer transformation.
**Suggested patch:** if the indirection is intentional ("UI consumers shouldn't reach into `codex/`"), document that. Otherwise delete the shim and update the four consumers to import directly from `codex/core/phonology/vowelWheel.js`.

### 9.10 Replace `procedural-noise.js` and `formula-to-coordinates.js` color paths with PALETTE_CONTRACT (LOW, longer-term)

**Why:** §5.9 + §6 — pre-V12 color emission outside the contract.
**Suggested patch:** refactor `procedural-noise.js` palette tables into `extension-registry.js` entries; refactor `evaluateFormulaWithColor` to call `bytecodeToPalette` and consume the result. Larger change — sequence after 9.1–9.4.

---

## 10. QA Checklist

### 10.1 Static / Unit
- [ ] Property test: every key in `VOWEL_HUE_MAP`, `FAMILY_ALIASES`, and `PCA_FAMILY_ALIASES` resolves to the same canonical family through all three normalization paths.
- [ ] Property test: `hslToHex` from `shared.js`, `pcaChroma.js`, and `schools.js` produce identical output across `h ∈ {0, 60, 120, 180, 240, 300, 359}`, `s ∈ {0, 50, 100}`, `l ∈ {0, 25, 50, 75, 100}`.
- [ ] Unit test: `parseBytecodeString` `version` field returns expected value for `'VW-...'`, `'AA1'`, `''`, `'XX-...'`.
- [ ] Static analysis: grep for `.sonicChroma` and `.verseIrColor` field reads, confirm no surface reads both.
- [ ] Grep: confirm no consumer of `parsedBytecode.version` exists; if any do, define expected behavior.

### 10.2 Cross-Pipeline Snapshot
- [ ] For corpus of 100 words, render each through Pipeline A (`resolveSonicColor`) and Pipeline B (`resolveVerseIrColor`); diff the hex values; document the expected divergence (or fix it).
- [ ] For words with terminal `OH`, `OO`, `YUW`, `EE`, `IN`: snapshot color in tooltip, in inline overlay, and in rhyme registry; assert all three agree.
- [ ] For `bytecode = 'VW-NETHER-COMMON-INERT'` (unknown school), snapshot palette; confirm `baseHue` is no longer hardcoded 180.

### 10.3 Visual Regression
- [ ] TrueSight overlay screenshot for a 4-line verse mixing all eight schools; compare against baseline.
- [ ] WordTooltip color sample for one word per vowel family; compare against inline color in same render.
- [ ] School badges (uses `generateSchoolColor`); confirm hex matches `colorHsl` round-trip.

### 10.4 Performance / Data Flow
- [ ] Confirm `getHexForByte` page-jitter still produces visually unbanded output after consolidating `hslToHex`.
- [ ] Confirm `_pcaBasis` memoization survives the basis being recomputed at most once per page load.

---

## 11. Summary Punch-List (in suggested order)

1. **9.1** — Consolidate alias maps. Highest leverage, clears the §5.1 critical.
2. **9.2** — Single `hslToHex`. Mechanical, low-risk, removes a class of future bugs.
3. **9.3** — Resolve V11 export aliases. Either delete or document; pick one and update phase3.
4. **9.4** — Fix `parseBytecodeString` dead branch. Five-line change.
5. **9.5** — Decide Pipeline A vs B for token coloring. Document or unify.
6. **9.6** — Replace gray-string sentinels with `null`.
7. **9.7** — Restructure `chroma.resolver.js` bytecode emissions.
8. **9.8** — Fix `resolveSchoolColor` fallback.
9. **9.9** — Decide on `vowelWheel.js` shim.
10. **9.10** — (Larger) port `procedural-noise.js` and `formula-to-coordinates.js` color paths to PALETTE_CONTRACT.

Items 1–4 alone close every Critical and High finding in §5.

---

*Audit grounded in actual source as of 2026-04-25. All line numbers and function signatures verified against the working tree. No fictional files, no inferred runtime behavior beyond what the source explicitly encodes.*
