import { SCHOLOTIME_FRAME_PACKET_VERSION } from './scholotime.constants.js';

export function createFramePacket({
  project,
  frameIndex,
  section,
  lyrics,
  cues,
  beat,
  bar,
  pixelbrain,
  phaser,
}) {
  const fps = project.timing.fps;
  const timeMs = (frameIndex * 1000) / fps;

  return Object.freeze({
    schemaVersion: SCHOLOTIME_FRAME_PACKET_VERSION,
    projectId: project.projectId,
    frameIndex,
    timeMs,
    fps,
    music: {
      bpm: project.timing.bpm,
      beatIndex: beat.index,
      beatPhase: beat.phase,
      barIndex: bar.index,
      barPhase: bar.phase,
      sectionId: section?.id || null,
      sectionEnergy: section?.energy || 0,
    },
    lyrics: lyrics.map((lyric) => ({
      id: lyric.id,
      text: lyric.text,
      progress: lyric.progress,
      weight: lyric.weight,
    })),
    cues: cues.map((cue) => ({
      id: cue.id,
      type: cue.type,
      target: cue.target,
      progress: cue.progress,
      params: cue.params,
      eased: cue.eased,
    })),
    pixelbrain,
    phaser,
    diagnostics: [],
  });
}
