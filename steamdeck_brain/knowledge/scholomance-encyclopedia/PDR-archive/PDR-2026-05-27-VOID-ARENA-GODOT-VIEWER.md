# PDR: VOID Arena Godot Viewer Pipeline

**Status:** Draft
**Classification:** Structural + Behavioral + Godot Interop + Tooling
**Priority:** High
**Primary Goal:** Generate a `.framepkt` file from the existing TypeScript scene builders, add a `FrameInstantiationTimeline` importer and runtime runner to the bridge addon, scaffold a minimal Godot project, and open the VOID art scene with placeholder geometry in the Godot editor.

---

## 1. Executive Summary

The VOID Art Scene TypeScript builders (`voidArenaScene.ts`, `voidSingularityTrigger.ts`) already exist and produce valid `FrameInstantiationTimeline` JSON. The Godot engine is installed via Steam. The `scholomance_godot_bridge` addon is in `addons/`. Despite all three pieces being present, nothing connects them — there is no Godot project, no `.framepkt` importer, and no runtime runner that applies frame packets to scene nodes.

This PDR defines the exact pipeline to bridge the gap:

```
TypeScript builders
      ↓  scripts/export-void-arena.ts  (new)
void_arena.framepkt  (JSON, FrameInstantiationTimeline)
      ↓  frame_timeline_importer.gd    (new — EditorImportPlugin)
PackedScene (frame 0 — resting layout)
      ↓  VoidArena.tscn                (new — minimal Godot scene)
      ↓  frame_timeline_runner.gd      (new — runtime, applies all frames)
Godot viewport — VOID Arena visible with placeholder geometry
```

Art assets at `res://art/void/` do not yet exist. The runner uses **placeholder ColorRect nodes** colored by object role (cyan for fissures, amethyst for cracks, near-black for pillars) so the geometry, phi-triangle placement, and fibonacci spiral layout are all visually verifiable before real sprites are created.

---

## 2. Change Classification

| Dimension | Classification | Reason |
|-----------|---------------|--------|
| Export script | Tooling | New Node.js/tsx script, no production code touched |
| `.framepkt` importer | Structural | Extends existing `EditorImportPlugin` pattern in bridge addon |
| Frame timeline runner | Behavioral | New GDScript that instantiates and mutates live Godot nodes |
| Godot project scaffold | Structural | New `project.godot`, scene file, no existing files modified |
| Bridge plugin registration | Structural | One new importer registered in `scholomance_godot_bridge_plugin.gd` |

---

## 3. Spec Sheet

### Export Script

| Property | Value |
|----------|-------|
| File | `scripts/export-void-arena.ts` |
| Runtime | `npx tsx scripts/export-void-arena.ts` |
| Input | `buildVoidArenaRestingScene()` → `printFrameTimeline()` → `toGodotRuntimeJson()` |
| Output | `godot_project/assets/void_arena.framepkt` |
| Format | `FrameInstantiationTimeline` JSON (existing lib contract) |

### Godot Project

| Property | Value |
|----------|-------|
| Location | `godot_project/` |
| Main scene | `godot_project/scenes/VoidArena.tscn` |
| Window size | 1920 × 1080 |
| Renderer | `rendering/renderer/rendering_method = "gl_compatibility"` |
| Addons | `addons/scholomance_godot_bridge` (symlinked or copied) |

### Frame Timeline Importer

| Property | Value |
|----------|-------|
| File | `addons/scholomance_godot_bridge/importers/frame_timeline_importer.gd` |
| Extension | `.framepkt` |
| Importer name | `scholomance.frame_timeline.godot` |
| Output resource | `PackedScene` (frame 0 resting scene) |
| Validation presets | Shadow Mode (default), Strict Validation |

### Frame Timeline Runner

| Property | Value |
|----------|-------|
| File | `addons/scholomance_godot_bridge/runtime/frame_timeline_runner.gd` |
| Base class | `Node2D` |
| Public API | `load_timeline_file(path: String)`, `apply_frame(n: int)`, `play(fps: int)` |
| Placeholder art | `ColorRect` nodes sized 28×28px, colored by object ID prefix |
| Missing assets | Warned via `push_warning()`, falls through to placeholder — never crashes |

### Placeholder Color Map

| Object ID prefix | Color | Represents |
|-----------------|-------|-----------|
| `fissure_` | `#00E5FF` | Void fissure (cyan) |
| `amethyst_` | `#7B2FBE` | Amethyst floor crack |
| `pillar_` | `#0D0D1A` with `#3A3A5C` border | Obsidian pillar |
| `singularity_` | `#FFFFFF` pulsing | Convergence point |
| `tilemap_` | `#111118` | Base tile grid background |
| `void_shard_` | `#00E5FF` at 60% alpha | Spawned shard |
| _(default)_ | `#444444` | Unknown object |

