import React from "react";
import { clamp01 } from "../../codex/core/scholotime/scholotime.math.js";
import { SCHOOLS } from "../../codex/core/constants/schools.js";
import type { WordTiming } from "./types";
import type { BeatClockState } from "./useBeatClock";
import type { TypographyLayout } from "./schemas/videoScene";
import { random } from "remotion";
import { GlyphGhost } from "./components/GlyphGhost";


interface KineticWordProps {
  wordTiming: WordTiming;
  clock: BeatClockState;
  beatDurationMs: number;
  isPunchline?: boolean;
  isDownbeat?: boolean;
  layout?: TypographyLayout;
}

export function KineticWord({
  wordTiming,
  clock,
  beatDurationMs,
  isPunchline = false,
  isDownbeat = false,
  layout = "centerPulse",
}: KineticWordProps) {
  const durationMs = Math.max(1, wordTiming.endMs - wordTiming.startMs);
  const localT = (clock.timeMs - wordTiming.startMs) / durationMs;

  if (localT < -0.25 || localT > 1.05) {
    return null;
  }

  if (localT > 1.0) {
    const r1 = random(`${wordTiming.word}-${wordTiming.startMs}-r1`);
    const r2 = random(`${wordTiming.word}-${wordTiming.startMs}-r2`);
    return (
      <span
        style={{
          position: "relative",
          display: "inline-block",
          color: "#475569",
          opacity: 0.6,
          filter: "blur(6px)",
          transform: `scale(1.1) translate(${(r1 - 0.5) * 40}px, ${(r2 - 0.5) * 40}px)`,
          textShadow: "0 0 10px #475569",
        }}
      >
        {wordTiming.word.replace(/./g, "•")}
      </span>
    );
  }

  const entranceT = clamp01(localT * 3);
  const charsToShow = Math.ceil(entranceT * wordTiming.word.length);
  const displayedWord = wordTiming.word.substring(0, charsToShow);
  const isEntering = localT >= 0 && localT < 0.33;

  const glitchSeed = Math.floor(clock.timeMs) + wordTiming.startMs;
  const isGlitching = isEntering && random(`glitch-${glitchSeed}`) > 0.6;
  const glitchOffsetX = isGlitching ? (random(`x-${glitchSeed}`) - 0.5) * 15 : 0;
  const glitchOffsetY = isGlitching ? (random(`y-${glitchSeed}`) - 0.5) * 15 : 0;

  const schoolEntry = (SCHOOLS as Record<string, typeof SCHOOLS.VOID>)[wordTiming.school] ?? SCHOOLS.VOID;
  const color = schoolEntry.color;

  const scale = resolveScale(entranceT, isDownbeat, isPunchline, layout);
  const y = resolveYOffset(entranceT, layout);
  const opacity = 0.35 + entranceT * 0.65;
  const textShadow = resolveTextShadow(isDownbeat, isPunchline, color);

  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        color,
        opacity,
        transform: `translate(${glitchOffsetX}px, ${y}px) scale(${scale})`,
        filter: "saturate(0.5)",
        textShadow,
      }}
    >
      <GlyphGhost
        school={wordTiming.school}
        color={color}
        beatPhase={clock.beat.phase}
        beatDurationMs={beatDurationMs}
        msSinceWordStart={Math.max(0, clock.timeMs - wordTiming.startMs)}
      />
      {displayedWord}
      <span style={{ visibility: "hidden" }}>{wordTiming.word.substring(charsToShow)}</span>
    </span>
  );
}

function resolveScale(
  entranceT: number,
  isDownbeat: boolean,
  isPunchline: boolean,
  layout: TypographyLayout
): number {
  let base: number;
  if (layout === "emblem") {
    base = 0.9;
  } else if (layout === "impactStack") {
    base = 0.78;
  } else if (layout === "flood") {
    base = 0.82;
  } else {
    base = 0.84;
  }

  const lift = isPunchline ? 0.32 : isDownbeat ? 0.26 : 0.16;
  return base + entranceT * lift;
}

function resolveYOffset(entranceT: number, layout: TypographyLayout): number {
  if (layout === "flood") {
    return (1 - entranceT) * 22;
  }
  if (layout === "impactStack") {
    return (1 - entranceT) * 32;
  }
  if (layout === "emblem") {
    return (1 - entranceT) * 12;
  }
  return (1 - entranceT) * 18;
}

function resolveTextShadow(
  isDownbeat: boolean,
  isPunchline: boolean,
  color: string
): string {
  if (isPunchline) {
    return `0 0 32px ${color}, 0 0 64px ${color}, 0 0 4px ${color}`;
  }
  if (isDownbeat) {
    return `0 0 28px ${color}, 0 0 14px ${color}`;
  }
  return `0 0 14px ${color}`;
}