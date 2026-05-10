# BUG-FIX-PLAN-2026-04-26-DISCONNECTED-LOGIC

## Bytecode Search Code
`SCHOL-ENC-BYKE-SEARCH-DISCONNECTED-LOGIC-FIX-PLAN`

## Status
**PLAN** — Not yet executed. Each tier converts to a `BUG-2026-04-26-*` encyclopedia entry on completion.

## Scope
A multi-tier remediation plan for code paths discovered via TurboQuant-assisted hunt that **should work but don't** — engines without consumers, producers without verifiers, comment-disabled production code that still has live test coverage, and stale-closure cascades. Source surveys: `dead-code.md` (2026-04-25), `bug-report-3-28-2026.md`, `tests/qa/TEST_RESULTS.md`, `Archive/Prototypes/README.md`, `ARCHIVE REFERENCE DOCS/CLIENT_SERVER_ANALYSIS_DUPLICATION_FIX.md`, `docs/architecture/JUDICIARY_SYNTAX_INTEGRATION.md`.

## Pattern Inventory

Three recurring shapes across all findings:

1. **Engine-without-consumer** — engine exists, test contract exists, integration spec exists, wiring doesn't.
2. **Producer-without-verifier** — encoder runs every frame; decoder/round-trip-asserter is orphaned.
3. **Comment-disabled-but-tested** — production code commented out with a one-line rationale; test suite expects it to fire.

---

## TIER 0 — BUILD & VIEW BLOCKERS (P0)

### 0.1 ReadPage duplicate handler declarations
**Symptom:** `vite build` fails with "The symbol `handleToggleTruesight` has already been declared (line 628)" and the same for `handleModeChange` at line 633.
**Source:** `bug-report-3-28-2026.md` Tear 1. `src/pages/Read/ReadPage.jsx` is in the modified-file list — verify whether already resolved.
**Fix:**
1. Read `src/pages/Read/ReadPage.jsx` lines 600–640.
2. Identify which copy of each `useCallback` has the correct dependency array (compare against the earlier declaration of the same name).
3. Delete the duplicate that has the wrong/missing deps.
4. Run `npx vite build` to confirm exit code 0.
**Owner:** Claude (UI).
**Effort:** 5 min.
**Risk:** Zero if the surviving copy has the right deps.

### 0.2 ListenPage ignition view never transitions
**Symptom:** Orb click on `/listen` plays haptic but never changes view from CHAMBER to STATION. Bytecode test `UI_STASIS-0E02` fires correctly.
**Source:** `tests/qa/TEST_RESULTS.md`. `src/pages/Listen/ListenPage.tsx:147` has `setViewMode('STATION')` commented out with rationale "View mode switching disabled - keeping chamber view for continuous rotation."
**Fix:**
1. Decide which is canon: the comment (chamber-only) or the test (station transition).
2. If test wins: uncomment `setViewMode('STATION')` and add `setViewMode` to the `useCallback` dependency array.
3. If comment wins: delete or `.skip` the contradicting QA test and update `tests/qa/TEST_RESULTS.md`.
**Owner:** Claude (UI). Decision needed from Angel on canon.
**Effort:** 5 min once decided.
**Risk:** Continuous-rotation aesthetic vs. station-navigation feature — the team has both half-shipped.

---

## TIER 1 — HIGH-LEVERAGE WIRING (P1)

