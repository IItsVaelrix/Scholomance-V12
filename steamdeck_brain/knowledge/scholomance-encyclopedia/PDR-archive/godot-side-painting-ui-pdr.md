# PDR: Godot-Side Painting UI
## Native PixelBrain Authoring Dock For Godot 4

**Status:** Draft
**Classification:** Architectural + Tooling + PixelBrain + Godot Editor UI
**Priority:** High
**Primary Goal:** Add a native Godot editor painting dock that can create, edit, validate, import, and export PixelBrain `.pbrain` artifacts without requiring the React PixelBrain page for every paint operation.
**Bytecode Search Code:** `SCHOL-ENC-BYKE-SEARCH-PDR-GODOT-SIDE-PAINTING-UI`

---

# 1. Executive Summary

The current Godot bridge imports Scholomance PixelBrain `.pbrain` artifacts as native Godot `PackedScene` resources containing a `Sprite2D` with a generated `ImageTexture`. This proves the artifact boundary works, but it does not let a Godot user paint inside the editor. The next step is a Godot-side painting UI: an editor dock that exposes a pixel grid, palette controls, brush tools, artifact validation, and deterministic save/export behavior for `.pbrain` files.

This PDR keeps Scholomance PixelBrain as the canonical browser authoring surface for advanced generation, formulas, and bytecode evolution, while giving Godot a first-class local editing loop for simple pixel art changes. The Godot dock must use the existing `scholomance.pixelbrain.godot.v1` JSON artifact shape and the existing addon under `addons/scholomance_godot_bridge/`. No bytecode-first rewrite is allowed in this phase. Bytecode is preserved as metadata when present, but Godot-side painting updates coordinates deterministically and marks bytecode as stale unless a v2 bytecode compiler is explicitly specified later.

Incomplete versions must run safely: the dock can load and preview artifacts, but save/export buttons remain gated until validation passes. Shadow mode should warn and preserve unknown fields; strict mode should reject invalid canvas or coordinate state before writing.

# 2. Change Classification

**Architectural:** Extends the existing Scholomance-to-Godot bridge from import-only consumption into local Godot editor authoring.

**Structural:** Adds editor dock scripts, reusable artifact mutation helpers, palette and brush state modules, and Godot-side fixture tests.

**Behavioral:** Adds new Godot editor actions: open `.pbrain`, paint pixels, erase pixels, pick colors, resize canvas with validation, save `.pbrain`, and regenerate imported scene resources.

**Not cosmetic:** The UI is intentionally plain and tool-focused. The main value is deterministic artifact editing and native Godot workflow speed.

# 3. Spec Sheet

| Field | Value |
|-------|-------|
| Feature name | Godot-Side Painting UI |
| Target engine | Godot 4.x |
| Existing addon | `addons/scholomance_godot_bridge/` |
| Primary artifact | `.pbrain` JSON |
| Artifact kind | `scholomance.pixelbrain.godot.v1` |
| Primary UI surface | Godot `EditorPlugin` dock |
| Primary scene preview | `TextureRect` or custom `Control` grid preview |
| Runtime renderer reused | `runtime/pixelbrain_renderer.gd` |
| Canonical source for v1 shape | `src/lib/godot-export/artifactSchemas.js` and existing fixtures |
| Save behavior | Explicit user action only |
| Rollout mode | Disabled by default -> editor setting gate -> shadow save -> strict save |
| Determinism requirement | Same ordered paint operations over same artifact produce byte-for-byte stable `.pbrain` output |
| Non-goal | Full parity with browser PixelBrain generation, formulas, or bytecode compilation |

# 4. Assumptions And Unknowns

Assumptions:

- Godot 4.x is the only supported editor target.
- The existing addon remains in this repository during the first implementation.
- `.pbrain` JSON remains the v1 import/export boundary.
- Godot-side painting edits `coordinates`, `canvas`, and `palettes`; it does not evaluate PixelBrain formulas.
- Existing browser exports must remain importable without migration.
- Unknown artifact fields must be preserved in shadow mode to avoid data loss.
- Explicit save/export is required. No autosave, server upload, telemetry, or background sync may be added.

