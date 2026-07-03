# SCDL Compiler and Language White Paper and Instruction Manual

**Date:** 2026-07-02 (Updated with PB-Semantics integration)  
**Applies To:** Scholomance Coordinate Description Language (SCDL), SCDL-AST-v1 JSON contract, PB-Semantics / SemQuant unification layer, compile pass pipeline, SymmetryAMP integration, Phaser/SVG/JSON exporters, SCD64 + PB-SEM diagnostics, CLI utilities  
**Implementation PDR:** [`scdl-v1-pdr.md`](../PDR-archive/scdl-v1-pdr.md)  
**Implementation PIR:** [`PIR-20260702-SCDL-COMPILER.md`](../post-implementation-reports/PIR-20260702-SCDL-COMPILER.md), [`PIR-20260702-PB-SEMANTICS-SEMQUANT.md`](../post-implementation-reports/PIR-20260702-PB-SEMANTICS-SEMQUANT.md)

---

## 1. Purpose

PixelBrain assets were historically defined using manual JavaScript declarations, hardcoded coordinate arrays, or complex procedural math. This made authoring new assets difficult for designers, and completely bypassed the SCD64 diagnostic immune system during the authoring stage.

SCDL (Scholomance Coordinate Description Language) introduces a **human-legible declarative language** designed to compile human-authored coordinates and geometry rules into canonical, immutable `PixelBrainAssetPacket` structures. 

SCDL is the primary consumer of the **PB-Semantics (SemQuant)** layer, which performs semantic annotation and type unification before the deterministic lowering passes. This ensures roles, parts, materials, effects, and construction guides are resolved into a shared vocabulary regardless of authoring origin.

This white paper details:
- The grammar, tokenizer, and recursive-descent parser (with semantic metadata and full vector op support).
- The compiler pass pipeline (including SemQuant unification and vector lowering).
- How SymmetryAMP (Symmetry Accelerated Microprocessor) is leveraged to mirror coordinates.
- How `PB-ERR-v1` and `PB-SEM-*` bytecode diagnostics are mapped.
- Exporter integration (SVG, Phaser configs, JSON).
- Node.js CLI usage.
- Semantic integration via `semantic-unifier`, `semantic-registry`, and `semantic-bridge`.
- Practical tutorials and a detailed troubleshooting guide.

---

## 2. System Map

The compilation and code flow runs through the following pipeline stages:

```text
SCDL Source Text (.scdl)
        │
        ▼ (Tokenizer / _tokenizeFull)
Tokens Array
        │
        ▼ (Recursive-Descent Parser / parseSCDL)
SCDL-AST-v1 JSON AST
        │
        ▼ (Pass 1: validatePass)
Syntax-Checked AST
        │
        ▼ (Pass 2: semanticUnifierPass)
Semantically Annotated AST
(with roles, parts, effects, provenance via semantic-bridge + semantic-registry)
        │
        ▼ (Pass 3: resolveColorsPass)
Hex-Resolved Palette AST
        │
        ▼ (Pass 4: resolveMaterialsPass)
Material-Registry Validated AST
        │
        ▼ (Pass 5: expandVectorPass)
Vector Ops Lowered to Cells
(circle/ring/rect/polygon/path/sphere → cell ops, preserving semantic metadata)
        │
        ▼ (Pass 6: expandSymmetryPass ──► SymmetryAMP)
Mirrored Coordinates AST
        │
        ▼ (Pass 7: expandCellsPass)
Flat Coordinates AST
        │
        ▼ (Pass 8: emitPacketPass)
PixelBrainAssetPacket (immutable core packet)
        │
        ▼ (Pass 9: emitDiagnosticsPass ──► PB-ERR-v1 + PB-SEM Bytecode)
CompileResult { ok, ast, packet, errors, diagnostics }
        │
        ├──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
   JSON Exporter          SVG Exporter         Phaser Exporter
```

This strict layout guarantees that raw source code is parsed in a pure, side-effect-free environment, compiling into standard intermediate structures before reaching the runtime engines.

The semantic unifier (Pass 2) is the only non-geometry pass; it is responsible solely for meaning resolution and never mutates coordinate values.

---

## 3. The SCDL-v1 Grammar

SCDL-v1 is designed to be concise and readable. The grammar defines asset metadata, a global palette block, part configurations, geometry rules, and export targets.

Parser output nodes now include stable `id` and `sourceSpan` metadata. Parts and ops may carry optional semantic hints (`role`, `partId`) that are resolved by the SemQuant layer.

### 3.1 Formal Grammar Definition

