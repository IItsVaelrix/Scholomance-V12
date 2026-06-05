# PDR: Rhyme Constellation
## A Vectorized Painting Surface for the Sovereign Editor

**Status:** Proposed — **not started.** No code exists; the 2026-05-08 P1–P2 handoff was distributed but never landed (no `constellationEnabled` flag, no `src/components/Constellation/`, no `ballisticForecast.js`, no forecast event bus — verified 2026-06-04).
**Classification:** UI Surface + Prediction + World-Law Cosmology
**Priority:** Medium (re-scoped from "High / centerpiece" — see §0 Reality Reconciliation and §17 Recommendation).
**Visibility:** Opt-in. The color engine runs unconditionally; the constellation render and any manifold-mutation surface activate only when `settings.constellationEnabled === true`.
**Primary Goal:** Surface the Truesight perceptual color geometry as a directly-witnessable constellation of rhyme-family points, optionally overlaid with TurboQuant ballistic forecasts of where the next stroke will land. **Opt-in: users who do not opt in retain full access to ritual prediction, scoring, mechanics, and Truesight word color — they simply do not witness the manifold.**

---

## 0. Reality Reconciliation (2026-06-04)

This PDR was authored 2026-05-08 against an assumption that has since changed. **Read this section before §1.** The rest of the document has been updated to match current code, but the headline shift is here.

### What changed: the painted word color is no longer the pcaChroma manifold

When this PDR was first written, it assumed the OKLCh color the user sees on each word *is* the pcaChroma perceptual manifold, so "render the manifold" and "render the law governing your verse" were the same act.

That is no longer true. As of **2026-06-03**, the editor's per-token color is driven by **`bytecode.color`**, resolved through **`resolveResonanceColor(rhymeKey, schoolId, fallbackColor)`** in `codex/core/shared/truesight/color/rhymeColorRegistry.js` (consumed in `ScrollEditor.jsx` and `WordTooltip.jsx`). The **pcaChroma formant→PCA→OKLCh pipeline (`resolveVerseIrColor`) was demoted to two non-painting surfaces**:

- `src/components/TruesightDebugColorPanel/TruesightDebugColorPanel.jsx` (inspection), and
- `src/hooks/useAdaptivePalette.js` (palette generation).

There is also a known structural ambiguity in that demoted path: `resolveVerseIrColor` derives hue **purely from the PCA angle** (`atan2(pc2, pc1)`) and routes the projection radius to chroma only — so two vowel families on the same ray from the PCA centroid collapse to the same hue (see the `project_pcachroma_hue_collapse` memory note). This is tolerable for a debug lens; it would be visible as a defect on a "centerpiece" manifold render.

### Consequence for this PDR

There are now **two color authorities**, and the PDR must choose which one the constellation renders:

| Authority | Module | Drives | Geometry available |
|---|---|---|---|
| **Resonance (authoritative)** | `resolveResonanceColor` / `bytecode.color` (`rhymeColorRegistry.js`) | The word color the user actually sees | Per-rhyme-family color; **no 2D coordinates** |
| **pcaChroma (perceptual geometry)** | `resolveVerseIrColor` (`pcaChroma.js`) | Debug panel + adaptive palette only | `oklch:{l,c,h}` **and** `projection:{pc1, pc2, radius}` — a real 2D plane |

The original PDR rendered authority #2 and *called* it the law governing words. That is now incoherent: #2 no longer governs words; #1 does, and #1 has no native 2D layout.

### The reconciling design (adopted in this revision)

**Position points by pcaChroma geometry; fill them with the authoritative resonance color.** Each rhyme-family point is laid out on the plane using `resolveVerseIrColor(...).projection` (angle = hue ring, radius = eccentricity) — the only source of stable 2D coordinates — but its *fill* is `resolveResonanceColor(rhymeKey, schoolId, bytecode.color)`, the color the user truly sees. This keeps the constellation honest: its layout is the perceptual geometry, its color is the law in force. Where the two diverge, that divergence is itself the diagnostic.

This single decision rewrites the cosmology table in §6 and the data hook in §8/§11.

