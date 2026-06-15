import React from "react";
import {
  applyEasing,
  clamp01,
} from "../../codex/core/scholotime/scholotime.math.js";
import { SCHOOLS } from "../../codex/core/constants/schools.js";
import type { WordTiming } from "./types";
import type { BeatClockState } from "./useBeatClock";

const SCHOOL_GLYPHS: Record<string, string> = {
  SONIC: "♩",
  PSYCHIC: "◬",
  VOID: "∅",
  ALCHEMY: "⚗",
  WILL: "⚡",
  NECROMANCY: "☠",
  ABJURATION: "◇",
  DIVINATION: "◉",
};

interface KineticWordProps {
  wordTiming: WordTiming;
  clock: BeatClockState;
  beatDurationMs: number;
}

export function KineticWord({ wordTiming, clock, beatDurationMs }: KineticWordProps) {
  const durationMs = Math.max(1, wordTiming.endMs - wordTiming.startMs);
  const localT = (clock.timeMs - wordTiming.startMs) / durationMs;

  // Active window: -25% before start (lookahead) to +25% after end (linger)
  if (localT < -0.25 || localT > 1.25) {
    return null;
  }

  const entranceT = clamp01(localT * 2);

  // isBarDownbeatWord uses the word's stored beat position, not the current frame's.
  // A word's entrance personality is fixed by where it lands in the song grid.
  const isBarDownbeatWord = wordTiming.beat.barPhase < 0.1;
  const eased = isBarDownbeatWord
    ? applyEasing(entranceT, "easeOutCubic")
    : applyEasing(entranceT, "smoothstep");

  const school = (SCHOOLS as Record<string, typeof SCHOOLS.VOID>)[wordTiming.school] ?? SCHOOLS.VOID;
  const color = school.color;
  const glyph = SCHOOL_GLYPHS[wordTiming.school] ?? SCHOOL_GLYPHS.VOID;

  const scale = 0.85 + eased * 0.15;
  const opacity = clamp01(eased);
  const translateY = (1 - eased) * 18;

  // Glyph bloom: pulses at the start of each beat within the word's active window
  const msSinceWordStart = clock.timeMs - wordTiming.startMs;
  const beatPositionWithinWord = (msSinceWordStart % beatDurationMs) / beatDurationMs;
  const glyphBloom = applyEasing(clamp01(beatPositionWithinWord), "smoothstep");
  const glyphOpacity = 0.4 * (1 - glyphBloom);
  const glyphScale = 1 + 0.4 * glyphBloom;

  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        color,
        opacity,
        transform: `scale(${scale}) translateY(${translateY}px)`,
        transformOrigin: "center bottom",
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: "-0.45em",
          top: "0.12em",
          zIndex: -1,
          color,
          opacity: glyphOpacity,
          transform: `scale(${glyphScale})`,
          transformOrigin: "left center",
          fontSize: "0.6em",
          fontWeight: 400,
          pointerEvents: "none",
          lineHeight: 1,
        }}
      >
        {glyph}
      </span>
      {wordTiming.word}
    </span>
  );
}
