import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerUniformProvider,
  getUniformProviders,
  clearUniformRegistry,
  resolveShaderUniforms,
} from '../../../codex/core/pixelbrain/shader-uniform-registry.js';

describe('PixelBrain — Shader Uniform Registry', () => {
  beforeEach(() => {
    clearUniformRegistry();
  });

  it('core-time standard provider is pre-registered', () => {
    const providers = getUniformProviders();
    expect(providers.some(p => p.id === 'core-time')).toBe(true);
  });

  it('custom provider registers and resolves successfully', () => {
    registerUniformProvider('spelling-state', {
      uniforms: ['u_spellIntensity'],
      resolve(context) {
        return { u_spellIntensity: context.spellIntensity ?? 0.8 };
      }
    });

    const providers = getUniformProviders();
    expect(providers.some(p => p.id === 'spelling-state')).toBe(true);

    const res = resolveShaderUniforms({ spellIntensity: 0.95 });
    expect(res.ok).toBe(true);
    expect(res.uniforms.u_spellIntensity).toBe(0.95);
    expect(res.providers).toContain('spelling-state');
  });

  it('duplicate uniform names resolve deterministically with a warning', () => {
    registerUniformProvider('provider-a', {
      uniforms: ['u_testVal'],
      resolve() {
        return { u_testVal: 1.0 };
      }
    });

    registerUniformProvider('provider-b', {
      uniforms: ['u_testVal'],
      resolve() {
        return { u_testVal: 2.0 };
      }
    });

    const res = resolveShaderUniforms();
    expect(res.ok).toBe(true);
    // Overwrites or resolves deterministically by alphabetical sorted ID order ('provider-b' overwrites 'provider-a')
    expect(res.uniforms.u_testVal).toBe(2.0);
    expect(res.warnings.length).toBeGreaterThan(0);
  });

  it('bad throwing provider fails closed', () => {
    registerUniformProvider('throwing-provider', {
      uniforms: ['u_shouldCrash'],
      resolve() {
        throw new Error('Registry crash');
      }
    });

    const res = resolveShaderUniforms();
    expect(res.ok).toBe(false);
    expect(res.error).toBe('PROVIDER_RESOLUTION_FAILED');
  });
});