```ebnf
program       ::= asset_decl palette_block? part_block* export_decl?

asset_decl    ::= 'asset' NAME 'canvas' DIMENSION
DIMENSION     ::= INTEGER 'x' INTEGER
NAME          ::= [a-zA-Z_][a-zA-Z0-9_]*

palette_block ::= 'palette' '{' color_entry* '}'
color_entry   ::= NAME '=' HEX_COLOR

part_block    ::= 'part' IDENT 'material' IDENT '{' part_op* '}'
part_op       ::= symmetry_op
               | trace_op
               | fill_op
               | rim_op
               | cell_op
               | glow_op
               | circle_op
               | ring_op
               | rect_op
               | polygon_op
               | path_op
               | sphere_op

symmetry_op   ::= 'symmetry' ( 'x' | 'y' | 'xy' )
trace_op      ::= 'trace' 'outline' 'from' 'image.region' '(' STRING ')'
fill_op       ::= 'fill' COLOR_REF
rim_op        ::= 'rim' COLOR_REF 'at' COMPASS
cell_op       ::= 'cell' INTEGER INTEGER COLOR_REF
glow_op       ::= 'glow' 'radius' INTEGER

circle_op     ::= 'circle' NUMBER NUMBER 'radius' NUMBER COLOR_REF
ring_op       ::= 'ring' NUMBER NUMBER 'radius' NUMBER 'width' NUMBER COLOR_REF
rect_op       ::= 'rect' NUMBER NUMBER NUMBER NUMBER COLOR_REF
polygon_op    ::= 'polygon' point_list COLOR_REF
path_op       ::= 'path' STRING COLOR_REF
sphere_op     ::= 'sphere' NUMBER NUMBER 'radius' NUMBER
                  'light' NUMBER NUMBER
                  COLOR_REF COLOR_REF COLOR_REF COLOR_REF COLOR_REF

NUMBER        ::= SIGN? DIGIT+ ('.' DIGIT+)?
SIGN          ::= '+' | '-'
DIGIT         ::= [0-9]
point_list    ::= point (point)*
point         ::= NUMBER NUMBER

COLOR_REF     ::= HEX_COLOR | NAME
COMPASS       ::= 'north' | 'south' | 'east' | 'west'
               | 'north' 'west' | 'north' 'east'
               | 'south' 'west' | 'south' 'east'
HEX_COLOR     ::= '#' [0-9A-Fa-f]{6}
```

### 3.2 Canonical Example

```
# void_chestplate.scdl
asset void_chestplate canvas 64x64

palette {
  void0 = #05060D
  gold2 = #D8B84C
  cyan2 = #00E5FF
}

part torso material voidsteel {
  symmetry x
  trace outline from image.region("body")
  fill void0
  rim gold2 at north west
}

part gem material cyan_glow {
  cell 31 18 cyan2
  glow radius 2
}

export json svg phaser
```

### 3.3 Vector + SemQuant Example (crimson_ooze_sphere)

This example demonstrates the current capabilities: vector authoring + semantic metadata propagation.

```
# crimson_ooze_sphere.scdl
asset crimson_ooze canvas 24x24

palette {
  shine  = #ff9aaa
  core   = #b51d32
  rim    = #571020
  shadow = #260711
}

part body material slime {
  sphere 11.5 11.5 radius 10 light -1 -1 shine core core rim shadow
  glow radius 2
}

export json svg phaser
```

After `expandVectorPass` + SemQuant, emitted cells carry provenance and role:

```json
{
  "x": 12,
  "y": 12,
  "color": "#b51d32",
  "partId": "body",
  "role": "body",
  "semanticRole": "body",
  "sourceOpId": "scdl:body:0:sphere",
  "material": "slime"
}
```

This is the recommended modern authoring style for complex radial and shaded assets.

---

## 4. AST JSON Contract (`SCDL-AST-v1`)

The parser transforms the source text into a structured JSON AST carrying a `contract` identifier and source checksum (sha256).

After the SemQuant pass, nodes carry additional semantic metadata:
- `id`
- `sourceSpan`
- `annotations` (array of `{domain, semanticType, canonicalType, confidence, sourceRefs}`)
- `role` / `partId` (when declared or inferred)

These are propagated downstream into packet coordinates.

