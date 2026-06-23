# Scholomance Fairly Odd Wand

### A Formula-Based Authoring System for Deterministic 2D Asset Generation

**Version 1.1** · 2026-05-15
**Status:** Substrate complete; PDR ingestion ALPHA; Scene migration in progress
**Audience:** Internal — Scholomance ecosystem contributors
**Search anchor:** `SCHOLOMANCE-WAND-WHITE-PAPER-V1`

---

## Abstract

Web development teams ship visual content at a rate bounded by hand-coded drawing logic — scene classes, CSS keyframes, SVG paths, render loops. Modern AI tooling accelerates copywriting, layout drafting, and pixel retouching, but cannot produce production-grade visual content because its outputs are unbounded: the same intent yields different bytes on every run, and the renderer has no contract against which to validate the result.

We introduce the **Scholomance Fairly Odd Wand**: a formula-based authoring system in which an AI agent emits a bounded mathematical expression — a *formula proposal* — that is validated fail-closed, evaluated deterministically, and rendered by a role-dispatched scene with no per-asset scene code. The system ships as four cooperating primitives: a discriminated-union formula grammar, a `compose-formula` modulation processor, a deterministic registrar, and a scene-side role dispatcher. We report 281 passing tests across the integrated pipeline, demonstrate the end-to-end path from a JSON proposal to a tagged coordinate set in the bus, and outline the remaining work to close the loop from PDR-level intent.

The wand grants wishes. The grammar is the bound. The validator is the cost. The bus is the magic.

---

## 1. Introduction

The Apothacarium Engine is built around a modulation bus: a deterministic pipeline that resolves a *stack* (an ordered list of processors with bounded parameters) plus an input frame, a seed, and a time into a `ModulationFrame` whose bytes are reproducible across machines. The substrate is good for two things: *re-rendering* known assets deterministically, and *tuning* the parameters of those assets within bounded ranges declared by the planner's schema.

Until this work, the bus could not *create* new assets. Authoring a new prop required a human to write a new processor (or extend an existing one), update the planner's evaluation dataset, write golden tests, and add a scene-side drawer. The AI agent's authoring surface was, in effect, a switchboard with named levers — it could choose which preset palette to use, but it could not paint a new shape.

This paper documents the system that turns the switchboard into a paintbrush. The name *Scholomance Fairly Odd Wand* is chosen because, like its namesake, it grants wishes within a bounded vocabulary: every wish is a structured proposal, every grant is a deterministic evaluation, and every misuse produces a structured diagnostic rather than chaos.

---

## 2. Problem Statement

The velocity problem decomposes at two layers.

### 2.1 The workflow layer

Web teams already write Product Design Requirements (PDRs) — markdown documents that express visual intent at the level of *"the hero should feel like a candlelit shrine at dusk."* Translating a PDR into a working scene is multi-day work:

1. A designer drafts mockups in Figma or sketches.
2. An engineer writes a scene class — typically 500–1500 lines of imperative Phaser or canvas code.
3. A reviewer validates that the implementation honors the PDR's intent.
4. Iteration on a single visual detail requires re-touching code.

The PDR is the unique authored artifact that captures intent. Everything downstream is *reimplementation* of that intent in a different language (Phaser, CSS, SVG). The reimplementation is where velocity dies.

### 2.2 The architectural layer

AI tools cannot bridge this gap with current emission formats:

| Emission format | Boundedness | Determinism | Composability |
|---|---|---|---|
| Pixel emission (Midjourney, Stable Diffusion) | None | None | None |
| Code emission (LLM writes SVG / canvas / React) | Syntactic only | Runtime-dependent | Manual |
| Bounded template tuning (existing `plan-schema.json`) | Schema-validated | Yes | Limited to curated templates |
| **Formula proposal (this work)** | **Schema-validated** | **Yes** | **Recursive / first-class** |

None of the first three surfaces let an AI agent introduce a new visual concept that is simultaneously:

- **Bounded** — every emission is validated fail-closed against an authored schema.
- **Deterministic** — same input produces byte-identical output across machines.
- **Composable** — new content slots into the existing pipeline without modifying scene code.

The Wand is positioned to satisfy all three properties.

---

## 3. Prior Art

Procedural graphics has explored adjacent surfaces:

