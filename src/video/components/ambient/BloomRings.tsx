import React from "react";
import type { AmbientPalette } from "./AmbientPalette";

interface BloomRingsProps {
  palette: AmbientPalette;
  beatPhase: number;
  beatIndex: number;
  barIndex: number;
  intensity: number;
}

export function BloomRings({
  palette,
  beatPhase,
  beatIndex,
  barIndex,
  intensity,
}: BloomRingsProps) {
  const rings: React.ReactNode[] = [];
  const trail = 3;

  for (let i = 0; i < trail; i++) {
    const age = beatPhase + i * 0.04;
    if (age > 1) continue;
    const eased = 1 - Math.pow(1 - age, 3);
    const r = 80 + eased * 540;
    const opacity = (1 - age) * 0.45 * intensity;
    const color =
      i === 0
        ? palette.accent
        : i === 1
        ? palette.primary
        : palette.secondary;
    rings.push(
      <circle
        key={`bloom-${i}`}
        cx="960"
        cy="540"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={3 - i * 0.6}
        strokeOpacity={opacity}
      />
    );
  }

  const barAge = ((beatIndex % 4) + beatPhase) / 4;
  if (barAge < 0.4) {
    const eased = 1 - Math.pow(1 - barAge / 0.4, 3);
    const r = 60 + eased * 760;
    const opacity = (1 - barAge / 0.4) * 0.25 * intensity;
    rings.push(
      <circle
        key="bar-bloom"
        cx="960"
        cy="540"
        r={r}
        fill="none"
        stroke={palette.accent}
        strokeWidth={2}
        strokeOpacity={opacity}
        strokeDasharray="6 18"
      />
    );
  }

  return <g>{rings}</g>;
}
