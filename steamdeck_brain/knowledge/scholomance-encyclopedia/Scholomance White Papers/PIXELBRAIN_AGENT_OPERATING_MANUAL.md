# PixelBrain Agent Operating Manual
## A White Paper for AI Agents Using the Deterministic Asset Compiler

## Bytecode Search Code
`SCHOL-ENC-BYKE-SEARCH-WP-PIXELBRAIN-AGENT-MANUAL`

**Date:** 2026-06-12  
**Audience:** AI agents, maintainers, QA agents, UI agents, asset pipeline agents  
**Scope:** PixelBrain core, Item Foundry, Template Editor, Aseprite bridge, Shader Forge, construction skeletons, shape grammar router  
**Primary Source Code:** `codex/core/pixelbrain/`  
**UI Surface:** `src/pages/PixelBrain/`  
**Canonical PDRs:**  
- [`2026-06-11-pixelbrain-connective-tissue-seven-systems-pdr.md`](../PDR-archive/2026-06-11-pixelbrain-connective-tissue-seven-systems-pdr.md)
- [`2026-06-11-pixelbrain-render-fidelity-pipeline-pdr.md`](../PDR-archive/2026-06-11-pixelbrain-render-fidelity-pipeline-pdr.md)
- [`2026-06-12-sketchamp-construction-line-microprocessor-pdr.md`](../PDR-archive/2026-06-12-sketchamp-construction-line-microprocessor-pdr.md)
- [`2026-06-12-pixelbrain-deterministic-shape-grammar-router-pdr.md`](../PDR-archive/2026-06-12-pixelbrain-deterministic-shape-grammar-router-pdr.md)
- [`2026-06-12-pixelbrain-deterministic-pro-chestplate-pdr.md`](../PDR-archive/2026-06-12-pixelbrain-deterministic-pro-chestplate-pdr.md)

---

## 1. What PixelBrain Is

PixelBrain is Scholomance's deterministic visual synthesis engine.

It converts structured intent into lattice-bound visual artifacts:

```text
Intent / ITEM-SPEC-v1 / Template / Imported Image
  -> normalized contract
  -> lattice coordinates
  -> material and palette authority
  -> render packet
  -> export packet / shader packet / editor packet
```

The core rule is simple:

```text
The lattice is the asset.
```

Images, SVGs, canvas previews, Aseprite layers, Godot scenes, Phaser pipelines, and shader effects are projections of the lattice. They are never the canonical source of truth.

PixelBrain is not:

- a screenshot exporter
- a generic canvas doodle pad
- an ML image generator
- a shader-first geometry system
- a place to invent parallel asset schemas

PixelBrain is:

- a deterministic asset compiler
- a lattice coordinate authority
- a bytecode-compatible visual packet system
- a shape grammar and AMP execution substrate
- a bridge between browser authoring, runtime rendering, and external tools

---

## 2. The Non-Negotiable Laws

Every agent touching PixelBrain must preserve these laws.

### 2.1 Lattice Authority

Canonical geometry is integer-cell lattice data:

```js
{ x: 10, y: 14, color: '#FFF4B8', partId: 'blade' }
```

Do not derive canonical geometry from:

- PNG pixels
- canvas screenshots
- shader output
- SVG paths
- DOM layout
- generated raster previews

Those may be import sources or export targets, but canonical PixelBrain state must normalize back to coordinates, palettes, bytecode, and metadata.

### 2.2 Determinism

Same input must produce same output.

Forbidden in canonical paths:

- `Math.random()`
- timestamp-seeded variation
- unordered object iteration that affects output
- host-specific canvas measurement as canonical geometry
- GPU-only effects as export geometry

Allowed:

- coordinate-hashed noise
- seed-derived formulas
- deterministic FNV-1a hashes
- quantized trigonometry that returns integer cells

### 2.3 Bytecode and Packet First

Persistent or interoperable output should move through stable packet contracts:

- `PixelBrainAssetPacket`
- `pixelbrain.render.v1`
- `pixelbrain.export.v1`
- `PB-SHADER-v1`
- `PB-CONSTRUCTION-SKELETON-v1`
- `PB-SHAPE-GRAMMAR-v1`
- Godot `.pbrain` artifact payloads

Do not add one-off JSON shapes when a packet or schema already exists.

### 2.4 Loud Failure

Required structure must fail, not warn.

Examples that must be fatal when required:

- a required part emits zero cells
- a required material resolves null
- a strict mirror emits one side only
- a required heraldry mark stamps zero cells
- a shader target has no final GeometryAMP mask
- diagnostics claim export readiness while required outputs are missing

Warnings are only for optional polish.

---

## 3. Where Things Live

### 3.1 Core Engine

Main directory:

```text
codex/core/pixelbrain/
```

Important files:

| File | Purpose |
|---|---|
| `pixelbrain-asset-packet.js` | Canonical source, render, and export packet normalization |
| `item-spec.js` | `ITEM-SPEC-v1` normalization and validation |
| `item-foundry.js` | Main procedural item forging entry point |
| `silhouette-composer.js` | Part profiles to occupied lattice cells |
| `part-profile-library.js` | Declarative part geometry profiles |
| `region-fill-amp.js` | Registry-derived material/color authority |
| `material-registry.js` | Material ramps, anchors, and transmutation |
| `geometry-amp.js` | Final part bounds, roles, and shader masks |
| `construction-line-microprocessor.js` | Construction guides and `PB-CONSTRUCTION-SKELETON-v1` |
| `shape-grammar-engine.js` | Deterministic grammar expansion |
| `microprocessor-route.js` | Seam-checked route execution |
| `seam-contract.js` | Required-output and seam validators |
| `factory/armor-factory.js` | Chestplate route and armor required outputs |
| `shader-packet.js` | `PB-SHADER-v1` contract |
| `item-effect-shader.js` | Foundry-generated shader packets |
| `foundry-aseprite-bridge.js` | Editable Aseprite bridge for foundry assets |
| `template-grid-engine.js` | Template editor lattice model |
| `aseprite-binary-codec.js` | Native `.aseprite` binary encoding/decoding |

### 3.2 UI

Main directory:

```text
src/pages/PixelBrain/
```

Important surfaces:

| File | Purpose |
|---|---|
| `PixelBrainPage.jsx` | Main PixelBrain workspace |
| `components/TemplateEditor.jsx` | Lattice editing surface |
| `components/ShaderForgePanel.jsx` | Shader Forge UI |
| `components/LayerStackPanel.jsx` | Layer inspection/editing |
| `components/AMPApplyPanel.jsx` | AMP operation surface |
| `mentorMetrics.js` | Critique/mentorship metrics |

UI is a consumer and editor of PixelBrain data. It must not become the source of canonical geometry outside explicit user edits.

### 3.3 Tests

Important test areas:

```text
tests/core/pixelbrain/
tests/qa/pixelbrain/
tests/qa/generation/
tests/pixelbrain/
```

Use focused tests when changing a specific AMP. Use broader PixelBrain QA when changing packets, coordinates, export paths, or editor behavior.

---

## 4. Canonical Data Contracts

### 4.1 PixelBrainAssetPacket

Use this when you need a normalized PixelBrain asset.

Entry points:

```js
import {
  createPixelBrainAssetPacket,
  normalizePixelBrainAssetPacket,
  derivePixelBrainRenderPacket,
  derivePixelBrainExportPacket,
} from './pixelbrain-asset-packet.js';
```

Minimum practical packet:

```js
const packet = createPixelBrainAssetPacket({
  canvas: { width: 64, height: 64, gridSize: 1 },
  coordinates: [
    { x: 32, y: 32, color: '#FFF4B8', partId: 'core' },
  ],
  palettes: [
    { key: 'source', colors: ['#FFF4B8'] },
  ],
});
```

Use source packets for:

- storing canonical assets
- editor handoff
- export provenance
- material transformations
- future bytecode compilation

### 4.2 Render Packet

Use render packets for preview/output where material transforms may apply.