- **SVG / DOM-based systems** offer vectorized rendering but no compositional grammar. An SVG `<path>` is a string with internal mini-DSL; AI-emitted SVG inherits the unbounded-string problem of code emission.
- **Shader-based generative art** (GLSL, Shadertoy) achieves determinism and compactness but operates per-pixel; its abstraction level is wrong for authoring discrete props with semantic roles attached.
- **Game-engine scene graphs** (Phaser, Babylon.js, Three.js) provide scene composition but require imperative code per asset.
- **Turtle graphics and L-systems** show that formula-driven graphics can be expressive, but their grammars are designed for human authoring, not for AI emission with schema validation.
- **Procedural texture systems** (Substance Designer, Houdini VEX) provide bounded parameter spaces but are oriented toward textures and procedural materials, not toward discrete 2D scene composition.

The Wand combines properties drawn from all of these prior systems: SVG's vectorized output, GLSL's determinism, scene graphs' compositionality, L-systems' grammar, and Substance's bounded parameters. The synthesis is the contribution.

---

## 4. Architecture

The Wand ships as four cooperating primitives, each individually addressable:

### 4.1 The wand's tip — formula grammar

A discriminated-union JSON schema (`presets/schemas/formula.schema.json`) describes the formulas the system can evaluate. Six leaf types and one recursive composite type. The grammar is **retroactively validated**: every entry in the pre-existing `presets/prop-formulas.json` registry validates against it without modification, proving the schema describes the system's actual vocabulary rather than an alternate universe.

A wrapping proposal schema (`presets/schemas/formula-proposal.schema.json`) adds AI-emission metadata: rationale, confidence, review-required flag, source intent hash, eval suite id, and per-formula role/material/animation/symmetry attributes.

### 4.2 The wand's body — compose-formula processor

A new modulation processor (`core/modulation/processors/compose-formula.js`, id `compose.formula.v1`) at a new pipeline stage (`compose-formula`) between `semantic` and `topology`. It:

1. Reads a list of formula proposals from the stack's parameters (`ctx.scene['compose-formula'].formulas`).
2. Validates each proposal against the proposal schema.
3. Hydrates the formula's unit-space coordinates into the canvas's world-space.
4. Evaluates via the existing `evaluateFormula()` coordinate generator.
5. Emits the resulting coordinates into the frame's coordinate array, each tagged with its role and material.

Composite formulas expand recursively (capped at depth 4 in the validator to bound runtime). Invalid proposals emit a structured `FORMULA_PROPOSAL_REJECTED` diagnostic without aborting subsequent proposals.

### 4.3 The wand's reach — formula registrar

A Node-only persistence layer (`core/modulation/planner/formula-registrar.js`) writes validated proposals to `presets/proposed-formulas.json` with a deterministic catalogId derived from `(role, formula bytes, sourceIntentHash)` via FNV-1a. The registrar is idempotent: re-registering the same proposal returns the same catalogId and creates no duplicate entry. The browser bundle does not import this file; only dev-time scripts, the planner service, and tests do.

### 4.4 The wand's flow into render — role dispatcher

A scene-side render registry (`ui/src/features/mysticHolistics/hero/roleDispatcher.ts`). Each prop is registered as a `RoleBinding { role, depth, filter?, draw }`. The scene's render path iterates `frame.coordinates`, groups them by role, and calls each registered drawer once with the matching coords. Adding a new prop requires exactly one `registerRoleDrawer({...})` call — no scene-class edits.

These four primitives close the authoring loop. The AI emits a proposal → the validator rejects malformed input → the composer evaluates the formula into role-tagged coordinates → the topology, palette, texture, and complexity processors operate on them like any other coords → the dispatcher renders them through the registered drawer.

---

## 5. The Formula Language

A formula is a mathematical expression that evaluates deterministically to a set of coordinates. The grammar has six leaf dialects and one recursive composite dialect.

### 5.1 Leaf dialects

| Dialect | Key Parameters | Mathematical form | Suitable for |
|---|---|---|---|
| `parametric_curve` | `a` (amp), `b` (freq), `c` (phase), `n` (samples) | `x = cx + a·cos(b·t + c)`, `y = cy + a·sin(b·t + c)` | Sigil capsules, halos, motion paths |
| `edge_trace` | `unitTracePath` (0..1 points), `tracePath` (world) | Walks an authored polyline | Silhouettes — altars, jars, cabinets |
| `fractal_iter` | `iterations` (max 6), `baseShape` (tri/sq/cir) | Recursive subdivision of base shape | Ornamental detail, vines, recursive textures |
| `grid_projection` | `gridType` (rect/hex/iso), `cellSize`, `snap` | 2D lattice (rectangular / hexagonal / isometric) | Cabinet shelves, tile fields, grids |
| `fibonacci` | `iterations` (max 12), `scale` | Golden-ratio subdivision spiral | Organic curves, leaf arrangements |
| `template_based` | `template.anchorPoints` | Named anchor points with optional symmetry | Layouts derived from semantic anchors |