Unknowns:

- Whether the final grid should use a custom `Control` draw loop, a generated `ImageTexture` inside `TextureRect`, or both.
- Whether Godot-side palette changes should rewrite `palettes` percentages or only append swatches.
- Whether multi-layer PixelBrain artifacts will be introduced in v2.
- Whether future bytecode-first imports will require a Godot-side bytecode compiler or a browser/server compilation handoff.

Resolution rule:

- Implement v1 with the smallest deterministic editor dock over existing coordinates. If a behavior requires schema expansion, stop and file a schema update proposal instead of inventing parallel fields.

# 5. Architecture Diagram / File Map

```text
Godot Editor
  EditorPlugin
    addons/scholomance_godot_bridge/scholomance_godot_bridge_plugin.gd
        |
        v
  PixelBrain Paint Dock
    addons/scholomance_godot_bridge/editor/pixelbrain_paint_dock.gd
    addons/scholomance_godot_bridge/editor/pixelbrain_canvas_view.gd
    addons/scholomance_godot_bridge/editor/pixelbrain_palette_panel.gd
        |
        v
  Artifact Editing Helpers
    addons/scholomance_godot_bridge/editor/pixelbrain_artifact_editor.gd
    addons/scholomance_godot_bridge/editor/pixelbrain_stable_json.gd
        |
        v
  Existing Runtime And Importer
    addons/scholomance_godot_bridge/runtime/artifact_loader.gd
    addons/scholomance_godot_bridge/runtime/pixelbrain_renderer.gd
    addons/scholomance_godot_bridge/importers/pixelbrain_importer.gd
        |
        v
  Local Artifacts
    *.pbrain
    imported *.tscn resources
```

Proposed files:

| File | Purpose |
|------|---------|
| `addons/scholomance_godot_bridge/editor/pixelbrain_paint_dock.gd` | Main dock UI and command wiring. |
| `addons/scholomance_godot_bridge/editor/pixelbrain_canvas_view.gd` | Custom `Control` that draws the editable pixel grid and receives pointer input. |
| `addons/scholomance_godot_bridge/editor/pixelbrain_palette_panel.gd` | Palette swatches, active color, add/remove swatch commands. |
| `addons/scholomance_godot_bridge/editor/pixelbrain_artifact_editor.gd` | Pure-ish artifact mutation helpers for paint, erase, resize, validate, and metadata updates. |
| `addons/scholomance_godot_bridge/editor/pixelbrain_stable_json.gd` | Deterministic JSON serializer matching the browser key-order contract. |
| `tests/godot-export/godotPaintDockStatic.test.js` | Static tests for dock registration and script contracts. |
| `tests/godot-export/godotPaintArtifactEditorParity.test.js` | JS parity tests for the deterministic edit rules against fixtures. |
| `tests/fixtures/godot-export/pixelbrain-painted-basic.pbrain` | Expected output fixture after a defined paint sequence. |

# 6. Step-By-Step Implementation Plan

## Step 1: Add plugin registration for the dock behind an editor setting

Extend `scholomance_godot_bridge_plugin.gd` so the dock is available only when explicitly enabled. The setting prevents an incomplete dock from surprising existing Godot users.

```gdscript
@tool
extends EditorPlugin

const PixelBrainPaintDock = preload("res://addons/scholomance_godot_bridge/editor/pixelbrain_paint_dock.gd")

var pixelbrain_paint_dock: Control = null

func _enter_tree() -> void:
	_register_importers()
	if _is_paint_dock_enabled():
		pixelbrain_paint_dock = PixelBrainPaintDock.new()
		add_control_to_dock(DOCK_SLOT_RIGHT_UL, pixelbrain_paint_dock)

func _exit_tree() -> void:
	if pixelbrain_paint_dock != null:
		remove_control_from_docks(pixelbrain_paint_dock)
		pixelbrain_paint_dock.queue_free()
		pixelbrain_paint_dock = null
	_unregister_importers()

func _is_paint_dock_enabled() -> bool:
	var key := "scholomance/pixelbrain/enable_paint_dock"
	if not ProjectSettings.has_setting(key):
		ProjectSettings.set_setting(key, false)
	return bool(ProjectSettings.get_setting(key))
```

