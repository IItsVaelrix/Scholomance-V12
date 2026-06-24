Skill: Emergent Disparity Reconciliation Spell
Purpose

Use this skill to scan the fundamentals of a codebase and discover hidden mismatches, underused parallels, or disconnected systems that could be reconciled into useful “connective tissue.”

The goal is not to refactor for neatness.

The goal is to find latent boons: small architectural bridges that make the system more coherent, powerful, reusable, testable, or future-proof.

This skill looks for places where the codebase already contains the ingredients for something stronger, but the systems have not been introduced to each other yet. 🜂

Core Concept

An emergent disparity is a meaningful gap between two or more parts of the codebase.

Examples:

Disparity	Hidden Opportunity
Two modules solve similar problems differently	Create a shared adapter, registry, schema, or utility
UI has a concept that engine logic does not understand	Introduce a semantic bridge
Config exists in multiple hard-coded places	Centralize into a named source of truth
Tests verify outputs but not intent	Add golden contracts or invariant tests
Events exist but are not typed or traceable	Add an event map or telemetry seam
A subsystem has rich internal meaning but no public contract	Expose a stable interface
Visual behavior and data behavior drift apart	Add a synchronization layer

The spell does not assume all disparity is bad.

Some disparity is healthy specialization.
The skill separates productive difference from architectural fragmentation.

Emergent Disparity Reconciliation Spell
When to Use

Use this skill when the user asks to:

Audit a codebase for hidden opportunities
Find connective tissue between modules
Improve architecture without rewriting everything
Detect duplicated concepts across files
Make a system more extensible
Find “what I’m not seeing”
Strengthen fundamentals before adding features
Turn scattered mechanics into reusable infrastructure
Identify small changes with outsized compounding value

Trigger phrases may include:

“scan the fundamentals”
“find connective tissue”
“what am I missing?”
“find hidden boons”
“make this architecture stronger”
“audit for emergent patterns”
“reconcile disparities”
“what should become shared?”
“what wants to be a system?”
Change Classification

This skill may recommend any of the following:

Classification	Meaning
Cosmetic	Naming, organization, readability, file hygiene
Structural	Moving shared concepts into clearer modules
Behavioral	Changing how systems interact or respond
Architectural	Creating new contracts, registries, schemas, adapters, or lifecycle boundaries

Default behavior: prefer structural and architectural recommendations that are additive, reversible, and low-disruption.

Operating Principle

Do not hunt for flaws only. Hunt for unrealized alliances.

A normal audit asks:
“What is broken?”

This skill asks:
“What already exists in separate places that would become stronger if reconciled?”

Scan Procedure
1. Establish Codebase Fundamentals

First identify the project’s core primitives.

Look for:

Main runtime entry points
State ownership
Event systems
Config files
Constants and registries
Schemas and types
Rendering or UI layers
Engine/math/domain logic
Persistence boundaries
Test infrastructure
Build/deploy assumptions
Naming conventions
Cross-module imports
Error systems
Feature flags
Adapter layers
User-facing concepts

Output a short “fundamental map.”

Example:

## Fundamental Map

- Runtime shell: `src/main.tsx`
- Engine logic: `src/core/engine/`
- UI consumers: `src/components/`
- Domain config: `src/config/schools.ts`
- Event bus: `src/events/`
- Persistence: `src/db/`
- Tests: `tests/golden/`
2. Detect Disparities

Search for mismatches across fundamentals.

Use these lenses:

Naming Disparity

Same idea, different names.

Example:

schoolId
schoolKey
elementType
discipline
magicSchool

Possible boon:

Create a canonical SchoolIdentity schema.
Shape Disparity

Similar data structures with incompatible fields.

Example:

{
  id,
  label,
  color
}

versus:

{
  key,
  displayName,
  paletteToken
}

Possible boon:

Create adapter functions instead of forcing a full rewrite.
Lifecycle Disparity

Different systems initialize, update, or dispose in inconsistent ways.

Possible boon:

Introduce lifecycle hooks:
init()
hydrate()
activate()
deactivate()
dispose()
Source-of-Truth Disparity

Several files define the same truth separately.

Possible boon:

Create a central registry or config contract.
Semantic Disparity

