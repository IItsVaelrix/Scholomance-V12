import { clamp01, applyEasing } from './scholotime.math.js';

export function resolveSectionAtTime(sections = [], timeMs) {
  return sections.find((s) => timeMs >= s.startMs && timeMs < s.endMs) || null;
}

export function resolveLyricsAtTime(lyrics = [], timeMs) {
  return lyrics
    .filter((lyric) => timeMs >= lyric.startMs && timeMs <= lyric.endMs)
    .map((lyric) => {
      const duration = Math.max(1, lyric.endMs - lyric.startMs);
      const progress = clamp01((timeMs - lyric.startMs) / duration);
      return Object.freeze({
        ...lyric,
        progress,
      });
    });
}

export function resolveCuesAtTime(cues = [], timeMs) {
  return cues
    .filter((cue) => timeMs >= cue.startMs && timeMs <= cue.endMs)
    .sort((a, b) => a.startMs - b.startMs || a.id.localeCompare(b.id))
    .map((cue) => {
      const duration = Math.max(1, cue.endMs - cue.startMs);
      const rawProgress = (timeMs - cue.startMs) / duration;
      const progress = clamp01(rawProgress);
      return Object.freeze({
        ...cue,
        progress,
        eased: applyEasing(progress, cue.easing || 'linear'),
      });
    });
}