## Step 2: Create a deterministic artifact editor helper

Keep mutation rules out of the dock UI. The helper owns coordinate replacement, color validation, coordinate sorting, and stale bytecode marking.

```gdscript
@tool
extends RefCounted

const PIXELBRAIN_KIND := "scholomance.pixelbrain.godot.v1"

static func paint_pixel(artifact: Dictionary, x: int, y: int, color_text: String) -> Dictionary:
	var next := artifact.duplicate(true)
	var canvas: Dictionary = next.get("canvas", {})
	var width := int(canvas.get("width", 160))
	var height := int(canvas.get("height", 144))
	if x < 0 or y < 0 or x >= width or y >= height:
		return next
	if not Color.html_is_valid(color_text):
		color_text = "#FFFFFF"

	var coords: Array = []
	for coord in next.get("coordinates", []):
		if typeof(coord) != TYPE_DICTIONARY:
			continue
		var cx := int(coord.get("snappedX", coord.get("x", 0)))
		var cy := int(coord.get("snappedY", coord.get("y", 0)))
		if cx == x and cy == y:
			continue
		coords.append(coord)

	coords.append({
		"x": x,
		"y": y,
		"snappedX": x,
		"snappedY": y,
		"color": color_text,
	})
	next["coordinates"] = sort_coordinates(coords)
	next["bytecodeStatus"] = "stale-godot-edit"
	return next

static func erase_pixel(artifact: Dictionary, x: int, y: int) -> Dictionary:
	var next := artifact.duplicate(true)
	var coords: Array = []
	for coord in next.get("coordinates", []):
		if typeof(coord) != TYPE_DICTIONARY:
			continue
		var cx := int(coord.get("snappedX", coord.get("x", 0)))
		var cy := int(coord.get("snappedY", coord.get("y", 0)))
		if cx != x or cy != y:
			coords.append(coord)
	next["coordinates"] = sort_coordinates(coords)
	next["bytecodeStatus"] = "stale-godot-edit"
	return next

static func sort_coordinates(coords: Array) -> Array:
	var sorted := coords.duplicate(true)
	sorted.sort_custom(func(a, b):
		var ay := int(a.get("snappedY", a.get("y", 0)))
		var by := int(b.get("snappedY", b.get("y", 0)))
		if ay != by:
			return ay < by
		var ax := int(a.get("snappedX", a.get("x", 0)))
		var bx := int(b.get("snappedX", b.get("x", 0)))
		return ax < bx
	)
	return sorted
```

## Step 3: Add stable JSON writing

Godot's default JSON output is not enough if key ordering drifts. Implement a local stable serializer and test it against existing fixtures.

```gdscript
@tool
extends RefCounted

static func stringify(value: Variant) -> String:
	match typeof(value):
		TYPE_DICTIONARY:
			var keys := value.keys()
			keys.sort()
			var parts: Array[String] = []
			for key in keys:
				parts.append(JSON.stringify(str(key)) + ":" + stringify(value[key]))
			return "{" + ",".join(parts) + "}"
		TYPE_ARRAY:
			var parts: Array[String] = []
			for item in value:
				parts.append(stringify(item))
			return "[" + ",".join(parts) + "]"
		_:
			return JSON.stringify(value)
```

## Step 4: Build the canvas view as a custom `Control`

The canvas should draw a stable grid and emit semantic paint events. It should not write files.

