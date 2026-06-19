export type SceneMode =
  | "threshold"
  | "drought"
  | "lotus"
  | "tragedy"
  | "gold"
  | "retro-war"
  | "skull-dragon"
  | "gravity-machine"
  | "fibonacci-pressure"
  | "monarch-fire"
  | "black-hole-flood"
  | "recovery-polarity";

export type CameraKind =
  | "lock"
  | "push"
  | "pull"
  | "orbit"
  | "shake"
  | "parallax"
  | "snapZoom"
  | "crane";

export type TypographyLayout =
  | "centerPulse"
  | "impactStack"
  | "splitPolarity"
  | "flood"
  | "orbit"
  | "arena"
  | "emblem";

export interface CameraProgram {
  kind: CameraKind;
  intensity: number;
  easing: "smoothstep" | "easeOutCubic" | "easeInOutSine";
  shakeOnDownbeat?: boolean;
}

export interface AtmosphereProgram {
  saturation: number;
  vignette: number;
  aurora: number;
  grain: number;
  rain: number;
  embers: number;
  voidDrain: number;
  chromaSplit: number;
}

export interface TypographyProgram {
  layout: TypographyLayout;
  glyphGhosts: boolean;
  trailAmount: number;
  maxVisibleWords: number;
  emphasizePunchlines: boolean;
}

export interface SceneCue {
  id: string;
  title: string;
  startMs: number;
  endMs: number;
  mode: SceneMode;
  dominantSchools: string[];
  assets: string[];
  camera: CameraProgram;
  atmosphere: AtmosphereProgram;
  typography: TypographyProgram;
  anchorLyrics: string[];
  notes?: string;
}

export interface VideoSidecar {
  schemaVersion: "scholomance.video.v1";
  trackId: string;
  bpm: number;
  offsetMs: number;
  lyricsHash: string;
  scenes: SceneCue[];
  wordOffsetMs?: number;
}

export function validateVideoSidecar(v: unknown): v is VideoSidecar {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  if (s.schemaVersion !== "scholomance.video.v1") return false;
  if (typeof s.trackId !== "string") return false;
  if (typeof s.bpm !== "number") return false;
  if (typeof s.offsetMs !== "number") return false;
  if (typeof s.lyricsHash !== "string") return false;
  if (!Array.isArray(s.scenes) || s.scenes.length === 0) return false;
  return true;
}