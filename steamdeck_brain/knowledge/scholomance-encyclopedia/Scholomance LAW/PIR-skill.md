# SPEC: PixelBrain Weakness Remediation Plan

## 0. Executive Summary

PixelBrain is already operating as a deterministic asset compiler, lattice editor, procedural texture engine, and shader forge. The current weaknesses are not foundational failures. They are localized architectural gaps where early prototype logic bypasses newer engine systems.

This spec defines a remediation plan for every known weakness:

1. Refactor concave silhouette filling.
2. Centralize import validation inside the core engine.
3. Route traced image coordinates through the extension registry.
4. Replace static snapping for circular/Fibonacci dialects with continuous geometric resolution.
5. Clock-bind Mode 7 and animation hooks.
6. Add boundary guards for large grid dimensions.
7. Tighten TrueSight tooltip/layout containment.
8. Add shader uniform registry hooks for spelling/game state.
9. Add regression tests for each fix.

Primary goal: preserve PixelBrain’s existing behavior while removing prototype bypasses and increasing deterministic safety.

---

# 1. Scope

## In Scope

Target areas:

```txt
src/pages/PixelBrain/
codex/core/pixelbrain/
codex/core/pixelbrain/extensions/
codex/core/pixelbrain/template-grid-engine.js
codex/core/pixelbrain/image-to-pixel-art.js
src/pages/PixelBrain/components/TemplateEditor.jsx
src/pages/PixelBrain/components/ShaderSandbox.jsx
tests/qa/pixelbrain/
tests/qa/features/templateEditor.qa.test.jsx
```

## Out of Scope

Do not rewrite PixelBrain architecture.

Do not replace the lattice engine.

Do not change PixelBrain palette authority.

Do not mutate existing public export contracts unless versioned.

Do not replace the shader forge.

Do not refactor unrelated Read/TrueSight systems except where tooltip containment is directly impacted.

---

# 2. Change Classification

| Change                         | Classification            | Risk       |
| ------------------------------ | ------------------------- | ---------- |
| Concave silhouette fill        | Behavioral + algorithmic  | Medium     |
| Import validation relocation   | Structural + safety       | Medium     |
| Extension registry integration | Architectural             | Low-medium |
| Circular/Fibonacci snapping    | Behavioral + geometry     | Medium     |
| Mode 7 clock binding           | Behavioral + animation    | Low        |
| Large-grid boundary guards     | Structural + performance  | Medium     |
| Tooltip containment            | UI/UX + layout            | Low        |
| Shader uniform registry        | Architectural + rendering | Medium     |

---

# 3. Dependency Check

Before editing, inspect these dependencies:

## Coordinate authority

```txt
template-grid-engine.js
getCellOrigin
getCellAtPosition
getGridMetrics
Cell Wall adapter exports
TemplateEditor.jsx consumers
```

Risk: if snapping math changes, paint, hit-test, fill, symmetry, cursor, and export can drift.

## Image trace pipeline

```txt
image-to-pixel-art.js
generatePixelArtFromImage
fillShape
applyExtensionToCoordinates
extension-registry.js
physics-extensions.js
style-extensions.js
```

Risk: traced assets may bypass registered hooks or produce invalid coordinate maps.

## Import/export contract

```txt
TemplateEditor.jsx
template-grid-engine.js
Aseprite JSON import/export helpers
PixelBrain export payload consumers
Godot/Phaser bridge consumers
```

Risk: validation only in UI allows alternative ingestion channels to crash core parsing.

## Shader runtime

```txt
ShaderSandbox.jsx
shader-webgl-preview.js
PB-SHADER-v1
spelling engine clock
u_time
uniform binding logic
```

Risk: hardcoded uniform binding prevents future game/spell state injection.

---

# 4. Weakness 1: Convex-Only Silhouette Fill

## Problem

Current fill logic uses row bounding boxes or simple horizontal span assumptions. This works for convex shapes, but corrupts concave or hollow forms.

Broken examples:

```txt
donut
crescent
horseshoe
spiral
ring sigil
nested glyph
```

The bug: hollow interiors become filled.

## Required Fix

Replace the current fill algorithm with a scanline even-odd winding fill.

## Target File

```txt
codex/core/pixelbrain/image-to-pixel-art.js
```

## Implementation Requirements

Create a pure helper:

