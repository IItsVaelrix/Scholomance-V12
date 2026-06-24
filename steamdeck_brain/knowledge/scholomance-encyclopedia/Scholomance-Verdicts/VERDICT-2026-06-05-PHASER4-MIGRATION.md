# VERDICT-2026-06-05-PHASER4-MIGRATION

## Bytecode Search Code
`SCHOL-ENC-BYKE-SEARCH-VERDICT-PHASER4-MIGRATION`

## Verdict Identity
- Target: `docs/scholomance-encyclopedia/PDR-archive/PDR-2026-06-04-PHASER4-COMBAT-SPIKE.md` + its implementation (whole-app Phaser 3.90 → 4.1 migration; `src/pages/Combat/scenes/ResonanceScene.js`, 3 Listen scenes, `package.json`)
- Auditor(s): `claude-ui`
- Date Rendered: 2026-06-05
- Re-Render Due: 2026-09-05 (Experimental / pre-soak — visual regression unverified at render time)
- Audit Frame: Vaelrix Law + ByteCode Error System + UI/rendering-surface specialty lens
- Verdict Class: SINGLE-AUDITOR
- Status: RENDERED

> **Single-auditor justification:** the migration writes only in `src/pages/**` and `package.json` — Claude/UI jurisdiction. No `codex/`, `SCHEMA_CONTRACT.md`, `tests/`, or `.github/` writes. Single-Auditor Exemption applies; no cross-cutting law (3/6/7/13) is touched.

---

## 1. Scoring Sigil

| Metric | Polarity | Score | Justification |
|---|---|---|---|
| **Impact Score** | ▲ | 6 | Meaningful subsystem: combat renderer uplift (Filters glow/vignette/grade) + consolidation of 8 surfaces onto one engine. Not load-bearing canon. |
| **Revenue Potential** | ▲ | 3 | Better-looking combat may aid retention, but unmeasured; no infra cost saved (bundle did not shrink — see Concerns). |
| **Architecture Risk** | ▼ | 5 | Major dep bump across 8 surfaces, but isolated to the rendering layer; no schema/contract coupling; the public `ResonanceScene` contract is preserved verbatim. Risk concentrated in *unverified visual behavior*, not structure. |
| **UX Friction** | ▼ | 2 | Invisible to players except as richer visuals. DOM verse input and React HUD untouched — the core loop is undisturbed. |
| **Law Violations** | ▼ | 3 | One WARN: new Filters/bloom motion added without `prefers-reduced-motion` gating (LAW: "respect prefers-reduced-motion"). No CRIT/FATAL. |
| **Immune Potential** | ▲ | 3 | Rendering surface; L1 format/L2 adaptive scans apply only marginally. Not immune substrate. |
| **Innovation Rating** | ▲ | 6 | Clever local engineering: npm-alias coexistence → consolidation, API verified against installed `.d.ts` (not memory), uniformly guarded filters. Transferable migration pattern, not a publishable substrate. |

### Verdict Grade: **B** — Good (with Specific Friction)

No FATAL, no CRIT (caps not triggered). Architecture Risk 5 (< 7, no cap). The architecture is sound and the public contract preserved; what holds it below **A** is *procedural*: visual regression across the 7 non-combat surfaces is unverified at render time, and the new motion lacks reduced-motion gating (one WARN). Matches the B phenotype: "the architecture is sound; the procedural execution is what holds it below A."

---

## 2. Validated Praise

Specific, cited achievements:

