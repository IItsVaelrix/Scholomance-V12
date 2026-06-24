# PIR: Known Color Microprocessors

**Date:** 2026-06-11
**PDR:** `docs/scholomance-encyclopedia/PDR-archive/2026-06-11-known-color-microprocessors-pdr.md`
**Status:** Implemented

## Summary

Added a deterministic named-color microprocessor layer. The system now exposes one generic resolver, `color.resolve`, and generated `color.resolve.<name>` microprocessors for every registered CSS color, Scholomance school anchor, and local NLU alias.

## Implementation

- Added `codex/core/microprocessors/color/named-color-registry.js`.
- Added `codex/core/microprocessors/color/ColorResolver.js`.
- Registered `color.resolve` and generated per-color processors in `codex/core/microprocessors/index.js`.
- Added tests for CSS named colors, aliases, school colors, hex/RGB payloads, generated registry coverage, and unknown-color error payloads.

## QA

- `npx eslint codex/core/microprocessors/index.js codex/core/microprocessors/color/named-color-registry.js codex/core/microprocessors/color/ColorResolver.js tests/core/microprocessors/color-resolver.test.js --quiet`
- `npx vitest run tests/core/microprocessors/color-resolver.test.js 2>&1`

## Notes

The resolver emits palette and byte-map-compatible data, but it does not replace `color-byte-mapping.js`. PixelBrain palette authority remains downstream.
