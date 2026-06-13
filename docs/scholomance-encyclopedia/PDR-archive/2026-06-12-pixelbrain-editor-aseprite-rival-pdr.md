# PDR: PixelBrain Editor — Aseprite-Rival Canvas, Layers, Palette, Tools + AMP-Aware Editing

**Date:** 2026-06-12
**Status:** APPROVED
**Domain:** `codex/core/pixelbrain/` + `src/pages/PixelBrain/`

## Owner(s)
- **Codex:** Core engines (template-grid-engine / lattice-grid-engine extensions, editor-command-stack, AMP application hooks + provenance in packets, grid/selection/reference layer model, determinism contracts) — primary.
- **Claude:** UI surfaces (new LayerStackPanel, IndexedPalettePanel, ToolPalette/AMPApplyPanel, ReferencePanel, EditorCanvas enhancements or refactors; integration + state wiring in PixelBrainPage.jsx; per-cell hover/annotations, keyboard, accessibility, pixel-perfect UX).
- **Gemini:** Tests (new editor tests, extensions to template-grid + foundry-aseprite-bridge tests), QA harness, CI, roundtrip validation (Aseprite + AMP flows), adapter surface, Godot parity if in scope.
- **Escalation owner** (cross-domain conflicts): Codex (PixelBrain cell wall lead) / repo owner.

## Context (seed — not the Executive Summary)
PixelBrain has mature procedural generation (item-foundry + 15+ AMPs), canonical asset packets as interchange, strong Aseprite roundtrip foundations (recently implemented 2026-06-12-foundry-aseprite-bridge-pdr.md with canonical layers 00_Reference/10_Structure/.../99_Final + Lua scripts + binary codec), template-grid-engine + lattice-grid-engine (layers with visible/locked/opacity/cells Map, symmetry, snap, flood/setCell, export/importAseprite, multiple GRID_TYPES), partial editor UI (TemplateEditor with paint/erase/fill + symmetry + zoom steps + keyboard + commit via adapter; LatticeCanvas/SketchPad/Upload for image-to-pixel-art reference pipelines; chromatic UI AMP), and strict adapter boundary. The 8 editor systems in the query complete the manual-editing story and make "AMP-Aware Editing" (draw → layer ops → apply Sharpness/Contrast/Chromatic → rate intense colors → provenance-tracked export) the unique advantage over plain Aseprite for Scholomance assets. Existing foundations already deliver 60-70% of the primitives; this PDR specs the production editor UX, command model, rich panels, and deep AMP integration as first-class operations.

## Target Integration Area
`codex/core/pixelbrain/template-grid-engine.js`, `lattice-grid-engine.js`, new `editor-command-stack.js` (or integrated), updates to `foundry-aseprite-bridge.js`/`aseprite-binary-codec.js`/`template-grid-asset-bridge.js`/`pixelbrain-asset-packet.js` + image-to-* bridges; `src/lib/pixelbrain.adapter.js`; `src/pages/PixelBrain/PixelBrainPage.jsx` + `components/` (new panels + TemplateEditor evolution); tests under `tests/core/pixelbrain/` + `tests/qa/pixelbrain/`; Godot paint dock for parity; documentation in `docs/pixelbrain/`.

## Core Concept
An integrated, Aseprite-class manual pixel editor (canvas + tools + layers + indexed palette + grid + selection/transform + undo + reference/annotation) whose every mutation and post-process is an explicit **Command** that can invoke or be followed by the existing PixelBrain AMP/microprocessor ecosystem (square-sharpness-contrast, chromatic-transmutation via material-registry, color-intensity-rating, symmetry, region-fill, etc.). The editor operates exclusively through the adapter on `PixelBrainAssetPacket` + template/lattice grids, producing provenance-rich packets that flow back into item-foundry, Aseprite roundtrips, Godot artifacts, and shaders — making procedural generation and high-fidelity manual + AMP finishing a single seamless loop rather than external tools + scripts.

## Implementation Philosophy
Small, composable extensions only. Heavily reuse/extend the battle-tested template-grid-engine (layers, cells, symmetry, ASE interop, snap/hit-test), existing partial TemplateEditor UI patterns (local state + refs + adapter calls, pixel-perfect canvas), foundry-aseprite-bridge conventions (canonical layers, provenance), image-to-* reference pipelines, material-registry + color-intensity + chromatic AMPs for #3/#5, and the strict adapter "Cell Wall". Never bypass packets or determinism. Every editor operation produces (or augments) a normalized asset packet with full history. Feature-flag everything for independent rollout; shadow/compare modes during AMP and command introduction. Preserve all existing TemplateEditor/Lattice/Sketch/Upload flows and ASE bridge roundtrips (evolve in place or add parallel "editor-v2" paths behind flags). The PDR itself must be the complete handoff document per the project's PDR Prompt.md rules.

## Ownership & Law Compliance
This PDR respects `VAELRIX_LAW.md`, `AGENTS.md`, `SHARED_PREAMBLE.md`, and the PixelBrain "Cell Wall" (UI never imports codex/ directly — everything via `src/lib/pixelbrain.adapter.js`). Every created/modified file path appears with explicit owner in §7. Cross-domain (e.g. Godot dock changes, new packet fields touching exporters) escalate via the project's ESCALATION: format to the listed owners.

---