---

## 1. Executive Summary

Scholomance's color substrate is vectorized in two layers that have drifted apart:

1. **Authoritative word color** resolves from `bytecode.color` via `resolveResonanceColor` (rhyme family → deterministic color, school-modulated). This is what the user sees in the editor.
2. **Perceptual geometry** is computed by `resolveVerseIrColor` in `pcaChroma.js`: phonemes carry stable points in a PCA space derived from F1/F2 formants, projected to a 2D plane (`{pc1, pc2, radius}`) and emitted in OKLCh via `oklchToHex` (`oklch.js`). This now feeds only the debug panel and adaptive palette.

The prediction engine reranks candidate frontiers via TurboQuant (`codex/core/ritual-prediction/reranker.js`, the `async rerankCandidates` export at `reranker.js:82`, orchestrated by `run.js`).

What is missing is a UI surface that **renders this geometry to the user as a constellation** — points laid out by perceptual position, colored by the authoritative resonance law — and (optionally) overlays TurboQuant ballistic predictions of where the next stroke will land.

The Rhyme Constellation is that surface. It is a **lens onto the manifold**, not a paint tool. The user does not paint pixels; in the read-only phases the user *witnesses*, and in the deferred mutation phase the user **rearranges family positions** and the words repaint to obey.

---

## 2. Problem Statement

1. **The geometry is invisible.** The pcaChroma perceptual plane exists and is computed, but it is surfaced only in a debug panel. There is no first-class way to witness or inspect the phonemic color geometry.
2. **The two color authorities are not legible together.** A user cannot see *why* a word landed on a given color, nor how the perceptual geometry relates to the resonance color actually applied.
3. **Prediction is opaque.** TurboQuant reranks candidates (`rerankCandidates`), but the user never sees the candidate frontier as a spatial object. They see a final word land. The forecast is hidden.
4. **The world-law-faithful "painting" channel does not exist.** A naive RGB picker would violate CLAUDE.md's anti-skeuomorphic mandate. Any expressive channel must route through phonology, semantics, and syntax — never arbitrary color choice.

---

## 3. Product Goal

1. **Render the geometry.** Display the OKLCh perceptual plane (2D projection at fixed L) as a constellation of rhyme-family points. **Positions** come from `resolveVerseIrColor(...).projection`; **fills** come from `resolveResonanceColor` (the authoritative word color). This is an evolution of the existing `TruesightDebugColorPanel`, promoted from debug to a witnessable surface.
2. **Expose the painter (optional, later phase).** Render TurboQuant ballistic predictions as ghost strokes — forecasts of where the next word will land, before it lands.
3. **Allow law-shaping, not pixel-pushing (deferred).** Let the user drag rhyme-family points to remap positions; live verse repaints to obey. Painting is *legislation*, not coloring.
4. **Pigment commits via syntax-arbiter (deferred).** Ballistic strokes land provisionally at low opacity; syntax legality + CODEx ratification settles the pigment.
5. **Preserve world-law contract.** Every visual element connects to a phonological, semantic, or syntactic substrate. No decorative pixel.

---

## 4. Non-Goals

- **Not an RGB color picker.** No free color authorship. All color modulation routes through phonological/semantic substrates.
- **Not a replacement for the textarea editor.** The constellation is a sibling lens, not a substitute. `ScrollEditor.jsx` remains the primary input.
- **Not a real-time multiplayer canvas.** Single-user, local-first.
- **Not a 3D scene.** The constellation surfaces a 2D projection (the PCA plane), with L-modulation rendered as glow. Defer 3D until phonemic inventory grows.
- **Not a TurboQuant retrain.** This PDR consumes the existing `rerankCandidates`; it does not modify the kernel.
- **Not a re-authoring of color authority.** The constellation reads both `resolveResonanceColor` (fill) and `resolveVerseIrColor` (position). It does **not** make pcaChroma authoritative for painting again.

---

## 5. Core Design Principles

