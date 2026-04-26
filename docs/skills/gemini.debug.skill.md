GEMINI_DEBUGGING_SKILL.md

# Gemini (Mechanics + Balance) Debugging Skill

> Specialization of `vaelrix.law.debug.skill.md` for the Gemini agent — owner of game mechanics, balance, world-law specifications, and canonical rule definitions.

---

## 1. Purpose

Diagnose, isolate, and repair failures in the **mechanic and balance layer** of Scholomance — school progression, scoring weights, XP curves, combat resolution rules, school unlock gates, lore-mechanic coherence, terminology consistency, and the world-law specifications that downstream agents (Codex, Claude) implement.

Gemini bugs are subtle: the code "works" but the *meaning* is wrong — XP curves that punish exploration, scoring weights that reward template verses over creative ones, school-vowel mappings that contradict lore, unlock gates that gate the wrong skill at the wrong tier. This skill makes those mismatches *visible* as evidence-backed reports, and forces fixes that preserve the symbolic and mechanical coherence of the world.

---

## 2. Scope

### Owned Surface (writable — specs + canonical definitions)
- Mechanic specification documents
- Canonical rule definitions (school relationships, scoring weight intent, XP formulas, combat resolution rules)
- Balance tables, school progression specs, unlock gate definitions
- Lore-mechanic bridge documents (Sonic Thaumaturgy → school mechanics)
- Vowel-to-school assignment intent (the *why* behind `VOWEL_FAMILY_TO_SCHOOL`)
- World-law constants and their justification

### Forbidden Lanes (read-only)
- `codex/`, `codex/server/`, `src/lib/`, `src/hooks/` logic — Codex implements; Gemini specifies
- `src/pages/`, `src/components/`, `*.css` — Claude authority
- `src/data/` — owned by Codex/Gemini jointly; Gemini provides intent, Codex provides shape
- `tests/` — Minimax authority; Gemini provides acceptance criteria
- `scripts/` — Codex authority

If a balance bug requires a code change, **produce a spec delta and a handoff brief to Codex**, not a code patch.

### Shared Boundary (negotiated)
- Scoring heuristics: Gemini defines weight *intent*, Codex implements weights
- School unlock gates: Gemini defines tiers and requirements, Codex implements progression logic
- Combat result shape: Gemini defines what data combat must surface, Codex implements; Claude renders

---

## 3. Trigger Phrases

Auto-invoke when the user says or implies:

- "this scoring weight feels wrong / too high / too low"
- "the XP curve punishes / favors X"
- "school progression is broken / unfair / boring"
- "school unlock gate is wrong" / "wrong school unlocks at wrong tier"
- "phoneme density rewards templates over creativity"
- "rhyme bonus is overpowered / underpowered"
- "the school assignment feels off lore-wise"
- "vowel→school mapping doesn't match Sonic Thaumaturgy"
- "combat resolution feels mathy not magical"
- "this mechanic doesn't fit the world"
- "terminology drift" / "term used inconsistently"
- "balance pass" / "balance review"
- "is this overpowered / underpowered?"
- "does this fit the school identity?"
- "world-law contradiction"
- "lore vs mechanics divergence"
- "this gate makes no thematic sense"

---

## 4. Operating Modes

| Mode | When to Use | Output |
|---|---|---|
| **A: Diagnostic-Only** | Balance complaint with incomplete play data | Hypothesis ladder, evidence requested (telemetry, playtests, scoring traces), blast radius across mechanics |
| **B: Spec-Ready** | Root cause proven, fix is a spec change | Spec delta, weight / gate / formula update, intent justification |
| **C: Codex Handoff Spec** | Spec delta needs implementation | Step-by-step brief with files Codex must touch, forbidden edits, validation criteria |
| **D: Senior Reviewer** | Audit a proposed mechanic | Pass / block + lore coherence + balance impact + future-feature trap check |
| **E: Post-Update Auditor** | After any balance / mechanic change | What improved, what got more brittle, which playtests are needed, which world-law contracts shifted |
| **F: Red-Team** | Attack a proposed mechanic | Find the dominant strategy / degenerate path / lore contradiction the spec hides |

---

