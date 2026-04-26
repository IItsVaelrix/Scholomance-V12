/**
 * GlyphAtlas — Procedural ASCII-styled stroke recipes.
 * 
 * Grid: 12 × 16 (Canonical terminal cell aspect).
 * Pattern: orthogonal or 45°/30° aligned strokes; minimal Bézier curves.
 */

export const GLYPH_CELL = Object.freeze({ w: 12, h: 16 });

export const GLYPH_ATLAS = Object.freeze({
  a: [
    'M 1 14 L 6 2',           // left diagonal
    'M 6 2 L 11 14',          // right diagonal
    'M 3 10 L 9 10',          // crossbar
  ],
  b: [
    'M 2 14 L 2 2',           // vertical
    'M 2 2 L 8 2 C 11 2 11 8 8 8 L 2 8', // top loop
    'M 2 8 L 8 8 C 11 8 11 14 8 14 L 2 14', // bottom loop
  ],
  c: [
    'M 10 4 C 6 1 2 4 2 8 C 2 12 6 15 10 12', // open arc
  ],
  d: [
    'M 2 14 L 2 2',           // vertical
    'M 2 2 L 6 2 C 11 2 11 14 6 14 L 2 14', // bowl
  ],
  e: [
    'M 10 5 C 10 2 6 1 4 4 C 2 7 4 10 8 10 L 10 10', // top arc
    'M 2 14 C 6 16 10 14 10 11',                    // bottom arc
  ],
  f: [
    'M 2 14 L 2 2',           // vertical
    'M 2 2 L 10 2',           // top bar
    'M 2 7 L 8 7',            // mid bar
  ],
  g: [
    'M 10 4 C 6 1 2 4 2 8 C 2 12 6 15 10 12', // outer arc
    'M 10 12 L 10 8 L 6 8',   // hook
  ],
  h: [
    'M 2 14 L 2 2',           // left vertical
    'M 10 14 L 10 2',         // right vertical
    'M 2 8 L 10 8',           // crossbar
  ],
  i: [
    'M 6 2 L 6 14',           // stem
    'M 3 2 L 9 2',            // top cap
    'M 3 14 L 9 14',          // bottom cap
  ],
  j: [
    'M 8 2 L 8 12 C 8 15 2 15 2 12', // stem and hook
    'M 5 2 L 11 2',           // top cap
  ],
  k: [
    'M 2 14 L 2 2',           // vertical
    'M 10 2 L 2 8',           // upper arm
    'M 2 8 L 10 14',          // lower leg
  ],
  l: [
    'M 4 2 L 4 14',           // single vertical
    'M 4 14 L 10 14',         // bottom bar
  ],
  m: [
    'M 1 14 L 1 2',           // left
    'M 11 14 L 11 2',         // right
    'M 1 2 L 6 8 L 11 2',     // valley
  ],
  n: [
    'M 2 14 L 2 2',           // left
    'M 10 14 L 10 2',         // right
    'M 2 2 L 10 14',          // diagonal
  ],
  o: [
    'M 6 2 C 2 2 2 14 6 14 C 10 14 10 2 6 2', // closed curve
  ],
  p: [
    'M 2 14 L 2 2',           // vertical
    'M 2 2 L 7 2 C 10 2 10 8 7 8 L 2 8', // top loop
  ],
  q: [
    'M 6 2 C 2 2 2 14 6 14 C 10 14 10 2 6 2', // loop
    'M 8 11 L 11 14',         // tail
  ],
  r: [
    'M 2 14 L 2 2',           // vertical
    'M 2 2 C 8 2 10 8 2 8',   // top loop
    'M 5 8 L 10 14',          // diagonal leg
  ],
  s: [
    'M 10 4 C 8 1 2 2 2 6 C 2 10 10 7 10 11 C 10 15 4 15 2 12', // s-curve
  ],
  t: [
    'M 6 14 L 6 2',           // stem
    'M 2 2 L 10 2',           // crossbar
  ],
  u: [
    'M 2 2 L 2 12 C 2 15 10 15 10 12 L 10 2', // u-curve
  ],
  v: [
    'M 2 2 L 6 14 L 10 2',    // valley
  ],
  w: [
    'M 1 2 L 3 14 L 6 8 L 9 14 L 11 2', // double-v
  ],
  x: [
    'M 2 2 L 10 14',          // diagonal 1
    'M 10 2 L 2 14',          // diagonal 2
  ],
  y: [
    'M 2 2 L 6 8 L 10 2',     // upper v
    'M 6 8 L 6 14',           // stem
  ],
  z: [
    'M 2 2 L 10 2 L 2 14 L 10 14', // zigzag
  ],
});

export const FALLBACK_STROKES = Object.freeze([
  'M 5.5 8 L 6.5 8',
]);
