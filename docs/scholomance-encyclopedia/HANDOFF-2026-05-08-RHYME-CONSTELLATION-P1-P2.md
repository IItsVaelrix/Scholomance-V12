# HANDOFF-2026-05-08-RHYME-CONSTELLATION-P1-P2

## Bytecode Search Code
`SCHOL-ENC-BYKE-SEARCH-CONSTELLATION-HANDOFF-P1-P2`

## SISP Audit Token
`SISP-AUDIT-v1-PASS-CLAUDE-0001`

> Reviewed under [Scholomance Ironclad Sterilization Protocol v1](../skills/scholomance.ironclad.sterilization.protocol.skill.md). This handoff is a cross-agent fix specification per SISP §4, and is therefore subject to SISP rigor: evidence-tiered findings, recursion sterilization, fix instruction IR, VAELRIX compliance audit, and the §14 reviewer checklist.

## Verdict
**Pass — implementation-ready.** Phase 1 and Phase 2 may proceed in the order specified in §Tri-Agent Sequencing. Three load-bearing fixes are formalized in §Fix Instruction IR. No VAELRIX stop conditions trip. Residual unknowns are bounded and disclosed.

## Status
**HANDOFF** — Engineering distribution for Phases 1–2 of the Rhyme Constellation. Phases 3–5 deferred until §15.4–§15.7 of the PDR are decided.

## Scope
Phase 1 (Manifold Display, read-only) and Phase 2 (Ballistic Forecast Visualization) of [`PDR-archive/rhyme_constellation_pdr.md`](./PDR-archive/rhyme_constellation_pdr.md). Out of scope: manifold mutation (P4), tonal accent persistence (P5), syntax arbitration visualization (P3 — depends on PDR §15.5).

## Required Reading Order

Per SISP §5, every implementing agent must read the following before acting:

1. `SHARED_PREAMBLE.md` — root agent context.
2. `VAELRIX_LAW.md` — sovereign law; stop conditions live here.
3. `SCHEMA_CONTRACT.md` — schema sovereignty boundary; new shapes in 1.A.1, 1.A.2, 2.A.1 must land here first.
4. Agent lane file: `CLAUDE.md`, `GEMINI.md`, or the codex equivalent — depends on owner of the active task.
5. `PDR-archive/rhyme_constellation_pdr.md` — design source of truth for this handoff.
6. `ARCH_CONTRACT_OVERLAY_INTEGRITY.md` — composition guard; the constellation must not regress the cursor stasis seal.
7. `forensic-search/references/error-patterns.md` — Law 10 z-index, State Drift, and Bytecode Violation signatures.
8. `docs/ByteCode Error System/` (relevant subset) — bytecode error code authoring conventions; needed for `CONSTELL-0301` and `CONSTELL-0302`.

If any source above is unread at task start, the agent must mark the corresponding compliance bullet `Unknown` per SISP §5 rather than claim full compliance.

## Sovereign decisions in force
- `constellationEnabled` opt-in **auto-enables** `truesightEnabled`. Disabling Truesight afterward does not disable Constellation.
- Toggle copy: **"Witness the manifold"**.
- Commit model: **provisional pigment** — strokes render at <0.5 opacity until ratified.

---

## Tri-Agent Sequencing

```
[ CODEX: schemas + contracts ]                      ──┐
       │                                              │  P1
       └──> [ GEMINI: settings flag, coupling rule, ──┤
              data hook for chroma points ]           │
                       │                              │
                       └──> [ CLAUDE: read-only  ─────┘
                              constellation surface ]
                                       │
                                       ▼
[ CODEX: forecast event schema ]                    ──┐
       │                                              │  P2
       └──> [ GEMINI: ballisticForecast.js,    ──────┤
              event bus emission, latency tests ]    │
                       │                              │
                       └──> [ CLAUDE: BallisticStroke,│
                              useBallisticForecast,  │
                              provisional opacity ]──┘
```

Codex commits first per phase. Gemini blocked on Codex schema. Claude blocked on Gemini hook output.

---

# PHASE 1 — Manifold Display (Read-Only)

## 1.A — CODEX (schemas)

### 1.A.1 — Define `constellationEnabled` settings flag
**Owner:** Codex.
**Path:** `SCHEMA_CONTRACT.md` + settings schema location of record.
**Action:**
- Add `constellationEnabled: boolean` to settings schema; default `false`.
- Document the coupling rule as a schema-level invariant: *setting `constellationEnabled = true` must coerce `truesightEnabled = true` in the same write*. The reverse coupling does not hold.
**Acceptance:** Schema reviewed; coupling invariant unambiguous; default specified.
**Effort:** 15 min.

### 1.A.2 — Define `RhymeFamilyManifoldPoint` shape
**Owner:** Codex.
**Path:** `src/lib/truesight/color/types.d.ts` (or schema file of record).
**Action:** Define
```ts
type RhymeFamilyManifoldPoint = {
  rhymeFamily: string;        // e.g. "AY", "EY"
  oklch: { L: number; C: number; h: number };
  schoolId: string;           // current school context
  formant: { f1: number; f2: number };  // for diagnostic overlay
};
```
**Acceptance:** Type exported; consumers (Gemini hook, Claude renderer) import from one location.
**Effort:** 10 min.

