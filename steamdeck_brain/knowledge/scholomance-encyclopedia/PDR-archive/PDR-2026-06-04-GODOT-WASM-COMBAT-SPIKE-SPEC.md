# Spec Sheet: Godot WASM Combat Runtime — De-Risking Spike

## Bytecode Search Code
`SCHOL-ENC-BYKE-SEARCH-GODOT-WASM-COMBAT-SPEC`

**Status:** Proposed — Spike (Phase 0 docs complete)
**Classification:** Architectural | Rendering Substrate | Combat Surface | Spike / De-Risk
**Priority:** High
**Primary Goal:** Define the bounded, disposable path that measures whether a live Godot WASM runtime can own the Combat screen — without entangling, modifying, or deleting the working React + Phaser Combat stack until the measurements justify it.

---

# 1. Scope

This spec covers the concept the user described as:

> "Completely removing all UI from the Combat page, redoing it with Godot as the main visual layer and Phaser as the special effects (physics). Strip everything — the engine owns the whole screen, including HUD and input."

The spike must proceed in veto-gated layers:

1. An isolated dev-only route that does not touch shipping Combat code.
2. A real Godot Web export loaded as a static asset.
3. Measured bundle size + cold-load on target hardware (**Kill-Q1**).
4. A proven `postMessage` bridge round-trip (**Kill-Q2**).
5. A verse text-input verdict: engine-native vs DOM overlay (**Kill-Q3**).
6. A go / go-hybrid / abandon recommendation.

This spec intentionally does **not** rewrite `CombatPage.jsx`, **not** remove Phaser, and **not** treat the canvas2D replay proxy (`GodotOverlay.jsx`) as a "main layer" candidate.

---

# 2. Caveats and Boundaries

| Caveat | Rule |
|---|---|
| Blast radius | The spike is additive. No edits to `src/pages/Combat/**`, `combatBridge.js`, or `src/lib/godot-export/**`. |
| Path B exclusion | The canvas2D replay proxy cannot host HUD/text input; it is not evaluated as a primary renderer. |
| Text input is core | Verse entry is the game's main interaction. Its viability is a named gate (Kill-Q3), not an assumption. |
| Bundle honesty | Record raw **and** gzipped WASM/PCK size, plus cold-load ms on a Steam Deck-class device. No rounding away the cost. |
| Bridge contract | The spike uses a *stub* event, not real `CombatResult`/`ScoreTrace`. The real schema is co-owned with Codex and is out of spike scope. |
| Disposability | Spike route, bridge shim, and stub scene are throwaway. Do not optimize them for production reuse. |
| No nav wiring | The route is dev-only and must not appear in player navigation or ship to prod. |
| Decision authority | No Combat-page deletion is authorized until Kill-Q1, Kill-Q2, and Kill-Q3 are all green and recorded in the PDR Findings. |
| LAW jurisdiction | Route lives in `src/pages/` (Claude/UI). Reads Godot export output; writes nothing under `codex/` or `src/lib/`. |

---

# 3. Phase Contracts

## Phase 0 — Contract Definition

**Deliverables:**
- This spec sheet.
- Companion PDR (`PDR-2026-06-04-GODOT-WASM-COMBAT-SPIKE.md`).

**Acceptance:**
- Documents explicitly separate Path A (real WASM) from Path B (replay proxy) and reject B for this goal.
- The three kill-questions are enumerated with veto authority.
- Non-goals and jurisdiction are stated.

## Phase 1 — Spike Route + Placeholder Host *(immediate deliverable)*

**Deliverables:**
- `src/pages/CombatGodotSpike/CombatGodotSpike.jsx` — a standalone page that fills the viewport.
- `src/pages/CombatGodotSpike/CombatGodotSpike.css` — full-bleed black host + a dev banner.
- A lazy route registered in the router (e.g. `/combat-godot-spike`), **dev-only** (not in nav).
- A placeholder host element (`<iframe>` or `<canvas>` container) plus an on-screen instrumentation panel (load timer, bridge log) that the later phases populate.

