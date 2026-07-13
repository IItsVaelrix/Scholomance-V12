# Chroma Phosphorylation — Design

**Date:** 2026-07-13
**Status:** Approved (design)
**Owner:** Damien
**Problem:** TrueSight paints colour it cannot justify, and greys out for reasons it cannot distinguish.

---

## 1. The disease

TrueSight colour has no commit gate. It paints unconditionally:

```js
// src/lib/lexical/TruesightNode.js
dom.style.color = this.__color;
```

Three things follow from that, and they are the three failure modes we set out to detect.

### 1.1 The engine knows it guessed, and throws that knowledge away

```js
// codex/core/phonology/phoneme.engine.js
analyzeDeep(word) {
  return this.analyzeDeepWithDiagnostics(word).analysis;   // ← provenance discarded
}
```

`analyzeDeepWithDiagnostics` already returns `{ analysis, diagnostics }`, where diagnostics
carries `source` — `scholomance_dictionary`, `cmu_dictionary`, `heuristic_fallback`,
`unresolved`, and friends. The colour path calls the lossy sibling. Measured with the
dictionary **down**, `analyzeDeep('bold')` returns `phonemes: ["B","AA1","L","D"]` with no
hint that every one of them is a guess.

This is the root cause. We do not need to *build* provenance. We need to stop discarding it.

### 1.2 Nothing downstream can tell truth from guess

```js
// codex/core/phonology/chroma.resolver.js
const bytecode = `PB-CHROMA-${hueHex}${satHex}${litHex}${nucleus}`;   // no authority
```

A `PB-CHROMA` minted from dictionary truth and one minted from a spelling guess are
byte-identical. The bytecode is also **write-only**: produced in three places, parsed
nowhere. That is precisely why no macrophage can exist — there is no antigen to read.

The one guard that does exist, `buildResonanceGate`, returns an **empty Map for two
opposite reasons**: "authority unavailable, so colouring would be a lie" and "analysis ran
fine and found no resonance". Both render as grey. A macrophage staring at grey text cannot
tell a sick system from a healthy, unrhyming one.

### 1.3 Too many chefs, and no record of who cooked

```js
// codex/core/shared/truesight/compiler/VerseSynthesis.js:97
hex: verseIrColor?.hex                                   // Chef P: PCA → OKLCh
   || (sonicChroma ? `hsl(${h}, ${s}%, ${l}%)` : null)   // Chef S: vowel wheel → HSL
```

Two different colour spaces, two different derivations, silently swapping into one field
based on whether `terminalVowelFamily` happened to resolve. `ReadPage.jsx:651` adds a third
layer (`activation.color || core.color || core.precomputed?.hex`). A token's colour changes
pipeline with no record of which pipeline produced it. That is the misattribution.

---

## 2. The law we are borrowing

`codex/core/pixelbrain/qbit-phosphorylation.js` already implements exactly the organ TrueSight
lacks: a commit gate that **refuses to paint, and says why**.

```js
if (sdfValue > 0)                     return { committed: false, reason: 'MISSING_SUBSTRATE' };
if (!HEX_COLOR_RE.test(result.color)) return { committed: false, reason: 'INVALID_REACTION' };
if (result.confidence < threshold)    return { committed: false, reason: 'LOW_CONFIDENCE' };
setCell(layer, x, y, result.color);
return { committed: true, color: result.color, confidence: result.confidence };
```

We purpose the **law**, not the function body. `phosphorylate()` is welded to geometry
(`evaluateSDF`, `sdfGradient`, `setCell` on a pixel layer); a token is not a pixel with a
signed distance, and shoehorning one into the other would be cargo-culting the shape instead
of the law.

The refusal reason **is the antigen**. Every grey token declares why it is grey:

| grey token | reason | meaning |
|---|---|---|
| grey | *(none — never attempted)* | **healthy** — analysis ran, nothing rhymed |
| grey | `LOW_CONFIDENCE` | **sick** — the phonemes were guessed (API down, or flooded into the local fallback) |
| grey | `INVALID_REACTION` | **broken** — malformed colour (`#NaN`) |
| grey | `MISSING_SUBSTRATE` | **starved** — no phonemes at all |