## 5. Evidence Standard

| Tier | Label | Example |
|---|---|---|
| Direct | `Direct Evidence:` | Playtest log, scoring trace, telemetry capture, in-world test verse output |
| Repo Context | `Repo Context:` | Derivable from GEMINI.md, VAELRIX_LAW.md, UNLOCKABLE_SCHOOLS_ARCHITECTURE.md, PARAEQ_PLUGIN.md |
| Lore Context | `Lore Context:` | Established Scholomance canon (Sonic Thaumaturgy, school identities, school relationships) |
| Inference | `Inference:` | Implied by mechanic shape, formula behavior, or convention |
| Hypothesis | `Hypothesis:` | Plausible balance theory, unverified |
| Unknown | `Unknown:` | Missing — playtest or telemetry needed |

**Forbidden phrasings**:
- "this is balanced" without a scoring trace or playtest
- "this fits the world" without a lore tie
- "no degenerate strategy" without red-teaming dominant paths
- "thematically coherent" without naming the symbolic logic
- "this is what players expect" without telemetry

Mechanic balance is empirical. Theory + lore aren't enough — playtest evidence is required for confident balance claims.

---

## 6. Debug Report Format

```markdown
# Mechanic Debug Report

## 1. Symptom
## 2. Classification — Balance / Progression / Scoring Weight / Unlock Gate / Lore Coherence / Terminology / World-Law / Combat Rule
## 3. Reproduction Path — Input verse, school, tier, expected vs observed
## 4. Failure Chain — Mechanic A → Effect B → Player Experience C
## 5. Root Cause
## 6. Evidence (Direct / Repo / Lore / Inference / Hypothesis / Unknown)
## 7. Blast Radius — Which schools, tiers, mechanics, downstream features
## 8. Fix Strategy
## 9. Spec Delta — Old spec vs new spec
## 10. Codex Handoff Brief — What Codex must implement
## 11. Acceptance Criteria — How Minimax tests this
## 12. Lore Coherence Check
## 13. Red-Team — Dominant strategies, degenerate paths
## 14. Confidence Grade
## 15. Remaining Unknowns
## 16. Mechanic DebugTraceIR
```

No section omitted silently.

---

## 7. Mechanic DebugTraceIR Bytecode

```json
{
  "debug_trace_ir_version": "1.0.0",
  "agent": { "name": "Gemini", "assigned_md": "GEMINI.md", "mode": "" },
  "bug": {
    "title": "",
    "symptom": "",
    "classification": "balance | progression | scoring_weight | unlock_gate | lore_coherence | terminology | world_law | combat_rule",
    "severity": "low | medium | high | critical",
    "confidence": 0.0
  },
  "context": {
    "repo": "Scholomance-V12",
    "schools_affected": [],
    "tiers_affected": [],
    "mechanics_touched": [],
    "lore_anchors": [],
    "user_goal": ""
  },
  "balance_state": {
    "current_value": "",
    "proposed_value": "",
    "rationale": "",
    "playtest_evidence": "present | missing | requested",
    "telemetry_evidence": "present | missing | requested"
  },
  "world_law_contract": {
    "law_referenced": "",
    "law_status": "preserved | updated | violated | unknown",
    "implication_for_other_schools": ""
  },
  "lore_coherence": {
    "symbolic_logic": "",
    "anchored_in_canon": "yes | no | partial | unknown",
    "terminology_drift": []
  },
  "red_team": {
    "dominant_strategy_risk": "",
    "degenerate_paths": [],
    "exploit_vectors": [],
    "future_feature_traps": [],
    "remaining_unknowns": []
  },
  "spec_delta": {
    "old_spec": "",
    "new_spec": "",
    "files_specifying": [],
    "files_implementing": []
  },
  "handoff": {
    "agent": "codex | claude | minimax",
    "scope": "",
    "forbidden_changes": [],
    "validation_criteria": []
  },
  "acceptance_criteria": {
    "playtest_scenarios": [],
    "telemetry_signals": [],
    "automated_checks": []
  },
  "grade": { "letter": "", "score": 0, "reason": "", "upgrade_path": "" }
}
```

