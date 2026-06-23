# PixelBrain Connective Tissue White Paper and Instruction Manual

**Date:** 2026-06-11  
**Applies To:** PixelBrain asset packets, palette authority, material transmutation, operation pipeline, shader uniforms, TemplateEditor packet bridge, Pixel Lotus layer interop  
**Implementation PDR:** [`2026-06-11-pixelbrain-connective-tissue-seven-systems-pdr.md`](../PDR-archive/2026-06-11-pixelbrain-connective-tissue-seven-systems-pdr.md)  
**Implementation PIR:** [`PIR-20260611-PIXELBRAIN-CONNECTIVE-TISSUE-SEVEN-SYSTEMS.md`](../post-implementation-reports/PIR-20260611-PIXELBRAIN-CONNECTIVE-TISSUE-SEVEN-SYSTEMS.md)  

---

## 1. Purpose

PixelBrain now has a canonical exchange layer. Before this implementation, each feature path carried its own local version of the same ideas: `coordinates`, `palettes`, `canvas`, `formula`, `bytecode`, `material`, `template`, and export payloads. Those shapes were similar enough to be tempting and different enough to be dangerous.

This white paper explains the working system after the connective-tissue implementation:

- How to construct a canonical PixelBrain asset.
- How preview/render output is derived.
- How material transmutation is applied without overwriting the source asset.
- How bytecode and named color palette authority is resolved.
- How operation stages can be run through a microprocessor.
- How Shader Forge receives PixelBrain runtime state.
- How TemplateEditor can commit a lattice as an active PixelBrain asset.
- How Pixel Lotus actor layers can exchange metadata with PixelBrain packets.

The intended reader is a developer, QA engineer, or future agent implementing PixelBrain features without breaking the boundary between source data, render data, and export data.

---

## 2. System Map

The implemented flow is:

```text
Upload | VerseIR | WAND | Sketch | TemplateEditor | Pixel Lotus
  ↓
PixelBrainAssetPacket
  ↓
PixelBrainRenderPacket
  ↓
Preview | Photonic Route | Shader Forge | JSON Export | Godot Helper | Pixel Lotus Layer
```

The important design decision is that source and render are separate:

- A source packet preserves the asset's original coordinates, palette, bytecode, formula, template state, material identity, and provenance.
- A render packet is derived from the source packet and may apply material transmutation, palette transformation, or view-specific data.
- An export packet is derived from the render packet and is target-specific.

Do not treat these as interchangeable aliases.

---

## 3. Working Feature Inventory

### 3.1 PixelBrain Asset Packet Contract

**File:** `codex/core/pixelbrain/pixelbrain-asset-packet.js`

Working exports:

- `createPixelBrainAssetPacket(input)`
- `normalizePixelBrainAssetPacket(input)`
- `normalizePixelBrainCanvas(canvas)`
- `normalizePixelBrainCoordinate(coord)`
- `normalizePixelBrainPalettes(palettes)`
- `assertPixelBrainAssetPacket(packet)`
- `derivePixelBrainRenderPacket(packet, options)`
- `derivePixelBrainExportPacket(packet, target, options)`

The packet kind is:

```js
'pixelbrain.asset.v1'
```

The packet schema version is:

```js
1
```

Minimum practical input:

```js
const packet = createPixelBrainAssetPacket({
  canvas: { width: 160, height: 144, gridSize: 1 },
  coordinates: [{ x: 10, y: 12, color: '#FFF4B8' }],
  palettes: [{ key: 'source', colors: ['#FFF4B8', '#190402'] }],
});
```

Important normalized packet sections:

- `source`: where the asset came from.
- `canvas`: width, height, cell size, grid size, transparency, background.
- `geometry`: coordinate list and optional template cells.
- `palette`: source, semantic, material, byte map, authority.
- `formula`: optional formula object.
- `bytecode`: raw bytecode and parsed components.
- `template`: grid type, symmetry axes, slots, fill state.
- `material`: material id, registry version, variant, parameters.
- `chromatic`: transform id and diagnostics.
- `photonic`: route and status references.
- `provenance`: creation path and operations.
- `metadata`: tags, notes, compatibility markers.