```json
{
  "contract": "SCDL-AST-v1",
  "version": "1.0.0",
  "checksum": "000000000514b500",
  "asset": "void_chestplate",
  "type": "void_chestplate",
  "canvas": {
    "width": 64,
    "height": 64
  },
  "palette": {
    "void0": "#05060D",
    "gold2": "#D8B84C",
    "cyan2": "#00E5FF"
  },
  "parts": [
    {
      "id": "torso",
      "material": "voidsteel",
      "ops": [
        { "op": "symmetry", "axis": "x" },
        { "op": "trace", "source": "image.region.body", "intent": true },
        { "op": "fill", "colorRef": { "kind": "alias", "value": "void0" } },
        { "op": "rim", "colorRef": { "kind": "alias", "value": "gold2" }, "compass": "north west" }
      ]
    }
  ],
  "exports": ["json", "svg", "phaser"]
}
```

---

## 5. Compiler Pass Pipeline

The compiler (`scdl.compiler.js`) runs a sequence of 9 pure functions to transform the AST into a `PixelBrainAssetPacket` and generate diagnostic metadata.

| Pass Name | Responsibility |
|:---|:---|
| **Pass 1: `validatePass`** | Asserts schema correctness. Checks for missing assets, non-positive canvas dimensions, duplicate part IDs, and unrecognized keywords. |
| **Pass 2: `semanticUnifierPass`** (SemQuant) | Performs semantic annotation and type unification via `semantic-bridge.js` and `semantic-registry.js`. Resolves roles, parts, effects, materials, and construction guides into canonical form. Attaches `annotations`, `sourceOpId`, provenance, and lowering history. Emits PB-SEM diagnostics. |
| **Pass 3: `resolveColorsPass`** | Evaluates all palette aliases (`void0`) against the palette block, translating them into literal `#RRGGBB` hex strings. Asserts hex color pattern matching. |
| **Pass 4: `resolveMaterialsPass`** | Validates part materials against the system's `material-registry.js`. Emits warnings for unrecognized materials and normalizes them. |
| **Pass 5: `expandVectorPass`** | Lowers vector ops (circle, ring, rect, polygon, path, sphere) into deterministic cell ops while preserving partId, role, semanticRole, sourceOpId, and material context. Runs before symmetry so mirrored geometry operates on canonical cells. |
| **Pass 6: `expandSymmetryPass`** | Translates symmetry axis tags (`x`, `y`, `xy`) to `SymmetryAMP` types (`vertical`, `horizontal`, `radial`). Generates mirror coordinate pairs and drops the symmetry op. |
| **Pass 7: `expandCellsPass`** | Expands geometric operations (rim bounds, cell coordinate offsets, fill intents) to flat coordinate lists. Captures glows and traces as descriptor intents. Propagates semantic metadata (`role`, `partId`, `sourceOpId`) to coordinates. |
| **Pass 8: `emitPacketPass`** | Invokes `createPixelBrainAssetPacket` from `pixelbrain-asset-packet.js` to build the final immutable resource. Semantic fields are preserved on coordinates. |
| **Pass 9: `emitDiagnosticsPass`** | Evaluates all compiled warnings/errors (including PB-SEM), translating them to `DiagnosticReport` schemas. |

---

## 5.5 Semantic Unification (SemQuant Integration)

SCDL is the primary surface for **PB-Semantics (SemQuant)**.

After `validatePass`, the compiler runs `semanticUnifierPass` (via `semantic-bridge.js`):

```js
const ir = scdlAstToIR(ast);
const unified = semanticUnifierPass(ir);
// annotations, roles, sourceOpId, loweringSteps are attached back to AST ops/parts
```

Key artifacts:
- `semantic-registry.js` — canonical `CanonicalRoles`, `ROLE_ALIASES`, `resolveRole()`
- `semantic-unifier.js` — deterministic inference + PB-SEM diagnostics
- `semantic-bridge.js` — `applyAuthoringSemantics()`, `enrichPacketWithSemantics()`

Coordinates emitted by `expandCellsPass` and the final packet carry:
- `partId`
- `role` / `semanticRole`
- `sourceOpId`
- (when available) semantic annotations

This guarantees that higher-level authoring intent survives all the way to `PixelBrainAssetPacket.geometry.coordinates`.

See also:
- `codex/core/pixelbrain/semantic/`
- `PIR-20260702-PB-SEMANTICS-SEMQUANT.md`

---

## 5.6 Packet Identity and Semantic Metadata

Geometry identity (and thus the stable `packet.id`) is determined exclusively by render-authoritative coordinate fields: `x`, `y`, `color`, and any fields that directly affect the visual lattice.

Semantic metadata such as `sourceOpId`, `semanticRole`, `annotations`, `provenance`, and lowering history is **additive**. It is attached to coordinates for traceability and higher-level tooling but:

- Does **not** affect the geometry hash used for packet identity.
- Does **not** affect exporter output equality for deterministic assets (JSON, SVG, PNG, Phaser) unless semantic metadata is explicitly included in the export target.
- Does **not** change golden fixture behavior or regression seeds.