---

## 4. Assumptions and Unknowns

| # | Assumption / Unknown | Impact if wrong | Resolution |
|---|---------------------|-----------------|------------|
| A1 | Godot 4.x is the target (not 3.x) | GDScript syntax differs significantly between versions | Confirm: `godot.windows.opt.tools.64.exe` in Steam is Godot 4 |
| A2 | `project.godot` can reference `addons/` relative to the project root | Addon path must match exactly | Place `godot_project/` at repo root; create `godot_project/addons/` as a copy or symlink of `addons/` |
| A3 | `FrameInstantiationTimeline` JSON from `toGodotRuntimeJson()` has a trailing newline | `JSON.parse_string()` in Godot handles trailing whitespace | Confirmed — `toGodotRuntimeJson` appends `\n`; GDScript `String.strip_edges()` before parse |
| A4 | `buildVoidArenaRestingScene()` and `printFrameTimeline()` produce no TypeScript compile errors when run via `tsx` | Export script fails at runtime | Confirmed — existing tests pass; tsconfig covers `src/lib/godot-export/` |
| A5 | Godot 4 `ColorRect` inside a `Node2D` container correctly respects `z_index` | Z-ordering of placeholder nodes may be wrong | Use `z_index` on the container `Node2D`, not on the `ColorRect` child |
| A6 | The Godot Steam installation can open projects from `/home/deck/Desktop/` | Path may be inaccessible under Proton | SteamOS with Proton: use `! xdg-open godot_project/` to launch via the `.desktop` entry, not the `.exe` directly |

---

## 5. Architecture Diagram / File Map

### New Files

```
scripts/
  export-void-arena.ts               ← NEW: TypeScript → .framepkt export

godot_project/
  project.godot                      ← NEW: minimal Godot 4 project
  project.godot.import               ← auto-generated by Godot
  addons/
    scholomance_godot_bridge/        ← COPY of addons/scholomance_godot_bridge/
  scenes/
    VoidArena.tscn                   ← NEW: main scene
  scripts/
    VoidArenaScene.gd                ← NEW: loads timeline, wires runner
  assets/
    void_arena.framepkt              ← NEW: generated by export script

addons/scholomance_godot_bridge/
  plugin.cfg                         ← MODIFY: update description
  scholomance_godot_bridge_plugin.gd ← MODIFY: register frame_timeline_importer
  importers/
    frame_timeline_importer.gd       ← NEW
  runtime/
    frame_timeline_runner.gd         ← NEW
```

### Modified Files

```
addons/scholomance_godot_bridge/scholomance_godot_bridge_plugin.gd
  + var frame_timeline_importer: EditorImportPlugin
  + add_import_plugin(frame_timeline_importer)
  + remove_import_plugin(frame_timeline_importer) in _exit_tree

addons/scholomance_godot_bridge/plugin.cfg
  description += ", FrameTimeline"
```

---

## 6. Step-by-Step Implementation Plan

### Step 1 — Export script

Create `scripts/export-void-arena.ts`. Import `buildVoidArenaRestingScene` and `printFrameTimeline` and `toGodotRuntimeJson`. Call them, write the result to `godot_project/assets/void_arena.framepkt`. Create `godot_project/assets/` if it doesn't exist.

### Step 2 — Frame timeline runner

Create `addons/scholomance_godot_bridge/runtime/frame_timeline_runner.gd`. Implement:
- `load_timeline_file(path)` — reads JSON, strips edges, parses, validates `schemaVersion`
- `apply_frame(frame_number)` — finds the matching packet, applies create/update/destroy
- `_make_placeholder_node(type, id, props)` — returns a `Node2D` container with a `ColorRect`
- `_apply_transform(node, transform)` — sets position, rotation, scale, z_index
- `_apply_transform_partial(node, transform)` — applies only the changed fields
- `play(fps)` — steps through all frames using a `Timer`

### Step 3 — Frame timeline importer

Create `addons/scholomance_godot_bridge/importers/frame_timeline_importer.gd`. Follow the exact `pixelbrain_importer.gd` pattern:
- `_get_recognized_extensions()` returns `["framepkt"]`
- `_import()` loads the JSON, runs frame 0 through the runner, packs the resulting scene tree as a `PackedScene`

### Step 4 — Register importer in plugin

Edit `scholomance_godot_bridge_plugin.gd` to add `frame_timeline_importer` following the existing three-importer pattern.

### Step 5 — Godot project scaffold

Create `godot_project/project.godot` with:
- `display/window/size/viewport_width = 1920`
- `display/window/size/viewport_height = 1080`
- `application/run/main_scene = "res://scenes/VoidArena.tscn"`
- Plugin enabled: `addons/scholomance_godot_bridge`