### 1.A.3 — Layer law: Constellation jurisdiction
**Owner:** Codex.
**Action:** Confirm in `AI_ARCHITECTURE_V2.md` (or layer-law doc of record):
- `src/components/Constellation/**` is Claude's jurisdiction.
- `codex/core/ritual-prediction/ballisticForecast.js` (Phase 2) is Gemini's.
- `src/lib/truesight/color/allophoneTint.js` (Phase 4 — defer) is Codex's.
**Acceptance:** Jurisdiction table updated; no overlap.
**Effort:** 10 min.

---

## 1.B — GEMINI (engine wiring)

### 1.B.1 — Persist `constellationEnabled` flag
**Owner:** Gemini.
**Depends on:** 1.A.1.
**Path:** Wherever `truesightEnabled` lives in settings persistence (likely `src/hooks/useSettings.js` or equivalent).
**Action:**
- Add `constellationEnabled` to the persisted settings, default `false`.
- Implement the coupling: writing `constellationEnabled = true` must atomically also write `truesightEnabled = true`. Implement at the persistence boundary, not in UI — UI calls `updateSettings({ constellationEnabled: true })` and gets both flags coerced.
**Acceptance:**
- Unit test: `updateSettings({ constellationEnabled: true })` from a state where `truesightEnabled = false` results in both `true`.
- Unit test: `updateSettings({ truesightEnabled: false })` from a state where `constellationEnabled = true` does **not** coerce `constellationEnabled = false`.
- Survives reload.
**Effort:** 30 min.

### 1.B.2 — `useRhymeManifoldPoints` hook
**Owner:** Gemini.
**Depends on:** 1.A.2.
**Path:** `src/hooks/useRhymeManifoldPoints.js`.
**Action:** Read-only hook that returns `RhymeFamilyManifoldPoint[]` for the active school. Pulls from `pcaChroma.js` (`resolveSonicColor` + formant table). No side effects.
**Acceptance:**
- Returns deterministic output for fixed school + seed.
- Memoized; recomputes only on school change.
- No imports from `src/components/` or `src/pages/`.
**Effort:** 45 min.

### 1.B.3 — Tests
**Owner:** Gemini.
**Path:** `tests/hooks/useRhymeManifoldPoints.test.js`, `tests/settings/constellationCoupling.test.js`.
**Action:** Unit tests covering 1.B.1 + 1.B.2 acceptance bullets.
**Effort:** 30 min.

---

## 1.C — CLAUDE (UI surface)

### 1.C.1 — `RhymeConstellation.jsx` (gate + shell)
**Owner:** Claude.
**Depends on:** 1.B.1, 1.B.2.
**Path:** `src/components/Constellation/RhymeConstellation.jsx`.
**Action:**
- Top-level component. Returns `null` when `settings.constellationEnabled === false` (no DOM, no subscriptions).
- When enabled, renders `<ConstellationManifold />` inside a school-themed surface frame.
- Imports `useRhymeManifoldPoints` for data.
- ARIA region: `role="region" aria-label="Rhyme constellation — phonemic manifold"`.
**Acceptance:**
- Mount with `constellationEnabled = false` → no DOM nodes in `document.querySelector('[role="region"]')`.
- Mount with both flags `true` → frame visible, no console errors.
- Reduced motion respected (no entrance animation when `prefers-reduced-motion`).
**Effort:** 1 h.

### 1.C.2 — `ConstellationManifold.jsx` (chroma plane renderer)
**Owner:** Claude.
**Depends on:** 1.C.1.
**Path:** `src/components/Constellation/ConstellationManifold.jsx`.
**Action:**
- SVG renderer (canvas deferred to P2 if perf demands). Renders OKLCh chroma plane at fixed L (school default), with one circle per rhyme-family point.
- Each circle: position from `oklch.h` (angle) and `oklch.C` (radius); fill from `oklchToHex` (already in `oklch.js`).
- Light gamut-boundary halo (subtle, school-themed).
- No interaction in P1.
**Acceptance:**
- Visual baseline: empty (no rhyme families) and populated (default school) match approved snapshots.
- Determinism: same school + same seed → identical SVG tree (snapshot test).
- 50 family points render under 16ms first paint on Steam Deck profile.
**Effort:** 3 h.

### 1.C.3 — "Witness the manifold" toggle
**Owner:** Claude.
**Depends on:** 1.B.1.
**Path:** Editor chrome — likely `src/pages/Read/ToolsSidebar.jsx` or equivalent invocation surface.
**Action:**
- Subtle invitation in editor chrome. Label exactly: **"Witness the manifold"**.
- ARIA label: `"Witness the manifold — reveal the rhyme constellation and the painter's trajectories"`.
- On activation: `updateSettings({ constellationEnabled: true })`. The persistence layer (1.B.1) handles the Truesight coupling — UI does not write `truesightEnabled` directly.
- Visually consistent with existing Truesight toggle but distinct (separate affordance, not a tab).
- Keyboard-reachable; focus ring respects school theme.
**Acceptance:**
- Click flips `constellationEnabled`; verify both flags `true` after activation when starting from both-false.
- Keyboard: Tab to toggle, Enter activates.
- Visual baseline for both states (off, on).
**Effort:** 1 h.

