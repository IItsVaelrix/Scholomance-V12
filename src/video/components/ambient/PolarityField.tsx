import React from "react";
import type { AmbientPalette } from "./AmbientPalette";

interface PolarityFieldProps {
  palette: AmbientPalette;
  beatPhase: number;
  barIndex: number;
  barPhase: number;
  intensity: number;
}

export function PolarityField({
  palette,
  beatPhase,
  barIndex,
  barPhase,
  intensity,
}: PolarityFieldProps) {
  const splitRotation = barPhase * 90 - 45;
  const arcPulse = 1 - Math.pow(beatPhase, 2);
  const ringCount = 4;
  const arcs: React.ReactNode[] = [];

  for (let i = 0; i < ringCount; i++) {
    const radius = 320 + i * 110;
    const dash = 18 + i * 6;
    const gap = 90 - i * 8;
    const rotation = barIndex * (4 + i * 2) + barPhase * 20;
    arcs.push(
      <g key={`arc-${i}`} transform={`rotate(${rotation} 960 540)`}>
        <circle
          cx="960"
          cy="540"
          r={radius}
          fill="none"
          stroke={i % 2 === 0 ? palette.positive : palette.negative}
          strokeWidth={2 + arcPulse * 3 + i * 0.4}
          strokeOpacity={0.18 + arcPulse * 0.35 * intensity}
          strokeDasharray={`${dash} ${gap}`}
        />
      </g>
    );
  }

  const spokes: React.ReactNode[] = [];
  for (let i = 0; i < 16; i++) {
    const baseAngle = (i / 16) * 360 + barIndex * 3;
    const a = (baseAngle * Math.PI) / 180;
    const len = 240 + (i % 3) * 60;
    const x1 = 960 + Math.cos(a) * 110;
    const y1 = 540 + Math.sin(a) * 110;
    const x2 = 960 + Math.cos(a) * (110 + len);
    const y2 = 540 + Math.sin(a) * (110 + len);
    spokes.push(
      <line
        key={`spoke-${i}`}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={i % 2 === 0 ? palette.positive : palette.negative}
        strokeWidth={1 + arcPulse * 1.2}
        strokeOpacity={0.08 + arcPulse * 0.18 * intensity}
        strokeLinecap="round"
      />
    );
  }

  const pullX = Math.sin(barPhase * Math.PI * 2) * 28;
  const pullY = Math.cos(barPhase * Math.PI * 2) * 18;

  return (
    <g>
      <defs>
        <radialGradient id="pos-gradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={palette.positive} stopOpacity={0.65 * intensity} />
          <stop offset="55%" stopColor={palette.positive} stopOpacity={0.18 * intensity} />
          <stop offset="100%" stopColor={palette.positive} stopOpacity={0} />
        </radialGradient>
        <radialGradient id="neg-gradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={palette.negative} stopOpacity={0.65 * intensity} />
          <stop offset="55%" stopColor={palette.negative} stopOpacity={0.18 * intensity} />
          <stop offset="100%" stopColor={palette.negative} stopOpacity={0} />
        </radialGradient>
        <filter id="polar-blur">
          <feGaussianBlur stdDeviation={3 + arcPulse * 5} />
        </filter>
      </defs>

      <g transform={`rotate(${splitRotation} 960 540)`} filter="url(#polar-blur)">
        <g transform={`translate(${pullX} 0)`}>
          <ellipse
            cx="780"
            cy="540"
            rx="420"
            ry="320"
            fill="url(#pos-gradient)"
            opacity={0.55 + arcPulse * 0.35}
          />
        </g>
        <g transform={`translate(${-pullX} 0)`}>
          <ellipse
            cx="1140"
            cy="540"
            rx="420"
            ry="320"
            fill="url(#neg-gradient)"
            opacity={0.55 + arcPulse * 0.35}
          />
        </g>
      </g>

      <g>{arcs}</g>
      <g>{spokes}</g>

      <g transform={`translate(${960 + pullX} 540)`} filter="url(#polar-blur)">
        <circle
          cx="0"
          cy="0"
          r={18 + arcPulse * 10}
          fill={palette.positive}
          opacity={0.85}
        />
        <circle
          cx="0"
          cy="0"
          r={36 + arcPulse * 18}
          fill="none"
          stroke={palette.positive}
          strokeWidth={2}
          strokeOpacity={0.6}
        />
      </g>
      <g transform={`translate(${960 - pullX} 540)`} filter="url(#polar-blur)">
        <circle
          cx="0"
          cy="0"
          r={18 + arcPulse * 10}
          fill={palette.negative}
          opacity={0.85}
        />
        <circle
          cx="0"
          cy="0"
          r={36 + arcPulse * 18}
          fill="none"
          stroke={palette.negative}
          strokeWidth={2}
          strokeOpacity={0.6}
        />
      </g>
    </g>
  );
}