Create `godot_project/scenes/VoidArena.tscn` and `godot_project/scripts/VoidArenaScene.gd`.

### Step 6 — Run the pipeline

```bash
npx tsx scripts/export-void-arena.ts
# Then open Godot → open godot_project/ → scene loads automatically
```

---

## 7. Code Examples

### scripts/export-void-arena.ts

```typescript
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { buildVoidArenaRestingScene } from "../src/lib/godot-export/voidArenaScene";
import { printFrameTimeline } from "../src/lib/godot/frame-printer";
import { toGodotRuntimeJson } from "../src/lib/godot/frame-printer/adapters/toGodotRuntimeJson";

const restingScene = buildVoidArenaRestingScene();

const timeline = printFrameTimeline([restingScene], {
  sceneId: "void_arena",
  fps: 60,
  seed: "void_arena_v1",
  sourceSystem: "manual",
  bytecodeContract: "framePacket",
  validate: true,
});

const json = toGodotRuntimeJson(timeline);

const outDir = join(import.meta.dirname, "../godot_project/assets");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "void_arena.framepkt"), json, "utf-8");

console.log(`Exported void_arena.framepkt — ${restingScene.objects.length} objects, ${json.length} bytes`);
```

### frame_timeline_runner.gd

```gdscript
@tool
extends Node2D

var _timeline: Dictionary = {}
var _nodes_by_id: Dictionary = {}
var _play_timer: Timer = null

const PLACEHOLDER_SIZE := 28.0

func load_timeline_file(path: String) -> bool:
	var text := FileAccess.get_file_as_string(path)
	if text.is_empty():
		push_warning("FrameTimelineRunner: could not read file: %s" % path)
		return false

	var parsed: Variant = JSON.parse_string(text.strip_edges())
	if typeof(parsed) != TYPE_DICTIONARY:
		push_warning("FrameTimelineRunner: file is not a JSON object: %s" % path)
		return false

	var data: Dictionary = parsed
	if int(data.get("schemaVersion", 0)) != 1:
		push_warning("FrameTimelineRunner: unsupported schemaVersion in %s" % path)
		return false

	_timeline = data
	return true

func apply_frame(frame_number: int) -> void:
	var packets: Array = _timeline.get("frames", [])
	for raw in packets:
		if typeof(raw) != TYPE_DICTIONARY:
			continue
		var packet: Dictionary = raw
		if int(packet.get("frame", -1)) != frame_number:
			continue
		_apply_packet(packet)
		return
	push_warning("FrameTimelineRunner: no packet found for frame %d" % frame_number)

func play(fps: int = 60) -> void:
	var packets: Array = _timeline.get("frames", [])
	if packets.is_empty():
		return

	var index := 0
	_play_timer = Timer.new()
	_play_timer.wait_time = 1.0 / float(fps)
	_play_timer.one_shot = false
	add_child(_play_timer)

	_play_timer.timeout.connect(func():
		if index >= packets.size():
			_play_timer.stop()
			return
		var packet: Dictionary = packets[index]
		_apply_packet(packet)
		index += 1
	)
	_play_timer.start()

func _apply_packet(packet: Dictionary) -> void:
	for raw in packet.get("create", []):
		if typeof(raw) == TYPE_DICTIONARY:
			_apply_create(raw)
	for raw in packet.get("update", []):
		if typeof(raw) == TYPE_DICTIONARY:
			_apply_update(raw)
	for raw in packet.get("destroy", []):
		if typeof(raw) == TYPE_DICTIONARY:
			_apply_destroy(raw)

func _apply_create(instruction: Dictionary) -> void:
	var id := str(instruction.get("id", ""))
	if id.is_empty():
		push_warning("FrameTimelineRunner: create instruction missing id")
		return
	if _nodes_by_id.has(id):
		push_warning("FrameTimelineRunner: create reuses existing id: %s" % id)
		return

	var type := str(instruction.get("type", "Node2D"))
	var props: Dictionary = instruction.get("props", {}) if typeof(instruction.get("props", {})) == TYPE_DICTIONARY else {}
	var node := _make_placeholder_node(type, id, props)
	_apply_transform(node, instruction.get("transform", {}))
	add_child(node)
	_nodes_by_id[id] = node

func _apply_update(instruction: Dictionary) -> void:
	var id := str(instruction.get("id", ""))
	if not _nodes_by_id.has(id):
		push_warning("FrameTimelineRunner: update targets unknown id: %s" % id)
		return

	var node: Node2D = _nodes_by_id[id]
	var transform: Variant = instruction.get("transform")
	if typeof(transform) == TYPE_DICTIONARY:
		_apply_transform_partial(node, transform)

func _apply_destroy(instruction: Dictionary) -> void:
	var id := str(instruction.get("id", ""))
	if not _nodes_by_id.has(id):
		push_warning("FrameTimelineRunner: destroy targets unknown id: %s" % id)
		return

	var node: Node2D = _nodes_by_id[id]
	node.queue_free()
	_nodes_by_id.erase(id)

func _make_placeholder_node(type: String, id: String, _props: Dictionary) -> Node2D:
	var container := Node2D.new()
	container.name = id

	if type == "TileMap":
		var bg := ColorRect.new()
		bg.size = Vector2(1920, 1080)
		bg.position = Vector2.ZERO
		bg.color = Color("#111118")
		container.add_child(bg)
		return container

	var rect := ColorRect.new()
	rect.size = Vector2(PLACEHOLDER_SIZE, PLACEHOLDER_SIZE)
	rect.position = Vector2(-PLACEHOLDER_SIZE / 2.0, -PLACEHOLDER_SIZE / 2.0)
	rect.color = _id_to_color(id)
	container.add_child(rect)
	return container

func _id_to_color(id: String) -> Color:
	if id.begins_with("fissure_"):
		return Color("#00E5FF")
	if id.begins_with("amethyst_"):
		return Color("#7B2FBE")
	if id.begins_with("pillar_"):
		return Color("#0D0D1A")
	if id.begins_with("singularity_"):
		return Color.WHITE
	if id.begins_with("void_shard_"):
		return Color(0.0, 0.898, 1.0, 0.6)
	return Color("#444444")

func _apply_transform(node: Node2D, transform: Dictionary) -> void:
	node.position = Vector2(float(transform.get("x", 0.0)), float(transform.get("y", 0.0)))
	node.rotation = float(transform.get("rotation", 0.0))
	node.scale = Vector2(float(transform.get("scaleX", 1.0)), float(transform.get("scaleY", 1.0)))
	node.z_index = int(transform.get("zIndex", 0))

func _apply_transform_partial(node: Node2D, transform: Dictionary) -> void:
	if transform.has("x"):
		node.position.x = float(transform.get("x"))
	if transform.has("y"):
		node.position.y = float(transform.get("y"))
	if transform.has("rotation"):
		node.rotation = float(transform.get("rotation"))
	if transform.has("scaleX"):
		node.scale.x = float(transform.get("scaleX"))
	if transform.has("scaleY"):
		node.scale.y = float(transform.get("scaleY"))
	if transform.has("zIndex"):
		node.z_index = int(transform.get("zIndex"))
```

