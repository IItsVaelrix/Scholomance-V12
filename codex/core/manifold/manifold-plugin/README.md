# manifold-plugin

Native **VST3 + CLAP** plugin for Cochlear Manifold — a thin
[nih-plug](https://github.com/robbert-vdh/nih-plug) wrapper over
`manifold-core`. The crate ships a full [vizia](https://github.com/vizia/vizia)
editor behind a default-on `gui` cargo feature: Simple and Advanced modes,
preset chips with full bytecode hot-swap, a momentary Panic control, and
accessibility toggles (high-contrast, motion-off). The lean
`--no-default-features --features vst3` build path stays GUI/X11-free for
headless validation. All DSP, the bytecode VM, and the safety governor live in
`manifold-core`; this crate bridges the host audio/params/UI to the engine.

Standalone crate (excluded from the `manifold-core`/`manifold-wasm` workspace)
so nih-plug's heavier dependency tree never gates the core/wasm builds. Depends
on `manifold-core` by path.

## Parameters (host-automatable)
Wet/Dry, Manifold Size, Reactivity, Stability, Freeze, Panic. All 5 factory
presets (`void-glass`, `ice-circuit`, `cathedral-of-teeth`, `substrate-maw`,
`ash-lung`) are embedded; `void-glass` loads by default in `initialize()`, so
the plugin produces sound immediately.

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

## GUI Verification (requires a display — headless renders are unreliable)

The plugin includes a full vizia editor accessible when compiled with `--features gui`. To verify visual appearance and color spec parity:

1. **Build & bundle:**
   ```bash
   cargo build --release --features gui
   ```
   then bundle per the "Bundle (Linux)" section above into `bundle/CochlearManifold.clap`.

2. **Load in a CLAP host with a screen** (e.g. Bitwig Studio, clap-host, REAPER, or Carla with a display) and open the editor.

3. **Test cases to capture:**
   - Default state (Simple mode)
   - Each of the 5 presets selected (void-glass, ice-circuit, cathedral-of-teeth, substrate-maw, ash-lung)
   - Advanced mode
   - High-contrast toggle ON
   - Motion-off toggle ON

4. **Verify color spec §2 parity:**
   - Shell/brand magenta: `hsl(340, 85%, 51%)`
   - Freeze tile indigo: `hsl(239, 82%, 53%)`
   - Panic button red-orange: `hsl(12, 85%, 51%)`
   - Preset chip borders (source of truth: `src/editor/tokens.rs::preset_hue`):
     - void-glass/ash-lung: red (Hsl { h: 0.0, s: 85.0, l: 48.0 })
     - ice-circuit: chartreuse (Hsl { h: 90.0, s: 83.0, l: 58.0 })
     - cathedral-of-teeth: violet (Hsl { h: 290.0, s: 88.0, l: 54.0 })
     - substrate-maw: amber (Hsl { h: 23.0, s: 88.0, l: 58.0 })
   - Reactivity meter/knob: green (Hsl { h: 145.0, s: 80.0, l: 47.0 })

## Test Suite

- **With GUI** (`cargo test --features gui`): 22 tests pass
  - Tokens (3), Presets (6), Meter (4), State (3), Theme (1), Preset Chip (3), Editor Helpers (2)
- **Non-GUI** (`cargo test --no-default-features --features vst3`): 10 tests pass
  - Meter (4), Presets (6)
