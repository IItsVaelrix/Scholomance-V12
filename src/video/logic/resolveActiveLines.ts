import type { WordTiming } from "../types";

export interface ResolveActiveLinesOptions {
  preRollMs: number;
  holdMs: number;
  maxLines: number;
  lineBreakThresholdMs?: number;
}

export interface LineGroup {
  lineIndex: number;
  words: WordTiming[];
  startMs: number;
  endMs: number;
}

export function resolveActiveLines(
  words: WordTiming[],
  timeMs: number,
  options: ResolveActiveLinesOptions
): LineGroup[] {
  const threshold = options.lineBreakThresholdMs ?? 300;

  const lines: LineGroup[] = [];
  let currentLine: LineGroup | null = null;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const prevWord = i > 0 ? words[i - 1] : null;

    const isNewLine = !prevWord ||
      (word.startMs - prevWord.endMs) > threshold ||
      (prevWord.beat.bar !== word.beat.bar && word.startMs > prevWord.startMs + 200);

    if (isNewLine) {
      if (currentLine) lines.push(currentLine);
      currentLine = {
        lineIndex: lines.length,
        words: [word],
        startMs: word.startMs,
        endMs: word.endMs,
      };
    } else {
      currentLine!.words.push(word);
      currentLine!.endMs = word.endMs;
    }
  }

  if (currentLine) lines.push(currentLine);

  const active = lines.filter((line) => {
    const start = line.startMs - options.preRollMs;
    const end = line.endMs + options.holdMs;
    return timeMs >= start && timeMs <= end;
  });

  return active.slice(-options.maxLines);
}