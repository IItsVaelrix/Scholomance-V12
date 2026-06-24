# PIR: Chromatic Transmutation AMP

**Date:** 2026-06-11
**PDR:** `docs/scholomance-encyclopedia/PDR-archive/2026-06-11-chromatic-transmutation-amp-pdr.md`
**Status:** Implemented

## Summary

Added a deterministic PixelBrain Chromatic Transmutation AMP between source palette/coordinate state and render/export consumers. The AMP keeps source data intact, exposes `source` as a no-op material, and adds `icy_fire` as the first luminance-aware material transform.

## Implementation

- Added `src/pages/PixelBrain/amps/chromaticTransmutationAmp.js`.
- Added material anchors for void, shadow, deep, body, frost, spectral, glacial lavender, moonlit gray, and white core.
- Added palette, palette-list, coordinate, color-map, and full payload builders.
- Wired PixelBrain render data through a memoized chromatic payload.
- Added a `CHROMATIC AMP` selector in the PixelBrain right panel.
- Updated preview canvas, JSON export, PNG export path, Godot artifact export, terminal payload, and photonic route to consume `renderCoordinates` and `renderPalettes`.
- Preserved original `coordinates` and `palettes` so switching back to `SOURCE` restores source behavior.

## QA

- `npx eslint src/pages/PixelBrain/PixelBrainPage.jsx src/pages/PixelBrain/amps/chromaticTransmutationAmp.js tests/pages/pixelbrain-chromatic-transmutation-amp.test.js --quiet`
- `npx vitest run tests/pages/pixelbrain-chromatic-transmutation-amp.test.js 2>&1`

## Notes

The AMP does not replace `color-byte-mapping.js`. It acts as a deterministic named render/export stage before downstream PixelBrain artifact consumption.
