# PDR: ScholoCandy — 21st Century Evolution

**Subtitle:** A parametric EQ whose curve is a phonetic ritual, whose preset is a scroll, whose DSP is a chambered synth — built once, surfaced everywhere.

**Status:** Draft
**Date:** 2026-06-07
**Classification:** Architectural · UI + Rendering · DSP · Persistence · World-Law
**Priority:** High
**Primary Goal:** Promote `ScholoCandy` from a working 6-band RBJ cookbook EQ (VST/CLAP + a draggable-node React overlay) to a **studio-grade, school-themed, preset-as-bytecode, accessible, oversampled, mid/side, spectrum-aware, A/B-able, unbypassable-per-band parametric** instrument that still matches the Web Audio `BiquadFilterNode` to ≤ 1e-5 dB across the audible band — and **is unmistakably Scholomance**.

**Bytecode Search Code:** `SCHOL-ENC-BYKE-SEARCH-PDR-SCHOLOCANDY-21ST`

**Owners**
- Codex — DSP module (`vst/scholo-candy/src/dsp/`), schema (`scholo-candy-eq.schema.json` v2), preset persistence route, prescan parity fixtures.
- Claude — `src/components/ParaEQ/**` rewrite, Framer Motion surfaces, school theming, ARIA, baseline captures in `tests/visual/`.
- Gemini — Vitest parity + golden fixtures, Playwright a11y + visual regressions, `npm run dead:scan` cleanup, CI enforcement.
- Nexus — cross-platform crash repros (clap-validator, carla, REAPER, Ableton).
- Unity — encyclopedia PIR + cross-link into `PARAEQ_PLUGIN.md` (if/when revived) and `PDR-2026-06-05-SONIC-EXCHANGE-NATIVE-LISTENING.md`.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Audit Findings — What `ScholoCandy` Actually Is Today](#2-audit-findings--what-scholocandy-actually-is-today)
3. [Change Classification](#3-change-classification)
4. [Spec Sheet](#4-spec-sheet)
5. [Assumptions and Unknowns](#5-assumptions-and-unknowns)
6. [Architecture / File Map](#6-architecture--file-map)
7. [Core Concept — The Phonetic Parametric](#7-core-concept--the-phonetic-parametric)
8. [Step-by-Step Implementation Plan](#8-step-by-step-implementation-plan)
9. [Code Examples (one per major step)](#9-code-examples-one-per-major-step)
10. [Glossary](#10-glossary)
11. [Q&A — Top 10 Most Confusing Implementation Concerns](#11-qa--top-10-most-confusing-implementation-concerns)
12. [QA Plan — Tests, Files, Commands, Examples](#12-qa-plan--tests-files-commands-examples)
13. [Regression Risks and Retest Checklist](#13-regression-risks-and-retest-checklist)
14. [Rollout Plan (Incomplete-But-Safe)](#14-rollout-plan-incomplete-but-safe)
15. [Definition of Done](#15-definition-of-done)
16. [Final Architectural Verdict](#16-final-architectural-verdict)

---

## 1. Executive Summary

`ScholoCandy` ships as a real `nih_plug` VST3 + CLAP (`vst/scholo-candy/target/bundled/scholo_candy.{vst3,clap}`) and as a React overlay on `ListenPage` (`src/pages/Listen/ListenPage.tsx:300`). It is functionally a 6-band parametric EQ using the Bristow-Johnson RBJ biquad cookbook. Web Audio parity is verified by `vst/scholo-candy/tests/dsp_parity.rs` against `vst/scholo-candy/golden/web_eq_snapshots.json` to ≤ 1e-4 (the doc says 1e-5; the test uses 1e-4 — see Q1).

**What is wrong for 2026:**

| Area | Today | 21st Century |
|---|---|---|
| Filter topology | RBJ direct-form biquad, no oversampling | TPT state-variable (Zölzer/Chamberlin/Simper) with optional 2×/4×/8× oversampling for ≥ +18 dB / Q ≥ 10 bands |
| Band count | Hard-coded to 6 (`vst/scholo-candy/src/params.rs:13-47`) | Schema-driven 1–12 (`scholo-candy-eq.schema.json` already says so) |
| Filter types | 6 (bell, low/high shelf, LP, HP, notch) | 6 + TPT-SVF low-pass/high-pass + band-pass + all-pass + tilt (10 total) |
| Stereo | Always stereo L/R summed | Per-band Link, M/S split, L-only, R-only with channel-color glyphs |
| Editor | `egui::CentralPanel` with a 400-step curve, 6 nodes, drag-to-move freq/gain, mouse-wheel does nothing | Live host FFT overlay, type selector, Q wheel, per-band bypass, A/B, undo/redo, preset browser, school-colored band rings |
| Web side | Hard-coded gold nodes (`ParaEQOverlay.tsx:174-188`) | School-themed ring, school glyph, type icon, Q tooltip, semitone snap, TrueSight mode |
| Persistence | In-memory React state, no preset save/load | Backend `POST /api/eq/presets` + `GET /api/eq/presets/:id`; native side reads/writes `~/Library/.../ScholoCandy/` |
| World-law | Name only | Bands are "conjurings" — each band type maps to a school; presets are "scrolls" with verse names; the spectrum analyzer is the "TrueSight array" |
| A11y | None (no ARIA, no keyboard) | Full keyboard nav, screen reader, reduced-motion aware, focus ring per `W3C ARIA Authoring Practices` |
| Codegen | 4 Python scripts (`generate_*.py`, `dsp_update.py`) literally overwrite Rust source files | Deleted; replaced by hand-written, code-review-able Rust |
| Tests | 1 Rust test (parity), 1 no-NaN test, no Web tests | Rust parity for **all** types, WebAudio cross-impl, Web RTL test, Playwright a11y + visual regression |
| Telemetry | None | Deterministic 1-sample/parameter `BIT` bytecode for save/load |
| Discovery | None | 5 factory "Scrolls" (one per school) ship as `factory_scrolls/*.json` |

**Two PDRs this touches:** the **Sonic Exchange** (`PDR-2026-06-05-SONIC-EXCHANGE-NATIVE-LISTENING.md`) — `ScholoCandy` presets become first-class attachable artifacts on a track; and the **GrimDesign** engine (`grimdesign_pdr.md`) — preset name, school bias, and dominant token drive the band-color computation.

**Two PDRs this does NOT touch:** Truesight compiler shape (`SCHEMA_CONTRACT.md` v1.24) and VerseIR amplifiers. The plugin stays a pure DSP/runtime surface; the analyzer pipeline stays authoritative.

---

## 2. Audit Findings — What `ScholoCandy` Actually Is Today

Every claim below is grounded in a real file in the repo.

### 2.1 Rust plugin (audited, `vst/scholo-candy/src/`)

```
src/
├── lib.rs                # 3 lines; pub mod dsp / params / plugin
├── params.rs             # 203 lines; 6 hard-coded b{1..6}_{en,type,freq,gain,q}
├── plugin.rs             # 274 lines; Plugin + ClapPlugin + Vst3Plugin impl
└── dsp/
    ├── mod.rs            # 68 lines; ScholoCandyEq with 6 hardcoded bands
    ├── filter_band.rs    # 187 lines; FilterBand + FilterType enum (6 variants)
    ├── biquad.rs         # 70 lines; BiquadCoeffs + BiquadState (DF-I)
    └── smoothing.rs      # 54 lines; SmoothedParam with linear ramp
```

- **Band count is hard-coded twice** (`params.rs:13-47` and `dsp/mod.rs:16-23`). The schema permits 1–12, the code does not.
- **Filter types**: 6 (Bell, LowShelf, HighShelf, LowPass, HighPass, Notch) in `filter_band.rs:5-25`.
- **Coefficient derivation**: textbook RBJ at `filter_band.rs:84-159`. Biquad is direct-form I with denormal protection at `biquad.rs:56-64`. The `magnitude_response` math at `biquad.rs:22-42` is the closed-form evaluation `|H(e^jω)|² = (N_re² + N_im²)/(D_re² + D_im²)`.
- **Smoothing**: `SmoothedParam` is a 1-pole linear ramp in `smoothing.rs`. `params.rs:62,72,79,85,...` wires `SmoothingStyle::Linear(5.0)` (5 ms) on every FloatParam. Q is smoothed too, which is **incorrect for "musical" feel** — Q transitions on a peak filter cause audible "glugging" (see Q4).
- **Editor**: `plugin.rs:42-175` opens an `egui::CentralPanel`, builds a temporary `ScholoCandyEq` *every frame* from the current param values, walks 400 steps to plot a magnitude curve, and supports drag-on-node for freq/gain. Q is not editable in the GUI at all. There is **no analyzer overlay**, **no per-band type selector**, **no preset UI**, **no A/B**, **no bypass toggle**, **no undo/redo**, **no parameter text field**, and **no save state hint**.
- **Process loop**: `plugin.rs:199-257`. Bands are processed in series (L/R summed per band), then a final `output_gain_db` is applied per sample (`dsp/mod.rs:47-67`). There is **no oversampling**, **no M/S**, **no linked/unlinked stereo**, **no lookahead**, **no sidechain**.
- **Test coverage**: `tests/dsp_parity.rs:37-67` only checks Bell + LowPass + HighPass against the JS golden. Shelf, Notch, and the magnitude response numbers are **not** parity-checked (the magnitude array in `web_eq_snapshots.json` is `#[allow(dead_code)]` at `tests/dsp_parity.rs:33-35`).
- **Error tolerance drift**: `golden/error_tolerance.md` declares 1e-5, the test uses 1e-4, the comment in `error_tolerance.md` says 0.1 dB, the impulse decay test (`tests/dsp_parity.rs:71-86`) only runs 1000 samples of silence (not 4096 like a real impulse).

### 2.2 The codegen anti-pattern (audited)

Four Python files *write* the Rust source:

- `generate_params.py` (69 lines) — writes `params.rs`.
- `generate_plugin.py` (112 lines) — writes `plugin.rs`.
- `generate_editor.py` (45 lines) — patches `plugin.rs` to add a placeholder `editor()`.
- `generate_editor_ui.py` (151 lines) — replaces the `editor()` body with the real GUI.
- `dsp_update.py` (52 lines) — patches `dsp/biquad.rs` and `dsp/mod.rs` to add `magnitude_response`.

`generate_editor_ui.py` already has stale code that disagrees with the current `plugin.rs` (e.g. `setter.set_parameter(*f_param, ...)` against a `&FloatParam` while the real call site uses `f_param.clone()`). It worked once. Running it again would corrupt `plugin.rs`. **They are write-once scaffolds masquerading as a build pipeline.** All four scripts are deleted in Phase 0.

### 2.3 Web overlay (audited, `src/components/ParaEQ/`)

```
ParaEQ/
├── ScholoCandy.tsx           # 45 lines; passthrough <SpectrumCanvas> + <ParaEQOverlay>
├── ParaEQOverlay.tsx         # 195 lines; gold dots, drag = freq+gain, wheel = Q, right-click = remove
└── SpectrumCanvas.tsx        # 230 lines; 2D canvas, log-freq grid, school-hued ghost curves, hard-coded colors
```

- **Props are `any[]`** (`ScholoCandy.tsx:10-14`, `ParaEQOverlay.tsx:3-9`). No type safety.
- **Default band type** is `peaking` (`ambientPlayer.service.js:2047`) but the schema enum says `bell`. Web Audio `createBiquadFilter().type` accepts `peaking`; the Rust enum (`filter_band.rs:7`) is `bell`. **Type names diverge.**
- **`onAddBand` returns a string id** but the implementation generates it via `Math.random().toString(36).substr(2,9)` (`ambientPlayer.service.js:2046`). **Not deterministic. Not idempotent.** Reload the page during a debounced add → second add collides or splits.
- **`onAddBand` shape is `Partial<EqBand>`** but the service does `...band` and trusts caller not to send a `id` — caller-supplied `id` is silently overridden. There is no allow-list of fields.
- **No preset save/load, no A/B, no bypass per band, no analyzer overlay, no type indicator on the node**.
- **SpectrumCanvas is a `useRef`/`useEffect`/`requestAnimationFrame` loop** that reallocates a `new Float32Array(W)` per frame (`SpectrumCanvas.tsx:167-176`) and calls `getFrequencyResponse` per band, per pixel (`SpectrumCanvas.tsx:181-186`). On 1× display retina this is 6 × 1920 = 11,520 calls per frame. Wasted: the curve could be computed once per state change.
- **Hard-coded colors**: gold `rgba(201,162,39,…)`, white `rgba(255,255,255,0.8)`, school colors read from `SCHOOLS` (`SpectrumCanvas.tsx:14-19`). The hard-coded white gradient on the EQ response curve is not in the school palette.
- **No `Z_*` semantic tiers** (`ScholoCandy.tsx:29`). Law 10 violation: `zIndex: 10` is used in `ParaEQOverlay.tsx:186` directly.
- **No `prefers-reduced-motion`**: the 60-fps `requestAnimationFrame` loop runs even when the user has reduced motion set. Law requires the hook.
- **No `useId` for ARIA**: each band node has a numeric label but no `aria-label` and no keyboard handler. `onContextMenu` is `e.preventDefault()` only — no help text.
- **No Framer Motion**: the overlay is plain `<div>`s. The scholoCandy widget is supposed to feel like a *ritual surface*. It feels like a `<div>`.
- **Untyped `eqNodes: any[]`** in `SpectrumCanvas.tsx:9`. The TypeScript compiler is fully opted-out for this file.

### 2.4 Audio wiring (audited, `src/lib/ambient/ambientPlayer.service.js`)

- Line 294-334: `createBiquadFilter()` for the *tuning* white-noise crackle. Untouched by EQ.
- Line 590-617: `applyEqState(bands)` walks the bands, creates a new `BiquadFilterNode` if id not seen, sets `type`, schedules `setTargetAtTime(..., 0.01)` on freq/gain/Q.
- Line 2044-2078: state mutations. No persistence. No preset CRUD.
- Line 1623: `applyEqState(state.eqBands)` is called once on init. State is otherwise lost on page reload — there is **no localStorage hydration** of `eqBands`.

### 2.5 Schema, golden, tolerances (audited)

- `vst/scholo-candy/scholo-candy-eq.schema.json` v1: title `ScholoCandyEqPreset`, `version: 1`, 1–12 bands, six types. Solid. **Not used by anyone** at runtime.
- `vst/scholo-candy/golden/web_eq_snapshots.json`: 6 fixtures. Three types. No magnitude response is checked in CI.
- `vst/scholo-candy/golden/error_tolerance.md`: 1e-5 / 0.1 dB / bounded impulse. **Three different tolerances declared; the test uses 1e-4.** Q5.

### 2.6 The brand gap

The name "ScholoCandy" appears in 7 places (Rust plugin name, two package comments, the React component, ListenPage import, and `PARAEQ_PLUGIN.md` is missing from the repo — referenced in `AGENTS.md:465` but not present). The visual identity is gold-on-leather and that is **it**. There is no school-themed band color, no school-aware preset, no verse-named band, no spectrum analyzer that responds to the active school, no mention of the five `SCHOOLS` from `src/data/schools.js` anywhere in the EQ. It looks like a stock skeumorphic EQ with a renamed brand. **This is the lowest-hanging 21st-century fruit.**

---

## 3. Change Classification

```
[ ] Cosmetic only
[x] Structural   (DSP module split, codegen deletion, editor rewrite, server route)
[x] Behavioral   (new filter types, oversampling, M/S, A/B, undo/redo, presets)
[x] Architectural (schema v2, preset-as-bytecode, school theming contract, port of VST3↔Web parity)
```

This PDR touches **all four layers** of CODEx. It is not a UI facelift. It is a re-spec.

---

## 4. Spec Sheet

### 4.1 Functional Spec (what the user can do)

| ID | Capability | Acceptance |
|---|---|---|
| F-1 | Add up to 12 bands, each with type/freq/gain/Q/bypass | Max 12 enforced; UI hides "Add Band" when at max |
| F-2 | 10 filter types: Bell, LowShelf, HighShelf, LowPass, HighPass, Notch, BandPass, AllPass, Tilt, TPT-LP/HP (pair) | Each type has ≥ 1 golden fixture |
| F-3 | Per-band stereo: Stereo (linked) · Mid · Side · L · R | Channel glyph on node; channel-specific gain readout |
| F-4 | Per-band oversample 1×/2×/4×/8× (auto on high-gain/high-Q) | CPU meter shows 0–200% on plugin status bar |
| F-5 | Live host FFT overlay (24 ms, 4096-pt Hann, peak-hold 2 s) | Toggle in editor; respects `prefers-reduced-motion` (static bars only) |
| F-6 | Per-band bypass with "Rite of Bypass" ink-wipe animation | Bypassed bands ghost out 240 ms (120 ms reduced-motion) |
| F-7 | A/B compare (state A, state B, swap) | `Cmd/Ctrl+B`; persists in plugin state |
| F-8 | Undo / Redo (32 steps) | `Cmd/Ctrl+Z` / `Cmd/Ctrl+Shift+Z` |
| F-9 | Preset browser — 5 factory "Scrolls" + user presets | Scrolling, search, "Forge Scroll" (save as) |
| F-10 | Drag a verse word onto the canvas to spawn a band tuned to its vowel family (TrueSight) | Requires `analyzedWords` from `usePhonemeEngine`; band is named after the word |
| F-11 | Numeric inputs: type, freq Hz, semitone snap, gain dB, Q | Right-click on node opens inspector |
| F-12 | Web overlay matches VST plugin: same band list, same curve, school color, ARIA | No drift between platforms |
| F-13 | LUFS-I / True-Peak / Correlation metering on the master | -23 LUFS-I reference; reads from host or `AudioContext` analyser |
| F-14 | Per-band drag-handle size grows on hover, contracts on idle | Touch-action: none; pointer-capture |
| F-15 | Keyboard nav: Tab cycles bands, arrows nudge by step, [ / ] cycles type | Full keyboard parity with mouse |

### 4.2 Non-Functional Spec

| Area | Target |
|---|---|
| Round-trip latency | < 4 ms at 48 kHz, 1× OS, 6 bands |
| CPU at 12 bands, 4× OS, M/S engaged | ≤ 1.5× single Steinberg VariFilter (M1) |
| Memory | ≤ 12 MB plugin process, ≤ 8 MB web heap |
| A11y | WCAG 2.2 AA, axe-clean in `npm run test:visual` |
| Visual stability | 0 layout shift between playing/not-playing; 0 CLS during band add |
| Determinism | Same preset file → identical coefficients, identical curve, identical bytes (SHA-256 in fixture header) |
| Stability | 0 NaN over 10-minute pink-noise @ 0 dBFS, 24 dB boost at 1 kHz Q=18 |
| Bundle size (web) | +28 KB gzipped for new overlay code; SpectrumCanvas split into chunk via React.lazy |
| Pre-existing perf | Existing SpectrumCanvas `requestAnimationFrame` loop capped at 30 fps; 4× retina is 1.5 ms/frame budget |

### 4.3 Contracts

```ts
// vst/scholo-candy/scholo-candy-eq.schema.json — version 2
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ScholoCandyEqPreset",
  "type": "object",
  "required": ["version", "schema_id", "name", "school", "output_gain_db", "bands"],
  "properties": {
    "version":      { "type": "integer", "const": 2 },
    "schema_id":    { "type": "string",  "const": "scholomance/eq-preset" },
    "name":         { "type": "string",  "minLength": 1, "maxLength": 80 },
    "school":       { "type": "string",  "enum": ["SONIC", "PSYCHIC", "VOID", "ALCHEMY", "WILL", "NEUTRAL"] },
    "output_gain_db":{ "type": "number", "minimum": -36, "maximum": 36 },
    "bands":        { "type": "array",   "minItems": 1, "maxItems": 12, "items": { "$ref": "#/definitions/band" } },
    "oversample":   { "type": "string",  "enum": ["1x", "2x", "4x", "8x"], "default": "1x" },
    "analyzer":     { "type": "object",  "properties": { "enabled": { "type": "boolean" }, "peak_hold_ms": { "type": "number" } } },
    "bytecode":     { "type": "string",  "pattern": "^BIT-EQ-v1-[a-f0-9]{8}$" },
    "checksum":     { "type": "string",  "pattern": "^[a-f0-9]{64}$" }
  },
  "definitions": {
    "band": {
      "type": "object",
      "required": ["id", "type", "frequency", "gain", "Q", "channel", "oversample", "bypass"],
      "properties": {
        "id":         { "type": "string",  "pattern": "^band_[a-z0-9]{12}$" },
        "type":       { "type": "string",  "enum": ["bell","lowShelf","highShelf","lowPass","highPass","notch","bandPass","allPass","tilt"] },
        "frequency":  { "type": "number",  "minimum": 20, "maximum": 20000 },
        "gain":       { "type": "number",  "minimum": -36, "maximum": 36 },
        "Q":          { "type": "number",  "minimum": 0.05, "maximum": 24 },
        "channel":    { "type": "string",  "enum": ["stereo","mid","side","L","R"], "default": "stereo" },
        "oversample": { "type": "string",  "enum": ["1x","2x","4x","8x","auto"], "default": "auto" },
        "bypass":     { "type": "boolean", "default": false }
      }
    }
  }
}
```

`band.id` becomes `band_<12char base32>` (generated by a deterministic seeded `getRandomValues`-equivalent — never `Math.random` — see Q3). `bytecode` is a content-hash of the canonicalized preset bytes using the `BIT` (Bytecode Immortal Trace) family reserved for runtime artifacts (analogous to `PB-PRED-v1` for prediction artifacts). The `checksum` is SHA-256 of the same bytes for the transport layer.

### 4.4 Out of Scope (will not be built in this PDR)

- Plugin-side mid/side encoding of host audio where the host does not provide M/S busses (M/S will require host cooperation or a wrapper — see Q7).
- Linear-phase mode (FIR). Documented as a v3 follow-up.
- AAX / RTAS / Audio Units (macOS) — v3 follow-up. CLAP+VST3 only.
- Cloud preset marketplace (Sonic Exchange PDR territory; presets are *uploaded* there, not *bought*).
- New phoneme analysis (the analyzer reuses the existing engine adapter and `usePhonemeEngine` hook).

---

## 5. Assumptions and Unknowns

| # | Assumption | What we do if wrong |
|---|---|---|
| A-1 | The `paraeq-spectrum-canvas` className in `SpectrumCanvas.tsx:226` is only used inside `ListenPage`; not relied on by other CSS files. | Grep verifies. If not, the new `.scholomance-candy__spectrum` is layered on, not a rename. |
| A-2 | The `Math.random` ID generator can be swapped to a deterministic seeded RNG without breaking stored state (there is **no** persisted state today). | Confirmed by the absence of any `localStorage.setItem("eqBands"…)` in the codebase. If found, the migration is "discard and start fresh" with a notice. |
| A-3 | The host's CLAP feature set in 2026 supports `audio-ports-config` and `event-param-mod` extensions used by the new oversample and M/S nodes. | Degrade: if absent, M/S falls back to L/R-only, oversample to 2×. |
| A-4 | `usePrefersReducedMotion` exists as a hook in `src/hooks/`. | Grepped — yes (`src/hooks/usePrefersReducedMotion`). |
| A-5 | The `VOWEL_FAMILY_TO_SCHOOL` map in `src/data/schools.js` is the canonical ARPAbet → school mapping and is safe to consume from this PDR. | It is referenced by `AGENTS.md:141` as canonical. If it ever moves, we follow. |
| A-6 | The active `SCHEMA_CONTRACT.md` v1.24 does not need a new clause for `ScholoCandyEqPreset` because the preset is a *payload*, not a *server round-trip contract*; a new `SCHEMA CHANGE NOTICE` is still required to register `BIT-EQ-v1`. | Add the notice in the PDR appendices and request Angel sign-off before merge. |
| A-7 | The frontend has access to the `VaelrixSchema` types or the equivalent TypeScript surface. | If absent, types are declared in `src/components/ParaEQ/types.ts` (a new file, owned by Claude). |
| A-8 | `React.lazy` for the new SpectrumCanvas is acceptable (already used in `phaser-lazy-load.spec.js`). | Confirmed by `playwright.config.js` setup. |

**Unknowns (escalated to Angel if/when surfaced):**
- Whether the EQ should write its own band-IDs to `localStorage` for crash-resume (default: yes, opt-out via a setting).
- Whether the band glyph icons should come from the PixelBrain font (`docs/.../pixelbrain_font_audit_bytecode_pdr.md`) or a new icon set.
- Whether "Tilt" should be a single-band control or always span the spectrum. (Default: single band, slope in dB/oct.)

---

## 6. Architecture / File Map

```
vst/scholo-candy/
├── Cargo.toml                                  ← bumped to 0.2.0; remove "assert_process_allocs" default-on
├── xtask/                                      ← unchanged
├── scholo-candy-eq.schema.json                 ← v2; version + schema_id + school + bytecode + checksum
├── golden/
│   ├── error_tolerance.md                      ← single source of truth: 1e-5 / 0.1 dB / bounded
│   ├── web_eq_snapshots.json                   ← expand to 18 cases (3 gains × 3 Q × 2 freq × 3 types) + magnitude asserted
│   ├── scholocandy_dsp_snapshots.json          ← new: Rust-only magnitude + impulse response golden
│   └── factory_scrolls/                        ← new: VOID, SONIC, WILL, ALCHEMY, PSYCHIC + NEUTRAL
│       ├── void_undertow.scroll.json
│       ├── sonic_lattice.scroll.json
│       ├── will_iron.scroll.json
│       ├── alchemy_liquid.scroll.json
│       ├── psychic_aurora.scroll.json
│       └── neutral_flat.scroll.json
├── src/
│   ├── lib.rs                                  ← pub mod dsp; pub mod params; pub mod plugin; pub mod codec; pub mod bands;
│   ├── dsp/
│   │   ├── mod.rs                              ← ScholoCandyEq with bands: Vec<FilterBand>; oversample, m/s
│   │   ├── filter_band.rs                      ← FilterType (10 variants), FilterBand.process_block
│   │   ├── topology/
│   │   │   ├── mod.rs                          ← trait Topology { coeffs, process, magnitude }
│   │   │   ├── rbj.rs                          ← RBJ cookbook (existing, now behind feature "rbj")
│   │   │   ├── tpt_svf.rs                      ← Andy Simper TPT state-variable, 2-pole
│   │   │   └── tilt.rs                         ← Andrew Simper / EarLevel tilt shelf
│   │   ├── oversample.rs                       ← polyphase FIR 2×/4×/8×; auto: gain*Q-driven
│   │   ├── ms.rs                               ← M/S encode/decode; per-band channel target
│   │   ├── codec.rs                            ← preset <-> JSON, <-> bytecode
│   │   └── test_util.rs                        ← band factory helpers for parity tests
│   ├── bands.rs                                ← BandIndex (1..=12), BandCatalog (default names, school mapping)
│   ├── params.rs                               ← dynamic: bands generated from `BandCatalog::count` at startup
│   ├── plugin.rs                               ← editor: live FFT overlay, type selector, A/B, undo/redo, preset browser
│   └── smoothing.rs                            ← SmoothingStyle::Perceptual (5 ms gain, 15 ms freq, *no* Q smoothing)
└── tests/
    ├── dsp_parity.rs                           ← assert ALL 10 types × 4 sample rates × 3 Q × 2 gains
    ├── dsp_stability.rs                        ← 10-min pink noise, 24 dB/Q=18, 0 NaN
    ├── dsp_latency.rs                          ← N=48000 sample buffer; report latency = max(0, 48000 - true_tail)
    ├── dsp_oversample.rs                       ← THD+N sweep; assert 1× ≥ −60 dB; 4× ≥ −90 dB
    ├── preset_codec.rs                         ← round-trip JSON, round-trip bytecode, checksum stability
    └── golden_compat.rs                        ← web_eq_snapshots.json ↔ scholocandy_dsp_snapshots.json

src/components/ParaEQ/
├── ScholoCandy.tsx                              ← typed props, React.lazy inner, ARIA root, school-tinted
├── ParaEQOverlay.tsx                            ← school-colored band ring, type glyph, Q tooltip, A/B, undo, numeric
├── SpectrumCanvas.tsx                           ← rewritten: <canvas> + Framer Motion <motion.canvas>, school-aware
├── types.ts                                     ← EqBand, EqPreset, EqChannel, EqType, EqBandsState
├── hooks/
│   ├── useEqBands.ts                            ← deterministic id, validate, dispatch
│   ├── useEqPreset.ts                           ← save/load factory+user presets
│   ├── useEqA11y.ts                             ← keyboard nav, focus ring, screen-reader announcements
│   └── useSchoolTint.ts                         ← band-color from school weights (consumes GrimDesign helpers)
├── presets/
│   └── factoryScrolls.ts                        ← static import of JSON via Vite glob (`import.meta.glob`)
└── __tests__/
    ├── ScholoCandy.a11y.test.tsx                ← jest-axe
    ├── ParaEQOverlay.interactions.test.tsx      ← RTL: drag, wheel, right-click, keyboard
    └── ScholoCandy.fixture.test.tsx             ← snapshot of computed response curve

codex/server/routes/
└── eqPresets.routes.js                          ← POST/GET/DELETE /api/eq/presets
                                                  (Codex-owned schema, Gemini-owned impl+tests)

src/data/schools.js                              ← UNCHANGED; consumed, not modified

codex/runtime/eventBus.js                        ← new event names (registered):
  - "ui:eq:preset_saved"
  - "ui:eq:preset_loaded"
  - "ui:eq:band_added"
  - "ui:eq:band_removed"
  - "ui:eq:a_b_swapped"

src/lib/ParaEQ/
└── presetAdapter.js                             ← preset <-> localStorage; hydrates on ListenPage mount
```

### 6.1 Module dependency graph

```
ScholoCandy.tsx
   ├── ParaEQOverlay
   │     ├── useEqBands
   │     ├── useEqA11y
   │     └── useSchoolTint
   ├── SpectrumCanvas (lazy)
   └── useEqPreset
         └── presetAdapter.js ↔ codex/server/routes/eqPresets.routes.js

plugin.rs
   ├── params.rs → bands.rs (BandCatalog, dynamic count)
   └── dsp/
        ├── mod.rs (ScholoCandyEq)
        ├── filter_band.rs (FilterType enum, FilterBand)
        ├── topology/{rbj, tpt_svf, tilt}.rs (impl Topology)
        ├── oversample.rs (PolyphaseOversampler)
        ├── ms.rs (MidSideRouter)
        └── codec.rs (PresetCodec)
```

No circular deps. The web side and the Rust side share **only** the schema and a small set of test vectors (the same `golden/factory_scrolls/*.json` files load into both via a Rust test and a Vitest test).

---

## 7. Core Concept — The Phonetic Parametric

**Insight.** The world of Scholomance is a spell world where words are weapons and vowels are schools. A parametric EQ already has the same anatomy: a series of band-shaped *conjuries* on a frequency axis, each with a center, a weight, a quality, a channel target. The 21st-century move is to **let the spellbook inform the EQ**:

- **A band is a conjury.** Its color is the school color of its dominant vowel family (computed by the existing `computeSchoolWeights` in `src/data/schools.js`). A "low shelf" at 100 Hz on a VOID band gets zinc-cool. A "bell" at 1 kHz on a WILL band gets iron-orange.
- **A preset is a scroll.** It is a verse-named JSON file with a checksum, a `BIT-EQ-v1` bytecode, and a school. The "Forge Scroll" UI is the save dialog. "Inscribe" applies it.
- **The spectrum analyzer is the TrueSight array.** It uses the same color tokens and the same vowel → hue mapping as the IDE's `usePhonemeEngine` (per `AGENTS.md:141`). When `isPlaying && detectedSchoolId === band.school`, the band ring pulses with a 4-beat envelope (200 ms peak, 1.6 s rest).
- **Drag a verse word onto the canvas to conjure a band** (F-10). The band's center is the *centroid* of the word's vowel energy in Hz, the Q is the inverse of the *vowel family dispersion* (tight vowels = high Q, spread vowels = low Q), the gain defaults to 0, and the name is the word itself. This is the literal Truesight casting spell.
- **Conjure v2.** A right-click "Invoke" menu on a band opens an in-world dialog: "Which school shall bind this band?" Picking ALCHEMY morphs the band's color over 600 ms and adds a subtle 2% THD saturator post-filter. (Phase 2 feature.)

This concept re-anchors the EQ in the world-law (`AGENTS.md:10-20`) and earns every visual element.

---

## 8. Step-by-Step Implementation Plan

### Phase 0 — Codegen excision (Day 1, 0.5 day, Codex)

1. Run the four `.py` scripts to capture their **final** state of the Rust files (so we know what was generated).
2. Diff the generated state vs. the current on-disk state. Patch the on-disk state to match the captured generated state (so the deletion is no-op on behavior).
3. Delete `vst/scholo-candy/generate_params.py`, `vst/scholo-candy/generate_plugin.py`, `vst/scholo-candy/generate_editor.py`, `vst/scholo-candy/generate_editor_ui.py`, `vst/scholo-candy/dsp_update.py`.
4. Add a CI check `vst/scholo-candy/no_codegen.py` (under `tests/qa/`) that fails if any of those filenames exist in the directory. Reason: a future scaffolder will be tempted.

### Phase 1 — Schema v2 + codec skeleton (Day 1, 0.5 day, Codex)

5. Author `vst/scholo-candy/scholo-candy-eq.schema.json` v2 per §4.3.
6. Bump `Cargo.toml` to 0.2.0; declare `serde` derive on a new `Preset` struct.
7. Add `src/dsp/codec.rs` with `Preset::from_json`, `Preset::to_json`, `Preset::bytecode`, `Preset::checksum`. Determinism: canonicalize keys, use `BTreeMap`, fixed float precision (`{:.6}` for dB, `{:.3}` for Hz, `{:.3}` for Q).
8. Add `tests/preset_codec.rs` round-trip test (see §9.1).
9. Register a `SCHEMA CHANGE NOTICE` in `SCHEMA_CONTRACT.md` introducing `BIT-EQ-v1` as the EQ-preset bytecode family.

### Phase 2 — Dynamic band count (Day 2, 0.5 day, Codex)

10. Add `src/bands.rs` with `BandCatalog::count() -> usize` and a `default_presets() -> [&'static str; 6]`.
11. Refactor `params.rs`: instead of `b1_*` through `b6_*`, build the param set at startup with `for i in 0..BandCatalog::count()`.
12. Update `plugin.rs` `process()` to iterate the same loop.
13. **Adapter layer (Law 3):** wrap the param lookups behind `BandParamSet` so the test harness can drive them without `nih_plug`.
14. Add `BAND_COUNT` env-var override (max 12) for tests so we can run "1-band", "4-band", "12-band" sweeps.

### Phase 3 — Topology trait + TPT-SVF + tilt (Day 3-4, 2 days, Codex)

15. Define `topology::Topology` trait with `coeffs(freq, gain_db, q, sample_rate) -> Coeffs`, `process(x, state) -> y`, `magnitude_response(f, sample_rate) -> f32`.
16. Move the existing RBJ code into `topology::rbj` behind `cfg(feature = "rbj")`. Default to `rbj` so the VST3/CLAP bundle is unchanged for early returns.
17. Implement `topology::tpt_svf` (low-pass, high-pass, band-pass, all-pass, bell). Reference: Andy Simper, "The Simper EQ", Cytomic, 2014 — and the public-domain `simper-eq` reference code.
18. Implement `topology::tilt` — Andrew Simper / EarLevel "tilt filter" — a single coefficient pair that gives a ±N dB shelf at f and a mirrored shelf at f.
19. Update `FilterType` enum to 9 variants (keep the 6 existing + bandPass, allPass, tilt) and the schema to 9.
20. Per-band `topology: TopologyKind` field in `FilterBand`; default to `Rbj` (backward compatible).
21. Parity test: every new type against a Web Audio reference snapshot. (See §9.2.)

### Phase 4 — Oversampling (Day 5, 1 day, Codex)

22. Implement `oversample::PolyphaseOversampler` using a 2× half-band polyphase FIR (47-tap Blackman-windowed sinc, 90 dB stopband). Factor: 2, 4, 8. 8× is two cascaded 2×.
23. `ScholoCandyEq::process_block` now: for each band with oversample > 1×, route through the oversampler, process at the upsampled rate, downsample.
24. `oversample = "auto"` heuristic: if `|gain_db| > 12 || Q > 8` → 4×. Add a host-driven override.
25. Latency compensation: add `plugin::latency()` returning the oversampler delay (in samples). CLAP and VST3 hosts will compensate.

### Phase 5 — Mid/Side + per-band channel target (Day 6, 1 day, Codex)

26. `ms::MidSideRouter` with `encode(L,R) -> (M,S)`, `decode(M,S) -> (L,R)`. Pure functions, no state.
27. Per-band `channel: ChannelKind`. Stereo = no router. M = M only. S = S only. L = L only. R = R only.
28. The plugin's master stage always decodes back to L/R so the host sees stereo I/O. The plugin reports *no* layout change.
29. Channel glyph in the editor: ⌬ M, ⌭ S, ⇤ L, ⇥ R, ⇔ Stereo.

### Phase 6 — Editor rewrite (Day 7-9, 3 days, Claude + Codex)

30. Split `plugin.rs::editor()` into `editor/{layout,analyzer,band_node,preset_browser,a_b,undo,inspector}.rs`. Each is a self-contained function module.
31. **Analyzer overlay** — request the host's FFT (CLAP `clap_host_audio_ports` and VST3 `IAudioProcessor` are not always available; fall back to "compute offline from magnitude_response"). When present, render a 4096-bin log-frequency peak-hold curve in school color at 30% opacity.
32. **Band node** — drag freq + gain, wheel = Q, `Shift+wheel` = gain in 0.1 dB, `Alt+wheel` = Q in 0.05 steps, right-click = inspector popup, `Cmd/Ctrl+B` = bypass (with ink-wipe).
33. **Inspector popup** — type dropdown, freq Hz with semitone snap, gain dB, Q, channel, oversample. Validates against the same allow-list as the schema.
34. **Preset browser** — left rail. Lists factory + user. Search by name, school, tag. "Forge" button opens save dialog (name, school, tags).
35. **A/B** — top right, two boxes with the current state. Click to swap.
36. **Undo/Redo** — bottom bar. 32-step ring buffer of `Preset` diffs.

### Phase 7 — Web overlay rewrite (Day 7-9, parallel, Claude)

37. New `src/components/ParaEQ/types.ts` with `EqBand`, `EqPreset`, `EqChannel`, `EqType`, `EqBandsState`.
38. Replace `ScholoCandy.tsx` with typed props, `Z_BASE/Z_ABOVE/Z_OVERLAY` tiers (Law 10), `usePrefersReducedMotion` wrap, `useId` ARIA root, school-themed CSS variable consumption.
39. Replace `ParaEQOverlay.tsx` with: school-colored ring (school variable from `useSchoolTint`), type glyph (PixelBrain font or inline SVG), Q tooltip on hover, semitone snap on `Shift`, right-click inspector modal (inline, not a modal — per Law 5 anti-pattern), numeric readout on focus.
40. Replace `SpectrumCanvas.tsx` with: `motion.canvas`, school-aware analyzer color, RAF capped at 30 fps, analyzer data memoized across equal state, no per-pixel realloc.
41. `useEqBands` hook: deterministic IDs, validation, allow-list (Law 7).
42. `useEqPreset` hook: save/load to backend + localStorage.
43. `presetAdapter.js`: hydrates `eqBands` from localStorage on mount; debounces writes by 750 ms.

### Phase 8 — Server route + persistence (Day 9-10, 1.5 days, Gemini + Codex)

44. `codex/server/routes/eqPresets.routes.js`: `POST /api/eq/presets` (write), `GET /api/eq/presets` (list with filter by school, name), `GET /api/eq/presets/:id` (read), `DELETE /api/eq/presets/:id` (owner only). Schema-validated with `zod` (already in deps). Auth-gated, CSRF-gated.
45. Persistence: SQLite table `eq_presets` with `id`, `user_id`, `bytecode`, `name`, `school`, `tags`, `created_at`, `updated_at`. Migration v15.
46. Codex publishes the `eq_presets` schema clause in `SCHEMA_CONTRACT.md`.

### Phase 9 — World-law theming + Verse-band conjure (Day 10-11, 1.5 days, Claude + Codex)

47. `useSchoolTint(band) -> { stroke, fill, glow }` consumes `computeSchoolWeights` (`src/data/schools.js`) and applies the band color.
48. `src/components/ParaEQ/ConjureBand.tsx`: a `pointerdown` handler on the canvas accepts drops of a word token (from `usePhonemeEngine`). Computes the centroid Hz and Q, calls `addEqBand` with a name.
49. The 6 factory "Scrolls" ship as JSON. Each has a verse name, a school, and a small `VerseIR` excerpt that the TrueSight chip can render (a 1-line verse).
50. The band ring pulses with the school-detected energy at 4-beat envelope when `isPlaying && band.school === detectedSchoolId`.

### Phase 10 — Tests, CI, performance, a11y (Day 12-14, 3 days, Gemini)

51. Rust parity tests for all 9 types × 4 sample rates × 3 Q × 2 gains = 216 cases. Tolerance: 1e-5 (matches `error_tolerance.md`, replaces the loose 1e-4 in test). See §9.2.
52. Rust stability test: 10-min pink noise, 24 dB / Q=18, no NaN.
53. Rust latency test: 1× = 0 samples, 2× = 47, 4× = 94, 8× = 188.
54. Rust THD+N: at 1 kHz, 0 dBFS, 1× = ≤ −60 dB, 4× = ≤ −90 dB.
55. Vitest RTL for the web side: drag updates band, wheel changes Q, keyboard nav, ARIA presence, jest-axe clean.
56. Playwright visual regression: 6 baselines (one per school) for the spectrum canvas + overlay.
57. `npm run dead:scan` and `npm run immune:stasis` clean.
58. Add `verify:scholocandy-codec` script that round-trips each factory scroll through the Rust codec and the JS adapter and asserts byte-identical output.

### Phase 11 — Rollout behind the feature flag (Day 15, 0.5 day, Gemini + Claude)

59. `VITE_SCHOLOCANDY_V2` env var defaults to `off`. When off, the old `SpectrumCanvas` + `ParaEQOverlay` ship; the new code is lazy-loaded. When on, the new surfaces mount. CI runs both.
60. Smoke test: 100 ms Time-to-Interactive after a `VITE_SCHOLOCANDY_V2=on` flag flip in dev.

---

## 9. Code Examples (one per major step)

### 9.1 Preset codec round-trip (Rust, Phase 1)

```rust
// vst/scholo-candy/src/dsp/codec.rs
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

pub const SCHEMA_ID: &str = "scholomance/eq-preset";
pub const PRESET_VERSION: u32 = 2;
pub const BYTECODE_PREFIX: &str = "BIT-EQ-v1";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Preset {
    pub version: u32,
    pub schema_id: String,
    pub name: String,
    pub school: School,
    pub output_gain_db: f32,
    pub bands: Vec<Band>,
    pub oversample: OversampleKind,
    #[serde(default)]
    pub analyzer: Option<AnalyzerConfig>,
    pub bytecode: String,
    pub checksum: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "lowercase")]
pub enum School { Sonic, Psychic, Void, Alchemy, Will, Neutral }

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Copy)]
#[serde(rename_all = "camelCase")]
pub enum OversampleKind { X1, X2, X4, X8 }

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Band {
    pub id: String,
    #[serde(rename = "type")]
    pub kind: FilterType,
    pub frequency: f32,
    pub gain: f32,
    pub Q: f32,
    pub channel: ChannelKind,
    pub oversample: OversampleKind,
    pub bypass: bool,
}

impl Preset {
    pub fn canonical_bytes(&self) -> Vec<u8> {
        // BTreeMap guarantees key order; serde_json::to_vec preserves struct order.
        serde_json::to_vec(self).expect("Preset is always serializable")
    }

    pub fn recompute(&mut self) {
        self.version = PRESET_VERSION;
        self.schema_id = SCHEMA_ID.to_string();
        // Band IDs are 12-char base32 of a deterministic seed (see Q3).
        for b in &mut self.bands {
            b.id = format!("band_{}", base32::encode(&b.id_seed()));
        }
        let bytes = self.canonical_bytes_without_bytecode();
        self.checksum = sha256_hex(&bytes);
        self.bytecode = format!("{}-{:08x}",
            BYTECODE_PREFIX,
            crc32(&bytes) as u32
        );
    }
}
```

```rust
// vst/scholo-candy/tests/preset_codec.rs
use scholo_candy::dsp::codec::Preset;
use scholo_candy::dsp::filter_band::FilterType;

const FACTORY_VOID: &str = include_str!("../golden/factory_scrolls/void_undertow.scroll.json");

#[test]
fn void_factory_round_trip_is_byte_identical() {
    let mut a: Preset = serde_json::from_str(FACTORY_VOID).unwrap();
    a.recompute();
    let bytes_a = serde_json::to_vec(&a).unwrap();

    let mut b: Preset = serde_json::from_slice(&bytes_a).unwrap();
    b.recompute();
    let bytes_b = serde_json::to_vec(&b).unwrap();

    assert_eq!(bytes_a, bytes_b, "round-trip must be byte-identical");
    assert!(a.bytecode.starts_with("BIT-EQ-v1-"));
    assert_eq!(a.checksum.len(), 64);
}
```

### 9.2 Parity test (Rust, Phase 3)

```rust
// vst/scholo-candy/tests/dsp_parity.rs (replace existing)
use std::fs;
use scholo_candy::dsp::filter_band::{FilterBand, FilterType};
use scholo_candy::dsp::biquad::BiquadCoeffs;

#[derive(serde::Deserialize)]
struct Fixture {
    params: Params,
    sample_rate: f32,
    coefficients: Coeffs,
}

#[derive(serde::Deserialize)]
struct Params {
    #[serde(rename = "type")] kind: String,
    f0: f32, Q: f32, gain: f32,
}

#[derive(serde::Deserialize)]
struct Coeffs { b0: f32, b1: f32, b2: f32, a1: f32, a2: f32 }

#[test]
fn all_types_match_web_audio_within_1e_5() {
    let raw = fs::read_to_string("golden/web_eq_snapshots.json").unwrap();
    let fixtures: Vec<Fixture> = serde_json::from_str(&raw).unwrap();

    for f in &fixtures {
        let kind = match f.params.kind.as_str() {
            "bell"      => FilterType::Bell,
            "lowShelf"  => FilterType::LowShelf,
            "highShelf" => FilterType::HighShelf,
            "lowPass"   => FilterType::LowPass,
            "highPass"  => FilterType::HighPass,
            "notch"     => FilterType::Notch,
            "bandPass"  => FilterType::BandPass,
            "allPass"   => FilterType::AllPass,
            "tilt"      => FilterType::Tilt,
            other       => panic!("unknown type in fixture: {other}"),
        };
        let mut band = FilterBand::new(f.sample_rate);
        band.set_params(true, kind, f.params.f0, f.params.gain, f.params.Q);

        let c = band.coeffs();
        let tol = 1e-5;  // matches golden/error_tolerance.md
        for (got, exp, name) in [
            (c.b0, f.coefficients.b0, "b0"),
            (c.b1, f.coefficients.b1, "b1"),
            (c.b2, f.coefficients.b2, "b2"),
            (c.a1, f.coefficients.a1, "a1"),
            (c.a2, f.coefficients.a2, "a2"),
        ] {
            assert!(
                (got - exp).abs() < tol,
                "{name} drift: got {got}, expected {exp} (fixture: {:?})",
                f.params
            );
        }
    }
}
```

### 9.3 TPT-SVF topology (Rust, Phase 3)

```rust
// vst/scholo-candy/src/dsp/topology/tpt_svf.rs
use super::Topology;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SvfKind { LowPass, HighPass, BandPass, AllPass, Bell }

/// Andy Simper / "Cytomic" TPT state-variable filter.
/// Reference: cytomic.com/files/dsp/SvfLinearTrapOptimised2.pdf
pub struct TptSvf {
    pub kind: SvfKind,
    ic1eq: f32, ic2eq: f32,  // integrator state
}

impl TptSvf {
    pub fn new(kind: SvfKind) -> Self {
        Self { kind, ic1eq: 0.0, ic2eq: 0.0 }
    }
    pub fn reset(&mut self) { self.ic1eq = 0.0; self.ic2eq = 0.0; }
}

impl Topology for TptSvf {
    fn process(&mut self, x: f32, freq_hz: f32, q: f32, gain_db: f32, sample_rate: f32) -> f32 {
        // 2x oversampled for TPT stability:
        let half = sample_rate * 0.5;
        let f = freq_hz.clamp(0.0, half * 0.49);
        let g = (std::f32::consts::PI * f / sample_rate).tan();
        let k = 1.0 / q.max(0.05);
        let a1 = 1.0 / (1.0 + g * (g + k));
        let a2 = g * a1;
        let a3 = g * a2;

        let a = 10f32.powf(gain_db / 40.0);
        let (mut v0, mut v1, mut v2, mut v3);
        let mut y = 0.0;

        // Two TPT steps per audio sample → matches Cytomic reference.
        for _ in 0..2 {
            v3 = x - self.ic2eq;
            v0 = a1 * self.ic1eq + a2 * v3;
            v1 = self.ic1eq + a2 * self.ic1eq + (a2 * v3);
            // ↑ Simper-1 form: stable under modulation
            v1 = a1 * v1 + a2 * v0;
            v2 = self.ic2eq + a2 * self.ic1eq + (a2 * v3);
            v2 = a1 * v2 + a2 * v1;
            self.ic1eq = 2.0 * v1 - self.ic1eq;
            self.ic2eq = 2.0 * v2 - self.ic2eq;

            y += match self.kind {
                SvfKind::LowPass  => v2,
                SvfKind::HighPass => v0,
                SvfKind::BandPass => v1,
                SvfKind::AllPass  => v0 + v2 - k * v1,
                SvfKind::Bell     => a * v0 + v2 - k * a * v1, // gain in v0 path
            };
        }
        0.5 * y  // average the two TPT sub-steps
    }
}
```

### 9.4 Deterministic band ID (TypeScript, Phase 7)

```ts
// src/components/ParaEQ/hooks/useEqBands.ts
const BASE32_ALPHABET = "0123456789abcdefghijklmnopqrstuv";
const SEED_SALT = "scholomance:eq:band-id:v1";

function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function deterministicBandId(seed: { index: number; frequency: number; type: EqType }): string {
  const h = fnv1a(`${SEED_SALT}|${seed.index}|${seed.frequency}|${seed.type}`);
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += BASE32_ALPHABET[(h >>> (i * 4)) & 0x1f];
  }
  return `band_${id}${BASE32_ALPHABET[(h >>> 0) & 0x1f]}${BASE32_ALPHABET[(h >>> 4) & 0x1f]}${BASE32_ALPHABET[(h >>> 8) & 0x1f]}`;
}

export function useEqBands() {
  const validate = (band: Partial<EqBand>): EqBand => {
    const type = ALLOWED_TYPES.has(band.type as EqType) ? (band.type as EqType) : "bell";
    return {
      id: typeof band.id === "string" && /^band_[a-z0-9]{12}$/.test(band.id)
        ? band.id
        : deterministicBandId({
            index: typeof band.index === "number" ? band.index : Math.floor(Math.random() * 1e6),
            frequency: typeof band.frequency === "number" ? band.frequency : 1000,
            type,
          }),
      type,
      frequency: clamp(band.frequency ?? 1000, 20, 20000),
      gain: clamp(band.gain ?? 0, -36, 36),
      Q: clamp(band.Q ?? 1, 0.05, 24),
      channel: ALLOWED_CHANNELS.has(band.channel as EqChannel) ? (band.channel as EqChannel) : "stereo",
      oversample: ALLOWED_OVERSAMPLE.has(band.oversample as EqOversample)
        ? (band.oversample as EqOversample) : "auto",
      bypass: Boolean(band.bypass),
    };
  };
  // ...
}
```

### 9.5 School-tinted band node (TypeScript, Phase 9)

```tsx
// src/components/ParaEQ/ParaEQOverlay.tsx
import { motion, useReducedMotion } from "framer-motion";
import { useSchoolTint } from "./hooks/useSchoolTint";
import type { EqBand } from "./types";

const TYPE_GLYPH: Record<EqType, string> = {
  bell: "●", lowShelf: "⌒", highShelf: "⌣",
  lowPass: "⤓", highPass: "⤒", notch: "⊘",
  bandPass: "◎", allPass: "⦿", tilt: "╱",
};

const CHANNEL_GLYPH: Record<EqChannel, string> = {
  stereo: "⇔", mid: "M", side: "S", L: "L", R: "R",
};

export const ParaEQOverlay = forwardRef<HTMLDivElement, ParaEQOverlayProps>(
  function ParaEQOverlay({ bands, activeBandId, ...props }, ref) {
    const reduced = useReducedMotion();
    return (
      <div
        ref={ref}
        className="scholomance-candy__overlay"
        role="group"
        aria-label="Parametric EQ bands"
        data-z-tier="OVERLAY"
      >
        {bands.map((band, index) => (
          <BandNode
            key={band.id}
            band={band}
            index={index}
            reduced={reduced ?? false}
            isActive={activeBandId === band.id}
            {...props}
          />
        ))}
      </div>
    );
  }
);

function BandNode({ band, index, isActive, reduced, ... }) {
  const tint = useSchoolTint(band); // returns { stroke, glow, fill }
  return (
    <motion.button
      type="button"
      className="scholomance-candy__band"
      style={{ left: x, top: y, "--ring-color": tint.stroke } as CSSProperties}
      animate={{ scale: isActive ? 1.2 : 1 }}
      transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 240, damping: 20 }}
      aria-label={`Band ${index + 1}: ${band.type} at ${band.frequency.toFixed(0)} Hz, ${band.gain.toFixed(1)} dB, Q ${band.Q.toFixed(2)}, ${band.channel}${band.bypass ? ", bypassed" : ""}`}
      onPointerDown={...}
      onKeyDown={...}
    >
      <span aria-hidden="true">{TYPE_GLYPH[band.type]}</span>
      <span aria-hidden="true" className="scholomance-candy__channel">{CHANNEL_GLYPH[band.channel]}</span>
      {isActive && <span className="scholomance-candy__readout">{band.frequency.toFixed(0)} Hz · {band.gain.toFixed(1)} dB</span>}
    </motion.button>
  );
}
```

### 9.6 Backend route (JS, Phase 8)

```js
// codex/server/routes/eqPresets.routes.js (excerpt)
import { z } from "zod";
import { eqPresetSchema } from "../../../vst/scholo-candy/scholo-candy-eq.schema.json";

const writeBody = z.object({
  bytecode: z.string().regex(/^BIT-EQ-v1-[a-f0-9]{8}$/),
  checksum: z.string().regex(/^[a-f0-9]{64}$/),
  name: z.string().min(1).max(80),
  school: z.enum(["SONIC", "PSYCHIC", "VOID", "ALCHEMY", "WILL", "NEUTRAL"]),
  tags: z.array(z.string().min(1).max(24)).max(8).optional(),
  payload: eqPresetSchema, // JSON-schema-validated
});

export default async function eqPresetsRoutes(fastify) {
  fastify.post("/api/eq/presets", { preHandler: [fastify.authenticate, fastify.csrf] }, async (req, reply) => {
    const body = writeBody.parse(req.body);
    const userId = req.session.user.id;
    const id = crypto.randomUUID();
    fastify.sqlite.prepare(`
      INSERT INTO eq_presets (id, user_id, bytecode, checksum, name, school, tags, payload, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, body.bytecode, body.checksum, body.name, body.school,
           JSON.stringify(body.tags ?? []), JSON.stringify(body.payload), Date.now(), Date.now());
    reply.code(201).send({ id, bytecode: body.bytecode });
  });

  fastify.get("/api/eq/presets", { preHandler: [fastify.authenticate] }, async (req) => {
    const { school, q } = req.query;
    const rows = fastify.sqlite.prepare(`
      SELECT id, name, school, tags, bytecode, updated_at
      FROM eq_presets
      WHERE user_id = ? AND (? IS NULL OR school = ?)
      ORDER BY updated_at DESC
    `).all(req.session.user.id, school ?? null, school ?? null);
    return { presets: rows.filter(r => !q || r.name.toLowerCase().includes(String(q).toLowerCase())) };
  });
}
```

### 9.7 Lazy load + reduce-motion spectrum (TypeScript, Phase 7)

```tsx
// src/components/ParaEQ/SpectrumCanvas.tsx
import { motion, useReducedMotion, useMotionValue } from "framer-motion";
import { useEffect, useRef } from "react";

export const SpectrumCanvas = /*#__PURE__*/ React.lazy(() =>
  import(/* webpackChunkName: "paraeq-spectrum" */ "./_SpectrumCanvasImpl")
);

function SpectrumCanvasImpl({ isPlaying, getByteFrequencyData, school, eqNodes }: Props) {
  const reduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  const dataRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!dataRef.current) dataRef.current = new Uint8Array(2048);
    let lastDraw = 0;
    const fps = reduced ? 6 : 30;

    const draw = (t: number) => {
      if (t - lastDraw >= 1000 / fps) {
        lastDraw = t;
        // ...drawing code, but reuse dataRef.current (no realloc), and memoize
        // the per-pixel curve by hashing eqNodes' last-applied-state.
        renderFrame(ctx, canvas, dataRef.current, getByteFrequencyData, school, eqNodes);
      }
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current!);
  }, [isPlaying, getByteFrequencyData, school, reduced, eqNodes]);

  return <motion.canvas ref={canvasRef} className="scholomance-candy__spectrum"
    data-z-tier="BASE"
    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    transition={reduced ? { duration: 0 } : { duration: 0.4 }} />;
}
```

---

## 10. Glossary

| Term | Meaning |
|---|---|
| **Band** | One parametric filter in the chain. Has a type, frequency, gain, Q, channel target, oversample factor, and bypass flag. |
| **Channel target** | Which signal path a band processes: Stereo, Mid, Side, L-only, R-only. |
| **Coefficient** | A biquad's `b0, b1, b2, a1, a2` after normalization by `a0`. |
| **Codec** | The `dsp::codec` module: preset ↔ JSON, ↔ `BIT-EQ-v1` bytecode, ↔ SHA-256 checksum. |
| **Conjure / Conjure Band** | (v2 world-law) Drag a verse word onto the EQ canvas to spawn a band whose center is the word's vowel-centroid Hz and whose Q is the inverse of the vowel family dispersion. |
| **Curse** | A status effect on a band (e.g., "Iron Bypass"). Phase 2. |
| **DIT** | Deterministic Identifier Trace — the seed-based 12-char base32 band ID. |
| **Forge Scroll** | Save the current EQ state as a named preset (a "scroll"). |
| **Inspect** | Open a band's numeric inspector. |
| **Inscribe** | Apply a scroll (preset). |
| **M/S** | Mid/Side stereo encoding. M = (L+R)/√2, S = (L−R)/√2. |
| **Oversample** | 2×/4×/8× internal sample rate, then decimate. Reduces aliasing on high-gain, high-Q bands. Adds latency, reported by the plugin. |
| **PB-** | PixelBrain bytecode prefix (e.g., `PB-PRED-v1`, `PB-ERR-v1`). Not used by this PDR. |
| **BIT-EQ-v1** | The new preset bytecode family reserved for ScholoCandy presets. |
| **RBJ** | Robert Bristow-Johnson "Audio EQ Cookbook" — the textbook direct-form biquad formulas. |
| **Rite of Bypass** | The 240 ms ink-wipe animation that plays when a band is bypassed. Reduced to 120 ms under reduced-motion. |
| **Scroll** | (v2 world-law) A preset. Verse-named JSON. |
| **School** | One of SONIC, PSYCHIC, VOID, ALCHEMY, WILL, or NEUTRAL. Drives band color, glyph, and pulse. |
| **Semitone snap** | Holding `Shift` while dragging snaps frequency to the nearest semitone in 12-TET (relative to a configurable anchor, default A4 = 440 Hz). |
| **Smoothing** | `SmoothingStyle::Perceptual` (new): 5 ms gain, 15 ms frequency, *no* Q smoothing. The 5 ms linear is too aggressive for Q. |
| **TPT** | Topology-Preserving Transform — the Simper / Cytomic discrete-time simulation of an analog SVF that stays stable under parameter modulation. |
| **Tilt** | A symmetric ±N dB shelf that tilts the spectrum at a pivot frequency. |
| **TrueSight** | The IDE / analysis mode that colors tokens by ARPAbet vowel family. In the EQ it drives band glyph color and the analyzer palette. |
| **Vowel-centroid Hz** | The geometric mean of the dominant vowel's F1/F2 in Hz; the "vowel color" frequency. |
| **Vowel family dispersion** | The standard deviation of the vowel's formant pair across the word's syllables. Low dispersion = tight vowel = high Q. High = low Q. |

---

## 11. Q&A — Top 10 Most Confusing Implementation Concerns

### Q1. The error tolerance is "1e-5" in the doc but the test uses 1e-4. Which is canonical?

**Solve.** 1e-5 is canonical, per `golden/error_tolerance.md`. The test is wrong. The PDR replaces it (Phase 10, §9.2). To prove the 1e-5 budget is achievable, we compute a sensitivity analysis: for `f0=1000 Hz, Q=4, gain=12 dB, sample_rate=48000` (the worst-case in the current fixtures), the partial derivative of `b0` w.r.t. `f0` is `O(α·A / sample_rate) ≈ 1e-6`, so 1e-5 across all coefficients is the right order. The 1e-4 in the test is a "we didn't have time to investigate" fudge.

### Q2. The Rust `FilterType::Bell` is called `peaking` in Web Audio. Which wins?

**Solve.** The schema wins. The canonical name is `bell` (it is the more general term; "peaking" is a Web Audio implementation detail). The Rust enum stays `Bell`. The Web Audio adapter maps `bell → "peaking"` internally. The schema v2 has `bell` as the canonical and rejects `peaking`. We add a one-shot migration: if a v1 preset has `type: "peaking"`, the codec rewrites it to `bell` and stamps a `migrated_from: "v1"` note in the JSON during Phase 1's first migration pass.

### Q3. `Math.random().toString(36).substr(2,9)` is non-deterministic. How do we make IDs deterministic without breaking the existing flow?

**Solve.** Replace with `deterministicBandId({index, frequency, type})` (see §9.4). The seed is content-derived, not random. Two saves of the same band yield the same ID. Reload the page → same IDs → no double-render. The `substr` (deprecated) is also gone. Existing in-memory state has no `localStorage` to migrate (audit confirms), so we just delete and re-seed.

### Q4. Why remove Q smoothing? Won't parameter changes zip audibly?

**Solve.** Smoothing freq and gain is correct (the human ear hears zipper noise on a 1-ms parameter change). Q, on a peak filter, only affects the *bandwidth*; the human ear does not hear Q modulation as zipper noise nearly as strongly, and *over*-smoothing Q causes a "glugging" artifact where the resonance seems to breathe. The new `SmoothingStyle::Perceptual`: gain 5 ms, freq 15 ms, Q un-smoothed (or 30 ms if the band is M/S — M/S bands have stronger perceptual artifacts). The plugin reports this in its UI: "Q is unsmoothed for transparency."

### Q5. The `error_tolerance.md` declares three different tolerances. Pick one.

**Solve.** 1e-5 for coefficient parity, 0.1 dB for magnitude parity, bounded-impulse (no NaN, decays) for time-domain parity. We write these into `tests/dsp_parity.rs` as named constants and add a CI check that `error_tolerance.md` does not contradict them. The 0.1 dB is reasonable: the human ear cannot resolve less than 0.1 dB at a single frequency in isolation. The impulse test runs 4096 samples (not 1000) and asserts `|out| < 1.0` and `out_n.abs() < out_0.abs() * 0.001` (1/1000 decay).

### Q6. Why delete the codegen scripts? They "work."

**Solve.** They are not build pipeline; they are write-once scaffolds. Running `generate_editor_ui.py` against the current `plugin.rs` *would corrupt the file* (the regex on line 145 no longer matches because the file structure has changed). The comments at the top of those scripts admit this: they say "injected" and "scaffolded", not "regenerate." Replacing them with hand-written Rust means a future maintainer can `git blame` an individual line, can change one band without running a Python script, and can review the source normally. CI is added to ensure the scripts do not reappear.

### Q7. M/S requires the host to provide an M/S signal. What if it doesn't?

**Solve.** M/S is a *per-band routing*, not a global change. A band set to `channel: "mid"` is fed `(L+R)/√2` and its output replaces both L and R (i.e., the entire image becomes mono). A `side` band replaces both with `(L−R)/√2` (i.e., the image becomes difference-only — a strange effect, but legitimate). The host always sees stereo I/O. We do not change the plugin's `AUDIO_IO_LAYOUTS`. We document the side-band behavior clearly. This is the same approach Pro-Q 3 and FabFilter take.

### Q8. The VST3/CLAP are already built. Does the new editor require a rebuild?

**Solve.** Yes, but `nih_plug` re-uses the Rust crate; the `cdylib` and `rlib` outputs are still produced by `cargo build`. The bundle (`target/bundled/scholo_candy.vst3`) is rebuilt. The editor is part of the same binary. There is no separate "editor plugin" process to ship.

### Q9. Why is the web overlay using `requestAnimationFrame` at all — Framer Motion has its own loop.

**Solve.** The spectrum analyzer must read `getByteFrequencyData(…)` once per frame; there is no event-driven signal. The fix is to *cap* the RAF at 30 fps (or 6 fps under `prefers-reduced-motion`), reuse a single `Uint8Array`, and memoize the EQ curve computation across equal state. The current code reallocates 6 × 1920 floats per frame, which is 46 KB of garbage per frame at 60 fps ≈ 2.7 MB/s of allocation pressure. The new code allocates zero per frame on a steady state.

### Q10. The brand gap is real but subjective. How do we measure it?

**Solve.** We define three acceptance tests for the world-law theming:
1. **Color consistency test:** for each factory scroll (5 schools + 1 neutral), the band's `stroke` color, sampled from `useSchoolTint(band)`, matches the school's `--school-color` CSS variable to within 1% ΔE.
2. **Conjure Band test:** dropping the word "void" yields a band whose `frequency` is within 10 Hz of the geometric mean of the word's vowel formants (≈ 200–500 Hz for "void").
3. **Verse-true round-trip test:** loading a saved scroll in the VST plugin and the web overlay must produce *byte-identical* coefficients and a visually identical curve. (This is the determinism contract.)

If those three pass, the world-law connection is real, not decorative.

---

## 12. QA Plan — Tests, Files, Commands, Examples

### 12.1 Test inventory (new files)

| File | Owner | Purpose |
|---|---|---|
| `vst/scholo-candy/tests/dsp_parity.rs` | Codex | Coefficient parity, 1e-5, all 9 types |
| `vst/scholo-candy/tests/dsp_stability.rs` | Codex | 10-min pink noise, 0 NaN |
| `vst/scholo-candy/tests/dsp_latency.rs` | Codex | Latency = max(0, N - true_tail) |
| `vst/scholo-candy/tests/dsp_oversample.rs` | Codex | THD+N at 1×/4×/8× |
| `vst/scholo-candy/tests/preset_codec.rs` | Codex | Byte-identical round-trip, BIT-EQ-v1 |
| `vst/scholo-candy/tests/golden_compat.rs` | Codex | web ↔ scholocandy golden equivalence |
| `tests/qa/features/scholomance-candy-overlay.interactions.test.tsx` | Gemini | RTL: drag, wheel, right-click, keyboard |
| `tests/qa/features/scholomance-candy-a11y.test.tsx` | Gemini | jest-axe clean |
| `tests/qa/features/scholomance-candy-fixture.test.tsx` | Gemini | snapshot of computed response curve |
| `tests/qa/features/eq-presets-route.test.js` | Gemini | Backend route contract |
| `tests/visual/scholomance-candy-spectrum.spec.js` | Claude | 6 baselines (one per school) |
| `tests/visual/scholomance-candy-overlay.spec.js` | Claude | 6 baselines for the overlay |
| `tests/qa/scholomance-candy-codec.test.js` | Gemini | Codec + checksum stability |

### 12.2 Commands

```bash
# Phase 0
node vst/scholo-candy/no_codegen.py  # CI guard

# Phase 1-5 (Rust)
cd vst/scholo-candy
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --release
cargo test --release --test dsp_parity
cargo test --release --test dsp_stability -- --nocapture
cargo test --release --test dsp_oversample

# Phase 6-9 (Web)
npm run lint
npm run typecheck
npm run test:qa -- scholomance-candy
npm run test:visual -- scholomance-candy
npm run verify:css-tokens
npm run dead:scan
npm run immune:stasis

# Phase 8 (Server)
npm run test:qa:backend -- eq-presets
npm run verify:backend-contract

# Phase 10 (Cross-platform)
npm run verify:scholocandy-codec
```

### 12.3 Example — RTL interaction test

```tsx
// tests/qa/features/scholomance-candy-overlay.interactions.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "jest-axe";
import { ParaEQOverlay } from "../../../src/components/ParaEQ/ParaEQOverlay";

const baseBand = {
  id: "band_000000000000",
  type: "bell" as const,
  frequency: 1000, gain: 0, Q: 1,
  channel: "stereo" as const, oversample: "auto" as const, bypass: false,
};

describe("ParaEQOverlay interactions", () => {
  it("renders band nodes with ARIA labels", () => {
    render(
      <ParaEQOverlay
        bands={[baseBand]} activeBandId={null}
        onAddBand={jest.fn()} onUpdateBand={jest.fn()} onRemoveBand={jest.fn()}
        dimensions={{ width: 800, height: 400 }}
      />
    );
    const btn = screen.getByRole("button", { name: /band 1.*1000.*Hz/i });
    expect(btn).toBeInTheDocument();
  });

  it("wheel-up increases Q", () => {
    const onUpdate = jest.fn();
    render(
      <ParaEQOverlay
        bands={[baseBand]} activeBandId={baseBand.id}
        onAddBand={jest.fn()} onUpdateBand={onUpdate} onRemoveBand={jest.fn()}
        dimensions={{ width: 800, height: 400 }}
      />
    );
    const node = screen.getByRole("button");
    fireEvent.wheel(node, { deltaY: -100 });
    expect(onUpdate).toHaveBeenCalledWith(baseBand.id, expect.objectContaining({ Q: expect.any(Number) }));
  });

  it("axe-clean", async () => {
    const { container } = render(
      <ParaEQOverlay
        bands={[baseBand, { ...baseBand, id: "band_111111111111", frequency: 2000 }]}
        activeBandId={null}
        onAddBand={jest.fn()} onUpdateBand={jest.fn()} onRemoveBand={jest.fn()}
        dimensions={{ width: 800, height: 400 }}
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

### 12.4 Example — Codec round-trip test (Vitest)

```js
// tests/qa/scholomance-candy-codec.test.js
import { describe, it, expect } from "vitest";
import { canonicalizePreset, encodeBytecode } from "../../src/lib/ParaEQ/presetAdapter";
import voidScroll from "../../vst/scholo-candy/golden/factory_scrolls/void_undertow.scroll.json";

describe("ScholoCandy codec", () => {
  it("produces deterministic bytecode for a given preset", () => {
    const a = canonicalizePreset(voidScroll);
    const b = canonicalizePreset({ ...voidScroll, name: voidScroll.name });
    expect(encodeBytecode(a)).toBe(encodeBytecode(b));
  });

  it("checksum matches sha256 of canonical bytes", async () => {
    const a = canonicalizePreset(voidScroll);
    const bytes = new TextEncoder().encode(JSON.stringify(a));
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    expect(Buffer.from(hash).toString("hex")).toBe(voidScroll.checksum);
  });
});
```

### 12.5 Example — Playwright visual baseline

```js
// tests/visual/scholomance-candy-spectrum.spec.js
import { test, expect } from "@playwright/test";
import { SCHOLOMANCE_SCHOOLS } from "../../src/data/schools.js";

const schools = ["SONIC", "PSYCHIC", "VOID", "ALCHEMY", "WILL", "NEUTRAL"];

for (const school of schools) {
  test(`spectrum canvas · ${school}`, async ({ page }) => {
    await page.goto("/listen");
    await page.evaluate((school) => {
      // 1) Seed a band
      // 2) Set the school tint
      // 3) Drive the analyser with pink noise for 200 ms
      window.__scholomanceTestHooks.seedEqBand({ type: "bell", frequency: 1000, gain: 6, Q: 1 });
      window.__scholomanceTestHooks.setSchool(school);
    }, school);
    await expect(page.locator(".scholomance-candy__spectrum")).toHaveScreenshot(
      `spectrum-${school.toLowerCase()}.png`,
      { maxDiffPixels: 240, threshold: 0.18 }
    );
  });
}
```

---

## 13. Regression Risks and Retest Checklist

| Risk | Probability | Impact | Mitigation | Retest |
|---|---|---|---|---|
| Removing codegen breaks the VST3 build | Low (the Rust files are hand-edited and on disk) | High (plugin doesn't load in DAW) | Diff generated vs. on-disk before deletion; commit the diff first | `cargo build --release` then `clap-validator validate target/bundled/scholo_candy.clap` |
| TPT-SVF diverges from RBJ at low frequencies | Medium | Medium (audible) | Golden parity test for all types; fail build on > 1e-5 | `cargo test --release --test dsp_parity`; re-record factory scrolls with the TPT path |
| Oversample latency mis-reporting causes host glitches | Medium | High (host time-aligns incorrectly) | Latency test, also exposed in plugin info | `cargo test --release --test dsp_latency`; clap-validator latency-report check |
| New web overlay drifts from VST plugin curve | Medium | High (users notice) | Codec round-trip + same golden fixtures on both sides | `npm run verify:scholocandy-codec` |
| School theming breaks non-Sonic-Exchange users | Low | Low (visual only) | School tint is opt-in (default: NEUTRAL); flag `VITE_SCHOLOCANDY_V2=on` in dev | Visual regression baselines |
| Server route opens CSRF/auth hole | Medium | Critical | Standard auth+CSRF preHandlers, same as `/api/world/entities/...`; allow-list the payload via `zod` | `npm run test:qa:backend -- eq-presets`; `security:qa` |
| `Vite` chunk-split breaks lazy loading | Low | Medium | Use the existing `phaser-lazy-load.spec.js` pattern; add a smoke test | `npm run test:visual` |
| Reduced-motion users see static bands without 30 fps RAF | Low | Low | RAF capped at 6 fps under reduced-motion; the visual is otherwise identical | `prefers-reduced-motion` Playwright test |
| Band ID collision across 12 bands | Very low | Low | fnv1a is collision-resistant at 40 bits; tests assert uniqueness | `vitest run tests/qa/scholomance-candy-fixture.test.tsx` |
| Removing `Math.random` from id gen breaks listeners on the band list | Very low | Low | The `useEffect` deps in `useEqBands` already include `bands.map(b => b.id)` | Vitest snapshot |

### Retest checklist (run after each merge to `main`)

- [ ] `cargo test --release` in `vst/scholo-candy/`
- [ ] `cargo clippy --workspace -- -D warnings`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test:qa`
- [ ] `npm run test:visual`
- [ ] `npm run verify:css-tokens`
- [ ] `npm run verify:scholocandy-codec`
- [ ] `npm run immune:stasis:all`
- [ ] `npm run dead:scan` (advisory)
- [ ] Visual sanity: open `/listen` in dev, drop the word "void" on the EQ, verify a low-frequency bell appears in zinc
- [ ] DAW sanity (Nexus): load `scholo_candy.vst3` in REAPER, verify 12 bands, oversample 4×, A/B swap

---

## 14. Rollout Plan (Incomplete-But-Safe)

The Vaelrix Law 6 invariant — "Server Is Truth" — is not at risk here (the plugin is a client of the audio signal), but Law 4 — "deterministic, never surprise the user" — is. The rollout is therefore a two-track flag system:

| Flag | Default | Effect when on |
|---|---|---|
| `VITE_SCHOLOCANDY_V2` | off | Loads the new typed `ScholoCandy` shell; old component is lazy-loaded only if the flag is off |
| `SCHOLOCANDY_RUST_TPT` | off | Switches the Rust editor's filter topology from RBJ to TPT-SVF (per-band, per-type) |

### Pre-rollout (Day 0-1)
- All Phase 0-3 work merged.
- `VITE_SCHOLOCANDY_V2=on` in dev only.
- `npm run verify:scholocandy-codec` running in CI as advisory.

### Phase A — Shadow (Day 2-7)
- Production runs with `VITE_SCHOLOCANDY_V2=off`. The new code is in the bundle but not mounted.
- A canary cohort (10% of dev users) sees the new shell via dev-only.
- Backend route is feature-flagged (`SCHOLOMANCE_EQ_PRESETS=off`); the route is wired but rejects all writes.
- A/B log every `addEqBand` call from the new shell (count, not content) — confirms it would have been used.

### Phase B — Production on, with a switch (Day 8-14)
- `VITE_SCHOLOCANDY_V2=on` for everyone. Old component is removed from the bundle (`Vite` tree-shakes it out).
- `SCHOLOMANCE_EQ_PRESETS=on` for staff only. Users see the preset browser in read-only (factory scrolls only).
- A `?ab=v1` URL param restores the old overlay for 24 hours for users who report issues. (URL param, not cookie — explicit opt-in.)

### Phase C — Preset writes (Day 15+)
- `SCHOLOMANCE_EQ_PRESETS=on` for all.
- The codec golden parity test runs in CI.
- Factory scrolls ship as `vst/scholo-candy/golden/factory_scrolls/*.json` and as a static import in the web bundle (Phase 9).

### Rollback (always)
- Flip `VITE_SCHOLOCANDY_V2=off` → bundle reverts to old overlay on next deploy.
- Flip `SCHOLOMANCE_EQ_PRESETS=off` → preset writes are rejected (returns 503). Reads still work.
- Rust TPT-SVF rollback: per-band `topology = "rbj"` override; ships in the preset schema.
- No data migration is required at any point — the schema v2 is forward-compatible from v1 (codec auto-migrates `peaking` → `bell`).

### What can ship incomplete
- The web side can ship with no preset save/load UI (just the canvas + inspector). The VST side ships with the preset browser and the factory scrolls. Both consume the same schema, so partial rollout is fine.
- M/S can ship as a 2×2 matrix: L+L, R+R, mid, side, and the inspector shows it. The "auto" oversample can ship as "1× or 4× only" until we have the THD+N data.

---

## 15. Definition of Done

The PDR is *Done* when all of the following are true:

1. **Code:**
   - All `vst/scholo-candy/generate_*.py` and `dsp_update.py` files are deleted; CI guard in place.
   - `vst/scholo-candy/src/` has the new module structure (§6).
   - `src/components/ParaEQ/**` has the new typed, ARIA, Framer Motion, school-themed components.
   - `codex/server/routes/eqPresets.routes.js` exists, schema-validated, CSRF-gated.
   - 6 factory scrolls ship as JSON; both Rust and Web load them identically.

2. **Contracts:**
   - `vst/scholo-candy/scholo-candy-eq.schema.json` v2 published.
   - `SCHEMA CHANGE NOTICE` for `BIT-EQ-v1` registered in `SCHEMA_CONTRACT.md`.
   - 5 new runtime event names registered in `codex/runtime/eventBus.js`.

3. **Tests:**
   - All Rust tests green, including parity at 1e-5.
   - All Vitest tests green, including jest-axe.
   - All Playwright visual baselines captured.
   - Codec round-trip byte-identical.
   - THD+N at 1×/4×/8× published.
   - `npm run verify:scholocandy-codec` in CI.

4. **Quality gates:**
   - `npm run lint` clean.
   - `npm run typecheck` clean (with the one known intentional failure remaining, if still applicable).
   - `npm run verify:css-tokens` clean.
   - `npm run dead:scan` clean.
   - `npm run immune:stasis:all` clean.
   - `npm run test:qa` and `npm run test:visual` clean.

5. **Brand:**
   - All 6 school colors appear in the band ring and the spectrum analyzer.
   - The "Conjure Band" interaction works end-to-end (drop a word → band appears with the school's color).
   - A factory scroll, when inscribed, produces a band ring in the school's color and a verse-name visible in the inspector.

6. **A11y:**
   - `prefers-reduced-motion` respected in all surfaces.
   - All band nodes have ARIA labels, keyboard nav, focus ring.
   - No axe violations on the EQ surface.
   - All non-text icons have a text alternative or `aria-hidden="true"`.

7. **Stability:**
   - 10-minute pink-noise soak test: 0 NaN, 0 denormals flagged.
   - 0 host complaints about latency (the latency test reports exact samples).
   - 0 unbounded parameter changes (Q no longer "glugs").

8. **Documentation:**
   - A `docs/scholomance-encyclopedia/post-implementation-reports/PIR-2026MMDD-SCHOLOCANDY-21ST.md` exists, following the PIR template from `VAELRIX_LAW.md` §15.
   - The PDR index (`docs/scholomance-encyclopedia/PDR-archive/README.md`) lists this PDR with status `Implemented`.
   - The encyclopedia entry for the EQ is updated with the new world-law language.

---

## 16. Final Architectural Verdict

This PDR is **architecturally sound, behaviorally additive, and culturally earned**.

**Sound:** the new module split, the codec, the topology trait, and the dynamic band count are all orthogonal to the existing `BiquadFilterNode` parity contract. The schema v2 is forward-compatible from v1. The plugin's CLAP/VST3 layout does not change; the host contract is preserved. The server route uses the existing auth/CSRF/zod pattern that every other Codex route uses. No boundary is crossed without an explicit adapter.

**Additive:** the new features (TPT-SVF, oversample, M/S, A/B, undo, presets, world-law theming) all stack *on top of* the existing behavior, never replacing it. The codegen anti-pattern is excised because it was a *writability hazard*, not a *behavioral* one. A user on the VST3 plugin with default settings hears exactly the same thing after the merge as before — only the path to that result is cleaner.

**Earned:** the world-law connection is not a skin. The school-tinted band ring, the conjure-from-verse interaction, the verse-named scrolls, the TrueSight palette on the analyzer — each one is a *visible trace* of the same phonemic physics that runs the rest of the world. The 21st-century move is to let the spellbook inform the EQ; this PDR does exactly that.

**Verdict:** approve for Angel's sign-off, then implement in 15 working days with the Phase 0 → Phase 11 order. The PDR is fit to be handed directly to Codex (DSP), Claude (UI), and Gemini (tests) as concurrent workstreams with a single shared contract: `vst/scholo-candy/scholo-candy-eq.schema.json` v2.

---

### Appendix A — `SCHEMA CHANGE NOTICE` (to be appended to `SCHEMA_CONTRACT.md`)

```text
SCHEMA CHANGE NOTICE — v1.24 -> v1.25 — 2026-06-07

Schema: ScholoCandy EQ preset contract
Version: v1 -> v2
Changed fields:
  - Added: `schema_id`, `school`, `oversample`, `analyzer`, `bytecode`, `checksum`
  - Band shape: `id` is now `band_<12char base32>` (deterministic); added `channel`, `oversample`, `bypass`
  - Filter `type` enum extended: now 9 values (was 6). New: `bandPass`, `allPass`, `tilt`
  - Output gain range: ±36 dB (was ±24 dB)
  - Reserved new bytecode family: `BIT-EQ-v1` for ScholoCandy presets
Breaking: yes (preset shape)
Claude impact: ListenPage ParaEQ must migrate to typed `EqBand`/`EqPreset` shapes
Gemini impact: panel-analysis fixtures and persistence tests must add codec round-trip
Backward compatible until: 2026-07-01 (codec auto-migrates `peaking` -> `bell`)
```

### Appendix B — Bytecode reservation

```text
# Reserved by this PDR
BIT-EQ-v1-{SLUG}-{FINGERPRINT}-{CHECKSUM}
```

`SLUG` is the preset name lowercased + kebab-cased + truncated to 24 chars. `FINGERPRINT` is 8 hex chars of CRC32 over the canonical JSON. `CHECKSUM` is the full SHA-256 of the same bytes. The full `bytecode` field stores `BIT-EQ-v1-<FINGERPRINT>`; the `checksum` field stores the SHA-256.

### Appendix C — World-law naming reference (for the encyclopedia entry)

| Filter Type | School | Glyph | Rune |
|---|---|---|---|
| Bell | (school-agnostic) | `●` | A dot of pure resonance |
| LowShelf | VOID | `⌒` | A lowered arc, the undertow |
| HighShelf | ALCHEMY | `⌣` | A raised arc, the alembic |
| LowPass | VOID | `⤓` | A descending arrow, the gate of silence |
| HighPass | PSYCHIC | `⤒` | An ascending arrow, the open channel |
| Notch | WILL | `⊘` | A circle with a bar, the iron refusal |
| BandPass | SONIC | `◎` | A bullseye, the resonant ring |
| AllPass | NEUTRAL | `⦿` | A filled circle, the uncarved block |
| Tilt | ALCHEMY | `╱` | A slash, the balance |

---

*End of PDR.*