```js
function fillShapeWithEvenOddWinding(outlineCoordinates, gridMetrics, options = {}) {}
```

Expected behavior:

1. Group outline edges by scanline.
2. For each row, cast a horizontal ray.
3. Count edge crossings.
4. Fill cells only when crossing count is odd.
5. Preserve holes where crossing count returns to even.
6. Re-legalize all output through the lattice coordinate authority.
7. Return deterministic sorted coordinates.

## Algorithm Contract

Input:

```js
{
  outlineCoordinates: Array<{ x: number, y: number }>,
  gridMetrics,
  options: {
    preserveBoundary?: boolean,
    maxFillCells?: number
  }
}
```

Output:

```js
{
  ok: true,
  coordinates: Array<{ x: number, y: number }>,
  fillMode: 'even-odd-winding',
  preservedHoles: boolean
}
```

Failure output:

```js
{
  ok: false,
  error: 'FILL_TOO_LARGE' | 'INVALID_OUTLINE' | 'EMPTY_OUTLINE',
  coordinates: []
}
```

## Risk Reduced

Prevents visual corruption of complex magical glyphs, sigils, rings, and hollow sprite shapes.

## Regression Tests

Add tests:

```txt
tests/qa/pixelbrain/fillShape.evenOdd.test.js
```

Test cases:

1. Solid rectangle fills fully.
2. Donut shape preserves center hole.
3. Crescent shape preserves concavity.
4. Spiral does not flood outside intended boundary.
5. Empty outline fails closed.
6. Fill exceeding max cells returns `FILL_TOO_LARGE`.

## Manual QA

In SketchPad:

1. Draw a ring.
2. Apply fill.
3. Verify inner circle remains empty.
4. Export.
5. Reimport.
6. Confirm coordinates match exported shape.

---

# 5. Weakness 2: Client-Side-Only Import Validation

## Problem

Aseprite JSON validation currently lives inside the UI input listener. This protects manual imports through `TemplateEditor.jsx`, but does not protect alternative ingestion paths.

Risk examples:

```txt
API synchronizer import
test fixture import
future file watcher import
Godot bridge import
programmatic import
```

## Required Fix

Move validation into the core import function.

## Target Files

```txt
src/pages/PixelBrain/components/TemplateEditor.jsx
codex/core/pixelbrain/template-grid-engine.js
```

## Implementation Requirements

Create core validation helpers:

```js
export function validateAsepriteImportPayload(payload, options = {}) {}
export function importFromAseprite(payload, options = {}) {}
```

The UI must call the core function and only render the returned success/error state.

## Validation Contract

Validate:

```txt
schema version
canvas width
canvas height
frame count
layer count
cell coordinate bounds
palette format
frame duration
metadata object shape
unsupported unknown critical fields
```

Hard bounds:

```js
const ASEPRITE_IMPORT_LIMITS = {
  maxWidth: 512,
  maxHeight: 512,
  maxFrames: 256,
  maxLayers: 64,
  maxCells: 262144
};
```

Validation result:

```js
{
  ok: true,
  normalizedPayload,
  warnings: []
}
```

Failure result:

```js
{
  ok: false,
  error: 'INVALID_SCHEMA' | 'DIMENSIONS_OUT_OF_BOUNDS' | 'TOO_MANY_FRAMES' | 'CELL_OUT_OF_BOUNDS',
  details: []
}
```

## OLD

```js
// TemplateEditor.jsx
input.onchange = (event) => {
  const file = event.target.files[0];
  const parsed = JSON.parse(text);

  if (!parsed.frames || !parsed.meta) {
    setError('Invalid import');
    return;
  }

  importIntoEditor(parsed);
};
```

## NEW

```js
// TemplateEditor.jsx
input.onchange = async (event) => {
  const file = event.target.files[0];
  const parsed = JSON.parse(await file.text());
  const result = importFromAseprite(parsed);

  if (!result.ok) {
    setImportError(result);
    return;
  }

  applyImportedTemplate(result.template);
};
```

## Risk Reduced

Prevents crashes and invalid coordinate ingestion from non-UI import paths.

## Regression Tests

Add:

```txt
tests/qa/pixelbrain/asepriteImport.validation.test.js
```

Test cases:

1. Valid fixture imports.
2. Missing frames fails.
3. Width > 512 fails.
4. Height > 512 fails.
5. Negative cell coordinates fail.
6. Unknown optional fields warn but do not fail.
7. Unknown critical fields fail.