| Principle | Rationale |
|-----------|-----------|
| **Position is geometry, fill is law** | Points are laid out by pcaChroma perceptual projection; their color is the authoritative `resolveResonanceColor`. The constellation never invents a color the editor wouldn't apply. |
| **Witnessing Is Opt-In** | The geometry exists whether or not anyone watches. The user consents to *witnessing the cosmology at all*, not to individual strokes. Opt-out users retain prediction, mechanics, and Truesight word color without the manifold layer. |
| **Painter Autonomy (deferred phases)** | TurboQuant forecasts ballistically without user gesture. The user shapes the manifold the painter operates on; the painter pulls its own trigger. |
| **Provisional Pigment (deferred phases)** | Ballistic strokes are low-opacity ghosts until syntax-arbiter and CODEx ratify them. Commit is layered ratification, not a single event. |
| **Sovereign Determinism** | Same seed + same verse + same constellation state → bit-identical render. No floating-point drift, no animation desync. |
| **Zero Cost When Opted Out** | When `settings.constellationEnabled === false`, the constellation does not mount, does not subscribe to forecast events, and does not allocate stroke pools. Opt-out cost is identical to today. |

---

## 6. The Painter Stack (Cosmology)

Each layer maps to an existing or net-new module. **Existing** modules are cited at their current path; **net-new** modules are flagged.

| Layer | Role | Module (status) | Channel |
|---|---|---|---|
| **Phonemes** | Perceptual position (base geometry) | `pcaChroma.js` → `resolveVerseIrColor(...).projection` (**exists**, debug/palette only today) | `projection.{pc1,pc2,radius}` → x/y on plane |
| **Rhyme family** | Authoritative fill | `rhymeColorRegistry.js` → `resolveResonanceColor` (**exists**, authoritative) | point fill color |
| **Allophones** | Tints (L/C modulation of fixed position) | `allophoneTint.js` (**net-new**, deferred to P4) | `L`, `C` deltas |
| **Meaning** | Pigment (body, opacity) | TurboQuant similarity → opacity coefficient (**derive from `rerankCandidates` output**) | alpha / saturation |
| **Syntax** | Arbiter (legality + gravity) | scroll analyzer + `turboqa.js` legality gate (**exists**) | trajectory bend + commit veto |
| **CODEx** | Designer (final ratification) | `codex/core/ritual-prediction/run.js` (**exists**) | bytecode emission |
| **TurboQuant** | Painter (ballistic forecast) | `ballisticForecast.js` wrapping `rerankCandidates` (**net-new**, deferred to P2) | trajectory + landing point |

**Read this table top-down** as a render pipeline:
1. The phoneme contributes a position on the plane (pcaChroma projection).
2. The rhyme family supplies the authoritative fill (resolveResonanceColor).
3. The semantic weight sets opacity (meaningful words paint heavy).
4. Syntax bends the painter's trajectory and arbitrates legality at commit.
5. CODEx ratifies the final bytecode.
6. TurboQuant projects the next stroke forward into this composed space.

---

## 7. Architecture

```
[ Verse Context (ScrollEditor) ]
        │
        ├──> [ Pass 1: Graph Traversal → Candidate Frontier ]
        │           │
        │           ▼
        ├──> [ Pass 2: TurboQuant rerankCandidates (reranker.js:82) ]
        │           │
        │           ├──> ballisticForecast.js projects top-K into perceptual space
        │           │      (resolveVerseIrColor for position; rerank score for opacity)
        │           └──> emit forecast: {id, candidateId, oklchPoint, opacity, trajectoryVector}
        │                    │
        │                    ▼
        ├──> [ Syntax Arbiter (turboqa.js) ]           (P3, deferred)
        │           │
        │           ├──> bend trajectory (gravity)
        │           └──> mark legal | illegal (arbiter)
        │                    │
        │                    ▼
        ├──> [ CODEx Designer (run.js) ]               (P3, deferred)
        │           │
        │           └──> ratify → emit bytecode → settle pigment
        │                    │
        │                    ▼
[ Rhyme Constellation Surface ]  ◀── points: pcaChroma position + resonance fill
        │                              strokes: provisional + ratified forecasts
        │
        └──> user gesture: drag rhyme-family point     (P4, deferred)
                    │
                    ▼
        [ Manifold Mutation Event ]
                    │
                    ├──> recompute position overrides
                    └──> repaint all live verse
```

