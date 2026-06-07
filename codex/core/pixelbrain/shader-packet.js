/**
 * PixelBrain Shader Packet Contract (PB-SHADER-v1)
 *
 * Defines the immutable shader packet data structure, validation rules,
 * and deterministic FNV-1a hashing logic with recursive uniform key sorting.
 */

import { hashString } from './shared.js';

export const PB_SHADER_PACKET_VERSION = 'PB-SHADER-v1';

/**
 * Creates an immutable, frozen shader packet.
 */
export function createShaderPacket({
  id,
  label,
  fragmentSource,
  uniforms = {},
  canvas = { width: 160, height: 144 },
  target = 'fragment',
  dialect = 'glsl-es-300',
  deterministicSeed = 0,
} = {}) {
  return Object.freeze({
    contract: PB_SHADER_PACKET_VERSION,
    id: String(id || 'shader-unnamed').trim(),
    label: String(label || id || 'Unnamed Shader').trim(),
    dialect,
    target,
    canvas: Object.freeze({
      width: Math.max(1, Math.round(Number(canvas.width) || 160)),
      height: Math.max(1, Math.round(Number(canvas.height) || 144)),
    }),
    fragmentSource: String(fragmentSource || '').trim(),
    uniforms: Object.freeze(sortKeys(JSON.parse(JSON.stringify(uniforms || {})))),
    deterministicSeed: Number(deterministicSeed) >>> 0,
  });
}

/**
 * Validates a shader packet. Returns true if valid, throws BytecodeError otherwise.
 */
export function validateShaderPacket(packet) {
  if (!packet || typeof packet !== 'object') {
    throw new Error('Shader packet must be an object');
  }
  if (packet.contract !== PB_SHADER_PACKET_VERSION) {
    throw new Error(`Invalid shader packet contract: expected ${PB_SHADER_PACKET_VERSION}`);
  }
  if (!packet.id || typeof packet.id !== 'string' || packet.id.trim() === '') {
    throw new Error('Shader packet must have a valid non-empty id');
  }
  if (typeof packet.fragmentSource !== 'string' || packet.fragmentSource.trim() === '') {
    throw new Error('Shader packet must contain fragmentSource code');
  }
  if (typeof packet.canvas !== 'object' || !packet.canvas.width || !packet.canvas.height) {
    throw new Error('Shader packet must have a valid canvas dimensions object');
  }
  return true;
}

/**
 * Standardizes line endings and whitespace to ensure deterministic hashing.
 */
export function normalizeShaderSource(src) {
  return String(src || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n');
}

/**
 * Recursively sorts object keys to guarantee deterministic serialization.
 */
function sortKeys(value) {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return Object.freeze(value.map(sortKeys));
  }
  const sorted = {};
  const keys = Object.keys(value).sort();
  for (const key of keys) {
    sorted[key] = sortKeys(value[key]);
  }
  return Object.freeze(sorted);
}

/**
 * Computes a deterministic FNV-1a checksum hash of a normalized shader packet.
 */
export function hashShaderPacket(packet) {
  const normalizedSource = normalizeShaderSource(packet.fragmentSource);
  const sortedUniforms = sortKeys(packet.uniforms);

  // Serialize the core properties deterministically
  const serializationTarget = {
    id: packet.id,
    dialect: packet.dialect,
    target: packet.target,
    canvas: {
      width: packet.canvas.width,
      height: packet.canvas.height,
    },
    fragmentSource: normalizedSource,
    uniforms: sortedUniforms,
    deterministicSeed: packet.deterministicSeed,
  };

  const serializedString = JSON.stringify(serializationTarget);
  const hashVal = hashString(serializedString);

  // Return formatted hex checksum
  return `fnv1a_${hashVal.toString(16).toUpperCase().padStart(8, '0')}`;
}
