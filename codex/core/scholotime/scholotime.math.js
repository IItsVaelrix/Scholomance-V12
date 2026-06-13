export function assertPositiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
}

export function assertPositiveNumber(value, name) {
  if (typeof value !== 'number' || isNaN(value) || value < 0) {
    throw new Error(`${name} must be a positive number.`);
  }
}

export function frameIndexToTimeMs(frameIndex, fps) {
  assertPositiveInteger(frameIndex, 'frameIndex');
  assertPositiveNumber(fps, 'fps');
  return (frameIndex * 1000) / fps;
}

export function timeMsToFrameIndex(timeMs, fps) {
  assertPositiveNumber(timeMs, 'timeMs');
  assertPositiveNumber(fps, 'fps');
  return Math.floor(timeMs / (1000 / fps));
}

export function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

export function resolveBeatState(timeMs, { bpm, offsetMs = 0 }) {
  assertPositiveNumber(bpm, 'bpm');
  const beatDurationMs = 60000 / bpm;
  const adjustedTimeMs = Math.max(0, timeMs - offsetMs);
  const exactBeat = adjustedTimeMs / beatDurationMs;
  const index = Math.floor(exactBeat);
  const phase = exactBeat - index;

  return Object.freeze({
    index,
    exactBeat,
    phase,
    durationMs: beatDurationMs,
  });
}

export function resolveBarState(beatState, timeSignature = [4, 4]) {
  const beatsPerBar = Number(timeSignature?.[0]) || 4;
  const exactBar = beatState.exactBeat / beatsPerBar;
  const index = Math.floor(exactBar);
  const phase = exactBar - index;

  return Object.freeze({
    index,
    exactBar,
    phase,
    beatsPerBar,
  });
}

export function applyEasing(progress, easingType = 'linear') {
  const p = clamp01(progress);
  switch (easingType) {
    case 'smoothstep': return p * p * (3 - 2 * p);
    case 'easeInQuad': return p * p;
    case 'easeOutQuad': return p * (2 - p);
    case 'easeInOutQuad': return p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
    case 'easeInCubic': return p * p * p;
    case 'easeOutCubic': return (--p) * p * p + 1;
    case 'easeInOutCubic': return p < 0.5 ? 4 * p * p * p : (p - 1) * (2 * p - 2) * (2 * p - 2) + 1;
    case 'linear':
    default:
      return p;
  }
}
