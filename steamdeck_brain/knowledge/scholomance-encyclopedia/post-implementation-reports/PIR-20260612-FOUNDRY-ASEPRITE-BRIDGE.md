# PIR: Foundry Aseprite Bridge

**Date:** 2026-06-12  
**PDR:** [`2026-06-12-foundry-aseprite-bridge-pdr.md`](../PDR-archive/2026-06-12-foundry-aseprite-bridge-pdr.md)  
**Status:** Implemented  
**Classification:** PixelBrain + Item Foundry + Aseprite + Manual Editing  

---

## Summary

Added a Foundry-specific Aseprite bridge so generated Item Foundry bundles can be exported into editable Aseprite-compatible JSON or native `.aseprite` binary files and imported back into PixelBrain as manual-edit asset packets.

The bridge preserves canvas dimensions, editable layers, colors, emphasis, Foundry part metadata, and provenance. It uses the existing Aseprite validation/import contract for safety while producing a PixelBrain asset packet suitable for preview/export/render pipelines after manual edits.

---

## Files

- `codex/core/pixelbrain/foundry-aseprite-bridge.js`
- `codex/core/pixelbrain/aseprite-binary-codec.js`
- `src/lib/pixelbrain.adapter.js`
- `scripts/aseprite/foundry_import.lua`
- `scripts/aseprite/foundry_export.lua`
- `scripts/aseprite/README.md`
- `tests/core/pixelbrain/foundry-aseprite-bridge.test.js`
- `tests/core/pixelbrain/aseprite-lua-scripts.test.js`
- `docs/scholomance-encyclopedia/PDR-archive/2026-06-12-foundry-aseprite-bridge-pdr.md`

---

## Usage

Export:

```js
const asepriteJson = exportFoundryToAseprite(foundryBundle);
```

Import:

```js
const result = importAsepriteToFoundryAsset(editedAsepriteJson);
const packet = result.assetPacket;
```

Native binary:

```js
const bytes = exportFoundryToAsepriteBinary(foundryBundle);
const result = importAsepriteBinaryToFoundryAsset(bytes);
```

Default layer grouping is by Foundry `partId`, so a weapon can expose editable layers such as `blade`, `grip`, and `pommel`.

Shield-like assets use the canonical editing convention:

```text
00_Reference
10_Structure
20_Energy
30_Focal
40_Shading
50_Glow_Effects
99_Final
```

The reference and final-preview layers are non-editable bridge layers and are ignored on PixelBrain re-import so they do not duplicate coordinates.

Aseprite GUI round-trip:

1. Install `scripts/aseprite/foundry_import.lua` and `scripts/aseprite/foundry_export.lua` into Aseprite's scripts folder.
2. Run `foundry_import.lua` to turn Foundry JSON into indexed-color editable layers with the explicit bridge palette.
3. Edit by hand.
4. Run `foundry_export.lua` to write JSON accepted by `importAsepriteToFoundryAsset()`.

---

## QA

Commands run:

```bash
npx vitest run tests/core/pixelbrain/foundry-aseprite-bridge.test.js
npx vitest run tests/core/pixelbrain/aseprite-lua-scripts.test.js
npx eslint codex/core/pixelbrain/aseprite-binary-codec.js codex/core/pixelbrain/foundry-aseprite-bridge.js codex/core/pixelbrain/template-grid-engine.js src/lib/pixelbrain.adapter.js tests/core/pixelbrain/foundry-aseprite-bridge.test.js tests/core/pixelbrain/aseprite-lua-scripts.test.js --quiet
```

Result:

- Vitest: bridge coverage passed; Lua script static coverage added.
- ESLint: passed with no reported errors.

---

## Residual Risk

The binary codec supports the native subset needed by Foundry art: 32-bit RGBA sprites, image layers, and raw image cels. It does not yet cover every Aseprite feature such as indexed palette chunks, groups, tilemaps, tags, slices, or compressed cels. For strict palette discipline and full-fidelity bridge metadata, use the JSON/Lua path. Aseprite itself is not available in CI, so native coverage verifies binary headers, layer/cel decode, and packet import round-trip.
