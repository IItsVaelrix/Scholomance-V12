# PDR: PixelBrain Emblem Microprocessor
**Date:** 2026-06-11
**Status:** DRAFT
**Domain:** `codex/core/pixelbrain/`

## 1. The Problem
In our current PixelBrain pipeline, insignias, runes, and motifs (like the lightning engraving on the Scimitar or the sonic tuning forks on the Kiteshield) are hard-coded into bespoke generator scripts (`generate-pixelbrain-scimitar.mjs`, `generate-pixelbrain-kiteshield.mjs`). 

While the new `PixelBrain Directional Light & Pixel-Art Finish Suite` provides robust post-processing for shapes, the **generation** of internal surface insignias remains brittle and non-reusable. We need a universal "Emblem Microprocessor" that can interpret high-level bytecode/JSON specifications and procedurally rasterize *any* type of emblem onto a base weapon or armor silhouette.

## 2. Goals & Scope
- **Universal Rasterization:** Provide a suite of vector-like drawing primitives (lines, arcs, polygons, radial symmetries) that rasterize cleanly onto our low-res pixel grid.
- **Surface Conformity:** Emblems must not look like "stickers." The microprocessor must interact with the existing `normal-estimation.js` to either *emboss* (raise) or *engrave* (lower) the emblem, affecting how the directional light hits it.
- **Dynamic Halos & Glows:** Automatically compute and apply emission glows/halos to adjacent pixels based on a `glowRadius` property.
- **Foundry Integration:** Expose this as an official AMP (`emblem-amp.js`) that plugs directly into `item-foundry.js`, moving us entirely away from bespoke generation scripts.

## 3. Architecture

### 3.1 `emblem-amp.js`
The core microprocessor. It will run *after* the base silhouette is filled, but *before* the directional lighting and facet passes.

**Input:**
- `fills`: The array of filled pixel coordinates.
- `emblemSpec`: A JSON object defining the insignia.
  - `type`: 'rune', 'radial', 'crest', 'geometric'.
  - `primitives`: Array of drawing instructions (e.g., `[{ shape: 'line', x0: -5, y0: 0, x1: 5, y1: 0 }]`).
  - `placement`: `{ originX, originY, scale, rotation }`.
  - `style`: `{ effect: 'engrave' | 'emboss' | 'paint' | 'emit', glowRadius: 1 }`.

**Output:**
- Mutated `fills` array where specific coordinates are tagged with `partId: 'emblem'` and their normals/Z-depths are adjusted according to the `style`.

### 3.2 Raster Primitives Library (`raster-math.js`)
We will centralize Bresenham's line algorithm and midpoint circle algorithms currently scattered across scripts.
- `rasterLine(x0, y0, x1, y1)`
- `rasterCircle(cx, cy, r)`
- `rasterPolygon(points)`

### 3.3 The Z-Depth / Normal Modifier
If an emblem is marked as `emboss`, the microprocessor will artificially inflate the `slot` value (Z-depth) of the emblem pixels and recalculate the normals *just around the emblem edge*. This will allow the `directional-shading-amp.js` to catch light on the top edge of the emblem and cast a 1px shadow below it.

If `engrave`, it inverses the normals, making it look carved into the steel.

## 4. Execution Plan

1. **Phase 1: Math Library Extrication**
   - Extract `rasterLine` from `generate-pixelbrain-scimitar.mjs`.
   - Implement `rasterCircle` and symmetry helpers.
   - Place in `codex/core/pixelbrain/raster-math.js`.

2. **Phase 2: Microprocessor Core (`emblem-amp.js`)**
   - Build the `applyEmblem(fills, spec)` function.
   - Implement the translation/scaling logic to map abstract `-1.0 to 1.0` emblem coordinates to the actual pixel grid coordinates based on the item's bounding box.

3. **Phase 3: Material & Normal Integration**
   - Update `directional-shading-amp.js` to respect artificial normal overrides passed by the emblem amp.
   - Implement the `emboss`/`engrave` normal-bending logic.

4. **Phase 4: Foundry Wiring**
   - Add an `emblems` array to the standard `spec` object in `item-foundry.js`.
   - Execute the amp during the standard pipeline.

## 5. Example Spec Usage

```json
{
  "id": "royal-kiteshield",
  "parts": [...],
  "emblems": [
    {
      "id": "sonic-tuning-fork",
      "style": { "effect": "emit", "coreMaterial": "sonicCyan", "glowMaterial": "sonicGlow" },
      "placement": { "anchor": "center", "offsetY": 8 },
      "primitives": [
        { "type": "arc", "radius": 4, "span": "half" },
        { "type": "line", "points": [[0, -2], [0, 8]] }
      ]
    }
  ]
}
```

## 6. Success Criteria
- The script `generate-pixelbrain-kiteshield.mjs` can be completely deleted in favor of a declarative JSON spec passed to `item-foundry.js`.
- An emblem can be dynamically swapped from a "Sonic Crest" to a "Fire Rune" simply by changing the JSON spec, with zero code changes.
- Directional light correctly interacts with embossed/engraved emblems.