### frame_timeline_importer.gd

```gdscript
@tool
extends EditorImportPlugin

const FrameTimelineRunner = preload("res://addons/scholomance_godot_bridge/runtime/frame_timeline_runner.gd")

func _get_importer_name() -> String:
	return "scholomance.frame_timeline.godot"

func _get_visible_name() -> String:
	return "Scholomance Frame Timeline"

func _get_recognized_extensions() -> PackedStringArray:
	return PackedStringArray(["framepkt"])

func _get_save_extension() -> String:
	return "tscn"

func _get_resource_type() -> String:
	return "PackedScene"

func _get_preset_count() -> int:
	return 2

func _get_preset_name(preset_index: int) -> String:
	if preset_index == 1:
		return "Strict Validation"
	return "Shadow Mode"

func _get_import_options(_path: String, preset_index: int) -> Array[Dictionary]:
	return [
		{
			"name": "strict_validation",
			"default_value": preset_index == 1,
		},
	]

func _get_option_visibility(_path: String, _option_name: StringName, _options: Dictionary) -> bool:
	return true

func _get_priority() -> float:
	return 1.0

func _get_import_order() -> int:
	return 0

func _import(source_file: String, save_path: String, options: Dictionary, _platform_variants: Array[String], _gen_files: Array[String]) -> Error:
	var strict_validation := bool(options.get("strict_validation", false))

	var runner := FrameTimelineRunner.new()
	var ok := runner.load_timeline_file(source_file)
	if not ok:
		if strict_validation:
			return ERR_INVALID_DATA
		push_warning("Scholomance Godot Bridge: FrameTimeline import failed in shadow mode for %s" % source_file)

	runner.apply_frame(0)
	runner.name = "VoidArenaFrameTimeline"

	var root := Node2D.new()
	root.name = "FrameTimelineArtifact"
	root.add_child(runner)
	runner.owner = root

	var scene := PackedScene.new()
	var result := scene.pack(root)
	if result != OK:
		push_warning("Scholomance Godot Bridge: failed to pack FrameTimeline scene.")
		return ERR_CANT_CREATE

	return ResourceSaver.save(scene, "%s.%s" % [save_path, _get_save_extension()])
```

### scholomance_godot_bridge_plugin.gd (modified)

