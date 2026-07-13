import { runVectorAmp, embedFloat, cosineSimilarity } from '../semantic/amp/runVectorAmp.js';
import { tokenize, IDF_MAX_KEY } from '../semantic/codeAwareVector.js';

/**
 * PROTEIN PROBE ENGINE
 *
 * Vectorizes bug hypotheses and scans a collection of files for structural
 * resonance. Vectorization flows through the Vector AMP, so the probe shares the
 * exact lens/seed used by the codebase index and search — one eye, one lens.
 */

/**
 * Vectorizes a natural language hypothesis into a search protein.
 *
 * @param {string} hypothesis
 * @returns {ReturnType<typeof runVectorAmp>} AMP result (signature + fidelity)
 */
export function vectorizeHypothesis(hypothesis, options = {}) {
  const idf = options.idf instanceof Map ? options.idf : undefined;
  // The hypothesis MUST be weighted by the same IDF corpus as the chunks it will be
  // compared against, or the two vectors live in different spaces.
  const cfg = { dimension: PROBE_DIMENSION, idf };
  // Keep the AMP call purely for its fidelity grade (the CLI prints it); the vector
  // the probe actually scores with is the FLOAT one.
  const amp = runVectorAmp(hypothesis, cfg);
  if (process.env.PROBE_DEBUG) {
    console.log(`[debug] searchProtein fidelity: ${amp.fidelity?.grade} (${amp.fidelity?.score})`);
  }
  // embedFloat returns { ok, vector, dim, norm } — take the Float32Array.
  return { ...amp, vector: embedFloat(hypothesis, cfg).vector };
}

/**
 * Scans a list of files for resonance with a search protein.
 * 
 * @param {Array<{path: string, content: string}>} files
 * @param {ReturnType<typeof runVectorAmp>} searchProtein - AMP result from vectorizeHypothesis
 * @param {object} options
 * @returns {Array<{path: string, resonance: number}>}
 */
/**
 * Build corpus inverse-document-frequency weights over the substrate.
 *
 * WITHOUT this, the probe has no discriminative power. A bag-of-tokens vector is
 * dominated by whatever is common — `data`, `result`, `options`, `path`, `error`
 * — so every source file resonates with every hypothesis. Measured before this
 * existed: the top band across 5,109 files spanned 69.7%-75.4%, under six points,
 * and a PySide6 Qt metatypes JSON out-ranked the file that literally contained the
 * queried tokens.
 *
 * IDF flips that: a token appearing in nearly every file contributes almost
 * nothing; a token appearing in three files is decisive.
 *
 * @param {Array<{path: string, content: string}>} files
 * @returns {Map<string, number>} token -> weight in (0, 1], plus IDF_MAX_KEY.
 */
/**
 * The probe scores with FLOAT cosine, not the 4-bit quantized signature.
 *
 * Quantization is right for the codebase INDEX (millions of stored vectors, where
 * size matters). It is wrong for the probe, which vectorizes on the fly and needs
 * every bit of discrimination it can get. Benchmarked against four known bugs with
 * known target files:
 *     4-bit quantized signature + IDF : mean rank 19.0
 *     float cosine (4096 dims) + IDF  : mean rank  7.8
 *
 * 256 hashed dimensions for ~18k distinct corpus tokens is also a brutal collision
 * rate — unrelated tokens land in the same bucket and manufacture phantom
 * similarity. 4096 measurably improves ranking.
 */
export const PROBE_DIMENSION = 4096;

export function buildIdfIndex(files) {
  const docFreq = new Map();
  const total = files.length || 1;

  for (const file of files) {
    // Count each token ONCE per file: document frequency, not term frequency.
    const seen = new Set(tokenize(file.content || ''));
    for (const token of seen) {
      docFreq.set(token, (docFreq.get(token) ?? 0) + 1);
    }
  }

  const idf = new Map();
  let max = 0;
  for (const [token, df] of docFreq) {
    // Standard smoothed IDF. A token in every file -> ~0. A token in one file -> high.
    const weight = Math.log(1 + total / (1 + df));
    idf.set(token, weight);
    if (weight > max) max = weight;
  }

  // Normalize to (0, 1] so IDF scales the existing weights rather than replacing them.
  if (max > 0) {
    for (const [token, weight] of idf) idf.set(token, weight / max);
  }
  // A token absent from the corpus is maximally rare, not weightless.
  idf.set(IDF_MAX_KEY, 1);

  return idf;
}

export function scanSubstrate(files, searchProtein, options = { minResonance: 0.7 }) {
  const heatmap = [];
  const idf = options.idf instanceof Map ? options.idf : undefined;
  const proteinVector = searchProtein.vector;
  if (!proteinVector) return heatmap;
  const cfg = { dimension: PROBE_DIMENSION, idf, center: true };

  for (const file of files) {
    const content = file.content;
    if (!content || content.length < 50) continue;

    // Chunking logic similar to adaptive scanner but optimized for probe
    const CHUNK_SIZE = 500;
    let maxResonance = 0;

    for (let i = 0; i < content.length; i += CHUNK_SIZE / 2) {
      const chunk = content.slice(i, i + CHUNK_SIZE);
      // Same lens/seed AND the same IDF corpus as the protein — a hypothesis
      // weighted by IDF may only be compared against chunks weighted the same way.
      const chunkVec = embedFloat(chunk, cfg).vector;
      if (!chunkVec) continue; // token-less chunk: no direction, no resonance
      const res = cosineSimilarity(chunkVec, proteinVector);
      if (res > maxResonance) maxResonance = res;
    }

    // Report the RAW cosine, clamped to [0,1].
    //
    // This used to be (cosine + 1) / 2, which mapped ORTHOGONAL — no similarity
    // whatsoever — onto a displayed 50%. That is why every file in the codebase
    // "resonated" at 68-75% and the heatmap looked like signal when it was noise.
    // A raw cosine of 0.45 now displays as 45%, and 0 means 0.
    const normalizedResonance = Math.max(0, Math.min(1, maxResonance));

    if (normalizedResonance >= options.minResonance) {
      heatmap.push({
        path: file.path,
        resonance: normalizedResonance
      });
    }
  }

  return heatmap.sort((a, b) => b.resonance - a.resonance);
}
