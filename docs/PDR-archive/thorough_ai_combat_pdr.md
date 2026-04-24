# PDR: Thorough AI Combat
## Canonical Combat Scoring, VerseIR Amplification, and Deterministic Counter-Verses

**Status:** Implemented
**Classification:** Combat + AI + VerseIR + UI
**Priority:** Critical
**Primary Goal:** Replace the partial tactical combat loop with a deterministic, profile-driven combat pipeline that uses canonical combat scoring, VerseIR amplifier output, and richer opponent counterplay.

---

# 1. Executive Summary

The current combat screen renders well enough to demo the arena, but the active battle logic is still split across two systems. The tactical hook drives player and opponent turns with local ad hoc math, while the canonical combat engine, combat profile builder, and VerseIR amplifier stack already exist elsewhere in CODEx. This mismatch prevents the battlefield from expressing the real intelligence of the engine.

This PDR defines a converged combat path. Player casts must resolve through the canonical combat pipeline, including VerseIR compilation, VerseIR amplification, combat profile normalization, speaking analysis, and commentary generation. Opponents must behave as deterministic counter-sorcerers whose movement, counter-verse generation, doctrine traits, and combat artifacts are stable for the same battle state. The combat UI must then render those artifacts clearly enough that the player can read why a turn landed the way it did.

---

# 2. Problem Statement

The current tactical combat implementation has the following failures:

- Player verse resolution bypasses the canonical combat scoring stack and uses bespoke local damage math.
- Opponent movement still uses `Math.random`, violating determinism law.
- VerseIR amplifier output is not materially shaping the live battle state or log output.
- Combat UI panels mostly show health and narration, but not the richer reasoning artifacts already produced by CODEx.
- The `WAIT` action exists in the UI surface but does not exist as a real turn action.

As a result, the battle arena looks more advanced than it actually is. The world-law of “words are weapons” is only partially enforced because the live battle loop is not yet consuming the most authoritative linguistic machinery in the codebase.

---

# 3. Product Goal

Make combat feel like linguistic warfare, not a placeholder tactics shell.

The player should be able to:

- cast a verse and have it resolve through the same core reasoning that powers canonical combat scoring
- see commentary, traces, status effects, bridge intent, and VerseIR resonance surface in the combat UI
- face opponents who counter the player’s recent language patterns in a deterministic, doctrine-shaped way
- understand what happened in a turn without reading raw developer diagnostics

---

# 4. Non-Goals

- Full backend persistence of tactical battle sessions
- Multiplayer combat orchestration
- New schools, balance overhauls, or ruleset expansion
- New Phaser battlefield rendering systems
- Replacing the existing combat UI layout with a fresh redesign

---

# 5. Core Design Principles

1. **Server-grade reasoning, client-local battle loop**
   The tactical session may remain client-driven, but its cast resolution should use canonical CODEx combat logic and VerseIR amplification rather than bespoke UI math.

2. **Determinism before spectacle**
   The same battle state and same cast text must produce the same combat result. Tactical AI cannot use unseeded randomness.

3. **Artifacts before ornament**
   Every new UI detail must reflect a real combat artifact: doctrine, archetype, counter tokens, commentary, speech act, status effect, or trace.

4. **Progressive disclosure**
   The battlefield should surface the right amount of reasoning without turning every turn into a debug console.

5. **World-law fidelity**
   Counterplay must arise from resonance, memory, school affinity, cadence, rarity, and VerseIR novelty, not arbitrary RPG flavor text.

---

# 6. Feature Overview

The combat flow will become:

1. Player composes a verse and weave
2. Verse compiles into VerseIR
3. VerseIR runs through the amplifier stack
4. Amplifier output is attached to the analyzed combat document
5. Combat scoring engine produces raw traces
6. Combat profile normalization derives damage, healing, status effects, speech act, commentary, and bridge effects
7. Tactical session applies spatial modifiers and battlefield consequences
8. UI renders the resulting turn artifact
9. Opponent uses recent player history plus doctrine to generate a deterministic counter-verse and movement choice

---

# 7. Architecture

## 7.1 Player Cast Pipeline

The player cast path must follow this pipeline:

`verse text`
→ `analyzeText`
→ `compileVerseToIR`
→ `enhanceVerseIR`
→ `attachVerseIRAmplifier`
→ `createCombatScoringEngine().calculateScore`
→ `normalizeCombatScore`
→ `battlefield application`

This ensures the tactical battle hook consumes:

- `verseIRAmplifier`
- `bridge`
- `statusEffect`
- `speaking`
- `voiceResonance`
- `rarity`
- `commentary`
- `damage`
- `healing`

## 7.2 Opponent Decision Pipeline

The opponent turn must follow this pipeline:

`battle history + doctrine + player context + turn number`
→ `generateOpponentSpell`
→ `deterministic tactical move scoring`
→ `turn artifact`
→ `battlefield application`

Opponent movement must be deterministic and score candidate tiles based on:

- preferred distance band
- field-effect value
- doctrine bias
- player pressure
- stable tie-breakers

## 7.3 Turn Artifact Contract

Each resolved turn in `battleState.history` should carry enough detail for the UI to render:

- `narrativeLog`
- `commentary`
- `damageMap`
- `scoreSummary`
- `bridge`
- `statusEffect`
- `dominantArchetype`
- `counterTokens`
- `telegraph`
- `speaking`

This is not a new global schema publication. It is a local battle-session artifact shaped from existing canonical combat outputs.

---

# 8. Module Breakdown

## `src/hooks/useBattleSession.js`

Primary orchestration point for:

- deterministic battlefield setup
- canonical player cast resolution
- deterministic opponent turn resolution
- status effect ticking
- `WAIT` action support
- turn artifact creation

## `codex/core/opponent.engine.js`

Expanded to return richer counter-verse artifacts:

- doctrine context
- commentary
- status-effect payload when appropriate
- telegraph summary
- next voice profile

## `src/pages/Combat/CombatPage.jsx`

Passes richer turn data into combat panels and modal surfaces.

## `src/pages/Combat/CombatLog.jsx`

Renders turn artifacts as readable combat chronicle entries instead of raw narration alone.

## `src/pages/Combat/components/ScholarStatusPanel.jsx`

Surfaces active status effects and recent resonance state for the scholar.

## `src/pages/Combat/components/EnemyDetailsModal.jsx`

Surfaces doctrine, telegraph, counter tokens, and signature move context.

---

# 9. VerseIR and Amplifier Usage

VerseIR amplification is not decorative in this design. It directly informs combat meaning.

The tactical battle loop must consume:

- `noveltySignal` as part of turn flavor and archetype explanation
- `dominantTier` and `dominantArchetype` for combat chronicle context
- `elementMatches` for human-readable domain cues
- `diagnostics` only when needed for internal fallback messaging, not as primary UI copy

The combat log should surface amplifier resonance in compressed form, such as:

- dominant archetype label
- dominant tier
- short commentary derived from canonical combat profile output

---

# 10. Implementation Phases

## Phase 1: Contract Convergence

- wire player casting to canonical combat scoring and VerseIR amplifier flow
- replace ad hoc local damage math
- carry canonical turn artifacts into battle history

## Phase 2: Deterministic Opponent Combat

- remove unseeded randomness from tactical AI
- enrich opponent spell generation artifacts
- implement deterministic move scoring
- support doctrine-shaped telegraph context

## Phase 3: Surface Realization

- render combat artifacts in the chronicle
- render scholar status effects
- render enemy doctrine and telegraph details
- implement real `WAIT` turn support

## Phase 4: Verification and Reporting

- run targeted lint and test verification
- produce a PIR because this is cross-cutting, behavioral, and architectural

---

# 11. QA Requirements

- Player casts must produce stable results for identical input.
- Opponent movement for identical state must be deterministic.
- `WAIT` must hand control to the opponent without side effects beyond normal turn transition.
- Combat history entries must include readable commentary and score metadata.
- No new code may bypass the canonical combat scoring path once implemented.

---

# 12. Success Criteria

This PDR is successful when:

- the battle hook no longer computes player damage from bespoke local math
- the opponent no longer uses `Math.random` in live tactical decision-making
- the combat log communicates more than raw narration
- scholar and enemy panels expose meaningful combat artifacts
- combat turns feel like they are being decided by the real CODEx engine instead of a placeholder loop