### 1.C.4 — `Constellation.css`
**Owner:** Claude.
**Path:** `src/components/Constellation/Constellation.css`.
**Action:**
- School-themed CSS variables consumed (no hardcoded color).
- Honors `prefers-reduced-motion`.
- No `position: fixed`/`z-index > 1` (Law 10 compliance — see `error-patterns.md` §4).
- No padding/letter-spacing on inline elements that share a layout layer with the textarea (Overlay Integrity Contract — even though Constellation is a separate surface, the rule guards future composition).
**Acceptance:** ESLint clean; visual baseline approved across all five schools.
**Effort:** 1 h.

### 1.C.5 — Visual regression baselines
**Owner:** Claude.
**Path:** `tests/visual/constellation/empty.png`, `populated-sonic.png`, `populated-psychic.png`, `populated-alchemy.png`, `populated-will.png`, `populated-void.png`, `toggle-off.png`, `toggle-on.png`.
**Acceptance:** Baselines committed; visual regression CI green.
**Effort:** 30 min.

---

## Phase 1 Exit Criteria

- [ ] `constellationEnabled` flag persists; coupling rule enforced at persistence boundary.
- [ ] Opt-out users observe zero behavior change vs. today (no new DOM, no new subscriptions, no engine-side cost).
- [ ] Opt-in users see the manifold rendered with rhyme-family points at deterministic OKLCh positions.
- [ ] All five school themes render correctly.
- [ ] Visual baselines committed and CI-green.
- [ ] No regression in Truesight overlay alignment (ruler test still passes).

---

# PHASE 2 — Ballistic Forecast Visualization

## 2.A — CODEX (schemas)

### 2.A.1 — `BallisticForecastEvent` schema
**Owner:** Codex.
**Path:** `SCHEMA_CONTRACT.md` + event-bus event registry of record.
**Action:** Define and freeze:
```ts
type BallisticForecastEvent = {
  id: string;                  // forecast id (uuid; carries through commit)
  candidateId: string;
  rhymeKey: string;
  oklchPoint: { L: number; C: number; h: number };
  opacity: number;             // [0, 1]; <0.5 cap until ratified
  trajectoryVector: { dx: number; dy: number };
  confidence: number;          // [0, 1]
  emittedAt: number;           // ms epoch
};
```
- Event name: `rhyme.forecast.emitted`.
- Confidence floor: `0.5`. Below-floor forecasts must not be emitted; reranker emits a single `PB-ERR-v1-VALUE-CRIT-CONSTELL-0302` per analysis pass when >5% of candidates fall below floor.
**Acceptance:** Schema published; event name registered; bytecode error code added to error table.
**Effort:** 30 min.

### 2.A.2 — Bytecode error: `CONSTELL-0302`
**Owner:** Codex.
**Path:** Bytecode error registry of record (per existing convention).
**Action:** Register `PB-ERR-v1-VALUE-CRIT-CONSTELL-0302` — "Ballistic forecast confidence below floor (0.5) for >5% of candidates in this analysis pass." Emitted by Gemini's `ballisticForecast.js`.
**Acceptance:** Code listed; recovery action documented (revert to graph-only suggestions for that pass).
**Effort:** 10 min.

---

## 2.B — GEMINI (forecast emission)

### 2.B.1 — `ballisticForecast.js`
**Owner:** Gemini.
**Depends on:** 2.A.1, 2.A.2.
**Path:** `codex/core/ritual-prediction/ballisticForecast.js`.
**Action:**
- New module that wraps `rerankCandidates` (from `reranker.js:82`). Does not modify the reranker — composes around it.
- For each rerank pass, after TQ produces scores, project each top-K candidate into OKLCh space using `pcaChroma.js` and emit a `BallisticForecastEvent`.
- Filter sub-floor candidates; if >5% drop, emit `CONSTELL-0302` once for the pass.
- Trajectory vector: `(currentOklchPoint - previousOklchPoint)` from the last committed word; null if no prior word.
- **Emit only when `constellationEnabled === true`.** When false, this module short-circuits — no projection, no emit, zero added cost. (Gemini decides where to read the flag — recommend a small `isConstellationActive()` accessor in shared util to keep the runtime decoupled from React state.)
**Acceptance:**
- Unit test: synthetic candidate frontier → expected event stream.
- Latency test: rerank+project+emit completes in ≤14ms on Steam Deck profile (existing rerank budget is <12ms; +2ms for projection).
- TurboQA gate (`scripts/verify_turboqa.js`) still passes — projection is read-only on rerank output.
- Off-state test: with flag false, `ballisticForecast` invocation produces zero events and zero allocation beyond the early-return cost.
**Effort:** 3 h.

### 2.B.2 — Wire into `run.js`
**Owner:** Gemini.
**Depends on:** 2.B.1.
**Path:** `codex/core/ritual-prediction/run.js`.
**Action:** Invoke `ballisticForecast` after `rerankCandidates` (line 365 area). Existing TurboQA gate behavior unchanged.
**Acceptance:** Existing prediction tests green; new ballistic emission verified by 2.B.3.
**Effort:** 30 min.

### 2.B.3 — Latency benchmark + tests
**Owner:** Gemini.
**Path:** `tests/perf/ballistic-forecast.bench.js`, `tests/ritual-prediction/ballisticForecast.test.js`.
**Action:**
- Latency: keystroke → forecast event ≤50ms p95.
- Confidence floor: candidates below 0.5 not emitted.
- Coupling: when `constellationEnabled` is false, no events emitted.
**Acceptance:** All three tests green in CI.
**Effort:** 1 h.

