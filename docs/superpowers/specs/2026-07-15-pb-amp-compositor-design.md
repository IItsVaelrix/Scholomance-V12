# PB-AMP Compositor — Animation Pipeline Scaffold

**Date:** 2026-07-15
**Status:** Design approved, pending spec review
**Guinea pig surface:** `src/pages/Listen` (the most animation-intensive page)
**Owner:** Damien

---

## 1. Problem & Evidence

The Listen page stutters on the Steam Deck. This was diagnosed by measurement, not inspection:

- **Headless Chromium** (software raster, no real GPU compositing): a flawless 16.7 ms / 60 fps median over 700+ frames.
- **Headed, real GPU:** 30–38 % of frames exceed 20 ms (p95 ≈ 26 ms, p99 ≈ 40 ms).
- During those slow frames the **main thread is idle** — Long Animation Frame attribution put every long task at *startup* (Phaser init, worker init, React mount); `styleAndLayout` ≈ 0 ms in steady state.

**Conclusion: the stutter is GPU fill-rate / compositing bound**, not JS. The page rasterizes many large translucent / blurred / blended layers every frame (`backdrop-filter` sidebars, `mix-blend-mode` FFT mandala, SVG `drop-shadow` filters, a 3-layer aurora at 4× viewport, a full-screen Phaser glow PostFX) over a continuously-animating 1600 px canvas. The APU runs out of fill-rate.

Per-layer CSS ablation (interleaved, thermal-noise-controlled) confirmed no single layer dominates — it is **death by a thousand composited layers**. One class of waste was confirmed and is being fixed independently: layers hidden with `opacity: 0` (e.g. `.alchemical-lab-static-bg`) keep animating and compositing behind the opaque canvas.

**Therefore the fix must reduce the number of composited layers, not merely move computation.** Centralizing timing alone does nothing for fill-rate.

## 2. Goal

Build a **reusable animation pipeline scaffold** that renders rich, deterministic, formula-driven animation as **one GPU pass per surface**, and prove it on Listen by deleting Listen's DOM effect stack and measuring the stutter away. Once proven, the same scaffold is adopted by other pages.

This is also the vehicle to **stabilize the existing AnimationAMP pipeline**, which worked once and rotted as intents were bolted on without guardrails.

### Guiding principle (Damien's framing)
> Bake the static structure once; animate by evaluating formulas — not by re-compositing layers. *We calculate, we don't fill.*

The honest caveat baked into the design: a fullscreen fragment shader still touches every pixel every frame, so smoothness requires discipline — (a) bake everything static, (b) minimize overdraw (no stacked fullscreen passes), (c) keep per-pixel formulas cheap.

## 3. What already exists (we assemble, not reinvent)

PixelBrain already provides both halves of the model:

| Piece | File | Role |
|---|---|---|
| Shader packet contract | `codex/core/pixelbrain/shader-packet.js` | Frozen `PB-SHADER-v1`: GLSL `fragmentSource`, `uniforms`, `sdfDescriptors`, `noiseDescriptors`, `glsl-es-300` |
| Uniform resolver | `codex/core/pixelbrain/shader-uniform-resolver.js` (+ `shader-uniform-registry.js`) | Resolves canonical uniforms (`u_time ← clock.elapsedSeconds`, `u_resonance ← verse.resonance`, `u_school`, palettes) declaratively from game state |
| Shader generator | `codex/core/pixelbrain/item-effect-shader.js` | Emits deterministic, `u_time`-animated packets |
| WebGL2 runner | `src/lib/pixelbrain/shader-webgl-preview.js` | Compiles `pbMain(uv, time, resonance)`, fullscreen quad, uniform bind, frame draw |
| Deterministic clock/formulas | `src/lib/ambient/bytecodeAMP.js` | Pure `time → value` (`getBytecodeAMP`, `getRotationAtTime`) — already used synchronously by the Phaser scene |
| Static baker | `codex/core/pixelbrain/scene-graph-renderer.js` | Deterministic CPU rasterizer — "formula → render, framebuffer is derived state" |

## 4. Architecture — Render Tiers (the layering law)

Every surface using the scaffold has three strictly-separated tiers:

- **Tier A — PB-SHADER compositor** (WebGL2 canvas): all atmosphere/decoration as **one fullscreen fragment pass**, driven by uniforms. Replaces the DOM effect stack.
- **Tier B — Phaser** (interaction-only): hit zones + genuinely interactive visuals. Stripped of decorative clear→redraw and the glow PostFX.
- **Tier C — DOM**: text, HUD controls (EQ, sliders, transport), a11y. Static or cheap transitions only — **no per-frame `backdrop-filter` / `blur` / `mix-blend` over animating content** (enforced by guardrail §8).

## 5. The reusable unit — `<PBShaderStage>`

A single React component, built on `shader-webgl-preview.js`:

```
<PBShaderStage
  packet={PBShaderPacket}          // PB-SHADER-v1
  uniformSources={{ ... }}         // maps uniform → state path (clock, verse, palette)
  clock={sharedClock}              // one deterministic clock instance
  reducedMotion={boolean}
/>
```

