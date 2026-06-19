import React from "react";
import { random } from "remotion";
import type { AmbientPalette } from "./AmbientPalette";

interface OrbFieldProps {
  palette: AmbientPalette;
  beatPhase: number;
  beatIndex: number;
  barIndex: number;
  barPhase: number;
  intensity: number;
}

export function OrbField({
  palette,
  beatPhase,
  barIndex,
  barPhase,
  intensity,
}: OrbFieldProps) {
  const orbs: React.ReactNode[] = [];
  const count = 26;
  const ringRot = barIndex * 3 + barPhase * 30;

  for (let i = 0; i < count; i++) {
    const seed = `orb-${i}`;
    const ring = i % 3;
    const baseR = 420 + ring * 130;
    const phaseOffset = random(`${seed}-phase`) * Math.PI * 2;
    const speed = 0.5 + random(`${seed}-speed`) * 1.2;
    const dir = random(`${seed}-dir`) > 0.5 ? 1 : -1;
    const a =
      ((i / count) * 360 + ringRot * (ring + 1) * (dir === 1 ? 1 : -0.7)) *
        (Math.PI / 180) +
      phaseOffset;
    const r = baseR + Math.sin(barPhase * Math.PI * 2 + phaseOffset) * 40;
    const cx = 960 + Math.cos(a + barPhase * speed) * r;
    const cy = 540 + Math.sin(a + barPhase * speed) * r;
    const sizeJitter = random(`${seed}-size`);
    const baseR2 = 2 + sizeJitter * 5;
    const r2 = baseR2 + (1 - beatPhase) * 3;
    const colorPool = [palette.primary, palette.secondary, palette.accent, palette.positive, palette.negative];
    const color = colorPool[i % colorPool.length];
    const o = 0.35 + (1 - beatPhase) * 0.4 * intensity;
    orbs.push(
      <g key={`orb-${i}`}>
        <circle
          cx={cx}
          cy={cy}
          r={r2 * 3}
          fill={color}
          opacity={o * 0.18}
        />
        <circle
          cx={cx}
          cy={cy}
          r={r2}
          fill={color}
          opacity={o}
        />
      </g>
    );
  }

  return (
    <g>
      <defs>
        <filter id="orb-blur">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
      </defs>
      <g filter="url(#orb-blur)">{orbs}</g>
    </g>
  );
}
