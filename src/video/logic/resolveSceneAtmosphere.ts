import type { SceneCue } from "../schemas/videoScene";

export interface EffectiveAtmosphere {
  saturation: number;
  auroraIntensity: number;
  auroraColor: string;
  vignette: number;
  grainOpacity: number;
  embers: number;
  rain: number;
  chromaSplit: number;
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

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function resolveSceneAtmosphere(
  scene: SceneCue | null,
  dominantSchool: string,
  beatPhase: number
): EffectiveAtmosphere {
  const atm = scene?.atmosphere ?? DEFAULT_ATMOSPHERE;

  // Beat pulse: strongest at phase=0, fades to 0 at phase=1
  const pulse = Math.pow(1 - beatPhase, 4);

  const voidBoost = dominantSchool === "VOID" ? 0.25 : 0;
  const alchemyBoost = dominantSchool === "ALCHEMY" ? 0.18 : 0;

  return {
    saturation: clamp01(atm.saturation - atm.voidDrain * 0.4 - voidBoost),
    auroraIntensity: atm.aurora + alchemyBoost * pulse,
    auroraColor: SCHOOL_COLORS[dominantSchool] ?? SCHOOL_COLORS.VOID,
    vignette: clamp01(atm.vignette + pulse * 0.15),
    grainOpacity: clamp01(atm.grain + beatPhase * 0.05),
    embers: atm.embers,
    rain: atm.rain,
    chromaSplit: atm.chromaSplit,
  };
}
