import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const IMPORT_SCRIPT = readFileSync('scripts/aseprite/foundry_import.lua', 'utf8');
const EXPORT_SCRIPT = readFileSync('scripts/aseprite/foundry_export.lua', 'utf8');
const README = readFileSync('scripts/aseprite/README.md', 'utf8');

describe('Foundry Aseprite Lua scripts', () => {
  it('imports Foundry bridge JSON into Aseprite sprite layers', () => {
    expect(IMPORT_SCRIPT).toContain('foundry-aseprite-lua/0.1.0');
    expect(IMPORT_SCRIPT).toContain('json.decode');
    expect(IMPORT_SCRIPT).toContain('Sprite(width, height, ColorMode.INDEXED)');
    expect(IMPORT_SCRIPT).toContain('Palette(#colors)');
    expect(IMPORT_SCRIPT).toContain('paletteLocked = true');
    expect(IMPORT_SCRIPT).toContain('sprite.gridBounds = Rectangle(0, 0, 1, 1)');
    expect(IMPORT_SCRIPT).toContain('app.preferences.tool("pencil").pixel_perfect = true');
    expect(IMPORT_SCRIPT).toContain('app.preferences.tool("line").pixel_perfect = true');
    expect(IMPORT_SCRIPT).toContain('sprite:newLayer()');
    expect(IMPORT_SCRIPT).toContain('sprite:newCel(layer, frame, image, Point(0, 0))');
    expect(IMPORT_SCRIPT).toContain('image:putPixel');
  });

  it('exports active Aseprite sprite back into Foundry bridge JSON', () => {
    expect(EXPORT_SCRIPT).toContain('foundry-aseprite-lua/0.1.0');
    expect(EXPORT_SCRIPT).toContain('app.activeSprite');
    expect(EXPORT_SCRIPT).toContain('image:pixels()');
    expect(EXPORT_SCRIPT).toContain('app.pixelColor.rgbaA');
    expect(EXPORT_SCRIPT).toContain('sprite.colorMode == ColorMode.INDEXED');
    expect(EXPORT_SCRIPT).toContain('palette:getColor(pixel)');
    expect(EXPORT_SCRIPT).toContain('gridType = "rectangular"');
    expect(EXPORT_SCRIPT).toContain('json_api.encode(payload)');
  });

  it('documents install and round-trip workflow', () => {
    expect(README).toContain('File -> Scripts -> Open Scripts Folder');
    expect(README).toContain('foundry_import.lua');
    expect(README).toContain('foundry_export.lua');
    expect(README).toContain('importAsepriteToFoundryAsset');
  });
});
