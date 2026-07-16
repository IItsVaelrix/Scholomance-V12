/**
 * PixelBrain Shader Bridge — LING-0F03 exempt access point.
 * UI/pages import shader-system functions from here, never from codex/core.
 */
export {
  resolveShaderUniforms,
} from '../../../codex/core/pixelbrain/shader-uniform-resolver.js';
export {
  createShaderPacket,
  validateShaderPacket,
  hashShaderPacket,
} from '../../../codex/core/pixelbrain/shader-packet.js';
