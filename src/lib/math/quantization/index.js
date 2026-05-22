/**
 * src/lib/math/quantization/index.js
 * 
 * Unified entry point for TurboQuant vector kernels.
 * Automatically switches between high-performance WASM (if available)
 * and pure JavaScript fallback.
 */

import * as jsKernel from './turboquant.js';

let wasmModule = null;
let useWasm = false;

/**
 * Initialize the TurboQuant engine.
 * Tries to load the WASM artifact. Falls back to JS if it fails.
 */
export async function initializeTurboQuant() {
    try {
        // Dynamic import to avoid breaking environments without WASM support
        const { default: init, ...wasm } = await import('./rust-kernel/pkg/turboquant_bridge.js');
        await init();
        wasmModule = wasm;
        useWasm = true;
        console.log('[TurboQuant] WASM Kernel initialized.');
    } catch (e) {
        console.warn('[TurboQuant] WASM failed to load. Falling back to JavaScript kernel.', e.message);
        useWasm = false;
    }
}

/**
 * Compresses a high-dimensional vector.
 */
export async function quantizeVector(vector, seed = 42) {
    if (useWasm && wasmModule) {
        // FHT requires power of 2
        const dim = vector.length;
        if ((dim & (dim - 1)) === 0) {
            return wasmModule.quantize(vector, seed);
        }
    }
    return jsKernel.quantizeVectorJS(vector, seed);
}

/**
 * Estimates similarity between two compressed payloads.
 */
export function similarity(p1, p2) {
    if (useWasm && wasmModule) {
        // TQPayload structures from WASM
        return wasmModule.estimate_inner_product(p1, p2);
    }
    
    // Fallback handles both raw buffers and norm properties
    return jsKernel.estimateInnerProduct(
        p1.data, 
        p2.data, 
        p1.norm ?? 1.0, 
        p2.norm ?? 1.0
    );
}

// Re-export constants and helpers
export const isWasmActive = () => useWasm;
