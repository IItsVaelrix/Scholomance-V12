# PDR: Rhyme Constellation
## A Vectorized Painting Surface for the Sovereign Editor

**Status:** Proposed
**Classification:** UI Surface + Prediction + World-Law Cosmology
**Priority:** High (centerpiece UI)
**Visibility:** Opt-in. Engine runs unconditionally; constellation render and manifold-mutation surface activate only when `settings.constellationEnabled === true`.
**Primary Goal:** Expose the Truesight color manifold as a directly-manipulable, ballistically-painted constellation in which the user authors verse not by typing words but by witnessing — and shaping — the trajectory of phonemic light through OKLCh space, ratified by syntax and composed by CODEx. **Opt-in: users who do not opt in retain full access to ritual prediction, scoring, mechanics, and Truesight color — they simply do not witness the manifold.**

---

## 1. Executive Summary

Scholomance's color substrate is already vectorized. Phonemes carry stable points in OKLCh perceptual space (via the formant→PCA pipeline in `src/lib/truesight/color/pcaChroma.js`); rhyme families resolve to deterministic chroma points (via `resolveResonanceColor` in `rhymeColorRegistry.js`); the prediction engine already reranks candidate frontiers via TurboQuant (`codex/core/ritual-prediction/reranker.js`).

What is missing is a UI surface that **renders this manifold to the user as a constellation** and lets the painting cosmology — phonemes-as-colors, allophones-as-tints, meaning-as-pigment, syntax-as-arbiter, CODEx-as-designer — manifest as direct manipulation.

The Rhyme Constellation is that surface. It is not a paint tool. It is **the manifold itself, rendered**, with TurboQuant ballistic prediction acting as an autonomous painter that forecasts where the next stroke will land based on verse trajectory.

The user does not paint pixels. The user **rearranges the laws of the manifold**, and the words obey.

---

## 2. Problem Statement

1. **The substrate is invisible.** Truesight currently colors words in-place inside the textarea overlay. The user sees the *result* of the manifold but never the manifold itself. There is no way to inspect or shape the color logic — only consume it.
2. **Color is fully derived; user has no expressive channel.** `resolveResonanceColor(rhymeKey, schoolId, fallbackColor)` accepts no user modulation. The painter exists, but the user cannot direct it.
3. **Prediction is opaque.** TurboQuant reranks candidates, but the user never sees the candidate frontier as a spatial object. They see a final word land. The forecast is hidden.
4. **The world-law-faithful "painting" channel does not exist.** A naive RGB picker would violate CLAUDE.md's anti-skeuomorphic mandate. Painting must route through phonology, semantics, and syntax — never through arbitrary color choice.

---

## 3. Product Goal

1. **Render the manifold.** Display the OKLCh chroma plane (or a 2D projection) as a draggable constellation of rhyme-family points, computed from existing PCA chroma data.
2. **Expose the painter.** Render TurboQuant ballistic predictions as ghost strokes on the manifold — visible forecasts of where the next word will land, before it lands.
3. **Allow law-shaping, not pixel-pushing.** Let the user drag rhyme-family points to remap the manifold. All live verse repaints to obey the new law. Painting is *legislation*, not coloring.
4. **Pigment commits via syntax-arbiter.** Ballistic strokes land provisionally at low opacity. Syntax legality + CODEx ratification settles the pigment to full opacity (or dissipates it).
5. **Preserve world-law contract.** Every visual element on the constellation must connect to a phonological, semantic, or syntactic substrate. No decorative pixel.

---

## 4. Non-Goals

- **Not an RGB color picker.** No free color authorship. All color modulation routes through phonological/semantic substrates.
- **Not a replacement for the textarea editor.** The constellation is a sibling surface, not a substitute. The textarea remains the primary input. The constellation is the lens.
- **Not a real-time multiplayer canvas.** Single-user, local-first.
- **Not a 3D scene.** OKLCh is 3D, but the constellation surfaces a 2D projection (chroma plane at fixed L, with L-modulation rendered as glow). Defer 3D until phonemic inventory grows.
- **Not a TurboQuant retrain.** This PDR consumes existing TurboQuant; does not modify the kernel.