### Data flow contracts

- **Forecast Event** (`ballisticForecast.js` → Constellation), event name `rhyme.forecast.emitted`:
  ```ts
  {
    id: string,                // forecast id (uuid; carries through commit)
    candidateId: string,
    rhymeKey: string,
    oklchPoint: { L: number, C: number, h: number },  // from resolveVerseIrColor(...).oklch
    opacity: number,           // semantic weight from rerank score; capped <0.5 until ratified
    trajectoryVector: { dx: number, dy: number },      // direction-from-previous
    confidence: number,        // [0,1]
    emittedAt: number,
  }
  ```
- **Manifold Mutation Event** (Constellation → Engine, P4 deferred):
  ```ts
  {
    rhymeFamily: string,
    positionOverride: { pc1?: number, pc2?: number },  // plane override; gamut-clamped
    timestamp: number,
  }
  ```
- **Pigment Commit Event** (CODEx → Constellation, P3 deferred):
  ```ts
  {
    forecastId: string,
    status: 'ratified' | 'rejected',
    bytecode: string | null,
  }
  ```

---

## 8. Module Breakdown

> **Path note:** the real color engine lives under `codex/core/shared/truesight/color/`. The `src/lib/truesight/color/*` files are **one-line re-export bridges** to it (do not duplicate logic there). The component layer imports from the `src/lib` bridges.

### Existing modules the constellation consumes (no change)

| Module | Path | Used for |
|---|---|---|
| `pcaChroma.js` | `codex/core/shared/truesight/color/pcaChroma.js` (bridge: `src/lib/...`) | `resolveVerseIrColor(family, schoolId, {baseHsl, phase})` → `{oklch, projection}` for **point position** |
| `rhymeColorRegistry.js` | `codex/core/shared/truesight/color/rhymeColorRegistry.js` (bridge: `src/lib/...`) | `resolveResonanceColor(rhymeKey, schoolId, fallback)` for **point fill** |
| `oklch.js` | `codex/core/shared/truesight/color/oklch.js` | `oklchToHex`, `oklchToRgb`, `deltaE` |
| `reranker.js` | `codex/core/ritual-prediction/reranker.js` | `async rerankCandidates(candidates, context, deps, options)` (line 82) |
| `run.js` | `codex/core/ritual-prediction/run.js` | rerank-pass orchestration (wire-in point) |
| `useUserSettings.js` | `src/hooks/useUserSettings.js` | settings persistence (where `truesightEnabled` lives; `ReadPage.jsx` consumes) |

### New Modules (UI — Claude's jurisdiction)

| Module | Path | Role |
|---|---|---|
| `RhymeConstellation.jsx` | `src/components/Constellation/RhymeConstellation.jsx` | Top-level surface; gate on `constellationEnabled` |
| `ConstellationManifold.jsx` | `src/components/Constellation/ConstellationManifold.jsx` | Perceptual-plane renderer (SVG); evolves `TruesightDebugColorPanel` logic |
| `BallisticStroke.jsx` | `src/components/Constellation/BallisticStroke.jsx` | Single forecast stroke (P2) |
| `ConstellationPoint.jsx` | `src/components/Constellation/ConstellationPoint.jsx` | Draggable rhyme-family point (P4) |
| `useBallisticForecast.js` | `src/hooks/useBallisticForecast.js` | Subscribes to forecast events (P2) |
| `useManifoldMutation.js` | `src/hooks/useManifoldMutation.js` | Emits manifold-mutation events (P4) |
| `Constellation.css` | `src/components/Constellation/Constellation.css` | Styling; school-themed; reduced-motion-aware |

### New Modules (Engine — Codex/Gemini's jurisdiction)

