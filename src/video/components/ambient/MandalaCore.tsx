import React from "react";
import { random } from "remotion";
import type { AmbientPalette } from "./AmbientPalette";

interface MandalaCoreProps {
  palette: AmbientPalette;
  beatPhase: number;
  beatIndex: number;
  barIndex: number;
  barPhase: number;
  intensity: number;
}

export function MandalaCore({
  palette,
  beatPhase,
  beatIndex,
  barIndex,
  barPhase,
  intensity,
}: MandalaCoreProps) {
  const bloom = 1 - Math.pow(beatPhase, 3);
  const kaleidoStep = barIndex % 4;
  const arms = 12;
  const r0 = 110 + beatPhase * 50;
  const r1 = 220 + beatPhase * 90;
  const r2 = 340 + beatPhase * 120;
  const ringRot = barPhase * 360;
  const armRot = beatPhase * 18 + barIndex * 6;

  const petals: React.ReactNode[] = [];
  for (let i = 0; i < arms; i++) {
    const baseAngle = (i / arms) * 360;
    const a1 = (baseAngle + armRot) * (Math.PI / 180);
    const a2 = (baseAngle + armRot + 12) * (Math.PI / 180);
    const a3 = (baseAngle + armRot - 12) * (Math.PI / 180);
    const ax = 960 + Math.cos(a1) * r0;
    const ay = 540 + Math.sin(a1) * r0;
    const bx = 960 + Math.cos(a2) * r1;
    const by = 540 + Math.sin(a2) * r1;
    const cx = 960 + Math.cos(a3) * r1;
    const cy = 540 + Math.sin(a3) * r1;
    const d = `M ${ax.toFixed(1)} ${ay.toFixed(1)} Q ${bx.toFixed(1)} ${by.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)}`;
    petals.push(
      <path
        key={`petal-${i}`}
        d={d}
        stroke={palette.primary}
        strokeWidth={1.2 + bloom * 1.4}
        strokeOpacity={0.18 + bloom * 0.35 * intensity}
        fill="none"
      />
    );
  }

  const ringSpokes: React.ReactNode[] = [];
  const ringCount = 6 + kaleidoStep * 2;
  for (let i = 0; i < ringCount; i++) {
    const a = ((i / ringCount) * 360 + ringRot) * (Math.PI / 180);
    const x1 = 960 + Math.cos(a) * (140 + beatPhase * 30);
    const y1 = 540 + Math.sin(a) * (140 + beatPhase * 30);
    const x2 = 960 + Math.cos(a) * (r2 + 40);
    const y2 = 540 + Math.sin(a) * (r2 + 40);
    ringSpokes.push(
      <line
        key={`spoke-${i}`}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={palette.secondary}
        strokeWidth={0.8 + bloom * 0.6}
        strokeOpacity={0.12 + bloom * 0.2 * intensity}
      />
    );
  }

  const dots: React.ReactNode[] = [];
  const dotCount = 36;
  for (let i = 0; i < dotCount; i++) {
    const ringIdx = i % 3;
    const baseR = ringIdx === 0 ? 180 : ringIdx === 1 ? 280 : 380;
    const r = baseR + beatPhase * (30 + ringIdx * 10);
    const a = ((i / dotCount) * 360 - ringRot * (ringIdx + 1) * 0.4) * (Math.PI / 180);
    const cx = 960 + Math.cos(a) * r;
    const cy = 540 + Math.sin(a) * r;
    const seed = `dot-${i}-${barIndex}`;
    const jitter = (random(seed) - 0.5) * 8;
    const colorPick = i % 4 === 0 ? palette.accent : i % 2 === 0 ? palette.primary : palette.secondary;
    dots.push(
      <circle
        key={`dot-${i}`}
        cx={cx + jitter}
        cy={cy + jitter}
        r={1.6 + bloom * 2.5 + (i % 5 === 0 ? 1.5 : 0)}
        fill={colorPick}
        opacity={0.35 + bloom * 0.4 * intensity}
      />
    );
  }

  return (
    <g>
      <defs>
        <radialGradient id="mandala-glow">
          <stop offset="0%" stopColor={palette.primary} stopOpacity={0.55 * bloom * intensity} />
          <stop offset="35%" stopColor={palette.primary} stopOpacity={0.22 * bloom * intensity} />
          <stop offset="70%" stopColor={palette.secondary} stopOpacity={0.08 * bloom * intensity} />
          <stop offset="100%" stopColor={palette.secondary} stopOpacity={0} />
        </radialGradient>
        <filter id="mandala-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={2 + bloom * 5} />
        </filter>
        <filter id="mandala-bloom" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={6 + bloom * 10} />
        </filter>
      </defs>

      <circle
        cx="960"
        cy="540"
        r="560"
        fill="url(#mandala-glow)"
        filter="url(#mandala-bloom)"
      />

      <g filter="url(#mandala-soft)">{petals}</g>
      <g>{ringSpokes}</g>
      <g>{dots}</g>

      {[180, 280, 380, 480].map((radius, idx) => (
        <circle
          key={`ring-${idx}`}
          cx="960"
          cy="540"
          r={radius + beatPhase * 8}
          fill="none"
          stroke={idx % 2 === 0 ? palette.primary : palette.secondary}
          strokeWidth={0.6 + bloom * 0.5}
          strokeOpacity={0.08 + bloom * 0.12 * intensity}
          strokeDasharray={idx === 0 ? "4 12" : idx === 1 ? "2 18" : idx === 2 ? "1 26" : "8 4"}
        />
      ))}

      <g>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const a = ((i / 6) * 360 + beatIndex * 4) * (Math.PI / 180);
          const x = 960 + Math.cos(a) * 60;
          const y = 540 + Math.sin(a) * 60;
          return (
            <circle
              key={`core-${i}`}
              cx={x}
              cy={y}
              r={2 + bloom * 4}
              fill={palette.accent}
              opacity={0.5 + bloom * 0.5}
              filter="url(#mandala-soft)"
            />
          );
        })}
        <circle
          cx="960"
          cy="540"
          r={6 + bloom * 14}
          fill={palette.accent}
          opacity={0.8 + bloom * 0.2}
          filter="url(#mandala-bloom)"
        />
        <circle
          cx="960"
          cy="540"
          r={2.5}
          fill="#ffffff"
          opacity={0.95}
        />
      </g>
    </g>
  );
}