### 1.1 HHM cascade — wire `HiddenMarkovModel` into `buildSyntaxLayer`
**Symptom:** 34 tests in `tests/lib/harkov.phoneme.dataset.test.js` and `tests/lib/syntax.layer.test.js` fail with `Cannot read properties of undefined (reading 'enabled' | 'stanzas' | 'hiddenState' | ...)`.
**Source:** `bug-report-3-28-2026.md` Tear 3.
**Anatomy:**
- `codex/core/hmm.js::HiddenMarkovModel` exists (Viterbi tagger). Listed as Phase 2 dormant in `Archive/Prototypes/README.md` — **not deleted, original location preserved.**
- `src/lib/models/harkov.model.js` exports `HHM_LOGIC_ORDER`, `HHM_STAGE_WEIGHTS` — partially consumed by `src/lib/pls/providers/predictabilityProvider.js`.
- `src/lib/syntax.layer.js::buildSyntaxLayer` returns no `.hhm` sub-object.
- `codex/core/judiciary.js::JudiciaryEngine` and all `Judiciary*` types are unused (per `dead-code.md`).
- `docs/architecture/JUDICIARY_SYNTAX_INTEGRATION.md` mandates the syntax layer call the judiciary.
**Required output shape (from existing tests):**
- `layer.hhm.enabled` (boolean)
- `layer.hhm.stanzaSizeBars` (number, default 4)
- `layer.hhm.stanzaCount` (number)
- `layer.hhm.stanzas[].{bars, transitions, hiddenStateCounts, tokenCount}`
- Per-token: `token.hhm.{hiddenState, stanzaBar, tokenWeight, stageScores, context, dictionarySources}`
**Fix sequence:**
1. Codex implements `runHmmPass(doc)` in a new file `src/lib/syntax/hmmPass.js` that calls `HiddenMarkovModel` with a seeded init (no `Math.random` — see `BUG-FIX-PLAN` Tier 5).
2. Modify `src/lib/syntax.layer.js::buildSyntaxLayer` to invoke `runHmmPass` and attach `.hhm` to both `layer` and per-token `token.hhm`.
3. Wire `JudiciaryEngine` to consume `layer.hhm` per `JUDICIARY_SYNTAX_INTEGRATION.md`. Remove the `[ ] JudiciaryEngine` line from `dead-code.md` once consumed.
4. Run `npx vitest run tests/lib/harkov.phoneme.dataset.test.js tests/lib/syntax.layer.test.js`. Target: 34 → 0 failures.
**Owner:** Codex.
**Effort:** Multi-day.
**Leverage:** Single highest-ROI fix in the plan. Unblocks 34 tests, two architectural docs, one full prototype-graduation.

### 1.2 `parseErrorForAI` contract drift
**Symptom:** 5 QA tests fail because `parseErrorForAI(error).bytecode` is `undefined`. The system designed to detect contract drift is itself contract-drifted.
**Source:** `tests/qa/TEST_RESULTS.md` Tear 8.
**Fix:**
1. Read `codex/core/pixelbrain/bytecode-error.js::parseErrorForAI` and trace why `bytecode` falls out of the returned object.
2. Determine: is the producer (`bytecode-error.js`) emitting the field correctly? Is the parser dropping it?
3. Restore the contract. Target: `errorData.bytecode` is a non-empty string after `parseErrorForAI(error)`.
4. Re-run `tests/qa/features/*.qa.test.jsx` — base64-decode tests should pass.
**Owner:** Codex.
**Effort:** 30 min.

### 1.3 Phoneme engine drift → rhyme astrology cascade
**Symptom:** `analyzeWord("same")` returns rhymeKey `A-open` instead of `EY1-M`. Cascades into `lineEndingSignature` returning wrong constellations for the entire EY family.
**Source:** `bug-report-3-28-2026.md` Tears 4 and 6.
**Fix sequence:**
1. Determine intent of corpus regeneration (Angel decision pending). If intentional, regenerate snapshots (`npx vitest run tests/lib/phoneme.engine.test.js --update`). If accidental, investigate `scripts/generate_corpus.js` for non-stable sort.
2. Add a stable alphabetical tiebreaker to the frequency sort in the phoneme engine to eliminate non-determinism on tie scores.
3. Re-run `tests/runtime/rhymeAstrology.queryEngine.test.js` — `lineEndingSignature` should return `EY1-M` for "flame same."
4. Add a regression test covering `analyzeWord("same").rhymeKey === "EY1-M"` to lock the contract.
**Owner:** Codex. Angel decision needed before step 1.
**Effort:** 1 hr.

---

## TIER 2 — DISCONNECTED MECHANIC SURFACES (P2)