```js
const renderPacket = derivePixelBrainRenderPacket(packet, {
  material: 'icy_fire',
});
```

Render packets may change displayed colors. They must not mutate the source packet.

### 4.3 Export Packet

Use export packets when crossing a boundary.

```js
const exportPacket = derivePixelBrainExportPacket(packet, 'json', {
  material: 'source',
});
```

Export targets include JSON, Godot helpers, Phaser helpers, Aseprite bridge outputs, and shader packets.

### 4.4 ITEM-SPEC-v1

Use `ITEM-SPEC-v1` for procedural item generation.

Entry points:

```js
import {
  normalizeItemSpec,
  validateItemSpec,
  hashItemSpec,
} from './item-spec.js';

import { forgeItemAsset } from './item-foundry.js';
```

Practical shape:

```js
const spec = {
  contract: 'ITEM-SPEC-v1',
  id: 'void.chestplate.sovereign.v1',
  class: 'armor',
  archetype: 'chestplate',
  canvas: { width: 64, height: 80, gridSize: 1 },
  seed: 110731,
  bytecode: 'VW-VOID-WILL-SONIC-TRANSCENDENT',
  parts: [
    {
      id: 'body',
      profile: 'armor.chestplate.void_royal_human',
      fill: { material: 'voidsteel', intensity: 'dark' },
      trim: { material: 'void_gold', anchor: 'body' },
    },
  ],
};

const bundle = forgeItemAsset(spec);
```

Foundry bundles include:

- `spec`
- `silhouette`
- `template`
- `construction`
- `fills`
- `motifs`
- `geometry`
- `shader`
- `assetPacket`
- `sharpness`
- `fidelity`
- `routeDiagnostics`
- `expansion`
- `godotArtifact`
- `godotShader`
- `phaserPipeline`
- `png`

### 4.5 PB-SHADER-v1

Use `PB-SHADER-v1` for portable shader behavior.

Shaders consume geometry masks and runtime state. They do not invent geometry.

Entry points:

```js
import {
  createShaderPacket,
  validateShaderPacket,
  hashShaderPacket,
} from './shader-packet.js';
```

Shader Forge white paper:

```text
docs/scholomance-encyclopedia/Scholomance White Papers/SHADER_FORGE_WHITE_PAPER.md
```

### 4.6 Construction Skeleton

Use `PB-CONSTRUCTION-SKELETON-v1` when an asset has structural guides:

- center
- axes
- rings
- radials
- anchors
- bounds

Entry point:

```js
import { applyConstructionLines } from './construction-line-microprocessor.js';
```

Example:

```js
const construction = applyConstructionLines([], {
  version: 'construction-v1',
  center: { x: 32, y: 32 },
  rings: [
    { radius: 5, role: 'top-crystal' },
    { radius: 9, role: 'core-orb' },
  ],
  radials: { count: 8, offsetDegrees: 22.5 },
  axes: true,
});

console.log(construction.skeleton.contract);
// PB-CONSTRUCTION-SKELETON-v1
```

Construction cells may be exported to reference layers. They do not count as final art unless explicitly promoted.

### 4.7 Shape Grammar Expansion

Use `PB-SHAPE-GRAMMAR-v1` when high-level class intent expands into required outputs and route seams.

Entry point:

```js
import { expandShapeGrammar } from './shape-grammar-engine.js';
```

Current implemented class route:

```text
armor.chestplate.sovereign-v1
```

The route declares required outputs before validation:

- pauldron cells
- pauldron material slots
- required heraldry cells
- shader target masks

---

## 5. Common Agent Recipes

### 5.1 Forge the Canonical VOID Chestplate

```js
import {
  buildVoidChestplateSpec,
} from '../../../scripts/generate-void-chestplate.mjs';

import { forgeItemAsset } from '../../../codex/core/pixelbrain/item-foundry.js';

const bundle = forgeItemAsset(buildVoidChestplateSpec(), {
  includeShader: true,
  includePng: true,
});

if (!bundle.routeDiagnostics.ok) {
  throw new Error(JSON.stringify(bundle.routeDiagnostics.failures, null, 2));
}
```

