import React from "react";
import { random } from "remotion";
import type { AmbientPalette } from "./AmbientPalette";

interface VolumetricParticlesProps {
  palette: AmbientPalette;
  beatPhase: number;
  beatIndex: number;
  barIndex: number;
  barPhase: number;
  intensity: number;
}

export function VolumetricParticles({
  palette,
  beatPhase,
  beatIndex,
  barIndex,
  barPhase,
  intensity,
}: VolumetricParticlesProps) {
  const count = 70;
  const items: React.CSSProperties[] = [];
  for (let i = 0; i < count; i++) {
    const seed = `vpart-${i}`;
    const baseX = random(`${seed}-x`) * 1920;
    const baseY = random(`${seed}-y`) * 1080;
    const driftX = (random(`${seed}-dx`) - 0.5) * 80;
    const driftY = (random(`${seed}-dy`) - 0.5) * 80;
    const size = 1 + random(`${seed}-s`) * 3.5;
    const colorPool = [palette.primary, palette.secondary, palette.accent, palette.positive, palette.negative];
    const color = colorPool[i % colorPool.length];
    const flashPhase = random(`${seed}-flash`);
    const phaseDiff = ((beatIndex + flashPhase) % 1);
    const onBeat = beatPhase < 0.18 && phaseDiff < 0.18;
    const opacity = onBeat ? 0.7 : 0.18 + random(`${seed}-op`) * 0.18;
    const x = baseX + driftX * barPhase;
    const y = baseY + driftY * barPhase;
    items.push({
      position: "absolute",
      left: `${x}px`,
      top: `${y}px`,
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: "50%",
      background: color,
      boxShadow: `0 0 ${size * 4}px ${color}, 0 0 ${size * 10}px ${color}`,
      opacity: opacity * intensity,
      pointerEvents: "none",
      transition: onBeat ? "none" : "opacity 0.5s ease-out",
    });
  }
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        mixBlendMode: "screen",
      }}
    >
      {items.map((s, i) => (
        <span key={i} style={s} />
      ))}
    </div>
  );
}
