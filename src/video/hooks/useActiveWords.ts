import {
  resolveActiveWords,
  type ResolveActiveWordsOptions,
} from "../logic/resolveActiveWords";
import type { WordTiming } from "../types";

// Thin hook wrapper so components import from hooks/ per spec file tree.
// In Remotion, all computation is pure per-frame — no memoization needed.
export function useActiveWords(
  words: WordTiming[],
  timeMs: number,
  options: ResolveActiveWordsOptions
): WordTiming[] {
  return resolveActiveWords(words, timeMs, options);
}
