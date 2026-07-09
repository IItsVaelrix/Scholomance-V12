# manifold-plugin

Native **VST3 + CLAP** plugin for Cochlear Manifold — a thin
[nih-plug](https://github.com/robbert-vdh/nih-plug) wrapper over
`manifold-core`. No editor GUI this pass (host-automatable params only). All
DSP, the bytecode VM, and the safety governor live in `manifold-core`; this
crate only bridges the host audio/params to the engine.

Standalone crate (excluded from the `manifold-core`/`manifold-wasm` workspace)
so nih-plug's heavier dependency tree never gates the core/wasm builds. Depends
on `manifold-core` by path.

## Parameters (host-automatable)
Wet/Dry, Manifold Size, Reactivity, Stability, Freeze, Panic. One factory
preset (`void-glass`) is embedded and loaded in `initialize()`, so the plugin
produces sound immediately.

## Build

```bash
cargo build --release          # produces target/release/libmanifold_plugin.so
```

Exported entry points: `clap_entry` (CLAP) and `GetPluginFactory` /
`ModuleEntry` / `ModuleExit` (VST3).

## Bundle (Linux)

On Linux a `.clap` is the cdylib renamed, and a `.vst3` is a bundle directory:

```bash
SO=target/release/libmanifold_plugin.so
mkdir -p bundle/CochlearManifold.vst3/Contents/x86_64-linux
cp "$SO" bundle/CochlearManifold.clap
cp "$SO" bundle/CochlearManifold.vst3/Contents/x86_64-linux/CochlearManifold.so
```

For the canonical, cross-platform bundler, integrate nih-plug's
`cargo xtask bundle manifold-plugin --release` (requires an `xtask` crate in a
shared workspace).

## Verification (done on this machine)

- `cargo build --release` → clean (nih-plug, vst3-sys, clap-sys are pure Rust;
  no C toolchain needed).
- Exported symbols confirmed via `nm -D` (CLAP + VST3 entry points present).
- **`clap-validator validate` → 21 tests, 16 passed, 0 failed, 5 skipped**
  (skips are note-port tests, N/A for an audio effect). This loads the plugin
  in-host, runs `initialize()` (embedded-bytecode `load_program`) and audio
  processing, and checks state reproducibility + parameter automation.

Not verifiable here: loading in an actual DAW (none installed). The
clap-validator host pass is the closest available evidence.