---

## 2.C — CLAUDE (forecast surface)

### 2.C.1 — `useBallisticForecast.js`
**Owner:** Claude.
**Depends on:** 2.A.1, 2.B.1.
**Path:** `src/hooks/useBallisticForecast.js`.
**Action:**
- Subscribes to `rhyme.forecast.emitted` events when `constellationEnabled === true`. Subscription is no-op when false.
- Maintains an LRU pool of active forecasts (cap: 200) keyed by forecast id.
- Each forecast has lifecycle: `provisional` → (`ratified` | `dissipated` | `evicted`).
- Phase 2 only handles `provisional` and `evicted` (LRU). `ratified` lifecycle wires up in Phase 3 once syntax-arbiter visualization is decided.
**Acceptance:**
- With flag off: subscription is not created.
- With flag on: events arrive and populate pool.
- Pool eviction: 201st event evicts oldest.
- Memory: <2MB heap delta with 200 active forecasts (matches PDR §11 budget).
**Effort:** 2 h.

### 2.C.2 — `BallisticStroke.jsx`
**Owner:** Claude.
**Depends on:** 2.C.1.
**Path:** `src/components/Constellation/BallisticStroke.jsx`.
**Action:**
- Single forecast stroke. Renders at `oklchPoint` on the manifold with opacity capped at `min(forecast.opacity, 0.5)` while provisional (per the provisional-pigment decision).
- Trajectory vector rendered as a faint line tail (length proportional to magnitude, color matches stroke).
- Framer Motion entrance: spring-physics fade from 0 to capped opacity. Respects `prefers-reduced-motion` (instant placement, no spring).
- No commit logic in P2 — strokes persist until evicted by LRU.
**Acceptance:**
- Visual baseline: single provisional stroke, multiple provisional strokes, with-tail / without-tail.
- Opacity strictly ≤0.5 in provisional state.
- Reduced motion: no animation.
**Effort:** 2 h.

### 2.C.3 — Mount strokes inside `ConstellationManifold`
**Owner:** Claude.
**Depends on:** 2.C.2, 1.C.2.
**Path:** Edit `src/components/Constellation/ConstellationManifold.jsx`.
**Action:**
- When `constellationEnabled` is on, manifold renders `<BallisticStroke />` per active forecast from `useBallisticForecast`.
- Stroke layer sits *above* rhyme-family points (z-stack within the SVG, no z-index rules).
**Acceptance:** Visual baseline updated for populated + ballistic state.
**Effort:** 30 min.

### 2.C.4 — A11y announcements
**Owner:** Claude.
**Path:** Inside `useBallisticForecast.js` or a sibling announcer hook.
**Action:**
- ARIA live region (polite) announces forecasts: `"Predicting [rhymeKey] with [round(confidence*100)]% confidence"`.
- Throttled — at most one announcement per 800ms to avoid screen-reader flood.
**Acceptance:** Manual screen-reader pass; throttle verified by test.
**Effort:** 45 min.

### 2.C.5 — Visual regression baselines
**Owner:** Claude.
**Path:** `tests/visual/constellation/forecast-single.png`, `forecast-cluster.png`, `forecast-with-tail.png`, `forecast-reduced-motion.png`.
**Acceptance:** Baselines committed; CI green.
**Effort:** 30 min.

---

## Phase 2 Exit Criteria

- [ ] Ballistic forecast events emit on every rerank pass when opted in; zero events when opted out.
- [ ] Forecast→render latency ≤50ms p95 on Steam Deck profile.
- [ ] Stroke pool respects 200-cap with LRU; heap budget <2MB delta.
- [ ] Provisional opacity strictly ≤0.5 (visual + unit verified).
- [ ] Reduced-motion fully respected (no stroke entrance animation).
- [ ] `CONSTELL-0302` fires on synthetic low-confidence pass; recovery to graph-only verified.
- [ ] Existing TurboQA gate (`scripts/verify_turboqa.js`) still passes.

---

## Recursion Sterilization Pass (SISP §8.3)

Each of SISP's eight recursion questions answered for this handoff:

| # | Question | Status | Evidence / Mitigation |
|---|---|---|---|
| 1 | Can this change trigger itself? | **No** | Three new write surfaces (settings flag, forecast emit, toggle activation). Each is one-way: toggle → settings → flag persisted; settings → engine reads flag; engine emits → UI subscribes; UI subscribes → pool update. No backward edge. |
| 2 | Can an event handler re-emit the event it consumes? | **No** | UI consumer (`useBallisticForecast`) updates an LRU pool only. Pool mutation does not call into the prediction engine. The only emitter is `ballisticForecast.js`. (Verify in 2.C.1: subscriber must not invoke prediction.) |
| 3 | Can a retry schedule overlap with itself? | **N/A** | No retry logic introduced. |
| 4 | Can a hook update cause the same hook to run again indefinitely? | **No, but verify** | `useBallisticForecast` keys subscription on `constellationEnabled`, not on pool state. Pool updates re-render but do not unsubscribe/resubscribe. **Verify in 2.C.1 implementation:** subscription effect dependency array must contain only the flag, not pool state. |
| 5 | Can a migration run repeatedly with different outcomes? | **N/A** | New schema fields with defaults; no destructive migration. |
| 6 | Can two async writes overwrite each other? | **No, but verify atomicity** | Coupling rule writes both `constellationEnabled` and `truesightEnabled` through one `updateSettings` call. **Verify in 1.B.1 implementation:** the existing settings reducer must commit both fields in a single atomic write, not two sequential writes. |
| 7 | Can a cache, queue, SSE stream, polling loop, worker, or MCP bridge create an echo loop? | **No** | No SSE, no polling, no MCP wiring in the new modules. Forecast event bus is in-process and one-directional. |
| 8 | Can a fallback path persist or display state that users believe is authoritative? | **No** | `CONSTELL-0302` fallback (revert to graph-only ranking) is bytecode-emitted and surfaced. UI provisional opacity is strictly <0.5; the visual gap between provisional and ratified prevents authoritative misreading. |

