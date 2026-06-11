/**
 * PixelBrain Shader Uniform Resolver
 *
 * Decouples shader input parameters from UI components by resolving uniform values
 * declaratively from authoritative game states (clock, spells, palettes).
 */

import { resolveShaderUniforms as registryResolveShaderUniforms } from './shader-uniform-registry.js';

export const DEFAULT_SHADER_UNIFORMS = Object.freeze({
  u_time: {
    type: 'float',
    source: 'clock.elapsedSeconds',
    default: 0,
  },
  u_resolution: {
    type: 'vec2',
    source: 'canvas.size',
    default: [160, 144],
  },
  u_school: {
    type: 'int',
    source: 'spell.schoolIndex',
    default: 0,
  },
  u_resonance: {
    type: 'float',
    source: 'verse.resonance',
    default: 0.5,
  },
  u_vowel_density: {
    type: 'float',
    source: 'verse.vowelDensity',
    default: 0.5,
  },
  u_palette0: {
    type: 'vec3',
    source: 'palette.0.rgb01',
    default: [0.0, 0.0, 0.0],
  },
});

/**
 * Resolves properties from a dot-notation path on a nested object.
 */
export function getNestedProperty(obj, path) {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Converts a hex color string into a normalized [r, g, b] array in [0..1] range.
 */
export function hexToRgb01(hex) {
  const clean = String(hex || '').trim().replace('#', '');
  if (clean.length !== 6 && clean.length !== 8) return [0, 0, 0];
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return [
    Number.isFinite(r) ? r : 0,
    Number.isFinite(g) ? g : 0,
    Number.isFinite(b) ? b : 0,
  ];
}

/**
 * Maps the packet's uniform definitions against the active runtimeState.
 * Returns a frozen map of uniform types and concrete values.
 */
export function resolveShaderUniforms(packet, runtimeState = {}) {
  const resolved = {};

  // Resolve registry uniforms first
  let registryUniforms = {};
  try {
    const registryResult = registryResolveShaderUniforms(runtimeState);
    if (registryResult.ok) {
      registryUniforms = registryResult.uniforms;
    }
  } catch (e) {
    // Fail-safe if registry is not loaded
  }

  const declaredUniforms = {
    ...DEFAULT_SHADER_UNIFORMS,
    ...(packet?.uniforms || {}),
  };

  // Add any registry uniforms to declaredUniforms if not already present
  for (const name of Object.keys(registryUniforms)) {
    if (!(name in declaredUniforms)) {
      const UNIFORM_TYPE_MAP = {
        u_time: 'float',
        u_resolution: 'vec2',
        u_resonance: 'float',
        u_school: 'int',
        u_vowel_density: 'float',
        u_palette0: 'vec3',
        u_spellIntensity: 'float',
      };
      declaredUniforms[name] = {
        type: UNIFORM_TYPE_MAP[name] || 'float',
        default: 0,
      };
    }
  }

  for (const [name, config] of Object.entries(declaredUniforms)) {
    const type = config.type || 'float';
    const source = config.source;
    let rawValue = undefined;

    if (name in registryUniforms) {
      rawValue = registryUniforms[name];
    } else if (source) {
      rawValue = getNestedProperty(runtimeState, source);
    }

    if (rawValue === undefined) {
      rawValue = config.default;
    }

    let finalValue = rawValue;
    if (type === 'float') {
      finalValue = Number(rawValue);
      if (!Number.isFinite(finalValue)) finalValue = 0;
    } else if (type === 'int') {
      finalValue = parseInt(rawValue, 10);
      if (Number.isNaN(finalValue)) finalValue = 0;
    } else if (type === 'vec2') {
      if (Array.isArray(rawValue)) {
        finalValue = [
          Number(rawValue[0]) || 0,
          Number(rawValue[1]) || 0,
        ];
      } else {
        finalValue = [0, 0];
      }
    } else if (type === 'vec3') {
      if (typeof rawValue === 'string' && (rawValue.startsWith('#') || /^[0-9A-F]{6}$/i.test(rawValue))) {
        finalValue = hexToRgb01(rawValue);
      } else if (Array.isArray(rawValue)) {
        finalValue = [
          Number(rawValue[0]) || 0,
          Number(rawValue[1]) || 0,
          Number(rawValue[2]) || 0,
        ];
      } else {
        finalValue = [0, 0, 0];
      }
    }

    resolved[name] = Object.freeze({
      type,
      value: finalValue,
    });
  }

  return Object.freeze(resolved);
}
