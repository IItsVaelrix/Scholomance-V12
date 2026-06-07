# PIXELBRAIN CUSTOM SHADER FORGE: THE PORTABLE RENDER CONTRACT
## Technical White Paper on the PB-SHADER-v1 Bytecode Specification

## Bytecode Search Code
`SCHOL-ENC-BYKE-SEARCH-WP-SHADER-FORGE`

> "To paint a canvas is to cast a spell; the pixels are the runes, the uniforms are the resonance, and the rendering is the release." — *The Scholomance Canvas Synthesis Mandate*

---

## Table of Contents

1. [Architectural Intent & Philosophy](#1-architectural-intent--philosophy)
2. [The PB-SHADER-v1 Packet Specification](#2-the-pb-shader-v1-packet-specification)
3. [Uniform Resolution Layer & Dot-Notation Mapping](#3-uniform-resolution-layer--dot-notation-mapping)
4. [Diagnostics & Compile-Time Error Mapping](#4-diagnostics--compile-time-error-mapping)
5. [WebGL Sandbox & Context Lost Lifecycle](#5-webgl-sandbox--context-lost-lifecycle)
6. [Exporters: Cross-Platform Targets](#6-exporters-cross-platform-targets)
7. [Testing and Determinism Verification](#7-testing-and-determinism-verification)
8. [Future Work: Extension Registry Integration](#8-future-work-extension-registry-integration)

---

## 1. ARCHITECTURAL INTENT & PHILOSOPHY

### 1.1 The Limitations of Flat Assets
Before the introduction of the Shader Forge, the PixelBrain asset pipeline was strictly limited to static pixel art textures and mathematical grid coordinate stencils. Assets lacked dynamic, context-aware visual effects such as void ripples, spelling glows, or heat distortions that could react to spellcasting parameters (e.g., school index, resonance, vowel density) in real time.

Integrating dynamic rendering engine bindings directly into UI view elements creates tight coupling, rendering engine drift, and untestable code. If a shader's mathematical structure is defined in a browser-bound view file, it cannot be easily ported to other deployment runtimes, such as a client native game engine.

### 1.2 The Sovereign Contract Principle
To solve this coupling, the PixelBrain custom shader system introduces the **Sovereign Contract Principle**. A shader is not treated as a rendering program, but as an immutable bytecode packet configuration (`PB-SHADER-v1`). 

Under this model:
- The core shader logic is defined within a mathematical contract containing fragment source code and metadata.
- Rendering adapters interpret this packet client-side to render local WebGL canvas previews.
- Compilation exporters translate the packet format into target-specific scripts (such as Godot `.gdshader` files and Phaser 4 WebGL pipelines) without translation drift.

```
                  ┌──────────────────────────────┐
                  │   PB-SHADER-v1 Packet        │
                  │   (Fragment GLSL + Uniforms) │
                  └──────────────┬───────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ WebGL Sandbox   │     │ Godot Exporter  │     │ Phaser Exporter │
│ (Browser Canvas)│     │ (.gdshader File)│     │ (PostFX Class)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 1.3 Absolute-Time Clock Determinism
To satisfy the stasis requirements of the Scholomance engine, animation shaders must be deterministic. If a shader relies on `performance.now()` or the browser's local timestamp within its animation frame loop, it will drift during clock pauses or stasis promotions. 

To guarantee determinism, all animation shaders bind their time uniform (`u_time`) directly to the spelling engine's authoritative timeline clock. When the simulation clock pauses, the animation freezes; when the simulation jumps or accelerates, the shader's clock follows proportionally, maintaining sync across client sessions.

---

## 2. THE PB-SHADER-v1 PACKET SPECIFICATION

### 2.1 Packet Schema
The core of the system is the shader packet, defined and validated in [shader-packet.js](file:///home/deck/Desktop/Scholomance-V12-main/codex/core/pixelbrain/shader-packet.js). A valid `PB-SHADER-v1` packet has the following structural contract:

```typescript
interface ShaderPacket {
  contract: 'PB-SHADER-v1';
  id: string;                 // Unique camelCase identifier
  label: string;              // Human-readable asset label
  dialect: 'glsl-es-300';     // GLSL dialect configuration
  target: 'fragment';         // Shader compilation target
  canvas: {
    width: number;            // Viewport width boundary
    height: number;           // Viewport height boundary
  };
  fragmentSource: string;     // GLSL user-authored source code
  uniforms: Record<string, UniformConfig>; // Declarative uniform mappings
  deterministicSeed: number;  // Seed for random calculations
}

interface UniformConfig {
  type: 'float' | 'int' | 'vec2' | 'vec3';
  source?: string;            // Dot-notation state resolver path
  default: number | number[] | string;
}
```

### 2.2 Schema Validation
When packets are loaded or saved, the validation routine `validateShaderPacket()` checks compliance, throwing a structured `BytecodeError` if validation fails (e.g. missing `fragmentSource`, invalid canvas bounds, or contract version mismatch).

### 2.3 Deterministic Checksum Hashing (FNV-1a)
To ensure asset integrity and prevent duplicate packet compilation, each shader packet receives an 8-character hexadecimal checksum. 

However, standard JSON serialization is non-deterministic; changing key orders or introducing line carriage returns (`\r\n` vs `\n`) can yield different hashes for semantically identical shaders. The system resolves this with three preprocessing steps:

1. **Source Normalization**: The GLSL code in `fragmentSource` is normalized by stripping carriage returns, trimming trailing whitespaces on each line, and filtering out empty lines.
2. **Recursive Key Sorting**: All nested objects in the packet—most notably the `uniforms` configuration—are recursively sorted by their alphabetical key order and frozen.
3. **FNV-1a Checksumming**: The standardized serialization is passed to a 32-bit FNV-1a hash algorithm:

$$H_{i} = (H_{i-1} \oplus B_{i}) \times 16777619 \pmod{2^{32}}$$

Where $H_0 = 2166136261$ (offset basis) and $B_i$ represents the byte value at index $i$. The resulting hash value is formatted as `fnv1a_XXXXXXXX`.

---

## 3. UNIFORM RESOLUTION LAYER & DOT-NOTATION MAPPING

### 3.1 Declarative Uniform Mapping
The [shader-uniform-resolver.js](file:///home/deck/Desktop/Scholomance-V12-main/codex/core/pixelbrain/shader-uniform-resolver.js) layer acts as a bridge between the active game state and WebGL uniforms. Rather than hardcoding bindings in components, uniforms resolve their values dynamically using dot-notation string paths.

### 3.2 Canonical Default Uniforms
All shaders automatically register a set of canonical uniforms mapped from the authoritative spell state:

| GLSL Uniform Name | GLSL Type | State Path | Default Value | Rationale |
|---|---|---|---|---|
| `u_time` | `float` | `clock.elapsedSeconds` | `0.0` | Animates particles, noise, or ripples |
| `u_resolution` | `vec2` | `canvas.size` | `[160, 144]` | Computes aspect-ratio-corrected UV coordinates |
| `u_school` | `int` | `spell.schoolIndex` | `0` | Modulates colors based on school index |
| `u_resonance` | `float` | `verse.resonance` | `0.5` | Amplifies visual effects (amplitude, speed) |
| `u_vowel_density` | `float` | `verse.vowelDensity` | `0.5` | Modulates pixel noise or bloom density |
| `u_palette0` | `vec3` | `palette.0.rgb01` | `[0.0, 0.0, 0.0]` | Drives palette-swapping vectors |

### 3.3 Coercion and Normalization Rules
Dynamically resolved values are cast and normalized prior to being bound to GLSL locations:

- **Float/Int**: Coerced to numbers. `NaN` or non-finite inputs default to `0`.
- **Vec2/Vec3**: Coerced to arrays of numbers.
- **Hex Color Strings**: If a `vec3` uniform resolver path resolves to a hex color string (e.g. `"#8A2BE2"`), the resolver invokes `hexToRgb01()` to convert it to normalized floats in the `[0, 1]` range:

$$R = \frac{D_0}{255}, \quad G = \frac{D_1}{255}, \quad B = \frac{D_2}{255}$$

Where $D_i$ are the decimal representations of the hex pairs.

---

## 4. DIAGNOSTICS & COMPILE-TIME ERROR MAPPING

### 4.1 Integration with BytecodeError
To preserve the auditability of Scholomance diagnostics, custom shader compile failures are not thrown as generic strings. Instead, compile, link, and uniform faults are parsed into structured `BytecodeError` structures registered under `MODULE_IDS.SHADER` in [bytecode-error.js](file:///home/deck/Desktop/Scholomance-V12-main/codex/core/pixelbrain/bytecode-error.js):

| Error Name | Error Code | Category | Severity | Description |
|---|---|---|---|---|
| `SHADER_COMPILE_FAILED` | `0x0910` | `RENDER` | `CRIT` | GLSL fragment shader syntax error |
| `SHADER_LINK_FAILED` | `0x0911` | `RENDER` | `CRIT` | Program interface matching error |
| `SHADER_UNIFORM_INVALID`| `0x0912` | `RENDER` | `CRIT` | Invalid uniform type declaration |
| `SHADER_CONTEXT_LOST` | `0x0913` | `RENDER` | `CRIT` | WebGL canvas context loss |

### 4.2 GLSL Compiler Log Parsing
Raw logs returned by the GPU's `gl.getShaderInfoLog()` are processed by [shader-errors.js](file:///home/deck/Desktop/Scholomance-V12-main/codex/core/pixelbrain/shader-errors.js) and `parseShaderCompileLog()`. A regex engine extracts the failure line and message from standard formats:

```
(?:ERROR|WARNING):\s+\d+:(\d+):\s+(.*)
```

The parser reconstructs a surrounding source snippet preview of the faulty line and yields a structured `BytecodeError` with Base64-encoded context metadata.

### 4.3 Recovery Hints
Each shader error maps to actionable recovery hints used by diagnostic reporters:

- **Compile Failed**:
  - *Suggestions*: "Verify GLSL syntax correctness", "Ensure all uniform declarations match type requirements".
  - *Constraints*: "GLSL ES 300 source must compile cleanly".
- **Link Failed**:
  - *Suggestions*: "Check vertex and fragment shader interface variables matching".
- **Context Lost**:
  - *Suggestions*: "Reinitialize WebGL canvas resources".

---

## 5. WEBGL SANDBOX & CONTEXT LOST LIFECYCLE

### 5.1 Sandbox Viewport Constraints
The rendering loop resides in [shader-webgl-preview.js](file:///home/deck/Desktop/Scholomance-V12-main/src/lib/pixelbrain/shader-webgl-preview.js) and is consumed by the client-side sandbox player [ShaderSandbox.jsx](file:///home/deck/Desktop/Scholomance-V12-main/src/pages/PixelBrain/components/ShaderSandbox.jsx). 

For performance stability and retro rendering stasis, the canvas size is capped at `160x144` viewport dimensions. Renders map user code within a normalized fullscreen quad.

### 5.2 Compilation Debouncing
Compiling fragment GLSL code on every single keystroke triggers high GPU thread overhead and micro-stutters. The Sandbox page decouples editor changes from the compilation loop with a **200ms debounce**. This ensures compilation occurs only when typing pauses, maintaining a stable UI thread.

### 5.3 WebGL Context Loss Lifecycle
Modern browsers frequently recycle WebGL contexts when the system goes to sleep or memory limits are exceeded. The sandbox listens for:

1. `webglcontextlost`: Prevents the rendering frame loop from firing, logs a `SHADER_CONTEXT_LOST` warning, and releases allocated GL program buffers.
2. `webglcontextrestored`: Re-allocates the quad buffers, compiles vertex/fragment sources anew, restores dynamic uniform locations, and restarts the render loop.

---

## 6. EXPORTERS: CROSS-PLATFORM TARGETS

### 6.1 The User pbMain Contract
To ensure portability, authors do not write the entire fragment shader code. They only write the body of `pbMain`, which has a fixed interface:

```glsl
vec4 pbMain(vec2 uv, float time, float resonance);
```

### 6.2 Godot Exporter (`canvas_item`)
The Godot exporter script [pixelbrainGodotShaderExport.js](file:///home/deck/Desktop/Scholomance-V12-main/src/lib/exporters/pixelbrainGodotShaderExport.js) translates the packet into a native Godot `.gdshader` file. It maps custom uniforms and binds the `pbMain` output directly to Godot's fragment output register `COLOR`:

```glsl
shader_type canvas_item;

// Canonical uniforms from Scholomance clock and spells
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_resonance;
uniform int u_school;
uniform float u_vowel_density;
uniform vec3 u_palette0;

// Custom uniforms defined in packet
uniform float u_ripple_frequency;

// User-written pbMain contract
vec4 pbMain(vec2 uv, float time, float resonance) {
    // custom logic ...
}

void fragment() {
    COLOR = pbMain(UV, u_time, u_resonance);
}
```

### 6.3 Phaser 4 Exporter (`PostFXPipeline`)
The Phaser exporter script [pixelbrainPhaserShaderExport.js](file:///home/deck/Desktop/Scholomance-V12-main/src/lib/exporters/pixelbrainPhaserShaderExport.js) compiles the packet into an ES6 Post-Processing Pipeline registration class. 

It wraps the GLSL source into a `#version 300 es` fragment block, resolves the viewport aspect ratios inside `main()`, and implements an `onPreRender()` hook to pass registry clock and spell metrics:

```javascript
export class RipplesPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({
      game,
      name: 'ripples',
      fragShader: `#version 300 es
precision highp float;

out vec4 fragColor;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_resonance;
uniform int u_school;
uniform float u_vowel_density;
uniform vec3 u_palette0;

// Custom logic here ...

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  fragColor = pbMain(uv, u_time, u_resonance);
}
`
    });
  }

  onPreRender() {
    this.set1f('u_time', this.game.registry.get('clock.elapsedSeconds') || 0.0);
    this.set2f('u_resolution', this.renderer.width, this.renderer.height);
    this.set1f('u_resonance', this.game.registry.get('verse.resonance') || 0.5);
    this.set1i('u_school', this.game.registry.get('spell.schoolIndex') || 0);
    this.set1f('u_vowel_density', this.game.registry.get('verse.vowelDensity') || 0.5);
  }
}
```

---

## 7. TESTING AND DETERMINISM VERIFICATION

### 7.1 Automated Invariant Assertion
The system is protected by vitest suites located in [shader.test.js](file:///home/deck/Desktop/Scholomance-V12-main/tests/pixelbrain/shader.test.js). The test suites verify the following invariants:

- **Schema Stability**: Checks that packets initialized with invalid structures (missing contract versions or invalid canvas boundaries) throw appropriate type exceptions.
- **Hash Invariance**: Asserts that formatting adjustments, extra spacing, or carriage return alterations in the GLSL source do not mutate the FNV-1a checksum.
- **Uniform Key Invariance**: Verifies that declaring uniforms in different key insertion sequences yields identical FNV-1a hashes after sorting.
- **Coercion Determinism**: Confirms that decimal normalization and dot-notation nested paths yield exact expected floats.

---

## 8. FUTURE WORK: EXTENSION REGISTRY INTEGRATION

### 8.1 Registries as Hook Layers
In the current implementation, shader packets are isolated to sandbox rendering and external script exporting. 

Future phases will integrate shader packets as registered types within the PixelBrain extension registry. This will allow custom shaders to plug directly into the canvas rendering pipeline as hook decorators:

```
[Coordinate Map Hook] ➔ [Color Byte Hook] ➔ [Custom Shader Hook (PB-SHADER-v1)] ➔ [Raster Screen]
```

This integration will enable shaders to run as post-processing layers on top of standard pixel assets dynamically inside the main game loop, maintaining full compatibility with the existing diagnostic cell constraints.

---

*Signed,*  
**Antigravity** — *Advanced Agentic Coding (Google DeepMind Team)*  
*Scholomance V12 Engineering Corps*  
*Date: 2026-06-06*