| Module | Path | Role |
|---|---|---|
| `useRhymeManifoldPoints.js` | `src/hooks/useRhymeManifoldPoints.js` | Read-only hook → `RhymeFamilyManifoldPoint[]` (position from `resolveVerseIrColor`, fill from `resolveResonanceColor`) |
| `ballisticForecast.js` | `codex/core/ritual-prediction/ballisticForecast.js` | Wraps `rerankCandidates` for forward projection (P2) |
| `allophoneTint.js` | `codex/core/shared/truesight/color/allophoneTint.js` | ΔL/ΔC modulators for allophonic variants (P4) |
| `positionOverrides.js` | `codex/core/phonology/positionOverrides.js` | Stores user-authored plane-position overrides per family (P4) |

### Schema Extensions (Codex)

- `constellationEnabled: boolean` added to settings schema (default `false`); coupling invariant per §9.
- `RhymeFamilyManifoldPoint` shape (see §11 P1).
- `BallisticForecastEvent` shape (see §7), event name `rhyme.forecast.emitted` (P2).
- `bytecode.color` extended with `tonalAccent: { dPc1, dPc2 }` — the user's authored position modulation per family (P5).
- `BytecodeError` codes:
  - `PB-ERR-v1-LINGUISTIC-CRIT-CONSTELL-0301` — manifold mutation produced ungazettable color (out of OKLCh sRGB gamut)
  - `PB-ERR-v1-VALUE-CRIT-CONSTELL-0302` — ballistic forecast confidence below floor (0.5)

---

## 9. Opt-In Contract

### State matrix

| `settings.truesightEnabled` | `settings.constellationEnabled` | Behavior |
|---|---|---|
| `false` | `false` | Pure verse. No color overlay, no manifold. Prediction, scoring, mechanics fully active. |
| `true` | `false` | Today's behavior. Word-level resonance color overlay. No manifold. |
| `true` | `true` | Full grimoire. Words colored + manifold visible (+ ballistic strokes once P2 lands). |
| `false` | `true` | Conductor-without-orchestra mode. Manifold visible, words uncolored. Reachable only by opting into the Constellation (which auto-enables Truesight) and then individually disabling Truesight. |

### Coupling rule (decided)

**Opting into the Constellation auto-enables Truesight.** Reasoning: the constellation's *fill* is the authoritative resonance color that governs word color; surfacing it without surfacing what it governs is incoherent as a default. After opt-in, the user may individually disable Truesight to reach conductor-without-orchestra mode. Disabling Truesight does not disable the Constellation.

```
constellationEnabled: false → true   ⇒   truesightEnabled: (any) → true
constellationEnabled: true → false   ⇒   truesightEnabled: unchanged
truesightEnabled: true → false       ⇒   constellationEnabled: unchanged
```

The coercion must happen at the **settings persistence boundary** (`useUserSettings.js`), in a single atomic write — not in UI, and not as a follow-up dispatch.

### Engine invariants under opt-out

When `constellationEnabled === false`:

- `RhymeConstellation` does not mount; React tree contains no constellation node.
- `useBallisticForecast` does not subscribe; the forecast emitter has no listeners and short-circuits emission.
- `ballisticForecast.js` performs zero projection work (gated via a shared `isConstellationActive()` accessor — not React state).
- `positionOverrides.js` is not consulted; all family positions resolve from default `resolveVerseIrColor` projection.
- Ritual prediction, TurboQuant rerank, syntax arbitration, CODEx ratification, scoring, and combat mechanics operate identically to current behavior.

### Discovery & first-launch

- Default: `constellationEnabled = false`.
- Discoverability: a single subtle invitation in the editor chrome labeled **"Witness the manifold"** (likely in the Read-page tools surface, alongside the existing Truesight toggle). Activating it sets `constellationEnabled = true` and auto-enables Truesight per the coupling rule. No modal interruption.
- First-launch tutorial activates only after explicit opt-in. Gated, not pushed.
- ARIA label: `"Witness the manifold — reveal the rhyme constellation and the painter's trajectories"`.

---

## 10. Interaction Model

### The user's primary acts

1. **Witness the geometry** (passive, P1)
   - Rhyme-family points appear on the plane, positioned by perceptual geometry, colored by the resonance law actually in force.