If a consumer needs to differentiate assets based on authoring provenance, it should use a separate `semanticHash` or inspect the `provenance` / annotations directly rather than relying on the core packet ID.

This policy ensures that pure semantic-only changes (e.g. richer provenance or role labels) do not invalidate existing deterministic outputs or caches.

---

## 6. Bytecode Error & Diagnostic Registry

In alignment with Vaelrix Law 8, compile errors must emit `PB-ERR-v1` bytecode payloads. The SCDL compiler maps language issues to distinct numeric sub-codes.

### 6.1 SCDL Error Catalogue

| Sub-code | Label | Severity | Category | Description |
|:---|:---|:---|:---|:---|
| `0x1001` | `SCDL-001` | ERROR | `STATE` | Unknown op verb or unrecognized keyword. |
| `0x1002` | `SCDL-002` | ERROR | `STATE` | Missing the mandatory `asset` header declaration. |
| `0x1003` | `SCDL-003` | ERROR | `VALUE` | Canvas size format is malformed or non-positive. |
| `0x1004` | `SCDL-004` | ERROR | `COLOR` | Hex literal does not match the strict `#RRGGBB` pattern. |
| `0x1005` | `SCDL-005` | WARN | `VALUE` | Unrecognized material (warns and defaults to `'source'`). |
| `0x1006` | `SCDL-006` | ERROR | `VALUE` | Referenced palette alias was not defined in `palette {}`. |
| `0x1007` | `SCDL-007` | ERROR | `COORD` | Declared coordinate falls outside the canvas boundary. |
| `0x1008` | `SCDL-008` | INFO | `STATE` | Image region trace intent preserved for runtime evaluation. |
| `0x1009` | `SCDL-009` | ERROR | `VALUE` | Duplicate part ID declared in the same asset scope. |
| `0x100A` | `SCDL-010` | WARN | `VALUE` | Unrecognized export target (warns and ignores). |
| `0x100B` | `SCDL-011` | ERROR | `VALUE` | Invalid vector op parameters (e.g. negative radius, malformed path, invalid light vector, or unsupported payload). |

In addition, the SemQuant layer (integrated after validatePass) emits `PB-SEM-*` diagnostics for semantic issues:

| Code | Label | Severity | Description |
|:---|:---|:---|:---|
| `PB-SEM-001` | UNKNOWN_ROLE | WARN | Role could not be resolved to a canonical value. |
| `PB-SEM-002` | AMBIGUOUS_ROLE | WARN | Multiple conflicting role interpretations detected. |
| `PB-SEM-003` | MISSING_MATERIAL_BINDING | WARN | Effect (e.g. glow) has no material binding. |
| `PB-SEM-004` | INVALID_EFFECT_TARGET | ERROR | Effect targets an invalid or missing part/role. |
| `PB-SEM-005` | PROVENANCE_LOSS | WARN | Semantic provenance or source reference was lost during lowering. |

### 6.2 Bytecode Encoding Layout

The SCDL compiler emits `PB-ERR-v1` bytecode. The SemQuant semantic unifier emits `PB-SEM-*` diagnostics that integrate into the same reporting system:

```text
PB-ERR-v1-{CATEGORY}-{SEVERITY}-ARTIFA-{HEX_CODE}-{BASE64_CONTEXT}-{CHECKSUM}
PB-SEM-{CODE}-{SEVERITY}-{CONTEXT}
```

*Note: `ARTIFA` represents the `ARTIFACT` module ID range (`0x1000–0x10FF`) dedicated to compiler and validation tools. Semantic diagnostics are produced by the `semantic-unifier` pass and `semantic-bridge.js`.*

---

## 7. Exporter Implementations

The `scdl.exporters.js` library translates a compiled `PixelBrainAssetPacket` into target-specific configurations.

### 7.1 JSON Exporter
Produces the fully hydrated standard `pixelbrain.asset.v1` lattice JSON representation.

### 7.2 SVG Exporter
Draws crisp pixel grids using SVG `<rect>` primitives matching the coordinates:
```xml
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" shape-rendering="crispEdges">
  <rect x="31" y="18" width="1" height="1" fill="#00E5FF"/>
  <rect x="32" y="18" width="1" height="1" fill="#00E5FF"/>
</svg>
```

### 7.3 Phaser Exporter
Generates a texture config JSON format for direct loader consumption. Colors are translated to **32-bit integers** (`(r << 16) | (g << 8) | b`) to allow instant graphics rendering.
```json
{
  "type": "scdl-phaser-v1",
  "key": "void_chestplate",
  "canvas": { "width": 64, "height": 64 },
  "pixels": [
    { "x": 31, "y": 18, "color": 58879 }
  ],
  "parts": [
    { "id": "torso", "material": "voidsteel" }
  ]
}
```

