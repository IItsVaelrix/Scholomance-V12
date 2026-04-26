# TurboQuant WASM Bridge (Phase 1)

This directory contains the high-performance Rust kernel for 2.5-bit vector quantization.
It is intended to be compiled to WebAssembly (WASM) for use in both the browser and the Node.js runtime.

## Directory Structure
- `rust-kernel/`: Rust source code and `Cargo.toml`.
- `turboquant.adapter.js`: JavaScript wrapper for the compiled WASM.

## How to Build
To build the WASM artifact, you need `rust` and `wasm-pack` installed.

1. Navigate to the kernel directory:
   ```bash
   cd src/lib/math/quantization/rust-kernel
   ```

2. Build for the web/bundler:
   ```bash
   wasm-pack build --target web
   ```

3. (Optional) Run tests:
   ```bash
   wasm-pack test --chrome --headless
   ```

## Why TurboQuant?
Standard FP16 embeddings for our lexicon are too large for the 64MB reranker budget.
TurboQuant reduces the footprint by ~6x with virtually zero accuracy loss, allowing us to perform deep semantic search directly in the Sovereign Editor.