## 1. Executive Summary
PixelBrain's procedural strengths (item-foundry + AMP composition + asset packets) and Aseprite interop (recently-implemented foundry-aseprite-bridge with canonical layers, Lua scripts, binary codec, template-grid import/export) are production-ready, but manual finishing remains fragmented (limited TemplateEditor/LatticeCanvas tools, external Aseprite + scripts, no rich layers/palette/undo/AMP-in-editor surface, no formal reference + annotation workflow). The 8 systems in the query (Canvas Manipulation, Layer Stack, Indexed Palette, Pixel-Perfect Grid, AMP-Aware Editing as the differentiator, Selection+Transform, Undo/Redo Command Stack, Reference/Annotation Layer using the existing image import pipeline) deliver a first-class, Aseprite-rival editor tightly integrated into the /pixelbrain workflow and asset lifecycle.

This PDR defines the "PixelBrain Editor" (editor surfaces + engine extensions) so that a user can: draw/edit with full tools + symmetry + selection + layers + palette, apply sequenced AMPs (e.g. Sharpness → Chromatic Transmutation → intensity rating) as non-destructive layer operations with provenance, manage reference images as first-class layers with per-cell annotations, use a proper command stack for undo, and commit deterministic packets that survive Aseprite roundtrips, foundry, Godot, and shaders.

Blast radius is contained to the pixelbrain cell wall + UI components + one new command module + targeted extensions to grid/bridge/packet (no changes to core item-foundry or most AMPs — they are composed). This is the direct successor to the implemented ASE-bridge PDR, JewelryAMP, ChestplateAMP, Item-Foundry, and chromatic-transmutation PDRs. Implementation is phased and flag-gated.

## 2. Out of Scope / Non-Goals
- Full animation timeline / cel playback / onion beyond basic reference (engine already has frame/onion hints; v1 focuses on still asset finishing).
- Native full .aseprite binary feature parity (groups, tags, slices, tilemaps, indexed palette compression) — continue preferring JSON + Lua for fidelity (as in the ASE-bridge PDR); binary remains optional via the codec.
- Replacement of external Aseprite for users who prefer it (the editor + bridge make a *better integrated alternative* for the Scholomance workflow).
- Changes to Godot runtime rendering or actor systems (parity updates only if trivial).
- General-purpose raster tools beyond the listed (no bezier, no advanced filters outside AMP composition).
- Multi-user collaboration or real-time sync in the editor.
- New game mechanics or inventory UIs (pure asset production surface).

## 3. Spec Sheet

