import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { vectorizeMotion } from '../../../codex/core/animation/amp/motionVectorizer.ts';
import { runAnimationAmp, initAnimationAmp } from '../../../codex/core/animation/amp/runAnimationAmp.ts';
import { quantizeVectorJS, similarity } from '../../../codex/core/quantization/turboquant.js';
import { ResolvedMotionOutput, AnimationIntent } from '../../../codex/core/animation/contracts/animation.types.ts';
import { MOTION_COSINE_DEVIATION_THRESHOLD } from '../../../codex/core/animation/processors/vector/TurboQuantMotionProcessor.ts';

describe('Animation AMP to TurboQuant Vector Wiring Hardening Suite', () => {
  beforeEach(() => {
    // Reset/initialize AMP before each test with canonical vector settings
    initAnimationAmp({
      debug: true,
      enableVectorQuantization: true,
      vectorDimension: 256,
      bytecodeEnabled: true,
      motionSafetyMode: 'dampen-hard',
    });
  });

  // ─── Section 1: Vectorization & Quantization Parity ──────────────────────────

  it('asserts vectorization parity (samples continuous curves into 256-D vectors)', () => {
    const mockOutput: ResolvedMotionOutput = {
      version: 'v1.0',
      targetId: 'qa-test-1',
      success: true,
      renderer: 'framer',
      values: {
        durationMs: 400,
        delayMs: 0,
        easing: 'linear',
        translateX: 200,
        translateY: -100,
        scale: 1.5,
        scaleX: 1.5,
        scaleY: 1.5,
        rotateDeg: 45,
        opacity: 0.2,
        glow: 0.5,
        blur: 5,
        loop: false,
        originX: 0.5,
        originY: 0.5,
      },
      diagnostics: [],
      trace: [],
    };

    const vector = vectorizeMotion(mockOutput, 256);

    expect(vector).toBeInstanceOf(Float32Array);
    expect(vector.length).toBe(256);

    // Initial state at t = 0.0 (index 0) with channel normalization
    expect(vector[0]).toBe(0);      // startX / 1000
    expect(vector[1]).toBe(0);      // startY / 1000
    expect(vector[2]).toBe(0);      // (startScale - 1.0) / 4
    expect(vector[3]).toBe(0);      // startOpacity - startOpacity = 1.0 - 1.0 = 0.0

    // Final state at t = 1.0 (index 252) with channel normalization
    expect(vector[252]).toBeCloseTo(0.2);     // 200 / 1000
    expect(vector[253]).toBeCloseTo(-0.1);    // -100 / 1000
    expect(vector[254]).toBeCloseTo(0.125);   // (1.5 - 1.0) / 4
    expect(vector[255]).toBeCloseTo(-0.8);    // 0.2 - 1.0 = -0.8
  });

  it('asserts quantization determinism (identical curves produce identical signatures)', async () => {
    const intent1: AnimationIntent = {
      version: 'v1.0',
      targetId: 'qa-target-1',
      trigger: 'mount',
      preset: 'slide-in',
      state: {
        translateX: 150,
        translateY: 50,
        scale: 1.2,
        opacity: 0.8,
        easing: 'ease-in-out',
      },
    };

    const intent2: AnimationIntent = {
      version: 'v1.0',
      targetId: 'qa-target-2',
      trigger: 'mount',
      preset: 'slide-in',
      state: {
        translateX: 150,
        translateY: 50,
        scale: 1.2,
        opacity: 0.8,
        easing: 'ease-in-out',
      },
    };

    const output1 = await runAnimationAmp(intent1);
    const output2 = await runAnimationAmp(intent2);

    expect(output1.success).toBe(true);
    expect(output2.success).toBe(true);

    expect(output1.quantizedSignature).toBeDefined();
    expect(output2.quantizedSignature).toBeDefined();

    expect(output1.quantizedSignature?.data).toBe(output2.quantizedSignature?.data);
    expect(output1.quantizedSignature?.norm).toBeCloseTo(output2.quantizedSignature?.norm || 0);
    expect(output1.quantizedSignature?.dimension).toBe(256);
    expect(output1.quantizedSignature?.sampleCount).toBe(64);
    expect(output1.quantizedSignature?.channels).toEqual(['translateX', 'translateY', 'scale', 'opacity']);
    expect(output1.quantizedSignature?.backend).toBe('js');
  });

  it('asserts fallback safety and diagnostics (catches exceptions and emits warning)', async () => {
    initAnimationAmp({
      enableVectorQuantization: true,
      vectorDimension: -256, // Negative dimension triggers fallback
    });

    const intent: AnimationIntent = {
      version: 'v1.0',
      targetId: 'qa-target-fallback',
      trigger: 'click',
      state: {
        translateX: 50,
      },
    };

    const output = await runAnimationAmp(intent);

    expect(output.success).toBe(true); // Graceful recovery
    expect(output.diagnostics).toContain('PB-ERR-v1-STATE-WARN-VECTOR-0204: Fallback triggered');
  });

  it('asserts similarity reliability (cosine alignment, identical curves are 1.0, differing are lower)', async () => {
    const vec1 = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      vec1[i] = Math.sin(i / 10.0);
    }
    const q1 = quantizeVectorJS(vec1);
    const selfSim = similarity(q1.data, q1.data, 1.0, 1.0);
    expect(selfSim).toBeGreaterThan(0.95);

    const intentA: AnimationIntent = {
      version: 'v1.0',
      targetId: 'intent-a',
      trigger: 'hover',
      state: {
        translateX: 300,
        translateY: 0,
        scale: 1.0,
        opacity: 1.0,
        easing: 'linear',
      },
    };

    const intentB: AnimationIntent = {
      version: 'v1.0',
      targetId: 'intent-b',
      trigger: 'hover',
      state: {
        translateX: 0,
        translateY: 0,
        scale: 1.0,
        opacity: 0.1,
        easing: 'bounce',
      },
    };

    const outputA = await runAnimationAmp(intentA);
    const outputB = await runAnimationAmp(intentB);

    const dataA = Uint8Array.from(Buffer.from(outputA.quantizedSignature!.data, 'hex'));
    const dataB = Uint8Array.from(Buffer.from(outputB.quantizedSignature!.data, 'hex'));

    const crossSim = similarity(dataA, dataB, 1.0, 1.0);
    expect(crossSim).toBeLessThan(0.8);
  });

  // ─── Section 2: Config-Driven Safety Policies ────────────────────────────────

  it('asserts safety policy: dampen-hard (clamps deviant translations & scales by 50%)', async () => {
    initAnimationAmp({
      enableVectorQuantization: true,
      motionSafetyMode: 'dampen-hard',
    });

    const intent: AnimationIntent = {
      version: 'v1.0',
      targetId: 'qa-safety-hard',
      trigger: 'mount',
      state: {
        translateX: 0,
        translateY: 800, // Radical vertical deviation
        scale: 5.0,
        opacity: 0.5,
      },
    };

    const output = await runAnimationAmp(intent);

    expect(output.success).toBe(true);
    expect(output.vectorSimilarity).toBeLessThan(MOTION_COSINE_DEVIATION_THRESHOLD);
    expect(output.values.translateY).toBe(400); // 800 * 0.5
    expect(output.values.scale).toBe(2.0);       // Capped to 3.0 by bounds, then 1.0 + (3.0 - 1.0) * 0.5 = 2.0
    expect(output.nearestMotionArchetype).toBe('unknown');
    expect(output.diagnostics.some(d => d.includes("dampening applied by coefficient 0.5"))).toBe(true);
  });

  it('asserts safety policy: dampen-soft (clamps deviant translations & scales by 25%)', async () => {
    initAnimationAmp({
      enableVectorQuantization: true,
      motionSafetyMode: 'dampen-soft',
    });

    const intent: AnimationIntent = {
      version: 'v1.0',
      targetId: 'qa-safety-soft',
      trigger: 'mount',
      state: {
        translateX: 0,
        translateY: 800,
        scale: 5.0,
        opacity: 0.5,
      },
    };

    const output = await runAnimationAmp(intent);

    expect(output.success).toBe(true);
    expect(output.vectorSimilarity).toBeLessThan(MOTION_COSINE_DEVIATION_THRESHOLD);
    expect(output.values.translateY).toBe(600); // 800 * 0.75
    expect(output.values.scale).toBe(2.5);       // Capped to 3.0 by bounds, then 1.0 + (3.0 - 1.0) * 0.75 = 2.5
    expect(output.diagnostics.some(d => d.includes("dampening applied by coefficient 0.75"))).toBe(true);
  });

  it('asserts safety policy: warn-only (logs deviation but applies no dampening)', async () => {
    initAnimationAmp({
      enableVectorQuantization: true,
      motionSafetyMode: 'warn-only',
    });

    const intent: AnimationIntent = {
      version: 'v1.0',
      targetId: 'qa-safety-warn',
      trigger: 'mount',
      state: {
        translateX: 0,
        translateY: 800,
        scale: 5.0,
        opacity: 0.5,
      },
    };

    const output = await runAnimationAmp(intent);

    expect(output.success).toBe(true);
    expect(output.vectorSimilarity).toBeLessThan(MOTION_COSINE_DEVIATION_THRESHOLD);
    expect(output.values.translateY).toBe(800); // Unaltered
    expect(output.values.scale).toBe(3.0);       // Clamped only by bounds processor (capped to 3.0), no safety dampening
    expect(output.diagnostics.some(d => d.includes("Warn-only policy active; no dampening applied"))).toBe(true);
  });

  it('asserts safety policy: off (completely skips similarity scanning and clamping)', async () => {
    initAnimationAmp({
      enableVectorQuantization: true,
      motionSafetyMode: 'off',
    });

    const intent: AnimationIntent = {
      version: 'v1.0',
      targetId: 'qa-safety-off',
      trigger: 'mount',
      state: {
        translateX: 0,
        translateY: 800,
        scale: 5.0,
        opacity: 0.5,
      },
    };

    const output = await runAnimationAmp(intent);

    expect(output.success).toBe(true);
    expect(output.vectorSimilarity).toBe(1.0); // Bypassed default
    expect(output.nearestMotionArchetype).toBe('unknown');
    expect(output.values.translateY).toBe(800); // Unaltered
    expect(output.values.scale).toBe(3.0);       // Only bounds processor active
    expect(output.diagnostics).toContain('TurboQuant similarity: skipped (safety policy set to off)');
  });

  it('asserts safety policy: reject (throws aesthetic violation error for deviant curves)', async () => {
    initAnimationAmp({
      enableVectorQuantization: true,
      motionSafetyMode: 'reject',
    });

    const intent: AnimationIntent = {
      version: 'v1.0',
      targetId: 'qa-safety-reject',
      trigger: 'mount',
      state: {
        translateX: 0,
        translateY: 800,
        scale: 5.0,
        opacity: 0.5,
      },
    };

    await expect(runAnimationAmp(intent)).rejects.toThrow(/Aesthetic deviation violation detected/);
  });

  // ─── Section 3: Golden Archetype Matching ─────────────────────────────────────

  it('asserts nearest golden archetype resolution (identifies standard curve profiles)', async () => {
    // 1. A clean slide-in must match 'slide-smooth'
    const intentSlide: AnimationIntent = {
      version: 'v1.0',
      targetId: 'qa-archetype-slide',
      trigger: 'mount',
      state: {
        durationMs: 500,
        easing: 'ease-in-out',
        translateX: 100,
        translateY: 0,
        scale: 1.0,
        opacity: 1.0,
      },
    };
    const outputSlide = await runAnimationAmp(intentSlide);
    expect(outputSlide.nearestMotionArchetype).toBe('slide-smooth');
    expect(outputSlide.vectorSimilarity).toBeGreaterThan(0.95);

    // 2. A standard fade-out must match 'fade-standard'
    const intentFade: AnimationIntent = {
      version: 'v1.0',
      targetId: 'qa-archetype-fade',
      trigger: 'unmount',
      state: {
        durationMs: 300,
        easing: 'ease-out',
        translateX: 0,
        translateY: 0,
        scale: 1.0,
        opacity: 1.0,
      },
    };
    const outputFade = await runAnimationAmp(intentFade);
    expect(outputFade.nearestMotionArchetype).toBe('fade-standard');
    expect(outputFade.vectorSimilarity).toBeGreaterThan(0.95);
  });

  // ─── Section 4: High-Frequency Temporal Aliasing ──────────────────────────────

  it('asserts vector wiring stability under temporal aliasing edge cases', async () => {
    // Edge Case 1: Extremely short duration (16ms / 1 frame transition)
    const intentShort: AnimationIntent = {
      version: 'v1.0',
      targetId: 'qa-aliasing-short',
      trigger: 'click',
      state: {
        durationMs: 16,
        translateX: 150,
      },
    };
    const outputShort = await runAnimationAmp(intentShort);
    expect(outputShort.success).toBe(true);
    expect(outputShort.quantizedSignature).toBeDefined();

    // Edge Case 2: High-amplitude bounce curve
    const intentBounce: AnimationIntent = {
      version: 'v1.0',
      targetId: 'qa-aliasing-bounce',
      trigger: 'click',
      state: {
        durationMs: 600,
        easing: 'bounce',
        translateY: 500,
      },
    };
    const outputBounce = await runAnimationAmp(intentBounce);
    expect(outputBounce.success).toBe(true);
    expect(outputBounce.quantizedSignature).toBeDefined();

    // Edge Case 3: Tiny, high-frequency opacity flickers
    const intentFlicker: AnimationIntent = {
      version: 'v1.0',
      targetId: 'qa-aliasing-flicker',
      trigger: 'idle',
      state: {
        durationMs: 200,
        opacity: 0.05,
      },
    };
    const outputFlicker = await runAnimationAmp(intentFlicker);
    expect(outputFlicker.success).toBe(true);
    expect(outputFlicker.quantizedSignature).toBeDefined();

    // Edge Case 4: Scale spikes near final frame
    const intentScaleSpike: AnimationIntent = {
      version: 'v1.0',
      targetId: 'qa-aliasing-spike',
      trigger: 'mount',
      state: {
        durationMs: 350,
        scale: 3.0,
      },
    };
    const outputScaleSpike = await runAnimationAmp(intentScaleSpike);
    expect(outputScaleSpike.success).toBe(true);
    expect(outputScaleSpike.quantizedSignature).toBeDefined();
  });

  // ─── Section 5: Immune System Determinism Audit (Static Verification) ──────────

  it('asserts no Math.random() or non-deterministic entropy leaks exist inside active runtime paths', () => {
    const rootDir = path.resolve(__dirname, '../../../codex/core');
    const targetDirs = [
      path.join(rootDir, 'animation'),
      path.join(rootDir, 'pixelbrain'),
    ];

    const scanDirectory = (dirPath: string) => {
      const files = fs.readdirSync(dirPath);

      for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.js'))) {
          const contents = fs.readFileSync(fullPath, 'utf8');
          const lines = contents.split('\n');

          lines.forEach((line, index) => {
            // Assert absolutely no Math.random() is present in functional blocks
            if (line.includes('Math.random(')) {
              // Permit explicit exemptions ONLY in inline comments containing 'EXEMPT' (e.g. inside tests or mock data definitions)
              if (!line.includes('EXEMPT')) {
                throw new Error(
                  `[DET-LEAK-PATHOGEN]: Non-deterministic Math.random() leak found in ${file} at L${index + 1}: "${line.trim()}"`
                );
              }
            }

            // Assert no performance.now() exists unless explicitly marked as EXEMPT or inside legacy blocks
            if (line.includes('performance.now(')) {
              if (!line.includes('EXEMPT') && !line.includes('legacy') && !line.includes('timing')) {
                throw new Error(
                  `[DET-LEAK-PATHOGEN]: Entropy performance.now() timestamp leakage found in ${file} at L${index + 1}: "${line.trim()}"`
                );
              }
            }
          });
        }
      }
    };

    for (const dir of targetDirs) {
      if (fs.existsSync(dir)) {
        scanDirectory(dir);
      }
    }
  });
});
