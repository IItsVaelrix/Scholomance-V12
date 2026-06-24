# PIR: PixelBrain Square Sharpness Contrast AMP

**Date:** 2026-06-11  
**PDR:** [`2026-06-11-pixelbrain-square-sharpness-contrast-amp-pdr.md`](../PDR-archive/2026-06-11-pixelbrain-square-sharpness-contrast-amp-pdr.md)  
**Status:** Implemented  
**Classification:** PixelBrain + Rendering + AMP + Visual Fidelity  

---

## Summary

Implemented a deterministic Square Sharpness Contrast AMP that runs after PixelBrain render-packet material resolution and before square/canvas drawing. The AMP improves pixel-scale readability by inspecting neighboring coordinates, preserving bright cores, darkening silhouette edges, supporting midtones near highlights, and reducing emphasis on isolated non-highlight samples.

This closes the visual gap where source fidelity and chromatic transmutation were correct, but the final square rendering still read as soft islands instead of a crisp material silhouette.

---

## Files Changed

- `codex/core/pixelbrain/square-sharpness-contrast-amp.js`
- `src/lib/pixelbrain.adapter.js`
- `src/pages/PixelBrain/PixelBrainPage.jsx`
- `tests/core/pixelbrain/square-sharpness-contrast-amp.test.js`
- `docs/scholomance-encyclopedia/PDR-archive/2026-06-11-pixelbrain-square-sharpness-contrast-amp-pdr.md`
- `docs/scholomance-encyclopedia/PDR-archive/README.md`

Related fidelity fixes completed in the same workstream:

- `codex/core/microprocessors/pixel/LatticeTracer.js`
- `codex/core/pixelbrain/image-to-pixel-art.js`
- `codex/core/pixelbrain/extensions/style-extensions.js`
- `tests/qa/pixelbrain/latticeTracer.luminance.test.js`
- `tests/qa/pixelbrain/sourceTranscription.fidelity.test.js`

---

## Behavior

- `buildSquareSharpnessContrastPayload()` now produces a schema-like AMP payload with source coordinates, enhanced output coordinates, diagnostics, material id, and deterministic input hash.
- PixelBrainPage now derives `squareRenderPayload` from `pixelBrainRenderPacket.coordinates`.
- Preview, PNG/JSON export payloads, Godot helper input, photonic route input, terminal payloads, and shader runtime state consume the square-enhanced coordinates.
- Source asset packets remain unmodified.
- Render packets remain the material-resolution stage; the square AMP is a final readability stage.

---

## QA

Commands run:

```bash
npx vitest run tests/core/pixelbrain/square-sharpness-contrast-amp.test.js tests/qa/pixelbrain/sourceTranscription.fidelity.test.js tests/qa/pixelbrain/latticeTracer.luminance.test.js tests/qa/pixelbrain/imageTrace.extensions.test.js tests/qa/generation/pixelbrain-logic.test.js tests/qa/pixelbrain/upload-bytecode.test.js tests/qa/pixelbrain/pixel-processor-pipeline.test.js
npx eslint codex/core/pixelbrain/square-sharpness-contrast-amp.js codex/core/pixelbrain/image-to-pixel-art.js codex/core/microprocessors/pixel/LatticeTracer.js codex/core/pixelbrain/extensions/style-extensions.js src/lib/pixelbrain.adapter.js src/pages/PixelBrain/PixelBrainPage.jsx tests/core/pixelbrain/square-sharpness-contrast-amp.test.js tests/qa/pixelbrain/sourceTranscription.fidelity.test.js tests/qa/pixelbrain/latticeTracer.luminance.test.js --quiet
```

Result:

- Vitest: 7 files passed, 25 tests passed.
- ESLint: passed with no reported errors.

---

## Residual Risk

The AMP uses conservative coordinate-level color adjustment. It improves square readability without canvas post-processing, but it is still not a full perceptual image sharpening algorithm. Future tuning may add material-specific profiles or an optional UI intensity control if artists need more or less edge treatment per asset.