### 2.1 Combat session lifecycle helpers
**Symptom:** `codex/core/combat.session.js` exports `applyPlayerCastPreview`, `applyResolvedPlayerCast`, `restoreFailedPlayerCast`, `startOpponentCast`, `completeOpponentTurn`, `markCombatVictory`, `markCombatDefeat`, `createInitialCombatState`, `setCombatState`, `buildSpellHistoryEntry` — **all unused** per `dead-code.md`.
**Risk:** Either combat is doing all this inline (state drift across each call site), or sessions never properly resolve (XP not awarded on victory, failed-cast state not cleaned up).
**Fix:**
1. Audit `src/pages/Combat/hooks/useCombatEngine.js` — find where session lifecycle is happening today.
2. Decide canon: refactor `useCombatEngine` to consume the session helpers, **or** delete `combat.session.js` entirely.
3. If consuming: replace inline state mutation with `applyResolvedPlayerCast(state, cast)`-style calls. Verify XP-on-victory fires.
4. If deleting: confirm no `tests/core/combat*.test.js` references the helpers before removal.
**Owner:** Codex.
**Effort:** 4 hr if consuming, 30 min if deleting.

### 2.2 Scoring heuristic registry never consulted
**Symptom:** `codex/core/scoring.defaults.js::DEFAULT_SCORING_HEURISTICS, COMBAT_SCORING_HEURISTICS, getCombatScoringHeuristics` orphaned. `codex/core/heuristics/abyssal_resonance.js::abyssalResonanceHeuristic` and `verseir_amplifier.js::verseIRAmplifierHeuristic` orphaned.
**Risk:** The "thorough AI combat" PIR migrated to authoritative server scoring, but the heuristic registry the scorer was supposed to consult is unwired. Scoring decisions are happening; the documented heuristic inputs are not feeding them.
**Fix:**
1. Read `codex/server/services/combatScoring.service.js` (or wherever `/api/combat/score` is implemented).
2. Confirm whether it imports from `scoring.defaults.js`. If not, either wire it or delete the registry.
3. If wiring: call `getCombatScoringHeuristics()` at request time, pass the array to the score reducer.
4. Add an integration test asserting `abyssalResonanceHeuristic` contributes to the final score for an abyss-classified word.
**Owner:** Codex.
**Effort:** 2 hr.

### 2.3 Lexicon Abyss multipliers — infrastructure with no gate
**Symptom:** `codex/core/lexicon.abyss.js::ABYSS_MIN_MULTIPLIER, ABYSS_MAX_MULTIPLIER, normalizeAbyssWord` orphaned. MECHANIC SPEC describes word-rarity-driven score multipliers; nothing applies them.
**Fix:**
1. Locate the rarity tier resolver (likely `codex/core/lexicon.rarity.js` or similar).
2. Apply `clamp(rarityScore, ABYSS_MIN_MULTIPLIER, ABYSS_MAX_MULTIPLIER)` as a final score gate.
3. Add unit test: a word with rarity 0.95 produces a damage multiplier ≥ ABYSS_MIN_MULTIPLIER.
**Owner:** Codex.
**Effort:** 1 hr.

### 2.4 Cache hydration never runs on startup
**Symptom:** `codex/runtime/cache.js::hydrateFromStorage`, `deleteFromCache` orphaned. Every cold start = empty cache regardless of persisted state.
**Fix:**
1. Determine where the runtime initializes (`codex/runtime/index.js` or equivalent).
2. Call `hydrateFromStorage()` once at module load.
3. Wire `deleteFromCache(key)` into the existing invalidation path.
4. Verify cache survival across server restart in dev.
**Owner:** Codex.
**Effort:** 1 hr.

### 2.5 Word-lookup pipeline instrumentation surface
**Symptom:** `codex/runtime/wordLookupPipeline.js::requestWordLookup, clearWordLookupCache, getWordLookupCacheTTL, getWordLookupRateLimit` all unused. Plus `pipeline.js::WORD_LOOKUP_EVENTS` (event constants nobody subscribes to). Plus `wordLookupCoalescer.js::getPendingCount` (queue depth metric nobody reads).
**Fix:**
1. Wire `WORD_LOOKUP_EVENTS` into a debug overlay (Read page dev panel) showing live cache stats.
2. Either expose cache TTL / rate limit getters in `/api/health` or remove them from the public surface.
**Owner:** Claude (UI for the debug overlay) + Codex (server endpoints).
**Effort:** 2 hr.

