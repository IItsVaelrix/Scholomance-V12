# BUG-2026-06-04-VECTOR-AMP-FIDELITY-ALIGNMENT

## Bytecode Search Code
`SCHOL-ENC-BYKE-SEARCH-VECTOR-AMP-FIDELITY-ALIGNMENT`

## Bug Description
A comprehensive audit ("Savage Audit") of the vector alignment/signatures code identified multiple critical math, validation, and error propagation issues:
1. **Inflated Similarity Scores**: `compareSignatures` was returning values greater than 1.0 (specifically 1.1378 for self-similarity), which violates the standard cosine similarity range of `[-1, 1]` and distorted search/probing rankings.
2. **Degenerate Input Bias**: Empty/degenerate inputs (e.g. empty string) were silently blessed and generated biased signatures (all `0x88`) that resonated at ~28% (which maps to ~64% resonance) with arbitrary code.
3. **One-sided Percentage Clamp**: The display mapping in `protein-probe.engine.js` mapped similarity to `[0, 1]` using `Math.max(0, ...)`, meaning the display could exceed 100% when similarity exceeded 1.0.
4. **Structured Diagnostic Erasure**: The microprocessor factory catch-block flattened child `BytecodeError` exceptions, discarding their structured context and replacing it with a generic hook break string.
5. **TS Import Hazards**: Lazy microprocessor registrations dynamically imported literal `.ts` files under ESM, risking startup or runtime failures on bare Node environments that lack `.ts` resolution.
6. **Shared Primitive Consumer Regression**: Re-audit found that `estimateInnerProduct` is also consumed by `TurboQuantMotionProcessor.ts`. The corrected cosine scale invalidated the processor's old `0.75` aesthetic dampening threshold, causing ordinary hover/mount motion to dampen unexpectedly.

## Root Cause
1. **Magnitude Mismatch**: The quantizer unit-normalizes vectors *before* Hadamard rotation and 4-bit packing, but the reconstructed 4-bit dequantized vector does not have a unit norm. Downstream, `estimateInnerProduct` assumed unit norm and hardcoded `n1=n2=1` without dividing by the reconstructed magnitudes.
2. **Quantization Bias**: Standard symmetric 4-bit quantization maps zero to bin 8, which dequantizes to a positive bias of `+0.0667` instead of a zero-straddling bin. Zero-norm vectors generated all-`0x88` packed arrays, which dequantize to a constant positive bias on all dimensions, inflating cosine alignment.
3. **Incomplete Clamping**: `Math.max(0, (maxResonance + 1) / 2)` lacks a `Math.min(1, ...)` upper clamp.
4. **Eager Catch-Wrap**: `factory.js` caught any error and wrapped it directly into `HOOK_CHAIN_BREAK` without verifying if the error was already a structured `BytecodeError`.
5. **Direct TS Imports**: Dynamic imports of `.ts` files are unsupported in plain Node ESM runtimes.
6. **Threshold Calibration Drift**: The animation processor threshold was calibrated against the previous inflated inner-product scale. After cosine normalization, the threshold had to be recalibrated in the consumer.

## Thought Process
1. **Normalize in Cosine Space**: We must divide by the reconstructed magnitudes of both vectors in `estimateInnerProduct`/`compareSignatures` to get the true mathematical cosine similarity.
2. **Degenerate Guard**: Add a zero-norm input check in `runVectorAmp` to return `ok: false` with a sentinel signature (`data` length 0) instead of a biased one.
3. **Robust compareSignatures**: Enhance `compareSignatures` and `estimateInnerProduct` to return `0` immediately for empty/sentinel or mismatching signatures.
4. **Two-sided Clamp**: Add `Math.min(1, ...)` to the display resonance mapping.
5. **Preserve BytecodeError**: Verify if error is `BytecodeError` or has a `.bytecode` property and propagate it directly.
6. **Graceful TS Resolution**: Wrap `.ts` imports in try-catch to throw a descriptive `BytecodeError` indicating that TS compilation/runtime support (Vite/TSX) is required instead of crashing Node with `ERR_UNKNOWN_FILE_EXTENSION`.
7. **Own the Shared Primitive**: Recalibrate animation's similarity threshold against corrected cosine output and test the animation consumer suite, not only PixelBrain.

