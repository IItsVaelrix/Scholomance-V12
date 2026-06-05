/**
 * Visual Genome — the deterministic right-page of the Grimoire.
 *
 * Every track's right-page visual is procedurally derived from two inputs:
 *   1. the audio's bytecode checksum fingerprint (`fingerprint_id`) — its
 *      identity, extrapolated once at upload from the raw .wav/.mp3 bytes;
 *   2. semantic cues — school, tags, and lyric text — its meaning.
 *
 * The genome is the *static identity* of the visual (palette, sacred geometry,
 * glyphs, layer structure). The resonance sidecar is the *temporal score* that
 * modulates it during playback. Both are precomputed and fully deterministic,
 * so the same song renders byte-identical on every device, every load — no live
 * FFT, no Web Audio, no CORS or iOS Safari pitfalls. (VAELRIX_LAW §6 determinism;
 * QUANT-0101: seeded RNG only, never host RNG.)
 *
 * Pure module (no DB, no I/O, no Date/random) — unit-testable in isolation.
 * See PDR-2026-06-05-SONIC-EXCHANGE-NATIVE-LISTENING §11 (The Grimoire Spread).
 */

import { mulberry32 } from '../../core/shared/math/seededRng.js';
import { stableStringify } from './provenance.sign.js';

export const GENOME_VERSION = '1';

/** The deterministic engine stamp shown on the right page ("GlyphCore"). */
export const GLYPHCORE_ENGINE = Object.freeze({ name: 'GlyphCore', version: '1.0.0' });

/** Sacred-geometry archetypes for the right page. */
export const VISUAL_ARCHETYPES = Object.freeze([
  'SIGIL',         // single bold radial sigil
  'MANDALA',       // dense concentric petals
  'LATTICE',       // crystalline grid weave
  'NEBULA',        // soft volumetric clouds
  'RUNE_CIRCLE',   // ringed rune inscription
  'WAVEFORM_ROSE', // polar waveform rosette
]);

/** Layer kinds a genome can stack. */
const LAYER_KINDS = Object.freeze(['rings', 'rays', 'petals', 'filaments', 'glyphband', 'dust']);

/** Glyph alphabet drawn from across the schools (mirrors schools.js glyphs). */
const GLYPH_POOL = Object.freeze([
  '✦', '◬', '♩', '⟁', '❍', '✶', '⌖', '✴', '⟡', '◈', '✷', '⬡', '⟴', '☩', '⍟', '✺',
]);

/**
 * Base hue per school — mirrors `colorHsl.h` in
 * codex/core/constants/schools.js. Inlined so this module stays dependency-light
 * and the genome test runs pure. Unknown/absent schools fall back to a
 * seed-derived hue so every track still gets a stable identity.
 */
const SCHOOL_HUE = Object.freeze({
  SONIC: 175, PSYCHIC: 220, VOID: 270, ALCHEMY: 130, WILL: 25,
  NECROMANCY: 300, ABJURATION: 200, DIVINATION: 45,
});