```gdscript
@tool
extends Control

signal paint_requested(x: int, y: int, color_text: String)
signal erase_requested(x: int, y: int)

var artifact: Dictionary = {}
var active_color := "#FFFFFF"
var tool := "paint"
var zoom := 8

func _draw() -> void:
	var canvas: Dictionary = artifact.get("canvas", {})
	var width := int(canvas.get("width", 160))
	var height := int(canvas.get("height", 144))
	draw_rect(Rect2(Vector2.ZERO, Vector2(width * zoom, height * zoom)), Color(0, 0, 0, 0.2), true)
	for coord in artifact.get("coordinates", []):
		if typeof(coord) != TYPE_DICTIONARY:
			continue
		var x := int(coord.get("snappedX", coord.get("x", 0)))
		var y := int(coord.get("snappedY", coord.get("y", 0)))
		var color_text := str(coord.get("color", "#FFFFFF"))
		var color := Color.html(color_text) if Color.html_is_valid(color_text) else Color.WHITE
		draw_rect(Rect2(Vector2(x * zoom, y * zoom), Vector2(zoom, zoom)), color, true)

func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed:
		var x := int(event.position.x / zoom)
		var y := int(event.position.y / zoom)
		if tool == "erase":
			erase_requested.emit(x, y)
		else:
			paint_requested.emit(x, y, active_color)
```

## Step 5: Build the dock command surface

The dock owns file dialogs, validation messages, active artifact state, and preview refresh.

```gdscript
@tool
extends VBoxContainer

const ArtifactLoader = preload("res://addons/scholomance_godot_bridge/runtime/artifact_loader.gd")
const ArtifactEditor = preload("res://addons/scholomance_godot_bridge/editor/pixelbrain_artifact_editor.gd")
const StableJson = preload("res://addons/scholomance_godot_bridge/editor/pixelbrain_stable_json.gd")
const CanvasView = preload("res://addons/scholomance_godot_bridge/editor/pixelbrain_canvas_view.gd")

var artifact: Dictionary = {
	"kind": "scholomance.pixelbrain.godot.v1",
	"version": 1,
	"canvas": { "width": 160, "height": 144, "gridSize": 1 },
	"palettes": [],
	"coordinates": [],
	"formula": null,
	"bytecode": "",
}
var source_path := ""
var canvas_view: Control

func _ready() -> void:
	name = "PixelBrain Paint"
	canvas_view = CanvasView.new()
	canvas_view.artifact = artifact
	canvas_view.paint_requested.connect(_on_paint_requested)
	canvas_view.erase_requested.connect(_on_erase_requested)
	add_child(canvas_view)

func _on_paint_requested(x: int, y: int, color_text: String) -> void:
	artifact = ArtifactEditor.paint_pixel(artifact, x, y, color_text)
	canvas_view.artifact = artifact
	canvas_view.queue_redraw()

func _on_erase_requested(x: int, y: int) -> void:
	artifact = ArtifactEditor.erase_pixel(artifact, x, y)
	canvas_view.artifact = artifact
	canvas_view.queue_redraw()

func save_to_path(path: String) -> Error:
	if not ArtifactLoader.validate_pixelbrain_artifact(artifact, true):
		return ERR_INVALID_DATA
	var file := FileAccess.open(path, FileAccess.WRITE)
	if file == null:
		return FileAccess.get_open_error()
	file.store_string(StableJson.stringify(artifact) + "\n")
	return OK
```

## Step 6: Reimport or regenerate the Godot scene after save

After a successful save, the dock should optionally call the editor filesystem scan so the existing importer regenerates the `.tscn`.

```gdscript
func save_and_reimport(path: String) -> Error:
	var result := save_to_path(path)
	if result != OK:
		return result
	if Engine.is_editor_hint():
		EditorInterface.get_resource_filesystem().scan()
	return OK
```

## Step 7: Add fixture parity tests before editor smoke tests

The repository may not have a Godot binary installed. Static and parity tests must run in Vitest first; actual Godot editor smoke tests are a later environment gate.

```js
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Godot PixelBrain paint dock static contract', () => {
  it('registers the dock behind an editor setting', () => {
    const plugin = readFileSync('addons/scholomance_godot_bridge/scholomance_godot_bridge_plugin.gd', 'utf8');
    expect(plugin).toContain('scholomance/pixelbrain/enable_paint_dock');
    expect(plugin).toContain('add_control_to_dock');
  });

  it('keeps save behavior explicit', () => {
    const dock = readFileSync('addons/scholomance_godot_bridge/editor/pixelbrain_paint_dock.gd', 'utf8');
    expect(dock).toContain('save_to_path');
    expect(dock).not.toMatch(/_process\\s*\\(/);
  });
});
```