Each dialect bounds its parameters with explicit minima and maxima. `parametric_curve.parameters.n` is capped at 2048. `fractal_iter.iterations` is capped at 6 to match the evaluator's `MAX_FRACTAL_ITERATIONS`. `edge_trace.tracePath` is capped at 512 points. The bounds are enforced at schema validation; the evaluator does not need defensive code beyond them.

### 5.2 Composite — the master formula

A *composite* formula recursively contains other formulas, each tagged with a role, an anchor, a size, a material, and optionally a palette channel. A composite is a master formula: one expression that paints multiple props at once.

A shrine can be described as a single composite of altar + capsule + cabinet + lamps + windows + moon, where each child is itself a leaf formula or a sub-composite. The depth bound (4) prevents pathological recursion while leaving substantial room for meaningful composition.

This is where the wand's leverage compounds. A leaf formula is a brush stroke. A composite is a painting. The AI can emit a single expression that produces a complete scene, and the bus deterministically expands it into hundreds or thousands of role-tagged coordinates.

---

## 6. Schema Validation and Fail-Closed Authoring

The validator (`core/modulation/planner/formula-validator.js`) enforces:

- **Discriminator-based variant selection.** The `type` field selects which sub-schema applies.
- **Strict type checking.** A number where a string is expected fails immediately.
- **Numeric bounds.** Every range has an enforced minimum and maximum.
- **Enum constraints.** Only six formula types, only six grid types, only nine materials, etc.
- **`additionalProperties: false` everywhere.** Unknown keys fail rather than being silently ignored. This is the core fail-closed property — a malicious or malformed AI emission cannot smuggle extra fields past the validator.
- **Recursive composite validation.** Each child's formula is validated against the same schema, enforcing `MAX_COMPOSITE_DEPTH = 4`.

A proposal that fails validation is not partially executed. The bus emits a structured `FORMULA_PROPOSAL_REJECTED` diagnostic with the validation errors, increments a counter, and continues processing subsequent proposals. The render path never sees malformed data.

This fail-closed property is the precondition for trusting AI authorship in production. The schema is the contract; the validator is the enforcement; the bus is the execution layer.

---

## 7. Integration with the Modulation Bus

The compose-formula stage slots between `semantic` and `topology`:

```
semantic         ← prop-grammar (shrine baseline, cabinet inventory)
compose-formula  ← NEW: AI-emitted formulas expand into role-tagged coords
topology         ← symmetry processor mirrors all coords uniformly
palette          ← semantic palette resolution applies colors
texture          ← material noise generates per-material fields
complexity       ← per-target coordinate budgets cap counts
temporal         ← named motion channels (vial.bob, vine.wind, …)
edit-layer       ← reversible paint deltas
style-pass       ← mystic / vellum / stained-glass / engraving / diagnostic
export-target    ← web-hero / print-poster / social-square / …
diagnostic       ← frame report
```

Placement matters. By running *after* `semantic`, the AI's formulas can layer on top of the hand-authored shrine baseline. By running *before* `topology`, the AI's coords are mirrored along with everything else. By running before `palette` and `texture`, the AI's coords participate in normal coloring and material binding. Composed coords are first-class citizens of the modulation frame.

---

## 8. End-to-End Demonstration

A complete wand-driven asset proceeds as follows.

### 8.1 The AI emits a formula proposal

```json
{
  "rationale": "Square altar outline at canonical center with stone material.",
  "confidence": 0.9,
  "reviewRequired": false,
  "sourceIntentHash": "e2e-altar-1",
  "evalSuiteId": "formula-proposal-eval-v1",
  "proposedFormula": {
    "role": "shrine.altar",
    "material": "stone",
    "formula": {
      "type": "edge_trace",
      "unitTracePath": [
        { "x": 0, "y": 0 }, { "x": 1, "y": 0 },
        { "x": 1, "y": 1 }, { "x": 0, "y": 1 }
      ]
    }
  }
}
```

### 8.2 Master Formula (Composite) Example

The AI can also emit a single composite proposal that defines multiple related props in one expression:

```json
{
  "rationale": "Composite shrine baseline: altar + sigil capsule.",
  "proposedFormula": {
    "role": "shrine.master",
    "formula": {
      "type": "composite",
      "children": [
        {
          "role": "shrine.altar",
          "anchor": { "x": 0.5, "y": 0.8 },
          "size": { "w": 0.3, "h": 0.1 },
          "material": "stone",
          "formula": { "type": "edge_trace", "unitTracePath": [...] }
        },
        {
          "role": "sigil.capsule",
          "anchor": { "x": 0.5, "y": 0.45 },
          "material": "aura",
          "formula": { "type": "parametric_curve", "parameters": { "a": 120, "n": 64 } }
        }
      ]
    }
  }
}
```