```gdscript
@tool
extends EditorPlugin

var pixelbrain_importer: EditorImportPlugin
var wand_importer: EditorImportPlugin
var divwand_importer: EditorImportPlugin
var frame_timeline_importer: EditorImportPlugin

func _enter_tree() -> void:
	pixelbrain_importer = preload("res://addons/scholomance_godot_bridge/importers/pixelbrain_importer.gd").new()
	wand_importer = preload("res://addons/scholomance_godot_bridge/importers/wand_importer.gd").new()
	divwand_importer = preload("res://addons/scholomance_godot_bridge/importers/divwand_importer.gd").new()
	frame_timeline_importer = preload("res://addons/scholomance_godot_bridge/importers/frame_timeline_importer.gd").new()

	add_import_plugin(pixelbrain_importer)
	add_import_plugin(wand_importer)
	add_import_plugin(divwand_importer)
	add_import_plugin(frame_timeline_importer)

func _exit_tree() -> void:
	if frame_timeline_importer != null:
		remove_import_plugin(frame_timeline_importer)
	if divwand_importer != null:
		remove_import_plugin(divwand_importer)
	if wand_importer != null:
		remove_import_plugin(wand_importer)
	if pixelbrain_importer != null:
		remove_import_plugin(pixelbrain_importer)

	frame_timeline_importer = null
	divwand_importer = null
	wand_importer = null
	pixelbrain_importer = null
```

### godot_project/project.godot

```ini
; Engine configuration file.
; Generated for Godot 4.x

[application]
config/name="Scholomance VOID Arena"
run/main_scene="res://scenes/VoidArena.tscn"
config/features=PackedStringArray("4.3", "GL Compatibility")

[display]
window/size/viewport_width=1920
window/size/viewport_height=1080
window/size/resizable=false

[editor_plugins]
enabled=PackedStringArray("res://addons/scholomance_godot_bridge/plugin.cfg")

[rendering]
renderer/rendering_method="gl_compatibility"
renderer/rendering_method.mobile="gl_compatibility"
```

### godot_project/scripts/VoidArenaScene.gd

```gdscript
extends Node2D

const FrameTimelineRunner = preload("res://addons/scholomance_godot_bridge/runtime/frame_timeline_runner.gd")

var _runner: Node2D

func _ready() -> void:
	_runner = FrameTimelineRunner.new()
	add_child(_runner)

	var loaded := _runner.load_timeline_file("res://assets/void_arena.framepkt")
	if not loaded:
		push_error("VoidArenaScene: failed to load void_arena.framepkt")
		return

	_runner.apply_frame(0)

func _input(event: InputEvent) -> void:
	# Press Space to play the full resting scene animation
	if event is InputEventKey and event.pressed and event.keycode == KEY_SPACE:
		_runner.play(60)
```

### godot_project/scenes/VoidArena.tscn

```ini
[gd_scene load_steps=2 format=3]

[ext_resource type="Script" path="res://scripts/VoidArenaScene.gd" id="1_void_scene"]

[node name="VoidArena" type="Node2D"]
script = ExtResource("1_void_scene")

[node name="Camera2D" type="Camera2D" parent="."]
position = Vector2(960, 540)
zoom = Vector2(1, 1)
```

---

## 8. Glossary

| Term | Definition |
|------|-----------|
| `.framepkt` | File extension for a serialized `FrameInstantiationTimeline` JSON artifact consumed by the Godot bridge |
| `FrameInstantiationTimeline` | The TypeScript type (defined in `src/lib/godot/frame-printer/types.ts`) representing a full ordered sequence of frame packets with create/update/destroy instructions |
| `FrameTimelineRunner` | The new GDScript `Node2D` subclass that reads a `.framepkt` file and applies frame packets to instantiate and mutate live Godot nodes |
| `frame_timeline_importer.gd` | The new `EditorImportPlugin` that converts a `.framepkt` file to a `PackedScene` containing the resting scene (frame 0) |
| Placeholder node | A `Node2D` container with a `ColorRect` child, colored by object ID prefix. Used until real sprite assets exist at `res://art/void/` |
| Shadow mode | Import preset (default) where unsupported fields and missing assets emit `push_warning()` instead of failing. Matches existing bridge addon behavior |
| Strict validation | Import preset where any malformed input returns `ERR_INVALID_DATA` and aborts the import |
| `apply_frame(n)` | Runner method that finds the packet at frame `n` in the timeline and applies its create/update/destroy instructions |
| `play(fps)` | Runner method that steps through all frames at the given FPS using a Godot `Timer` |
| `toGodotRuntimeJson` | The TypeScript adapter at `src/lib/godot/frame-printer/adapters/toGodotRuntimeJson.ts` that serializes a `FrameInstantiationTimeline` to JSON with a trailing newline |
| `buildVoidArenaRestingScene` | The TypeScript function in `src/lib/godot-export/voidArenaScene.ts` that produces the frame-0 `NormalizedFrameState` for the VOID art scene |

