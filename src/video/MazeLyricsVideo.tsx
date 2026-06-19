import React, { useEffect, useRef } from "react";
import { AbsoluteFill, Audio, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp01 } from "../../codex/core/scholotime/scholotime.math.js";
import { useBeatClock } from "./useBeatClock";
import type { BeatClockState } from "./useBeatClock";
import type { GrimoireTrackWithAlignment } from "../pages/Visualiser/tracks/loadTrackWithAlignment";
import { DEFAULT_PACING } from "../pages/Visualiser/tracks/types";
import type { WordTiming } from "./types";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { getTypographyMoviePlugin } from "../pages/internal/ScholoTimeLab/typographyMoviePlugins.js";

const mazePlugin = getTypographyMoviePlugin("first-person-maze") as {
  render: (ctx: CanvasRenderingContext2D, packet: unknown, settings: unknown) => void;
};

function isWordActive(startMs: number, endMs: number, nowMs: number): boolean {
  return startMs < nowMs + 500 && endMs > nowMs - 2000;
}

function buildMazePacket(
  trackId: string,
  frame: number,
  bpm: number,
  clock: BeatClockState,
  activeWords: WordTiming[],
) {
  const cues: unknown[] = [];
  for (const w of activeWords) {
    const elapsed = clock.timeMs - w.startMs;
    const duration = Math.max(1, w.endMs - w.startMs);
    const progress = clamp01(elapsed / duration);

    const hit = clamp01(1 - progress * 3);
    if (hit > 0) {
      cues.push({
        id: `impact-${w.startMs}`,
        type: "WORD_IMPACT",
        target: `w${w.startMs}`,
        progress: hit,
        eased: hit,
        params: { intensity: 1 },
      });
    }

    if (w.beat.barPhase < 0.15 && progress < 0.4) {
      const gateHit = clamp01(1 - progress * 2.5);
      cues.push({
        id: `gate-${w.startMs}`,
        type: "LYRIC_GATE_OPEN",
        target: "door",
        progress: gateHit,
        eased: gateHit,
        params: { intensity: 1 },
      });
    }
  }

  return {
    projectId: trackId,
    frameIndex: frame,
    timeMs: clock.timeMs,
    music: {
      bpm,
      beatIndex: clock.beat.index,
      beatPhase: clock.beat.phase,
      barIndex: clock.bar.index,
      barPhase: clock.bar.phase,
      sectionId: null,
      sectionEnergy: 0.72,
    },
    lyrics: activeWords.map((w) => ({
      id: `${w.word}-${w.startMs}`,
      text: w.word,
      progress: clamp01((clock.timeMs - w.startMs) / Math.max(1, w.endMs - w.startMs)),
      weight: 1,
    })),
    cues,
  };
}

export interface MazeLyricsVideoProps {
  track: GrimoireTrackWithAlignment;
}

export function MazeLyricsVideo({ track }: MazeLyricsVideoProps) {
  const pacing = track.pacing ?? DEFAULT_PACING;
  const offsetMs = (pacing.leadInS ?? 0) * 1000;
  const clock = useBeatClock({ bpm: pacing.bpm, offsetMs });
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const words = track.wordTimings ?? [];
  const activeWords = words.filter((w) => isWordActive(w.startMs, w.endMs, clock.timeMs));

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const packet = buildMazePacket(track.id, frame, pacing.bpm, clock, activeWords);
    mazePlugin.render(ctx, packet, {
      diagnostics: false,
      motion: "full",
      scanlines: true,
      typographyStartMs: offsetMs,
      introImage: null,
    });
  });

  return (
    <AbsoluteFill style={{ background: "#05050b" }}>
      <Audio src={track.audioUrl} />
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
    </AbsoluteFill>
  );
}