2. **Witness the painter** (passive, P2)
   - As they type, ballistic strokes appear showing where the painter forecasts the next word will land. Strokes are low-opacity ghosts until ratified.
3. **Shape the manifold** (active, P4 — deferred)
   - User drags a family point; live verse repaints; future forecasts land in the new geometry. Mutation persists in `positionOverrides.js` and surfaces in bytecode as `tonalAccent`.
4. **Witness ratification** (passive, P3 — deferred)
   - On typing a word, syntax arbiter and CODEx ratify the matching forecast; pigment settles to full opacity at the landed position. Unratified forecasts dissipate.

### What the user does NOT do

- Pick colors directly.
- Place strokes manually.
- Override syntax legality.
- Bypass CODEx ratification.
- Make pcaChroma authoritative for word painting.

---

## 11. Phased Rollout

| Phase | Scope | Acceptance |
|---|---|---|
| **1. Manifold Display (Read-Only)** | Render the perceptual plane with rhyme-family points: position from `resolveVerseIrColor(...).projection`, fill from `resolveResonanceColor`. No interaction. Evolves `TruesightDebugColorPanel`. | Plane renders; positions match `resolveVerseIrColor` projection; fills match the editor's applied color; reduced-motion respected. |
| **2. Ballistic Forecast Visualization** | `ballisticForecast.js` wraps `rerankCandidates`; emit `rhyme.forecast.emitted`; render ghost strokes via `useBallisticForecast`. | Strokes appear within 50ms p95 of keystroke; opacity reflects rerank confidence; off-state emits nothing. |
| **3. Syntax Arbitration Visualization** | Show trajectory bend (gravity) and rejection (arbiter veto) as visible motion. Depends on §15.5 decision. | Illegal candidates visibly fall away; legal candidates settle. |
| **4. Manifold Mutation (Active)** | Drag family points; verse repaints; `positionOverrides.js`. | Drag persists in bytecode; live verse reflows; ruler test passes. |
| **5. Tonal Accent Persistence** | Mutations save to user's bytecode profile. | Mutations survive reload; export/import as `.constellation.json`. |

**P1 data shape** (`RhymeFamilyManifoldPoint`, returned by `useRhymeManifoldPoints`):
```ts
type RhymeFamilyManifoldPoint = {
  rhymeFamily: string;                      // e.g. "AY", "EY"
  position: { pc1: number; pc2: number; radius: number };  // from resolveVerseIrColor(...).projection
  oklch: { l: number; c: number; h: number };              // perceptual color (geometry)
  fillHex: string;                          // resolveResonanceColor (authoritative word color)
  schoolId: string;
  formant: { f1: number; f2: number };      // for diagnostic overlay
};
```

---

## 12. Acceptance Criteria

- [ ] **World-law connection** — every visible element maps to a layer in the painter stack (§6).
- [ ] **No RGB authorship** — no UI surface accepts a free color value.
- [ ] **Honest fill** — point fill equals the color the editor would apply (`resolveResonanceColor`), not the pcaChroma debug color.
- [ ] **Provisional pigment** — ballistic forecasts render at <0.5 opacity until ratified (P2+).
- [ ] **Determinism** — same verse + same constellation state → bit-identical render across reloads.
- [ ] **Sovereign Gate** — constellation state lives entirely in client; mutations sync via existing collab persistence; no third-party color service.
- [ ] **A11y** — points keyboard-navigable (Tab); ARIA announces forecasts as "predicting [rhyme] with [confidence]% confidence."
- [ ] **Reduced motion** — under `prefers-reduced-motion`, strokes are static ghosts; no trajectory animation.
- [ ] **Memory** — render cost ≤ 4MB heap for 50 families × 200 active strokes.
- [ ] **Visual regression** — baselines in `tests/visual/constellation/` cover empty, populated, mutated states.

---