# 7. Code Examples For Each Major Step

## Load `.pbrain`

```gdscript
func load_from_path(path: String) -> Error:
	var loaded := ArtifactLoader.load_json_file(path)
	if not ArtifactLoader.validate_pixelbrain_artifact(loaded, false):
		return ERR_INVALID_DATA
	artifact = loaded
	source_path = path
	canvas_view.artifact = artifact
	canvas_view.queue_redraw()
	return OK
```

## Paint a pixel

```gdscript
artifact = ArtifactEditor.paint_pixel(artifact, 12, 8, "#FFD166")
```

## Erase a pixel

```gdscript
artifact = ArtifactEditor.erase_pixel(artifact, 12, 8)
```

## Save stable `.pbrain`

```gdscript
var result := save_to_path("res://artifacts/player_icon.pbrain")
if result != OK:
	push_error("PixelBrain save failed: %s" % result)
```

## Refresh preview texture using existing renderer

```gdscript
const PixelBrainRenderer = preload("res://addons/scholomance_godot_bridge/runtime/pixelbrain_renderer.gd")

func build_preview_texture() -> ImageTexture:
	var renderer := PixelBrainRenderer.new()
	return renderer.render_pixelbrain_texture(artifact)
```

## JS parity rule for expected paint output

```js
function paintPixel(artifact, x, y, color) {
  const next = structuredClone(artifact);
  next.coordinates = next.coordinates
    .filter((coord) => (coord.snappedX ?? coord.x) !== x || (coord.snappedY ?? coord.y) !== y)
    .concat([{ x, y, snappedX: x, snappedY: y, color }])
    .sort((a, b) => ((a.snappedY ?? a.y) - (b.snappedY ?? b.y)) || ((a.snappedX ?? a.x) - (b.snappedX ?? b.x)));
  next.bytecodeStatus = 'stale-godot-edit';
  return next;
}
```

# 8. Glossary Of Important Terms

| Term | Meaning |
|------|---------|
| PixelBrain | Scholomance pixel-art system that maps intent, formulas, coordinates, palettes, and bytecode into visual artifacts. |
| `.pbrain` | JSON artifact file containing `scholomance.pixelbrain.godot.v1` data for Godot import. |
| Godot bridge | Existing addon that imports Scholomance artifacts into Godot native scenes/resources. |
| Paint dock | New Godot editor dock for local PixelBrain artifact editing. |
| Canvas view | Godot `Control` responsible for drawing the editable pixel grid and forwarding pointer events. |
| Artifact editor | Helper module that transforms PixelBrain artifact dictionaries deterministically. |
| Stable JSON | Serializer that sorts object keys so saved artifacts are byte-for-byte stable. |
| Shadow mode | Default forgiving mode: warn, preserve unknown fields, avoid destructive rejection. |
| Strict mode | Validation mode that rejects malformed artifact state before save/import. |
| Stale bytecode | Marker showing that coordinates were edited in Godot and existing bytecode may no longer describe the full artifact. |

# 9. Q&A: Top 10 Implementation Concerns

## 1. Should Godot become the new canonical PixelBrain editor?

No. Godot gets a local editing loop for `.pbrain` artifacts. Browser PixelBrain remains canonical for advanced generation, formula authoring, and future bytecode compilation.

## 2. Should the dock compile PixelBrain bytecode?

No for v1. Preserve existing `bytecode` and set `bytecodeStatus: "stale-godot-edit"` after coordinate edits. Bytecode-first or bytecode-regeneration work requires a v2 schema proposal.

## 3. Is adding `bytecodeStatus` a schema violation?

For v1 shadow mode, it is metadata and must not break import. If strict schema enforcement later disallows unknown fields, the implementation must instead place the marker under an approved metadata field or request a schema update.

## 4. Can the dock autosave?

No. Explicit save/export only. Autosave would violate the project sovereignty pattern and create surprising file writes.

## 5. How should unknown fields be handled?

Preserve them when loading and saving in shadow mode. Do not normalize them away. Strict mode can reject unsupported fields only if the existing loader contract defines that rejection.