---

# 6. Weakness 3: Hardcoded Extension Bypass

## Problem

Image tracing currently applies extensions through explicit branching:

```js
if (extensionId === 'physics-gravity') {
  ...
}
```

This bypasses the extension registry and prevents custom extensions from working on uploaded images.

## Required Fix

Route final traced coordinates through the registered extension hook pipeline.

## Target Files

```txt
codex/core/pixelbrain/image-to-pixel-art.js
codex/core/pixelbrain/extension-registry.js
codex/core/pixelbrain/extensions/physics-extensions.js
codex/core/pixelbrain/extensions/style-extensions.js
```

## Implementation Requirements

Replace hardcoded extension logic with:

```js
extensionRegistry.applyHooks('coordinate-map', finalCoordinates, context)
```

The image tracer should not know individual extension IDs.

## Required Context Payload

```js
const hookContext = {
  source: 'image-trace',
  canvasSize,
  gridMetrics,
  dialect,
  palette,
  seed,
  time,
  selectedExtensionIds,
  metadata
};
```

## Extension Registry Contract

`applyHooks` should support:

```js
applyHooks(hookType, coordinates, context)
```

Return:

```js
{
  ok: true,
  coordinates,
  appliedHooks: ['physics-gravity', 'style-16bit'],
  warnings: []
}
```

Failure:

```js
{
  ok: false,
  error: 'EXTENSION_HOOK_FAILED',
  failedHook: 'physics-gravity',
  coordinates: originalCoordinates
}
```

Fail closed. Do not partially corrupt coordinates.

## OLD

```js
function applyExtensionToCoordinates(coordinates, extensionId, canvasSize) {
  if (extensionId === 'physics-gravity') {
    return applyGravity(coordinates, canvasSize);
  }

  return coordinates;
}
```

## NEW

```js
function applyExtensionsToCoordinates(coordinates, context) {
  return extensionRegistry.applyHooks('coordinate-map', coordinates, context);
}
```

## Risk Reduced

Restores modularity. Future physics/style extensions apply consistently to hand-drawn, generated, and traced assets.

## Regression Tests

Add:

```txt
tests/qa/pixelbrain/imageTrace.extensions.test.js
```

Test cases:

1. Traced image receives `physics-gravity`.
2. Traced image receives custom test extension.
3. Unknown extension is ignored or returns structured warning.
4. Failed hook does not mutate original coordinates.
5. Multiple hooks apply in deterministic order.

---

# 7. Weakness 4: Erratic Snapping on Circular and Fibonacci Grids

## Problem

Circular and Fibonacci snapping rely on static anchor lookups. Near boundaries, pointer positions can jump unpredictably.

## Required Fix

Use continuous geometric formulas for snapping.

## Target File

```txt
codex/core/pixelbrain/template-grid-engine.js
```

## Circular Dialect Formula

Convert pointer to polar coordinates relative to grid center:

```js
dx = pointerX - centerX
dy = pointerY - centerY
radius = sqrt(dx * dx + dy * dy)
theta = atan2(dy, dx)
```

Quantize:

```js
ringIndex = clamp(round(radius / ringStep), 0, ringCount - 1)
segmentIndex = mod(round(theta / segmentAngle), segmentCount)
```

Return the nearest legal cell center by reconstructing:

```js
x = centerX + cos(segmentTheta) * ringRadius
y = centerY + sin(segmentTheta) * ringRadius
```

## Fibonacci Dialect Formula

For Fibonacci/golden subdivisions:

1. Represent candidate cells as deterministic regions.
2. Compute distance from pointer to each candidate centroid within a bounded local neighborhood.
3. Choose nearest centroid.
4. Tie-break by stable cell ID.

Do not scan the full grid for every pointer event. Use spatial bucketing.

## Snapping Result Contract

```js
{
  cellId,
  dialect,
  x,
  y,
  centerX,
  centerY,
  distance,
  confidence,
  tieBreakReason
}
```

## Risk Reduced

Prevents jumpy cursor behavior and invalid mirrored strokes on non-rectangular dialects.

## Regression Tests

Add:

```txt
tests/qa/pixelbrain/snapping.circular.test.js
tests/qa/pixelbrain/snapping.fibonacci.test.js
```

Test cases:

