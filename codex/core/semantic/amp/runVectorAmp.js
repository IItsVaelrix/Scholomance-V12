/**
 * VECTOR AMP — the single connection point for codebase/semantic vectorization.
 *
 * Mirrors the Animation AMP ↔ TurboQuant contract (self-describing signature,
 * delta-center normalization, config-driven safety policy, diagnostic emission)
 * but for text/code instead of motion curves. Search, the probe, and the indexer
 * all flow through this one runner so they share an identical lens, seed, and
 * fidelity grade — one eye, one lens, everywhere.
 *
 * Pipeline:  input → code-aware lens → delta-center → fidelity grade → TurboQuant
 *            → self-describing signature + policy + BytecodeHealth diagnostic.
 *
 * Deterministic: same (input, config) → same signature bytes + same checksum.
 */

import { generateCodeAwareVector } from '../codeAwareVector.js';
import { quantizeVectorJS, estimateInnerProduct } from '../../quantization/turboquant.js';
import { gradeQuantizationFidelity } from '../../quantization/fidelity.js';
import { encodeQuantizationFidelityHealth } from '../../diagnostic/BytecodeHealth.js';

export const VECTOR_AMP_DEFAULTS = Object.freeze({
  dimension: 256,
  seed: 1337,           // canonical seed — shared by indexer, search, probe
  center: true,         // delta-center normalization (kills common-mode bias)
  backend: 'js',
  lens: 'code-aware-v1',
  fidelityPolicy: 'warn', // 'off' | 'warn' | 'reject'
  minGrade: 'C',          // bar for "pass" (and reject threshold under 'reject')
});

export const VECTOR_AMP_ERRORS = Object.freeze({
  VECTOR_WIRING_FAILED: 'AMP-ERR-009',
  FIDELITY_REJECTED: 'AMP-ERR-011',
  DEGENERATE_INPUT: 'AMP-ERR-012',
});

const GRADE_RANK = Object.freeze({ A: 5, B: 4, C: 3, D: 2, F: 1 });

function deltaCenter(vec) {
  let mean = 0;
  for (let i = 0; i < vec.length; i += 1) mean += vec[i];
  mean /= vec.length || 1;
  const out = new Float32Array(vec.length);
  for (let i = 0; i < vec.length; i += 1) out[i] = vec[i] - mean;
  return out;
}

function meetsBar(grade, minGrade) {
  return (GRADE_RANK[grade] || 0) >= (GRADE_RANK[minGrade] || 0);
}

/**
 * Run the vector AMP on a piece of text/code.
 *
 * @param {string} input
 * @param {Partial<typeof VECTOR_AMP_DEFAULTS>} [config]
 * @returns {{
 *   ok: boolean,
 *   signature: { data: Uint8Array, norm: number, schema: object } | null,
 *   fidelity: { grade: string, score: number, dim: number, trustworthy: boolean } | null,
 *   policy: 'pass' | 'warn' | 'reject' | 'off' | 'error',
 *   health: object | null,
 *   diagnostics: string[],
 *   error: { code: string, message: string } | null,
 * }}
 */
