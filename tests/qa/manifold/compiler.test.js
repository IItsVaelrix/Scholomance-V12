import { describe, expect, it } from 'vitest';

import {
  classifyManifoldEvents,
  compileManifoldDsl,
  loadManifoldPreset,
} from '../../../codex/core/manifold/index.js';

const VOID_GLASS_DSL = `manifold VoidGlass {
  clock internal 120

  material crystal {
    scatter 0.8
    brightness 0.7
    diffusion 0.6
  }

  material ash {
    absorption low 0.8
    absorption high 0.3
    diffusion 0.2
  }

  zone floor uses ash {
    listen sub_transient threshold 0.65

    on trigger {
      morph absorption.low to 0.95 in 60ms
      morph decay.low scale 0.40 in 100ms
      clamp feedback max 0.58
    }
  }

  zone ceiling uses crystal {
    listen high_crunch threshold 0.55

    on trigger {
      spray micro_delay division 1/64 density 0.7 duration 180ms
      morph scatter to 0.92 in 30ms
    }
  }

  zone rear_wall uses crystal {
    listen harmonic_sustain threshold 0.5

    on trigger {
      bloom harmonic amount 0.45 duration 600ms
      widen tail to 0.65 in 300ms
    }
  }
}`;

describe('Cochlear Manifold compiler', () => {
  it('compiles valid DSL into deterministic bytecode and safety metadata', () => {
    const first = compileManifoldDsl(VOID_GLASS_DSL);
    const second = compileManifoldDsl(VOID_GLASS_DSL);

    expect(first.ok).toBe(true);
    expect(first.program.schemaVersion).toBe('manifold.bytecode.v1');
    expect(first.program.kernelSemver).toBe('0.1.0');
    expect(first.program.name).toBe('VoidGlass');
    expect(first.program.sampleRatePolicy).toBe('adaptive');
    expect(first.program.instructions).toEqual([
      { op: 'MATCH_EVENT', event: 'sub_transient', threshold: 0.65 },
      { op: 'RAMP_PARAM', target: 'floor.absorption.low', value: 0.95, durationMs: 60 },
      { op: 'SCALE_PARAM', target: 'floor.decay.low', factor: 0.4, durationMs: 100 },
      { op: 'CLAMP_FEEDBACK', node: 'floor.feedback', max: 0.58 },
      { op: 'MATCH_EVENT', event: 'high_crunch', threshold: 0.55 },
      { op: 'TRIGGER_SPRAY', division: '1/64', density: 0.7, durationMs: 180 },
      { op: 'RAMP_PARAM', target: 'ceiling.scatter', value: 0.92, durationMs: 30 },
      { op: 'MATCH_EVENT', event: 'harmonic_sustain', threshold: 0.5 },
      { op: 'BLOOM_HARMONIC', amount: 0.45, durationMs: 600 },
      { op: 'RAMP_PARAM', target: 'rear_wall.tail.width', value: 0.65, durationMs: 300 },
    ]);
    expect(first.program.contentHash).toBe(second.program.contentHash);
    expect(first.program.id).toBe(second.program.id);
    expect(first.program.safety).toEqual({
      maxFeedback: 0.58,
      maxFilterQ: 12,
      maxSprayDensity: 0.7,
      maxDelayMs: 750,
      minRampMs: 20,
      cpuBudgetClass: 'medium',
      requiresLimiter: true,
      hasUnsafeCycles: false,
    });
  });

  it('rejects unsafe feedback and unknown events before runtime bytecode is emitted', () => {
    const unsafe = compileManifoldDsl(`manifold BadRoom {
      clock internal 120
      material ash { scatter 0.2 }
      zone floor uses ash {
        listen ghost_hit threshold 0.5
        on trigger {
          clamp feedback max 0.92
        }
      }
    }`);

    expect(unsafe.ok).toBe(false);
    expect(unsafe.program).toBeNull();
    expect(unsafe.errors.map((error) => error.code)).toEqual(['MANIFOLD_UNKNOWN_EVENT', 'MANIFOLD_UNSAFE_FEEDBACK']);
    expect(unsafe.errors.every((error) => error.bytecode.startsWith('PB-ERR-v1-'))).toBe(true);
  });
});

describe('Cochlear Manifold event classifier', () => {
  it('maps features to stable symbolic events without randomness', () => {
    const features = {
      rms: 0.64,
      peak: 0.96,
      crestFactor: 0.74,
      spectralCentroid: 0.82,
      spectralFlux: 0.79,
      lowEnergy: 0.83,
      midEnergy: 0.48,
      highEnergy: 0.76,
      transientSharpness: 0.7,
      harmonicity: 0.68,
      inputWidth: 0.71,
    };

    expect(classifyManifoldEvents(features)).toEqual([
      { event: 'sub_transient', confidence: 0.75 },
      { event: 'full_spectrum_impact', confidence: 0.77 },
      { event: 'high_crunch', confidence: 0.79 },
      { event: 'harmonic_sustain', confidence: 0.64 },
      { event: 'wide_noise_burst', confidence: 0.75 },
      { event: 'dense_spectral_cloud', confidence: 0.69 },
    ]);
    expect(classifyManifoldEvents(features)).toEqual(classifyManifoldEvents(features));
  });
});

describe('Cochlear Manifold preset recall', () => {
  it('uses cached bytecode when the compiler triple matches the DSL source', () => {
    const compiled = compileManifoldDsl(VOID_GLASS_DSL).program;
    const preset = {
      schemaVersion: 'manifold.preset.v1',
      name: 'VoidGlass',
      dslSource: VOID_GLASS_DSL,
      bytecode: compiled,
      macros: {
        size: 0.55,
        reactivity: 0.7,
        stability: 0.75,
        material: 0.8,
        scatter: 0.8,
        fracture: 0.65,
        gravity: 0.45,
        bloom: 0.5,
        wetDry: 0.42,
      },
    };

    const loaded = loadManifoldPreset(preset);

    expect(loaded.ok).toBe(true);
    expect(loaded.recompiled).toBe(false);
    expect(loaded.program).toBe(compiled);
  });

  it('recompiles cached bytecode when the DSL source changed', () => {
    const compiled = compileManifoldDsl(VOID_GLASS_DSL).program;
    const changedDsl = VOID_GLASS_DSL.replace('threshold 0.65', 'threshold 0.6');

    const loaded = loadManifoldPreset({
      schemaVersion: 'manifold.preset.v1',
      name: 'VoidGlass Edited',
      dslSource: changedDsl,
      bytecode: compiled,
      macros: {},
    });

    expect(loaded.ok).toBe(true);
    expect(loaded.recompiled).toBe(true);
    expect(loaded.program).not.toBe(compiled);
    expect(loaded.program.contentHash).not.toBe(compiled.contentHash);
  });
});
