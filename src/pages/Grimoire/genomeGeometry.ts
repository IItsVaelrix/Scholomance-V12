/**
 * Genome geometry — pure transforms that turn a deterministic visual genome
 * (served by /api/catalog/tracks/:id/grimoire, derived by
 * codex/server/catalog/visual.genome.js) into a drawable model for the
 * right-page sacred-geometry render.
 *
 * Pure and side-effect free → unit-testable, and identical output for identical
 * genome (the whole "deterministic, browser-independent" promise of the spread).
 */

export interface GenomeStop { h: number; s: number; l: number }

export interface GenomeLayer {
  kind: string;
  density: number;
  scale: number;
  rotationDir: number;
  phase: number;
}

export interface VisualGenome {
  genomeVersion: string;
  seed: number;
  school: string | null;
  baseHue: number;
  archetype: string;
  symmetry: number;
  palette: GenomeStop[];
  glyphs: string[];
  layerCount: number;
  layers: GenomeLayer[];
  motion: { baseBpm: number; swing: number; pulseGain: number; driftHz: number };
  readouts?: {
    engine?: { name: string; version: string };
    bytecodeSeed?: string;
    semanticMap?: string[];
    coordinates?: { x: number; y: number; z: number };
    ritualSync?: { phase: number; cycle: string };
  };
  checksum: string;
}

export interface SigilRing { r: number; color: string; strokeWidth: number; dash: string | null }
export interface SigilSpoke { x1: number; y1: number; x2: number; y2: number; color: string }
export interface SigilGlyph { x: number; y: number; glyph: string; color: string; size: number }
export interface SigilModel {
  cx: number;
  cy: number;
  size: number;
  symmetry: number;
  rings: SigilRing[];
  spokes: SigilSpoke[];
  glyphMarks: SigilGlyph[];
  palette: string[];
  /** A small triad of nested polygons for the central sigil (eye-in-triangle motif). */
  coreSides: number;
  coreRadius: number;
}

export function stopToCss(stop: GenomeStop, alpha = 1): string {
  if (alpha >= 1) return `hsl(${stop.h} ${stop.s}% ${stop.l}%)`;
  return `hsl(${stop.h} ${stop.s}% ${stop.l}% / ${alpha})`;
}

function polar(cx: number, cy: number, radius: number, angleDeg: number): { x: number; y: number } {
  const a = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) };
}

/**
 * Build the drawable sigil model from a genome. Deterministic: the same genome
 * always yields the same model (no RNG, no time).
 */
export function buildSigilModel(genome: VisualGenome, size = 600): SigilModel {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.46;
  const palette = (genome.palette || []).map((s) => stopToCss(s));
  const symmetry = Math.max(3, Math.min(12, genome.symmetry || 6));
  const layers = genome.layers || [];

  // Rings — one per layer, radius stepped outward, color cycling the palette.
  const rings: SigilRing[] = layers.map((layer, i) => {
    const t = layers.length > 1 ? i / (layers.length - 1) : 0;
    const r = maxR * (0.28 + 0.72 * t) * Math.min(1.1, 0.7 + layer.scale * 0.3);
    const color = palette[i % Math.max(1, palette.length)] || 'hsl(280 80% 60%)';
    return {
      r: Math.round(r * 100) / 100,
      color,
      strokeWidth: Math.max(0.5, Math.round((0.6 + layer.density * 2.2) * 100) / 100),
      dash: layer.kind === 'lattice' || layer.kind === 'filaments' ? '2 6' : null,
    };
  });

  // Spokes — `symmetry` radial lines, rotated by the genome's base phase.
  const basePhase = layers[0]?.phase ?? 0;
  const spokeColor = palette[1 % Math.max(1, palette.length)] || palette[0] || 'hsl(300 80% 60%)';
  const spokes: SigilSpoke[] = [];
  for (let k = 0; k < symmetry; k += 1) {
    const angle = basePhase + (360 / symmetry) * k;
    const inner = polar(cx, cy, maxR * 0.18, angle);
    const outer = polar(cx, cy, maxR * 0.98, angle);
    spokes.push({ x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y, color: spokeColor });
  }

  // Glyph marks — placed around a mid ring, one per glyph, evenly spaced.
  const glyphs = genome.glyphs || [];
  const glyphRing = maxR * 0.82;
  const glyphMarks: SigilGlyph[] = glyphs.map((glyph, i) => {
    const angle = basePhase + (360 / Math.max(1, glyphs.length)) * i;
    const p = polar(cx, cy, glyphRing, angle);
    return {
      x: Math.round(p.x * 100) / 100,
      y: Math.round(p.y * 100) / 100,
      glyph,
      color: palette[(i + 2) % Math.max(1, palette.length)] || 'hsl(45 80% 60%)',
      size: Math.round(size * 0.045),
    };
  });

  // Central sigil: a polygon whose sides track the archetype (triangle motif default).
  const coreSides = genome.archetype === 'WAVEFORM_ROSE' ? symmetry : Math.min(6, Math.max(3, symmetry % 5 + 3));

  return {
    cx,
    cy,
    size,
    symmetry,
    rings,
    spokes,
    glyphMarks,
    palette,
    coreSides,
    coreRadius: Math.round(maxR * 0.22 * 100) / 100,
  };
}

/** Regular-polygon point string for an SVG <polygon points="...">. */
export function polygonPoints(cx: number, cy: number, radius: number, sides: number, rotationDeg = 0): string {
  const n = Math.max(3, Math.floor(sides));
  const pts: string[] = [];
  for (let i = 0; i < n; i += 1) {
    const p = polar(cx, cy, radius, rotationDeg + (360 / n) * i);
    pts.push(`${Math.round(p.x * 100) / 100},${Math.round(p.y * 100) / 100}`);
  }
  return pts.join(' ');
}

/** Index of the lyric line active at `positionMs` (or -1). Lines carry start/end ms. */
export function activeLyricIndex(
  lyrics: Array<{ startMs?: number | null; endMs?: number | null }>,
  positionMs: number,
): number {
  if (!Array.isArray(lyrics)) return -1;
  for (let i = 0; i < lyrics.length; i += 1) {
    const { startMs, endMs } = lyrics[i] || {};
    if (startMs == null) continue;
    const end = endMs ?? (i + 1 < lyrics.length ? lyrics[i + 1]?.startMs ?? Infinity : Infinity);
    if (positionMs >= startMs && positionMs < end) return i;
  }
  return -1;
}