The UI knows a concept that the logic layer does not, or vice versa.

Possible boon:

Create a semantic bridge between user-facing language and engine behavior.
Testing Disparity

The system has behavior but no invariant guarding it.

Possible boon:

Add golden outputs, parity tests, or contract tests.
Import Disparity

A low-level module imports a high-level module, or shared logic is trapped in a consumer.

Possible boon:

Extract the shared logic into a neutral utility or domain module.
Config Disparity

Values are duplicated or hard-coded in multiple layers.

Possible boon:

Promote magic values into named mappings.
Event Disparity

Events exist but have no shared vocabulary.

Possible boon:

Create a typed event registry.
Capability Disparity

A feature exists in one context but could benefit another with a clean seam.

Possible boon:

Expose the feature through a service, adapter, or plugin interface.
3. Sort Disparities by Boon Potential

Score each candidate from 1 to 5.

Score	Meaning
1	Minor cleanup
2	Nice consistency improvement
3	Useful maintainability gain
4	Strong architectural leverage
5	Major compounding boon

Use this scoring model:

## Boon Score

- Reuse gain:
- Risk reduction:
- Testability gain:
- Future feature acceleration:
- Migration safety:
- Cognitive load reduction:
- Total:
4. Propose Reconciliation Tissue

For each high-value disparity, propose the smallest useful bridge.

Preferred connective tissue types:

Tissue Type	Use When
Adapter	Two shapes need to communicate without rewriting either side
Registry	Many consumers need one canonical source of truth
Schema	Data needs validation, stability, or cross-layer clarity
Event Map	Events need names, payloads, and traceability
Contract Test	Behavior must remain stable across refactors
Facade	Consumers should not know internal complexity
Lifecycle Hook	Init/update/dispose behavior is scattered
Mapping Table	Hard-coded conditionals are growing
Capability Interface	A feature should become pluggable
Golden Output	Deterministic systems need parity proof
Boundary Module	Imports or responsibilities are tangled
Required Output Format

Every run of this skill should return:

# Emergent Disparity Reconciliation Report

## Summary

## Fundamental Map

## Highest-Value Disparities

## Proposed Connective Tissue

## Why These Boons Matter

## Minimal Implementation Sketches

## Risk Reduced

## Regression Risks

## QA Checklist

## Next Risks
Report Template
# Emergent Disparity Reconciliation Report

## Summary

I found [N] meaningful disparities across the codebase fundamentals.  
The strongest opportunity is [main boon], because it reduces [risk] while enabling [future capability].

## Fundamental Map

| Area | Current Source | Notes |
|---|---|---|
| Runtime | `[file]` | [brief note] |
| Domain model | `[file]` | [brief note] |
| UI layer | `[file]` | [brief note] |
| State | `[file]` | [brief note] |
| Events | `[file]` | [brief note] |
| Tests | `[file]` | [brief note] |

## Highest-Value Disparities

### 1. [Disparity Name]

**Classification:** Structural / Architectural  
**Layer:** Data / Logic / UI / Integration / Test  
**Files involved:**

- `[file]`
- `[file]`

**What I found:**

[Describe the mismatch clearly.]

**Why it matters:**

[Explain maintenance risk, duplication risk, drift risk, or future limitation.]

**Boon potential:** 5 / 5

**Recommended connective tissue:**

[Adapter / registry / schema / facade / contract test / lifecycle hook.]

---

## Proposed Connective Tissue

### [Tissue Name]

**What:**  
[Describe the exact new abstraction.]

**Why:**  
[Explain why this is the smallest useful reconciliation.]

**Risk reduced:**  
[Explain what becomes safer.]

**Do not do:**  
[Name tempting overreach to avoid.]

---

## Minimal Implementation Sketch

