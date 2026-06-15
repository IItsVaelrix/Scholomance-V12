export interface WordTiming {
  word: string;
  startMs: number;
  endMs: number;
  beat: {
    index: number;
    phase: number;
    bar: number;
    barPhase: number;
  };
  school: string;
  confidence?: number;
  manualOffsetMs?: number;
}

export interface AlignmentSidecar {
  schemaVersion: "scholomance.align.v1";
  trackId: string;
  bpm: number;
  offsetMs: number;
  lyricsHash: string;
  audioUrl?: string;
  audioHash?: string;
  generatedAt: string;
  wordTimings: WordTiming[];
}

export function validateAlignmentSidecar(v: unknown): v is AlignmentSidecar {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  if (s.schemaVersion !== "scholomance.align.v1") return false;
  if (typeof s.trackId !== "string") return false;
  if (typeof s.bpm !== "number") return false;
  if (typeof s.offsetMs !== "number") return false;
  if (typeof s.lyricsHash !== "string") return false;
  if (typeof s.generatedAt !== "string") return false;
  if (!Array.isArray(s.wordTimings)) return false;
  return s.wordTimings.every(validateWordTiming);
}

export function validateWordTiming(v: unknown): v is WordTiming {
  if (!v || typeof v !== "object") return false;
  const w = v as Record<string, unknown>;
  if (typeof w.word !== "string") return false;
  if (typeof w.startMs !== "number") return false;
  if (typeof w.endMs !== "number") return false;
  if (typeof w.school !== "string") return false;
  if (!w.beat || typeof w.beat !== "object") return false;
  const b = w.beat as Record<string, unknown>;
  return (
    typeof b.index === "number" &&
    typeof b.phase === "number" &&
    typeof b.bar === "number" &&
    typeof b.barPhase === "number"
  );
}