## 6. How should duplicate coordinates be handled?

Paint operations replace the pixel at the same snapped coordinate. Saved coordinates are sorted by `y`, then `x`.

## 7. How should palette percentages be calculated?

Phase 1 may preserve existing palette entries and add missing swatches. Palette percentage recalculation is optional unless a fixture contract is added.

## 8. Should the grid support drag painting?

Yes, but only after single-click paint is stable. Drag painting must dedupe repeated pixels and use the same `paint_pixel` helper.

## 9. Should Godot editor smoke tests block Phase 1?

No. Static Vitest tests and fixture parity tests block Phase 1. A real Godot 4 editor smoke test blocks promotion to strict default.

## 10. How does this avoid breaking the existing importer?

The dock writes the same `.pbrain` kind and version that the importer already supports. The existing `pixelbrain_renderer.gd` remains the render path. The dock is gated by a project setting and does not change import behavior by default.

# 10. QA Plan

## Tests To Create

| File | Purpose |
|------|---------|
| `tests/godot-export/godotPaintDockStatic.test.js` | Confirms dock registration, feature gate, explicit save behavior, and no process-loop autosave. |
| `tests/godot-export/godotPaintArtifactEditorParity.test.js` | Confirms paint/erase/ordering rules against fixtures using JS mirror logic. |
| `tests/fixtures/godot-export/pixelbrain-painted-basic.pbrain` | Expected stable artifact after painting one pixel. |
| `tests/fixtures/godot-export/pixelbrain-erased-basic.pbrain` | Expected stable artifact after erasing one pixel. |

## Exact Commands

```bash
pnpm vitest run tests/godot-export/godotPaintDockStatic.test.js
pnpm vitest run tests/godot-export/godotPaintArtifactEditorParity.test.js
pnpm vitest run tests/godot-export
```

Optional when Godot 4 is installed:

```bash
godot4 --headless --path . --quit
```

If the addon is tested inside a separate Godot project:

```bash
godot4 --headless --path /path/to/godot/project --import --quit
```

## Static Test Example

```js
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Godot paint dock static contract', () => {
  it('does not autosave from frame loops', () => {
    const dock = readFileSync('addons/scholomance_godot_bridge/editor/pixelbrain_paint_dock.gd', 'utf8');
    expect(dock).not.toMatch(/func\\s+_process\\s*\\(/);
    expect(dock).not.toMatch(/func\\s+_physics_process\\s*\\(/);
  });

  it('uses existing PixelBrain artifact kind', () => {
    const editor = readFileSync('addons/scholomance_godot_bridge/editor/pixelbrain_artifact_editor.gd', 'utf8');
    expect(editor).toContain('scholomance.pixelbrain.godot.v1');
  });
});
```

## Fixture Parity Test Example

```js
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { serializeStable } from '../../src/lib/godot-export/stableSerialize.js';

const base = JSON.parse(readFileSync('tests/fixtures/godot-export/pixelbrain-basic.pbrain', 'utf8'));
const expected = readFileSync('tests/fixtures/godot-export/pixelbrain-painted-basic.pbrain', 'utf8');

function paintPixel(artifact, x, y, color) {
  const next = structuredClone(artifact);
  next.coordinates = next.coordinates
    .filter((coord) => (coord.snappedX ?? coord.x) !== x || (coord.snappedY ?? coord.y) !== y)
    .concat([{ x, y, snappedX: x, snappedY: y, color }])
    .sort((a, b) => ((a.snappedY ?? a.y) - (b.snappedY ?? b.y)) || ((a.snappedX ?? a.x) - (b.snappedX ?? b.x)));
  next.bytecodeStatus = 'stale-godot-edit';
  return next;
}

describe('Godot paint artifact parity', () => {
  it('matches the expected stable output after painting', () => {
    expect(`${serializeStable(paintPixel(base, 0, 0, '#FFD166'))}\n`).toBe(expected);
  });
});
```

# 11. Regression Risks And Specific Retest Checklist

