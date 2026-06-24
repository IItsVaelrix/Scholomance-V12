/**
 * Turbovec — bespoke domain-adapted vectorizer (built by build_turbovec.py).
 *
 * Same interface as embeddings.js, but text → vector now:
 *   - weights each token by domain SALIENCE (IDF-damped boilerplate, boosted
 *     nichepack power-words), so shared filler stops dominating the mean-pool;
 *   - resolves OOV tokens (artist names, slang) via synthesized vectors instead
 *     of dropping them.
 *
 * Falls back to the plain GloVe base where it has nothing better. If the GloVe
 * base or the Turbovec model is missing, `loaded` is false and the caller drops
 * down to the next embedder.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as glove from './embeddings.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EMB_DIR = path.join(HERE, 'embeddings');

export const EMBEDDER_ID = 'turbovec1';
export const cosine = glove.cosine;

const nextPow2 = (n) => { let p = 1; while (p < n) p <<= 1; return p; };

let DIMS = 0;
let OUT_DIMS = 0;
let salience = Object.create(null);
let defaultSalience = 1.0;
let oovVocab = new Map();   // word -> row index
let oovMatrix = null;       // Float32Array, count * DIMS
export let loaded = false;

try {
    if (!glove.loaded) throw new Error('glove base not loaded');
    const meta = JSON.parse(fs.readFileSync(path.join(EMB_DIR, `${EMBEDDER_ID}.meta.json`), 'utf8'));
    DIMS = meta.dims;
    OUT_DIMS = nextPow2(DIMS);
    defaultSalience = meta.default_salience ?? 1.0;

    salience = JSON.parse(fs.readFileSync(path.join(EMB_DIR, `${EMBEDDER_ID}.salience.json`), 'utf8'));

    const words = fs.readFileSync(path.join(EMB_DIR, `${EMBEDDER_ID}.oov.vocab`), 'utf8').split('\n');
    for (let i = 0; i < words.length; i++) if (words[i]) oovVocab.set(words[i], i);
    const buf = fs.readFileSync(path.join(EMB_DIR, `${EMBEDDER_ID}.oov.f32`));
    oovMatrix = buf.byteLength ? new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4) : new Float32Array(0);

    loaded = true;
} catch (e) {
    process.stderr.write(`turbovec: model unavailable (${e.message}); using base embedder.\n`);
}

export const DIMENSIONS = OUT_DIMS;

/** Raw (DIMS-length) vector for a word: GloVe base, else synthesized OOV, else null. */
export function wordVector(word) {
    const base = glove.wordVector(word);
    if (base) return base;
    const row = oovVocab.get(word);
    if (row === undefined) return null;
    return oovMatrix.subarray(row * DIMS, row * DIMS + DIMS);
}

function salienceOf(word) {
    const s = salience[word];
    return s === undefined ? defaultSalience : s;
}

/**
 * Salience-weighted mean-pool over in-vocab + OOV tokens, padded to a power of 2.
 * @param {string} text
 * @returns {Float32Array}
 */
export function vectorize(text) {
    const vec = new Float32Array(OUT_DIMS);
    if (!loaded) return vec;

    const tokens = text.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/);
    let wsum = 0;
    for (const tok of tokens) {
        if (!tok) continue;
        const v = wordVector(tok);
        if (!v) continue;
        const s = salienceOf(tok);
        for (let d = 0; d < DIMS; d++) vec[d] += s * v[d];
        wsum += s;
    }
    if (wsum > 0) {
        for (let d = 0; d < DIMS; d++) vec[d] /= wsum;
    }
    return vec;
}
