import React from "react";
import { AbsoluteFill } from "remotion";
import type { SceneCue } from "../schemas/videoScene";
import { clamp01 } from "../../../codex/core/scholotime/scholotime.math.js";

interface SceneAtmosphereLayerProps {
  scene: SceneCue | null;
  beat: {
    phase: number;
  };
  dominantSchool: string;
}

const SCHOOL_COLORS: Record<string, string> = {
  SONIC: "#1ab4a8",
  PSYCHIC: "#3b82f6",
  VOID: "#94a3b8",
  ALCHEMY: "#ec4899",
  WILL: "#ef4444",
  NECROMANCY: "#22c55e",
  ABJURATION: "#06b6d4",
  DIVINATION: "#eab308",
};

const DEFAULT_ATMOSPHERE = {
  saturation: 0.25,
  vignette: 0.65,
  aurora: 0.05,
  grain: 0.12,
  rain: 0,
  embers: 0,
  voidDrain: 0.4,
  chromaSplit: 0.04,
};

export function SceneAtmosphereLayer({
  scene,
  beat,
  dominantSchool,
}: SceneAtmosphereLayerProps) {
  const atmosphere = scene?.atmosphere ?? DEFAULT_ATMOSPHERE;
  const pulse = Math.pow(1 - beat.phase, 4);

  const voidBoost = dominantSchool === "VOID" ? 0.25 : 0;
  const alchemyBoost = dominantSchool === "ALCHEMY" ? 0.18 : 0;

  const saturation = clamp01(
    atmosphere.saturation - atmosphere.voidDrain * 0.4 - voidBoost
  );

  const auroraIntensity = atmosphere.aurora + alchemyBoost * pulse;
  const auroraColor = SCHOOL_COLORS[dominantSchool] ?? SCHOOL_COLORS.VOID;
  const auroraAlpha = Math.round(clamp01(auroraIntensity) * 255)
    .toString(16)
    .padStart(2, "0");

  const vignette = clamp01(atmosphere.vignette + pulse * 0.15);
  const grainOpacity = clamp01(atmosphere.grain + beat.phase * 0.05);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 130% 65% at 50% 115%, ${auroraColor}${auroraAlpha} 0%, transparent 70%)`,
          mixBlendMode: "screen",
        }}
      />
      <AbsoluteFill
        style={{
          background: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,${grainOpacity}) 2px, rgba(0,0,0,${grainOpacity}) 4px)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 100% 100% at 50% 50%, transparent ${Math.round(
            (1 - vignette) * 55
          )}%, rgba(0,0,0,${(vignette * 0.95).toFixed(2)}) 100%)`,
        }}
      />
      {atmosphere.embers > 0 && (
        <AbsoluteFill
          style={{
            background: `radial-gradient(circle at 50% 50%, rgba(239,68,68,${atmosphere.embers * pulse * 0.4}) 0%, transparent 60%)`,
            mixBlendMode: "screen",
          }}
        />
      )}
      {atmosphere.rain > 0 && (
        <AbsoluteFill
          style={{
            background: `linear-gradient(180deg, transparent 0%, rgba(56,189,248,${atmosphere.rain * 0.2}) 100%)`,
            mixBlendMode: "soft-light",
          }}
        />
      )}
    </AbsoluteFill>
  );
}