## 13. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| **Premise drift recurs** — a future change re-routes word color away from `resolveResonanceColor`, silently making the constellation's fill wrong again. | P1 acceptance pins fill to the *same* resolver the editor uses; a regression test asserts constellation fill == editor token color for a fixed verse. |
| **pcaChroma hue collapse is visible** — same-ray families share a hue, so points stack on the hue ring. | Layout uses full 2D `projection` (`pc1`,`pc2`), not hue alone, so radius separates same-ray families spatially even when their pcaChroma hue matches. Document the collapse in the panel legend. |
| Drag-induced repaint mid-typing → caret stasis regression. | Mutations route through the existing Typing Freeze guard (`isTypingRef`, 400ms debounce in `ScrollEditor.jsx`); no repaint during keystroke bursts. |
| TurboQuant forecast confidence low; ghost strokes flicker. | Confidence floor (0.5); below-floor forecasts not rendered; `CONSTELL-0302` if floor breached >5% of a pass. |
| User expects RGB picking; world-law confusion. | First-launch tutorial: "You do not pick colors. You shape the positions colors come from." Gated behind opt-in. |
| Steam Deck render perf degrades with >100 strokes. | Stroke pool with LRU eviction; hard cap 200; profile against the existing Sovereign baseline. |
| OKLCh→sRGB gamut clipping makes mutated points unrepresentable. | Clamp to in-gamut on mutation; `CONSTELL-0301` on out-of-gamut drag; gamut boundary as a soft halo. |
| Forecast latency exceeds keystroke cadence. | `rerankCandidates` is already async with a <12ms budget for 200 candidates; ballistic projection adds <2ms. |

---

## 14. Visual Regression / QA Hooks

- New baselines: `tests/visual/constellation/empty.png`, `populated.png`, `mutated.png`, `provisional-stroke.png`, `ratified-stroke.png`.
- Scripted scenario: type a known verse; capture forecast events; assert deterministic OKLCh points within ε=0.001.
- Fill-honesty test: assert each point's `fillHex` equals the editor token color for the same family in the same school.
- Verify via the existing TurboQA gate (`scripts/verify_turboqa.js` / `turboqa.js`) that ballistic forecasts respect the overlap floor with the graph baseline.

---

## 15. Decisions & Open Questions

### Decided

1. **Color authority — DECIDED (2026-06-04).** Constellation **position** comes from pcaChroma `resolveVerseIrColor(...).projection`; **fill** comes from authoritative `resolveResonanceColor`. The constellation never makes pcaChroma authoritative for painting. (§0, §5.)
2. **Truesight ↔ Constellation coupling — DECIDED (2026-05-08).** Opting into the Constellation auto-enables Truesight; user may individually disable Truesight afterward. (§9.)
3. **Commit model — DECIDED (2026-05-08).** Provisional pigment: strokes render at <0.5 opacity, settle only after syntax arbitration + CODEx ratification; unratified strokes dissipate.
4. **Toggle copy — DECIDED (2026-05-08).** "Witness the manifold."

### Still open

5. **Allophone surfacing.** Visible micro-strokes around each phoneme, or invisible L/C modulation of the parent point? Recommended: **invisible modulation** until inventory justifies surfacing.
6. **Syntax-as-arbiter behavior.** Hard veto (illegal forecasts vanish) or continuous gravity (illegal pulled toward legal)? Recommended: **gravity at trajectory, arbiter at commit**.
7. **Position-override persistence scope.** Per-user, per-school, per-verse, or global? Recommended: **per-user with per-school dialects**.
8. **Fix the pcaChroma hue collapse first?** If P4 mutation makes the geometry directly manipulable, the same-ray hue collapse becomes user-visible. Recommended: fold radius/eccentricity into a second visual dimension before P4, or accept that layout (not hue) carries family identity.
9. **3D upgrade.** When does the plane become a volume (full OKLCh)? Defer until inventory or stroke density demands it.

---

## 16. Implementation Status (2026-06-04)

| Artifact | Expected path | State |
|---|---|---|
| `constellationEnabled` flag | settings schema / `useUserSettings.js` | **absent** |
| "Witness the manifold" toggle | Read-page tools surface | **absent** |
| `src/components/Constellation/**` | UI surface | **absent** |
| `useRhymeManifoldPoints.js` | `src/hooks/` | **absent** |
| `ballisticForecast.js` | `codex/core/ritual-prediction/` | **absent** |
| `rhyme.forecast.emitted` event | event bus | **absent** |
| Substrate (`resolveVerseIrColor`, `resolveResonanceColor`, `oklchToHex`, `rerankCandidates`) | as cited in §8 | **present & current** |

