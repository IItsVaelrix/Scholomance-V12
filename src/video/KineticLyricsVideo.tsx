import React from "react";
import { AbsoluteFill, Audio } from "remotion";
import type { GrimoireTrackWithAlignment } from "../pages/Visualiser/tracks/loadTrackWithAlignment";
import { DEFAULT_PACING } from "../pages/Visualiser/tracks/types";
import { useBeatClock } from "./useBeatClock";
import { KineticWord } from "./KineticWord";
import { PixelBrainStage } from "./PixelBrainStage";

export interface KineticLyricsVideoProps {
  track: GrimoireTrackWithAlignment;
}

// Active window: show words that started up to 2s ago or start within 500ms
// Risk 5 mitigation — dense rap won't chew the entire lyric sheet per frame
function isWordActive(startMs: number, endMs: number, nowMs: number): boolean {
  return startMs < nowMs + 500 && endMs > nowMs - 2000;
}

export function KineticLyricsVideo({ track }: KineticLyricsVideoProps) {
  const pacing = track.pacing ?? DEFAULT_PACING;
  const offsetMs = (pacing.leadInS ?? 0) * 1000;
  const clock = useBeatClock({ bpm: pacing.bpm, offsetMs });
  const beatDurationMs = 60000 / pacing.bpm;

  const words = track.wordTimings ?? [];
  const activeWords = words.filter((w) =>
    isWordActive(w.startMs, w.endMs, clock.timeMs)
  );

  return (
    <AbsoluteFill
      style={{
        background: "#0a0a0f",
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      <Audio src={track.audioUrl} />
      <PixelBrainStage words={words} currentMs={clock.timeMs} />
      <AbsoluteFill
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignContent: "center",
          justifyContent: "center",
          gap: 20,
          padding: "80px 140px",
          fontSize: 80,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1.2,
        }}
      >
        {activeWords.map((timing, i) => (
          <KineticWord
            key={`${timing.word}-${timing.startMs}`}
            wordTiming={timing}
            clock={clock}
            beatDurationMs={beatDurationMs}
          />
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
