# PDR: Phaser 4 Combat Renderer — Visual Uplift Spike
## Can Phaser 4's renderer give us "dramatically better-looking combat" in-place?

## Bytecode Search Code
`SCHOL-ENC-BYKE-SEARCH-PHASER4-COMBAT-PDR`

**Status:** Implemented (2026-06-05) — verdict went "go"; whole-app migration to Phaser 4.1 landed. Spike route retired. See VERDICT-2026-06-05-PHASER4-MIGRATION (Grade B).
**Classification:** Architectural | Rendering Substrate | Combat Surface | Dependency Major Upgrade | Spike / De-Risk
**Priority:** High (preferred lower-risk alternative to the Godot WASM rewrite)
**Primary Goal:** Determine — with a real, running, side-by-side scene — whether upgrading the Combat renderer from Phaser 3.90 to Phaser 4.x delivers a *dramatic* visual uplift, and at what migration cost, **without** importing a second engine (Godot) and **without** leaving the React / DOM-text / accessibility stack the game's identity depends on.

---

# 1. Executive Summary

The companion spike [`PDR-2026-06-04-GODOT-WASM-COMBAT-SPIKE`](./PDR-2026-06-04-GODOT-WASM-COMBAT-SPIKE.md) established that Combat renders through **Phaser today**, and that "engine owns the screen" via Godot WASM carries heavy structural costs: a 20–40 MB bundle, an iframe/postMessage bridge, a COOP/COEP hosting tax, an accessibility black box, and a fight with DOM text input — the game's core "words are weapons" loop and a *sacred technique* in the LAW.

A cheaper hypothesis surfaced: the project is on **Phaser 3.90 only because the dependency is pinned `^3.90.0`** (semver caps below the 4.0 major). npm `latest` is **4.1.0**. Phaser 4's headline is a **ground-up renderer rewrite** plus a new **Filters** post-processing system. If the motivation for reaching toward Godot was *"combat should look dramatically better,"* Phaser 4 may satisfy it **in-place** — same React architecture, same DOM text input, same a11y, no bridge.

This PDR scopes an **isolated visual-uplift spike**: install Phaser 4 under an **npm alias** (`phaser4`) so it coexists with `phaser@3.90` (zero blast radius to the ~8 existing Phaser surfaces), build one deliberately show-off **Void Arena** scene on the 4.x renderer, and mount it behind a dev-only route for a direct eyeball comparison against the live `ResonanceScene`.

---

# 2. Problem Statement

We are choosing a rendering substrate for Combat. The expensive option (Godot WASM) was de-risked but looks structurally wrong for this game. Before committing to *any* rewrite, we must answer the cheaper question first:

> Does the renderer we already use, one major version newer, already get us the look we want?

If yes, the Godot question is moot and we avoid a high-risk engine swap. If no, we have a measured reason to climb the cost ladder (Phaser 4 → React-Three-Fiber → Godot).

The risk being sequenced: Phaser 4 is a **breaking major**. A naive `^4` bump would break `ResonanceScene` plus the Listen, Read, SigilChamber, and WordTooltip surfaces at once. The alias keeps the evaluation contained.

---

# 3. Product Goal

Deliver a running, isolated Phaser-4 Void Arena scene that exercises the new renderer's strongest visual features, plus a findings note answering:

1. **Uplift** — Is the visual difference *dramatic* (not marginal) versus the Phaser-3 `ResonanceScene`?
2. **Migration cost** — What concretely breaks 3→4 for our usage? (Already found: the FX API moved from `gameObject.postFX.addGlow()` to a camera/GameObject **Filters** system — `obj.enableFilters(); obj.filters.external.addGlow()`; `Bloom`/`Shine` filters do not exist in 4.x.)
3. **Recommendation** — Migrate Combat to Phaser 4 / stay on Phaser 3 + incremental polish / escalate to R3F.

---

# 4. Non-Goals

- **Do not** change the pinned `phaser@^3.90.0` dependency or touch the ~8 surfaces that use it. The alias `phaser4` is additive.
- **Do not** port real combat state, scoring, board logic, or `combatBridge` into the spike scene. It renders a stub Void Arena reacting to clicks.
- **Do not** migrate the Listen/Read/SigilChamber/WordTooltip scenes. Out of scope.
- **Do not** wire the spike into navigation or ship it to production.
- **Do not** delete or modify `ResonanceScene`, `PhaserLayer.jsx`, or `src/pages/Combat/**`.

---

# 5. Core Design Principles

1. **Cheapest rung first.** Prove or kill the in-place upgrade before escalating to a new engine. Numbers and eyeballs, not vibes.
2. **Coexistence over migration.** Phaser 3 and Phaser 4 run side by side via npm alias; the spike cannot regress shipping surfaces.
3. **Keep the soul.** React, DOM verse input, and accessibility stay intact — that's the whole reason Phaser 4 beats Godot for this game.
4. **Show off honestly.** The spike scene deliberately stresses the new renderer (Filters glow, vignette, color-grade, additive particles, lighting). If it still looks flat, the findings say so plainly.
5. **Disposable.** Scene, route, and the `phaser4` alias are throwaway if the answer is "stay on 3."