1. Pointer moving along circular boundary does not oscillate rapidly.
2. Center point resolves to legal center cell.
3. Same pointer always resolves to same cell.
4. Tie cases use deterministic cell ID.
5. Symmetry uses resolved legal cells, not raw pointer positions.

## Manual QA

1. Switch to circular grid.
2. Slowly drag near ring boundaries.
3. Verify cursor transitions smoothly.
4. Paint along boundary.
5. Confirm no missing or duplicate illegal cells.

---

# 8. Weakness 5: Static Mode 7 / Animation Hooks

## Problem

Mode 7 and some style extensions render as static transforms instead of clock-bound animated effects.

## Required Fix

Bind animation extensions to deterministic engine time.

## Target Files

```txt
codex/core/pixelbrain/extensions/style-extensions.js
src/pages/PixelBrain/components/ShaderSandbox.jsx
codex/core/animation/amp/runAnimationAmp.ts
```

## Implementation Requirements

Add `context.time` and optional `context.tick` to extension hooks.

```js
const animationContext = {
  time,
  tick,
  bpm,
  seed,
  motionSafetyMode
};
```

Mode 7 rotation:

```js
rotation = (context.time * speed + phaseOffset) % 360;
```

Do not use:

```js
Date.now()
performance.now()
Math.random()
```

Use the existing deterministic animation clock.

## Risk Reduced

Turns static shader/coordinate transforms into reproducible animated spell effects.

## Regression Tests

Add:

```txt
tests/qa/pixelbrain/mode7.clockBinding.test.js
```

Test cases:

1. Same `time` returns same rotation.
2. Later `time` returns advanced rotation.
3. Same seed + same time returns identical output.
4. Motion safety dampening modifies amplitude but not determinism.
5. No raw wall-clock usage.

---

# 9. Weakness 6: Large Grid Boundary Limits

## Problem

PixelBrain is strong at 160 × 144 and similar retro scales, but performance behavior above 512 × 512 is unknown.

## Required Fix

Add explicit limits, warnings, and pressure tests.

## Target Files

```txt
codex/core/pixelbrain/template-grid-engine.js
codex/core/pixelbrain/image-to-pixel-art.js
tests/qa/pixelbrain/performance-pressure.test.js
```

## Implementation Requirements

Define central limits:

```js
export const PIXELBRAIN_GRID_LIMITS = Object.freeze({
  safeWidth: 160,
  safeHeight: 144,
  warningWidth: 512,
  warningHeight: 512,
  hardMaxWidth: 1024,
  hardMaxHeight: 1024,
  maxCells: 1048576,
  maxFillCells: 262144,
  maxTraceCoordinates: 262144
});
```

Behavior:

| Condition         | Behavior                |
| ----------------- | ----------------------- |
| Under safe size   | no warning              |
| Over warning size | return warning          |
| Over hard max     | fail closed             |
| Fill exceeds max  | fail closed             |
| Trace exceeds max | simplify or fail closed |

## Risk Reduced

Prevents browser lockups, runaway fills, and memory pressure failures.

## Regression Tests

Add:

```txt
tests/qa/pixelbrain/gridLimits.test.js
```

Test cases:

1. 160 × 144 passes.
2. 512 × 512 passes with warning or boundary flag.
3. 1025 × 1024 fails.
4. Fill over `maxFillCells` fails.
5. Image trace over limit returns structured error.

---

# 10. Weakness 7: TrueSight Tooltip and Layout Boundary Tightening

## Problem

TrueSight compatibility is strong, but dynamic tooltip resizing needs tighter layout containment to avoid overflow or misalignment.

## Required Fix

Constrain overlay/tooltips using measured bounds and collision-aware placement.

## Target Files

```txt
src/pages/PixelBrain/
src/pages/Read/
shared TrueSight overlay utilities if applicable
```

## Implementation Requirements

Add a placement helper:

```js
function resolveOverlayPlacement(anchorRect, overlayRect, viewportRect, options = {}) {}
```

Placement must support:

```txt
top
bottom
left
right
flip when overflowing
clamp within viewport
snap to pixel grid
recalculate on resize
respect reduced motion
```

## Risk Reduced

Prevents tooltip clipping, layout jitter, and overlay drift during dynamic resizing.

## Regression Tests

Add:

```txt
tests/qa/features/truesightOverlay.bounds.test.jsx
```