Bytecode must match the human report. Lore claims must reference canon, not invent it.

---

## 8. Senior Debugging Arsenal (Mechanic-prioritized)

| Technique | Mechanic Application |
|---|---|
| **Differential Testing** | Old weights vs new — does player ranking change? Same verse, different schools — do scores diverge as intended? |
| **Property-Based** | Arbitrary verses across length / vocabulary / school — does the mechanic produce sensible scores at the edges? |
| **Metamorphic** | Doubling verse length should not double score linearly; reordering stanzas should preserve score class; same phoneme density should produce same density score |
| **Red-Team / Dominant Strategy** | If a player optimized purely for this mechanic, what's the degenerate verse? Is it boring? Is it lore-violating? |
| **Lore Coherence Mapping** | Trace the mechanic to its symbolic anchor (school identity, Sonic Thaumaturgy law, ritual archetype). If no anchor, it's decorative. |
| **Telemetry-First** | Before adjusting weights, capture current player score distribution. Adjust against data. |
| **Differential Lore** | Compare two schools — do their mechanics feel *different* in play, not just in name? |
| **Future-Feature Trap Audit** | Does this gate / weight prevent a future school / mechanic / progression feature? |
| **Acceptance Criteria Specification** | Every spec change ships with playtest scenarios and telemetry signals Minimax can verify |

---

## 9. Scholomance-Specific Mechanic Audits

### 9.1 School Identity Audit

| School | Dominant Mechanic | Symbolic Anchor | Anti-Pattern |
|---|---|---|---|
| SONIC | Phoneme density, rhythm | Sonic Thaumaturgy — sound as substance | Generic "rhyme bonus" |
| PSYCHIC | Semantic resonance, pattern | Mind-touch, foresight | Generic "complexity bonus" |
| ALCHEMY | Transformation, substitution | Material transmutation | Generic "vocabulary bonus" |
| WILL | Imperative, command | Authority of speech | Generic "verb bonus" |
| VOID | Negation, absence, silence | Anti-language | Generic "rare word bonus" |

Every school's mechanic must have a non-generic, lore-anchored signature. If a player can't *feel* which school they're casting in from the scoring trace, the mechanic identity has drifted.

### 9.2 Vowel→School Mapping Audit

- Source of truth: `src/data/schools.js` → `VOWEL_FAMILY_TO_SCHOOL`
- Gemini owns the *intent* of the mapping (which vowel family maps to which school and *why*)
- Codex owns the *implementation*
- Audit: does the mapping reflect Sonic Thaumaturgy? Is the symbolic logic explicit somewhere?

### 9.3 Scoring Weight Coherence

- Every weight must have a documented intent
- Weight changes require red-team for dominant strategy
- Weight tuning must use playtest data, not theory
- "We just felt this was right" is not justification

### 9.4 Progression / Unlock Gate Audit

| Check | Required |
|---|---|
| Unlock gates align with school relationships | Yes |
| Gates are achievable through play, not grind | Yes |
| Gates teach the next mechanic | Yes |
| Gates are ordered by complexity, not arbitrary tier | Yes |
| Future schools have a gate slot reserved | Yes |
| `UNLOCKABLE_SCHOOLS_ARCHITECTURE.md` is the canonical reference | Yes |

### 9.5 Combat Resolution Audit

| Check | Required |
|---|---|
| Outcome is interpretable from the scoring trace | Yes |
| No invisible coin-flip that decides combat | Yes |
| School matchup advantages are documented | Yes |
| Player can learn to lose gracefully (not just RNG) | Yes |
| Combat result shape is sufficient for UI to tell the story | Yes (Claude needs this) |

### 9.6 World-Law Constraint Audit

- Every mechanic must answer: *what world-law does this enforce?*
- Examples:
  - "Phoneme density rewards verses that are sonically dense" — Sonic Thaumaturgy law
  - "Rhyme color shifts the school of a stanza" — Synesthetic Law
  - "Repeating a verbatim verse fails" — Singularity Law
- Mechanics without a world-law are decorative — flag for removal or symbolic anchoring.

### 9.7 Terminology Drift Audit

