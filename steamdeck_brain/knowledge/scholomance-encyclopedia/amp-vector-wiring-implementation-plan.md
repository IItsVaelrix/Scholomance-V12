# Plan: Animation AMP ↔ TurboQuant Vector Wiring

Establish a high-performance, deterministic isomorphic bridge between the **Animation AMP** motion orchestration layer and the **TurboQuant** vector quantization engine. By mapping continuous animation curves to compact, data-oblivious quantized vector signatures, we enable ultra-fast, local-first motion search, config-driven safety policies, aesthetic similarity matching, and frame-rate optimization within a zero-cost, memory-capped architecture.

---

## User Review Required

> [!IMPORTANT]
> **Isomorphic Vectorization:** Trajectory vectorization samples continuous animation profiles (translates, scale, opacity) into discrete high-dimensional vectors (e.g., 64 time-steps, 256-dimensions). We default to 256 dimensions, mapping to the 256-dimension limit supported by the TurboQuant Fast Hadamard Transform (FHT) kernel.

> [!WARNING]
> **Vector Parity & Naming:** To avoid ahead-of-time WASM assumptions, the system is explicitly designated **Vector Wiring**. The synchronous isomorphic JS quantization kernel (`quantizeVectorJS`) acts as the canonical production runtime, with WASM/JS parity as a fully compatible supported target.

---

## Proposed Architecture

```text
  [ Animation Intent ]
          │
          ▼
  [ Animation AMP ] ──▶ [ Microprocessor Pipeline ]
          │
          ▼ (Resolved values)
  [ Motion Vectorizer ] ──▶ [ 256-D Float32 Trajectory Vector ]
                                      │
                                      ▼
                      [ TurboQuant Isomorphic JS/WASM Kernel ]
                                      │
            ┌─────────────────────────┴─────────────────────────┐
            ▼                                                   ▼
[ Quantize to 2.5-bit / 4-bit QMS ]             [ Similarity / Reranking Gate ]
            │                                                   │
            ▼                                                   ▼
[ Embedded in ResolvedMotionOutput ]            [ Motion Combo / Deduplication ]
```

---

## Proposed Changes

### Animation Core

#### [MODIFY] [animation.types.ts](file:///home/deck/Desktop/Scholomance-V12-main/codex/core/animation/contracts/animation.types.ts)
- Extend `ResolvedMotionOutput` to include:
  - `quantizedSignature?: { data: string; norm: number; dimension: number; sampleCount: number; channels: readonly ['translateX', 'translateY', 'scale', 'opacity']; backend: 'js' | 'wasm' }`: Self-describing quantized signature structure representing the animation path.
  - `vectorSimilarity?: number`: Diagnostic similarity score when matched against active presets or baseline signatures.
  - `nearestMotionArchetype?: string`: The matched golden curve ID.
- Update `AnimationAmpConfig` to include:
  - `vectorBackend?: 'js' | 'wasm' | 'auto'`: The execution runtime backend, defaulting to `'js'`.
  - `enableVectorQuantization: boolean`: Flag to enable vector quantization.
  - `vectorDimension: number`: Dimensionality of sampled motion vectors (default: 256).
  - `motionSafetyMode?: 'off' | 'warn-only' | 'dampen-soft' | 'dampen-hard' | 'reject'`: Safety policies for aesthetic deviations.

#### [MODIFY] [animation.schemas.ts](file:///home/deck/Desktop/Scholomance-V12-main/codex/core/animation/contracts/animation.schemas.ts)
- Add validation schemas for `quantizedSignature` (fully validating self-describing fields) and safety mode fields using Zod.
- Ensure validation does not fail if fields are omitted (backward compatibility).

#### [NEW] [motionVectorizer.ts](file:///home/deck/Desktop/Scholomance-V12-main/codex/core/animation/amp/motionVectorizer.ts)
- Implement a utility to translate a continuous `ResolvedMotionOutput` curve into a sampled static 256-dimensional Float32 array representing `[translateX, translateY, scale, opacity]` over 64 uniform time-slices $t \in [0, 1]$.
- Zero-out starting static baselines by subtracting `startScale = 1.0` and `startOpacity = 1.0` (delta-centering) to eliminate massive positive similarity bias.
- Normalize translations via `/ 1000.0` and scale via `/ 4.0` to keep component impact balanced.

#### [MODIFY] [fuseMotionOutput.ts](file:///home/deck/Desktop/Scholomance-V12-main/codex/core/animation/amp/fuseMotionOutput.ts)
- Integrate `motionVectorizer` into the final fusion stage.
- Import `quantizeVectorJS` from `codex/core/quantization/turboquant.js`.
- Convert the resulting payload into hexadecimal string representation.
- Handle exceptions gracefully by recording `PB-ERR-v1-STATE-WARN-VECTOR-0204: Fallback triggered`.

#### [NEW] [TurboQuantMotionProcessor.ts](file:///home/deck/Desktop/Scholomance-V12-main/codex/core/animation/processors/vector/TurboQuantMotionProcessor.ts)
- Finalize-stage microprocessor that computes the structural similarity of the active working motion state against a registry of "golden curves" (`fade-standard`, `slide-smooth`, `bounce-impact`) using the isomorphic FHT similarity kernel.
- Dampens translation & scale according to the active `motionSafetyMode` (0.5 for hard dampening, 0.75 for soft dampening, or throws `AESTHETIC_VIOLATION` under reject).

---

## Verification Plan

### Automated Tests
- Create `tests/qa/animation/animation-vector-wiring.test.ts` to assert:
  - **Vectorization Parity:** Verify continuous curves sample to 256 dimensions.
  - **Quantization Determinism:** Ensure identical motion curves yield identical signatures.
  - **Similarity Reliability:** Verify cosine inner-product behaves correctly.
  - **Safety Policy Execution:** Verify `off`, `warn-only`, `dampen-soft`, `dampen-hard`, and `reject` behaviors.
  - **High-Frequency Temporal Aliasing:** Verify short durations, steep curves, opacity flickers, and scale spikes.
  - **Immune System Audit:** Static scanning of `codex/core/` to ensure no `Math.random` or unexempted `performance.now` leaks exist.
- Run tests:
  ```bash
  npm run test tests/qa/animation/animation-vector-wiring.test.ts
  ```
