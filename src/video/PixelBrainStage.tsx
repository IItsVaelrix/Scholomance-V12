import React from "react";
import { AbsoluteFill } from "remotion";
import { applyEasing, clamp01 } from "../../codex/core/scholotime/scholotime.math.js";
import { SCHOOLS } from "../../codex/core/constants/schools.js";
import type { WordTiming } from "./types";

// Deterministic tie-breaking when two schools share the same word count.
// Order: rarer / more dramatic schools win ties over common ones.
const SCHOOL_PRIORITY = [
  "VOID",
  "NECROMANCY",
  "WILL",
  "ALCHEMY",
  "SONIC",
  "PSYCHIC",
  "ABJURATION",
  "DIVINATION",
];

const TRAILING_WINDOW_MS = 2000;

export function getDominantSchoolFromWindow(
  words: WordTiming[],
  currentMs: number
): string {
  const recent = words.filter(
    (w) => w.startMs >= currentMs - TRAILING_WINDOW_MS && w.startMs <= currentMs
  );
  if (recent.length === 0) return "VOID";

  const counts: Record<string, number> = {};
  for (const w of recent) {
    counts[w.school] = (counts[w.school] ?? 0) + 1;
  }

  return Object.entries(counts).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]; // higher count wins
    // tie: lower SCHOOL_PRIORITY index wins (more dramatic first)
    const pa = SCHOOL_PRIORITY.indexOf(a[0]);
    const pb = SCHOOL_PRIORITY.indexOf(b[0]);
    return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
  })[0][0];
}

interface PixelBrainStageProps {
  words: WordTiming[];
  currentMs: number;
}

export function PixelBrainStage({ words, currentMs }: PixelBrainStageProps) {
  const dominantSchool = getDominantSchoolFromWindow(words, currentMs);
  const schoolDef = (SCHOOLS as Record<string, typeof SCHOOLS.VOID>)[dominantSchool] ?? SCHOOLS.VOID;
  const atm = schoolDef.atmosphere;
  const schoolColor = schoolDef.color;

  const aurora = clamp01(atm.auroraIntensity / 1.2); // normalize: max auroraIntensity is ~1.1
  const vignette = clamp01(atm.vignetteStrength);
  const saturation = applyEasing(clamp01(atm.saturation / 105), "smoothstep"); // normalize: max is 105

  const auroraAlpha = Math.round(aurora * 38)
    .toString(16)
    .padStart(2, "0");

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* Aurora glow — school color radiating from bottom center */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 130% 65% at 50% 115%, ${schoolColor}${auroraAlpha} 0%, transparent 70%)`,
          mixBlendMode: "screen",
        }}
      />
      {/* Vignette — darkens corners, depth controlled by school atmosphere */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 100% 100% at 50% 50%, transparent ${Math.round(
            (1 - vignette) * 55
          )}%, rgba(0,0,0,${(vignette * 0.88).toFixed(2)}) 100%)`,
        }}
      />
      {/* Saturation overlay — VOID desaturates, ALCHEMY/WILL saturate */}
      <AbsoluteFill
        style={{
          backdropFilter: `saturate(${(0.15 + saturation * 0.85).toFixed(2)})`,
        }}
      />
    </AbsoluteFill>
  );
}
