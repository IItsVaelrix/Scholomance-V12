import { describe, expect, it } from 'vitest';
import {
  attachAnimationPhotonicRoute,
  buildAnimationAmpPhotonicRoute,
  submitAmpIntent,
} from '../../src/lib/amp-client.js';

const resolvedMotion = {
  version: 'v1.0',
  targetId: 'animation-photonic-test',
  success: true,
  renderer: 'framer',
  values: {
    durationMs: 420,
    delayMs: 0,
    easing: 'ease-in-out',
    translateX: 120,
    translateY: -80,
    scale: 1.4,
    opacity: 0.65,
    originX: 0.5,
    originY: 0.5,
  },
  diagnostics: [],
  trace: [],
  quantizedSignature: {
    data: '0011223344556677',
    norm: 1,
    dimension: 256,
    sampleCount: 64,
    channels: ['translateX', 'translateY', 'scale', 'opacity'],
    backend: 'js',
  },
};

describe('Animation AMP Photonic Retina wire', () => {
  it('routes resolved animation motion through the Retina bridge', () => {
    const route = buildAnimationAmpPhotonicRoute(resolvedMotion, {
      sampleCount: 12,
      targetDimension: 32,
    });

    expect(route.ok).toBe(true);
    expect(route.packet.sourceKind).toBe('coordinates');
    expect(route.packet.metadata.generatedBy).toBe('photonic-retina');
    expect(route.bridgeReport.packetId).toBe(route.packet.packetId);
    expect(route.preview.values).toHaveLength(24);
    expect(route.opticalSimulation.softwareOnly).toBe(true);
  });

  it('attaches photonicRoute without mutating the resolved output', () => {
    const attached = attachAnimationPhotonicRoute(resolvedMotion, {
      sampleCount: 8,
      targetDimension: 32,
    });

    expect(attached).not.toBe(resolvedMotion);
    expect(resolvedMotion.photonicRoute).toBeUndefined();
    expect(attached.photonicRoute.ok).toBe(true);
    expect(attached.targetId).toBe(resolvedMotion.targetId);
  });

  it('returns null for failed animation outputs', () => {
    const route = buildAnimationAmpPhotonicRoute({
      ...resolvedMotion,
      success: false,
    });

    expect(route).toBeNull();
  });

  it('submitAmpIntent returns AMP output with photonic route telemetry', async () => {
    const output = await submitAmpIntent({
      version: 'v1.0',
      targetId: 'animation-submit-photonic',
      trigger: 'mount',
      state: {
        durationMs: 360,
        easing: 'ease-out',
        translateX: 90,
        translateY: 40,
        scale: 1.15,
        opacity: 0.8,
      },
    });

    expect(output.success).toBe(true);
    expect(output.photonicRoute.ok).toBe(true);
    expect(output.photonicRoute.packet.sourceKind).toBe('coordinates');
    expect(output.photonicRoute.bridgeReport.packetId).toBe(output.photonicRoute.packet.packetId);
  });
});
