import React from "react";

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

interface GlyphGhostProps {
  school: string;
  color: string;
  beatPhase: number;
  beatDurationMs?: number;
  msSinceWordStart?: number;
}

export function GlyphGhost({
  school,
  color,
  beatPhase,
  beatDurationMs,
  msSinceWordStart,
}: GlyphGhostProps) {
  const glyph = SCHOOL_GLYPHS[school] ?? SCHOOL_GLYPHS.VOID;

  // Word-local bloom: pulses at beat frequency while word is active
  const bloom =
    beatDurationMs != null && msSinceWordStart != null
      ? (Math.max(0, msSinceWordStart) % beatDurationMs) / beatDurationMs
      : beatPhase;

  const glyphOpacity = 0.6 * (1 - bloom);
  const glyphScale = 1 + 0.6 * bloom;

  return (
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
  );
}