---

## 8. CLI Command Manual

The Node.js CLI utility is located at `codex/core/pixelbrain/scdl/scdl.cli.js`.

### 8.1 Compilation
Compile an SCDL file and generate target files (defaults to `.json`):
```bash
node codex/core/pixelbrain/scdl/scdl.cli.js compile fixtures/void_chestplate.scdl --export json,svg,phaser
```

### 8.2 Parsing to AST
Generate the raw parsed AST for diagnostic inspection:
```bash
node codex/core/pixelbrain/scdl/scdl.cli.js parse fixtures/void_chestplate.scdl --out ast.json
```

### 8.3 Checking Diagnostics
Runs the compilation pass pipeline, validating syntax, colors, and bounds without generating output files:
```bash
node codex/core/pixelbrain/scdl/scdl.cli.js check fixtures/void_chestplate.scdl
```

---

## 9. Developer Instruction Manual

### 9.1 Compiling SCDL Programmatically
To compile SCDL inside application code or scripts:
```js
import { compileSCDL, exportSCDL } from './codex/core/pixelbrain/scdl/index.js';

const source = `
  asset helm canvas 16x16
  palette { dark = #101010 }
  part base material voidsteel {
    cell 8 8 dark
  }
`;

const result = compileSCDL(source);
if (!result.ok) {
  console.error("Compilation errors:", result.errors);
} else {
  console.log("Stably derived packet ID:", result.packet.id);
  
  // Semantic annotations are attached to AST nodes (role, partId, annotations)
  const bodyPart = result.ast.parts.find(p => p.id === 'base');
  console.log("Semantic role:", bodyPart?.semantic?.annotations);

  // Export to Phaser format
  const exports = exportSCDL(result.packet, ['phaser'], result.ast);
  const phaserConfig = JSON.parse(exports.phaser.output);
  console.log(phaserConfig.pixels);
}
```

Semantic data (roles, effects, provenance) is also available via the shared registry:
```js
import { resolveRole, CanonicalRoles, getSemanticMeta } from './codex/core/pixelbrain/semantic-registry.js';
import { applyAuthoringSemantics } from './codex/core/pixelbrain/semantic-bridge.js';
```

### 9.2 Integrating SCDL with Vitest
SCDL unit tests must reside in `tests/codex/core/pixelbrain/scdl/` to be detected by the project's Vitest runner. Semantic unification tests live in `scdl.semquant.test.js`.

Run the test suite:
```bash
npx vitest run tests/codex/core/pixelbrain/scdl/
```

---

## 10. Troubleshooting

### 10.1 Parser Loop (Infinite Compilation Hangups)
* **Problem:** If a syntax error is introduced (e.g. inside a block), the compiler process hangs or hits a maximum call stack/CPU spike.
* **Cause:** The parser loop fails to advance the cursor position when it cannot parse a valid statement.
* **Solution:** Inspect `scdl.grammar.js`. Ensure all loops (such as the `parsePalette` loop) contain an `else` branch consuming the offending token (`consume()`) to guarantee parser progress.

### 10.2 Disambiguation of Hex Colors vs Comments
* **Problem:** A palette hex color literal like `#05060D` is ignored or reported as an empty statement, throwing a syntax error.
* **Cause:** The tokenizer matches the `#` character as a comment block first and consumes the color literal as a comment line.
* **Solution:** Lookahead is required. The tokenizer must check if a `#` is followed by exactly 6 hex characters and a non-hex character boundary. If true, it must emit a `HEX` token; otherwise, treat it as a line comment.

### 10.3 Inverted Asset Headers
* **Problem:** The compiled JSON shows `"asset": "canvas"`, and compilation throws warning `Expected 'canvas' keyword after asset name`.
* **Cause:** The parser's `parseAsset` statement attempts to consume two identifiers (name + type) rather than a single name identifier followed by the `'canvas'` keyword.
* **Solution:** Fix `parseAsset` to consume exactly one name identifier, then check `atValue('canvas')` before parsing canvas dimensions.

### 10.4 Symmetry Output Offsets
* **Problem:** Symmetric coordinates are emitted out of bounds or translated incorrectly.
* **Cause:** Using standard index arithmetic without grid limits, causing coordinates to map past the canvas width/height.
* **Solution:** Verify `expandSymmetryPass`. Ensure coordinate mirror math clamps column/row translations within `[0, cols - 1]` and `[0, rows - 1]`.