| Risk | Impact | Retest |
|------|--------|--------|
| Plugin registration breaks existing importers | `.pbrain`, `.wand`, `.divwand` imports stop working | `pnpm vitest run tests/godot-export/godotAddon.test.js` |
| Stable serializer differs from browser serializer | Artifact churn and fixture drift | `pnpm vitest run tests/godot-export/stableSerialize.test.js tests/godot-export/godotPaintArtifactEditorParity.test.js` |
| Dock writes invalid coordinates | Importer rejects saved files | `pnpm vitest run tests/godot-export/godotImporterParity.test.js` |
| Unknown fields are dropped | Data loss for future artifacts | Add fixture with unknown metadata and assert it survives load/save |
| Bytecode is falsely treated as current | Runtime mismatch between bytecode and coordinates | Assert `bytecodeStatus` or approved metadata marker changes after paint/erase |
| Canvas view paints outside bounds | Invalid artifact or visual drift | Add out-of-bounds paint test in parity suite |
| Accidental autosave | Violates explicit user action model | Static test rejects `_process` save paths and direct file writes outside save command |

Retest checklist:

- [ ] Existing `.pbrain` fixture imports still pass strict parity tests.
- [ ] Existing Wand and DivWand importer tests still pass.
- [ ] Paint one pixel, save, re-read JSON, and compare stable output.
- [ ] Erase one pixel, save, re-read JSON, and compare stable output.
- [ ] Attempt out-of-bounds paint and confirm artifact does not change.
- [ ] Disable project setting and confirm dock is not registered.
- [ ] Enable project setting and confirm dock registration static test passes.
- [ ] If Godot 4 is installed, import a saved `.pbrain` and confirm a `PackedScene` is generated.

# 12. Rollout Plan

## Phase 0: Static contracts and fixtures

- Add fixture expectations for paint and erase.
- Add static tests for planned Godot scripts.
- No runtime behavior changes.

## Phase 1: Disabled dock skeleton

- Add editor scripts and plugin gate.
- Default setting remains false.
- Dock can instantiate in static analysis but does not affect current importers.

## Phase 2: Shadow editing

- Enable load, preview, paint, erase, and explicit save.
- Preserve unknown fields.
- Warn on invalid fields.
- Strict validation blocks save only when the user chooses strict mode.

## Phase 3: Reimport workflow

- Add save-and-reimport command.
- Existing importer regenerates the `PackedScene`.
- Add Godot editor smoke test when Godot 4 is available.

## Phase 4: Strict promotion

- Only after smoke tests pass, allow strict validation to become the recommended preset.
- Shadow mode remains available for older artifacts.

Incomplete system behavior:

- Before Phase 2, the dock must remain hidden by default.
- Before Phase 3, saved files may require manual Godot filesystem rescan.
- Before Phase 4, malformed artifacts should warn in shadow mode and fail only in strict save/import paths.

# 13. Definition Of Done

The feature is done when:

- `godot-side-painting-ui-pdr.md` has an implemented PIR linked from the encyclopedia.
- The addon registers a PixelBrain paint dock behind `scholomance/pixelbrain/enable_paint_dock`.
- The dock can create a new `.pbrain` artifact.
- The dock can open an existing `.pbrain` artifact.
- The dock can paint and erase individual pixels.
- The dock can save stable JSON with deterministic coordinate ordering.
- Saved artifacts import through the existing PixelBrain importer.
- Strict validation prevents invalid canvas and out-of-bounds coordinate saves.
- Unknown fields are preserved in shadow mode.
- Existing `tests/godot-export` pass.
- New paint dock static and fixture parity tests pass.
- A Godot 4 editor smoke test has been run or explicitly documented as unavailable.

# 14. Final Architectural Verdict

Build the Godot-side painting UI as a native editor dock over the existing `.pbrain` artifact contract. Do not embed React in Godot. Do not make Godot the canonical PixelBrain compiler. Do not invent a bytecode-first v2 path inside this feature.

The correct v1 architecture is a deterministic local artifact editor: Godot can make practical pixel edits, preserve metadata, save stable JSON, and reuse the existing importer to regenerate native scenes. That gives Godot users an easy painting loop now while keeping the deeper Scholomance PixelBrain engine and future bytecode contracts intact.
