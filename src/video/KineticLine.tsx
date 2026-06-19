import React from "react";
import { clamp01 } from "../../codex/core/scholotime/scholotime.math.js";
import { SCHOOLS } from "../../codex/core/constants/schools.js";
import type { WordTiming } from "./types";
import type { BeatClockState } from "./useBeatClock";
import type { TypographyLayout } from "./schemas/videoScene";
import type { LineGroup } from "./logic/resolveActiveLines";

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

interface KineticLineProps {
  line: LineGroup;
  clock: BeatClockState;
  beatDurationMs: number;
  isPunchline?: boolean;
  isDownbeat?: boolean;
  layout?: TypographyLayout;
}

export function KineticLine({
  line,
  clock,
  beatDurationMs,
  isPunchline = false,
  isDownbeat = false,
  layout = "centerPulse",
}: KineticLineProps) {
  const firstWord = line.words[0];
  const lastWord = line.words[line.words.length - 1];
  const durationMs = Math.max(1, lastWord.endMs - firstWord.startMs);
  const localT = (clock.timeMs - firstWord.startMs) / durationMs;

  if (localT < -0.25 || localT > 1.05) {
    return null;
  }

  const entranceT = clamp01(localT * 3);
  const opacity = 0.35 + entranceT * 0.65;

  const scale = resolveScale(entranceT, isDownbeat, isPunchline);
  const y = resolveYOffset(entranceT, layout);

  const dominantSchool = resolveLineSchool(line.words);
  const schoolEntry = (SCHOOLS as Record<string, typeof SCHOOLS.VOID>)[dominantSchool] ?? SCHOOLS.VOID;
  const color = schoolEntry.color;
  const glyph = SCHOOL_GLYPHS[dominantSchool] ?? SCHOOL_GLYPHS.VOID;

  const lineText = line.words.map((w) => w.word).join(" ");
  const textShadow = isPunchline
    ? `0 0 32px ${color}, 0 0 64px ${color}`
    : isDownbeat
    ? `0 0 28px ${color}`
    : `0 0 14px ${color}`;

  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        color,
        opacity,
        transform: `translateY(${y}px) scale(${scale})`,
        filter: "saturate(0.5)",
        textShadow,
        whiteSpace: "pre-wrap",
        textAlign: "center",
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: "-0.5em",
          top: "0.1em",
          zIndex: -1,
          color,
          opacity: 0.4 * (1 - entranceT),
          transform: `scale(${1 + entranceT * 0.4})`,
          transformOrigin: "left center",
          fontSize: "0.55em",
          fontWeight: 400,
          pointerEvents: "none",
          lineHeight: 1,
        }}
      >
        {glyph}
      </span>
      {lineText}
    </span>
  );
}

function resolveLineSchool(words: WordTiming[]): string {
  const counts = new Map<string, number>();
  for (const word of words) {
    counts.set(word.school, (counts.get(word.school) ?? 0) + 1);
  }
  const priority = ["VOID", "NECROMANCY", "WILL", "ALCHEMY", "SONIC", "PSYCHIC", "ABJURATION", "DIVINATION"];
  return [...counts.entries()].sort((a, b) => {
    const diff = b[1] - a[1];
    if (diff !== 0) return diff;
    return priority.indexOf(a[0]) - priority.indexOf(b[0]);
  })[0][0];
}

function resolveScale(entranceT: number, isDownbeat: boolean, isPunchline: boolean): number {
  const base = 0.88;
  const lift = isPunchline ? 0.28 : isDownbeat ? 0.22 : 0.14;
  return base + entranceT * lift;
}

function resolveYOffset(entranceT: number, layout: TypographyLayout): number {
  if (layout === "flood") return (1 - entranceT) * 22;
  if (layout === "impactStack") return (1 - entranceT) * 28;
  if (layout === "emblem") return (1 - entranceT) * 12;
  return (1 - entranceT) * 18;
}