Packet ids are deterministic from stable source, canvas, coordinate count, palette, bytecode, and material seed data unless an explicit `id` is supplied.

### 3.2 Render Packet Derivation

Render packets are produced by:

```js
const renderPacket = derivePixelBrainRenderPacket(packet, {
  material: 'icy_fire',
});
```

The render packet kind is:

```js
'pixelbrain.render.v1'
```

Render packet output includes:

- `coordinates`: material-transformed coordinate colors.
- `palettes`: material-transformed palette records.
- `canvas`: source canvas.
- `formula`: source formula.
- `bytecode`: source bytecode.
- `material`: render material identity.
- `chromatic`: transform metadata.

Source packet coordinates are not mutated. If a source coordinate color is `#FFF4B8` and the render material is `icy_fire`, the render coordinate may become `#F8FCFF`, but the source packet remains unchanged.

### 3.3 Export Packet Derivation

Export packets are produced by:

```js
const exportPacket = derivePixelBrainExportPacket(packet, 'json', {
  material: 'icy_fire',
});
```

The export packet kind is:

```js
'pixelbrain.export.v1'
```

The current export packet is a structured target payload. It carries:

- target name.
- render packet id.
- canvas.
- render coordinates.
- render palettes.
- formula.
- raw bytecode.
- material identity.
- metadata linking back to the source packet.

This is not yet a PNG encoder. PixelBrainPage still serializes PNG output through canvas, but it uses render-packet coordinates as its source of truth.

---

## 4. Material Registry

**File:** `codex/core/pixelbrain/material-registry.js`

Working exports:

- `SOURCE_MATERIAL`
- `MATERIAL_REGISTRY_VERSION`
- `MATERIAL_PALETTES`
- `MATERIAL_OPTIONS`
- `clamp01(value)`
- `hexToRgb(hex)`
- `luminanceFromRgb(rgb)`
- `resolveMaterialId(material)`
- `getMaterialDefinition(material)`
- `transmuteMaterialColor(hex, material)`
- `transmuteMaterialPalette(sourcePalette, material)`
- `transmuteMaterialPalettes(palettes, material)`
- `transmuteMaterialCoordinates(coordinates, material)`

Supported material ids:

- `source`
- `icy_fire`
- `shadow_fire`
- `holy_fire`
- `poison_flame`
- `void_ice`

### 4.1 Source Material

`source` is a pass-through material. Use it when the asset should display with its original palette and coordinate colors.

```js
transmuteMaterialColor('#FF3300', 'source'); // '#FF3300'
```

### 4.2 Icy Fire

`icy_fire` is luminance anchored. It is not a simple hue shift. Bright source values map to white or blue-white anchors, midtones map to cyan/ice blue, and low values map to deep cold shadow.

Expected behavior:

- Bright yellow/cream becomes white core.
- Orange/red midtone becomes cold body blue.
- Dark red/brown becomes near-black shadow.
- Shape and alpha-preserving assumptions remain intact.

### 4.3 Material Extension Pattern

To add a new material:

1. Add a new entry in `MATERIAL_PALETTES`.
2. Give it an `id`, `label`, `anchors`, and `rules`.
3. Ensure `resolveMaterialId()` can resolve the key by virtue of the entry existing.
4. Add focused tests for representative low, middle, and high luminance source colors.

Material transforms must remain deterministic. Do not use `Math.random()` in material resolution.

---

## 5. Chromatic Transmutation AMP Compatibility

**File:** `src/pages/PixelBrain/amps/chromaticTransmutationAmp.js`

This file is now a compatibility wrapper over the core material registry. Existing imports continue to work:

- `CHROMATIC_MATERIAL_OPTIONS`
- `SOURCE_MATERIAL`
- `MATERIAL_PALETTES`
- `hexToRgb`
- `luminanceFromRgb`
- `transmutePaletteColor`
- `transmutePixelBrainPalette`
- `transmutePixelBrainPalettes`
- `transmutePixelBrainCoordinates`
- `buildChromaticTransmutationPayload`

Use this file from PixelBrain page-level UI code. Use `codex/core/pixelbrain/material-registry.js` from core logic and tests.

The compatibility payload remains useful for UI telemetry:

```js
const payload = buildChromaticTransmutationPayload({
  sourcePalettes,
  sourceCoordinates,
  material: 'icy_fire',
});
```

It returns:

- `amp`
- `version`
- `intent`
- `material`
- `sourcePalette`
- `outputPalette`
- `sourcePalettes`
- `outputPalettes`
- `sourceCoordinates`
- `outputCoordinates`
- `colorMap`

The canonical render path should prefer `derivePixelBrainRenderPacket()`.

---

## 6. Palette Authority Bridge

**File:** `codex/core/pixelbrain/palette-authority-bridge.js`

Working export:

```js
resolvePixelBrainPaletteAuthority(input)
```

The bridge resolves palette data from:

- named color or known color microprocessor input.
- explicit source palette.
- bytecode semantic palette.
- material transformation.

Example:

```js
const authority = resolvePixelBrainPaletteAuthority({
  bytecode: 'VW-VOID-RARE-HARMONIC',
  material: 'void_ice',
});
```

Returned fields:

- `ok`
- `authority`
- `materialId`
- `namedColor`
- `bytecodePalette`
- `sourcePalette`
- `semanticPalette`
- `materialPalette`
- `byteMap`
- `diagnostics`

Byte maps follow the existing PixelBrain contract:

```js
{
  0: '#color0',
  1: '#color1'
}
```

They are index-to-color maps, not color-to-index maps.

---

## 7. Operation Pipeline

**File:** `codex/core/pixelbrain/pixelbrain-operation-pipeline.js`

Working export:

```js
runPixelBrainOperationPipeline(input, context)
```

Working microprocessor id:

```js
'pixelbrain.pipeline.run'
```

Adapter usage:

```js
const result = await runPixelBrainPipeline({
  packet,
  stages: [
    { id: 'templatize', options: { bands: 4 } },
    { id: 'fill', options: { bytecode: 'VW-WILL-RARE-HARMONIC' } },
    { id: 'material', options: { material: 'holy_fire' } },
    { id: 'export', options: { target: 'json' } },
  ],
});
```

Microprocessor usage:

```js
const result = await processorBridge.execute('pixelbrain.pipeline.run', {
  coordinates: [{ x: 0, y: 0, color: '#FFFFFF' }],
  stages: ['normalize'],
});
```

### 7.1 Supported Stages

`packet`  
Normalizes input into a `PixelBrainAssetPacket`.

`normalize`  
Normalizes the current packet again. Useful as a stable validation step.

`templatize`  
Runs the template/fill bridge `templatize()` and stores slot information in the packet template section.

`fill`  
Runs `fillTemplate()` with bytecode and updates geometry coordinates plus template fill state.

`palette`  
Runs `resolvePixelBrainPaletteAuthority()` and updates packet palette authority data.

`material`  
Updates packet material identity and chromatic transform id.

`routePhotonic`  
Uses `context.routePhotonic` if supplied. If no route function is supplied, the stage is skipped without failing.

`export`  
Produces an export packet. If `context.exportPacket` is supplied, the callback can override export handling; otherwise the default export packet is returned in `result.exportPacket`.

### 7.2 Pipeline Result

The pipeline returns:

```js
{
  ok,
  packet,
  renderPacket,
  exportPacket,
  diagnostics
}
```

Diagnostics include:

- `stageId`
- `status`
- `code`
- `message`
- `inputHash`
- `outputHash`
- `warnings`
- `errors`
- `durationMs`
- `metadata`

Expected invalid stage options should be represented as diagnostics where practical. Unexpected exceptions become `PIPELINE_STAGE_FAILED` diagnostics.

---

## 8. Shader Uniform Provider

**File:** `codex/core/pixelbrain/pixelbrain-shader-uniform-providers.js`

Working exports:

- `PIXELBRAIN_SHADER_UNIFORM_PROVIDER_ID`
- `resolvePixelBrainShaderUniforms(context)`
- `registerPixelBrainShaderUniformProvider()`

The provider id is:

```js
'pixelbrain-state'
```

PixelBrainPage registers it once on mount. Shader Forge receives PixelBrain runtime state through the existing shader uniform registry.

Resolved uniforms:

