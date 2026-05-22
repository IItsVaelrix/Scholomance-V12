# Wand & PixelBrain Synthesis Skill

> Specialization for the Antigravity agent — pair programming with the wizard-architect to implement, debug, and optimize the Scholomance Fairly Odd Wand formula system, the PixelBrain compilation chain, and the TurboQuant dynamic quantization gateway.

---

## 1. Purpose

Maintain absolute dialect symmetry, fail-closed contract enforcement, and high-fidelity particle rendering across the **Wand & PixelBrain pipeline**. This system compiles image-derived compositions into bytecode formulas, parses bytecode back into structured coordinate formulas, samples coordinates as deterministic point-cloud curves, and compresses them in real-time using WASM-accelerated or JS-fallback TurboQuant vector quantization.

Wand bugs are catastrophic to visual integrity: asymmetric round-trips corrupt saved scrolls, silent formula fallbacks make broken spells render as perfect circles (masking critical syntax errors), and distorted quantization telemetry hides padding overhead, misleading downstream systems. This skill formalizes the mathematical and architectural gates necessary to keep the Wand perfectly calibrated.

---

## 2. Scope

### Owned Surface (Writable)
- `codex/core/pixelbrain/formula-to-coordinates.js` — Coordinate evaluation, simplex char atlases, strict fallback options, and dialect generators.
- `src/ui/features/mysticHolistics/hero/roleDrawers.ts` — Particle renderers, vector-stroke neon lines, and glow effects.
- `src/pages/Wand/WandPage.jsx` — Visual playground, spell parameter sliders, interactive inputs, dynamic telemetry states.
- `src/pages/Wand/WandPage.css` — Glassmorphic layout, glowing neon badges, stat counters, and CRT overlay styling.
- `docs/skills/antigravity.wand.pixelbrain.skill.md` — This canonical skill file itself.

### Boundary Layers (Negotiated/Read-Only)
- `src/lib/engine.adapter.js` — Writable gateway/adapter exposing mathematical core features to the UI while preserving the alchemical "Cell Wall" (Law 11).
- `presets/schemas/formula.schema.json` — JSON schema specifying formula boundaries.
- `codex/core/modulation/planner/formula-validator.js` — Semantic check gating proposals before evaluation.
- `codex/core/pixelbrain/image-to-bytecode-formula.js` — Bytecode compiler and parser registry.
- `tests/qa/modulation/wand-core.test.js` — Integration test suite verifying Wand math and schemas.

---

## 3. Trigger Phrases

Auto-invoke when the user mentions:
- "vectorized_text", "formula-to-coordinates", "SIMPLEX_CHAR_ATLAS"
- "TurboQuant", "quantizeFlatCoordinates", "padFlatVectorToPowerOfTwo"
- "compressionRatio", "L2 norm", "telemetry panel"
- "roleDrawers", "text.vector", "neon cyan particles"
- "bytecode parser", "round-tripping", "0xFV_16x16"
- "strict mode evaluateFormula", "silent formula fallback"

---

## 4. Operating Modes

| Mode | When to Use | Key Output |
|---|---|---|
| **A: Compiler Calibration** | Modifying parser maps or bytecode encoders (`image-to-bytecode-formula.js`) | Double-sided round-trip validation proof (parse ⇋ serialize symmetry) |
| **B: Geometric Tracing** | Tuning the Simplex Atlas or stroke sampling algorithm | Coordinates trace verification showing correct point intervals, scale bounding, and centering offsets |
| **C: Compression Audit** | Enhancing TurboQuant adapter logic or telemetry math | Inspectable padding reports, unpadded-divisor compression ratios, and WASM/JS parity validations |
| **D: Aesthetic Projection** | Editing role drawers or UI dashboards | Premium glassmorphic telemetry CSS, glowing neon particle stroke shaders, and responsive UI components |
| **E: Hardened Sandbox** | Verifying strict schema-gating and validation errors | Negative-case validation suite, rejecting invalid charsets or out-of-bounds parameters |

---

## 5. Wand-PixelBrain Architectural Laws

### Law I: Perfect Dialect Symmetry
Every registered formula type MUST have a corresponding type code in `image-to-bytecode-formula.js` and map symmetrically in both directions.
* **Parse Map (`typeMap`)**: Maps the single-character byte code to the long string type (e.g., `'V' ➔ FORMULA_TYPES.VECTORIZED_TEXT`).
* **Emit Map (`typeCode`)**: Serializes the long string type to the single-character byte code (e.g., `FORMULA_TYPES.VECTORIZED_TEXT ➔ 'V'`).
* **Reconstructor Defaults**: When parsing bytecode without parameter payload details, the parser must populate type-safe default properties (e.g., `text: '', fontSize: 24, spacing: 1`) instead of applying generic grid defaults.

### Law II: Transparent Quantization Telemetry
Quantization metrics MUST report facts. Telemetry calculations must never lie by hiding padding overhead:
* **Power-of-2 Padding**: The input flat float vector `[x1, y1, x2, y2, ...]` is padded with trailing zeros to size $2^k$ (required by Fast Hadamard transforms).
* **Divided-by-Original Ratio**: The compression ratio MUST be calculated relative to the *original unpadded length* to measure true storage efficiency:
  $$\text{Ratio} = \frac{\text{byteLength of Quantized Array}}{\text{originalLength} \times \text{BYTES\_PER\_ELEMENT}}$$
