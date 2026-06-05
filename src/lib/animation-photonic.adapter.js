import { routeRetinaPacketToPhotonicBridge } from './photonic-retina/index.js';

const DEFAULT_SAMPLE_COUNT = 16;
const MOTION_DIMENSIONS = Object.freeze({ width: 1000, height: 1000 });

function numberOr(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function easingProgress(t, easing) {
  const normalized = String(easing || 'ease-out').toLowerCase().trim();

  if (normalized === 'linear') return t;
  if (normalized === 'ease-in') return t * t;
  if (normalized === 'ease-in-out') {
    return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
  }
  if (normalized === 'bounce') {
    const c4 = (2 * Math.PI) / 3;
    if (t === 0 || t === 1) return t;
    return (2 ** (-10 * t)) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }

  return 1 - (1 - t) * (1 - t);
}

function clampCoordinate(value) {
  return Math.max(0, Math.min(1000, value));
}

function motionColor(output) {
  const renderer = String(output?.renderer || 'framer').toLowerCase();
  if (renderer === 'phaser') return '#58a6ff';
  if (renderer === 'css') return '#fbbf24';
  if (renderer === 'canvas') return '#c084fc';
  return '#00ff88';
}

function createMotionSamples(output, sampleCount) {
  const values = output?.values || {};
  const targetX = numberOr(values.translateX, 0);
  const targetY = numberOr(values.translateY, 0);
  const targetScale = numberOr(values.scale, 1);
  const targetOpacity = numberOr(values.opacity, 1);
  const easing = values.easing || 'ease-out';
  const color = motionColor(output);

  return Object.freeze(Array.from({ length: sampleCount }, (_, index) => {
    const t = sampleCount > 1 ? index / (sampleCount - 1) : 0;
    const progress = easingProgress(t, easing);
    const x = clampCoordinate(500 + targetX * progress);
    const y = clampCoordinate(500 + targetY * progress);
    const scaleDelta = Math.abs(targetScale - 1) * progress;
    const opacityDelta = Math.abs(1 - targetOpacity) * progress;

    return Object.freeze({
      x,
      y,
      emphasis: Math.max(0, Math.min(1, (scaleDelta + opacityDelta) / 2)),
      color,
    });
  }));
}

export function buildAnimationAmpPhotonicRoute(output, options = {}) {
  if (!output || typeof output !== 'object' || output.success === false) {
    return null;
  }

  try {
    const sampleCount = Math.max(2, Math.min(64, Number(options.sampleCount) || DEFAULT_SAMPLE_COUNT));
    const samples = createMotionSamples(output, sampleCount);

    return routeRetinaPacketToPhotonicBridge(
      {
        sourceKind: 'coordinates',
        dimensions: MOTION_DIMENSIONS,
        payload: samples,
        metadata: {
          sourceSystem: 'animation-amp',
          targetId: String(output.targetId || 'unknown'),
          renderer: String(output.renderer || 'unknown'),
          nearestMotionArchetype: String(output.nearestMotionArchetype || 'unknown'),
          quantizedSignature: output.quantizedSignature?.data || null,
        },
      },
      {
        retina: {
          targetDimension: options.targetDimension || 64,
          bitWidth: options.bitWidth || 4,
        },
        bridge: {
          mode: options.mode || 'shadow',
        },
        previousPacket: options.previousPacket,
        previewLength: options.previewLength || 24,
      }
    );
  } catch (error) {
    if (options.mode === 'warn') {
      console.warn('[Animation AMP Photonic Retina] routing failed:', error);
    }

    return null;
  }
}

export function attachAnimationPhotonicRoute(output, options = {}) {
  const photonicRoute = buildAnimationAmpPhotonicRoute(output, options);

  if (!photonicRoute) {
    return output;
  }

  return {
    ...output,
    photonicRoute,
  };
}