Expected checks:

```js
bundle.assetPacket.geometry.coordinates.length > 0;
bundle.geometry.masks.center_core.length > 0;
bundle.construction.skeleton.contract === 'PB-CONSTRUCTION-SKELETON-v1';
bundle.expansion.contract === 'PB-SHAPE-GRAMMAR-v1';
bundle.routeDiagnostics.ok === true;
```

### 5.2 Add a New Material

Edit:

```text
codex/core/pixelbrain/material-registry.js
```

Rules:

- Define anchors, not isolated colors.
- Preserve `source` as pass-through.
- Add tests for color resolution and registry validation.
- Make sure every emitted final color can be traced to registry authority or a documented deterministic blend.

Do not hardcode material colors in Foundry stages if registry anchors can represent them.

### 5.3 Add a New Part Profile

Edit:

```text
codex/core/pixelbrain/part-profile-library.js
```

Rules:

- Return deterministic cells.
- Use integer coordinates.
- Respect canvas bounds.
- Use profile params, attach anchors, and deterministic math.
- Add focused tests through `forgeItemAsset` or `composeSilhouette`.

Profiles define shape. They do not define final color authority.

### 5.4 Add a New AMP

Before implementation, define:

- what it consumes
- what it emits
- whether it mutates an authority
- what it validates
- what failures are fatal
- whether output affects canonical geometry or only presentation

Then add a seam descriptor if the AMP participates in routed generation.

Example seam:

```js
{
  id: 'my-amp-v1',
  processor: 'pixelbrain.myAmp',
  version: '1.0.0',
  consumes: ['fills.coordinates', 'silhouette.partOf'],
  emits: ['fills.myAmp'],
  mutates: ['fills.coordinates'],
  validates: ['required target cells > 0'],
}
```

If two processors mutate the same authority, the later processor must declare an ordered merge contract.

### 5.5 Add a New Item Class

Add or extend a factory:

```text
codex/core/pixelbrain/factory/
```

Expected pattern:

```text
normalize ITEM-SPEC-v1
  -> construction skeleton
  -> shape grammar expansion
  -> class factory route
  -> seam validation
  -> required output validation
  -> asset packet/export
```

Do not keep class-specific expectations inside one generic foundry blob if the behavior is specific to armor, shields, jewelry, weapons, or another class.

### 5.6 Export to Aseprite

Use the bridge:

```js
import {
  exportFoundryToAseprite,
  exportFoundryToAsepriteBinary,
  importAsepriteToFoundryAsset,
} from './foundry-aseprite-bridge.js';
```

Rules:

- Reference layers are non-final.
- Locked reference/final-preview layers must not duplicate final coordinates on re-import.
- Editable layers preserve part metadata where possible.
- Native `.aseprite` binary output should be deterministic.

### 5.7 Work in the Template Editor

The template editor edits lattice state directly.

Use:

```text
src/pages/PixelBrain/components/TemplateEditor.jsx
codex/core/pixelbrain/template-grid-engine.js
src/lib/pixelbrain.adapter.js
```

Rules:

- Paint/erase/fill operations must change grid cells, not preview pixels.
- Export must derive from grid state.
- Imported 1:1 assets should preserve exact coordinates and colors.
- Keep keyboard and accessibility behavior intact when changing UI.

---

## 6. Route and Failure Semantics

### 6.1 How Routes Work

Routes are declared in class factories. The armor chestplate route is the current reference implementation.

```js
import { forgeArmor } from './factory/armor-factory.js';
import { executeRoute } from './microprocessor-route.js';

const { routeDefinition } = forgeArmor(spec, construction);
const result = executeRoute(routeDefinition, context);
```

The route validator checks:

- every consumed artifact was emitted earlier or is a base input
- no processor emits a shadow copy of an already owned authority
- repeated mutation requires a merge contract
- every required output has a responsible emitting processor
- final required outputs exist

### 6.2 Required Outputs

Supported required output kinds:

```ts
'partCells'
'materialSlot'
'motifCells'
'heraldryCells'
'shaderMask'
'constructionAnchor'
```