export function runVectorAmp(input, config = {}) {
  const cfg = { ...VECTOR_AMP_DEFAULTS, ...config };
  const diagnostics = [];

  try {
    // 1. Vectorize through the validated code-aware lens.
    //    cfg.idf (OPTIONAL) scales token weights by corpus inverse-document-frequency.
    //    Without it this is a raw bag-of-tokens: `data`, `result`, `options` dominate,
    //    so every source file resonates with every query and similarity collapses into
    //    a narrow band with no discriminative power. Callers that pass no corpus (the
    //    g2p semantic juror, the codebase vector index) get the previous behaviour.
    let vec = generateCodeAwareVector(String(input ?? ''), cfg.dimension, { idf: cfg.idf });
    // 2. Delta-center normalization.
    if (cfg.center) vec = deltaCenter(vec);

    // Guard: check for zero/degenerate vector
    let sumSq = 0;
    for (let i = 0; i < vec.length; i += 1) {
      sumSq += vec[i] * vec[i];
    }
    const inputNorm = Math.sqrt(sumSq);
    if (inputNorm === 0) {
      const emptyData = new Uint8Array(0);
      return Object.freeze({
        ok: false,
        signature: Object.freeze({
          data: emptyData,
          norm: 0,
          schema: Object.freeze({
            dimension: cfg.dimension,
            seed: cfg.seed,
            bits: 4,
            centered: Boolean(cfg.center),
            backend: cfg.backend,
            lens: cfg.lens,
          }),
        }),
        fidelity: { grade: 'F', score: 0, dim: cfg.dimension, trustworthy: false },
        policy: 'reject',
        health: null,
        diagnostics: Object.freeze([`PB-WARN-v1-QUANT-FIDELITY-LOW-F-0`]),
        error: {
          code: VECTOR_AMP_ERRORS.DEGENERATE_INPUT,
          message: 'degenerate or zero-norm vector input',
        },
      });
    }
    // 3. Fidelity grade (the eye's self-awareness) on the vector we will compress.
    //    Skipped when the policy is 'off' (e.g. bulk indexing doesn't need it).
    const fidelity = cfg.fidelityPolicy === 'off'
      ? null
      : gradeQuantizationFidelity(vec, cfg.seed);
    // 4. TurboQuant compression.
    const { data, norm } = quantizeVectorJS(vec, cfg.seed);

    const signature = Object.freeze({
      data,
      norm,
      schema: Object.freeze({
        dimension: cfg.dimension,
        seed: cfg.seed,
        bits: 4,
        centered: Boolean(cfg.center),
        backend: cfg.backend,
        lens: cfg.lens,
      }),
    });

    // 5. Policy + diagnostic emission — the eye flowing through the channel.
    let policy = 'off';
    let health = null;
    if (cfg.fidelityPolicy !== 'off') {
      if (meetsBar(fidelity.grade, cfg.minGrade)) {
        policy = 'pass';
        health = encodeQuantizationFidelityHealth(fidelity, {
          moduleId: cfg.lens,
          context: { centered: Boolean(cfg.center), bits: 4 },
        });
        diagnostics.push(health.bytecode);
      } else {
        diagnostics.push(`PB-WARN-v1-QUANT-FIDELITY-LOW-${fidelity.grade}-${fidelity.score}`);
        if (cfg.fidelityPolicy === 'reject') {
          return Object.freeze({
            ok: false,
            signature,
            fidelity,
            policy: 'reject',
            health: null,
            diagnostics: Object.freeze(diagnostics),
            error: {
              code: VECTOR_AMP_ERRORS.FIDELITY_REJECTED,
              message: `fidelity ${fidelity.grade} below min ${cfg.minGrade}`,
            },
          });
        }
        policy = 'warn';
      }
    }

    return Object.freeze({
      ok: true,
      signature,
      fidelity,
      policy,
      health,
      diagnostics: Object.freeze(diagnostics),
      error: null,
    });
  } catch (e) {
    return Object.freeze({
      ok: false,
      signature: null,
      fidelity: null,
      policy: 'error',
      health: null,
      diagnostics: Object.freeze([`${VECTOR_AMP_ERRORS.VECTOR_WIRING_FAILED}:${e.message}`]),
      error: { code: VECTOR_AMP_ERRORS.VECTOR_WIRING_FAILED, message: e.message },
    });
  }
}

/**
 * Score resonance between two AMP signatures (-1..1). The single comparison
 * primitive for search and the probe. TurboQuant reconstructs quantized
 * magnitudes internally, so callers pass unit weights for the comparison.
 *
 * @param {{data: Uint8Array}} a
 * @param {{data: Uint8Array}} b
 * @returns {number}
 */
export function compareSignatures(a, b) {
  if (!a?.data || !b?.data) return 0;
  if (a.data.length === 0 || b.data.length === 0) return 0;
  if (a.data.length !== b.data.length) return 0;
  // Ghost rejection: a constant byte pattern is the fingerprint of a zero/
  // degenerate vector (a token-less chunk compresses to all-identical codes).
  // It carries no direction, so it must score zero resonance — never out-rank
  // real content. Defends against legacy ghost rows already in the index.
  if (isConstantSignature(a.data) || isConstantSignature(b.data)) return 0;
  return estimateInnerProduct(a.data, b.data, 1, 1);
}

function isConstantSignature(data) {
  const first = data[0];
  for (let i = 1; i < data.length; i += 1) {
    if (data[i] !== first) return false;
  }
  return true;
}

/**
 * Full-precision embedding for exact-cosine search. Same lens, seed-independent
 * (no quantization rotation needed — cosine is rotation-invariant anyway), so
 * search/index/probe share one direction in float space. Returns a unit vector;
 * a token-less / zero-norm input is honestly "not ok" (no direction).
 *
 * @param {string} input
 * @param {Partial<typeof VECTOR_AMP_DEFAULTS>} [config]
 * @returns {{ ok: boolean, vector: Float32Array | null, dim: number, norm: number }}
 */
export function embedFloat(input, config = {}) {
  const cfg = { ...VECTOR_AMP_DEFAULTS, ...config };
  // cfg.idf (optional) — see runVectorAmp. Callers without a corpus are unaffected.
  let vec = generateCodeAwareVector(String(input ?? ''), cfg.dimension, { idf: cfg.idf });
  if (cfg.center) vec = deltaCenter(vec);

  let sumSq = 0;
  for (let i = 0; i < vec.length; i += 1) sumSq += vec[i] * vec[i];
  const norm = Math.sqrt(sumSq);
  if (norm === 0) {
    return { ok: false, vector: null, dim: cfg.dimension, norm: 0 };
  }
  const unit = new Float32Array(vec.length);
  for (let i = 0; i < vec.length; i += 1) unit[i] = vec[i] / norm;
  return { ok: true, vector: unit, dim: cfg.dimension, norm };
}

/**
 * Exact cosine similarity between two equal-length vectors (-1..1).
 * Normalizes internally, so callers may pass unit or raw vectors.
 *
 * @param {Float32Array | number[]} a
 * @param {Float32Array | number[]} b
 * @returns {number}
 */
export function cosineSimilarity(a, b) {
  if (!a || !b || a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  if (denom === 0) return 0;
  return Math.max(-1, Math.min(1, dot / denom));
}