Failure modes (1) API fails to load and (2) tokens flood the API both collapse into
`LOW_CONFIDENCE` — under load, dropped and aborted requests degrade tokens to the local path
and lose authority. Failure mode (3) too many chefs becomes a one-line assertion once the
chef is stamped.

---

## 3. Design

### 3.1 Authority alphabet

Mapped straight from the phoneme engine's existing `diagnostics.source`.

| stamp | `source` | confidence | paints at threshold 0.51? |
|---|---|---|---|
| `D` | `scholomance_dictionary` | 1.00 | yes |
| `O` | `word_override` | 0.90 | yes |
| `C` | `cmu_dictionary` | 0.80 | yes |
| `G` | `heuristic_fallback`, `alphabet_literal`, `multi_word_composition` | 0.50 | **no — a guess is never painted** |
| `U` | `unresolved`, `cached_analysis` with no provenance trail | 0.00 | no |
| `X` | no analysis attempted | 0.00 | no |

Threshold **0.51** (the phosphorylation default). Our dictionary, curated overrides, and CMU
paint. Guesses never do. `cached_analysis` is mapped conservatively to `U` because the engine
itself notes such entries were "reused without a stored provenance trail" — an unproven
colour is not painted.

### 3.2 Chef alphabet

| stamp | producer |
|---|---|
| `P` | `resolveVerseIrColor` — PCA → OKLCh |
| `S` | `resolveSonicChroma` — vowel wheel → HSL |
| `Q` | `ChromaQuantizer` |
| `A` | `verseir-amplifier/plugins/phoneticColor` |
| `N` | none — no colour was committed |

Each resolver stamps **its own** chef id. A chef cannot claim to be another chef.

### 3.3 Bytecode v2

```
PB-CHROMA-v2-{authority}{chef}{reason}{conf2}-{hue3}{sat2}{lit2}{nucleus}
```

- `reason`: `K` committed, `M` missing substrate, `I` invalid reaction, `L` low confidence
- `conf2`: confidence × 100, two hex digits (`00`–`64`)
- `hue3`/`sat2`/`lit2`: as v1
- `nucleus`: ARPAbet vowel base, or `__`

```
PB-CHROMA-v2-DPK64-0f03c3cAA     dictionary, PCA chef, committed, conf 1.00
PB-CHROMA-v2-GSL32-000000__      guess, sonic chef attempted, REFUSED (low confidence)
PB-CHROMA-v2-XNM00-000000__      no substrate — honest grey
```

Splitting on `-` decodes cleanly. **v1 is not parsed anywhere**, so nothing breaks; a
`decodeChromaBytecode()` ships with v2 and returns `null` for v1, which is how a probe tells
old callers from new.

Crucially, **every token gets a stamp, coloured or not.** A grey token with a stamp is the
whole point.

### 3.4 Components

| module | responsibility |
|---|---|
| `phoneme.engine.js` | *(modified)* colour path uses `analyzeDeepWithDiagnostics`; provenance survives |
| `chroma.bytecode.js` | **new** — `encodeChromaBytecode()` / `decodeChromaBytecode()`. Pure. |
| `chroma.kinase.js` | **new** — `buildChromaKinase(token)` → `call()` → `{ color, confidence }`; `phosphorylateToken(token, kinase, { threshold })` → `{ committed, color, confidence, reason }` |
| `chroma.resolver.js` | *(modified)* emits v2, stamps chef `S`, accepts authority |
| `pcaChroma.js` | *(modified)* `resolveVerseIrColor` emits a bytecode, stamps chef `P` |
| `VerseSynthesis.js` | *(modified)* commits colour through the kinase; records the winning chef |
| `TruesightNode.js` | *(modified)* `dom.dataset.chroma = this.__chroma` — same line as the existing `dataset.lexicalKey` |
| `chromaticImmuneProbe.js` | *(extended)* `scanChromaStamps(stamps)` — the macrophage's nose |