Example:

```js
{
  id: 'center_core-shader-mask',
  kind: 'shaderMask',
  selector: 'center_core',
  minCells: 1,
  fatal: true,
}
```

### 6.3 How to Interpret Route Failures

Typical failure:

```js
{
  code: 'PB_ROUTE_REQUIRED_OUTPUT_EMPTY',
  route: 'armor.chestplate.sovereign-v1',
  step: 'GeometryAMP',
  seam: 'geometry-mask-v1',
  requiredOutput: 'center_core-shader-mask',
  selector: 'center_core',
  message: 'Required shader target part center_core missing.'
}
```

Debug order:

1. Read `route`, `step`, and `seam`.
2. Check the required output selector.
3. Inspect whether the upstream processor emitted the expected cells/material/mask.
4. Fix the source stage, not the final renderer.

Do not patch failures by injecting fake cells in the export layer.

---

## 7. Testing Expectations

### 7.1 Focused Tests

Use these for route/foundry/armor work:

```bash
npx vitest run tests/core/pixelbrain/shape-grammar-router.test.js
npx vitest run tests/core/pixelbrain/void-chestplate.test.js
npx vitest run tests/core/pixelbrain/item-foundry.test.js
npx vitest run tests/core/pixelbrain/construction-line-microprocessor.test.js
```

### 7.2 Editor and Aseprite Tests

Use these for template editor/export changes:

```bash
npx vitest run tests/qa/generation/pixelbrain-aseprite-export.test.js
npx vitest run tests/core/pixelbrain/foundry-aseprite-bridge.test.js
npx vitest run tests/core/pixelbrain/pixelbrain-editor-asset-import.test.js
```

### 7.3 Broader PixelBrain QA

Use when changing core packets, adapters, imports, or shared coordinate behavior:

```bash
npx vitest run tests/qa/pixelbrain
```

### 7.4 Determinism Assertions

When adding generation behavior, test repeated output:

```js
const a = forgeItemAsset(spec);
const b = forgeItemAsset(spec);

expect(JSON.stringify(a.assetPacket)).toBe(JSON.stringify(b.assetPacket));
expect(a.godotArtifact).toBe(b.godotArtifact);
expect(a.shader?.hash).toBe(b.shader?.hash);
expect(Buffer.compare(a.png, b.png)).toBe(0);
```

When the output changes intentionally, update tests with a clear reason.

---

## 8. Anti-Patterns

Avoid these. They usually indicate a PixelBrain law violation.

### 8.1 Screenshot as Source

Bad:

```text
Canvas screenshot -> crop -> treat as canonical asset
```

Good:

```text
Template grid / asset packet coordinates -> render preview -> export
```

### 8.2 Shader Invents Geometry

Bad:

```text
Missing center core -> shader draws fake glowing orb
```

Good:

```text
GeometryAMP mask missing -> route fails -> fix silhouette/profile/spec
```

### 8.3 Silent Missing Materials

Bad:

```js
color = part.fill?.material || '#000000';
```

Good:

```text
required materialSlot fails if fill resolves null
```

Use fallback colors only when the contract explicitly defines them as non-authoritative safety behavior.

### 8.4 Parallel Schema

Bad:

```js
const myPixelAsset = { pixels: [], size: 64 };
```

Good:

```js
createPixelBrainAssetPacket({ canvas, coordinates, palettes });
```

### 8.5 UI Becomes Authority

Bad:

```text
DOM state -> canonical geometry
```

Good:

```text
Template grid state -> canonical geometry -> DOM/canvas preview
```

---

## 9. Agent Decision Tree

Use this before editing.

### 9.1 I Need to Display an Asset

Use:

```text
PixelBrainAssetPacket -> derivePixelBrainRenderPacket -> UI preview
```

Do not mutate source coordinates for display-only transforms.

### 9.2 I Need to Generate an Item

Use:

```text
ITEM-SPEC-v1 -> forgeItemAsset
```

For armor chestplates, check:

```js
bundle.routeDiagnostics.ok
bundle.expansion.contract
bundle.geometry.masks
```

