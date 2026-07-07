# PixelBrain Semantics Bridge (PB-SEM) White Paper

**Audience:** System Architects, Vaelrix Agents, CODEx Pipeline Engineers, Core Render Programmers
**Scope:** PB-SEM v1.0 (PixelBrain Semantics Bridge), SemQuant / ARTIFACT Integrations
**Search anchor:** `SCHOL-ENC-BYKE-SEARCH-PB-SEM`

---

## 1. The Disparity Problem

Before the introduction of the Semantics Bridge, the Scholomance generative ecosystem suffered from a systemic dialect problem. The three major pillars of generation spoke fundamentally different languages:

1. **Authoring Interfaces (SCDL / Foundries):** Dealt in explicit coordinates, material IDs, and local aliases (e.g., `robeshade`, `core`, `torso`).
2. **NLU (Natural Language Understanding) Generation:** Output broad semantic requests based on player text prompts (e.g., "create a dark chestplate").
3. **Pixel Pipelines & Rendering:** Required rigid, typed anatomical constants and chromatic shader instructions (e.g., `AnatomySpecies.HUMANOID`, `transmuteMaterialColor`).

This disparity forced the codebase to rely on fragile, highly conditional "glue code". Pipelines were bloated with brittle mappings such as `if (role === 'torso' || role === 'body' || role === 'chest') { ... }`. 

As the asset catalog grew, maintaining this multi-dialect translation became computationally and structurally untenable.

---

## 2. The PB-SEM Architecture & Compilation Pipeline

The **PixelBrain Semantics Bridge (PB-SEM)** is a unified, deterministic contract designed to reconcile this disparity. It acts as the shared connective tissue (defined in `semantic-registry.js`) for role, part, and effect classification. 

When an asset is compiled (e.g., via the SCDL compiler), it undergoes the **SemQuant / PB-Semantics thin slice** pass. 

### 2.1 The `_applySemQuant` Pipeline
During SCDL compilation (`scdl.compiler.js`), after basic geometry expansion but before packet emission, the compiler executes `_applySemQuant`:
1. **AST to IR Conversion:** The AST is converted into a Semantic Intermediate Representation (`scdlAstToIR`).
2. **Unifier Pass:** The `semanticUnifierPass` analyzes the IR to validate roles, materials, and effects against the `semantic-registry.js`.
3. **Bytecode Adapter:** Semantic diagnostics are encoded using `createSemanticDiagnostic()` into `PB-ERR-v1` bytecode strings. This ensures PB-SEM issues are perfectly visible to the shared decode/recovery tooling used by every other PixelBrain error.
4. **AST Re-annotation:** The validated semantic annotations and provenance data are attached back to the AST to feed into the final `PixelBrainAssetPacket`.

Because this is a non-destructive pass, semantic failures never fatally break compilation; they are gracefully logged (or downgraded to `PB-SEM-000` info).

---

## 3. The Core Registries & Mechanics

### 3.1 Canonical Roles & Alias Resolution
PB-SEM deprecates fuzzy string matching in favor of the `CanonicalRoles` enumeration. The system exports a strict `resolveRole(raw)` normalizer.

When a part is tagged with a role (e.g., `hull`, `blob`, `torso`), the registry normalizes it, strips special characters, and maps it strictly to its canonical counterpart:
- `torso`, `hull`, `blob`, `mass` $\rightarrow$ **`body`**
- `outline`, `border`, `edge` $\rightarrow$ **`rim`**
- `shine`, `specular`, `glint` $\rightarrow$ **`highlight`**
- `shade`, `darkside` $\rightarrow$ **`shadow`**
- `glow`, `field` $\rightarrow$ **`aura`**
- `guide`, `00_reference` $\rightarrow$ **`constructionGuide`**

This completely eliminates conditional logic downstream. Pipelines only ever need to check for `isBody`, `isRim`, `isAura`, etc., via the `getSemanticMeta()` utility.

### 3.2 Anatomy Skeleton Validation
This canonical vocabulary directly powers construction logic (e.g., `item-foundry.js` and `armor-factory.js`). When `validateSkeletonCompleteness(AnatomySpecies.HUMANOID, skeleton)` is called, it relies on these strictly bound PB-SEM roles (like `headTop`) rather than guessing author intent.

### 3.3 Material Transmutation (`transmuteMaterialColor`)
SCDL no longer dictates final, hard-coded pixel values that break across environments. It provides geometry and *semantic intent* tied to a material ID (e.g., `icy_fire`, `voidsteel`). Downstream, the renderer passes these coordinates through `transmuteMaterialColor()`, which applies deterministic chromatic rules (e.g., `forceColdHue`, `boostHighlightsToWhite`, `deepenLowValuesToBlack`). 

PB-SEM binds these effects and materials together semantically, ensuring that an authored role properly accepts the assigned material transmutation.

---

## 4. Diagnostic Bytecode Reference

To guarantee **Vaelrix Law Compatibility**, PB-SEM errors are mapped into the ARTIFACT module space (`0x1000–0x10FF`), specifically claiming the `0x1080–0x108F` block. 

When the Semantic pass flags an anomaly, it yields a specific diagnostic code. These are encoded directly into bytecode via `semanticDiagnosticToBytecode(diag)`.

| Code | Hex Bytecode | Name | Trigger Condition / Meaning |
|---|---|---|---|
| **PB-SEM-000** | `0x1080` | Internal/Unclassified | A semantic parsing internal error or downgraded failure. |
| **PB-SEM-001** | `0x1081` | `UNKNOWN_ROLE` | A part declared a semantic role that does not exist in `CanonicalRoles` and has no mapped alias. |
| **PB-SEM-002** | `0x1082` | `AMBIGUOUS_ROLE` | (Enforced in boolean logic/merges). Generated when operations like unions result in conflicting semantic roles. |
| **PB-SEM-003** | `0x1083` | `MISSING_MATERIAL_BINDING` | An effect (like `glow radius N`) is authored without an emissive/appropriate material to bind to (e.g. glowing without `cyan_glow` or `void_rune_glow`). |
| **PB-SEM-004** | `0x1084` | `INVALID_EFFECT_TARGET` | An effect attempts to target a part or anatomical anchor that logically rejects it based on canonical constraints. |
| **PB-SEM-005** | `0x1085` | `PROVENANCE_LOSS` | Emitted when geometry operations (like complex unions) lose track of their original semantic/part lineage. |

---

## 5. Summary of Engineering Impact

The implementation of PB-SEM yields massive architectural dividends:

1. **Elimination of Brittle Logic:** Hundreds of lines of string-matching conditional logic are gone.
2. **Bytecode Recovery:** Because semantic diagnostics map to standard `PB-ERR-v1` bytecode strings, automated AI healers (like TrueSight and the Inquisitors) can read semantic failures using the same logic they use for missing assets or fatal parse errors.
3. **Infinite Scaling:** As new materials, body plans, and spell effects are added to the Scholomance ecosystem, they simply register their aliases to canonical categories in `semantic-registry.js`. No generation pipelines need to be modified.

PB-SEM ensures that as PixelBrain's generative capabilities expand, the core intelligence driving it remains completely deterministic, unified, and unbreakable.