**Anti-recursion controls in force:**
- *Single-writer queue* — only `ballisticForecast.js` emits `rhyme.forecast.emitted`.
- *Reentrancy guard* — Typing Freeze (`isTypingRef`, 400ms debounce; sealed in `ScrollEditor.jsx:278-830` per the prior fix) defers stroke pool updates during keystroke bursts.
- *Bounded pool* — LRU 200-cap on forecast pool prevents unbounded growth.
- *Confidence floor* — sub-0.5 forecasts not emitted; no provisional-stroke flicker storm possible.
- *Idempotent settings reducer* — see IR-001 invariant.

**Residual recursion-adjacent verifications (must run during implementation):**
1. 2.C.1 subscription effect dependency array: `[constellationEnabled]` only.
2. 1.B.1 atomicity: assert `updateSettings({constellationEnabled: true})` produces exactly one persistence transaction.
3. 2.B.1 emitter: assert `ballisticForecast.js` performs zero compute when `constellationEnabled === false` (not just zero emit — zero projection work).

---

## Cross-cutting risks

| Risk | Surface | Mitigation |
|---|---|---|
| Ballistic emit fires during typing burst → state thrash → caret stasis regression. | UI | Subscriber (2.C.1) routes through existing Typing Freeze guard pattern: defer pool updates until 400ms idle. |
| OKLCh→sRGB gamut clipping yields nondeterministic pixel output for edge points. | Engine | Codex confirms gamut-clamp policy in 1.A.2; gamut-boundary halo (1.C.2) makes clipping visible. |
| Forecast event flood at high typing rate exceeds 200-stroke pool too fast. | UI | LRU eviction is correct; if user reports flicker, raise cap or add per-rhyme-family debounce. |
| Two flags drift out of sync (manual write to `truesightEnabled = false` while `constellationEnabled = true`). | Engine | Decided behavior: this is the conductor-without-orchestra mode and is allowed. PDR §9 state matrix is the authority. |

---

## Fix Instruction IR (SISP §9)

Three load-bearing fixes are formalized as IR objects below. Other tasks remain in their numbered form (1.A.1 … 2.C.5) — they are scaffolding/surface work whose specifications are already implementation-ready in their inline definitions. The three formalized below are the load-bearing contracts: settings coupling (the keystone), forecast emission (the engine gate), and the witness toggle (the user-facing surface).

### IR-001 — Settings Coupling at Persistence Boundary

```json
{
  "sisp_fix_ir_version": "1.0.0",
  "id": "SISP-FIX-v1-001",
  "task_ref": "1.B.1",
  "owner": "gemini",
  "category": "STATE",
  "severity": "HIGH",
  "evidence_tier": "Contract Evidence",
  "target_files": [
    "src/hooks/useSettings.js (or equivalent persistence module)",
    "tests/settings/constellationCoupling.test.js"
  ],
  "forbidden_files": [
    "src/components/Constellation/**",
    "codex/core/**"
  ],
  "preconditions": [
    "Codex 1.A.1 merged (constellationEnabled in SCHEMA_CONTRACT.md)"
  ],
  "exact_change": "Extend the settings reducer with constellationEnabled (default false). When the reducer receives constellationEnabled=true and truesightEnabled is currently false, coerce truesightEnabled=true in the same atomic commit. The reverse coupling does not hold: writing truesightEnabled=false does not change constellationEnabled.",
  "invariant_after_fix": "After updateSettings({constellationEnabled: true}) returns, the persisted state satisfies state.constellationEnabled === true && state.truesightEnabled === true. After updateSettings({truesightEnabled: false}), state.constellationEnabled is unchanged.",
  "anti_recursion_rule": "Settings reducer must be idempotent: updateSettings(x) followed by updateSettings(x) produces no second persistence write beyond what React's normal change detection emits. Coercion of truesightEnabled is part of the same reducer pass, not a follow-up dispatch.",
  "verification": {
    "commands": [
      "npm run test -- tests/settings/constellationCoupling.test.js"
    ],
    "manual_checks": [
      "In dev build, toggle Constellation on from a state where Truesight is off; verify both flags persist after reload."
    ],
    "expected_result": "All three coupling unit tests green; reload preserves both flags."
  },
  "rollback_plan": "Revert the settings reducer commit. Existing truesightEnabled persistence is unaffected because the new field is additive.",
  "requires_schema_change": true,
  "requires_law_update": false,
  "requires_handoff": true,
  "remaining_unknowns": [
    "Exact path of settings reducer module — cited as src/hooks/useSettings.js or equivalent. Implementer must locate and confirm before editing."
  ],
  "checksum_status": "not_implemented"
}
```