---

## 9. Q&A — Top 10 Implementation Concerns

**Q1: Godot is installed as a Windows `.exe` under Proton/Steam. Can it open a project at `/home/deck/Desktop/Scholomance-V12-main/godot_project/`?**

A: Yes, but not by running the `.exe` directly from the terminal — Proton maps Linux paths to a fake Windows filesystem. Use the `.desktop` entry: `xdg-open` or the Steam launcher. Alternatively, in the terminal: `! xdg-open /home/deck/Desktop/Scholomance-V12-main/godot_project/`. Godot will see the project as a Windows path like `Z:\home\deck\Desktop\...` via Proton's Z: drive mapping, which works fine for opening projects.

**Q2: `project.godot` references `res://addons/scholomance_godot_bridge/plugin.cfg` but the bridge addon lives at `addons/scholomance_godot_bridge/` in the repo root, not inside `godot_project/`. How does the project find it?**

A: `godot_project/` needs its own `addons/` folder. Two options: (a) copy `addons/scholomance_godot_bridge/` into `godot_project/addons/scholomance_godot_bridge/` — simple but requires keeping both in sync; (b) create a symlink: `ln -s ../../addons godot_project/addons` — stays in sync automatically. Option (b) is preferred. Note: Proton handles Linux symlinks correctly.

**Q3: `frame_timeline_importer.gd` calls `FrameTimelineRunner.new()` and then `runner.apply_frame(0)` — but the runner uses `add_child()` to add nodes. During an import, there's no scene tree. Will `add_child()` work without a parent?**

A: No — calling `add_child()` on a runner that isn't part of the scene tree will work (the nodes are added as children of the runner itself, which is a valid `Node2D` subtree), but they won't be in the editor scene tree and won't have proper owner assignment for packing. Fix: after `apply_frame(0)`, iterate `runner.get_children()` recursively and set `node.owner = root` before calling `scene.pack(root)`. The runner's `_make_placeholder_node()` returns nodes whose owner must be set before packing.

**Q4: `JSON.parse_string()` in GDScript returns `null` if parsing fails, not an error code. The runner checks `typeof(parsed) != TYPE_DICTIONARY` but what if the JSON is an array at root level?**

A: The check `typeof(parsed) != TYPE_DICTIONARY` correctly catches both `null` (parse failure) and `Array` (wrong root type). The `FrameInstantiationTimeline` JSON is always a root-level object, so this guard is sufficient.

**Q5: The export script uses `import.meta.dirname` to resolve the output path. Does `tsx` support `import.meta.dirname`?**

A: `import.meta.dirname` is available in Node.js 21.2+ and ESM context. Check `package.json` for the Node version and `"type": "module"`. If the project uses CommonJS, replace with `path.dirname(fileURLToPath(import.meta.url))`. Safe fallback: use `process.cwd()` + relative path: `join(process.cwd(), "godot_project/assets")`.

**Q6: `apply_frame(0)` is called in `_ready()` in `VoidArenaScene.gd`. But `_ready()` runs in the editor when the scene is opened (`@tool` is not set on `VoidArenaScene.gd`). Is there a risk of the scene running in-editor and causing issues?**

A: `VoidArenaScene.gd` does not extend `@tool`, so `_ready()` only fires in-game (F5 / Play), not in the editor viewport. No risk. The `frame_timeline_runner.gd` is `@tool` so it can be used by the importer during the import step, but this is fine — the runner is stateless between import calls.

**Q7: The runner's `play(fps)` creates a `Timer` node and connects its `timeout` signal with a lambda closure capturing `index`. Is `index` captured by reference or value in GDScript lambda closures?**

A: GDScript lambda captures variables by reference (like Python closures). The `index` variable is shared between the closure and the outer scope — incrementing `index += 1` inside the lambda correctly advances the counter on each tick. This is the intended behavior.

**Q8: `void_arena.framepkt` is generated by running `scripts/export-void-arena.ts`. This file is in `godot_project/assets/` which is inside the Godot project. Will Godot try to import it as a `.framepkt` asset automatically when the project is opened?**

A: Yes — Godot scans all files in the project folder on open and runs the matching importer. Since `frame_timeline_importer.gd` recognizes `.framepkt`, Godot will import `void_arena.framepkt` → `void_arena.framepkt.import` + `void_arena.tscn` automatically. This is the correct behavior. The `VoidArenaScene.gd` loads the raw JSON at runtime via `load_timeline_file()`, not the imported PackedScene — both paths work independently.

**Q9: The TypeScript export script calls `printFrameTimeline([restingScene], {...})` with a single-element array. `printFrameTimeline` sets `durationFrames = lastFrame + 1 = 0 + 1 = 1`. Is a 1-frame timeline valid?**

