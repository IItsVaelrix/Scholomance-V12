# Foundry Aseprite Scripts

These scripts let Aseprite consume and emit the JSON produced by the PixelBrain Foundry Aseprite bridge. The JSON path is the recommended full-fidelity manual editing route because it enforces indexed color mode, installs the bridge palette, and preserves layer metadata.

## Files

- `foundry_import.lua` — imports Foundry bridge JSON into an editable indexed-color Aseprite sprite with an explicit locked palette and pixel-perfect 1x1 grid defaults.
- `foundry_export.lua` — exports the active Aseprite sprite back into Foundry bridge JSON that `importAsepriteToFoundryAsset()` can read.

## Install

1. Open Aseprite.
2. Go to `File -> Scripts -> Open Scripts Folder`.
3. Copy `foundry_import.lua` and `foundry_export.lua` into that folder.
4. Go to `File -> Scripts -> Rescan Scripts Folder`.

## Round Trip

1. Generate or forge an asset in Scholomance.
2. Export it with:

```js
const asepriteJson = exportFoundryToAseprite(foundryBundle);
```

3. Save that object as `asset.foundry.json`.
4. In Aseprite, run `foundry_import.lua`.
5. Edit the sprite manually.
6. In Aseprite, run `foundry_export.lua`.
7. Import the edited JSON back into Scholomance:

```js
const result = importAsepriteToFoundryAsset(editedJson);
const editedPacket = result.assetPacket;
```

## Notes

- Native `.aseprite` export exists for quick open/edit workflows, but the current binary codec intentionally supports only 32-bit RGBA image layers and raw cels. It does not yet encode indexed palettes, groups, tags, slices, tilemaps, or compressed cels.
- Use the JSON import/export scripts when palette discipline, canonical layer metadata, and reliable full-fidelity round-tripping matter.
- The importer requires Aseprite's scripting `json` module.
- Imported sprites are created as `ColorMode.INDEXED`.
- The importer sets a 1x1 grid and attempts to enable Pixel Perfect mode for Pencil and Line tools.
- Coordinates are 0-based and map directly to PixelBrain cells.
- Layer names are preserved as part identities on export.
- Shield-like assets use the canonical layer convention `00_Reference`, `10_Structure`, `20_Energy`, `30_Focal`, `40_Shading`, `50_Glow_Effects`, and hidden `99_Final`.
- Non-transparent pixels become cells; transparent pixels are ignored.