### IR-002 — Ballistic Forecast Emission Gated on Flag

```json
{
  "sisp_fix_ir_version": "1.0.0",
  "id": "SISP-FIX-v1-002",
  "task_ref": "2.B.1",
  "owner": "gemini",
  "category": "DETERMINISM",
  "severity": "HIGH",
  "evidence_tier": "Contract Evidence",
  "target_files": [
    "codex/core/ritual-prediction/ballisticForecast.js (new)",
    "codex/core/ritual-prediction/run.js (wire-in at the rerank-pass tail)",
    "tests/ritual-prediction/ballisticForecast.test.js",
    "tests/perf/ballistic-forecast.bench.js"
  ],
  "forbidden_files": [
    "src/**",
    "codex/core/ritual-prediction/reranker.js (compose around, do not modify)"
  ],
  "preconditions": [
    "Codex 1.A.1, 2.A.1 merged (flag schema + BallisticForecastEvent schema)",
    "Gemini 1.B.1 merged (flag persistence)"
  ],
  "exact_change": "Implement ballisticForecast.js that wraps rerankCandidates output. For each top-K candidate, project into OKLCh space using pcaChroma.js and emit rhyme.forecast.emitted events with shape per 2.A.1. Filter sub-floor (<0.5) confidence candidates. If >5% of candidates fall below floor in a single pass, emit PB-ERR-v1-VALUE-CRIT-CONSTELL-0302 once. Read constellationEnabled flag via a shared accessor (isConstellationActive() in shared util) — when false, return early with zero compute and zero emission.",
  "invariant_after_fix": "When constellationEnabled === false, ballisticForecast invocation produces zero events, zero projection work, and zero allocation beyond the early-return cost. When true, every rerank pass produces >=0 events, all events have confidence >= 0.5, and every event references a candidateId from the same rerank pass.",
  "anti_recursion_rule": "Forecast emission is a one-way side effect of a rerank pass. The UI subscriber must update the LRU pool only and must not invoke the prediction engine. The pool's render output must not feed back into verse content state — the pool is decorative on the manifold, not authoritative on the textarea.",
  "verification": {
    "commands": [
      "npm run test -- tests/ritual-prediction/ballisticForecast.test.js",
      "npm run test -- tests/perf/ballistic-forecast.bench.js",
      "node scripts/verify_turboqa.js"
    ],
    "manual_checks": [
      "Profile rerank+project+emit on Steam Deck profile; confirm <14ms p95.",
      "Toggle constellationEnabled off, type a verse, confirm zero rhyme.forecast.emitted events on the bus."
    ],
    "expected_result": "All three command suites green; latency budget met; off-state emits nothing."
  },
  "rollback_plan": "Revert wire-in at run.js. ballisticForecast.js becomes orphan but harmless (no consumers if UI hasn't shipped).",
  "requires_schema_change": false,
  "requires_law_update": false,
  "requires_handoff": true,
  "remaining_unknowns": [
    "Exact event bus mechanism in this codebase — implementer must confirm whether to use the existing event emitter pattern from ritual-prediction or introduce a new bus."
  ],
  "checksum_status": "not_implemented"
}
```

### IR-003 — "Witness the Manifold" Toggle

```json
{
  "sisp_fix_ir_version": "1.0.0",
  "id": "SISP-FIX-v1-003",
  "task_ref": "1.C.3",
  "owner": "claude",
  "category": "UX",
  "severity": "MEDIUM",
  "evidence_tier": "Contract Evidence",
  "target_files": [
    "src/pages/Read/ToolsSidebar.jsx (or equivalent invocation surface)",
    "src/pages/Read/ToolsSidebar.css (or shared toggle stylesheet)",
    "tests/visual/constellation/toggle-off.png",
    "tests/visual/constellation/toggle-on.png"
  ],
  "forbidden_files": [
    "codex/**",
    "src/hooks/useSettings.js (Gemini's; UI must not write truesightEnabled directly)"
  ],
  "preconditions": [
    "Gemini IR-001 merged (flag persistence + coupling)"
  ],
  "exact_change": "Add a toggle component to the editor chrome with the visible label exactly 'Witness the manifold'. ARIA label exactly 'Witness the manifold — reveal the rhyme constellation and the painter's trajectories'. On activation, dispatch updateSettings({constellationEnabled: !current}). Do not write truesightEnabled in this component — the persistence layer (IR-001) handles coupling. Style consistent with existing Truesight toggle but visually distinct (separate affordance, not a tab). Keyboard reachable; focus ring respects active school theme variables.",
  "invariant_after_fix": "Activating the toggle results in updateSettings being called with exactly one field (constellationEnabled). The component never writes truesightEnabled. After activation from both-false state, both flags are true (coupling enforced by IR-001).",
  "anti_recursion_rule": "Toggle reads flag state from settings via existing hook; calls updateSettings on user activation only. No subscription loop — toggle is a one-shot dispatcher.",
  "verification": {
    "commands": [
      "npm run test -- tests/components/WitnessToggle.test.jsx",
      "npm run test:visual -- constellation/toggle-off constellation/toggle-on"
    ],
    "manual_checks": [
      "Tab to toggle; Enter activates; Escape does not change state.",
      "Screen reader announces the full ARIA label.",
      "All five school themes render the focus ring correctly."
    ],
    "expected_result": "Unit + visual tests green; manual a11y pass logged."
  },
  "rollback_plan": "Remove toggle component import from ToolsSidebar. Constellation surface becomes unreachable from UI but settings flag remains; users with flag pre-enabled retain access via persisted state.",
  "requires_schema_change": false,
  "requires_law_update": false,
  "requires_handoff": false,
  "remaining_unknowns": [
    "Exact placement in editor chrome — recommended ToolsSidebar but author may choose a more prominent location pending design review."
  ],
  "checksum_status": "not_implemented"
}
```

