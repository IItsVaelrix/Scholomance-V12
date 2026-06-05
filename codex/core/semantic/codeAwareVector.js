/**
 * CODE-AWARE VECTOR LENS (prototype)
 *
 * Replaces the character/n-gram phonosemantic hash with a token bag-of-features:
 * it tokenizes identifiers (camelCase / snake_case split), lightly stems them,
 * downweights ultra-common keywords (a poor-man's IDF), and writes each token
 * into the vector via SIGNED feature hashing.
 *
 * Why this fixes what phonosemantic couldn't:
 *   - Tokens carry meaning; unrelated code shares zero meaningful tokens, so it
 *     no longer wins on incidental character-bigram overlap.
 *   - Signed hashing keeps the common-mode component near zero → angular
 *     separation survives, no inflated baseline similarity.
 *   - The vector is sparse (few non-zero dims) → energy is concentrated →
 *     TurboQuant 4-bit preserves direction far better (higher fidelity grade).
 *
 * Deterministic: same text → same vector. No clocks, no randomness.
 */

// Ultra-common tokens carry little discriminative signal (poor-man's IDF).
const STOPWORDS = new Set([
  // English glue
  'the', 'a', 'an', 'in', 'of', 'to', 'is', 'it', 'and', 'or', 'for', 'with',
  'without', 'uses', 'use', 'on', 'at', 'by', 'as', 'value', 'missing', 'logic',
  'this', 'that', 'from', 'into', 'out',
  // JS/TS structural keywords
  'function', 'const', 'let', 'var', 'return', 'import', 'export', 'class',
  'if', 'else', 'async', 'await', 'new', 'try', 'catch', 'throw', 'default',
  'type', 'interface', 'public', 'private', 'static',
]);

function tokenize(text) {
  return String(text || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')        // camelCase boundary
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')      // ACRONYMWord boundary
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !/^\d+$/.test(t));
}

// Light stemmer: strip a leading "un" and common inflectional suffixes so
// "unseeded" → "seed", letting it match code that uses `seed`.
function stem(token) {
  let s = token;
  if (s.length > 4 && s.startsWith('un')) s = s.slice(2);
  s = s.replace(/(ing|ed|es|s)$/, '');
  return s.length >= 2 ? s : token;
}

function hash32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function addFeature(vec, dim, token, weight) {
  const idx = hash32(token) % dim;
  const sign = (hash32(`${token}#sign`) & 1) ? 1 : -1; // signed hashing
  vec[idx] += weight * sign;
}

/**
 * @param {string} text
 * @param {number} dim
 * @returns {Float32Array}
 */
export function generateCodeAwareVector(text, dim = 256) {
  const vec = new Float32Array(dim);
  for (const token of tokenize(text)) {
    const weight = STOPWORDS.has(token) ? 0.15 : 1.0;
    addFeature(vec, dim, token, weight);
    const root = stem(token);
    if (root !== token) addFeature(vec, dim, root, weight * 0.7);
  }
  return vec;
}