```ts
// New file: src/domain/exampleRegistry.ts

export const EXAMPLE_REGISTRY = {
  arcane: {
    id: "arcane",
    label: "Arcane",
    paletteToken: "school.arcane",
  },
} as const;

export type ExampleId = keyof typeof EXAMPLE_REGISTRY;

export function getExample(id: ExampleId) {
  return EXAMPLE_REGISTRY[id];
}
Integration Points
// Before
const color = school === "arcane" ? "#9f7aea" : "#fff";

// After
const schoolMeta = getExample(schoolId);
const color = resolvePaletteToken(schoolMeta.paletteToken);
QA Checklist
 Existing UI renders unchanged
 No import cycles introduced
 Existing tests pass
 New registry/schema has unit tests
 Consumers use adapter instead of duplicating shape logic
 Unknown IDs fail safely
 No behavioral changes unless explicitly intended
Regression Risks
Risk	How to Test
Incorrect mapping	Snapshot known IDs before and after
UI token mismatch	Visual smoke test affected components
Import cycle	Run build and dependency graph check
Adapter drift	Add contract test for source and output shapes
Next Risks
[Risk 1]
[Risk 2]
[Risk 3]

---

# Spell Heuristics

## Prefer

- Small composable changes
- Additive bridges
- Explicit schemas
- Named mappings
- Centralized contracts
- Adapter layers over destructive rewrites
- Golden tests for deterministic behavior
- Clear ownership boundaries
- Low-risk migration paths

## Avoid

- Rewriting large subsystems just because they differ
- Abstracting before proving reuse
- Creating vague “manager” files
- Hiding behavior behind clever names
- Collapsing healthy domain differences
- Introducing shared state without lifecycle rules
- Touching UI, engine, and persistence at once without tests

---

# Boon Categories

Use these labels when describing discoveries:

| Boon | Meaning |
|---|---|
| **Coherence Boon** | Makes the system easier to reason about |
| **Velocity Boon** | Makes future features faster to build |
| **Safety Boon** | Reduces breakage or drift |
| **Testing Boon** | Makes behavior easier to verify |
| **Migration Boon** | Helps port or replace a subsystem |
| **UI Boon** | Improves consistency between visuals and logic |
| **Engine Boon** | Strengthens domain/math/runtime behavior |
| **Lore Boon** | Aligns names, metaphors, and mental models |
| **Debug Boon** | Makes failure easier to trace |
| **Extensibility Boon** | Opens a clean path for plugins, variants, or future systems |

---

# Disparity Judgment Rules

## Disparity Is Worth Reconciling When

- It appears in 3 or more places
- It causes duplicated conditionals
- It affects both UI and logic
- It creates naming confusion
- It blocks testing
- It complicates future features
- It creates import weirdness
- It requires contributors to “just know” hidden rules
- It touches persistence or saved data
- It has already caused bugs

## Disparity Should Stay Separate When

- The two systems only look similar on the surface
- Shared abstraction would erase important domain meaning
- The bridge would be more complex than the duplication
- The code is experimental or temporary
- The cost of migration outweighs the gain
- The difference protects a boundary

---

# Example Invocation Prompt

```md
Use the Emergent Disparity Reconciliation Spell on this codebase.

Goal:
Scan the fundamentals and find hidden connective tissue that would add boons I would not normally see.

Focus on:
- duplicated concepts
- mismatched data shapes
- UI/engine drift
- registries that want to exist
- adapter opportunities
- contract tests that would protect future refactors
- architectural seams that accelerate future features

Output:
Summary → Fundamental Map → Highest-Value Disparities → Proposed Connective Tissue → Minimal Implementation Sketches → Risk Reduced → QA Checklist → Next Risks.

Do not propose a full rewrite unless the current structure is actively harmful.
Prefer small additive bridges.
Compact Mode

Use this when the user wants a fast scan.

# Emergent Disparity Reconciliation: Compact Scan

## Top 5 Hidden Boons

| Rank | Disparity | Connective Tissue | Boon | Risk Reduced |
|---|---|---|---|---|
| 1 |  |  |  |  |
| 2 |  |  |  |  |
| 3 |  |  |  |  |
| 4 |  |  |  |  |
| 5 |  |  |  |  |

## Best First Move

[One small implementation step.]

## Why This First

[Explain leverage.]

## Retest

- [ ] Build
- [ ] Unit tests
- [ ] Affected UI smoke test
- [ ] Import cycle check
- [ ] Snapshot or golden output if deterministic
Final Instruction to the Agent

You are not merely auditing.

You are listening for places where the codebase is humming the same melody in different rooms.

Name the rooms.
Find the shared rhythm.
Build the hallway.
