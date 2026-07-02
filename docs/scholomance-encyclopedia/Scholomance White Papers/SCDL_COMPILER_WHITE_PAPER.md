# SCDL Compiler and Language White Paper and Instruction Manual

**Date:** 2026-07-02  
**Applies To:** Scholomance Coordinate Description Language (SCDL), SCDL-AST-v1 JSON contract, compile pass pipeline, SymmetryAMP integration, Phaser/SVG/JSON exporters, SCD64 diagnostics, CLI utilities  
**Implementation PDR:** [`scdl-v1-pdr.md`](../PDR-archive/scdl-v1-pdr.md)  
**Implementation PIR:** [`PIR-20260702-SCDL-COMPILER.md`](../post-implementation-reports/PIR-20260702-SCDL-COMPILER.md)

---

## 1. Purpose

PixelBrain assets were historically defined using manual JavaScript declarations, hardcoded coordinate arrays, or complex procedural math. This made authoring new assets difficult for designers, and completely bypassed the SCD64 diagnostic immune system during the authoring stage.

SCDL (Scholomance Coordinate Description Language) introduces a **human-legible declarative language** designed to compile human-authored coordinates and geometry rules into canonical, immutable `PixelBrainAssetPacket` structures. 

This white paper details:
- The grammar, tokenizer, and recursive-descent parser.
- The 7-pass functional compiler pipeline.
- How SymmetryAMP (Symmetry Accelerated Microprocessor) is leveraged to mirror coordinates.
- How `PB-ERR-v1` bytecode diagnostics are mapped.
- Exporter integration (SVG, Phaser configs, JSON).
- Node.js CLI usage.
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
        ▼ (Pass 2: resolveColorsPass)
Hex-Resolved Palette AST
        │
        ▼ (Pass 3: resolveMaterialsPass)
Material-Registry Validated AST
        │
        ▼ (Pass 4: expandSymmetryPass ──► SymmetryAMP)
Mirrored Coordinates AST
        │
        ▼ (Pass 5: expandCellsPass)
Flat Coordinate Coordinates AST
        │
        ▼ (Pass 6: emitPacketPass)
PixelBrainAssetPacket (immutable core packet)
        │
        ▼ (Pass 7: emitDiagnosticsPass ──► PB-ERR-v1 Bytecode)
CompileResult { ok, ast, packet, errors, diagnostics }
        │
        ├──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
   JSON Exporter          SVG Exporter         Phaser Exporter
```

This strict layout guarantees that raw source code is parsed in a pure, side-effect-free environment, compiling into standard intermediate structures before reaching the runtime engines.

---

## 3. The SCDL-v1 Grammar

SCDL-v1 is designed to be concise and readable. The grammar defines asset metadata, a global palette block, part configurations, geometry rules, and export targets.

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

symmetry_op   ::= 'symmetry' ( 'x' | 'y' | 'xy' )
trace_op      ::= 'trace' 'outline' 'from' 'image.region' '(' STRING ')'
fill_op       ::= 'fill' COLOR_REF
rim_op        ::= 'rim' COLOR_REF 'at' COMPASS
cell_op       ::= 'cell' INTEGER INTEGER COLOR_REF
glow_op       ::= 'glow' 'radius' INTEGER

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

---

## 4. AST JSON Contract (`SCDL-AST-v1`)

The parser transforms the source text into a structured JSON AST carrying a `contract` identifier and source checksum (sha256).

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

The compiler (`scdl.compiler.js`) runs a sequence of pure functions to transform the AST into a `PixelBrainAssetPacket` and generate diagnostic metadata.

| Pass Name | Responsibility |
|:---|:---|
| **`validatePass`** | Asserts schema correctness. Checks for missing assets, non-positive canvas dimensions, duplicate part IDs, and unrecognized keywords. |
| **`resolveColorsPass`** | Evaluates all palette aliases (`void0`) against the palette block, translating them into literal `#RRGGBB` hex strings. Asserts hex color pattern matching. |
| **`resolveMaterialsPass`** | Validates part materials against the system's `material-registry.js`. Emits warnings for unrecognized materials and normalizes them. |
| **`expandSymmetryPass`** | Translates symmetry axis tags (`x`, `y`, `xy`) to `SymmetryAMP` types (`vertical`, `horizontal`, `radial`). Generates mirror coordinate pairs and drops the symmetry op. |
| **`expandCellsPass`** | Expands geometric operations (rim bounds, cell coordinate offsets, fill intents) to flat coordinate lists. Captures glows and traces as descriptor intents. |
| **`emitPacketPass`** | Invokes `createPixelBrainAssetPacket` from `pixelbrain-asset-packet.js` to build the final immutable resource. |
| **`emitDiagnosticsPass`** | Evaluates all compiled warnings/errors, translating them to `DiagnosticReport` schemas. |

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

### 6.2 Bytecode Encoding Layout

The bytecode generated by the compiler matches the canonical error structure:
```text
PB-ERR-v1-{CATEGORY}-{SEVERITY}-ARTIFA-{HEX_CODE}-{BASE64_CONTEXT}-{CHECKSUM}
```
*Note: `ARTIFA` represents the `ARTIFACT` module ID range (`0x1000–0x10FF`) dedicated to compiler and validation tools.*

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
  
  // Export to Phaser format
  const exports = exportSCDL(result.packet, ['phaser'], result.ast);
  const phaserConfig = JSON.parse(exports.phaser.output);
  console.log(phaserConfig.pixels);
}
```

### 9.2 Integrating SCDL with Vitest
SCDL unit tests must reside in `tests/codex/core/pixelbrain/scdl/` to be detected by the project's Vitest runner. Run the test suite:
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