Test cases:

1. Tooltip near right edge flips/clamps.
2. Tooltip near bottom edge flips/clamps.
3. Resize recalculates placement.
4. Reduced motion disables animated repositioning.
5. Pixel snapping keeps coordinates integer-aligned.

---

# 11. Weakness 8: Shader Uniform Binding Extensibility

## Problem

Shader sandbox binds core uniforms cleanly, but future spelling/game states may need additional registry hooks.

## Required Fix

Introduce a uniform provider registry.

## Target Files

```txt
src/pages/PixelBrain/components/ShaderSandbox.jsx
codex/core/pixelbrain/shader-webgl-preview.js
codex/core/pixelbrain/shader-uniform-registry.js
```

## New File

```txt
codex/core/pixelbrain/shader-uniform-registry.js
```

## Registry Contract

```js
registerUniformProvider(providerId, provider)
getUniformProviders()
resolveShaderUniforms(context)
```

Provider shape:

```js
{
  id: 'spelling-state',
  uniforms: ['u_time', 'u_spellIntensity'],
  resolve(context) {
    return {
      u_spellIntensity: context.spellIntensity ?? 0
    };
  }
}
```

Resolved payload:

```js
{
  ok: true,
  uniforms: {
    u_time: 1.25,
    u_spellIntensity: 0.8
  },
  providers: ['core-time', 'spelling-state'],
  warnings: []
}
```

## Risk Reduced

Avoids hardcoding every future spell/game uniform directly into the shader preview layer.

## Regression Tests

Add:

```txt
tests/qa/pixelbrain/shaderUniformRegistry.test.js
```

Test cases:

1. Core uniforms resolve.
2. Custom provider resolves.
3. Duplicate uniform names fail or warn deterministically.
4. Bad provider fails closed.
5. Shader export includes uniform metadata.

---

# 12. Cross-Cutting Rule: Preserve PixelBrain Authority

All fixes must obey:

```txt
The lattice engine owns coordinates.
The palette engine owns color mapping.
The extension registry owns effect hooks.
The import engine owns validation.
The shader registry owns uniforms.
The UI owns display only.
```

If a component contains business logic that belongs to a core engine, move the logic downward into the core module and make the component consume structured results.

---

# 13. Required Test Commands

Run after each phase:

```bash
npx vitest run tests/qa/pixelbrain
npx vitest run tests/qa/features/templateEditor.qa.test.jsx
npm run build
```

Run after full remediation:

```bash
npm run typecheck
npm run lint
npx vitest run
npm run build
```

If the repo uses pnpm:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

---

# 14. Manual QA Checklist

## Fill QA

* Draw a donut.
* Fill it.
* Inner hole remains empty.
* Export and reimport.
* Shape remains stable.

## Import QA

* Import valid Aseprite JSON.
* Import invalid dimensions.
* Import invalid coordinates.
* Import malformed metadata.
* UI displays structured errors without crashing.

## Extension QA

* Upload traced image.
* Apply gravity extension.
* Apply custom test extension.
* Confirm traced image and drawn image share the same hook path.

## Circular/Fibonacci QA

* Paint slowly near grid boundaries.
* Confirm cursor does not jump erratically.
* Mirror strokes.
* Confirm mirrored cells land on legal centers.

## Mode 7 QA

* Enable Mode 7 style.
* Advance deterministic clock.
* Confirm rotation changes over time.
* Reload with same seed/time.
* Confirm identical frame.

## Shader QA

* Add custom uniform provider.
* Preview shader.
* Export shader.
* Confirm Godot/Phaser payload includes uniform metadata.

---

# 15. Phase Plan

## Phase 1: Safety First

1. Move Aseprite validation into core.
2. Add grid/import limits.
3. Add validation tests.

Exit criteria:

```txt
Invalid imports fail closed.
Valid imports remain unchanged.
Build and tests pass.
```

## Phase 2: Shape Correctness

1. Replace convex fill with even-odd winding fill.
2. Add donut/crescent/spiral tests.
3. Manual SketchPad QA.

Exit criteria:

```txt
Concave and hollow shapes fill correctly.
Existing convex fills still pass.
```

## Phase 3: Registry Coherence

1. Route image tracing through extension registry.
2. Remove hardcoded extension branches.
3. Add custom hook regression test.

Exit criteria:

```txt
Uploaded/traced assets and hand-authored assets share extension behavior.
```

## Phase 4: Dialect Precision

1. Replace circular snapping with polar formula.
2. Replace Fibonacci snapping with local centroid resolution.
3. Add anti-oscillation tests.

Exit criteria:

```txt
Pointer movement resolves smoothly and deterministically on all dialects.
```

## Phase 5: Animation + Shader Growth

1. Bind Mode 7 to deterministic clock.
2. Add uniform provider registry.
3. Export uniform metadata.

Exit criteria:

```txt
Animation and shader behavior are deterministic, extensible, and export-safe.
```

---

# 16. Regression Risks

| Risk                              | Cause                                             | Mitigation                                    |
| --------------------------------- | ------------------------------------------------- | --------------------------------------------- |
| Existing fills change visually    | New winding rule differs from old spans           | Snapshot old convex behavior before replacing |
| Import fixtures fail              | Stricter validation rejects loose historical data | Add compatibility normalization layer         |
| Extension ordering changes output | Registry order differs from hardcoded path        | Define explicit priority ordering             |
| Circular snapping feels different | Formula replaces anchor lookup                    | Add manual UX review threshold                |
| Shader preview breaks             | Uniform registry changes binding order            | Keep core uniforms backward-compatible        |
| Large grid warnings annoy users   | Limits too aggressive                             | Warning only under hard max                   |

---

# 17. Acceptance Criteria

The remediation is complete when:

```txt
1. No image trace extension branches hardcode individual extension IDs.
2. Concave and hollow fills preserve cavities.
3. Aseprite validation runs in the core engine.
4. Circular and Fibonacci snapping are continuous and deterministic.
5. Mode 7 uses deterministic time.
6. Large grid limits are centralized.
7. Overlay placement clamps within viewport bounds.
8. Shader uniforms are registry-extensible.
9. PixelBrain QA, TemplateEditor QA, typecheck, lint, and build pass.
```

---

# 18. Final Verdict

This remediation should preserve PixelBrain’s current strengths while removing prototype-era weak joints.

The goal is not to make PixelBrain more clever.

The goal is to make it harder to break.

After this spec is implemented, PixelBrain should move from:

```txt
A-: brilliant engine with prototype scars
```

to:

```txt
A/A+: deterministic asset synthesis system with clean extension law
```

---

# INFUSION_ALLOW
CCCB_START
ID           SCHOL-CCCB-v1-PIR-01-00-PXLBRNRM-5696635c
PHASE        01:PixelBrain Remediation
TITLE        Remediation of PixelBrain algorithmic and architectural weaknesses
GLOSSARY     CONCAVE_FILL:scanline even-odd winding fill algorithm for hollow silhouettes | IMPORT_VALIDATION:centralized Aseprite schema and boundary parsing | EXTENSION_ROUTING:coordinate map hook routing via the extension registry | GEOMETRIC_SNAPPING:continuous polar and local centroid snapping for circular and Fibonacci grids
STEPS        1.refactor_concave_fill 2.centralize_import_validation 3.route_traced_coordinates 4.implement_continuous_snapping 5.bind_animation_clocks 6.constrain_truesight_overlays 7.register_shader_uniforms
CODE_SPEC    file:codex/core/pixelbrain/template-grid-engine.js fn:getCellAtPosition op:snap file:codex/core/pixelbrain/image-to-pixel-art.js fn:fillShapeWithEvenOddWinding op:fill file:codex/core/pixelbrain/extension-registry.js fn:applyHooks op:route file:codex/core/pixelbrain/shader-uniform-registry.js fn:resolveShaderUniforms op:resolve
PITFALLS     P1:Bypassing the extension registry with hardcoded coordinate maps | P2:Client-side only validation allowing invalid files to crash core parsing | P3:Static snapping causing cursor oscillation on circular grid borders
IMPLS        A:even_odd_fill→implements scanline crossing count parity to preserve inner holes | B:centralized_limits→relocates validation checks to core engine with strict boundary guards | C:polar_resolution→uses continuous polar formulas for snap positioning
NEXT         TERMINAL
MCP_KEYS     PDR_CCCB_PIR_01_00,PDR_CCCB_PIR_01_00_RESULT
TURBO_VEC    pixelbrain remediation scanline winding registry snapping clock bounds uniform
CCCB_END

