import { createByteMap } from './shared.js';
import { bytecodeToPalette } from './color-byte-mapping.js';
import {
  SOURCE_MATERIAL,
  resolveMaterialId,
  transmuteMaterialPalette,
} from './material-registry.js';
import { resolveKnownColor } from '../microprocessors/color/ColorResolver.js';

function normalizePaletteArray(value) {
  if (Array.isArray(value)) return value.map(String);
  if (Array.isArray(value?.colors)) return value.colors.map(String);
  return [];
}

export function resolvePixelBrainPaletteAuthority(input = {}) {
  const materialId = resolveMaterialId(input.material || input.materialId || SOURCE_MATERIAL);
  let sourcePalette = normalizePaletteArray(input.sourcePalette || input.palette);
  let semanticPalette = [];
  let namedColor = null;
  let bytecodePalette = null;
  const diagnostics = [];

  if (input.color || input.name || input.hex || input.rgb) {
    namedColor = resolveKnownColor({
      color: input.color || input.name || input.hex,
      hex: input.hex,
      rgb: input.rgb,
      paletteSize: input.paletteSize,
    });
    if (namedColor.ok) {
      sourcePalette = namedColor.palette;
      diagnostics.push({ stage: 'named-color', status: 'ok', color: namedColor.hex });
    } else {
      diagnostics.push({ stage: 'named-color', status: 'warning', error: namedColor.error });
    }
  }

  if (input.bytecode) {
    bytecodePalette = bytecodeToPalette(input.bytecode, input.options || {});
    semanticPalette = normalizePaletteArray(bytecodePalette);
    if (semanticPalette.length > 0) sourcePalette = semanticPalette;
    diagnostics.push({ stage: 'bytecode-palette', status: 'ok', bytecode: String(input.bytecode).toUpperCase() });
  }

  if (sourcePalette.length === 0 && Array.isArray(input.palettes) && input.palettes[0]) {
    sourcePalette = normalizePaletteArray(input.palettes[0]);
  }

  const materialPalette = transmuteMaterialPalette(sourcePalette, materialId);

  return Object.freeze({
    ok: true,
    authority: 'pixelbrain.palette-authority.v1',
    materialId,
    namedColor,
    bytecodePalette,
    sourcePalette: Object.freeze(sourcePalette),
    semanticPalette: Object.freeze(semanticPalette),
    materialPalette: Object.freeze(materialPalette),
    byteMap: createByteMap(materialPalette),
    diagnostics: Object.freeze(diagnostics),
  });
}
