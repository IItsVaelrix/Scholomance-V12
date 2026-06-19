import type { WordTiming } from "../types";

export interface ResolveActiveWordsOptions {
  preRollMs: number;
  holdMs: number;
  maxWords: number;
}

export function resolveActiveWords(
  words: WordTiming[],
  timeMs: number,
  options: ResolveActiveWordsOptions
): WordTiming[] {
  const active = words.filter((word) => {
    const start = word.startMs - options.preRollMs;
    const end = word.endMs + options.holdMs;
    return timeMs >= start && timeMs <= end;
  });
  return active.slice(-options.maxWords);
}