* **Inspectable Padding**: Telemetry must explicitly output `originalLength`, `paddedLength`, `padCount`, `padPolicy` (`'trailing_zero_power2'`), and active `backend` (`'wasm'` or `'js'`).

### Law III: Strict Fail-Closed Boundaries
A spell should never decay silently into a fallback shape unless explicitly allowed by legacy modes.
* **Dialect Validation**: The schema-gating layer and custom validator must strictly enforce parameters before execution.
* **No Silent Parametric Curve**: In strict coordinate evaluation, an unknown formula type must throw `FORMULA_UNSUPPORTED_TYPE` instead of silently defaulting to a standard circle.
* **Charset Sanitization**: Character streams must be validated against `/^[A-Z0-9 ]*$/`. Characters outside this charset must either normalize safely (e.g., converting to uppercase) or trigger a syntax error (`FORMULA_INVALID_VECTORIZED_TEXT_CHARSET`).

---

## 6. Simplex Atlas and Geometric Calibration

To draw fine line-like characters from formula vectors, a lightweight simplex coordinate atlas must be mathematically defined:
* **Coordinates Box**: Each letter is defined as an array of strokes, where each stroke is an array of relative points within a unit bounding box `[0..1] x [0..1]`.
* **Centering Constraint**: The text string must center exactly around `(cx, cy)`.
* **Proportional Scaling**:
  - Horizontal glyph size: $\text{glyphWidth} = \text{fontSize} \times 0.62$.
  - Step distance: $\text{glyphStep} = \text{glyphWidth} \times \text{spacing}$.
  - Text starting position: $\text{startX} = cx - \frac{(\text{length} - 1) \times \text{glyphStep}}{2}$.
* **Linear Stroke Sampling**: Drawing straight line segments between stroke anchors produces coarse lines. Points must be sampled linearly along each stroke segment at high resolution (e.g., every 3 pixels of distance) to form smooth, continuous particle clouds.

---

## 7. Interactive Telemetry UI Aesthetics

The telemetry dashboard is an arcane glassmorphic terminal chrome component that overlays the bottom area of the Wand canvas. It must feel premium, visual, and alive:
* **Glassmorphism Spec**: Background of semi-transparent dark charcoal (`rgba(10, 15, 25, 0.75)`), backdrop blur of `12px`, and a fine neon border (`rgba(0, 245, 255, 0.15)`).
* **Interactive Indicators**:
  - A flashing neon active beacon for the active backend (Green/Cyan for WASM active, Amber for JS fallback).
  - Glowing digital stat blocks displaying real-time quantization metrics (saving ratio, original/padded lengths, L2 vector norm).
  - Fine CRT scanline overlay and soft neon box-shadows.

---

## 8. Implementation Inspection Checklist

### Automated Contract Scaffolding
- [ ] Round-trip: `formulaToBytecode(parseBytecodeToFormula("0xFV_16x16_4c_d0_gg3"))` returns `"0xFV_16x16_4c_d0_gg3"`.
- [ ] Schema enforcement: Invalid characters (lowercase or symbols) are caught by validator/schema.
- [ ] Strict mode coordinate evaluation: `options.strict = true` throws on unknown types.
- [ ] Quantization pads `[1.2, 3.4, 5.6]` to a flat float vector of length 4, and reports padded values correctly.
- [ ] Telemetry outputs real compression savings ratio based on unpadded division.

### Visual Manual Checks
- [ ] The vectorized text centers precisely around `cx`, `cy` when scale changes.
- [ ] Changing spacing from `0.1` (collapsed letters) to `5` (widely dispersed letters) scales correctly.
- [ ] Canvas particles animate smoothly with micro-vibrations and bright white inner glowing cores.
- [ ] Disabling WASM dynamically changes the backend status in telemetry to `JS Fallback` without page reload or coordinate failure.

---

## 9. Red-Team & Stress Vectors

| Risk | Attack Vector | Mitigation |
|---|---|---|
| **Memory Leak in Quantizer** | Frequent slide controls cause re-quantization 60 times/sec, generating float arrays and triggering high GC pressure. | Throttle or debounce quantization telemetry updates (e.g., once every 16ms or on coordinate settle) or release unmanaged buffers cleanly. |
| **Silent Parametric Degradation** | A spell developer writes an unsupported formula type code `0xFZ`. The parser fails to parse it. | Ensure `strict` option throws an error immediately, halting canvas execution and displaying a diagnostic red alert, instead of displaying a circle. |
| **Telemetry Under-reporting** | If original length is zero or contains single coordinate, calculation divides by zero or throws. | Guard originalLength checks: if $\le 0$, set ratio to $0.0$ and return safe telemetry parameters. |

---

*Skill Author: Antigravity Wand Compiler Division*
*Template Origin: `docs/skills/vaelrix.law.debug.skill.md`*
*Date: 2026-05-22*