### 3.5 Data flow

```
PhonemeEngine.analyzeDeepWithDiagnostics(word)
  → { analysis, diagnostics: { source } }
  → buildChromaKinase(token)          confidence ← authority(source)
  → phosphorylateToken(...)           commit ONLY if conf ≥ 0.51 and hex is valid
  → { committed, color, confidence, reason }
  → encodeChromaBytecode(...)         PB-CHROMA-v2-…
  → token.precomputed.chroma          artifact
  → dom.dataset.chroma                DOM
  → macrophage sweeps live spans      decode → detect
```

### 3.6 What the macrophage detects

| detection | rule |
|---|---|
| **Chroma bleed** | any stamp with `reason = I` |
| **The lie was painted** | `reason = K` while `authority ∈ {G, U, X}` — must be impossible; if ever seen, a chef bypassed the gate |
| **API down / flooded** (modes 1 & 2) | a view where authority is `G`/`U` across tokens |
| **Torn frame** | mixed authority within one view — some tokens kept dictionary truth, others fell back |
| **Too many chefs** (mode 3) | more than one distinct chef in a single view |

The macrophage carries the guard `macrophage-chroma.js` lacked: **never phagocytize a node
whose expected === rendered.** That script, run as-is, deploys at (0,0,2), moves zero steps,
eats the healthy token "Colors", stamps it CRITICAL, and fabricates a root cause. A cell that
eats healthy tissue is a disease, not a cure. It is rewritten against real stamps or deleted.

---

## 4. Rollout — observe before enforcing

Enabling a 0.51 gate blind could grey a whole document if the authority distribution is not
what we think. So the gate ships in two stages:

1. **Stamp-only.** Every token gets a v2 bytecode. Nothing is refused; painting behaves
   exactly as today. Measure the real authority distribution over a real corpus.
2. **Enforce.** Turn the 0.51 threshold on once the distribution is known. If `G`/`U` turn out
   to be common on healthy text, that is itself the finding, and it is a data bug, not a
   reason to lower the bar.

The stamp is what makes stage 2 safe. Ship it first.

---

## 5. Testing

- **Bytecode:** encode/decode round-trip across every authority × chef × reason; v1 decodes to `null`.
- **Kinase:** each of the four refusal reasons, at its boundary (`conf = 0.50` refused, `0.51` committed).
- **The COLOR_DRAGON law, executable (stage 2):** with the dictionary forced down, assert **no
  token is painted** and every stamp reads `LOW_CONFIDENCE`. This is the regression test for
  the lie. In stage 1 the same fixture asserts only the *stamp* (`authority = G`, `reason = L`)
  while painting still happens — the stamp must be truthful before the gate is trusted to act
  on it.
- **Honest vs sick grey:** dictionary up + non-rhyming text → grey with no refusal; dictionary
  down → grey with `LOW_CONFIDENCE`. The two must be distinguishable from the stamp alone.
  This test is meaningful in **both** stages, because it reads the stamp, not the paint.
- **Chef conflict:** drive the `VerseSynthesis:97` fallback so both chefs fire, assert the
  probe reports more than one chef in the view.
- **DOM reach:** a headed browser run asserting `data-chroma` is present on rendered spans.
  Per the project's own rule, paint is never judged headless.

---

## 6. Non-goals (YAGNI)

- **No epoch/generation id.** Flooding manifests as grey (authority loss), not as a torn frame
  of mixed analysis generations. If that changes, the format has room.
- **No change to the colour mathematics.** PCA, OKLCh, and the vowel wheel are untouched. This
  is about *justifying* a colour, not computing a different one.
- **No auto-repair.** The macrophage reports and refuses. It does not rewrite source, and it
  does not "wipe the payload to neutral gray" to hide evidence.
- **Not fixing the two colour pipelines.** Collapsing Chef P and Chef S into one authority is a
  real question, but it is a separate PDR. This design makes the duplication *visible* first.
