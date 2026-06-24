# PDR: Known Color Microprocessors
## Deterministic Named-Color Resolver Registry

**Status:** Implemented
**Classification:** Architectural + Color Engine + Microprocessors + PixelBrain
**Priority:** High
**Primary Goal:** Provide microprocessor access for every known color Scholomance can resolve, without fragmenting PixelBrain palette authority.

---

# 1. Executive Summary

Scholomance already has PixelBrain palette generation, school chroma, NLU color extraction, and material transmutation stages. What is missing is a deterministic microprocessor layer for named colors. When a tool, prompt, VerseIR payload, or UI control asks for a color by name, the pipeline should resolve that name through a registry instead of ad hoc component mappings.

This PDR introduces a named-color microprocessor registry that exposes:

- `color.resolve` for generic named/hex/rgb color resolution.
- `color.resolve.<name>` for every registered known color and alias.

The first registry scope is CSS named colors, Scholomance school anchors, and existing NLU color aliases.

# 2. Problem Statement

Color intent currently enters the system through several paths:

- NLU `COLOR_KEYWORDS`
- PixelBrain `color-byte-mapping.js`
- school constants
- component-level palette choices
- Chromatic Transmutation AMP materials

Without a named-color microprocessor layer, color names can drift across domains. A request for `lavender`, `blood`, `sonic`, or `rebeccapurple` may be interpreted differently depending on the caller.

# 3. Product Goal

Create a deterministic registry-backed microprocessor system that resolves every known named color to a stable payload containing:

- canonical name
- requested input
- hex
- rgb
- hsl
- luminance
- palette
- byte map
- provenance

# 4. Non-Goals

- Do not replace `color-byte-mapping.js`.
- Do not change PixelBrain school palette authority.
- Do not mutate render/export payloads.
- Do not add network-backed color lookup.
- Do not hand-write one physical processor file per color.

# 5. Core Design Principles

- Registry-first, processor-second.
- Pure and deterministic.
- No randomness.
- Exact color names win over aliases.
- Aliases are explicit and inspectable.
- Output is schema-stable and serializable.
- Per-color microprocessor IDs are generated from the registry.

# 6. Feature Overview

The registry supports:

```text
color.resolve
color.resolve.red
color.resolve.lavender
color.resolve.rebeccapurple
color.resolve.sonic
color.resolve.blood
```

Generic resolution accepts:

```js
{ color: 'lavender', paletteSize: 3 }
{ color: '#C7D2FE' }
{ rgb: { r: 199, g: 210, b: 254 } }
```

# 7. Architecture

New files:

```text
codex/core/microprocessors/color/named-color-registry.js
codex/core/microprocessors/color/ColorResolver.js
tests/core/microprocessors/color-resolver.test.js
```

Registry integration:

```text
codex/core/microprocessors/index.js
  -> register color.resolve
  -> register color.resolve.<processorId> for each known color
```

# 8. Module Breakdown

- `named-color-registry.js`
  - CSS named colors.
  - school anchor colors.
  - local NLU aliases.
  - normalization utilities.
  - lookup and listing functions.

- `ColorResolver.js`
  - `resolveKnownColor(payload, context)`
  - `createColorResolverProcessor(colorName)`
  - HSL/luminance/palette derivation.

- `index.js`
  - automatic registration of all known color processor IDs.

# 9. ByteCode IR Design

The color resolver emits a byte-map-compatible palette, but it does not own bytecode palette selection. Downstream PixelBrain code may consume the palette or pass the resolved color into `color-byte-mapping.js` as a semantic parameter.

# 10. Implementation Phases

1. Add the PDR and archive catalog entry.
2. Add the named-color registry.
3. Add the resolver microprocessor.
4. Register generic and per-color IDs.
5. Add tests for canonical names, aliases, hex input, generated per-color processors, and registry coverage.
6. Add PIR.

# 11. QA Requirements

- `color.resolve.red` resolves to `#FF0000`.
- `color.resolve.rebeccapurple` resolves to `#663399`.
- local aliases such as `blood` resolve through explicit alias metadata.
- school anchors such as `sonic` resolve to school constants.
- hex input resolves without needing a named registry entry.
- `verseIRMicroprocessors.list()` includes generated color processors.
- output palette and byte map are deterministic.

# 12. Success Criteria

Every known named color in the registry is addressable as a microprocessor, and generic color resolution returns a stable payload suitable for PixelBrain, VerseIR, and UI consumers.
