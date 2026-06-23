// IMMUNE_ALLOW: LING-0F03
import React from "react";
import { AbsoluteFill } from "remotion";
import { clamp01 } from "../../../codex/core/scholotime/scholotime.math.js";
import type { SceneCue } from "../schemas/videoScene";

interface BytecodeMandalaLayerProps {
  scene: SceneCue | null;
  beat: {
    phase: number;
  };
  dominantSchool: string;
}

const SCHOOL_MANDALA_COLOR: Record<string, string> = {
  SONIC: "#1ab4a8",
  PSYCHIC: "#3b82f6",
  VOID: "#94a3b8",
  ALCHEMY: "#ec4899",
  WILL: "#ef4444",
  NECROMANCY: "#22c55e",
  ABJURATION: "#06b6d4",
  DIVINATION: "#eab308",
};

export function BytecodeMandalaLayer({
  scene,
  beat,
  dominantSchool,
}: BytecodeMandalaLayerProps) {
  const pulse = clamp01(beat.phase);
  const bloom = 1 - Math.pow(beat.phase, 3);
  const color = SCHOOL_MANDALA_COLOR[dominantSchool] ?? SCHOOL_MANDALA_COLOR.VOID;

  const intensity = scene?.atmosphere.aurora ?? 0.15;

  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <svg
        width="1920"
        height="1080"
        viewBox="0 0 1920 1080"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <radialGradient id="mandala-center-glow">
            <stop offset="0%" stopColor={color} stopOpacity={intensity * 0.3 * bloom} />
            <stop offset="60%" stopColor={color} stopOpacity={intensity * 0.08 * bloom} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </radialGradient>
          <filter id="mandala-blur">
            <feGaussianBlur stdDeviation={4 + pulse * 8} />
          </filter>
        </defs>
        <circle
          cx="960"
          cy="540"
          r="480"
          fill="url(#mandala-center-glow)"
          filter="url(#mandala-blur)"
        />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const angle = (i / 8) * 360 + beat.phase * 45;
          const rad = (angle * Math.PI) / 180;
          const r1 = 320 + pulse * 80;
          const r2 = 380 + pulse * 120;
          const cx1 = 960 + Math.cos(rad) * r1;
          const cy1 = 540 + Math.sin(rad) * r1;
          const cx2 = 960 + Math.cos(rad + 0.3) * r2;
          const cy2 = 540 + Math.sin(rad + 0.3) * r2;
          return (
            <line
              key={i}
              x1={cx1}
              y1={cy1}
              x2={cx2}
              y2={cy2}
              stroke={color}
              strokeWidth={1 + pulse * 1.5}
              strokeOpacity={0.15 + intensity * 0.2 * bloom}
            />
          );
        })}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const angle = (i / 6) * 360 - beat.phase * 30;
          const rad = (angle * Math.PI) / 180;
          const r = 200 + pulse * 60;
          const cx = 960 + Math.cos(rad) * r;
          const cy = 540 + Math.sin(rad) * r;
          return (
            <circle
              key={`dot-${i}`}
              cx={cx}
              cy={cy}
              r={3 + pulse * 4}
              fill={color}
              opacity={0.2 + intensity * 0.3 * bloom}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
}