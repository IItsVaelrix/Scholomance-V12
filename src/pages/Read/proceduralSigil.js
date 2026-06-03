// proceduralSigil.js
//
// Deterministic procedural sigil generated from a word's phoneme texture.
// The sigil is a single composite glyph: the same phoneme texture always
// produces the same sigil, while different textures produce visually distinct
// marks. "Random based on the phoneme texture" — random-looking, but a pure
// function of the phonemes, so a word always resolves to its own symbol.
//
// Input is a list of phoneme specs: { token, manner }, where manner is one of
// vowel | plosive | fricative | nasal | approximant | affricate (the same
// classification used by the Oracle articulation strip). The manner sequence
// shapes the geometry; the token text perturbs the seed so homophone-manner
// words still diverge.

export const SIGIL_VIEWBOX = 64;
const CENTER = SIGIL_VIEWBOX / 2;
const TAU = Math.PI * 2;

const MIN_NODES = 3;
const MAX_NODES = 9;

// FNV-1a 32-bit hash — stable, dependency-free seed from the texture string.
function hashTexture(texture) {
  let h = 0x811c9dc5;
  for (let i = 0; i < texture.length; i += 1) {
    h ^= texture.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// mulberry32 — tiny deterministic PRNG seeded by the texture hash.
function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function round(n) {
  return Math.round(n * 100) / 100;
}

function point(angle, radius) {
  return [CENTER + Math.cos(angle) * radius, CENTER + Math.sin(angle) * radius];
}

// Manner → radial bias: vowels bloom outward, plosives/fricatives pull tighter.
const MANNER_RADIUS_BIAS = {
  vowel: 1.08,
  approximant: 1.0,
  nasal: 0.94,
  affricate: 0.9,
  fricative: 0.86,
  plosive: 0.82,
};

// Normalize the caller's phoneme specs into a clamped working set. Words with
// fewer than MIN_NODES phonemes are cycled up to a closeable figure; long words
// are capped so the sigil stays a glyph, not a mandala.
function normalizeSpecs(phonemeSpecs) {
  const cleaned = (Array.isArray(phonemeSpecs) ? phonemeSpecs : [])
    .map((spec) => ({
      token: String(spec?.token || '').trim(),
      manner: String(spec?.manner || 'approximant'),
    }))
    .filter((spec) => spec.token || spec.manner);

  if (cleaned.length === 0) return [];

  const out = [];
  for (let i = 0; i < Math.max(MIN_NODES, Math.min(cleaned.length, MAX_NODES)); i += 1) {
    out.push(cleaned[i % cleaned.length]);
  }
  return out;
}

// Perpendicular unit vector for a→b, used by zigzag/double/smooth strokes.
function perpendicular(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  return [-dy / len, dx / len];
}

// Build the stroke that joins ring node `a` to node `b`, styled by the manner
// of the phoneme at `a`. Returns an SVG path `d` string.
function strokeForManner(manner, a, b, rng) {
  const [ax, ay] = a;
  const [bx, by] = b;
  const [px, py] = perpendicular(ax, ay, bx, by);

  switch (manner) {
    case 'vowel': {
      // Arc bowed away from the center — round, open vowel resonance.
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2;
      const ox = mx - CENTER;
      const oy = my - CENTER;
      const olen = Math.hypot(ox, oy) || 1;
      const bow = 5 + rng() * 5;
      const cx = mx + (ox / olen) * bow;
      const cy = my + (oy / olen) * bow;
      return `M ${round(ax)} ${round(ay)} Q ${round(cx)} ${round(cy)} ${round(bx)} ${round(by)}`;
    }
    case 'approximant': {
      // Smooth cubic S — gliding, liquid articulation.
      const amp = 3 + rng() * 3;
      const c1x = ax + (bx - ax) * 0.25 + px * amp;
      const c1y = ay + (by - ay) * 0.25 + py * amp;
      const c2x = ax + (bx - ax) * 0.75 - px * amp;
      const c2y = ay + (by - ay) * 0.75 - py * amp;
      return `M ${round(ax)} ${round(ay)} C ${round(c1x)} ${round(c1y)} ${round(c2x)} ${round(c2y)} ${round(bx)} ${round(by)}`;
    }
    case 'fricative': {
      // Zigzag — turbulent, noisy airflow.
      const steps = 4;
      const amp = 2.4 + rng() * 2;
      let d = `M ${round(ax)} ${round(ay)}`;
      for (let s = 1; s <= steps; s += 1) {
        const t = s / steps;
        const offset = s === steps ? 0 : (s % 2 === 0 ? 1 : -1) * amp;
        const x = ax + (bx - ax) * t + px * offset;
        const y = ay + (by - ay) * t + py * offset;
        d += ` L ${round(x)} ${round(y)}`;
      }
      return d;
    }
    case 'affricate': {
      // Doubled line — plosive onset fused to a fricative release.
      const gap = 1.6;
      return (
        `M ${round(ax + px * gap)} ${round(ay + py * gap)} L ${round(bx + px * gap)} ${round(by + py * gap)} ` +
        `M ${round(ax - px * gap)} ${round(ay - py * gap)} L ${round(bx - px * gap)} ${round(by - py * gap)}`
      );
    }
    case 'nasal': {
      // Straight chord with a small resonating loop at the node.
      const r = 2.4 + rng() * 1.2;
      return (
        `M ${round(ax)} ${round(ay)} L ${round(bx)} ${round(by)} ` +
        `M ${round(ax - r)} ${round(ay)} a ${round(r)} ${round(r)} 0 1 0 ${round(r * 2)} 0 ` +
        `a ${round(r)} ${round(r)} 0 1 0 ${round(-r * 2)} 0`
      );
    }
    case 'plosive':
    default: {
      // Hard straight line — abrupt, percussive closure.
      return `M ${round(ax)} ${round(ay)} L ${round(bx)} ${round(by)}`;
    }
  }
}

/**
 * Build a deterministic sigil descriptor from phoneme specs.
 *
 * @param {Array<{token:string, manner:string}>} phonemeSpecs
 * @param {string} [word] - optional, folded into the seed for extra divergence
 * @returns {{ viewBox:number, strokes:Array<{d:string, kind:string}>, seed:number, nodeCount:number }}
 */
export function buildSigil(phonemeSpecs, word = '') {
  const specs = normalizeSpecs(phonemeSpecs);
  if (specs.length === 0) {
    return { viewBox: SIGIL_VIEWBOX, strokes: [], seed: 0, nodeCount: 0 };
  }

  const texture = `${specs.map((s) => `${s.manner}:${s.token}`).join('|')}::${String(word || '').toLowerCase()}`;
  const seed = hashTexture(texture);
  const rng = makeRng(seed);

  const nodeCount = specs.length;
  const baseRadius = 18 + rng() * 6; // 18–24 within the 64px field
  const baseAngle = rng() * TAU; // whole-sigil rotation

  // Lay ring nodes; radius wobbles per node and biases by phoneme manner.
  const nodes = specs.map((spec, i) => {
    const bias = MANNER_RADIUS_BIAS[spec.manner] ?? 1;
    const wobble = 0.82 + rng() * 0.26;
    const radius = baseRadius * bias * wobble;
    const angle = baseAngle + (i / nodeCount) * TAU + (rng() - 0.5) * 0.28;
    return point(angle, radius);
  });

  const strokes = [];

  // Outer ring nodes connected in sequence (closed), each edge styled by the
  // manner of its originating phoneme — this is the readable "phoneme texture".
  for (let i = 0; i < nodeCount; i += 1) {
    const a = nodes[i];
    const b = nodes[(i + 1) % nodeCount];
    strokes.push({ d: strokeForManner(specs[i].manner, a, b, rng), kind: specs[i].manner });
  }

  // Central mark — radial spokes, one per vowel, anchoring the figure. Falls
  // back to a 3-spoke star when the word carries no vowels.
  const vowelCount = specs.filter((s) => s.manner === 'vowel').length;
  const spokes = Math.max(3, vowelCount);
  const spokeLen = 5 + rng() * 4;
  let spokeD = '';
  for (let i = 0; i < spokes; i += 1) {
    const angle = baseAngle + (i / spokes) * TAU;
    const [tx, ty] = point(angle, spokeLen);
    spokeD += `M ${CENTER} ${CENTER} L ${round(tx)} ${round(ty)} `;
  }
  strokes.push({ d: spokeD.trim(), kind: 'core' });

  return { viewBox: SIGIL_VIEWBOX, strokes, seed, nodeCount };
}