- `u_pixelbrain_material`
- `u_pixelbrain_palette_count`
- `u_pixelbrain_is_template`
- `u_pixelbrain_wand_present`
- `u_pixelbrain_photonic_ready`
- `u_pixelbrain_fill_school`
- `u_pixelbrain_fill_rarity`
- `u_pixelbrain_fill_effect`

Runtime context shape:

```js
{
  packet,
  assetPacket,
  renderPacket,
  wandFillSpec,
  photonicRoute,
  schoolIndex
}
```

This provider intentionally emits conservative scalar values. Shader authors can branch on material, template state, WAND presence, or photonic readiness without importing PixelBrain page state.

---

## 9. TemplateEditor Asset Bridge

**Core file:** `codex/core/pixelbrain/template-grid-asset-bridge.js`  
**UI file:** `src/pages/PixelBrain/components/TemplateEditor.jsx`

Working export:

```js
templateGridToPixelBrainAssetPacket(grid, options)
```

The bridge converts a mutable template grid into a canonical asset packet:

- grid cells become packet geometry coordinates.
- grid cells are preserved as `geometry.cells`.
- grid dimensions become packet canvas.
- grid type and symmetry axes become packet template metadata.
- source kind becomes `template-editor`.

TemplateEditor now has a working button:

```text
COMMIT_AS_ASSET_PACKET
```

When clicked, it:

1. Reads the current grid from `gridRef`.
2. Converts it with `templateGridToPixelBrainAssetPacket()`.
3. Calls the `onCommitAsset(packet)` prop.
4. PixelBrainPage loads the packet as the active preview asset.

This means a user can paint in the lattice editor and commit that authored grid into the same active asset/render path used by upload and VerseIR-derived PixelBrain content.

---

## 10. PixelBrainPage Integration

**File:** `src/pages/PixelBrain/PixelBrainPage.jsx`

PixelBrainPage now constructs:

```js
assetPacket
pixelBrainRenderPacket
chromaticPayload
```

The important runtime rule:

```text
source UI state -> assetPacket -> pixelBrainRenderPacket -> preview/export/photonic/shader state
```

Working behavior:

- Upload path still analyzes and traces images.
- VerseIR synthesis still loads coordinates/palettes/canvas.
- Plain instruction morph still edits loaded coordinates.
- Sketch commit still creates a template-like asset from silhouette output.
- WAND bytecode pull still populates fill selectors.
- WAND geometry pull still loads procedural geometry as a template.
- Template/fill still templatizes and fills coordinates.
- Chromatic material select now affects the render packet.
- Preview canvas draws render coordinates.
- Photonic routing receives render coordinates and palettes.
- Shader Forge runtime state receives asset packet and render packet.
- JSON export includes `pixelBrainAssetPacket` and `pixelBrainRenderPacket`.
- Terminal payloads include packet data even when the active asset came from TemplateEditor rather than upload or VerseIR.

---

## 11. Pixel Lotus Interop

**File:** `src/pixel-lotus/actor-forge/pixelbrainLayerBridge.ts`

Working exports:

- `pixelBrainPacketToPixelLotusLayer(packet, options)`
- `pixelLotusLayerToPixelBrainPacket(layer, options)`

PixelBrain packet to layer:

```ts
const layer = pixelBrainPacketToPixelLotusLayer(packet, {
  slot: 'robe',
  zIndex: 4,
  opacity: 0.75,
});
```

The layer receives:

- `id`
- `slot`
- `assetId`
- `visible`
- `locked`
- `zIndex`
- `opacity`
- `paletteId`
- `materialId`
- `blendMode`

Layer to PixelBrain packet:

```ts
const packet = pixelLotusLayerToPixelBrainPacket(layer, {
  coordinates,
  colors,
});
```

The reverse path creates a canonical PixelBrain asset packet with:

- source kind `pixel-lotus`.
- layer id and slot metadata.
- optional coordinates.
- optional colors.
- material id from the Pixel Lotus layer.

This bridge is metadata interop. It is not yet a full actor build compiler.

---

## 12. Adapter Boundary

**File:** `src/lib/pixelbrain.adapter.js`

The React/UI surface should prefer these adapter exports:

- `createPixelBrainAssetPacket`
- `normalizePixelBrainAssetPacket`
- `derivePixelBrainRenderPacket`
- `derivePixelBrainExportPacket`
- `resolvePixelBrainPaletteAuthority`
- `templateGridToPixelBrainAssetPacket`
- `registerPixelBrainShaderUniformProvider`
- `resolvePixelBrainShaderUniforms`
- `runPixelBrainPipeline`

Core modules may import core modules directly. Page components should use the adapter unless they are local PixelBrain AMP compatibility modules.

---

## 13. Instruction Manual

### 13.1 Create a Canonical Asset from Coordinates

Use this when a feature generates sparse pixel coordinates:

```js
const packet = createPixelBrainAssetPacket({
  source: { kind: 'generated', label: 'Generated asset' },
  canvas: { width: 160, height: 144, gridSize: 1 },
  coordinates: [
    { x: 10, y: 12, color: '#FFFFFF' },
    { x: 11, y: 12, color: '#101010' },
  ],
  palettes: [{ key: 'source', colors: ['#FFFFFF', '#101010'] }],
});
```

Then render:

```js
const render = derivePixelBrainRenderPacket(packet, { material: 'source' });
```

Then consume:

```js
render.coordinates.forEach((coord) => {
  // draw coord.x, coord.y, coord.color
});
```

### 13.2 Render the Same Asset as Icy Fire

```js
const render = derivePixelBrainRenderPacket(packet, { material: 'icy_fire' });
```

Use `render.coordinates` and `render.palettes`. Do not rewrite `packet.geometry.coordinates` manually.

### 13.3 Run a Fill Pipeline

```js
const result = runPixelBrainOperationPipeline({
  packet,
  stages: [
    { id: 'templatize', options: { bands: 4 } },
    { id: 'fill', options: { bytecode: 'VW-WILL-RARE-HARMONIC', bands: 4 } },
    { id: 'material', options: { material: 'holy_fire' } },
  ],
});
```

Check:

```js
if (!result.ok) {
  console.error(result.diagnostics);
}
```

Use:

```js
result.packet
result.renderPacket
```

### 13.4 Resolve Palette Authority from Bytecode

```js
const authority = resolvePixelBrainPaletteAuthority({
  bytecode: 'VW-VOID-RARE-HARMONIC',
  material: 'void_ice',
});
```

Use:

```js
authority.sourcePalette
authority.materialPalette
authority.byteMap
```

Remember: `byteMap[0]` returns a color.

### 13.5 Register Shader Uniforms

```js
registerPixelBrainShaderUniformProvider();
```

Resolve through the existing shader uniform registry:

```js
const resolved = resolveShaderUniforms({
  packet,
  renderPacket,
  wandFillSpec,
  photonicRoute,
});
```

Expected:

```js
resolved.uniforms.u_pixelbrain_material
resolved.uniforms.u_pixelbrain_palette_count
resolved.uniforms.u_pixelbrain_is_template
```

### 13.6 Commit a Template Grid to PixelBrain

In UI, use `COMMIT_AS_ASSET_PACKET`.

In code:

```js
const packet = templateGridToPixelBrainAssetPacket(grid, {
  label: 'hexagonal lattice template',
});
```

Then load packet coordinates:

```js
setCoordinates(packet.geometry.coordinates);
setPalettes(packet.palette.sourcePalette);
setPixelCanvas(packet.canvas);
```

### 13.7 Convert PixelBrain Packet to Pixel Lotus Layer

```ts
const layer = pixelBrainPacketToPixelLotusLayer(packet, {
  slot: 'robe',
  zIndex: 2,
});
```

Use this when a PixelBrain asset should become a layer in an actor build.

### 13.8 Convert Pixel Lotus Layer Back to PixelBrain

```ts
const packet = pixelLotusLayerToPixelBrainPacket(layer, {
  coordinates,
  colors,
});
```

Use this when a Pixel Lotus layer should be edited or rendered through PixelBrain tooling.

---

## 14. Troubleshooting

### Problem: Material select changes UI text but not preview color

Check that the preview is consuming:

```js
pixelBrainRenderPacket.coordinates
```

not:

```js
assetPacket.geometry.coordinates
```

Source packet coordinates do not change when material changes.

