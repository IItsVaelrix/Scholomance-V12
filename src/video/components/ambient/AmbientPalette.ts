import { SCHOOLS } from "../../../../codex/core/constants/schools.js";
import type { SceneCue } from "../../schemas/videoScene.js";

export interface AmbientPalette {
  primary: string;
  secondary: string;
  accent: string;
  positive: string;
  negative: string;
  deepBase: string;
  huePrimary: number;
  hueSecondary: number;
  sceneId: string | null;
  sceneTitle: string | null;
  scenePhase: number;
}

const POSITIVE = "#ffb24a";
const NEGATIVE = "#5b8bff";
const DEEP_BASE = "#06070d";

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const m = hex.replace("#", "");
  const r = parseInt(m.substring(0, 2), 16) / 255;
  const g = parseInt(m.substring(2, 4), 16) / 255;
  const b = parseInt(m.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100;
  const lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const hh = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hh < 1) [r, g, b] = [c, x, 0];
  else if (hh < 2) [r, g, b] = [x, c, 0];
  else if (hh < 3) [r, g, b] = [0, c, x];
  else if (hh < 4) [r, g, b] = [0, x, c];
  else if (hh < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = lN - c / 2;
  const toHex = (v: number) =>
    Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hueLerp(a: number, b: number, t: number): number {
  const diff = b - a;
  if (Math.abs(diff) > 180) {
    if (b > a) return ((a + 360) * t + b * (1 - t)) % 360;
    return ((b + 360) * t + a * (1 - t)) % 360;
  }
  return a * (1 - t) + b * t;
}

function schoolColor(schoolId: string | undefined, fallback: string): string {
  if (!schoolId) return fallback;
  const entry = (SCHOOLS as Record<string, { color: string }>)[schoolId];
  return entry?.color ?? fallback;
}

function pickAccent(schools: string[], primary: string): string {
  for (const id of schools) {
    if (id === "VOID" || id === "PSYCHIC") continue;
    const c = schoolColor(id, primary);
    if (c !== primary) return c;
  }
  return primary;
}

export function resolveAmbientPalette(
  scene: SceneCue | null,
  scenes: SceneCue[],
  timeMs: number
): AmbientPalette {
  const fallbackPrimary = schoolColor("VOID", "#94a3b8");
  const fallbackSecondary = schoolColor("PSYCHIC", "#3b82f6");

  if (!scene) {
    return {
      primary: fallbackPrimary,
      secondary: fallbackSecondary,
      accent: POSITIVE,
      positive: POSITIVE,
      negative: NEGATIVE,
      deepBase: DEEP_BASE,
      huePrimary: hexToHsl(fallbackPrimary).h,
      hueSecondary: hexToHsl(fallbackSecondary).h,
      sceneId: null,
      sceneTitle: null,
      scenePhase: 0,
    };
  }

  const primary = schoolColor(scene.dominantSchools[0], fallbackPrimary);
  const secondary = schoolColor(scene.dominantSchools[1], fallbackSecondary);
  const accent = pickAccent(scene.dominantSchools, primary);
  const primaryHsl = hexToHsl(primary);
  const secondaryHsl = hexToHsl(secondary);

  const sceneSpan = Math.max(1, scene.endMs - scene.startMs);
  const scenePhase = Math.min(
    1,
    Math.max(0, (timeMs - scene.startMs) / sceneSpan)
  );

  const idx = scenes.findIndex((s) => s.id === scene.id);
  const next = idx >= 0 && idx < scenes.length - 1 ? scenes[idx + 1] : null;
  const transitionWindowMs = 1500;
  let transitionT = 0;
  let blendedPrimary = primary;
  let blendedSecondary = secondary;
  let blendedAccent = accent;
  if (next) {
    transitionT = Math.min(
      1,
      Math.max(0, (timeMs - (scene.endMs - transitionWindowMs)) / transitionWindowMs)
    );
    const nextPrimary = schoolColor(next.dominantSchools[0], primary);
    const nextSecondary = schoolColor(next.dominantSchools[1], secondary);
    const nextAccent = pickAccent(next.dominantSchools, nextPrimary);
    const h = hueLerp(primaryHsl.h, hexToHsl(nextPrimary).h, transitionT);
    const s = primaryHsl.s * (1 - transitionT) + hexToHsl(nextPrimary).s * transitionT;
    const l = primaryHsl.l * (1 - transitionT) + hexToHsl(nextPrimary).l * transitionT;
    blendedPrimary = hslToHex(h, s, l);
    const h2 = hueLerp(secondaryHsl.h, hexToHsl(nextSecondary).h, transitionT);
    const s2 = secondaryHsl.s * (1 - transitionT) + hexToHsl(nextSecondary).s * transitionT;
    const l2 = secondaryHsl.l * (1 - transitionT) + hexToHsl(nextSecondary).l * transitionT;
    blendedSecondary = hslToHex(h2, s2, l2);
    const ha = hueLerp(hexToHsl(accent).h, hexToHsl(nextAccent).h, transitionT);
    blendedAccent = hslToHex(
      ha,
      hexToHsl(accent).s * (1 - transitionT) + hexToHsl(nextAccent).s * transitionT,
      hexToHsl(accent).l * (1 - transitionT) + hexToHsl(nextAccent).l * transitionT
    );
  }

  return {
    primary: blendedPrimary,
    secondary: blendedSecondary,
    accent: blendedAccent,
    positive: POSITIVE,
    negative: NEGATIVE,
    deepBase: DEEP_BASE,
    huePrimary: hexToHsl(blendedPrimary).h,
    hueSecondary: hexToHsl(blendedSecondary).h,
    sceneId: scene.id,
    sceneTitle: scene.title,
    scenePhase,
  };
}

export function paletteUtils() {
  return { hexToHsl, hslToHex, hueLerp };
}