- **Engine consolidation is real, not claimed.** Post-migration the build emits a single `phaser.esm-*.js` chunk; the prior `phaser-*.js` (Phaser 3) chunk is gone. One engine, one version (`package.json:103` now `"phaser": "^4.1.0"`, alias removed).
- **The public render contract was preserved verbatim.** All 10 `ResonanceScene` methods (`setArenaSchool`, `setCursor`, `updateTileStates`, `renderUnits`, `animateMove/Cast/Hit/TurnShift`, `playCastEffect`, `recenter`) keep their signatures, so `PhaserLayer.jsx`'s `useImperativeHandle` bridge needed zero changes — the migration stayed inside the rendering layer.
- **The breaking-change surface was discovered by evidence, not assumption.** The audit scanned all 8 surfaces and found the only true breakage — `postFX.addBloom` in 3 Listen scenes (`AlchemicalLabScene.js:80`, `CrystalBallScene.js:168`, `SignalChamberScene.js:77`) — Phaser 4 having removed both `postFX` and the `Bloom` filter. `setBlendMode('ADD'/'SCREEN')` (~10 sites) and all particle/tween/sprite APIs were verified *still valid* against the installed `phaser@4.1.0` type defs before being trusted.
- **Failure is contained by design.** Every new Filters call (`ResonanceScene._applyGlow`, `_applyCameraGrade`, and the 3 migrated scenes) is wrapped so an API drift degrades to "no glow," never a blanked canvas — and the camera glow uses school-agnostic white to avoid filter re-stacking on `setArenaSchool()`.

## 3. Architectural Concerns

Ranked by ByteCode severity:

- **[CRIT] Visual + interaction behavior is unverified.** The auditor has no WebGL context; verification ceiling was build + lint + unit tests (18/18) + dev-boot module resolution. Whether the migrated `ResonanceScene` animations (move/cast/hit) and the 7 other surfaces *actually render and play correctly* on the new renderer is **unproven**. This is the load-bearing gap; it caps the grade's confidence and drives the Re-Render window to 3 months.
- **[WARN] Bundle did not improve — it grew.** Phaser 4 ships at **1.36 MB / 365 KB gz** vs Phaser 3's ~1.2 MB / 332 KB gz. The "improvement" is visual fidelity and consolidation, **not** performance or payload. Any framing of this migration as a perf win is false.
- **[WARN] New motion ignores `prefers-reduced-motion`.** The camera bloom/vignette and per-object glow pulses were added with no reduced-motion branch, contra the UI LAW's non-negotiable. See §4.
- **[WARN] Filters-in-containers is an unproven assumption.** `_applyGlow` is applied to unit *containers*; whether Phaser 4's filter system renders correctly on container children at runtime is guarded but untested. If it no-ops, units fall back to the pre-existing graphics halo (acceptable, but the "dramatic uplift" claim partially rests on this working).
- **[INFO] Steam Deck filter cost unmeasured.** Full-screen glow + vignette + color-matrix is a multi-pass post chain; perf on the target device is unbenchmarked.

## 4. Law Violations

| Law clause | Evidence in target | Severity | Recommended remedy |
|---|---|---|---|
| UI LAW — "Motion … Respect `prefers-reduced-motion`" / "`usePrefersReducedMotion` wraps all animation decisions" | `ResonanceScene._applyCameraGrade` and `_applyGlow` add bloom + pulsing glow unconditionally; the 3 Listen scenes add `addGlow` with no motion guard | **WARN** | Gate the new Filters behind a reduced-motion check (pass a `reducedMotion` flag from React through `PhaserLayer` into the scene; skip glow/bloom or render static when set). |
| UI LAW — Accessibility "non-negotiable" (SR announcements, ARIA) | Migration does not *regress* a11y (combat was already canvas-rendered; HUD remains React DOM) but adds none | **INFO** | No action required by this migration; tracked against the broader combat-canvas a11y debt, not this change. |

No CRIT or FATAL law violations. The parallel-schema / authoritative-endpoint / SCHEMA_CONTRACT tenets are untouched.

## 5. Admonishment of the Arbiter

Direct address. Two procedural shortcuts undermined the law structure:

1. **You shipped a renderer migration you could not see.** Build-green is not render-green. The Arbiter accepted "modules resolve + tests pass" as sufficient to consolidate *eight* visual surfaces onto a new engine. That is a measurement gate substituted for the measurement it stands in for. The visual regression is owed *before* this grade rises above B — not after a user stumbles on a broken visualizer.
2. **You let a semver pin make an architectural decision by default.** The codebase sat on Phaser 3 not by judgment but because `"^3.90.0"` capped below the major. An engine-version policy was absent; inertia chose the stack. The migration fixed the symptom (bumped to 4) without inscribing the policy (when/how majors are evaluated). The next lag will happen the same way unless the policy is written.