## Changes Made

| File | Lines Changed | Rationale |
|------|---------------|-----------|
| [turboquant.js](file:///home/deck/Desktop/Scholomance-V12-main/codex/core/quantization/turboquant.js) | ~52-97 | Normalize dot product by reconstructed magnitudes, clamp sum to `[-1, 1]`. |
| [runVectorAmp.js](file:///home/deck/Desktop/Scholomance-V12-main/codex/core/semantic/amp/runVectorAmp.js) | ~31, ~70, ~158 | Add `DEGENERATE_INPUT` error, guard zero-norm vectors, and secure `compareSignatures` lengths. |
| [protein-probe.engine.js](file:///home/deck/Desktop/Scholomance-V12-main/codex/core/immunity/protein-probe.engine.js) | ~54 | Map similarity to percentage using a two-sided clamp. |
| [factory.js](file:///home/deck/Desktop/Scholomance-V12-main/codex/core/microprocessors/factory.js) | ~30, ~60, ~81 | Warn on ID collisions, propagate `BytecodeError`, throw on invalid sequence type. |
| [index.js](file:///home/deck/Desktop/Scholomance-V12-main/codex/core/microprocessors/index.js) | ~1, ~75, ~91 | Gracefully catch TS import errors on Node ESM and throw standard `BytecodeError`s. |
| [TurboQuantMotionProcessor.ts](file:///home/deck/Desktop/Scholomance-V12-main/codex/core/animation/processors/vector/TurboQuantMotionProcessor.ts) | threshold constants | Recalibrated animation dampening threshold for corrected cosine scale. |
| [runVectorAmp.test.js](file:///home/deck/Desktop/Scholomance-V12-main/tests/unit/runVectorAmp.test.js) | unit suite | Expanded unit coverage for degenerate, null, off-policy, reject-policy, and error paths. |
| [integration.test.ts](file:///home/deck/Desktop/Scholomance-V12-main/tests/qa/animation/integration.test.ts) | consumer regression | Added guard that ordinary hover scale remains undampened under default safety mode. |
| [animation-vector-wiring.test.ts](file:///home/deck/Desktop/Scholomance-V12-main/tests/qa/animation/animation-vector-wiring.test.ts) | threshold assertions | Bound safety assertions to the exported calibrated threshold constant. |
| [index_codebase_vectors.js](file:///home/deck/Desktop/Scholomance-V12-main/scripts/index_codebase_vectors.js) | indexer guard | Skip zero-length sentinel signatures instead of writing empty vector blobs. |

## Testing
1. Created and expanded [runVectorAmp.test.js](file:///home/deck/Desktop/Scholomance-V12-main/tests/unit/runVectorAmp.test.js) to verify self-similarity, degenerate input, null/mismatched signatures, `off` policy, reject-policy, and wiring error behavior.
2. Ran all 12 files and 184 tests in `tests/qa/pixelbrain` to confirm PixelBrain microprocessor behavior.
3. Re-audit found PixelBrain was insufficient coverage for the shared primitive. Added and ran animation consumer coverage:
   - `npx vitest run tests/unit/runVectorAmp.test.js tests/qa/animation/integration.test.ts tests/qa/animation/animation-vector-wiring.test.ts tests/qa/animation/animation-amp.test.js`
   - Result: 4 files, 27 tests passed.

## Lessons Learned
1. **Quantization Alters Norms**: Even if a float vector is normalized to unit-norm before quantization, the quantized and dequantized reconstruction deviates from unit length. Math functions relying on unit vectors must normalize by the reconstructed magnitudes.
2. **Zero-Norm Input Validation**: A zero vector (from empty input or pure whitespace) has no direction. Trying to compute cosine similarity on it is invalid. Guarding inputs early prevents downstream semantic distortions.
3. **Preserve Exception Context**: Generic try-catch wrappers must inspect caught errors to avoid flattening custom errors that carry critical diagnostic payloads.
4. **Shared Primitive Changes Need Consumer Tests**: A math primitive may be correct and still break calibrated consumers. Validation must include all known consumers, not only the subsystem where the bug was first observed.

---

*Entry Status: COMPLETED | Last Updated: 2026-06-04*