**Acceptance:**
- Navigating to `/combat-godot-spike` renders the host + instrumentation panel.
- Zero imports from `src/pages/Combat/**` or `src/lib/godot-export/**`.
- `npm run build` and `npm run lint` pass; existing Combat page is byte-for-byte unchanged.

## Phase 2 — Godot Web Export Ingest

**Deliverables:**
- A Godot HTML5/WASM export of `godot_project` (stub scene is fine) placed under a static dir (e.g. `public/godot-spike/`).
- The spike route loads that build into its host (`<iframe src>` to the Godot `index.html`, or direct engine embed).
- A short note in the PDR on the export command/preset used.

**Acceptance:**
- The Godot canvas renders inside the route (even just a clear-color + a sprite).
- The build is served as a static asset; no Vite source coupling to the engine bundle.

## Phase 3 — Kill-Q1: Bundle / Load *(VETO GATE)*

**Deliverables:**
- Recorded raw + gzipped size of `.wasm` + `.pck` + loader.
- Recorded cold-load time (cache-disabled) on a Steam Deck-class device.

**Acceptance / veto:**
- Numbers written into PDR §9 Findings.
- **Red** if bundle or load is judged unacceptable for web deploy → spike halts, recommendation defaults to **stay on Phaser**.

## Phase 4 — Kill-Q2: postMessage Bridge *(VETO GATE)*

**Deliverables:**
- A minimal bridge: React posts `{type:'cast', payload}` → Godot renders a stub effect → Godot posts `{type:'anim_done'}` → React logs it in the instrumentation panel.
- Round-trip latency recorded.

**Acceptance / veto:**
- One full round-trip visibly completes and is logged.
- **Red** if the boundary proves unworkable (focus, serialization, latency) → halt, default to Phaser.

## Phase 5 — Kill-Q3: Text Input *(VETO GATE)*

**Deliverables:**
- Verse entry tested **two ways**: (a) a Godot `LineEdit`/`TextEdit` inside the WASM canvas, and (b) a DOM `<textarea>` overlay positioned over the canvas, feeding text across the bridge.
- Notes on IME, paste, caret, focus, and mobile/Steam Deck on-screen keyboard behavior for each.

**Acceptance / verdict:**
- A written verdict: **engine-native input is acceptable**, or **DOM overlay required** (→ Path A-hybrid), or **input is unworkable** (→ abandon).

## Phase 6 — Findings & Recommendation

**Deliverables:**
- PDR §9 Findings filled with all measured numbers.
- One recommendation: **Path A (full rewrite)** / **Path A-hybrid (engine + DOM text overlay)** / **Abandon (stay on Phaser)**.

**Acceptance:**
- The recommendation is justified by the recorded measurements, not by preference.

---

# 4. File Manifest (spike, all disposable)

| Path | Owner | Purpose |
|---|---|---|
| `src/pages/CombatGodotSpike/CombatGodotSpike.jsx` | Claude/UI | Isolated spike host + instrumentation |
| `src/pages/CombatGodotSpike/CombatGodotSpike.css` | Claude/UI | Full-bleed host styling + dev banner |
| Router entry (lazy, dev-only) | Claude/UI | `/combat-godot-spike` |
| `public/godot-spike/**` (Phase 2) | build output | Static Godot Web export |

**Untouched (hard stops):** `src/pages/Combat/**`, `src/pages/Combat/combatBridge.js`, `src/lib/godot-export/**`, `codex/**`.

---

# 5. Definition of Done (spike)

- [ ] PDR + SPEC committed (Phase 0).
- [ ] `/combat-godot-spike` route renders, isolated, dev-only (Phase 1).
- [ ] Godot Web export loads in the route (Phase 2).
- [ ] Kill-Q1 bundle/load numbers recorded (Phase 3).
- [ ] Kill-Q2 bridge round-trip proven (Phase 4).
- [ ] Kill-Q3 text-input verdict recorded (Phase 5).
- [ ] Go / Go-hybrid / Abandon recommendation written into PDR §9 (Phase 6).
- [ ] Existing Combat page unchanged; `npm run build` + `npm run lint` green.
