import React from "react";
import { AbsoluteFill } from "remotion";
import type { AmbientPalette } from "./AmbientPalette";
import type { BeatClockState } from "../../useBeatClock";
import type { SceneCue } from "../../schemas/videoScene";
import { MandalaCore } from "./MandalaCore";
import { PolarityField } from "./PolarityField";
import { OrbField } from "./OrbField";
import { BloomRings } from "./BloomRings";
import { VolumetricParticles } from "./VolumetricParticles";

interface PolarityAmbientBackgroundProps {
  scene: SceneCue | null;
  scenes: SceneCue[];
  clock: BeatClockState;
  palette: AmbientPalette;
}

export function PolarityAmbientBackground({
  scene,
  scenes,
  clock,
  palette,
}: PolarityAmbientBackgroundProps) {
  const { beat, bar } = clock;
  const intensity = scene?.atmosphere.aurora ?? 0.45;
  const grain = scene?.atmosphere.grain ?? 0.1;
  const vignette = scene?.atmosphere.vignette ?? 0.6;

  const auroraA = palette.primary;
  const auroraB = palette.secondary;
  const auroraC = palette.accent;

  const auroraAlpha = Math.round(intensity * 0.55 * 255)
    .toString(16)
    .padStart(2, "0");
  const auroraAlpha2 = Math.round(intensity * 0.4 * 255)
    .toString(16)
    .padStart(2, "0");
  const auroraAlpha3 = Math.round(intensity * 0.5 * 255)
    .toString(16)
    .padStart(2, "0");

  const gradientShift = beat.phase * 100;
  const tiltX = 50 + Math.sin(bar.phase * Math.PI * 2) * 18;
  const tiltY = 55 + Math.cos(bar.phase * Math.PI * 2) * 12;

  return (
    <AbsoluteFill style={{ background: palette.deepBase, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 90% 70% at ${tiltX}% ${tiltY}%, ${auroraA}${auroraAlpha} 0%, transparent 65%),
                       radial-gradient(ellipse 70% 60% at ${100 - tiltX}% ${100 - tiltY}%, ${auroraB}${auroraAlpha2} 0%, transparent 65%),
                       radial-gradient(ellipse 60% 50% at 50% 50%, ${auroraC}${auroraAlpha3} 0%, transparent 70%),
                       linear-gradient(${gradientShift}deg, ${palette.deepBase} 0%, #0a0a14 50%, ${palette.deepBase} 100%)`,
          mixBlendMode: "screen",
        }}
      />

      <svg
        width="1920"
        height="1080"
        viewBox="0 0 1920 1080"
        style={{
          position: "absolute",
          inset: 0,
          mixBlendMode: "screen",
        }}
      >
        <PolarityField
          palette={palette}
          beatPhase={beat.phase}
          barIndex={bar.index}
          barPhase={bar.phase}
          intensity={intensity}
        />
        <MandalaCore
          palette={palette}
          beatPhase={beat.phase}
          beatIndex={beat.index}
          barIndex={bar.index}
          barPhase={bar.phase}
          intensity={intensity}
        />
        <BloomRings
          palette={palette}
          beatPhase={beat.phase}
          beatIndex={beat.index}
          barIndex={bar.index}
          intensity={intensity}
        />
        <OrbField
          palette={palette}
          beatPhase={beat.phase}
          beatIndex={beat.index}
          barIndex={bar.index}
          barPhase={bar.phase}
          intensity={intensity}
        />
      </svg>

      <VolumetricParticles
        palette={palette}
        beatPhase={beat.phase}
        beatIndex={beat.index}
        barIndex={bar.index}
        barPhase={bar.phase}
        intensity={intensity}
      />

      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 100% 100% at 50% 50%, transparent ${Math.round(
            (1 - vignette) * 50
          )}%, rgba(0,0,0,${(vignette * 0.95).toFixed(2)}) 100%)`,
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          background: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,${grain.toFixed(2)}) 2px, rgba(0,0,0,${grain.toFixed(2)}) 4px)`,
          opacity: 0.6,
          mixBlendMode: "overlay",
          pointerEvents: "none",
        }}
      />

      {scene && (
        <div
          style={{
            position: "absolute",
            top: 40,
            right: 40,
            fontFamily: "'JetBrains Mono', monospace",
            color: "#cbd5e1",
            fontSize: 18,
            textAlign: "right",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            opacity: 0.7,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            zIndex: 1000,
            pointerEvents: "none",
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.6 }}>SCENE</div>
          <div style={{ fontSize: 22, opacity: 0.95, color: palette.primary, textShadow: `0 0 12px ${palette.primary}` }}>
            {scene.title}
          </div>
          <div style={{ fontSize: 12, opacity: 0.5 }}>{scene.dominantSchools.join(" · ")}</div>
        </div>
      )}

      <div
        style={{
          position: "absolute",
          top: 40,
          left: 40,
          fontFamily: "'JetBrains Mono', monospace",
          color: "#94a3b8",
          fontSize: 16,
          opacity: 0.6,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          zIndex: 1000,
          pointerEvents: "none",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
        }}
      >
        <div style={{ fontSize: 11, opacity: 0.5 }}>POLARITY · AMBIENT</div>
        <div>BAR {(bar.index % 1000).toString().padStart(3, "0")} · BEAT {(beat.index % 1000).toString().padStart(3, "0")}</div>
        <div style={{ fontSize: 11, opacity: 0.5 }}>PHASE {beat.phase.toFixed(3)}</div>
      </div>
    </AbsoluteFill>
  );
}
