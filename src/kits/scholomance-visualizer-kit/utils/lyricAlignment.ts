export interface AlignmentWord {
  line: number;
  word: number;
  text: string;
  startS: number;
  endS: number;
  confidence: number;
  interpolated?: boolean;
  backing?: boolean;
}

export interface AlignmentLine {
  index: number;
  startS: number;
  endS: number;
}

export interface LyricAlignment {
  version: 'alignment-v1';
  trackId: string;
  source: { aligner: string; separator: string | null; generatedAt: string };
  lines: AlignmentLine[];
  words: AlignmentWord[];
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function parseAlignment(data: unknown): LyricAlignment | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (d.version !== 'alignment-v1' || typeof d.trackId !== 'string') return null;
  // The UI surfaces source.aligner as sync provenance; an artifact that
  // doesn't declare its origin is rejected outright.
  const src = d.source as { aligner?: unknown } | undefined;
  if (!src || typeof src !== 'object' || typeof src.aligner !== 'string') return null;
  const { lines, words } = d as { lines?: unknown; words?: unknown };
  if (!Array.isArray(lines) || lines.length === 0) return null;
  if (!Array.isArray(words) || words.length === 0) return null;
  let prev = -Infinity;
  for (const l of lines) {
    if (!l || !Number.isInteger((l as AlignmentLine).index)) return null;
    if (!finite((l as AlignmentLine).startS) || !finite((l as AlignmentLine).endS)) return null;
    if ((l as AlignmentLine).startS < prev) return null;
    prev = (l as AlignmentLine).startS;
  }
  prev = -Infinity;
  for (const w of words) {
    const x = w as AlignmentWord;
    if (!x || typeof x.text !== 'string') return null;
    if (!Number.isInteger(x.line) || !Number.isInteger(x.word)) return null;
    if (!finite(x.startS) || !finite(x.endS)) return null;
    if (x.startS < prev) return null;
    prev = x.startS;
  }
  return data as LyricAlignment;
}

function lastStarted(arr: ReadonlyArray<{ startS: number }>, t: number): number {
  let lo = 0;
  let hi = arr.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid].startS <= t) { ans = mid; lo = mid + 1; } else { hi = mid - 1; }
  }
  return ans;
}

export function lineAtTime(lines: ReadonlyArray<AlignmentLine>, t: number): number {
  return lastStarted(lines, t);
}

export function wordAtTime(words: ReadonlyArray<AlignmentWord>, t: number): number {
  const i = lastStarted(words, t);
  if (i < 0) return -1;
  return t < words[i].endS ? i : -1;
}