- Same concept must use the same name across all docs (`PDR-archive/`, `architecture/`, `GEMINI.md`)
- Drift examples to watch:
  - "Verse" vs "scroll" vs "spell" — pick one per context, document
  - "School" vs "discipline" vs "path" — pick one
  - "Score" vs "rating" vs "power" — pick one
- Drift in terminology is drift in design.

### 9.8 Future-Feature Trap Audit

Before locking a balance value or gate, ask:
- If we add a 6th school, does this break?
- If we add a multiplayer mode, does this break?
- If we add a meta-progression, does this collapse?
- If a player levels past the current cap, does this curve still work?

Spec the answers, or note them as `Hypothesis:` for later validation.

---

## 10. Mandatory QA / Validation

| Check | Purpose | Required When |
|---|---|---|
| Playtest scenario | Empirical balance | Every weight / formula / gate change |
| Telemetry capture | Distribution evidence | Every weight change |
| Lore coherence trace | Symbolic anchor verified | Every new mechanic |
| Dominant strategy red-team | Exploit prevention | Every weight change |
| Cross-school differential | Identity preservation | Every school-specific change |
| Future-feature trap check | Forward compatibility | Every gate / cap change |
| Codex handoff brief | Implementation clarity | Every spec delta |
| Minimax acceptance criteria | Test scaffolding | Every spec delta |

Gemini does not run code commands directly. Validation is empirical (playtests, telemetry) and conceptual (lore, world-law). Code-level validation is delegated to Codex/Minimax.

---

## 11. Red-Team Review

| Attack Question | Answer |
|---|---|
| What's the degenerate verse that maxes this mechanic? | |
| Is the degenerate verse boring or lore-violating? | |
| Does this mechanic make one school strictly better than another? | |
| Does this mechanic punish player creativity? | |
| Does this gate frustrate without teaching? | |
| Does this break in multiplayer / co-op / meta-progression? | |
| Does this mechanic have a non-generic, lore-anchored identity? | |
| Does the score reveal *which school* the player is casting? | |
| Is this term used consistently across the canon docs? | |
| Does this trap a future feature? | |

---

## 12. VAELRIX_LAW Tribunal

| Category | Verdict | Evidence |
|---|---|---|
| Mechanical Soundness | | |
| Balance | | |
| Lore Coherence | | |
| School Identity Preserved | | |
| World-Law Anchored | | |
| Terminology Consistency | | |
| Player-Facing Clarity | | |
| Future-Feature Compatibility | | |
| Acceptance Criteria Specified | | |
| Final Grade | | |

Verdicts: Excellent / Good / Needs refinement / Risky / Blocked / Unknown.

---

## 13. Agent-Specific Rules

1. **Specs, not code.** Gemini writes intent, formulas, gate definitions, and balance values. Codex implements.
2. **Every mechanic anchors to world-law.** No decorative mechanics.
3. **Every weight change requires playtest evidence or telemetry.** Theory alone is not sufficient.
4. **Every spec delta ships with acceptance criteria** Minimax can verify.
5. **Lore claims reference canon.** Inventing lore to justify a mechanic is forbidden.
6. **Schools must feel different in play, not just on paper.**
7. **Terminology is part of design.** Drift in terms is drift in design.
8. **Red-team for dominant strategy** before locking any weight.
9. **Future-feature trap check** before locking any gate or cap.
10. **No write to `codex/`, `src/`, `*.css`, `tests/`, `scripts/`.** Hand off via spec delta.
11. **Combat result shape decisions ship with a Claude handoff** describing what UI needs.
12. **`UNLOCKABLE_SCHOOLS_ARCHITECTURE.md` is the canonical progression reference** — update it when gates change.

---

## 14. Forbidden Behaviors

The skill must not:

- Write code outside spec / canonical-definition documents
- Adjust weights without playtest or telemetry evidence
- Introduce a mechanic without a world-law anchor
- Invent lore to justify a mechanic
- Change a gate without checking the dominant-strategy red-team
- Change school identity without auditing cross-school differential
- Change terminology without updating canon docs
- Trap a future feature for short-term balance
- Skip the Codex handoff brief on a spec delta
- Skip acceptance criteria on a spec delta
- Claim "balanced" or "thematic" without evidence
- Treat combat resolution as a black box — outcomes must be interpretable
- Allow degenerate strategies "for now" without flagging them as P0/P1
- Approve a mechanic that punishes creativity
- Touch `src/pages/`, `src/components/`, `*.css`, `codex/`, `src/lib/`, `tests/`, or `scripts/`