---

## 5. Core Design Principles

| Principle | Rationale |
|-----------|-----------|
| **Witnessing Is Opt-In** | The painter paints whether or not anyone watches. The user does not consent to individual strokes; the user consents to *witnessing the cosmology at all*. Opt-out users retain prediction, mechanics, and Truesight without the manifold layer. |
| **Cosmological Layering** | Every visual element belongs to one of the five layers (colors, tints, pigment, arbiter, designer). No element exists outside the cosmology. |
| **Painter Autonomy** | TurboQuant paints ballistically without user gesture. The user does not pull the trigger; the painter does. The user shapes the manifold the painter operates on. |
| **Provisional Pigment** | All ballistic strokes are low-opacity ghosts until syntax-arbiter and CODEx ratify them. Commit is a layered ratification, not a single event. |
| **Manifold over Canvas** | The user manipulates the *space*, not marks within the space. Drag a rhyme-family point and all verse repaints. |
| **Sovereign Determinism** | Same seed + same verse + same constellation state → bit-identical render. No floating-point drift, no animation desync. |
| **Zero Cost When Opted Out** | When `settings.constellationEnabled === false`, the constellation does not mount, does not subscribe to forecast events, does not allocate stroke pools. Engine cost for opt-out users is identical to today. |

---

## 6. The Painter Stack (Cosmology)

The constellation operationalizes the user's design cosmology. Each layer maps to an existing or near-existing module:

| Layer | Role | Engine | OKLCh Channel |
|---|---|---|---|
| **Phonemes** | Colors (base palette) | `pcaChroma.js` (formant→OKLCh) | `h` (hue position) |
| **Allophones** | Tints (lightness/chroma modulation of fixed hue) | new: `allophoneTint.js` | `L`, `C` deltas |
| **Meaning** | Pigment (body, opacity) | TurboQuant semantic vector → opacity coefficient | alpha / saturation |
| **Syntax** | Arbiter (legality + gravity) | scroll analyzer + `turboqa.js` legality gate | trajectory bend + commit veto |
| **CODEx** | Designer (final ratification) | `codex/core/ritual-prediction/run.js` | bytecode emission |
| **TurboQuant** | Painter (ballistic forecast) | `reranker.js` repurposed for forward projection | trajectory + landing point |

**Read this table top-down** as a render pipeline:
1. The phoneme contributes a hue.
2. The allophone modulates lightness/chroma.
3. The semantic weight sets opacity (meaningful words paint heavy).
4. Syntax bends the painter's trajectory and arbitrates legality at commit.
5. CODEx ratifies the final bytecode.
6. TurboQuant projects the next stroke forward into this composed space.

---

## 7. Architecture

```
[ Verse Context (textarea) ]
        │
        ├──> [ Pass 1: Graph Traversal → Candidate Frontier ]
        │           │
        │           ▼
        ├──> [ Pass 2: TurboQuant Painter (BALLISTIC) ]
        │           │
        │           ├──> compute predicted manifold position(s) for next stroke
        │           └──> emit forecast: {candidateId, oklchPoint, opacity, trajectoryVector}
        │                    │
        │                    ▼
        ├──> [ Syntax Arbiter ]
        │           │
        │           ├──> bend trajectory (gravity)
        │           └──> mark legal | illegal (arbiter)
        │                    │
        │                    ▼
        ├──> [ CODEx Designer ]
        │           │
        │           └──> ratify → emit bytecode → settle pigment
        │                    │
        │                    ▼
[ Rhyme Constellation Surface ]  ◀── re-renders provisional + ratified strokes
        │
        └──> user gesture: drag rhyme-family point
                    │
                    ▼
        [ Manifold Mutation Event ]
                    │
                    ├──> recompute PCA chroma overrides
                    └──> repaint all live verse
```

### Data flow contracts

