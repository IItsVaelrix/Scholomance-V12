import { registerUniformProvider } from './shader-uniform-registry.js';
import { MATERIAL_SHADER_INDEX } from './material-registry.js';

function toFloat(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function materialIndex(materialId) {
  // Single authority: material-registry's append-only index map.
  // Unknown materials fall back to 0 ('source') explicitly.
  const index = MATERIAL_SHADER_INDEX[String(materialId || 'source')];
  return Number.isInteger(index) ? index : 0;
}

export const PIXELBRAIN_SHADER_UNIFORM_PROVIDER_ID = 'pixelbrain-state';

export function resolvePixelBrainShaderUniforms(context = {}) {
  const packet = context.packet || context.assetPacket || {};
  const render = context.renderPacket || {};
  const template = packet.template || {};
  const material = render.material || packet.material || {};
  const paletteCount = Array.isArray(render.palettes)
    ? render.palettes.length
    : Array.isArray(packet.palette?.sourcePalette)
      ? packet.palette.sourcePalette.length
      : 0;
  const fillState = template.fillState || {};
  const bytecode = packet.bytecode?.components || {};

  return {
    u_pixelbrain_material: materialIndex(material.id),
    u_pixelbrain_palette_count: paletteCount,
    u_pixelbrain_is_template: template.gridType || packet.geometry?.mode === 'template-grid' ? 1 : 0,
    u_pixelbrain_wand_present: context.wandFillSpec || fillState.source === 'wand' ? 1 : 0,
    u_pixelbrain_photonic_ready: packet.photonic?.status === 'ready' || context.photonicRoute ? 1 : 0,
    u_pixelbrain_fill_school: toFloat(context.schoolIndex ?? bytecode.schoolIndex, 0),
    u_pixelbrain_fill_rarity: String(fillState.rarity || bytecode.rarity || '').length,
    u_pixelbrain_fill_effect: String(fillState.effect || bytecode.effect || '').length,
  };
}

export function registerPixelBrainShaderUniformProvider() {
  registerUniformProvider(PIXELBRAIN_SHADER_UNIFORM_PROVIDER_ID, {
    uniforms: [
      'u_pixelbrain_material',
      'u_pixelbrain_palette_count',
      'u_pixelbrain_is_template',
      'u_pixelbrain_wand_present',
      'u_pixelbrain_photonic_ready',
      'u_pixelbrain_fill_school',
      'u_pixelbrain_fill_rarity',
      'u_pixelbrain_fill_effect',
    ],
    resolve: resolvePixelBrainShaderUniforms,
  });
}
