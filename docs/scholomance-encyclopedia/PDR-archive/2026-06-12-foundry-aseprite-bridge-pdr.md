# PDR: Foundry Aseprite Bridge
## Manual Edit Round-Trip for PixelBrain Item Foundry Assets

**Status:** Implemented
**Classification:** PixelBrain + Item Foundry + Aseprite + Manual Editing
**Priority:** High
**Primary Goal:** Let generated Foundry assets export into an editable Aseprite-compatible JSON shape and import manual edits back into a PixelBrain asset packet.

---

# 1. Executive Summary

The PixelBrain Item Foundry can now generate deterministic assets from `ITEM-SPEC-v1`, but generated assets need a manual finishing loop. Artists should be able to take a forged item, edit cells/layers by hand in an Aseprite-style workflow, and bring the result back into PixelBrain without losing canvas, layer, color, and provenance data.

This PDR adds a Foundry Aseprite bridge that converts Foundry bundles or coordinate sets into the existing Aseprite-compatible JSON structure and imports edited JSON into a canonical `PixelBrainAssetPacket`.

# 2. Problem Statement

The existing TemplateEditor Aseprite helpers operate on template grids. Foundry bundles are different: they contain polished coordinates, part ids, rim/motif flags, material metadata, asset packet provenance, and spec compatibility data. A direct bridge is needed so manual edits preserve Foundry-specific context.

# 3. Product Goal

Add:

```text
codex/core/pixelbrain/foundry-aseprite-bridge.js
```

Exports:

- `exportFoundryToAseprite(foundry, options)`
- `exportFoundryToAsepriteBinary(foundry, options)`
- `decodeFoundryAsepriteBinary(buffer)`
- `importAsepriteToFoundryAsset(payload, options)`
- `importAsepriteBinaryToFoundryAsset(buffer, options)`
- `scripts/aseprite/foundry_import.lua`
- `scripts/aseprite/foundry_export.lua`

UI and scripts access the bridge through:

```text
src/lib/pixelbrain.adapter.js
```

# 4. Non-Goals

- Do not implement the entire Aseprite binary feature surface; v1 supports 32-bit RGBA image layers and raw cels.
- Do not require Aseprite to be installed for core tests.
- Do not mutate Foundry specs or source bundles.
- Do not replace TemplateEditor's existing Aseprite import/export.
- Do not infer a new item spec from arbitrary manual edits in v1.

# 5. Design

Export:

```text
Foundry bundle / coordinates
  -> Aseprite-compatible JSON
  -> editable frame/layer/cell model
```

Import:

```text
Aseprite-compatible JSON
  -> validation
  -> coordinates
  -> PixelBrainAssetPacket
```

Native binary:

```text
Foundry bundle
  -> exportFoundryToAsepriteBinary()
  -> .aseprite/.ase Buffer
  -> Aseprite native open/save
  -> importAsepriteBinaryToFoundryAsset()
```

The export groups cells by Foundry `partId` by default so the manual editor sees layers such as `blade`, `grip`, `pommel`, `rim`, or motif roles.

Shield-like assets use an artist-facing canonical layer convention:

```text
00_Reference   original cells at low opacity, locked/non-editable
10_Structure   outer ring and main silhouette
20_Energy      concentric rings / energy cells
30_Focal       center emblem or highest-contrast focal cells
40_Shading     form and depth cells
50_Glow_Effects optional glow/effect cells
99_Final       flattened preview, hidden/non-editable
```

The bridge JSON declares `colorMode: indexed`, carries an explicit locked palette, and records pixel-perfect 1x1 grid defaults. The Aseprite Lua importer enforces those defaults by creating an indexed sprite, installing the palette, setting a 1x1 grid, and enabling Pixel Perfect mode for Pencil/Line tools when available.

The Lua scripts complete the GUI hand-edit loop:

```text
Foundry JSON
  -> foundry_import.lua
  -> Aseprite editable layers
  -> foundry_export.lua
  -> Foundry JSON
  -> importAsepriteToFoundryAsset()
```

# 6. Success Criteria

- Exported Foundry payload validates through existing Aseprite JSON validation.
- Layers preserve part names.
- Cells preserve color, x/y, emphasis, and metadata where available.
- JSON/Lua import defaults to indexed color mode with a locked explicit palette.
- Shield assets expose the canonical reference/structure/energy/focal/shading/glow/final layer set.
- Manual color edits import into a new `pixelbrain.asset.v1` packet.
- Native binary export produces a valid Aseprite file header and 32-bit RGBA layer/cel chunks.
- Native binary decode returns bridge JSON that can import into a `pixelbrain.asset.v1` packet.
- Invalid payloads return structured failure instead of throwing.
