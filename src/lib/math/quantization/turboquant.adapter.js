/**
 * TurboQuant WASM Adapter
 *
 * Provides a clean JavaScript interface to the high-performance
 * vector quantization kernel.
 */

import init, { quantize, estimate_inner_product, init_panic_hook } from './rust-kernel/pkg/turboquant_bridge.js';

let isInitialized = false;

export async function initializeTurboQuant() {
    if (isInitialized) return;
    
    // In a real environment, you would point to the wasm file
    // e.g., await init('/math/quantization/turboquant_bridge_bg.wasm');
    await init();
    init_panic_hook();
    isInitialized = true;
}

/**
 * Compresses a high-dimensional vector into a TurboQuant payload.
 * @param {Float32Array} vector - Original FP16/FP32 vector.
 * @param {number} seed - Randomization seed for RHT.
 * @returns {Promise<TQPayload>}
 */
export async function quantizeVector(vector, seed = 42) {
    if (!isInitialized) await initializeTurboQuant();
    
    // Validate dimension (FHT requires power of 2)
    const dim = vector.length;
    if ((dim & (dim - 1)) !== 0) {
        throw new Error(`TurboQuant Error: Vector dimension (${dim}) must be a power of 2.`);
    }

    return quantize(vector, seed);
}

/**
 * Estimates similarity between two compressed payloads.
 * @param {TQPayload} p1
 * @param {TQPayload} p2
 * @returns {number} Estimated inner product.
 */
export function similarity(p1, p2) {
    if (!isInitialized) {
        throw new Error('TurboQuant not initialized. Call initializeTurboQuant() first.');
    }
    return estimate_inner_product(p1, p2);
}

/**
 * Batch search helper.
 * @param {TQPayload} query
 * @param {TQPayload[]} corpus
 * @returns {Array<{ index: number, score: number }>}
 */
export function batchSearch(query, corpus) {
    return corpus.map((candidate, index) => ({
        index,
        score: similarity(query, candidate),
    })).sort((a, b) => b.score - a.score);
}