### 9.3 I Need to Edit Pixel Art

Use:

```text
TemplateEditor + template-grid-engine
```

The grid is authority. Canvas is preview.

### 9.4 I Need to Export

Use an existing bridge:

- `derivePixelBrainExportPacket`
- `createPixelBrainArtifact`
- `exportFoundryToAseprite`
- `exportFoundryToAsepriteBinary`
- `exportToGodotShader`
- `exportToPhaserPipeline`

Do not invent a new export payload unless the existing bridge cannot express the target and a PDR/schema update exists.

### 9.5 I Need to Add Runtime Visual Effects

Use:

```text
PB-SHADER-v1
```

Shaders consume final masks and runtime uniforms. They do not repair generation.

### 9.6 I Need to Fix a Broken Asset

Work backward:

```text
failure diagnostic
  -> route step/seam
  -> required output selector
  -> AMP/profile/material/spec source
  -> test
```

Do not fix broken assets in the renderer unless the renderer itself is wrong.

---

## 10. Minimum Competency Checklist

Before an agent claims a PixelBrain change is complete:

- [ ] Canonical geometry remains lattice coordinates.
- [ ] No nondeterminism was introduced.
- [ ] Existing packet contracts are used before new schemas.
- [ ] Required structure fails loudly.
- [ ] Shader output is presentation, not geometry authority.
- [ ] Materials resolve through registry authority.
- [ ] Source packets are not mutated by render transforms.
- [ ] Export paths derive from packets or grids, not screenshots.
- [ ] Focused tests pass.
- [ ] Lint passes for touched files.
- [ ] PDR/PIR/docs are updated when the change is architectural or behavioral.

---

## 11. Current Maturity Map

| Area | Status | Notes |
|---|---|---|
| Asset packet connective tissue | Strong | Source/render/export packet separation exists. |
| Template editor lattice work | Strong | Grid editing, import/export, and 1:1 Aseprite path exist. |
| Shader Forge | Strong | `PB-SHADER-v1`, WebGL preview, Godot and Phaser exporters exist. |
| Item Foundry weapon path | Stable | Scimitar golden tests pin deterministic output. |
| Armor chestplate path | Strong | Shape grammar route, loud failures, construction skeleton, GeometryAMP masks, fidelity pipeline. |
| Construction lines | Implemented | Emits reference cells and `PB-CONSTRUCTION-SKELETON-v1`. |
| Aseprite bridge | Implemented | Foundry and editor export/import paths exist. |
| Shield factory | Early hook | Behavior preserved; needs full class-specific grammar route. |
| Jewelry factory | Early hook | Behavior preserved; needs full class-specific grammar route. |
| Universal item generation | In progress | Architecture is ready; class grammars must be expanded. |

---

## 12. Quick Reference Commands

Focused route/foundry verification:

```bash
npx vitest run tests/core/pixelbrain/shape-grammar-router.test.js tests/core/pixelbrain/void-chestplate.test.js tests/core/pixelbrain/item-foundry.test.js
```

Construction verification:

```bash
npx vitest run tests/core/pixelbrain/construction-line-microprocessor.test.js
```

Aseprite/editor verification:

```bash
npx vitest run tests/qa/generation/pixelbrain-aseprite-export.test.js tests/core/pixelbrain/foundry-aseprite-bridge.test.js
```

Broad QA:

```bash
npx vitest run tests/qa/pixelbrain
```

Targeted lint example:

```bash
npx eslint codex/core/pixelbrain/item-foundry.js codex/core/pixelbrain/seam-contract.js --quiet
```

Encyclopedia hygiene after doc changes:

```bash
node docs/scholomance-encyclopedia/tools/audit-hygiene.mjs
```

---

## 13. Final Operating Principle

When unsure, ask:

```text
What is the authoritative lattice?
Which contract owns it?
Which deterministic processor changed it?
Which test proves the output cannot silently lie?
```

If those four answers are clear, the PixelBrain change is probably aligned with the system. If any answer is vague, stop and tighten the contract before adding behavior.