### Problem: A pipeline stage appears to run but coordinates do not change

Check the stage output packet's `geometry.coordinates`. The operation pipeline must update nested `geometry.coordinates`; top-level `coordinates` alone can be ignored during normalization because canonical packets prioritize `geometry.coordinates`.

This issue is fixed in the implemented pipeline for `templatize` and `fill`.

### Problem: Byte map lookup by color returns undefined

That is expected. The byte map is index-to-color:

```js
byteMap[0] // '#FFFFFF'
```

It is not:

```js
byteMap['#FFFFFF'] // unsupported
```

### Problem: Shader uniform is missing

Confirm:

1. `registerPixelBrainShaderUniformProvider()` has run.
2. `resolveShaderUniforms()` receives `packet` or `assetPacket`.
3. `renderPacket` is supplied if palette/material render state matters.

### Problem: TemplateEditor commit emits an empty asset

Confirm the grid has painted cells. The bridge converts existing layer cells. An empty grid produces an empty coordinate list.

### Problem: Pixel Lotus layer lacks palette id

The PixelBrain packet must have at least one source palette with a `key`. Otherwise `paletteId` may be undefined.

---

## 15. QA Reference

Focused verification command:

```bash
npx vitest run tests/core/pixelbrain/pixelbrain-connective-tissue.test.js tests/pixel-lotus/pixelbrain-layer-bridge.test.ts tests/pages/pixelbrain-chromatic-transmutation-amp.test.js
```

Lint verification command:

```bash
npx eslint codex/core/pixelbrain/material-registry.js codex/core/pixelbrain/pixelbrain-asset-packet.js codex/core/pixelbrain/palette-authority-bridge.js codex/core/pixelbrain/template-grid-asset-bridge.js codex/core/pixelbrain/pixelbrain-shader-uniform-providers.js codex/core/pixelbrain/pixelbrain-operation-pipeline.js src/pages/PixelBrain/amps/chromaticTransmutationAmp.js src/pages/PixelBrain/PixelBrainPage.jsx src/pages/PixelBrain/components/TemplateEditor.jsx src/pixel-lotus/actor-forge/pixelbrainLayerBridge.ts tests/core/pixelbrain/pixelbrain-connective-tissue.test.js tests/pixel-lotus/pixelbrain-layer-bridge.test.ts --quiet
```

Documentation hygiene:

```bash
node docs/scholomance-encyclopedia/tools/audit-hygiene.mjs
```

---

## 16. Extension Rules

When adding a new PixelBrain source:

1. Convert source data into `createPixelBrainAssetPacket()`.
2. Do not invent a separate page-local payload if the packet can represent it.
3. Preserve source coordinates and palettes.
4. Render through `derivePixelBrainRenderPacket()`.
5. Export through a target-specific derivation or a helper that consumes render-packet output.
6. Add a focused test for the new source bridge.

When adding a new material:

1. Add the material to `material-registry.js`.
2. Add luminance anchor tests.
3. Verify the chromatic AMP compatibility wrapper still exposes it in `CHROMATIC_MATERIAL_OPTIONS`.
4. Verify JSON export preserves material identity.

When adding a new pipeline stage:

1. Keep the stage pure.
2. Return a normalized asset packet for packet-transforming stages.
3. Return an export packet only for export stages.
4. Add diagnostics for expected failure modes.
5. Add microprocessor tests if the stage should be invoked through `pixelbrain.pipeline.run`.

When adding shader uniforms:

1. Add the value to `resolvePixelBrainShaderUniforms()`.
2. Add the uniform name to the provider list.
3. Keep outputs scalar unless the shader runtime has proven support for arrays/vectors.
4. Add registry resolution tests.

---

## 17. Final Contract

The working contract is:

```text
PixelBrainAssetPacket is source truth.
PixelBrainRenderPacket is visual truth.
PixelBrainExportPacket is target truth.
Material registry is chromatic truth.
Palette authority bridge is palette truth.
Operation pipeline is stage truth.
Shader uniform provider is shader-state truth.
Template grid bridge is lattice-authoring truth.
Pixel Lotus bridge is actor-layer interop truth.
```

Breaking this separation is the main way future PixelBrain work will regress.