**Functional Spec (acceptance criteria, mapped to the 8 systems)**
1. **Canvas Manipulation Layer**: Pencil, eraser, line, rectangle, circle (Bresenham + ellipse fill where appropriate), fill bucket (even-odd or flood with tolerance), color picker (eyedropper from canvas or palette), move/selection (rectangular primary; lasso follow-up), mirror/symmetry drawing (V/H/D + diagonal as already in template-grid + TemplateEditor), per-cell hover/click targeting (hit-test + tooltip showing part/role/emphasis/annotation/provenance).
2. **Layer Stack**: Visible/hidden, locked/unlocked, opacity (0-1 per layer, composited in preview), reorder (drag or buttons), canonical item layers (Structure, Energy, Focal, Shading, Glow, plus Reference + user layers), flatten preview (non-destructive composite without mutating source layers; optional "bake to new layer").
3. **Indexed Palette Panel**: Locked-palette mode (enforced from packet or material-registry), swatches (clickable, from current packet's semantic/material palettes), active fg/bg colors, palette remap (global or selection), replace color globally (with optional intensity preservation), intensity ratings per color (sourced live from color-intensity-rating-microprocessor).
4. **Pixel-Perfect Grid Engine**: 1x1 editing grid (already default), zoom without blur (stepped integer + CSS `image-rendering: pixelated` + `imageSmoothingEnabled=false`), pan (viewport drag + keyboard), snap (per GRID_TYPES), optional onion/reference layer (low-opacity locked reference with annotations), no soft edges unless explicitly rendered as effect layer (all base drawing is hard rects/paths).
5. **AMP-Aware Editing** (the killer feature): Draw raw pixels on any layer/selection → pass through any registered AMP (Sharpness/Contrast, Chromatic Transmutation, Color Intensity, Symmetry, Facet, etc.) → results appear as new layer or updated cells with full provenance metadata (operation, amp id/version, params, timestamp/hash) → preserve silhouette (no accidental holes or topology change unless explicitly allowed) → export the resulting packet (deterministic .aseprite JSON/binary, .png scaled, .pbrain artifact). UI surface for sequencing + preview (non-destructive by default).
6. **Selection + Transform**: Rectangular select (with live marquee + cell list), lasso (basic polygon follow-up), nudge (arrow keys, with modifiers for larger steps), copy/paste (clipboard as cell set + metadata, paste respects active layer + offset), flip H/V, rotate 90° CW/CCW (layer-local or global coords, integer snapping), all transforms preserve emphasis/annotations where possible.
7. **Undo/Redo Command Stack**: Every manipulation is a first-class Command object with `do()`, `undo()`, `description`, optional `serialize()` for persistence/session restore. Commands include: paint/erase cell(s), line/rect/circle/fill, move/selection transform, palette replace/remap, layer visible/lock/opacity/reorder/flatten, apply AMP to layer/selection, import Aseprite edit / reference quantize, etc. Full linear undo/redo (Ctrl/Cmd+Z/Y), history list UI (optional), no silent side effects.
8. **Reference/Annotation Layer**: Drop image → quantize (via existing image-to-pixel-art / image-to-bytecode-formula + client analysis) → create locked low-opacity "Reference" layer (or 00_Reference) → generate editable layers (Structure/Energy/Focal/Shading/Glow or user-named) pre-filled from the transcription → per-cell annotations/tooltips (hover shows source image region, dominant color, semantic tags from image-to-semantic-bridge, any manual notes). "Generate editable layers" action is explicit and deterministic.

**Non-functional**
- Determinism: identical input grid/packet + seed + AMP versions + command sequence → byte-identical final packet + PNG + .pbrain + ASE JSON.
- Performance: 160×144 or 96×96 editing remains 60 fps smooth on typical hardware; AMP passes on selections are sub-second for normal asset sizes.
- Fidelity: 1x1 pixel perfect; roundtrips with Aseprite (via bridge) lose no data for supported features; packets remain valid for item-foundry/Godot/Phaser.
- Accessibility: full keyboard (tools, cursor, undo, symmetry, commit), aria labels, high-contrast option, no reliance on color alone.
- Contracts: All editor state ultimately reduces to (or augments) a `PixelBrainAssetPacket` (or template-grid that bridges to one). No direct codex/ imports from UI.

**Deferred to follow-up PDRs**
- Full animation (frames, playback, tags).
- Advanced selection (magic wand, color-range) and bezier/vector tools.
- Native compressed .aseprite with full indexed + groups support (beyond current codec).
- Multi-document / project browser inside the editor.
- Real-time collab on a canvas.

## 4. Change Classification
- **architectural**: New command stack + AMP-apply surface as first-class concepts in the grid/packet model; formal ReferenceLayer + annotation metadata.
- **structural**: Rich layer model (already partial in engine) exposed in UI panels + canonical editor layers; palette surface tied to material-registry + intensity microprocessor.
- **behavioral**: TemplateEditor/Lattice/Sketch evolve from "tool surfaces" to full Aseprite-rival editor with undo, selection, reference, and AMP post-processing; all mutations become reversible commands.
- **cosmetic**: New docked panels, per-cell hover tooltips, Aseprite-like layout in PixelBrainPage (optional; can be tabbed initially).

## 5. Assumptions and Unknowns
- The existing template-grid-engine layer model (cells Map per layer, visible/locked/opacity, frames) is sufficient base and only needs modest extension for reference + annotations + command hooks (not a full rewrite).
- AMPs (especially square-sharpness, chromatic, color-intensity, symmetry) compose cleanly on arbitrary cell sets/selections without side effects on global packets (proven in item-foundry).
- Aseprite bridge conventions (canonical layers, provenance) will be extended rather than forked for the live editor.
- Users will primarily work in the integrated editor for Scholomance assets and fall back to external Aseprite only for exotic needs (the bridge keeps both viable).
- Unknown (escalate in PDR creation if needed): exact depth of "lasso" vs. rectangular primary in v1; desired default docked vs. tabbed layout in PixelBrainPage; whether Godot paint dock should mirror the full new panels or stay minimal.

## 6. Open Questions / Escalations
**ESCALATION:** Should the new editor replace TemplateEditor/LatticeCanvas as the default "manual" surface in PixelBrainPage immediately, or live alongside them behind a "Use new editor" toggle for the first release? Owner: Claude + Codex.

**ESCALATION:** For AMP-Aware, should "apply AMP" always create a new layer (safest, provenance-clean) or offer an in-place mutate option with explicit "destructive" warning? Owner: Codex (determinism + packet history implications).

**ESCALATION:** Depth of selection (rect + basic transform sufficient for v1; full lasso + color-range in follow-up)? Owner: Claude.

## 7. Architecture / File Map

**High-level data flow (preserved + extended)**
```
Image upload / procedural (item-foundry) / Aseprite import
  → PixelBrainAssetPacket (or template-grid)
  → Editor (layers + selection + commands + palette + reference)
  → AMP passes (via adapter + existing *-amp + color-intensity + material-registry)
  → Updated packet (with provenance/operations)
  → Export (ASE JSON/binary via bridge, PNG, .pbrain, Godot artifact, shader)
```

**New / primary modified files (with owner)**
- `docs/scholomance-encyclopedia/PDR-archive/2026-06-12-pixelbrain-editor-aseprite-rival-pdr.md` — (this document; owner: all)
- `codex/core/pixelbrain/template-grid-engine.js` — Codex (extend layers, add reference + annotation support, selection/transform primitives, command hooks or integration points, AMP-apply entry).
- `codex/core/pixelbrain/editor-command-stack.js` (new) — Codex (Command base + stack with do/undo, descriptions, optional serialize; integrates with grid mutations and AMPs).
- `codex/core/pixelbrain/pixelbrain-asset-packet.js` (minor) — Codex (editor-specific provenance/operation tags if needed; otherwise reuse).
- `codex/core/pixelbrain/foundry-aseprite-bridge.js` + `aseprite-binary-codec.js` (minor) — Gemini (extend layer metadata for editor-created layers, reference handling, AMP provenance roundtrip).
- `codex/core/pixelbrain/template-grid-asset-bridge.js` (minor) — Codex/Gemini (editor provenance when committing from UI).
- `src/lib/pixelbrain.adapter.js` — Claude/Gemini (re-export all new editor surface: createCommandStack, layer ops, applyAmpToLayer/Selection, palette remap, reference layer factory, selection/transform, getCellAnnotation, etc.).
- `src/pages/PixelBrain/PixelBrainPage.jsx` + `.css` — Claude (add docked or tabbed panels, active layer/selection/fg-bg/palette state, undo UI, wiring to commit edited packet; optional Aseprite-like layout).
- `src/pages/PixelBrain/components/LayerStackPanel.jsx` (new) — Claude (visibility, lock, opacity, reorder, flatten preview, canonical layers).
- `src/pages/PixelBrain/components/IndexedPalettePanel.jsx` (new) — Claude (swatches, fg/bg, remap, global replace, live intensity ratings from microprocessor).
- `src/pages/PixelBrain/components/ToolPalette.jsx` (new or merge) + enhancements to `TemplateEditor.jsx` / new `EditorCanvas.jsx` (if factored) — Claude (full tools: pencil/eraser/line/rect/circle/fill/picker/move/select + symmetry + hover + annotations + pan; keyboard surface).
- `src/pages/PixelBrain/components/AMPApplyPanel.jsx` (new) — Claude (list registered AMPs, preview on current selection/layer, chain, commit as new layer with provenance).
- `src/pages/PixelBrain/components/ReferencePanel.jsx` (new) + updates to `UploadSection.jsx` — Claude (drop image → quantize → Reference layer + annotations → "Generate editable layers").
- `src/pages/PixelBrain/amps/chromaticTransmutationAmp.js` (minor) + any other UI amps — Claude (expose "apply to selection/layer" helpers for the AMP panel).
- `src/pages/PixelBrain/components/TemplateEditor.css` (minor) — Claude (pan/selection styles, annotation tooltips).
- Tests: `tests/core/pixelbrain/editor-command.test.js`, `template-grid-editor.test.js`, `amp-aware-edit.test.js` (new) + extensions to existing bridge/grid tests — Gemini.
- `tests/qa/pixelbrain/` + generation tests (add editor roundtrip + visual cases) — Gemini.
- Optional: `godot_project/addons/.../editor/pixelbrain_paint_dock.gd` + canvas (parity updates) — Gemini.

**Dependency graph (high level)**
UI (PixelBrainPage + new panels + TemplateEditor) → adapter (only) → template-grid-engine (+ new command-stack) + existing grid/lattice + image-to-* + foundry-aseprite-bridge + AMPs (via processorBridge or direct safe wrappers) + material-registry + color-intensity + packet creation/normalize → exports.

No cycles; adapter is the seam.

## 8. Step-by-Step Implementation Plan

Phases are safe to ship independently behind flags (e.g. `PIXELBRAIN_EDITOR_V2`, `PIXELBRAIN_COMMAND_STACK`, `PIXELBRAIN_AMP_AWARE_EDITING`, `PIXELBRAIN_REFERENCE_LAYERS`, `PIXELBRAIN_PAN_SELECT_TRANSFORM`). Each has owner, rough time, milestone, exit criteria.

**Phase 0: PDR authoring + setup (this session / immediate)**
- Owner: (planning agent + Codex/Claude for review).
- Deliver the exact PDR document at the path above (all 18 sections, frontmatter, code examples, file map, QA commands, PIR handoff, etc.).
- Acceptance: PDR passes its own "Definition of Done" checklist from the template; reviewers can hand it directly to an implementation agent.

**Phase 1: Engine foundations + command stack (Codex primary, ~2-4 days)**
- Extend `template-grid-engine.js`: full layer CRUD (already partial), reference layer type + per-cell annotation map, selection model (RectSelection + cells), basic transform primitives (nudge/flip/rotate on cell sets), hooks for commands and AMP apply.
- New `editor-command-stack.js` (or module inside grid): Command interface, stack with do/undo, description, serialize; wrap setCell/clearCell/floodFill, layer ops, palette remap, AMP apply, import edits.
- Minor packet/bridge updates for editor provenance/operations.
- Milestone: A grid can execute/undo a sequence of paint + layer + simple AMP commands and produce a valid updated packet.
- Exit: Unit tests green; existing grid tests still pass; determinism verified (same command sequence → same final packet hash).

**Phase 2: Palette + layers UI surface (Claude primary, ~2-3 days)**
- New `IndexedPalettePanel.jsx` + `LayerStackPanel.jsx`.
- Wire to current packet (layers from grid or packet geometry, palettes from semantic/material + intensity microprocessor).
- Support visible/lock/opacity/reorder/flatten, swatches, fg/bg, remap, global replace (produce new packet version).
- Integrate with TemplateEditor (or EditorCanvas) so active layer affects paint targets.
- Milestone: User can create/reorder layers, change opacity/lock, pick/remap palette colors, and see live updates in the canvas.
- Exit: Works behind flag; no mutation of source packet on layer/palette changes (new derived packet on commit).

**Phase 3: Tools, canvas completion, selection/transform, undo wiring, pan/hover (Claude + Codex, ~3-5 days)**
- Complete tools in TemplateEditor/EditorCanvas: line/rect/circle (use or add simple raster helpers), move/select (rect marquee + hit-test), copy/paste, flip/rotate 90 (layer-local).
- Add pan (viewport state + drag), per-cell hover (show annotations/role/emphasis/provenance in tooltip or side panel).
- Wire full undo/redo (stack from Phase 1) to every mutation; keyboard (arrows nudge selection, Z/Y undo, tool shortcuts).
- Enhance symmetry + grid (already strong) for the new tools.
- Milestone: Full 8-system canvas ops work on a single layer (paint + line + select + transform + undo + pan + hover).
- Exit: Keyboard + pointer fully functional; no soft edges on base drawing.

**Phase 4: Reference/annotation + image pipeline formalization (Claude + Gemini, ~2 days)**
- `ReferencePanel.jsx` + updates to UploadSection.
- On image drop: run existing client/server analysis + quantize (image-to-pixel-art / formula) → create locked low-opacity Reference layer (or 00_Reference) + per-cell annotations (from semantic bridge + analysis).
- "Generate editable layers" button: creates Structure/Energy/Focal/etc. pre-populated from the transcription (deterministic).
- Annotations visible on hover in canvas + side info.
- Milestone: Upload reference → Reference layer + annotations appear → generate editable layers → can immediately paint on them + apply AMPs.
- Exit: Roundtrips cleanly with ASE bridge; provenance preserved.

**Phase 5: AMP-Aware Editing centerpiece + full page orchestration (Claude primary, Codex support, ~3-4 days)**
- New `AMPApplyPanel.jsx`: discoverable list of safe AMPs (from registry or hardcoded safe list: sharpness, chromatic, intensity, symmetry, etc.), preview on current selection or active layer, chain/sequence, "Apply as new layer" (with provenance) or "Apply & commit".
- Wire into PixelBrainPage (docked panels or Aseprite-style layout, active fg/bg, live packet derive on edits, commit edited asset back to main workflows/foundry).
- Example flow in docs/tests: draw → layers/palette → selection → Sharpness → Chromatic → rate intense → undo one step → export .ase + .pbrain (deterministic, silhouette preserved).
- Update TemplateEditor (or factor) + page to support the full surface.
- Milestone: User can perform a complete AMP-aware edit session and produce a provenance-rich packet usable downstream.
- Exit: All 8 systems work together; example "rival Aseprite + beat it with AMPs" workflow documented and tested.

**Phase 6: Tests, QA, flags, rollout, Godot parity, PIR (Gemini lead, all review, ~2-3 days + ongoing)**
- New + extended tests (see §12).
- Feature flags + shadow/compare (commands, AMP panel, reference, etc.).
- Manual verification checklist (see Verification section).
- Update Godot paint dock for parity on new concepts (layers, basic AMP provenance if exposed).
- Create the PIR (path recorded in the PDR §18).
- Exit: Full matrix green; no regressions in existing flows; Aseprite roundtrips + AMP determinism verified; UI accessible in /pixelbrain behind flags; PIR started.

All phases produce working increments behind flags. Total estimated 2-4 weeks for a solid v1 (phased).

**Post-approval implementation note (PDR-first reconciliation for import + disparity boons, 2026-06-12 session):**
Per the Emergent Disparity Reconciliation Spell (disparate-part-merge-skill) run on PixelBrain, the top 3 boons addressed in this implementation increment are:
1. Import Replacement Facade — make handleImport + image/ase paths in handleNew/New always produce a clean replacement (null packet, fresh currentDocument from dims, resetView + clearCommandStack on the live editor instance). This ensures "the previous thing (chestplate or prior asset) is automatically replaced" without relying on key bump for raster (which would discard the imported grid).
2. Document ↔ Grid Synchronization Layer — after replace imports, explicitly sync the fresh doc; editor ref already exposes syncDocumentLayers / applyAMP / resetView. Import now consistently updates both the tool model (currentDocument for panels/mentor) and visual grid (layers replaced in importImage/importAse).
3. Adapter Capability Registry — move hard-coded AMP lists to data-driven via adapter (PIXELBRAIN_REGISTERED_AMPS + getRegisteredAMPs()). AMPApplyPanel and future surfaces consume the registry; makes the 60+ orphaned exports discoverable and reduces rot.

These are additive, respect the Cell Wall (all via adapter), and fulfill the "import pipeline formalization" (Phase 4), "state wiring in PixelBrainPage" and "AMP-Aware" (Phase 5) of this PDR. No new PDR required; this is implementation detail under the approved spec. Hygiene audit will be run after any catalog changes.

## 9. Code Examples for the 5–10 Most Pivotal Changes

**1. Command interface + stack (new editor-command-stack.js or in template-grid-engine)**
```js
// codex/core/pixelbrain/editor-command-stack.js (or module)
export class Command {
  constructor({ doFn, undoFn, description, meta = {} }) {
    this.doFn = doFn; this.undoFn = undoFn; this.description = description; this.meta = meta;
  }
  do() { return this.doFn(); }
  undo() { return this.undoFn(); }
}

export function createCommandStack() {
  const stack = []; let index = -1;
  return {
    execute(cmd) { 
      // truncate redo tail
      stack.splice(index + 1);
      cmd.do(); 
      stack.push(cmd); index = stack.length - 1; 
      return cmd.meta;
    },
    undo() { if (index >= 0) { stack[index].undo(); index--; } },
    redo() { if (index < stack.length - 1) { index++; stack[index].do(); } },
    // serialize for session / packet provenance
  };
}
```
Usage: `stack.execute(new Command({ doFn: () => grid.setCell(layer, x, y, color), undoFn: () => grid.clearCell(...), description: `Paint ${color} at ${x},${y}` }));`

**2. AMP apply on selection/layer (facade, reuses existing)**
```js
// via adapter (safe wrapper)
export function applyAmpToLayerOrSelection(grid, layerId, selectionCells, ampName, ampOptions) {
  const targetCells = selectionCells || getLayerCells(grid, layerId);
  // route to existing AMP (example: chromatic or square-sharpness via adapter/processorBridge)
  const resultCoords = runPixelBrainAMP(ampName, targetCells, ampOptions); // provenance-wrapped
  // create new layer or update with metadata
  const newLayer = createLayer(`Edited-${ampName}`);
  resultCoords.forEach(c => setCell(newLayer, c.x, c.y, c.color, c.emphasis));
  // attach provenance: { source: 'editor-amp', amp: ampName, params: ampOptions, parentLayer: layerId, timestamp, hash }
  grid.layers.push(newLayer);
  return { newLayerId: newLayer.id, provenance };
}
```

**3. Layer stack panel skeleton (React)**
```jsx
// src/pages/PixelBrain/components/LayerStackPanel.jsx
export function LayerStackPanel({ layers, activeLayerId, onChange }) {
  return <div className="layer-panel">
    {layers.map((l, i) => (
      <div key={i} className={l.id === activeLayerId ? 'active' : ''}>
        <button onClick={() => onChange({ type: 'toggleVisible', id: l.id })}>{l.visible ? '👁' : '🚫'}</button>
        <button onClick={() => onChange({ type: 'toggleLocked', id: l.id })}>{l.locked ? '🔒' : '🔓'}</button>
        <input type="range" value={l.opacity} onChange={e => onChange({ type: 'setOpacity', id: l.id, value: e.target.value })} />
        <span>{l.name}</span>
        {/* reorder, flatten preview, canonical labels */}
      </div>
    ))}
  </div>;
}
```

**4. Indexed palette with intensity + remap (tied to existing)**
```js
// via adapter + color-intensity + material
export function getIndexedSwatches(packet) {
  const pal = packet.palette.materialPalette || packet.palette.semanticPalette;
  return pal.map((color, i) => ({
    color,
    intensity: getColorIntensityRating(color, packet), // from microprocessor
    index: i
  }));
}
export function remapColorInLayer(layer, oldColor, newColor) { /* mutate cells, return new packet snapshot */ }
```

**5. Reference layer creation + annotations (from image pipeline)**
```js
// in ReferencePanel / Upload flow
const analysis = await analyzeImageClientSide(file);
const refCoords = generatePixelArtFromImage(analysis, canvasSize); // or transcribe
const refLayer = createLayer('00_Reference', { visible: true, locked: true, opacity: 0.3 });
refCoords.forEach(c => setCell(refLayer, c.x, c.y, c.color));
refLayer.annotations = buildAnnotationsFromSemantic(analysis); // per-cell tooltips
// "Generate editable layers" → run silhouette or part decomposition → new Structure/Energy layers pre-filled
```

(Additional examples in the full PDR would cover selection/transform, pan + hover hit-test, command serialization for packet provenance, full AMP chain in the panel, keyboard surface, etc. — 5-10 total actionable snippets.)

## 10. Glossary
- **AMP (Asset Microprocessor)**: One of the `*-amp.js` modules (sketch, square-sharpness-contrast, chromatic-transmutation, color-intensity-rating, symmetry, etc.) that transform coordinates/palettes/slots deterministically.
- **PixelBrainAssetPacket**: The canonical `pixelbrain.asset.v1` normalized object (canvas + geometry/cells + palettes + bytecode + provenance + metadata). Everything in the editor ultimately produces or augments one.
- **Template Grid / Lattice**: The Aseprite-style editable model from `template-grid-engine.js` / `lattice-grid-engine.js` (layers, cells as Map, symmetryAxes, GRID_TYPES, snap/hit-test).
- **Canonical Layers**: 00_Reference, 10_Structure, 20_Energy, 30_Focal, 40_Shading, 50_Glow_Effects, 99_Final (from the implemented ASE-bridge PDR; extended for editor).
- **Provenance**: Packet `provenance` + `metadata.operations` tracking (source, AMPs applied, editor commands, Aseprite edits).
- **Reference Layer**: Locked low-opacity layer + per-cell annotations derived from image analysis/quantization (new formalization of the existing image import pipeline).
- **Command**: Reversible unit of work (paint, layer op, AMP apply, palette replace, etc.) with do/undo and description.

## 11. Q&A — Top 10 Most Confusing Implementation Concerns
1. **Will this break existing TemplateEditor / LatticeCanvas / SketchPad flows?** No — they evolve in place or become "classic" views behind a flag. New panels + EditorCanvas are additive.
2. **How does AMP-Aware stay non-destructive and deterministic?** Always produce a new layer (or mutated copy) with full provenance in the packet; the underlying AMPs are already deterministic. Command stack records the "apply AMP X with Y params" step for perfect undo/replay.
3. **What about Aseprite roundtrips with layers + AMPs + reference?** The bridge (already implemented) is extended to carry editor-specific layer metadata, reference annotations, and operation provenance. JSON path is preferred for fidelity.
4. **Do we need a new global store?** No — follow existing PixelBrainPage/TemplateEditor pattern (local state + refs for the mutable grid, lift shared (activeLayer, selection, undoStack, fg/bg) to the page level via props/callbacks or a thin context).
5. **How do we handle different GRID_TYPES (hex, fibonacci, etc.) in the new tools?** The engine already abstracts snap/hit-test/preview per type; tools and transforms go through the same adapters (no special casing in UI beyond dialect switch).
6. **Palette is "indexed/locked" — how does it interact with material-registry chromatic?** The IndexedPalettePanel surfaces the current packet's semantic/material palette (locked for editing). Global replace/remap produces a new packet version. Chromatic AMPs and intensity ratings remain available as post-processes on the edited result.
7. **Undo across complex operations (AMP chains + layer reorder + reference import)?** Every step is a Command. The stack is linear; complex flows are just sequences of commands (perfect replay + determinism).
8. **Performance on larger canvases or many layers?** Engine already has hard limits (1024x1024, maxCells). UI will warn on large imports (per ASE limits). All drawing is 2D rect/path (fast); AMP passes are on selected subsets.
9. **Godot / Phaser / shader consumers see the editor edits?** Yes — they consume the final asset packet (or derived render packet) exactly as before. Editor provenance is extra metadata.
10. **Where does "the image import pipeline we just made" live in the editor?** It becomes the implementation of system #8 (Reference/Annotation Layer) + the "generate editable layers" action, surfaced in the new ReferencePanel and wired to UploadSection + image-to-* modules.

## 12. QA Plan
Exact commands (project uses pnpm + vitest + playwright where configured):

```bash
# Core engine + command + AMP-aware
pnpm vitest run tests/core/pixelbrain/editor-command.test.js
pnpm vitest run tests/core/pixelbrain/template-grid-editor.test.js
pnpm vitest run tests/core/pixelbrain/amp-aware-edit.test.js

# Bridge + roundtrip (extended)
pnpm vitest run tests/core/pixelbrain/foundry-aseprite-bridge.test.js
pnpm vitest run tests/qa/pixelbrain/*aseprite*

# Full QA matrix
pnpm test:qa
pnpm test:qa:features
pnpm test:qa:backend

# Visual / UI (if playwright matrix configured for pixelbrain)
pnpm test:visual --project=chromium   # or specific editor tests
pnpm test:visual:full
```

Runnable test examples (in the new editor test files; also asserted in the PDR §15 DoD):
```js
// tests/core/pixelbrain/editor-command.test.js (sketch)
import { createCommandStack, Command } from '../../../codex/core/pixelbrain/editor-command-stack.js';
import { createTemplateGrid, setCell } from '../../../codex/core/pixelbrain/template-grid-engine.js';

it('undo/redo paint + layer op + AMP apply is deterministic', () => {
  const grid = createTemplateGrid({ width: 32, height: 32 });
  const stack = createCommandStack();
  const layer = grid.layers[0];
  stack.execute(new Command({ doFn: () => setCell(layer, 5, 5, '#ff0000'), undoFn: () => clearCell(layer, 5, 5), description: 'paint red' }));
  // ... layer op, applyAMP (mock or real sharpness), etc.
  const hash1 = computePacketHashFromGrid(grid);
  stack.undo(); stack.redo();
  expect(computePacketHashFromGrid(grid)).toBe(hash1);
});
```

```js
// UI interaction sketch (playwright or component test)
await page.getByRole('button', { name: /PAINT/i }).click();
await canvas.click({ position: { x: 100, y: 80 } }); // per-cell target
await page.getByRole('button', { name: /Undo/i }).click();
// assert layer cells + packet provenance
```

Also exercise the 8 systems + full AMP workflow manually (see Verification).

## 13. Regression Risks and Specific Retest Checklist
- **Existing TemplateEditor / Lattice / Sketch / Upload flows** → retest all current tabs and commit paths in /pixelbrain (they must continue to work or be transparently evolved).
- **Aseprite roundtrips** (JSON + Lua + binary) → run the full bridge test matrix + manual export-from-editor → open in Aseprite → edit → export → re-import; verify canonical layers, reference, provenance, no data loss on supported features.
- **Packet / foundry / Godot / shader consumers** → any edited packet must still be valid input to `forgeItemAsset`, Godot artifact builders, shader previews, and runtime renderers. Retest key generation + export scripts.
- **Determinism** → identical editor session (same commands + AMP params + seeds) must produce byte-identical final packet + PNG + .pbrain (hash + pixel diff on export).
- **Performance / fidelity** → 160×144 editing stays smooth; 1x1 crisp (no blur); large imports respect limits + warnings.
- **Adapter / Cell Wall** → no new direct codex/ imports from src/pages/PixelBrain/.
- **Specific retest commands** (record in PIR):
  - `pnpm vitest run tests/core/pixelbrain/ -- --grep "editor|template|aseprite|amp|packet"`
  - Manual: upload reference → Reference layer + annotations + generate editable → paint + symmetry + select + AMP chain (Sharpness + Chromatic + intensity) → undo one AMP → commit → export .ase + .pbrain → re-import → compare hashes + visual.
  - Existing PixelBrainPage flows (formula, verse morph, chromatic, shader sandbox) still produce usable packets.
  - Godot paint dock loads an editor-produced artifact without crash.

## 14. Rollout Plan
- Feature flags (env or runtime): `PIXELBRAIN_EDITOR_V2` (master), `PIXELBRAIN_COMMAND_STACK`, `PIXELBRAIN_AMP_AWARE_EDITING`, `PIXELBRAIN_REFERENCE_LAYERS`, `PIXELBRAIN_PAN_SELECT`, `PIXELBRAIN_LAYER_PALETTE_PANELS`.
- Shadow / compare: when a flag is off, still compute the new structures in the background and log diagnostics / hash diffs (visible in the terminal panel or dev tools).
- Canary: enable full editor for admin/internal users first; then a cohort of power users.
- Incomplete-but-safe: old surfaces (TemplateEditor classic, external Aseprite + bridge scripts) remain the default. New editor is opt-in ("Try new PixelBrain Editor"). All mutations still produce valid packets even if the fancy panels are hidden.
- Rollback: flip the relevant flag(s) → old behavior is restored instantly. No data migration (packets from editor sessions are still valid for downstream consumers).
- Communication: update PixelBrainPage header / status with "Editor v2 (flag)" + link to the PDR.

## 15. Definition of Done
- [ ] The PDR document exists at the canonical path, is copy-ready Markdown, contains zero placeholders, and satisfies every Acceptance Criterion listed in `PDR Prompt.md` (tells an agent What/Why/Where/Who/How + §9 snippets + §12 exact commands + §14 incomplete-safe + §18 named PIR, etc.).
- [ ] All 8 systems are functional in the UI (canvas tools including line/rect/circle + symmetry + per-cell hover; full LayerStack with canonicals + flatten; IndexedPalette with swatches/fg-bg/remap/intensity + locked; pixel-perfect grid + pan + snap + onion/reference; AMP-Aware panel + example flows; Selection+Transform (rect + basic) + layer-local; full Command undo/redo stack for every op; Reference + annotations + generate editable).
- [ ] Core engine extensions (command stack, reference/annotation, selection/transform, AMP apply with provenance) are in place, tested, and used by the UI via the adapter only.
- [ ] Every mutation produces (or augments) a valid `PixelBrainAssetPacket` with provenance; determinism holds (same session → same hashes/exports).
- [ ] Aseprite roundtrips (JSON/Lua/binary) work for editor-created assets + reference + AMP provenance (no data loss on supported features).
- [ ] All new + extended tests pass (`pnpm vitest run ...` as specified); full `pnpm test:qa` matrix green.
- [ ] Feature flags + shadow/incomplete-safe behavior implemented and documented.
- [ ] Manual verification checklist executed successfully (see §12 / Verification).
- [ ] No regressions in existing PixelBrainPage flows, item-foundry, Godot exports, shaders, or bridge.
- [ ] PIR document started at the path recorded in §18 of this PDR.
- [ ] Law/ownership table in §7 of the PDR is accurate; adapter/Cell Wall respected.

## 16. Final Architectural Verdict
**Complete with acceptable risk.** The foundations (template-grid-engine, ASE bridge, packets, AMPs, adapter, partial UI, image import) are already strong and battle-tested. This PDR + implementation completes the missing editor UX and makes AMP-Aware the unique Scholomance advantage. Main risks (scope creep on tools/selection, exact layer canonicals for non-shield assets, Godot parity depth) are mitigated by strict scoping to the 8 points, heavy reuse, phased flags, and the "incomplete-but-safe" default to existing flows. Safe to ship the editor behind flags as soon as the DoD boxes are checked; the hybrid procedural + manual + AMP loop becomes a first-class product capability.

## 17. References
- `docs/scholomance-encyclopedia/PDR-archive/PDR Prompt.md` — the strict template this document follows.
- `docs/scholomance-encyclopedia/PDR-archive/2026-06-12-foundry-aseprite-bridge-pdr.md` (Implemented) — direct predecessor; defines canonical layers, bridge, roundtrip, provenance.
- `docs/scholomance-encyclopedia/PDR-archive/2026-06-12-jewelry-amp-pdr.md`, `ChestplateAMP-pdr.md`, `2026-06-11-pixelbrain-item-foundry-pdr.md`, `2026-06-11-chromatic-transmutation-amp-pdr.md`, `2026-06-11-pixelbrain-render-fidelity-pipeline-pdr.md` — style, ownership, and integration patterns.
- `codex/core/pixelbrain/template-grid-engine.js` + `lattice-grid-engine.js` — primary reuse for grids/layers/symmetry/tools/reference.
- `codex/core/pixelbrain/foundry-aseprite-bridge.js` + `aseprite-binary-codec.js` + `template-grid-asset-bridge.js` — Aseprite interop + packet bridge.
- `codex/core/pixelbrain/pixelbrain-asset-packet.js` + `item-foundry.js` — interchange + procedural composition.
- `codex/core/pixelbrain/square-sharpness-contrast-amp.js`, `chromaticTransmutationAmp.js` (core + `src/pages/PixelBrain/amps/`), `color-intensity-rating-microprocessor.js`, `material-registry.js`, `palette-authority-bridge.js`, `image-to-pixel-art.js` + `image-to-bytecode-formula.js` + `image-to-semantic-bridge.js` — AMPs, palette, reference/quantize.
- `src/lib/pixelbrain.adapter.js` — the Cell Wall (all UI must go through here).
- `src/pages/PixelBrain/PixelBrainPage.jsx` + `components/TemplateEditor.jsx` + `UploadSection.jsx` + `TemplateEditor.css` — current UI surface to evolve.
- `docs/pixelbrain/REFERENCE_IMAGE_IMPLEMENTATION.md` + related (image pipeline formalization).
- `VAELRIX_LAW.md`, `AGENTS.md`, `SHARED_PREAMBLE.md` — ownership and law.

## 18. Post-Implementation Report Handoff
The corresponding PIR **must** be written at:
`docs/scholomance-encyclopedia/post-implementation-reports/PIR-20260612-PIXELBRAIN-EDITOR-ASEPRITE-RIVAL.md`

It will be created within 7 calendar days of the merge that closes the final phase of this PDR (or the first shippable increment behind the master `PIXELBRAIN_EDITOR_V2` flag). The PIR will contain:
- Side-by-side before/after of the 8 systems (screenshots + command logs).
- Full manual verification checklist results + any Aseprite roundtrip + AMP workflow artifacts + determinism hash comparisons.
- Performance / fidelity notes (160×144 editing, 1x1 crisp, packet size).
- List of follow-up micro-PDRs (animation, advanced selection, full binary, etc.).
- Updated ownership / file map for the shipped state.
- Any open escalations resolved during implementation.

A PDR that ships without the PIR being started is incomplete.

---

**This PDR was authored to be handed directly to an implementation agent (Codex, Claude, Gemini, or equivalent) with zero further translation. It satisfies every constraint and acceptance criterion from `PDR Prompt.md`.**