---

## VAELRIX Compliance (SISP §11)

Each VAELRIX stop condition checked for this handoff:

| # | Stop Condition | Status | Notes |
|---|---|---|---|
| 1 | A needed schema is absent from `SCHEMA_CONTRACT.md` | **Resolved** | Codex 1.A.1, 1.A.2, 2.A.1 land schemas before any implementing task begins. Sequencing in §Tri-Agent Sequencing enforces order. |
| 2 | A fix changes UI-owned files from a backend lane or backend-owned files from a UI lane | **No** | Each task has a single owner. Forbidden_files in IR-001/002/003 enumerate cross-lane prohibitions explicitly. |
| 3 | A client becomes authoritative over a server-owned outcome | **No** | Constellation is local-first by PDR §3 non-goals. No server-authoritative state is replicated to client. No client writes server-owned state. |
| 4 | A persistent shape changes without schema notice | **No** | `constellationEnabled`, `RhymeFamilyManifoldPoint`, and `BallisticForecastEvent` all land via Codex schema commits before consumers exist. |
| 5 | A proposed fix stores unsaved user work without explicit consent | **No** | Opt-in to Constellation is explicit user consent. No autosave introduced. Manifold mutations (P4) are deferred and out of scope. |
| 6 | A security input surface lacks allow-list validation | **No** | No new user-input surfaces in P1–P2. Manifold drag (P4, deferred) will be bounded to OKLCh sRGB gamut by `CONSTELL-0301`. |
| 7 | A destructive command is required but not explicitly authorized | **No** | No destructive operations in this handoff. |
| 8 | A fix needs another agent's domain decision | **Resolved** | Three sovereign decisions in §Sovereign decisions in force are explicit. PDR §15.4–§15.7 remain open but are explicitly out of scope for P1–P2. |
| 9 | Evidence is insufficient for a high-severity conclusion | **Resolved** | All HIGH-severity items (IR-001, IR-002) cite Contract Evidence (PDR §9, §7) and Direct Evidence (existing modules at known paths). |

**No `ESCALATION:` block required for this handoff.** All cross-agent dependencies are sequenced through the schema-first ordering in §Tri-Agent Sequencing.

---

## Evidence Ledger (SISP §6)

| Tier | Source | Used For |
|---|---|---|
| **1 — Direct Evidence** | `src/lib/math/quantization/index.js`, `pcaChroma.js`, `oklch.js`, `rhymeColorRegistry.js`, `codex/core/ritual-prediction/reranker.js`, `codex/core/ritual-prediction/run.js`, `ScrollEditor.jsx:278-830` (Typing Freeze seal), `IDE.css:3406-3411` (caret rules) | Inferring path layout, existing engines to compose around, current Truesight wire-up. |
| **2 — Contract Evidence** | `PDR-archive/rhyme_constellation_pdr.md` (§5, §7, §9, §11), `ARCH_CONTRACT_OVERLAY_INTEGRITY.md`, `forensic-search/references/error-patterns.md`, `CLAUDE.md` (jurisdiction table) | Defining invariants, opt-in coupling rule, forbidden-file lists, world-law constraints. |
| **3 — Local Pattern Evidence** | Existing `truesightEnabled` toggle wiring in `ReadPage.jsx:137`, `useSettings`-style hooks, existing visual regression suite under `tests/visual/`, existing PDR conventions in `PDR-archive/turboquant_integration_bridge_pdr.md`, `BUG-FIX-PLAN-2026-04-26-DISCONNECTED-LOGIC.md` task format | Mirroring naming, file layout, test placement, and document shape. |
| **4 — Inference** | Latency budget (rerank <12ms; +2ms projection ≈ <14ms); 200-stroke pool memory budget; school-theme propagation for new components | Sized from existing benchmarks in TurboQuant Service Manual and Sovereign Gate baseline. |
| **5 — Hypothesis** | Exact location of settings reducer module (`useSettings.js or equivalent`); exact event-bus mechanism for forecast emission | Disclosed in IR-001 and IR-002 `remaining_unknowns`. Implementer must confirm before editing. |
| **6 — Unknown** | None acknowledged at handoff time. | — |

---

## Residual Risk (SISP §8.7)