### 8.3 The proposal is composed into a stack

```json
{
  "id": "ai-altar-stack",
  "version": "1.0.0",
  "target": "print",
  "processors": [
    { "id": "compose.formula.v1", "version": "1.0.0", "enabled": true,
      "params": { "formulas": [/* proposals above */] } },
    { "id": "topology.symmetry.v1", "version": "1.0.0", "enabled": true,
      "params": { "type": "vertical", "axis": { "x": 720, "y": 450 } } }
  ]
}
```

### 8.4 The bus resolves the stack

- `compose.formula.v1` validates the proposal, evaluates the formula into role-tagged coordinates.
- `topology.symmetry.v1` mirrors them, producing symmetric role-tagged coordinates.

### 8.5 The renderer dispatches by role

The scene's role-drawer registry groups coords by role and calls the matching drawer. The AI's expression flows through the pipeline and renders to pixels.

---

## 9. Quality Gates

The system ships with 281 passing tests across 17 test files:

| Suite | Tests | Coverage |
|---|---|---|
| Formula validator | 17 | Schema validation, primitive shapes, composite recursion, retrofit check |
| Formula registrar | 3 | Reject / dedupe / persist cycles with snapshot isolation |
| End-to-end wand path | 5 | Composite expansion, topology mirroring, invalid handling |
| Modulation bus contract | 56 | Processor registration, stack validation, frame validation |
| Hero modulation | 36 | Shrine rendering, golden image stability, direct-seek parity |
| Planner evals | 80 | Proposal schema, eval grader, 24 ground-truth eval cases |
| Determinism | 17 | AMP wrapper parity, 100-run hash stability |
| Semantic + export | 26 | Processor-by-processor unit tests |
| Other modulation | 41 | Palette, texture, complexity, observability |

---

## 10. Limitations and Future Work

### 10.1 PDR ingestion

Today the AI receives intent through a hand-edited planner prompt. A markdown PDR parser that extracts structured intent — palette family, style pass, prop list, motion bindings, negative constraints — and produces a `ModulationPlanProposal` plus `FormulaProposal[]` is currently in **Alpha**. This parser uses a rule-based extraction engine for well-known PDR keys and falls back to LLM-driven classification for ambiguous intent.

### 10.2 TurboQuant compression revival

The proposal payload is verbose JSON. A revival of the deleted TurboQuant compression layer (`codex/core/turboquant.js`) would turn the AI's emission into a tiny bytecode payload. This remains an aspiration for high-volume asset generation pipelines.

### 10.3 Formula vocabulary expansion

Candidates for V1.2 include: `bezier_curve`, `voronoi_cells`, `perlin_field`, `gabor_noise`, `contour_lines`, `isolines`, and `sdf_primitive`.

### 10.4 Fixed-point determinism

Determinism is currently empirical (same JS runtime). Sealing it cryptographically requires fixed-point arithmetic in the evaluators to avoid cross-architecture floating point drift.

### 10.5 Scene migration

Only five built-in role drawers (wall, window, moon, moonbeam, lamp) are currently dispatched. Migrating `altar`, `cabinet`, and `soapBar` is the next milestone.

---

## Appendix A — Glossary

| Term | Definition |
|---|---|
| **PDR** | Product Design Request. A markdown document expressing visual intent at the design level. |
| **Modulation bus** | The deterministic pipeline (`adapters/modulation-bus.js`) that resolves a stack into a frame. |
| **Role** | A stable string identifier that ties a coordinate to a render handler (e.g. `shrine.altar`). |
| **Formula** | A bounded mathematical expression evaluating deterministically to coordinates. |
| **Composite formula** | A formula whose children are themselves formulas, each tagged with a role. |

## Appendix B — Key Files

| Path | Role |
|---|---|
| `presets/schemas/formula.schema.json` | Formula grammar |
| `core/modulation/planner/formula-validator.js` | Validator with depth enforcement |
| `core/modulation/processors/compose-formula.js` | `compose.formula.v1` bus processor |
| `ui/src/features/mysticHolistics/hero/roleDispatcher.ts` | Role-drawer registry |
| `ui/src/features/mysticHolistics/hero/roleDrawers.ts` | Built-in drawers |

---

## Appendix D — Naming Note

The name *Scholomance Fairly Odd Wand* is a deliberate riff on the children's-television trope: a wand that grants wishes within rules. The system is named to remind contributors that authoring is a bounded magic.
