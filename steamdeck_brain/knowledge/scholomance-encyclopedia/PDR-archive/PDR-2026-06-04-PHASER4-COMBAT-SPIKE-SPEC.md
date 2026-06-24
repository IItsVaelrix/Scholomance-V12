# Spec Sheet: Phaser 4 Combat Renderer — Visual Uplift Spike

## Bytecode Search Code
`SCHOL-ENC-BYKE-SEARCH-PHASER4-COMBAT-SPEC`

**Status:** Proposed — Spike (Phase 0 docs + Phase 1 scene/route complete)
**Classification:** Architectural | Rendering Substrate | Combat Surface | Dependency Major Upgrade | Spike / De-Risk
**Priority:** High
**Primary Goal:** Bound the Phaser-4 visual-uplift evaluation so it answers "is the look dramatically better, and what does 3→4 cost?" without regressing the eight live Phaser-3 surfaces or altering the shipping `phaser` dependency.

---

# 1. Scope

Covers the user intent: *"dramatically better-looking combat — let's spike Phaser 4."*

In scope:
1. Install Phaser 4 under npm alias `phaser4` (coexists with `phaser@3.90`).
2. One show-off **Void Arena** scene on the 4.x renderer (Filters glow + vignette + color-grade, additive particle embers, a click-to-cast burst, animated singularity).
3. A dev-only route `/combat-phaser4-spike` that mounts it full-bleed with a comparison banner.

Out of scope: real combat logic, `combatBridge`, board state, the other Phaser surfaces, navigation wiring, production shipping.

---

# 2. Caveats and Boundaries

| Caveat | Rule |
|---|---|
| Dependency safety | Do not change `phaser@^3.90.0`. Phaser 4 enters only as the additive alias `phaser4`. |
| Blast radius | No edits to `ResonanceScene`, `PhaserLayer.jsx`, `src/pages/Combat/**`, or any Listen/Read/SigilChamber/WordTooltip scene. |
| Breaking-major reality | The spike must use the real 4.x API (Filters, not `postFX`). Code is written against the installed `phaser4` type defs, not Phaser-3 memory. |
| FX availability | 4.x has Glow, Vignette, Blur, Bokeh, ColorMatrix, Displacement, Barrel, Pixelate. No `Bloom`/`Shine`. Approximate bloom with `Glow` + `ColorMatrix.brightness`. |
| Filter access | Cameras expose `.filters` directly; GameObjects require `enableFilters()` first. Glow that bleeds past edges uses the `external` list. |
| Honesty | If the uplift is marginal, the findings say "marginal" — no overselling a major migration. |
| Disposability | Scene, route, CSS, and the `phaser4` alias are throwaway if the verdict is "stay on 3." |
| No nav / no prod | Route is dev-only behind `import.meta.env.DEV`; never in player navigation. |

---

# 3. Phase Contracts

## Phase 0 — Contract Definition
**Deliverables:** this spec + companion PDR.
**Acceptance:** alias strategy, non-goals, and the known FX-API migration cost are documented.

## Phase 1 — Alias Install + Show-off Scene + Route *(this pass)*
**Deliverables:**
- `package.json` gains `"phaser4": "npm:phaser@^4.1.0"` (additive).
- `src/pages/CombatPhaser4Spike/VoidArenaP4Scene.js` — the 4.x scene.
- `src/pages/CombatPhaser4Spike/CombatPhaser4Spike.jsx` — React host (lazy-imports `phaser4`, owns game lifecycle + resize).
- `src/pages/CombatPhaser4Spike/CombatPhaser4Spike.css`.
- Dev-only route `/combat-phaser4-spike` in `main.jsx`.

**Acceptance:**
- `phaser4@4.1.0` and `phaser@3.90.0` both resolve.
- Route renders the scene on the Phaser-4 renderer; click spawns a cast burst.
- `npm run build` + `npm run lint` green.
- `git diff` shows zero changes to Phaser-3 surfaces.

## Phase 2 — Eyeball: Uplift? *(user)*
**Deliverables:** side-by-side judgement vs `/combat` (`ResonanceScene`).
**Acceptance:** a recorded verdict — *dramatic* / *marginal* / *worse* — in PDR §9.

## Phase 3 — Migration-Cost Audit
**Deliverables:** enumerate every 3→4 break across actual Combat usage (FX, particle config, blend modes, scene API deltas, pipeline/shader rewrites).
**Acceptance:** a concrete migration checklist sized in PDR §9.

## Phase 4 — Findings & Recommendation
**Deliverables:** PDR §9 filled.
**Acceptance:** one of — migrate Combat to Phaser 4 / stay on 3 + incremental polish / escalate to React-Three-Fiber — justified by the eyeball + audit.

---

# 4. File Manifest (spike, all disposable)

| Path | Owner | Purpose |
|---|---|---|
| `package.json` → `phaser4` alias | build | Phaser 4 coexisting with 3 |
| `src/pages/CombatPhaser4Spike/VoidArenaP4Scene.js` | Claude/UI | 4.x show-off scene |
| `src/pages/CombatPhaser4Spike/CombatPhaser4Spike.jsx` | Claude/UI | React host + lifecycle |
| `src/pages/CombatPhaser4Spike/CombatPhaser4Spike.css` | Claude/UI | Full-bleed host + banner |
| Router entry (lazy, dev-only) | Claude/UI | `/combat-phaser4-spike` |

**Untouched:** `phaser@^3.90.0`, `src/pages/Combat/**`, `ResonanceScene`, `PhaserLayer.jsx`, all other Phaser scenes, `src/lib/godot-export/**`, `codex/**`.

---

# 5. Definition of Done (spike)
- [ ] PDR + SPEC committed (Phase 0).
- [ ] `phaser4` alias installed; both versions resolve (Phase 1).
- [ ] `/combat-phaser4-spike` renders the 4.x Void Arena; click-to-cast works (Phase 1).
- [ ] `npm run build` + `npm run lint` green; Phaser-3 surfaces byte-unchanged (Phase 1).
- [ ] Uplift verdict recorded (Phase 2).
- [ ] 3→4 migration checklist recorded (Phase 3).
- [ ] Recommendation written into PDR §9 (Phase 4).