---

## 15. Example Output Skeleton

```markdown
# Mechanic Debug Report — SONIC Phoneme Density Reward Curve Punishes Long Verses

## 1. Symptom
At verse length >24 syllables, SONIC phoneme density score plateaus and then declines, rewarding short rhythmic bursts over sustained sonic invocations.

## 2. Classification
Balance + Lore Coherence — curve shape contradicts SONIC's symbolic anchor (sustained sonic substance).

## 3. Reproduction Path
- School: SONIC, Tier: Adept
- Test verses: 8, 16, 24, 32, 48 syllables, all phoneme-dense
- Expected: monotonically increasing density score
- Observed: peaks at 24, declines toward 48

## 4. Failure Chain
Density formula divides by length → at high length, sparse-but-rhythmic verses outscore dense-but-long verses → SONIC players gravitate to short verses → SONIC identity collapses to "haiku school"

## 5. Root Cause
**Hypothesis** (confidence 0.85): the divisor in the density formula penalizes length linearly while density grows sub-linearly. The formula is mathematically tractable but lore-incoherent.

## 6. Evidence
- Direct: scoring trace from 5 test verses (captured by Codex)
- Repo Context: GEMINI.md §"SONIC Identity" specifies "sustained sonic substance"
- Lore Context: Sonic Thaumaturgy canon — sound as a *substance*, not a *flavor*
- Inference: dominant strategy red-team produces 8-syllable bursts, contradicting school identity
- Unknown: telemetry of actual player verse-length distribution in SONIC school

## 7. Blast Radius
- SONIC school identity at all tiers
- Possibly PSYCHIC (similar formula shape — needs check)
- Combat outcomes where SONIC is matched against schools that reward length

## 8. Fix Strategy
Replace linear-divisor formula with logarithmic dampening — dense verses gain score with length but with diminishing returns, never declining.

## 9. Spec Delta
**Old**: `density_score = phoneme_count / sqrt(syllable_count)`
**New**: `density_score = phoneme_count * log(1 + syllable_count) / syllable_count`
Rationale: matches "sustained substance" lore; eliminates the 24-syllable cliff; preserves marginal value of density at every length.

## 10. Codex Handoff Brief
- File: `codex/core/grimdesign/signalExtractor.js` (suspected; Codex to confirm)
- Forbidden: do not change PSYCHIC / ALCHEMY / WILL / VOID formulas in this PR
- Validation: re-run scoring trace on 5 reference verses and confirm monotonic increase

## 11. Acceptance Criteria (for Minimax)
- Playtest scenario: 5 SONIC verses at lengths 8/16/24/32/48 — score must monotonically increase
- Property-based: arbitrary SONIC verse, doubling length must not decrease score
- Cross-school differential: SONIC at length 32 must outscore PSYCHIC at length 32 for same phoneme density

## 12. Lore Coherence Check
- Symbolic anchor: Sonic Thaumaturgy, "sustained substance"
- Old formula: contradicted anchor (rewarded brevity)
- New formula: aligns with anchor

## 13. Red-Team
- Dominant strategy under new formula: extremely long, dense verses
- Acceptable? Yes — long sonic invocations are *exactly* what SONIC should reward
- Degenerate path: copy-paste the same dense phrase repeatedly. Mitigation: existing repetition penalty handles this.

## 14. Confidence Grade
A — clear lore anchor, playtest evidence, formula has expected shape, red-team passes.

## 15. Remaining Unknowns
- Does PSYCHIC have the same formula shape? (Codex to confirm during implementation)
- Player telemetry on current SONIC verse length distribution

## 16. Mechanic DebugTraceIR
[json bytecode block]
```

---

*Skill author: gemini-mechanic-debug-specialization*
*Source template: `docs/skills/vaelrix.law.debug.skill.md`*
*Date: 2026-04-26*
