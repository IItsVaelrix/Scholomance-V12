import { describe, it, expect } from 'vitest';
import { compileEffectsBytecode } from '../../../codex/core/pixelbrain/character-bytecode-compiler.js';

const MINIMAL_SPEC = {
  contract: 'CHARACTER-SPEC-v1',
  id: 'test.char.v1',
  materials: { skin: 'skin_light', hair: 'hair_brown', eyes: 'eye_brown' },
  combatProfile: { school: 'PSYCHIC' },
};

const SCHOOLS = ['SONIC', 'VOID', 'PSYCHIC', 'ALCHEMY', 'WILL'];
const EYE_MATERIALS = ['eye_brown', 'eye_blue', 'eye_green', 'eye_void_glow'];

describe('compileEffectsBytecode', () => {
  it('returns all 5 required uniform keys', () => {
    const uniforms = compileEffectsBytecode(MINIMAL_SPEC);
    expect(uniforms).toHaveProperty('u_schoolGlow');
    expect(uniforms).toHaveProperty('u_rimColor');
    expect(uniforms).toHaveProperty('u_eyeColor');
    expect(uniforms).toHaveProperty('u_glowIntensity');
    expect(uniforms).toHaveProperty('u_atmosphereOpacity');
  });

  it('vec3 uniforms are float arrays of length 3 with values in [0,1]', () => {
    const uniforms = compileEffectsBytecode(MINIMAL_SPEC);
    for (const key of ['u_schoolGlow', 'u_rimColor', 'u_eyeColor']) {
      const v = uniforms[key];
      expect(Array.isArray(v)).toBe(true);
      expect(v).toHaveLength(3);
      v.forEach(c => {
        expect(typeof c).toBe('number');
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      });
    }
  });

  it('float uniforms are numbers in valid ranges', () => {
    const uniforms = compileEffectsBytecode(MINIMAL_SPEC);
    expect(typeof uniforms.u_glowIntensity).toBe('number');
    expect(uniforms.u_glowIntensity).toBeGreaterThanOrEqual(0.3);
    expect(uniforms.u_glowIntensity).toBeLessThanOrEqual(1.5);
    expect(typeof uniforms.u_atmosphereOpacity).toBe('number');
    expect(uniforms.u_atmosphereOpacity).toBeGreaterThanOrEqual(0);
    expect(uniforms.u_atmosphereOpacity).toBeLessThanOrEqual(0.8);
  });

  it('is deterministic — same spec produces identical output 50 times', () => {
    const first = compileEffectsBytecode(MINIMAL_SPEC);
    for (let i = 0; i < 49; i++) {
      expect(compileEffectsBytecode(MINIMAL_SPEC)).toEqual(first);
    }
  });

  it.each(SCHOOLS)('each school produces valid u_schoolGlow: %s', (school) => {
    const spec = { ...MINIMAL_SPEC, combatProfile: { school } };
    const { u_schoolGlow } = compileEffectsBytecode(spec);
    expect(Array.isArray(u_schoolGlow)).toBe(true);
    expect(u_schoolGlow).toHaveLength(3);
    u_schoolGlow.forEach(c => expect(c).toBeGreaterThan(0));
  });

  it.each(EYE_MATERIALS)('each eye material produces valid u_eyeColor: %s', (eyes) => {
    const spec = { ...MINIMAL_SPEC, materials: { ...MINIMAL_SPEC.materials, eyes } };
    const { u_eyeColor } = compileEffectsBytecode(spec);
    expect(Array.isArray(u_eyeColor)).toBe(true);
    expect(u_eyeColor).toHaveLength(3);
    u_eyeColor.forEach(c => {
      expect(typeof c).toBe('number');
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(1);
    });
  });

  it('unknown school falls back without throwing; intensity defaults to 0.5', () => {
    const spec = { ...MINIMAL_SPEC, combatProfile: { school: 'UNKNOWN_SCHOOL' } };
    expect(() => compileEffectsBytecode(spec)).not.toThrow();
    const { u_glowIntensity } = compileEffectsBytecode(spec);
    expect(u_glowIntensity).toBe(0.5);
  });
});