**Bounded unknowns:**
1. Exact paths of settings reducer module and event-bus emitter — disclosed in IR remaining_unknowns. Implementer confirms before editing.
2. P3 (syntax arbitration visualization) wire-up will require revisiting `useBallisticForecast.js` lifecycle to introduce the `ratified | dissipated` states. P2 deliberately leaves the lifecycle at `provisional | evicted` so this future work is additive, not refactor.
3. Steam Deck profile assumes the existing 0.41MB Sovereign baseline holds; if Phase 1 visual regression suite reveals constellation render exceeds budget, escalate before merging Phase 2.

**Tests deferred (with reason):**
- Manual screen-reader sweep across all five school themes (2.C.4): scheduled for Phase 2 close-out, not gated on unit-test green.
- Cross-browser rendering test for OKLCh gamut clipping: deferred to P3 unless Phase 1 visual baselines reveal Safari/Firefox divergence.

**Monitoring suggestions:**
- Track `CONSTELL-0302` emission rate post-launch; if >2% of analysis passes trip the floor, the confidence floor or the query-vector embedding (Phase 5 GTE-Small) needs revisiting.
- Track flag pair drift telemetry (rare conductor-without-orchestra usage); if <0.1% of opt-in users disable Truesight after Constellation opt-in, consider removing that mode in a future PDR revision.

**Schema or law update proposals:**
- None at this handoff. If P3 requires syntax-arbiter behavior to be law-anchored (e.g., binary veto vs gradient gravity becomes a `VAELRIX_LAW.md` clause), that proposal will accompany the P3 PDR amendment.

---

## How to start

Suggested first commits, in order:

1. **Codex:** `feat(schema): constellation flag + manifold point type + forecast event` — lands 1.A.1, 1.A.2, 2.A.1 together (small, schema-only).
2. **Gemini:** `feat(settings): persist constellationEnabled with truesight coupling` — 1.B.1 + tests.
3. **Gemini:** `feat(prediction): ballisticForecast emission gated on constellationEnabled` — 2.B.1, 2.B.2, 2.B.3.
4. **Claude:** `feat(ui): rhyme constellation surface + witness toggle (read-only)` — 1.C.1–1.C.5.
5. **Claude:** `feat(ui): ballistic stroke rendering in constellation` — 2.C.1–2.C.5.

Sequencing rationale: schemas first (small, blocks others), settings before engine emission (so the engine has a flag to gate on), engine before UI (so the UI has events to subscribe to), read-only manifold before strokes (so strokes have a manifold to land on).

---

## Final Reviewer Checklist (SISP §14)

Pre-distribution audit — all boxes confirmed before this document was sealed at v1.1:

- [x] Findings (tasks) are severity ordered within phase, with phase-level sequencing dictating cross-phase order.
- [x] Each task has file/line evidence (target_files), or is labeled hypothesis/unknown in its IR `remaining_unknowns`.
- [x] Each fix has one owner and one primary action (enforced by IR `owner` field; multi-owner work split into separate tasks).
- [x] Recursion risks inspected — see §Recursion Sterilization Pass. Two verify-during-implementation items disclosed.
- [x] Async and persistence boundaries inspected — settings reducer atomicity (IR-001), forecast event bus directionality (IR-002).
- [x] Schema impacts checked — three new schemas land via Codex 1.A.1, 1.A.2, 2.A.1 before consumers exist; `requires_schema_change: true` set on IR-001.
- [x] VAELRIX stop conditions checked — see §VAELRIX Compliance. Zero conditions trip.
- [x] Tests / verification commands explicit — every IR has a `verification.commands` array; phase exit criteria enumerate gating tests.
- [x] Tests not run disclosed — see §Residual Risk "Tests deferred."
- [x] Handoffs clear — Tri-Agent Sequencing diagram + IR `requires_handoff` flags.
- [x] No false certainty — `checksum_status: "not_implemented"` on every IR object per SISP §3; remaining unknowns disclosed; verdict scoped to "implementation-ready," not "shipped."

---

## Related Documents

- [Rhyme Constellation PDR](./PDR-archive/rhyme_constellation_pdr.md) — design source of truth.
- [TurboQuant Service Manual](./TURBOQUANT-SERVICE-MANUAL.md) — kernel + reranker reference.
- [Overlay Integrity Contract](../../ARCH_CONTRACT_OVERLAY_INTEGRITY.md) — guards composition with the textarea/Truesight surface.
- [Error Patterns](../../forensic-search/references/error-patterns.md) — Law 10 z-index / State Drift signatures.
- [Scholomance Ironclad Sterilization Protocol](../skills/scholomance.ironclad.sterilization.protocol.skill.md) — review framework applied to this handoff.
- [ByteCode Error System](../ByteCode%20Error%20System/) — authoring conventions for `CONSTELL-0301` and `CONSTELL-0302`.

---

*Document Version: 1.1 | Authored: 2026-05-08 | Last Updated: 2026-05-08 | Distribution: Codex / Gemini / Claude | Audit: `SISP-AUDIT-v1-PASS-CLAUDE-0001`*

*Changelog:*
- *1.0 — Initial handoff. 19 tasks across 6 lanes. Sequencing diagram and how-to-start.*
- *1.1 — SISP polish. Added Verdict, Required Reading Order, Recursion Sterilization Pass, Fix Instruction IR (3 load-bearing objects), VAELRIX Compliance audit, Evidence Ledger, Residual Risk, Final Reviewer Checklist. No task content changed; rigor layer added on top.*
