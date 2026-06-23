/**
 * Static word-embedding vectorizer for TurboQuant.
 *
 * Loads a compact packed GloVe matrix (embeddings/glove50.*) once at startup
 * and turns text into a dense semantic vector by mean-pooling the vectors of
 * its in-vocabulary tokens. Zero runtime dependencies, deterministic, offline,
 * sub-millisecond — unlike the hashing trick, synonyms actually cluster
 * ("speedrun" ≈ "fastest run").
 *
 * Exposes the SAME shape the plugin expects: vectorize(text) -> Float32Array.
 * Falls back gracefully (loaded === false) if the pack is missing, so callers
 * can drop back to the hashing vectorizer.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EMB_DIR = path.join(HERE, 'embeddings');

export const EMBEDDER_ID = 'glove50';

const nextPow2 = (n) => { let p = 1; while (p < n) p <<= 1; return p; };

let DIMS = 0;            // raw embedding dim (matrix columns), e.g. 50
let OUT_DIMS = 0;        // padded output dim, a power of 2 (FHT requirement)
let vocab = new Map();   // word -> row index
let matrix = null;       // Float32Array, count * DIMS, row-major
export let loaded = false;

try {
    const meta = JSON.parse(fs.readFileSync(path.join(EMB_DIR, `${EMBEDDER_ID}.meta.json`), 'utf8'));
    DIMS = meta.dims;
    OUT_DIMS = nextPow2(DIMS);

    const words = fs.readFileSync(path.join(EMB_DIR, `${EMBEDDER_ID}.vocab`), 'utf8').split('\n');
    for (let i = 0; i < words.length; i++) vocab.set(words[i], i);

    const buf = fs.readFileSync(path.join(EMB_DIR, `${EMBEDDER_ID}.f32`));
    // Use a copied, aligned ArrayBuffer slice so Float32Array construction is safe.
    matrix = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
    loaded = true;
} catch (e) {
    process.stderr.write(`embeddings: pack unavailable (${e.message}); falling back to hashing.\n`);
}

// Quantization's Fast Hadamard Transform requires a power-of-2 length, so the
// public vector dimension is the padded size; the tail dims stay zero.
export const DIMENSIONS = OUT_DIMS;

/**
 * Mean-pool the embeddings of in-vocabulary tokens into a power-of-2-length
 * vector (zero-padded tail). Returns a zero vector (honest zero) when no
 * token is known.
 * @param {string} text
 * @returns {Float32Array}
 */
export function vectorize(text) {
    const vec = new Float32Array(OUT_DIMS);
    if (!loaded) return vec;

    const tokens = text.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/);
    let hits = 0;
    for (const tok of tokens) {
        if (!tok) continue;
        const row = vocab.get(tok);
        if (row === undefined) continue;
        const base = row * DIMS;
        for (let d = 0; d < DIMS; d++) vec[d] += matrix[base + d];
        hits++;
    }
    if (hits > 0) {
        for (let d = 0; d < DIMS; d++) vec[d] /= hits;
    }
    return vec;
}

/**
 * Raw embedding for a single word, or null if out-of-vocabulary.
 * @param {string} word
 * @returns {Float32Array | null}
 */
export function wordVector(word) {
    if (!loaded) return null;
    const row = vocab.get(word);
    if (row === undefined) return null;
    return matrix.subarray(row * DIMS, row * DIMS + DIMS);
}

/** Cosine similarity between two equal-length vectors. */
export function cosine(a, b) {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb);
    return denom > 0 ? dot / denom : 0;
}

/**
 * Tokens present AND absent in the embedding vocabulary — used by gap analysis
 * to map vectors back to human-readable concepts without a separate taxonomy.
 * @param {string} text
 * @returns {{known: string[], unknown: string[]}}
 */
export function tokensFor(text) {
    const known = [];
    const unknown = [];
    const tokens = text.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/);
    for (const tok of tokens) {
        if (!tok) continue;
        (vocab.has(tok) ? known : unknown).push(tok);
    }
    return { known, unknown };
}