- **Forecast Event** (TurboQuant → Constellation):
  ```ts
  {
    candidateId: string,
    rhymeKey: string,
    oklchPoint: { L: number, C: number, h: number },
    opacity: number,           // semantic weight from TQ similarity
    trajectoryVector: { dx: number, dy: number },  // direction-from-previous
    confidence: number,        // [0,1]
  }
  ```
- **Manifold Mutation Event** (Constellation → Engine):
  ```ts
  {
    rhymeFamily: string,
    oklchOverride: { L?: number, C?: number, h?: number },
    timestamp: number,
  }
  ```
- **Pigment Commit Event** (CODEx → Constellation):
  ```ts
  {
    forecastId: string,
    status: 'ratified' | 'rejected',
    bytecode: string | null,
  }
  ```

---

## 8. Module Breakdown

### New Modules (UI — Claude's jurisdiction)

| Module | Path | Role |
|---|---|---|
| `RhymeConstellation.jsx` | `src/components/Constellation/RhymeConstellation.jsx` | Top-level constellation surface |
| `ConstellationManifold.jsx` | `src/components/Constellation/ConstellationManifold.jsx` | OKLCh chroma plane renderer (SVG or Canvas) |
| `BallisticStroke.jsx` | `src/components/Constellation/BallisticStroke.jsx` | Single forecast stroke (provisional → ratified) |
| `ConstellationPoint.jsx` | `src/components/Constellation/ConstellationPoint.jsx` | Draggable rhyme-family point |
| `useBallisticForecast.js` | `src/hooks/useBallisticForecast.js` | Subscribes to TQ forecast events |
| `useManifoldMutation.js` | `src/hooks/useManifoldMutation.js` | Emits manifold-mutation events |
| `Constellation.css` | `src/components/Constellation/Constellation.css` | Styling, school-themed, reduced-motion-aware |

### New Modules (Engine — Codex/Gemini's jurisdiction)

| Module | Path | Role |
|---|---|---|
| `allophoneTint.js` | `src/lib/truesight/color/allophoneTint.js` | ΔL/ΔC modulators for allophonic variants |
| `ballisticForecast.js` | `codex/core/ritual-prediction/ballisticForecast.js` | Repurposes `rerankCandidates` for forward projection |
| `manifoldOverrides.js` | `codex/core/phonology/manifoldOverrides.js` | Stores user-authored OKLCh overrides per rhyme family |

### Schema Extensions (Codex)

- `bytecode.color` extended with `tonalAccent: { dL, dC, dh }` field — the user's authored modulation per rhyme family.
- `BytecodeError` codes:
  - `PB-ERR-v1-LINGUISTIC-CRIT-CONSTELL-0301` — manifold mutation produced ungazettable color (out of OKLCh sRGB gamut)
  - `PB-ERR-v1-VALUE-CRIT-CONSTELL-0302` — ballistic forecast confidence below floor (0.5)

---

## 9. Opt-In Contract

### State matrix

| `settings.truesightEnabled` | `settings.constellationEnabled` | Behavior |
|---|---|---|
| `false` | `false` | Pure verse. No color overlay, no manifold. Prediction, scoring, mechanics fully active. |
| `true` | `false` | Today's behavior. Word-level Truesight color overlay. No manifold. |
| `true` | `true` | Full grimoire. Words colored + manifold visible + ballistic strokes + manifold mutation enabled. |
| `false` | `true` | Conductor-without-orchestra mode. Manifold visible, words uncolored. Reachable only by opting into Constellation (which auto-enables Truesight) and then individually disabling Truesight. |

### Coupling rule (decided)

**Opting into the Constellation auto-enables Truesight.** Reasoning: the Constellation renders the law that governs word color; surfacing the law without surfacing what it governs is incoherent as a default. After opt-in, the user may individually disable Truesight to reach the conductor-without-orchestra mode if desired. Disabling Truesight does not disable the Constellation.

```
constellationEnabled: false → true   ⇒   truesightEnabled: (any) → true
constellationEnabled: true → false   ⇒   truesightEnabled: unchanged
truesightEnabled: true → false       ⇒   constellationEnabled: unchanged
```

### Engine invariants under opt-out