### 2.6 Toolbar / Viewport bytecode channels never opened
**Symptom:** `src/lib/truesight/compiler/toolbarBytecode.ts::createToolbarChannel` and `viewportBytecode.ts::createViewportChannel` orphaned. The bytecode channel design exists; React state is doing the work the bytecode was supposed to do.
**Fix:**
1. Decision: are bytecode channels canon, or did the team revert to React state?
2. If bytecode wins: open `createToolbarChannel()` in `src/pages/Read/IDEChrome.jsx` and route toolbar mutations through `encodeToolbarBytecode`. Same for viewport in `ScrollEditor.jsx`.
3. If React state wins: delete `toolbarBytecode.ts` and `viewportBytecode.ts` entirely.
**Owner:** Architecture decision (Codex), then Claude.
**Effort:** 4 hr if wiring, 30 min if deleting.

---

## TIER 3 — ORPHAN SERVER SERVICES (P3)

### 3.1 Mailer service never mounted
**Symptom:** `codex/server/services/mailer.service.js::ConsoleMailerAdapter, SendGridMailerAdapter, ResendMailerAdapter, MailerService` all unused. Auth flows that should email (passwordless agent registration, password reset) are silently no-op'ing.
**Fix:**
1. Mount `MailerService` in the server boot sequence.
2. Configure env-driven adapter selection (`MAILER_PROVIDER=resend|sendgrid|console`).
3. Inject mailer into auth handlers. Verify password-reset email arrives in dev with `ConsoleMailerAdapter`.
**Owner:** Codex.
**Effort:** 2 hr.

### 3.2 Captcha service never mounted
**Symptom:** `codex/server/services/captcha.service.js::CaptchaService` orphaned.
**Fix:** Either mount on signup/login/agent-register routes, or delete.
**Owner:** Codex.
**Effort:** 1 hr.

### 3.3 Agent key revocation
**Symptom:** `codex/server/collab/collab.agent-auth.js::revokeAgentKey` orphaned. Keys can be created/rotated, never revoked.
**Fix:** Add `DELETE /collab/agents/:id/key` route that calls `revokeAgentKey`. Add admin-only guard.
**Owner:** Codex.
**Effort:** 1 hr.

### 3.4 Agent QA sweep — start without stop
**Symptom:** `codex/server/collab/collab.agent-qa.js::stopAgentQaSweep` orphaned. `start` exists; `stop` never fires. Resource leak in long-lived processes.
**Fix:** Wire `stopAgentQaSweep` into Fastify `onClose` lifecycle hook.
**Owner:** Codex.
**Effort:** 15 min.

### 3.5 MCP probe diagnostics
**Symptom:** `codex/server/collab/mcp-probe.js::getCanonicalBridgeLaunchSpec, classifyProbeFailure, buildProbeGuidance, formatProbeReport` — entire diagnostic probe surface orphaned. (Ironic given the Collab MCP bridge is live.)
**Fix:** Add a `/collab/probe` admin endpoint that runs the probe and returns the formatted report. Useful for debugging future bridge regressions.
**Owner:** Codex.
**Effort:** 1 hr.

---

## TIER 4 — SILENT FAILURES (P4)

### 4.1 Bytecode round-trip parity is not enforced
**Symptom:** `encodeMotionBytecode` runs every frame; `decodeMotionBytecode`, `hashMotionBytecode`, `prettyPrintBytecode` are unused. `expectDeterministicCompile`, `assertBackendParity`, `generateQAReport` (in `bytecode-bridge/qa/blueprintQA.ts`) are also unused.
**Risk:** Any encoder regression silently corrupts every consumer. The "deterministic compile" invariant has no test enforcement.
**Fix:**
1. Add `tests/codex/animation/bytecode/roundTrip.test.ts` that calls `encodeMotionBytecode → decodeMotionBytecode` on a fixture and asserts byte-equality.
2. Add `tests/codex/animation/bytecode-bridge/determinism.test.ts` that calls `expectDeterministicCompile` on every preset in `presetRegistry.ts`.
3. Add `assertBackendParity` to CI for at least the CSS and Phaser backends.
**Owner:** Codex (or Minimax).
**Effort:** 2 hr.

