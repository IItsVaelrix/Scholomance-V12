/**
 * bytecodeFingerprint — deterministic display derivations for the Bytecode
 * Visualiser. Same track in → same fingerprint, checksum, coordinates, and
 * ritual-sync out (VAELRIX determinism contract). No Math.random / Date.now.
 *
 * This is presentation-layer formatting (FNV-1a, matching the bytecode error
 * system's hash), NOT the authoritative engine.
 */

export const GOLDEN_RATIO = 0.618;

export interface TrackSeed {
  title: string;
  bpm: number;
  key: string;       // e.g. "D minor"
  trackId?: string;
}

export interface Fingerprint {
  fingerprint: string;          // e.g. 7F3A-9C1D-2B6E-E7A9
  checksumLines: string[];      // 16-hex lines
  seed: string;                 // e.g. 0xVEIL.136.Dm
  coordinates: { x: number; y: number; z: number };
  ritualSync: { phase: number; cycle: string };
  hash: number;                 // base hash for downstream geometry seeding
}

function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function hex8(n: number): string {
  return (n >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

export function computeFingerprint(seed: TrackSeed): Fingerprint {
  const base = `${seed.trackId || seed.title}|${seed.bpm}|${seed.key}`;
  const h1 = fnv1a(base);
  const h2 = fnv1a(`${base}:2`);
  const h3 = fnv1a(`${base}:3`);
  const h4 = fnv1a(`${base}:4`);

  const a = hex8(h1);
  const b = hex8(h2);
  const fingerprint = `${a.slice(0, 4)}-${a.slice(4, 8)}-${b.slice(0, 4)}-${b.slice(4, 8)}`;

  const checksumLines = [
    hex8(h1) + hex8(h2),
    hex8(h3) + hex8(h4),
    hex8(h1 ^ h3) + hex8(h2 ^ h4),
  ];

  const seedKey = (seed.title.match(/[A-Za-z]+/)?.[0] ?? 'SEED').toUpperCase().slice(0, 4);
  const keyShort = seed.key.replace(/\s+/g, '').replace(/minor/i, 'm').replace(/major/i, 'M');
  const seedStr = `0x${seedKey}.${seed.bpm}.${keyShort}`;

  const axis = (salt: string): number => {
    const v = fnv1a(`${base}:coord:${salt}`);
    return Math.round((((v % 40000) / 1000) - 20) * 1e4) / 1e4; // -20.0000 .. +20.0000
  };
  const coordinates = { x: axis('x'), y: axis('y'), z: axis('z') };

  const ritualSync = { phase: GOLDEN_RATIO, cycle: `${(h1 % 9) + 1} / 9` };

  return { fingerprint, checksumLines, seed: seedStr, coordinates, ritualSync, hash: h1 };
}

const STOPWORDS = new Set([
  'the', 'and', 'with', 'from', 'that', 'this', 'through', 'where', 'into',
  'your', 'their', 'what', 'when', 'they', 'them', 'then', 'than', 'over',
]);

/** Deterministic distinctive tokens for the Semantic Map. */
export function semanticTokens(text: string, count = 8): string[] {
  const words = Array.from(new Set((text.toLowerCase().match(/[a-z]{4,}/g) ?? [])))
    .filter((w) => !STOPWORDS.has(w));
  return words
    .sort((p, q) => fnv1a(p) - fnv1a(q))
    .slice(0, count)
    .map((w) => w[0].toUpperCase() + w.slice(1));
}