The 2026-05-08 P1–P2 handoff (`HANDOFF-2026-05-08-RHYME-CONSTELLATION-P1-P2.md`) was authored and audited but **never implemented**. Its task IR remains valid as a starting point, with these corrections: settings live in `useUserSettings.js` (not `useSettings.js`); the manifold-point function is `resolveVerseIrColor` (not `resolveSonicColor` — that one is the phoneme→HSL path); point fill must use `resolveResonanceColor`.

---

## 17. Recommendation — Should we use it?

**Keep it as a vision document; do not build it as a "centerpiece" on the original premise.** Honest assessment:

- **The substrate is real and current.** The PCA→OKLCh geometry, the authoritative resonance resolver, `oklchToHex`, and the async reranker all exist at the paths cited. Nothing here is vaporware-blocked.
- **But the original justification is gone.** The PDR's emotional core — "witness the very law that paints your words" — was true only while pcaChroma painted the words. It no longer does. The reconciled design (position = geometry, fill = law) is honest, but it is a *diagnostic lens*, not a cosmology the user lives inside. That is a meaningful downgrade in ambition.
- **P1 is cheap and genuinely useful.** A read-only manifold is a modest promotion of the existing `TruesightDebugColorPanel` + `useAdaptivePalette`. If you want one thing, build **P1 only**: a witnessable plane that shows where families sit perceptually and how that diverges from the resonance color applied. That divergence is real signal (the hue-collapse ambiguity), and surfacing it has standalone value.
- **P2–P5 are speculative net-new engine work.** There is no forecast event bus, no `ballisticForecast.js`, no mutation/override store today. The "ballistic painter," "syntax-arbiter gravity," and "manifold mutation" layers are large builds resting on open questions (§15.5–§15.8). Do not commit to them on the strength of this doc.

**Suggested path:** mark this PDR `Proposed — P1 only` and either ship P1 as a debug-panel promotion or shelve the rest. If P1 proves the manifold is something users actually open, revisit P2 with a fresh forecast-bus PDR. Don't resurrect the five-phase plan wholesale — its priority was set against a premise that no longer holds.

---

## 18. Related Documents

- [Rhyme Constellation P1–P2 Handoff](../Scholomance%20Hand%20Offs/HANDOFF-2026-05-08-RHYME-CONSTELLATION-P1-P2.md) — task IR (never implemented; path corrections in §16)
- [TurboQuant Service Manual](../TURBOQUANT-SERVICE-MANUAL.md)
- [TurboQuant Integration Bridge PDR](./turboquant_integration_bridge_pdr.md)
- [Adaptive Palette PDR](./adaptive_palette_pdr.md)
- [Overlay Integrity Contract](../../../ARCH_CONTRACT_OVERLAY_INTEGRITY.md)
- [Phonosemantic Graph Architecture](../../architecture/PHONOSEMANTIC_GRAPH_ARCHITECTURE.md)

---

*Document Version: 0.3 (Proposed — P1 only) | Authored: 2026-05-08 | Last Updated: 2026-06-04 | Cosmology Author: Damien Page*

*Changelog:*
- *0.1 — Initial draft. Five-layer cosmology operationalized.*
- *0.2 — Three sovereign calls folded in: Truesight auto-enables on Constellation opt-in; provisional pigment confirmed; toggle copy fixed as "Witness the manifold."*
- *0.3 — Reality reconciliation (2026-06-04). Recorded that word color is now authoritative via `resolveResonanceColor`/`bytecode.color` and pcaChroma was demoted to debug/palette; adopted position-from-geometry / fill-from-law design; corrected all module paths and function names to current code; recorded that the P1–P2 handoff was never implemented; re-scoped priority to "P1 only" with an honest build recommendation (§17).*