### 4.2 Adaptive whitespace grid — three alternates
**Symptom:** `truesight/compiler/corpusWhitespaceGrid.ts` (entire alt compiler), `adaptiveWhitespaceGrid.ts::getAdaptiveTokenWidth, compileAdaptiveGrid`, and `truesightGrid.ts::compileTokensToGrid, gridToPixels` all orphaned.
**Fix:**
1. Identify which whitespace path is canonical (probably the one wired into `ScrollEditor.jsx`).
2. Delete the other two trees.
3. Update `dead-code.md`.
**Owner:** Claude (UI knows which is canon).
**Effort:** 1 hr.

### 4.3 ScrollEditor virtualization scaffolding
**Symptom:** `src/pages/Read/ScrollEditor.jsx` lints clean otherwise but: `isEditorIdle` (line 254), `windowedLines` (516), `paddingTop` (520), `paddingBottom` (521) computed and never used. Looks like virtualization that was wired in then commented out of the render path.
**Risk:** Cost paid (recomputed on every keystroke), benefit not received.
**Fix:**
1. Decide: complete virtualization or remove scaffolding?
2. If completing: wire `windowedLines + paddingTop + paddingBottom` into the overlay render so only visible lines mount.
3. If removing: delete the four computations.
**Owner:** Claude.
**Effort:** 2 hr if completing, 15 min if removing.

### 4.4 useCombatEngine stale closures
**Symptom:** `src/pages/Combat/hooks/useCombatEngine.js:271` missing `recordWordUse` dep. Line 361 has unused `scoreData`. `BattleLog.jsx:68` missing `entries` dep.
**Risk:** Each render captures stale state, decisions are made on it, results feed back into the next render's stale capture — recursive bug logic.
**Fix:**
1. Add the missing dep arrays.
2. Verify `scoreData` at line 361 — should it feed into something downstream? If yes, wire it; if no, delete.
3. Re-run combat smoke tests.
**Owner:** Codex (logic) + Claude (UI lint).
**Effort:** 1 hr.

---

## TIER 5 — GRAVEYARD CLEANUP (P5)

These are the deletions that make the entropic-mutation surface smaller in one shot. All targets are confirmed orphans per `dead-code.md` (2026-04-25). Run after Tiers 1-4 land so nothing in flight depends on them.

### 5.1 Client-side combat scorer
- Delete: `src/lib/combatScoring.js`, `src/lib/combatMechanics.js`, `src/hooks/useBattleScoring.js`, `src/pages/Combat/BattleScrollInput.jsx`, `src/pages/Combat/PlayerDisplay.jsx`.
- Why: `/api/combat/score` is authoritative per `PIR-20260419-THOROUGH-AI-COMBAT.md`. Stale client copies can be re-imported by accident and silently diverge.

### 5.2 Legacy rhyme stack
- Delete: entire `codex/core/rhyme/` directory (`dataset.js`, `generator.js`, `index.js`, `phonology.js`, `predictor.js`, `training.js`, `validator.js`).
- Why: Superseded by `codex/core/rhyme-astrology/`. Keeping both invites mis-routing.

### 5.3 Animation bytecode-bridge orphan tree
- Delete: `src/codex/animation/bytecode-bridge/` (entire tree — adapters, parser, validator, compiler, qa, contracts).
- Delete: `src/ui/animation/{adapters,hooks}/` (entire tree).
- Delete: `codex/core/animation/amp/run-animation-amp.ts` (kebab-cased duplicate of active camelCased file).
- Why: Active stack is `src/codex/animation/{bytecode,amp,processors,presets}/`. Two near-identical trees with overlapping names is a guaranteed import-the-wrong-thing trap.

### 5.4 Truesight orphan compilers
- Delete: `src/lib/truesight/compiler/pixelbrainTruesightAMP.ts`, `verseIRQueries.js`. Plus the loser of the whitespace-grid bake-off (Tier 4.2).

### 5.5 Color subsystem stale alts
- Delete: `src/data/library.js::COLORS, SCHOOL_ANGLES, schoolToBadgeClass`, `src/data/schoolPalettes.js::DEFAULT_VOWEL_COLORS, SCHOOL_SKINS`, `src/lib/css/schoolStyles.js`, `src/lib/truesight/color/pcaChroma.js` (all orphans).
- Why: `Audit2.md` names `codex/core/phonology/vowelWheel.js` as hue-source-of-truth. Three latent palette sources can outvote it if anyone re-imports.

