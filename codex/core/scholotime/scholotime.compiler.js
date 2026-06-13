import { frameIndexToTimeMs, resolveBeatState, resolveBarState } from './scholotime.math.js';
import { resolveSectionAtTime, resolveLyricsAtTime, resolveCuesAtTime } from './scholotime.timeline.js';
import { createFramePacket } from './scholotime.frame-packet.js';
import { validateScholoTimeProject } from './scholotime.schema.js';

export function compileScholoTimeFrame(project, frameIndex, adapters = {}) {
  validateScholoTimeProject(project);

  const timeMs = frameIndexToTimeMs(frameIndex, project.timing.fps);

  const beat = resolveBeatState(timeMs, project.timing);
  const bar = resolveBarState(beat, project.timing.timeSignature);
  const section = resolveSectionAtTime(project.sections || [], timeMs);
  const lyrics = resolveLyricsAtTime(project.lyrics || [], timeMs);
  const cues = resolveCuesAtTime(project.cues || [], timeMs);

  const pixelbrain = adapters.pixelbrain
    ? adapters.pixelbrain.resolveFrame({ project, timeMs, beat, bar, section, lyrics, cues })
    : { layers: [], coordinates: [] };

  const phaser = adapters.phaser
    ? adapters.phaser.resolveFrame({ project, timeMs, beat, bar, section, lyrics, cues })
    : { camera: null, sprites: [], particles: [] };

  return createFramePacket({
    project,
    frameIndex,
    section,
    lyrics,
    cues,
    beat,
    bar,
    pixelbrain,
    phaser,
  });
}