## 6. Recursive Bug Elimination

Failure modes this migration lets the system defend against going forward:

- **"API verified against memory" rot.** The migration established the pattern of grepping the *installed* `.d.ts` before trusting an API (caught `postFX`→`Filters`, absent `Bloom`/`Shine`, `make.graphics` arg change). Encode this as the standard for all future engine/dep-major work — it is the antidote to the recurring "the docs in my head said X" defect class.
- **Orphan-chunk-from-dead-route.** The spike phase surfaced that a dev-only `import()` still emits a (never-served) prod chunk. Documented in the spike PDR; future dev-only routes should expect this and not claim "tree-shaken."
- **Silent FX no-op on engine upgrade.** The 3 Listen scenes' `if (this.cameras.main.postFX)` guard meant Phaser 4 would have *silently dropped* their bloom with no error. The migration converted guard-into-silence into explicit Filters code — but the lesson is that defensive `if (api)` guards hide breakage across majors. Prefer loud capability assertions in scene `create()`.

## 7. Remediation Tiers

### Immediate (this PR / current cycle)

| Action | Owner | Severity | Cost | Reversibility | Success Criterion |
|---|---|---|---|---|---|
| Eyeball-verify all 8 Phaser surfaces render + animate on 4.1 (`/combat`, 3 Listen visualizers, Read IDE ambient, SigilChamber, WordTooltip) | Angel + claude-ui | CRIT | 1.5 agent-hr | Each surface confirmed visually correct or a defect logged |
| Gate new combat/Listen Filters behind `prefers-reduced-motion` | claude-ui | WARN | 2 agent-hr | With reduced-motion set, no bloom/glow pulse renders |

### 30 Day

| Action | Owner | Severity | Cost | Reversibility | Success Criterion |
|---|---|---|---|---|---|
| Capture Playwright visual baselines for `/combat` + Listen visualizers under `tests/visual/` | claude-ui | WARN | 3 agent-hr | Baselines committed; future renderer changes diff against them |
| Inscribe an engine-version-bump policy (when majors are evaluated, who owns the spike) | Angel | INFO | 1 agent-hr | Policy doc exists in encyclopedia; referenced from CLAUDE.md |

### 90 Day

| Action | Owner | Severity | Cost | Reversibility | Success Criterion |
|---|---|---|---|---|---|
| Benchmark the Filters post-chain on Steam Deck; tune glow quality/distance if frame budget exceeded | claude-ui | INFO | 2 agent-hr | Combat holds target FPS on-device with filters active |
| Evaluate `manualChunks` for the 1.36 MB phaser chunk vs lazy-route loading | claude-ui | INFO | 2 agent-hr | Decision recorded; no regression to first-load of non-Phaser routes |

### Long Term

| Action | Owner | Severity | Cost | Reversibility | Success Criterion |
|---|---|---|---|---|---|
| If post-soak the uplift is judged insufficient, escalate to React-Three-Fiber for shader/depth fidelity (next rung above Phaser per the spike ladder) | Angel + claude-ui | INFO | TBD | one-way | A re-rendered verdict or a new R3F spike PDR supersedes this direction |

No tier is empty.

## 8. Final Verdict

The Phaser 4 migration is a **competently executed, evidence-driven consolidation** that did exactly what it set out to do at the structural level: one engine instead of two, the combat render contract preserved intact, the only true breakage (`postFX`→`Filters`) found by scanning rather than guessing, and every new effect guarded against API drift. Its honest improvements are *visual fidelity* and *architectural consolidation* — **not** bundle size (which grew) and **not** accessibility (unchanged). It is held at **B**, not A, by two procedural debts: the visual/interaction behavior across eight surfaces is unverified at render time (a CRIT concern that build-green cannot discharge), and the new motion was added without the LAW-mandated reduced-motion gating (one WARN). Re-render is due **2026-09-05**, or earlier upon: (a) the Immediate-tier visual sweep completing green, which is expected to lift the cap toward A, or (b) any surface proving broken on 4.1, which would drop it to C pending repair. **Verdict Grade: B.**

---

*Rendered by claude-ui under the Scholomance Verdict schema. A verdict is a mirror, not a hammer.*
