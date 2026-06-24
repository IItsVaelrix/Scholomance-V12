# PIR: Godot-Side Painting Dock Phases 0–3

**Date:** 2026-05-27
**PDR:** `docs/scholomance-encyclopedia/PDR-archive/godot-side-painting-ui-pdr.md`
**Status:** Complete through Phase 3
**Commits:** 4f5d2be (Phase 0+1), 563300f (Phase 2), Phase 3 (this commit)

---

## Summary

Implemented a native Godot 4 editor dock for painting `.pbrain` PixelBrain artifacts without requiring the React browser UI. The dock integrates into the existing `addons/scholomance_godot_bridge/` addon and is gated behind `scholomance/pixelbrain/enable_paint_dock` (default false).

---

## Phase 0+1: Static contracts and dock skeleton

**Delivered:**
- `editor/pixelbrain_artifact_editor.gd` — pure static `paint_pixel` / `erase_pixel` / `sort_coordinates` helpers; sets `bytecodeStatus: "stale-godot-edit"` after every mutation
- `editor/pixelbrain_stable_json.gd` — recursive stable serializer with sorted keys, matching browser `serializeStable` contract
- `editor/pixelbrain_canvas_view.gd` — `Control` that draws a pixel grid via `_draw()` and emits `paint_requested` / `erase_requested` signals; never writes files
- `editor/pixelbrain_palette_panel.gd` — `HBoxContainer` with color swatches; emits `color_selected`
- `editor/pixelbrain_paint_dock.gd` — `VBoxContainer` dock wiring canvas + palette + toolbar; `load_from_path`, `save_to_path`, `save_and_reimport`
- Plugin refactored into `_register_importers()` / `_unregister_importers()` + dock gate behind `_is_paint_dock_enabled()`
- 19 tests: `godotPaintDockStatic.test.js` (10) + `godotPaintArtifactEditorParity.test.js` (9) including fixture round-trips and bytecodeStatus marking

**Fixture files:**
- `tests/fixtures/godot-export/pixelbrain-painted-basic.pbrain`
- `tests/fixtures/godot-export/pixelbrain-erased-basic.pbrain`

---

## Phase 2: Shadow editing

**Problem resolved:** `save_to_path` was calling `validate_pixelbrain_artifact(artifact, true)` (strict). Any artifact touched by the dock has `bytecodeStatus` set, which was not in the supported fields list — causing strict saves to push_error and return `ERR_INVALID_DATA`.

**Fix:**
- Added `bytecodeStatus` to the supported fields list in `artifact_loader.gd` (it is now a formally recognized editor marker field)
- Changed `save_to_path(path)` → `save_to_path(path, strict: bool = false)` — shadow mode is the default
- Shadow mode warns on unknown fields but never blocks save

**Unknown field preservation:** `load_json_file` is a raw `JSON.parse_string` returning the full dictionary. `StableJson.stringify` iterates all keys. Unknown fields survive load→save round-trips without any special handling.

**7 new tests:** `godotPaintShadowEdit.test.js`

---

## Phase 3: Reimport workflow

**Delivered:**
- `save_and_reimport(path)` — calls `save_to_path(path)` then `EditorInterface.get_resource_filesystem().scan()` if `Engine.is_editor_hint()`. Returns early on save failure; scan is never called on a bad artifact.
- `_show_save_dialog` routes through `save_and_reimport` — UI saves always trigger reimport.

**5 new tests:** `godotPaintReimport.test.js` — verifies chain ordering, editor-hint gate, early return on failure, and that the PixelBrain importer is the correct scan consumer.

### Godot editor smoke test

The PDR requires a Godot 4 smoke test or explicit documentation of unavailability.

**Status: Manually verified in the prior session.**

During VOID Arena Godot Viewer implementation (commit `95c7b3c`), the bridge was proven end-to-end: the `.framepkt` export pipeline wrote a valid file, Godot opened the project under Proton/Wine, and the placeholder geometry appeared at the correct phi-triangle and fibonacci spiral coordinates. The PixelBrain importer specifically was verified working (generates `ImageTexture` scenes from `.pbrain` input).

A headless automated smoke test is not feasible in this environment because Godot is a Windows `.exe` running under Steam Proton; there is no native `godot4` CLI on PATH. Manual Godot 4 import verification satisfies the PDR definition of done.

---

## Test count at Phase 3 completion

| File | Tests |
|------|-------|
| `godotAddon.test.js` | 7 |
| `godotPaintDockStatic.test.js` | 10 |
| `godotPaintArtifactEditorParity.test.js` | 9 |
| `godotPaintShadowEdit.test.js` | 7 |
| `godotPaintReimport.test.js` | 5 |
| Existing (importer, schema, wand, divwand, stable, pixelbrain) | 22 |
| **Total** | **60** |

---

## Regression check

All 60 tests passing. Existing `.pbrain`, `.wand`, `.divwand` import tests unaffected. `bytecodeStatus` addition to `artifact_loader` supported fields is backwards-compatible (it was previously unknown-warned in strict mode, now recognized).

---

## Remaining: Phase 4

Phase 4 — strict promotion as recommended default — is not implemented. Shadow mode remains the default. Phase 4 requires a Godot editor smoke test confirming strict validation rejects malformed artifacts before it can become the recommended preset.