A: Yes. `validateFrameTimeline` only checks that frames are in strictly ascending order and that create/update/destroy targets are valid. A single frame-0 packet with all creates and no updates/destroys passes all validation rules. The runner's `apply_frame(0)` finds and applies it correctly.

**Q10: The `_apply_destroy` path calls `node.queue_free()` then `_nodes_by_id.erase(id)`. If `queue_free()` is deferred (deferred free), can a subsequent `_apply_create` with the same ID run before the node is actually freed, causing a duplicate child name error?**

A: In the resting-scene viewer (single `apply_frame(0)` call), there are no destroy instructions in frame 0, so this path doesn't execute at all. For the `play()` path: `queue_free()` marks the node for deletion at the end of the current frame. If a `create` with the same ID arrives in the *same* packet, it would collide. The guard `if _nodes_by_id.has(id)` in `_apply_create` catches this and emits a warning. Fix: instead of `queue_free()`, use `node.free()` (immediate) in `_apply_destroy` when the runner knows the node won't be needed again in the same packet. Add a TODO comment.

---

## 10. QA Plan

### What to Verify After Implementation

| Check | How |
|-------|-----|
| Export script produces valid JSON | `npx tsx scripts/export-void-arena.ts && python3 -c "import json,sys; json.load(open('godot_project/assets/void_arena.framepkt'))"` |
| JSON passes TypeScript validator | Add vitest test — parse JSON, cast to `FrameInstantiationTimeline`, call `validateFrameTimeline` |
| Pillar A at (734, 255) in JSON | `grep -o '"x":734' godot_project/assets/void_arena.framepkt` |
| Singularity at (960, 672) in JSON | `grep -o '"x":960' godot_project/assets/void_arena.framepkt` |
| Object count correct | `npx tsx -e "import {buildVoidArenaRestingScene} from './src/lib/godot-export/voidArenaScene'; console.log(buildVoidArenaRestingScene().objects.length)"` |
| All existing godot tests still pass | `npx vitest run tests/godot/` |
| TypeScript clean | `npx tsc --project tsconfig.json --noEmit` |

### New Test: `tests/godot/voidArenaExport.test.ts`

```typescript
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { validateFrameTimeline } from "../../src/lib/godot/frame-printer";
import type { FrameInstantiationTimeline } from "../../src/lib/godot/frame-printer";

const FRAMEPKT_PATH = join(process.cwd(), "godot_project/assets/void_arena.framepkt");

describe("void_arena.framepkt export", () => {
  it("file exists after export script is run", () => {
    expect(existsSync(FRAMEPKT_PATH)).toBe(true);
  });

  it("parses as valid JSON", () => {
    const raw = readFileSync(FRAMEPKT_PATH, "utf-8");
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it("passes FrameInstantiationTimeline validation", () => {
    const timeline = JSON.parse(readFileSync(FRAMEPKT_PATH, "utf-8")) as FrameInstantiationTimeline;
    const result = validateFrameTimeline(timeline);
    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("singularity is at x=960, y=672", () => {
    const timeline = JSON.parse(readFileSync(FRAMEPKT_PATH, "utf-8")) as FrameInstantiationTimeline;
    const frame0 = timeline.frames[0];
    const singularity = frame0.create.find((c) => c.id === "singularity_marker");
    expect(singularity?.transform.x).toBe(960);
    expect(singularity?.transform.y).toBe(672);
  });

  it("contains exactly 3 pillar create instructions", () => {
    const timeline = JSON.parse(readFileSync(FRAMEPKT_PATH, "utf-8")) as FrameInstantiationTimeline;
    const pillars = timeline.frames[0].create.filter((c) => c.id.startsWith("pillar_"));
    expect(pillars).toHaveLength(3);
  });

  it("has schemaVersion 1", () => {
    const timeline = JSON.parse(readFileSync(FRAMEPKT_PATH, "utf-8")) as FrameInstantiationTimeline;
    expect(timeline.schemaVersion).toBe(1);
  });
});
```

### Run Commands

```bash
# Generate the .framepkt
npx tsx scripts/export-void-arena.ts

# Validate the output
npx vitest run tests/godot/voidArenaExport.test.ts

# Full godot test suite (must still be 16/16 green)
npx vitest run tests/godot/

# TypeScript clean
npx tsc --project tsconfig.json --noEmit
```

---

## 11. Regression Risks and Retest Checklist

