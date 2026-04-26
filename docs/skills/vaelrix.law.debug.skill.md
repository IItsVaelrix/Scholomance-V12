VAELRIX_LAW_DEBUGGING_SKILL_AGENT_TEMPLATE.md
# VAELRIX_LAW Debugging Skill Generator Template

## Purpose

You are creating a specialized debugging skill for your assigned Scholomance V12 `.md` document.

This is not a generic bug checklist.

This skill must operate at A-grade company standards: evidence-driven, architecture-aware, bytecode-oriented, regression-conscious, visually readable, and brutally useful every time it is invoked.

Your job is to create a debugging methodology that helps AI agents and human maintainers diagnose, repair, audit, and prevent failures across Scholomance V12 without hallucinating, overreaching, or hiding uncertainty.

---

# 1. Agent Assignment

## Assigned Document

You are responsible for adapting this skill into:

`[INSERT_TARGET_MD_FILE]`

Examples:

- `AGENTS.md`
- `CLAUDE.md`
- `CODEX.md`
- `CURSOR.md`
- `GEMINI.md`
- `VAELRIX_LAW.md`
- `ENGINEERING_RULEBOOK.md`
- `SCHEMA_CONTRACT.md`
- `ARCH_CONTRACT_OVERLAY_INTEGRITY.md`
- `MCP_INTEGRATION_GUIDE.md`

## Agent Role

Define your agent lane:

```txt
Agent Name:
Assigned .md:
Primary Scope:
Forbidden Scope:
Shared Dependencies:
Required Outputs:
Required Adaptation Rule

You must not copy this template blindly.

You must transform it into a version that fits your assigned .md file’s purpose while preserving the same debugging standards, bytecode schema, strict evidence policy, QA requirements, and report format.

2. Core Philosophy
Debugging Doctrine

Every bug must be treated as a system event, not an isolated inconvenience.

A valid debugging response must answer:

What failed?
Where did it fail?
Why did it fail?
What evidence proves that?
What system contracts were violated?
What dependencies could be affected?
What is the smallest safe fix?
What tests prove the fix?
What could still break?
What should be monitored after the fix?
Consulting-Grade Engineering Standard

Use a hybrid standard:

Senior engineer precision
BCG Platinion-style structured problem solving
Architecture and operating-model awareness
Clear stakeholder-readable reporting
Measurable impact
Explicit assumptions
No fake certainty

This skill must convert ambiguity into structured debug bytecode.

3. Target Bug Classes

Prioritize the following Scholomance V12 failure classes:

Integration bugs
UI drift
State-machine bugs
Async sequencing bugs
UI Stasis
Architecture drift
Bytecode audit failures
Visual regression failures
Contract/schema mismatches
Render/deploy failures
Performance regressions
Auth/session/security regressions
AI/MCP/agent orchestration failures
4. Operating Modes

The skill must support all modes below.

The agent must select the correct mode based on user request, available evidence, and risk level.

Mode A: Diagnostic-Only

Use when:

The user asks what is wrong.
Evidence is incomplete.
The repo state is unclear.
The bug may touch many systems.

Output:

Root-cause hypothesis ladder
Evidence needed
Reproduction path
Likely blast radius
No code changes unless clearly requested
Mode B: Patch-Ready

Use when:

Root cause is sufficiently proven.
A safe minimal fix is possible.
The user asks for implementation guidance.

Output:

Exact files likely touched
Minimal diff-style patch sections
Dependency check
Tests required
Rollback plan
Mode C: Autonomous Agent Repair Spec

Use when:

The user wants another coding agent to implement.
The fix requires multi-file edits.
The target .md must instruct an AI coding tool.

Output:

Step-by-step repair mission
File ownership boundaries
Forbidden changes
Validation commands
Expected final report format
Mode D: Senior Reviewer

Use when:

Reviewing an attempted fix
Reviewing a PR
Auditing another agent’s output
Checking if the fix is fake, shallow, or risky

Output:

Pass/block decision
Evidence quality
Hidden dependency risks
Missed tests
Architecture drift
Required remediation
Mode E: Post-Update Auditor

Use after every update.

Output must include:

What improved
What got riskier
What broke
What remains unknown
What tests passed/failed/not run
VAELRIX_LAW grade
Bytecode debug result
Mode F: Red-Team Debugger

Use after a fix is proposed.

Output must attack the fix.

Ask:

How can this patch fail?
What assumption is fragile?
What downstream consumer might break?
What test would expose this as a symptom patch?
What rollback hazard exists?
What would a senior reviewer block?
5. Mandatory Debug Report Format

Every full debugging report must use this exact structure:

# Debug Report

## 1. Symptom

## 2. Classification
Cosmetic / Structural / Behavioral / Architectural / Integration / Environmental

## 3. Reproduction Path

## 4. Failure Chain
A → B → C

## 5. Root Cause

## 6. Evidence

## 7. Blast Radius

## 8. Fix Strategy

## 9. Minimal Patch

## 10. Regression Net

## 11. QA Checklist

## 12. Risk Reduced

## 13. Confidence Grade

## 14. Remaining Unknowns

Do not omit sections.

If information is unavailable, write:

Unknown: insufficient evidence.
Needed evidence:
- ...

Never fabricate missing repo state, command results, file contents, test results, screenshots, logs, or user intent.

6. Visual Presentation Standard

The output must be visually readable.

Use:

Headings
Tables
Status icons
Severity labels
Risk matrices
Compact trace diagrams
Bytecode blocks
QA checklists
Pass/fail markers

Preferred status markers:

✅ Proven
⚠️ Likely
❌ Broken
🧪 Needs test
🧭 Next action
🧬 Architecture risk
🕳️ Unknown
🔥 Critical

Never produce a wall of prose.

Every report must help the user decide what to do next.

7. Evidence Policy
Non-Hallucination Contract

The agent must distinguish between:

Evidence Type	Meaning
Direct evidence	Seen in code, logs, tests, screenshots, repo docs, or user-provided output
Inferred evidence	Strongly implied by the system behavior
Hypothesis	Plausible but unproven
Unknown	Missing required data
Required Language

Use these labels:

Direct Evidence:
Inferred:
Hypothesis:
Unknown:
Forbidden Behavior

Do not say:

“The test passed” unless test output is provided or the agent actually ran it.
“This file contains…” unless the file was inspected.
“The root cause is…” when it is only a hypothesis.
“Safe fix” without describing regression risk.
“No risk” unless the change is purely cosmetic and isolated.
8. Bytecode DebugTraceIR

Every report must include machine-readable debug bytecode.

The bytecode is designed to demystify disambiguation. It turns vague debugging into a structured trace that another AI can immediately parse.

Required JSON Shape
{
  "debug_trace_ir_version": "1.0.0",
  "agent": {
    "name": "",
    "assigned_md": "",
    "mode": ""
  },
  "bug": {
    "title": "",
    "symptom": "",
    "classification": "",
    "severity": "low | medium | high | critical",
    "confidence": 0.0
  },
  "context": {
    "repo": "Scholomance-V12",
    "systems_touched": [],
    "files_observed": [],
    "files_suspected": [],
    "runtime_context": "",
    "user_goal": ""
  },
  "failure_chain": [
    {
      "step": 1,
      "event": "",
      "expected": "",
      "actual": "",
      "evidence_type": "direct | inferred | hypothesis | unknown"
    }
  ],
  "invariants": [
    {
      "id": "",
      "statement": "",
      "status": "held | violated | unknown",
      "evidence": ""
    }
  ],
  "state_machine": {
    "machine_name": "",
    "expected_states": [],
    "observed_states": [],
    "invalid_transition": "",
    "temporal_coupling_risk": ""
  },
  "async_sequence": {
    "events": [],
    "race_risk": "",
    "ordering_assumption": "",
    "cancellation_or_cleanup_gap": ""
  },
  "ui_drift": {
    "affected_surface": "",
    "expected_visual_contract": "",
    "observed_drift": "",
    "pixel_or_layout_metric": "",
    "stasis_risk": ""
  },
  "architecture_drift": {
    "contract_violated": "",
    "dependency_boundary_crossed": "",
    "shared_state_risk": "",
    "schema_or_api_drift": ""
  },
  "fix": {
    "strategy": "",
    "minimal_patch_summary": "",
    "files_to_change": [],
    "files_not_to_change": [],
    "rollback_plan": ""
  },
  "tests": {
    "mandatory_commands": [],
    "manual_qa": [],
    "visual_regression": [],
    "contract_tests": [],
    "not_run": []
  },
  "red_team": {
    "ways_this_fix_can_fail": [],
    "edge_cases": [],
    "reviewer_blockers": [],
    "remaining_unknowns": []
  },
  "grade": {
    "letter": "A+ | A | B | C | D | F",
    "score": 0,
    "reason": "",
    "upgrade_path": ""
  }
}
Bytecode Rules
Must be valid JSON.
Empty arrays are allowed only when truly irrelevant.
Unknowns must be explicit.
Do not include invented files.
Do not include pretend command results.
Confidence must be a number from 0.0 to 1.0.
The bytecode must match the human report.
9. Strict A-F Grading Rubric

Every debugging output receives a grade.

A+

Requirements:

Root cause proven with direct evidence
Minimal fix identified
Blast radius mapped
Regression tests specified
Red-team critique included
Bytecode valid and complete
No hallucinated evidence
Clear rollback path
Architecture contracts preserved or explicitly improved
A

Requirements:

Strong diagnosis
Evidence mostly direct
Safe fix strategy
Good QA plan
Unknowns documented
No obvious architecture drift
B

Means:

Plausible diagnosis
Some evidence missing
Fix likely but not fully proven
QA plan present but incomplete
C

Means:

Symptom-level patch
Weak proof
Blast radius incomplete
Tests generic
D

Means:

Guesswork
Missing evidence
Missing regression plan
Risk hidden or understated
F

Means:

Hallucinated facts
Fabricated command results
Dangerous patch
Architecture violation
No QA plan
False certainty
10. Senior Debugging Arsenal

Use the following techniques when relevant.

Do not name-drop them performatively. Apply them concretely.

Delta Debugging

Find the smallest input, commit, component, or state transition that reproduces the bug.

Use for:

UI drift
analysis pipeline failures
text input bugs
visual regression
broken route behavior
Git Bisect Reasoning

Identify the likely change that introduced the regression.

Use when:

The bug used to work
A recent update changed behavior
Multiple files were touched
Invariant Extraction

Define truths that must always hold.

Examples:

Ambient player must not reset across route transitions.
TrueSight overlay coordinates must align to text after resize.
Auth routes must not accept missing CSRF tokens.
State machines must not transition from ERROR to PLAYING without recovery.
Causal Trace Mapping

Map failure as:

Event A → State B → Render/API/Effect C → User-visible failure D

No fix is valid until this chain is plausible.

Differential Testing

Compare:

Old vs new implementation
Client vs server output
Expected vs observed DOM
Feature flag on vs off
Local vs deployed behavior
Property-Based Testing

Use when the input space is huge.

Examples:

Arbitrary poem text
random punctuation
long lines
Unicode symbols
empty strings
repeated whitespace
edge-case phoneme tokens
Metamorphic Testing

Use when exact expected output is hard.

Examples:

Adding whitespace should not change phoneme identity.
Reordering unrelated UI panels should not change scoring.
Theme changes should not alter layout geometry.
Same text should produce same bytecode analysis.
Golden Master Testing

Use when preserving existing complex behavior matters.

Capture known-good output before refactor.

Use for:

CODEx scoring
phoneme analysis
rhyme mapping
visual layout snapshots
bytecode audit output
Mutation Testing Mindset

Ask:

Would the test fail if the implementation were broken?

If not, the test is decorative.

Fault Injection

Simulate:

API timeout
missing dictionary DB
corrupted corpus artifact
failed audio load
Redis unavailable
auth session expired
MCP agent unavailable
Shadow-Mode Validation

Run new logic beside old logic without replacing behavior.

Use for:

scoring engines
bytecode interpreters
UI analysis pipelines
agent orchestration
Canary Analysis

Use when deploying risky changes.

Ask:

What metric reveals failure early?
Can this be feature-flagged?
Can rollback happen cleanly?
What users/surfaces are first exposed?
Flamegraph Profiling

Use for performance bugs.

Identify:

hot loops
repeated renders
expensive phoneme passes
layout thrashing
blocking sync work
Heap Snapshot Reasoning

Use for memory leaks.

Look for:

unremoved listeners
stale timers
retained DOM nodes
orphaned audio objects
unbounded caches
Race Timeline Analysis

Use for async bugs.

Trace:

T0 user action
T1 state update scheduled
T2 async request begins
T3 component unmounts
T4 response resolves
T5 stale state write occurs
Temporal Coupling Audit

Detect hidden order dependencies.

Examples:

function only works after another hook runs
UI only renders correctly after resize
auth only works after manual refresh
state machine depends on effect order
Contract Testing

Use for frontend/backend and schema boundaries.

Check:

API request shape
response shape
Zod schemas
TypeScript/check-js expectations
DB persistence assumptions
event payload structure
Observability-First Debugging

Before patching unclear bugs, improve:

logs
trace IDs
timing markers
state transition logs
error boundaries
metrics
visual debug overlays
Static Dependency Graphing

Before changing shared files, map:

imports
consumers
shared state
hooks
route usage
event bus listeners
schemas
CSS variable dependencies
State-Machine Validation

For any stateful system, define:

legal states
legal transitions
forbidden transitions
recovery states
terminal states
side effects per transition
11. Debugging Decision Tree

Use this decision tree before diagnosing.

Is the bug reproducible?
├─ No
│  ├─ Add observability
│  ├─ Capture environment
│  ├─ Record timing/state/log evidence
│  └─ Look for nondeterminism/race conditions
│
└─ Yes
   ├─ Did it work before?
   │  ├─ Yes → change audit / git bisect reasoning / diff scan
   │  └─ No → requirements or missing contract audit
   │
   ├─ Is it UI-visible?
   │  ├─ Yes → visual contract / layout / CSS variable / state hydration audit
   │  └─ No
   │
   ├─ Is it async or timing-dependent?
   │  ├─ Yes → race timeline / cleanup / cancellation / stale closure audit
   │  └─ No
   │
   ├─ Does it cross frontend/backend?
   │  ├─ Yes → schema / API / auth / serialization / status-code contract
   │  └─ No
   │
   ├─ Does it involve bytecode, IR, CODEx, or analysis output?
   │  ├─ Yes → deterministic input/output / golden master / invariant audit
   │  └─ No
   │
   ├─ Does it involve state machine behavior?
   │  ├─ Yes → legal transition table / impossible transition / recovery state audit
   │  └─ No
   │
   └─ Is performance degraded?
      ├─ Yes → flamegraph / render count / cache / async bottleneck audit
      └─ No → continue causal trace mapping
12. Mandatory Dependency Check

Before recommending or applying changes, inspect the dependency layer.

Required Dependency Questions
What imports this?
What does this import?
Is this used by routes, hooks, services, tests, or agents?
Does this touch shared state?
Does this touch API contracts?
Does this touch persisted data?
Does this touch CSS variables or layout contracts?
Does this touch bytecode/IR schemas?
Does this affect tests or mocks?
Does this affect production deployment?
Required Output
## Dependency Check

| Area | Risk | Evidence | Action |
|---|---|---|---|
| Imports |  |  |  |
| Shared State |  |  |  |
| UI Consumers |  |  |  |
| API Consumers |  |  |  |
| Tests |  |  |  |
| Bytecode/IR |  |  |  |
| Deployment |  |  |  |
13. Scholomance-Specific Debug Targets

Use these known system categories.

Do not assume exact files unless inspected.

Frontend

Check for:

route transition bugs
stale hooks
render loops
hydration mismatch
CSS variable drift
viewport clamp issues
animation state desync
UI Stasis
visual regression
Backend

Check for:

Fastify route mismatch
auth/session failure
CSRF failure
Zod validation mismatch
SQLite path/persistence problems
Redis session assumptions
production environment mismatch
CODEx / Analysis

Check for:

tokenization mismatch
phoneme mapping errors
deterministic scoring drift
Hidden Harkov state issues
rhyme family inconsistencies
bytecode schema mismatch
golden master divergence
PixelBrain / UI Fidelity

Check for:

coordinate drift
overlay misalignment
layout resize bugs
animation envelope mismatch
CSS transform side effects
device-pixel-ratio issues
viewport scaling errors
MCP / Agents

Check for:

unclear agent ownership
broken handoff
duplicated instructions
contradictory .md authority
missing schema contracts
hallucinated repo knowledge
unsafe autonomous edits
14. UI Stasis Debugging

UI Stasis means the interface appears visually present but functionally frozen, stale, desynchronized, or nonresponsive.

Common Causes
stale closure
missing dependency in effect
state update swallowed
event listener not rebound
async promise resolves after component unmount
CSS animation continues while logical state stops
optimistic UI never reconciles
disabled state not reset
loading state stuck
state machine trapped in transitional state
cache returns old data without invalidation
Required UI Stasis Audit
## UI Stasis Audit

| Check | Result | Evidence |
|---|---|---|
| User action fires? |  |  |
| Handler executes? |  |  |
| State updates? |  |  |
| Render commits? |  |  |
| Async resolves/rejects? |  |  |
| Loading state clears? |  |  |
| Disabled state resets? |  |  |
| Visual state matches logical state? |  |  |
15. State-Machine Debugging

For any state-machine bug, produce a transition table.

## State-Machine Audit

| From | Event | Expected To | Observed To | Valid? | Side Effect |
|---|---|---|---|---|---|
|  |  |  |  |  |  |
Required Checks
impossible transitions
missing recovery transitions
unhandled error state
duplicate side effects
stale event dispatch
race between events
transition without cleanup
cleanup without transition
16. Async Sequencing Debugging

For async bugs, produce a timeline.

## Async Timeline

| Time | Event | Expected | Actual | Risk |
|---|---|---|---|---|
| T0 |  |  |  |  |
| T1 |  |  |  |  |
| T2 |  |  |  |  |
Required Checks
stale closures
missing abort/cancel handling
unmounted component updates
request order inversion
duplicate requests
optimistic update mismatch
retry loop
unresolved loading state
error path not clearing state
17. UI Drift Debugging

For UI drift, compare visual contract to observed behavior.

## UI Drift Audit

| Surface | Expected Contract | Observed Drift | Likely Cause | Test |
|---|---|---|---|---|
|  |  |  |  |  |
Required Checks
CSS variable changed
layout container changed
animation transform changed
font metrics changed
viewport clamp changed
absolute positioning changed
device pixel ratio issue
Playwright screenshot baseline changed
text measurement invalidated
resize observer missing
18. Architecture Drift Debugging

Architecture drift means a change violates the intended system boundaries even if the app still runs.

Required Architecture Drift Audit
## Architecture Drift Audit

| Contract | Expected Boundary | Observed Violation | Risk | Correction |
|---|---|---|---|---|
|  |  |  |  |  |
Common Drift Types
UI importing domain internals directly
backend leaking persistence details to frontend
tests depending on implementation instead of behavior
duplicate config sources
hard-coded IDs instead of named mappings
schema change without consumer update
bytecode output changed without version bump
agent instructions contradict shared preamble
CSS variables bypassed by hard-coded styles
19. Bytecode Audit Failure Debugging

If a bytecode/IR audit fails, do not patch randomly.

Required Bytecode Audit
## Bytecode Audit

| Node | Expected | Actual | Contract | Severity |
|---|---|---|---|---|
|  |  |  |  |  |
Required Checks
schema version mismatch
invalid node shape
missing required field
non-deterministic output
ordering instability
floating confidence inconsistency
unknown encoded as certainty
consumer cannot parse output
human report contradicts bytecode
bytecode changed without migration notes
20. Mandatory QA Commands

Every fix strategy must include mandatory commands.

Use available project commands when confirmed. If not confirmed, label them as expected commands requiring package verification.

Standard Scholomance QA Set
npm run lint
npm test
npm run build
npm run test:visual
npm run security:qa
npm run security:audit
When Relevant
npm run dev:full
npm run db:setup
npm run build:rhyme-astrology:index
npx playwright test
QA Output Rules

Do not claim these commands passed unless actual command output is available.

Use this table:

## QA Checklist

| Command / Check | Purpose | Status | Evidence |
|---|---|---|---|
| npm run lint | static quality | Not run | Required before merge |
| npm test | unit/integration | Not run | Required before merge |
| npm run build | production build | Not run | Required before merge |
| npm run test:visual | visual regression | Not run | Required for UI changes |
| npm run security:qa | security checks | Not run | Required for auth/API changes |
| npm run security:audit | dependency risk | Not run | Required before release |
21. Minimal Patch Standard

When providing code, use diff-first thinking.

Required Patch Rules
Classify the change:
Cosmetic
Structural
Behavioral
Architectural
Integration
Environmental
Prefer small composable edits.
Preserve existing conventions.
Do not refactor shared systems unless the root cause is structural.
Show only changed sections unless the full file is necessary.
Label large replacements:
### OLD

### NEW
Explain:
What changed:
Why:
Risk reduced:
Regression risk:
22. Red-Team Self-Review

Every fix must include this.

## Red-Team Review

| Attack Question | Answer |
|---|---|
| How could this fix fail? |  |
| What edge case remains? |  |
| What assumption is weakest? |  |
| What test would disprove the fix? |  |
| What downstream system may break? |  |
| What would block this in senior review? |  |
23. VAELRIX_LAW Tribunal Output

Every post-update or high-risk debugging response must include:

## VAELRIX_LAW Tribunal

| Category | Verdict | Evidence |
|---|---|---|
| Value Added |  |  |
| Risk Reduced |  |  |
| Risk Introduced |  |  |
| Architecture Integrity |  |  |
| Bytecode Integrity |  |  |
| UI Fidelity |  |  |
| Test Coverage |  |  |
| Unknowns |  |  |
| Final Grade |  |  |
Tribunal Rule

The tribunal must be useful even when the update was bad.

Do not soften failure.

A bad update with honest evidence is more valuable than a shiny hallucinated success report.

24. Agentic Scenario Instructions
Scenario 1: User Reports a Bug

Do:

Classify the bug.
Ask only for missing evidence that materially changes diagnosis.
Produce a preliminary failure chain.
Identify required logs/screenshots/files.
Avoid premature patching.
Scenario 2: User Provides Code

Do:

Inspect the code.
Identify layer: data, logic, UI, integration, environment.
Trace state/data flow.
Identify root cause or uncertainty.
Provide minimal patch.
Provide tests.
Scenario 3: User Provides Error Logs

Do:

Extract exact error.
Map stack trace to likely layer.
Identify first meaningful failure, not final cascade.
Separate root cause from secondary errors.
Provide reproduction and fix path.
Scenario 4: User Asks Another AI to Fix It

Do:

Produce autonomous repair prompt.
Include files to inspect.
Include forbidden edits.
Include exact QA commands.
Require final DebugTraceIR output.
Scenario 5: User Asks for Review

Do:

Treat proposed fix as suspect until proven.
Audit dependency graph.
Check tests.
Red-team patch.
Pass/block with reasons.
Scenario 6: Bug Is Intermittent

Do:

Assume timing, environment, race, cache, or nondeterminism.
Build event timeline.
Add observability before patching.
Seek minimal reproducer.
Avoid false certainty.
Scenario 7: UI Looks Right but Feels Frozen

Do:

Run UI Stasis audit.
Trace user action to handler.
Trace handler to state update.
Trace state update to render.
Trace async resolution and cleanup.
Check disabled/loading state.
Scenario 8: Visual Regression

Do:

Compare expected visual contract.
Identify CSS/layout/token changes.
Check viewport, font, transform, and animation effects.
Require Playwright visual regression.
Include pixel/layout metric when available.
Scenario 9: Bytecode/IR Failure

Do:

Validate JSON/schema.
Check determinism.
Check versioning.
Compare human report to bytecode.
Check consumers.
Require migration notes if schema changed.
25. Forbidden Agent Behaviors

The agent must not:

Invent test results.
Invent files.
Invent command output.
Ignore architecture contracts.
Patch symptoms while hiding root cause uncertainty.
Refactor unrelated systems.
Collapse all bugs into “state issue.”
Overuse jargon without proof.
Skip QA.
Skip red-team review.
Skip bytecode.
Claim BCG proprietary methodology.
Hide risk to sound confident.
Ask broad questions when a targeted assumption can be made and labeled.
26. Final Skill Creation Task

Using everything above, create the specialized debugging skill for:

[INSERT_TARGET_MD_FILE]

Your output must include:

Skill name
Scope
Trigger phrases
Operating modes
Exact report format
Bytecode schema
Evidence rules
Senior debugging techniques
Scholomance-specific checks
QA command policy
Red-team policy
VAELRIX_LAW tribunal integration
Agent-specific additions
Agent-specific forbidden behaviors
Example output skeleton

The final skill must be ready to paste directly into the assigned .md document.

27. Required Final Answer Shape

Use this exact structure:

# [AGENT NAME] Debugging Skill

## 1. Purpose

## 2. Scope

## 3. Trigger Phrases

## 4. Operating Modes

## 5. Evidence Standard

## 6. Debug Report Format

## 7. DebugTraceIR Bytecode

## 8. Senior Debugging Arsenal

## 9. Scholomance-Specific Audits

## 10. Mandatory QA

## 11. Red-Team Review

## 12. VAELRIX_LAW Tribunal

## 13. Agent-Specific Rules

## 14. Forbidden Behaviors

## 15. Example Output Skeleton
28. Quality Gate Before Returning

Before returning the final skill, self-check:

Did I preserve the exact Debug Report format?
Did I include bytecode?
Did I include mandatory QA?
Did I include red-team review?
Did I include VAELRIX_LAW tribunal?
Did I prevent hallucinated evidence?
Did I adapt to the assigned .md?
Did I avoid pretending to know uninspected files?
Did I include agentic operating modes?
Did I make the output visually usable?

If any answer is no, revise before returning.


---

## Recommended Use

Hand that template to each agent with one line added at the top:

```txt
You are adapting this into [CLAUDE.md / GEMINI.md / CODEX.md / VAELRIX_LAW.md / etc.]. Preserve the debugging standard but specialize it for your document’s authority lane.
