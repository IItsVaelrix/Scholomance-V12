import { RETINA_MODES } from './retina.config.js';
import { simulateRetinaEncoding } from './retina-encoder.js';
import {
  normalizeRetinaConfig,
  validateRetinaInput,
} from './retina-schema.js';

export function encodeToPhotonicRetina(rawInput, options = {}) {
  const config = normalizeRetinaConfig(options);

  if (config.mode === RETINA_MODES.OFF) {
    return null;
  }

  try {
    const input = validateRetinaInput(rawInput);
    const packet = simulateRetinaEncoding(input, config);

    if (config.mode === RETINA_MODES.WARN) {
      console.debug('[Photonic Retina]', packet.packetId);
    }

    return packet;
  } catch (error) {
    if (config.mode === RETINA_MODES.GATE) {
      throw error;
    }

    if (config.mode === RETINA_MODES.WARN) {
      console.warn('[Photonic Retina] Encoding failed:', error);
    }

    return null;
  }
}