/** 32-bit FNV-1a hash of a string → unsigned int seed material. */
export function fnv1a(input) {
  let hash = 0x811c9dc5;
  const str = String(input ?? '');
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function rotl32(value, bits) {
  return ((value << bits) | (value >>> (32 - bits))) >>> 0;
}

function pick(rng, list) {
  return list[Math.floor(rng() * list.length) % list.length];
}

function intBetween(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Stable short hex signature of the genome body (integrity / cache key). */
function genomeChecksum(body) {
  return fnv1a(stableStringify(body)).toString(16).padStart(8, '0');
}

/**
 * Human-readable bytecode seed label for the right page, e.g. "0xVEIL-136-Dm":
 * a salient word from the title + BPM + musical key. Falls back to the hex seed.
 */
export function formatBytecodeSeed({ title, bpm, key, seed } = {}) {
  const words = String(title || '').toUpperCase().match(/[A-Z0-9]+/g) || [];
  const salient = [...words].reverse().find((w) => w.length > 2) || words[words.length - 1];
  if (salient && Number.isFinite(bpm) && key) {
    return `0x${salient}-${Math.round(bpm)}-${String(key).replace(/\s+/g, '')}`;
  }
  return `0x${(seed >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
}

/** Title-cased, de-duplicated semantic map for the right-page panel (max 8). */
function deriveSemanticMap({ semanticTokens, tags }) {
  const source = Array.isArray(semanticTokens) && semanticTokens.length
    ? semanticTokens
    : (tags || []);
  const seen = new Set();
  const out = [];
  for (const raw of source) {
    const token = String(raw || '').trim();
    if (!token) continue;
    const label = token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    if (seen.has(label)) continue;
    seen.add(label);
    out.push(label);
    if (out.length >= 8) break;
  }
  return out;
}

/**
 * Derive the deterministic visual genome for a track.
 *
 * @param {object} input
 * @param {string} input.fingerprintId  - audio bytecode checksum fingerprint (required for a stable identity)
 * @param {string} [input.school]
 * @param {string[]} [input.tags]
 * @param {string} [input.lyricsText]   - first lines are enough; only used for the semantic seed
 * @param {number} [input.bpm]          - detected tempo; the sidecar drives motion at play time
 * @param {number} [input.durationMs]
 * @returns {object} genome (JSON-serializable, deterministic)
 */
export function deriveVisualGenome(input = {}) {
  const fingerprintId = String(input.fingerprintId || '');
  const school = input.school ? String(input.school).toUpperCase() : null;
  const tags = Array.isArray(input.tags) ? input.tags.map((t) => String(t).toLowerCase()) : [];

  // Semantic cue string — meaning. Truncate lyrics so tiny edits past the hook
  // don't churn the identity, but the opening still colors the genome.
  const lyricsHead = String(input.lyricsText || '').slice(0, 280).toLowerCase();
  const semantic = [school || '', ...tags, lyricsHead].join('|');

  // Identity seed: audio fingerprint dominates, semantics perturb it.
  const audioSeed = fnv1a(fingerprintId);
  const semanticSeed = rotl32(fnv1a(semantic), 16);
  const seed = (audioSeed ^ semanticSeed) >>> 0;
  const rng = mulberry32(seed);

  // Base hue: school anchor when known, else stable from the seed.
  const baseHue = (school && SCHOOL_HUE[school] != null)
    ? SCHOOL_HUE[school]
    : Math.floor(rng() * 360);

  const archetype = pick(rng, VISUAL_ARCHETYPES);
  const symmetry = intBetween(rng, 3, 12);

  // Palette: analogous-to-triadic spread off the base hue, deterministic.
  const paletteSize = intBetween(rng, 4, 6);
  const spread = intBetween(rng, 18, 64); // degrees between stops
  const palette = [];
  for (let i = 0; i < paletteSize; i += 1) {
    const h = (baseHue + i * spread * (rng() > 0.5 ? 1 : -1) + 360) % 360;
    const s = Math.round(58 + rng() * 38);
    const l = Math.round(34 + rng() * 40);
    palette.push({ h: Math.round(h), s, l });
  }

  // Glyph set — a small deterministic alphabet for inscriptions.
  const glyphCount = intBetween(rng, 3, 5);
  const glyphs = [];
  const usedGlyph = new Set();
  while (glyphs.length < glyphCount) {
    const g = pick(rng, GLYPH_POOL);
    if (!usedGlyph.has(g)) { usedGlyph.add(g); glyphs.push(g); }
  }

  // Layer stack.
  const layerCount = intBetween(rng, 3, 6);
  const layers = [];
  for (let i = 0; i < layerCount; i += 1) {
    layers.push({
      kind: pick(rng, LAYER_KINDS),
      density: Math.round((0.2 + rng() * 0.8) * 100) / 100,
      scale: Math.round((0.4 + rng() * 1.4) * 100) / 100,
      rotationDir: rng() > 0.5 ? 1 : -1,
      phase: Math.round(rng() * 360),
    });
  }

  // Motion envelope — defaults the sidecar modulates at play time.
  const baseBpm = Number.isFinite(input.bpm) ? Math.round(input.bpm) : 90;
  const motion = {
    baseBpm,
    swing: Math.round(rng() * 100) / 100,
    pulseGain: Math.round((0.4 + rng() * 0.6) * 100) / 100,
    driftHz: Math.round((0.02 + rng() * 0.12) * 1000) / 1000,
  };

  // Right-page readout panels (all deterministic from the same stream).
  const coordinates = {
    x: Math.round((rng() * 40 - 20) * 10000) / 10000,
    y: Math.round((rng() * 40 - 20) * 10000) / 10000,
    z: Math.round((rng() * 40 - 20) * 10000) / 10000,
  };
  const ritualSync = {
    phase: Math.round(rng() * 1000) / 1000,
    cycle: `${intBetween(rng, 1, 7)}/7`,
  };
  const readouts = {
    engine: GLYPHCORE_ENGINE,
    bytecodeSeed: formatBytecodeSeed({ title: input.title, bpm: baseBpm, key: input.musicalKey, seed }),
    semanticMap: deriveSemanticMap({ semanticTokens: input.semanticTokens, tags }),
    coordinates,
    ritualSync,
  };

  const body = {
    genomeVersion: GENOME_VERSION,
    fingerprintId,
    seed,
    school: school || null,
    baseHue,
    archetype,
    symmetry,
    palette,
    glyphs,
    layerCount,
    layers,
    motion,
    readouts,
    durationMs: Number.isFinite(input.durationMs) ? Math.round(input.durationMs) : null,
  };

  return { ...body, checksum: genomeChecksum(body) };
}