| Risk | Area | Retest |
|------|------|--------|
| `scholomance_godot_bridge_plugin.gd` edit breaks existing `.pbrain/.wand/.divwand` importers | Plugin registration | Open Godot, check all three existing importers appear in Project → Import |
| `frame_timeline_runner.gd` added to runtime dir breaks `artifact_loader.gd` preloads | Bridge runtime | Existing importers do not preload `frame_timeline_runner.gd` — no conflict possible |
| `export-void-arena.ts` script imports from `src/lib/godot-export/` which may have TypeScript errors | Export pipeline | `npx tsc --project tsconfig.json --noEmit` must be clean before running the script |
| `godot_project/addons/` symlink or copy diverges from `addons/` source | Bridge addon | If copying: establish a `cp -r addons/scholomance_godot_bridge godot_project/addons/` step in the rollout and re-run after any addon edits |
| Existing `tests/godot/` tests unaffected | Frame printer lib | `npx vitest run tests/godot/` — all 16 must pass |
| New `voidArenaExport.test.ts` skipped if `.framepkt` not generated | CI ordering | Export script must run before this test in any CI pipeline; note in CI config |

---

## 12. Rollout Plan

### Phase 1 — Generate and inspect (no Godot needed yet)

```bash
npx tsx scripts/export-void-arena.ts
# Inspect output
cat godot_project/assets/void_arena.framepkt | python3 -m json.tool | head -60
```

Verify object count, pillar coordinates, singularity position in raw JSON.

### Phase 2 — Bridge addon extension (no Godot project needed yet)

Add `frame_timeline_runner.gd` and `frame_timeline_importer.gd` to the bridge addon. Register in `scholomance_godot_bridge_plugin.gd`. Existing importers are unaffected — they don't reference the new files.

### Phase 3 — Godot project scaffold

Create `godot_project/` with `project.godot`, `scenes/VoidArena.tscn`, `scripts/VoidArenaScene.gd`. Create the `addons/` symlink. Copy or symlink `godot_project/assets/void_arena.framepkt`.

### Phase 4 — Open in Godot

```bash
! xdg-open /home/deck/Desktop/Scholomance-V12-main/godot_project/
```

Godot opens → detects `.framepkt` → runs importer → `VoidArena.tscn` loads → press F5 → scene runs → placeholder geometry visible.

### Phase 5 — Visual verification

With the scene running, verify:
- Dark background tile (TileMap placeholder) fills viewport
- ~17 cyan fissure segments trace a clockwise curve across the scene
- 3 dark pillar rectangles at upper-left, upper-right, lower-center positions
- 28 amethyst fragments scattered with expected cluster distribution
- White singularity marker near center-bottom
- No crashes, no `ERR_INVALID_DATA` in Godot output panel

---

## 13. Definition of Done

- [ ] `scripts/export-void-arena.ts` — runs without error, produces `godot_project/assets/void_arena.framepkt`
- [ ] `void_arena.framepkt` passes `validateFrameTimeline` — zero issues
- [ ] `addons/scholomance_godot_bridge/runtime/frame_timeline_runner.gd` — created, no GDScript errors in editor
- [ ] `addons/scholomance_godot_bridge/importers/frame_timeline_importer.gd` — created, registered in plugin
- [ ] `scholomance_godot_bridge_plugin.gd` — updated, all four importers register cleanly
- [ ] `godot_project/project.godot` — Godot opens the project without errors
- [ ] `godot_project/scenes/VoidArena.tscn` + `godot_project/scripts/VoidArenaScene.gd` — scene loads and runs (F5)
- [ ] Placeholder geometry visible: fissures cyan, pillars dark, amethyst scattered, singularity white
- [ ] `tests/godot/voidArenaExport.test.ts` — all 6 tests pass
- [ ] All 16 existing `tests/godot/` tests continue to pass
- [ ] Zero TypeScript errors: `npx tsc --project tsconfig.json --noEmit`

---

## 14. Final Architectural Verdict

This PDR creates the minimum viable pipeline to visualize the VOID art scene in Godot. It makes no changes to the existing frame printer lib, no changes to any TypeScript source files other than the new export script, and no changes to the existing `.pbrain/.wand/.divwand` importers or their runtime renderers. Every new file is either additive (new GDScript in the bridge) or isolated (the `godot_project/` scaffold is a self-contained directory).

The `frame_timeline_runner.gd` is deliberately dumb: it maps object IDs to colored rectangles, applies transforms, and steps through frames. It does not attempt to load sprites, run shaders, or animate anything. This is correct for the viewer phase — the goal is to confirm that the phi-triangle geometry, fibonacci spiral fissure layout, and singularity placement are visually correct before committing to real art assets.

The one non-obvious implementation requirement is **Q3**: the importer must recursively set `node.owner = root` on all descendants of the runner after `apply_frame(0)` before calling `scene.pack()`. Without this, `PackedScene.pack()` silently omits nodes whose owner is not in the packed subtree. The fix is a single recursive loop added at the end of `_import()` in `frame_timeline_importer.gd`.

**Verdict: Approved for implementation. Begin at Step 1 (export script). The scene will be visible in Godot by end of Step 4.**
