import { useCurrentFrame, useVideoConfig } from "remotion";
import {
  frameIndexToTimeMs,
  resolveBeatState,
  resolveBarState,
} from "../../codex/core/scholotime/scholotime.math.js";

export interface BeatClockState {
  timeMs: number;
  beat: ReturnType<typeof resolveBeatState>;
  bar: ReturnType<typeof resolveBarState>;
}

interface UseBeatClockArgs {
  bpm: number;
  offsetMs: number;
}

export function useBeatClock({ bpm, offsetMs }: UseBeatClockArgs): BeatClockState {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const timeMs = frameIndexToTimeMs(frame, fps);
  const beat = resolveBeatState(timeMs, { bpm, offsetMs });
  const bar = resolveBarState(beat);

  return { timeMs, beat, bar };
}