When `constellationEnabled === false`:

- `RhymeConstellation` does not mount; React tree contains no constellation node.
- `useBallisticForecast` does not subscribe; forecast event emitter has no listeners and may short-circuit emission.
- `manifoldOverrides.js` is not consulted; all rhyme-family colors resolve from default `pcaChroma.js` output.
- `tonalAccent` field in bytecode is read-only (cannot be authored), and existing values are honored only if they were authored during a prior opt-in session.
- Ritual prediction, TurboQuant rerank, syntax arbitration, CODEx ratification, scoring, and combat mechanics operate identically to current behavior.

### Discovery & first-launch

- Default: `constellationEnabled = false`.
- Discoverability surface: a single subtle invitation in the editor chrome labeled **"Witness the manifold"** (decided). Activating the invitation toggles `constellationEnabled = true` and auto-enables Truesight per the coupling rule. No modal interruption.
- First-launch tutorial activates only after explicit opt-in. Tutorial is gated, not pushed.
- Toggle persists via existing settings persistence (alongside `truesightEnabled`).
- ARIA label: `"Witness the manifold — reveal the rhyme constellation and the painter's trajectories"`.

---

## 10. Interaction Model

### The user's three primary acts

1. **Witness the painter** (passive)
   - As they type, ballistic strokes appear on the constellation showing where the painter forecasts the next word will land.
   - Strokes are low-opacity ghosts until ratified.
2. **Shape the manifold** (active)
   - User drags a rhyme-family point in OKLCh space. All live verse repaints. The painter's future forecasts now land in the new geometry.
   - Mutation persists in `manifoldOverrides.js` and surfaces in bytecode as `tonalAccent`.
3. **Witness ratification** (passive)
   - When the user types a word, syntax arbiter and CODEx ratify the matching forecast. Pigment settles to full opacity and migrates to the actual landed position.
   - Unratified forecasts dissipate.

### What the user does NOT do

- Pick colors directly.
- Place strokes manually.
- Override syntax legality.
- Bypass CODEx ratification.

---

## 11. Phased Rollout

| Phase | Scope | Acceptance |
|---|---|---|
| **1. Manifold Display (Read-Only)** | Render OKLCh chroma plane with rhyme-family points from existing PCA data. No interaction. | Plane renders; points correspond to `pcaChroma.js` output; reduced-motion respected. |
| **2. Ballistic Forecast Visualization** | Subscribe to TQ forecast events, render ghost strokes. | Strokes appear within 50ms of keystroke; opacity reflects TQ confidence. |
| **3. Syntax Arbitration Visualization** | Show trajectory bend (gravity) and rejection (arbiter veto) as visible motion. | Illegal candidates visibly fall away; legal candidates settle. |
| **4. Manifold Mutation (Active)** | Drag rhyme-family points; verse repaints. | Drag persists in bytecode; live verse reflows colors; ruler test passes. |
| **5. Tonal Accent Persistence** | Mutations save to user's bytecode profile. | Mutations survive reload; export/import as `.constellation.json`. |

---

## 12. Acceptance Criteria

- [ ] **World-law connection** — every visible element on the constellation maps to a layer in the painter stack.
- [ ] **No RGB authorship** — no UI surface accepts a free color value.
- [ ] **Provisional pigment** — ballistic forecasts render at <0.5 opacity until ratified.
- [ ] **Determinism** — same verse + same constellation state → bit-identical render across reloads.
- [ ] **Sovereign Gate** — constellation state lives entirely in client; manifold mutations sync via existing collab persistence; no third-party color service.
- [ ] **A11y** — constellation is keyboard-navigable (rhyme-family points selectable via Tab); ARIA labels announce ballistic forecasts as "predicting [rhyme] with [confidence]% confidence."
- [ ] **Reduced motion** — when `prefers-reduced-motion`, strokes appear as static ghosts; no trajectory animation.
- [ ] **Memory** — constellation render cost ≤ 4MB heap for 50 rhyme families × 200 active strokes.
- [ ] **Visual regression** — new baselines in `tests/visual/constellation/` cover empty, populated, mutated states.

