/**
 * Mock WebAssembly bridge for environments where the Rust kernel has not been compiled.
 * Enables successful compilation by Vite/Vitest and triggers graceful JavaScript fallback.
 */

export default async function init() {
    throw new Error("WASM not compiled. Rust toolchain (cargo, wasm-pack) is missing in this environment.");
}

export function quantize() {
    throw new Error("WASM not compiled.");
}

export function estimate_inner_product() {
    throw new Error("WASM not compiled.");
}

export function init_panic_hook() {
    // No-op
}