### 5.6 Server orphan if Tier 3 deletes win
- If 3.1 / 3.2 / 3.5 take the delete branch, remove the corresponding files.

### 5.7 Update dead-code.md
After deletions land, regenerate `dead-code.md` so the index reflects truth. Stale dead-code reports breed false positives in future audits.

---

## Cross-Cutting Verification

After each tier:
1. `npm run lint` — must end at 0 errors.
2. `npm run build` — must complete.
3. `npm run test` — track pass count delta. Tier 1.1 alone should add 34 passing tests.
4. Determinism check: 5 consecutive `npm run test` runs must produce byte-identical snapshot diffs (Tier 4.1 is the explicit guard for this).
5. Update `dead-code.md` — remove every entry the tier eliminated.

## Encyclopedia Bookkeeping

When a tier ships, file its post-fix narrative:
- Tier 0.1 → `BUG-2026-MM-DD-READPAGE-DUPLICATE-HANDLERS.md` (`SCHOL-ENC-BYKE-SEARCH-READPAGE-DUP-HANDLER`)
- Tier 0.2 → `BUG-2026-MM-DD-LISTEN-IGNITION-STASIS.md` (`SCHOL-ENC-BYKE-SEARCH-LISTEN-IGNITION-STASIS`)
- Tier 1.1 → `BUG-2026-MM-DD-HHM-WIRING.md` (`SCHOL-ENC-BYKE-SEARCH-HHM-WIRING`)
- Tier 1.2 → `BUG-2026-MM-DD-PARSE-ERROR-FOR-AI.md` (`SCHOL-ENC-BYKE-SEARCH-PARSE-ERROR-FOR-AI`)
- Tier 1.3 → `BUG-2026-MM-DD-PHONEME-CORPUS-DRIFT.md` (`SCHOL-ENC-BYKE-SEARCH-PHONEME-CORPUS-DRIFT`)
- Tiers 2-5 each get one entry per remediation.

## Owner Matrix

| Tier | Lead | Supporting | Decision Needed From |
|------|------|------------|----------------------|
| 0.1 | Claude | — | None |
| 0.2 | Claude | — | Angel (canon: chamber vs station) |
| 1.1 | Codex | Claude (UI consumers of `.hhm`) | None |
| 1.2 | Codex | — | None |
| 1.3 | Codex | — | Angel (corpus regen intentional?) |
| 2.x | Codex | Claude where UI surfaces | Architecture call per item |
| 3.x | Codex | — | None |
| 4.1 | Codex / Minimax | — | None |
| 4.2 | Claude | Codex | UI knows canonical path |
| 4.3 | Claude | — | None |
| 4.4 | Codex | Claude | None |
| 5.x | Codex | Claude for UI deletes | Block until Tiers 1-4 ship |

## Risk Register

| Risk | Mitigation |
|------|------------|
| HHM wiring (1.1) interacts with phoneme corpus drift (1.3) | Land 1.3 first — fixes the snapshot baseline before HHM consumes phoneme output |
| Tier 5 deletes break a hidden dynamic import | Run `node scripts/find_dynamic_imports.js` (or grep for `import(`) before each delete |
| Tier 2.6 architecture decision blocks Claude | Codex commits to a call within 24h of plan approval |
| Re-introducing `Math.random` in Tier 1.1 HMM init | Mandatory seeded init; reviewer rejects PR if seed parameter is missing |

---

## Lessons Sought

When this plan finishes executing, the post-fix encyclopedia entries should answer:

1. How did the engine-without-consumer pattern accumulate? (Likely answer: tests written ahead of implementation, then implementation deferred and forgotten.)
2. Why did `dead-code.md` not catch the comment-disabled production code (Tier 0.2)? Should the audit also flag commented-out function calls in active files?
3. Did the recursive stale-closure bugs (Tier 4.4) come from `react-hooks/exhaustive-deps` being downgraded from error → warning at some point? If so, restore it to error.

---

*Filed by Claude (UI Agent) on 2026-04-26 via TurboQuant-assisted hunt over the deterministic-substrate codebase. Plan status: AWAITING ANGEL APPROVAL.*