**Responsibilities (single purpose: run one shader packet as a stage):**
- Mount a WebGL2 canvas; compile + link the packet's fragment source once.
- Per frame: resolve uniforms from `clock` + state via the resolver; bind; draw one quad. No React re-render on the hot path.
- Lifecycle: **context-loss/restore**, **resize** (DPR-aware), **visibility-pause** (stop RAF when tab/element hidden), **reduced-motion** (freeze `u_time` at a constant), **teardown** (delete program/buffers, release context).

**Reuse contract:** a page adopts the scaffold by mounting `<PBShaderStage>` with a packet + uniform-source map. Nothing else.

**Interfaces / dependencies:**
- *Depends on:* `shader-webgl-preview.js` (GL ops), `shader-uniform-resolver.js` (uniform values), a shared clock, `bytecodeAMP` (formula channels).
- *Does not depend on:* React state updates per frame, the async intent layer, Phaser.

## 6. Animation authority (this is "stabilize AMP")

- **One deterministic clock** produces `elapsedSeconds → u_time`. `bytecodeAMP` formulas + verse/school state feed `u_resonance`, `u_school`, `u_vowel_density`, palettes through the resolver's declarative source paths. **Synchronous, per-frame, zero React re-render, zero worker round-trip** on the hot path.
- **The async intent layer (`useAnimationIntent` / `submitAmpIntent`) is demoted to discrete events only** — school change, play/pause, ignition. It swaps *which* packet / which params are active; it never runs per-frame.
- **Root-cause fix for the rot:** `useAnimationIntent` currently lists `motion` in its effect deps *and* calls `setMotion` inside → a re-render loop (same class as the repo's Lexical transform loop). Fix: remove `motion` from deps, read prior value via ref, and gate on a stable intent hash. The instability came from wiring this async/React layer to animation-frequency state (e.g. `signalLevel` at ~60 fps); the demotion to discrete events removes that entirely.

## 7. Baking

Static structure (portal skeleton, rings, stone wall, radar chrome) is rasterized **once** via the PixelBrain scene-graph renderer into a texture (or baked as GLSL constants in the fragment). Nothing static is recomputed per frame. This replaces the current Phaser scene's per-frame `graphics.clear()` + vector redraw.

## 8. Guardrails — so it cannot silently re-rot

The missing rigor from last time. Committed as tests / CI checks:

1. **Headed perf gate** — Playwright on a real GPU asserts `frames>20ms` below a threshold on Listen (harness already prototyped: `.perf-*.mjs`). Runs on a cooled machine / dedicated runner to avoid thermal noise.
2. **Determinism** — same packet + fixed `u_time` → identical framebuffer hash (readback). Extends PixelBrain's existing scene-graph determinism guarantee to the shader path.
3. **No-per-frame-React** — a render-count assertion proving `<PBShaderStage>` does not re-render React each frame.
4. **Layer-budget check** — a DOM-inventory assertion (harness already prototyped: `.dom-inventory.mjs`) that no animated `backdrop-filter` / `mix-blend` / large filtered layer sits over the animating canvas.

## 9. Listen migration (this spec only)

Concrete changes to the guinea-pig surface:
- Remove Listen's DOM effect stack: `aurora-background` (on this page), `alchemical-lab-static-bg` portal, `signal-chamber-fft` mandala.
- Strip the Phaser scene's decorative clear→redraw and the full-screen glow PostFX; keep only radar/orb interaction.
- Render atmosphere/portal/mandala as PB-SHADER stages via `<PBShaderStage>`.
- Keep EQ / sliders / transport as DOM (Tier C).
- **Success = the §8 headed perf gate passes on Listen** (stutter frames below threshold) with visual fidelity preserved.

## 10. Scope / YAGNI

- **No OffscreenCanvas / worker rendering yet.** The main thread is measured idle; main-thread WebGL2 draw calls are cheap. Workers were part of the past instability — deferred until proven necessary.
- **No other-page migration in this spec.** Only the scaffold (`<PBShaderStage>` + authority + guardrails) and the Listen migration. Rollout to other pages is follow-on work, one surface at a time.
- **No new shader-authoring UI.** Packets are authored in code / existing PixelBrain forge tools.

## 11. Interim fixes already in the tree (fold into the plan's housekeeping)

Keep: `.alchemical-lab-static-bg` unmount-after-load, redundant Phaser play-button + volume-slider removal, ParaEQ (`ScholoCandy`) enablement, `SpectrumCanvas` RAF single-setup fix, snug right-sidebar layout.
Revisit / likely superseded by Tier A: the CSS "bake" tweaks (sigil-rotor `will-change`, schematics filter removal, pentagram opacity-only flicker).
Remove: temp probes `.perf-*.mjs`, `.dom-*.mjs`, and the `window.__perfNoGlow` scene flag.

## 12. Open questions (resolved during brainstorming)

- Substrate: **standalone PB WebGL layer** (not Phaser PostFX pipeline). ✔
- Worker: **deferred**. ✔
- Guardrails: **the four in §8 are sufficient**. ✔
- Name: **`<PBShaderStage>` / "PB-AMP Compositor"**. ✔