---

## 13. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Drag-induced color drift causes verse to repaint mid-typing → caret stasis regression. | Manifold mutations route through the same Typing Freeze guard as Truesight overlay; no repaint during keystroke bursts. |
| TurboQuant forecast confidence is low; ghost strokes flicker. | Confidence floor (0.5); below-floor forecasts not rendered. Bytecode error `CONSTELL-0302` if floor breached >5% of frames. |
| User expects RGB picking; world-law confusion. | First-launch tutorial: "You do not pick colors. You shape the manifold colors come from." Tutorial gated behind `?firstLaunch=true`. |
| Steam Deck render perf degrades with >100 active strokes. | Stroke pool with LRU eviction; hard cap at 200 simultaneous strokes; profile against the existing 0.41MB Sovereign baseline. |
| OKLCh→sRGB gamut clipping makes mutated points unrepresentable. | Clamp to in-gamut on mutation; emit `CONSTELL-0301` on attempted out-of-gamut drag; visualize gamut boundary as a soft halo. |
| Forecast latency exceeds keystroke cadence. | Reuse existing reranker latency budget (<12ms for 200 candidates); ballistic projection is a compute additive of <2ms. |

---

## 14. Visual Regression / QA Hooks

- New baselines: `tests/visual/constellation/empty.png`, `populated.png`, `mutated.png`, `provisional-stroke.png`, `ratified-stroke.png`.
- Scripted scenario: type a known verse; capture forecast events; assert deterministic OKLCh points within ε=0.001.
- Verify via existing TurboQA gate (`scripts/verify_turboqa.js`) that ballistic forecasts respect the 0.85 overlap floor with graph baseline.

---

## 15. Decisions & Open Questions

### Decided (2026-05-08)

1. **Truesight ↔ Constellation coupling — DECIDED.** Opting into the Constellation auto-enables Truesight. User may individually disable Truesight afterward to reach conductor-without-orchestra mode. Specified in §9 Coupling Rule.
2. **Commit model — DECIDED.** Provisional pigment (Option C). Ballistic strokes render at <0.5 opacity and settle to full opacity only after syntax arbitration and CODEx ratification. Unratified strokes dissipate.
3. **Toggle copy — DECIDED.** "Witness the manifold." Grimoire register. Specified in §9 Discovery & first-launch.

### Still open

4. **Allophone surfacing.** Are allophones rendered as visible micro-strokes around each phoneme, or invisibly modulating the parent stroke's L/C? Recommended: **invisible modulation** until phonological inventory justifies surfacing.
5. **Syntax-as-arbiter behavior.** Hard veto (illegal forecasts vanish) or continuous gravity (illegal forecasts pulled toward legal ones)? Recommended: **gravity at trajectory, arbiter at commit**.
6. **Manifold persistence scope.** Per-user, per-school, per-verse, or global? Recommended: **per-user with per-school dialects**.
7. **3D upgrade.** When does the chroma plane become a chroma volume (full OKLCh)? Defer until phonological inventory or stroke density demands it.

---

## 16. Related Documents

- [TurboQuant Service Manual](../TURBOQUANT-SERVICE-MANUAL.md)
- [TurboQuant Integration Bridge PDR](./turboquant_integration_bridge_pdr.md)
- [Adaptive Palette PDR](./adaptive_palette_pdr.md)
- [Overlay Integrity Contract](../../../ARCH_CONTRACT_OVERLAY_INTEGRITY.md)
- [Phonosemantic Graph Architecture](../../architecture/PHONOSEMANTIC_GRAPH_ARCHITECTURE.md)

---

*Document Version: 0.2 (Proposed) | Authored: 2026-05-08 | Last Updated: 2026-05-08 | Cosmology Author: Damien Page*

*Changelog:*
- *0.1 — Initial draft. Five-layer cosmology operationalized.*
- *0.2 — Three sovereign calls folded in: Truesight auto-enables on Constellation opt-in; provisional pigment confirmed as commit model; toggle copy fixed as "Witness the manifold."*
