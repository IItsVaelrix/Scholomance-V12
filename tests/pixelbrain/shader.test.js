import { describe, it, expect } from 'vitest';
import {
  PB_SHADER_PACKET_VERSION,
  createShaderPacket,
  validateShaderPacket,
  hashShaderPacket,
  normalizeShaderSource,
} from '../../codex/core/pixelbrain/shader-packet.js';
import {
  resolveShaderUniforms,
  DEFAULT_SHADER_UNIFORMS,
  hexToRgb01,
  getNestedProperty,
} from '../../codex/core/pixelbrain/shader-uniform-resolver.js';
import {
  createShaderCompileError,
  createShaderLinkError,
} from '../../codex/core/pixelbrain/shader-errors.js';
import {
  BytecodeError,
  ERROR_CATEGORIES,
  ERROR_CODES,
  MODULE_IDS,
} from '../../codex/core/pixelbrain/bytecode-error.js';

describe('PixelBrain Custom Shaders System', () => {
  describe('Shader Packet creation and validation', () => {
    it('creates a frozen packet with default values', () => {
      const packet = createShaderPacket({
        id: 'void-ripple',
        fragmentSource: 'void main() {}',
      });

      expect(packet.contract).toBe('PB-SHADER-v1');
      expect(packet.id).toBe('void-ripple');
      expect(packet.label).toBe('void-ripple');
      expect(packet.canvas.width).toBe(160);
      expect(packet.canvas.height).toBe(144);
      expect(Object.isFrozen(packet)).toBe(true);
      expect(Object.isFrozen(packet.canvas)).toBe(true);
      expect(Object.isFrozen(packet.uniforms)).toBe(true);
    });

    it('validates correct packets without throwing', () => {
      const packet = createShaderPacket({
        id: 'valid-shader',
        fragmentSource: 'void main() {}',
      });
      expect(validateShaderPacket(packet)).toBe(true);
    });

    it('throws when validating invalid packet contract or fields', () => {
      expect(() => validateShaderPacket(null)).toThrow();
      expect(() => validateShaderPacket({})).toThrow();
      expect(() => validateShaderPacket({ contract: 'INVALID' })).toThrow();
      expect(() => validateShaderPacket({ contract: PB_SHADER_PACKET_VERSION, id: '', fragmentSource: 'void main() {}', canvas: { width: 160, height: 144 } })).toThrow();
      expect(() => validateShaderPacket({ contract: PB_SHADER_PACKET_VERSION, id: 'test', fragmentSource: '', canvas: { width: 160, height: 144 } })).toThrow();
    });
  });

  describe('Deterministic Hashing (FNV-1a)', () => {
    it('returns identical hashes for identical packets', () => {
      const p1 = createShaderPacket({
        id: 'void-ripple',
        fragmentSource: 'void main() {}',
      });
      const p2 = createShaderPacket({
        id: 'void-ripple',
        fragmentSource: 'void main() {}',
      });

      expect(hashShaderPacket(p1)).toBe(hashShaderPacket(p2));
    });

    it('returns identical hashes when uniforms are declared in different key order', () => {
      const p1 = createShaderPacket({
        id: 'void-ripple',
        fragmentSource: 'void main() {}',
        uniforms: {
          u_b: { type: 'float', default: 2.0 },
          u_a: { type: 'float', default: 1.0 },
        },
      });
      const p2 = createShaderPacket({
        id: 'void-ripple',
        fragmentSource: 'void main() {}',
        uniforms: {
          u_a: { type: 'float', default: 1.0 },
          u_b: { type: 'float', default: 2.0 },
        },
      });

      expect(hashShaderPacket(p1)).toBe(hashShaderPacket(p2));
    });

    it('returns identical hashes for source code containing only whitespace differences', () => {
      const p1 = createShaderPacket({
        id: 'void-ripple',
        fragmentSource: '  void main() { \n\n  vec4 c = vec4(0.0);  \n }  ',
      });
      const p2 = createShaderPacket({
        id: 'void-ripple',
        fragmentSource: 'void main() {\nvec4 c = vec4(0.0);\n}',
      });

      expect(hashShaderPacket(p1)).toBe(hashShaderPacket(p2));
    });
  });

  describe('Uniform Resolution', () => {
    it('resolves defaults when runtime state is absent', () => {
      const packet = createShaderPacket({
        id: 'test',
        fragmentSource: 'void main() {}',
      });

      const resolved = resolveShaderUniforms(packet, {});
      expect(resolved.u_time.value).toBe(0);
      expect(resolved.u_resolution.value).toEqual([160, 144]);
      expect(resolved.u_resonance.value).toBe(0.5);
    });

    it('maps nested runtime state using dot-notation sources', () => {
      const packet = createShaderPacket({
        id: 'test',
        fragmentSource: 'void main() {}',
      });

      const runtimeState = {
        clock: { elapsedSeconds: 42.125 },
        canvas: { size: [320, 240] },
        verse: { resonance: 0.85 },
      };

      const resolved = resolveShaderUniforms(packet, runtimeState);
      expect(resolved.u_time.value).toBe(42.125);
      expect(resolved.u_resolution.value).toEqual([320, 240]);
      expect(resolved.u_resonance.value).toBe(0.85);
    });

    it('parses hex color strings to normalized vec3 floats [0..1]', () => {
      expect(hexToRgb01('#FF0000')).toEqual([1.0, 0.0, 0.0]);
      expect(hexToRgb01('#00FF00')).toEqual([0.0, 1.0, 0.0]);
      expect(hexToRgb01('#0000FF')).toEqual([0.0, 0.0, 1.0]);
      expect(hexToRgb01('#FFFFFF')).toEqual([1.0, 1.0, 1.0]);
      expect(hexToRgb01('#000000')).toEqual([0.0, 0.0, 0.0]);
      expect(hexToRgb01('00FFFF')).toEqual([0.0, 1.0, 1.0]);
    });
  });

  describe('Shader Bytecode Error translation', () => {
    it('creates a valid BytecodeError with correct schema', () => {
      const error = createShaderCompileError({
        stage: 'fragment',
        line: 24,
        column: 4,
        message: 'Syntax error: unexpected token',
        sourcePreview: 'vec3 color = vec3(1.0);',
      });

      expect(error).toBeInstanceOf(BytecodeError);
      expect(error.category).toBe(ERROR_CATEGORIES.RENDER);
      expect(error.moduleId).toBe(MODULE_IDS.SHADER);
      expect(error.errorCode).toBe(ERROR_CODES.SHADER_COMPILE_FAILED);
      expect(error.context.line).toBe(24);
      expect(error.context.message).toBe('Syntax error: unexpected token');
      expect(error.bytecode).toContain('PB-ERR-v1-RENDER-CRIT-SHADER-0910-');
    });
  });
});
