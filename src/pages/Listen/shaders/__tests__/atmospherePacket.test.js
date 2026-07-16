import { describe, it, expect } from 'vitest';
import { ATMOSPHERE_PACKET } from '../atmospherePacket.js';
import { validateShaderPacket, hashShaderPacket } from '../../../../lib/pixelbrain/uniforms.bridge.js';

describe('ATMOSPHERE_PACKET', () => {
  it('is a valid PB-SHADER-v1 packet', () => {
    expect(() => validateShaderPacket(ATMOSPHERE_PACKET)).not.toThrow();
    expect(ATMOSPHERE_PACKET.contract).toBe('PB-SHADER-v1');
  });
  it('hashes deterministically', () => {
    expect(hashShaderPacket(ATMOSPHERE_PACKET)).toBe(hashShaderPacket(ATMOSPHERE_PACKET));
  });
  it('forbids nondeterminism in the fragment', () => {
    expect(ATMOSPHERE_PACKET.fragmentSource).not.toMatch(/\bMath\.random|\bnoise\(\s*gl_FragCoord/);
  });
});