---

# 6. Why Phaser 4 over the alternatives (recap)

| Option | Visual ceiling | Keeps React / DOM-text / a11y | Bundle / hosting cost | Risk |
|---|---|---|---|---|
| Phaser 3 + polish | Modest | Yes | None | Minimal |
| **Phaser 4 (this spike)** | **High (new renderer + Filters)** | **Yes** | **Low** | Breaking major migration |
| React-Three-Fiber | Very high (shaders/depth) | Yes (DOM HUD via `<Html>`) | Medium | New paradigm |
| Godot WASM runtime | Very high | **No** (a11y black box, fights text input) | High (20–40 MB + COOP/COEP) | Highest |

Phaser 4 is the first rung that raises the visual ceiling *without* sacrificing the architecture the game is built on.

---

# 7. Phase Plan

| Phase | Name | Gate |
|---|---|---|
| 0 | Contract docs (this PDR + SPEC) | Alias strategy + non-goals fixed |
| 1 | Alias install + show-off scene + route | `phaser4` coexists; `/combat-phaser4-spike` renders on 4.x; build + lint green; Phaser 3 surfaces untouched |
| 2 | **Eyeball: uplift?** | Side-by-side vs `ResonanceScene`; verdict recorded |
| 3 | Migration-cost audit | Enumerate every 3→4 break across Combat usage |
| 4 | Findings + recommendation | Migrate / stay+polish / escalate to R3F |

Phase 1 is the deliverable in this pass. Phase 2 is the user's eyeball call (`npm run dev` → `/combat-phaser4-spike`).

---

# 8. Jurisdiction & LAW Notes

- Spike route + scene live under `src/pages/` — **Claude (UI) territory**.
- No edits to `src/pages/Combat/**`, `src/lib/godot-export/**`, or `codex/**`.
- `package.json` gains one additive dev-evaluation alias (`phaser4`); the shipping `phaser` pin is unchanged.
- Accessibility note: the spike is a visual probe, not a player surface, so the LAW's combat-a11y requirements (ARIA, SR announcements) apply to the *eventual* migration, not the probe. Crucially, Phaser 4 — unlike Godot WASM — leaves those requirements *achievable*, since the HUD stays in React DOM.

---

# 9. Findings (Phases 2–4 — complete)

**Verdict: GO (whole-app migration). Implemented 2026-06-05.**

**Migration-cost audit (3→4 break list, from scanning all 8 Phaser surfaces):**
- **FX rewrite (only true breakage):** `camera.postFX.addBloom()` → Filters API. Phaser 4 removed `postFX`/`preFX` *and* the `Bloom`/`Shine` filters. Migrated 3 Listen scenes (`AlchemicalLabScene`, `CrystalBallScene`, `SignalChamberScene`) to `camera.filters.internal.addGlow() + addColorMatrix().brightness()`.
- **Non-breaks (verified against installed `.d.ts`, no change needed):** `setBlendMode('ADD'/'SCREEN')` (~10 sites) still valid; particle `add.particles(x,y,tex,cfg)`, `emitZone` edge, `follow`, `emitParticleAt`, tweens, `setInteractive`, `Geom.*`, `Scale.RESIZE/CENTER_BOTH`, `cameras.main.shake` all unchanged.
- **One config change:** `make.graphics({add:false})` → `add.graphics()`+`destroy()` (the `add` config field became a positional `addToScene` arg).

**What shipped:**
- `package.json`: `phaser@^3.90.0` + `phaser4` alias → single `phaser@^4.1.0`.
- `ResonanceScene.js`: migrated + uplift (camera bloom/vignette/grade via `_applyCameraGrade`, guarded per-object glow via `_applyGlow` on units + cast effects). 10-method public contract preserved verbatim — `PhaserLayer` unchanged.
- 3 Listen scenes: `postFX`→Filters.
- Spike route `/combat-phaser4-spike` + folder retired.

**Verified:** lint (errors) green; `npm run build` green (single phaser chunk, old phaser@3 chunk gone); unit tests 18/18; dev-boot module resolution clean. **Not verified (auditor has no WebGL):** actual render/animation correctness across the 8 surfaces — see VERDICT-2026-06-05-PHASER4-MIGRATION §3 (CRIT) and its Immediate remediation tier.

**Honest caveats:** bundle did NOT shrink (1.36 MB vs ~1.2 MB on 3.x) — the win is fidelity + consolidation, not payload. New motion lacks `prefers-reduced-motion` gating (WARN, remediation queued).
