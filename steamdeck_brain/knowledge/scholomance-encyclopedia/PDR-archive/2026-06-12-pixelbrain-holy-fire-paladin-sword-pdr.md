# PixelBrain Design Record: Holy Fire Paladin Sword

**Bytecode Search Code:** `SCHOL-ENC-PDR-PIXELBRAIN-HOLY-FIRE-PALADIN-SWORD-v1`  
**Date:** 2026-06-12  
**Status:** Proposed / Implementation Ready  
**Author:** PixelBrain Agent (following Agent Operating Manual)  
**Audience:** AI agents, Item Foundry maintainers, shape grammar engineers, shader authors, QA agents  
**Scope:** Weapon item class extension, part-profile-library additions, shape grammar route for `weapon.sword.holy-paladin-v1`, holy fire motif system, construction skeleton, deterministic formulas, PB-SHADER-v1 integration, export packets  
**Related PDRs / Documents:**  
- `2026-06-12-pixelbrain-deterministic-shape-grammar-router-pdr.md`  
- `2026-06-12-sketchamp-construction-line-microprocessor-pdr.md`  
- `2026-06-11-pixelbrain-render-fidelity-pipeline-pdr.md`  
- `2026-06-11-pixelbrain-connective-tissue-seven-systems-pdr.md`  
- PixelBrain Agent Operating Manual (core laws, packets, routes)  
- Existing weapon reference: scimitar golden tests in `tests/core/pixelbrain/`  

---

## 1. Executive Summary & Intent

This PDR defines a **deterministic, lattice-authoritative** Holy Fire Paladin sword asset for the PixelBrain Item Foundry.

The sword embodies:
- A blessed longsword of a holy paladin order
- Radiant **holy fire** motifs (non-destructive, non-inventing-geometry effects)
- Prominent **paladin cross** heraldry and engravings
- High-contrast, high-fidelity pixel art suitable for Aseprite editing, Godot shaders, Phaser pipelines, and runtime glow

**Core Rule (per Agent Operating Manual):**  
The lattice **is** the asset. All formulas below produce integer lattice cells only. Shaders and exports are projections.

**Non-negotiables enforced:**
- No `Math.random()`
- All geometry via deterministic integer math or FNV-1a hashed offsets
- Required outputs fail loudly via seam contracts
- Materials resolve exclusively through `material-registry.js`
- Construction skeleton provides authoritative anchors before any motif stamping

**Target Canonical Output Bundle (from `forgeItemAsset`):**
- `spec` (ITEM-SPEC-v1)
- `silhouette` + `geometry` (masks for blade, guard, hilt, pommel, holyFire, crossEngraving)
- `construction` (PB-CONSTRUCTION-SKELETON-v1)
- `fills` + `motifs`
- `shader` (PB-SHADER-v1 holy fire glow packet)
- `assetPacket` (PixelBrainAssetPacket)
- `png`, `aseprite` layers, Godot `.pbrain` helper, Phaser pipeline

---

## 2. Canonical Canvas & Lattice Parameters

```js
canvas: {
  width: 64,
  height: 96,
  gridSize: 1
}
```

- **Center line (authoritative axis):** `x = 32`
- **Blade vertical span:** `y = 8` (tip) to `y = 72` (base/guard junction)
- **Guard horizontal axis:** `y = 74`
- **Hilt span:** `y = 74` to `y = 88`
- **Pommel:** `y = 88` to `y = 94`

All coordinates are **integer lattice cells**. No sub-pixel authority.

---

## 3. Construction Skeleton (PB-CONSTRUCTION-SKELETON-v1)

Applied via `construction-line-microprocessor.js` **before** any part profile or motif.

```js
const construction = applyConstructionLines([], {
  version: 'construction-v1',
  center: { x: 32, y: 40 },           // visual & symmetry center
  bladeAxis: {                        // primary vertical
    x: 32,
    yStart: 8,
    yEnd: 72,
    role: 'blade-center'
  },
  guardAxis: {                        // crossguard
    xStart: 18,
    xEnd: 46,
    y: 74,
    role: 'guard-center'
  },
  hiltAxis: {
    x: 32,
    yStart: 74,
    yEnd: 88,
    role: 'hilt-center'
  },
  pommelAnchor: { x: 32, y: 91, role: 'pommel' },
  rings: [
    { radius: 4, role: 'blade-fuller-zone', y: 40 },
    { radius: 6, role: 'holy-fire-emission', y: 74 }
  ],
  radials: {
    count: 8,
    offsetDegrees: 22.5,
    role: 'holy-radiance'
  },
  axes: true,
  crossMarkers: [
    { x: 32, y: 74, size: 5, role: 'paladin-cross-center' }
  ]
});
```

**Formula for ring/radial placement (deterministic):**

For a ring at center \((c_x, c_y)\) with radius \(r\):

```math
\text{for } \theta = 0, \frac{2\pi}{n}, \dots :
\quad x = \lfloor c_x + r \cdot \cos(\theta) + 0.5 \rfloor, \quad
y = \lfloor c_y + r \cdot \sin(\theta) + 0.5 \rfloor
```

All angles use precomputed integer lookup tables or fixed-point trig (no floating point drift in canonical path).

---

## 4. Part Profiles & Deterministic Formulas

New profiles added to `part-profile-library.js` under `weapon.sword.*` namespace.

### 4.1 Blade Profile: `weapon.sword.holyfire_paladin_blade`

**Parameters:**
- `length`: 64 cells (y-span)
- `baseHalfWidth`: 6
- `tipHalfWidth`: 2
- `taperPower`: 0.85 (gentle curve)
- `fullerWidth`: 2 (center groove)
- `fullerDepth`: 0.6 (affects only material intensity, not geometry removal)

**Core Formula (integer quantized):**

For each integer row \( y \in [y_{\text{base}}, y_{\text{tip}}] \):

```math
w(y) = \left\lfloor w_{\text{base}} \cdot \left(1 - k \cdot \frac{y - y_0}{L}\right)^{p} + 0.5 \right\rfloor
```

Where:
- \( w_{\text{base}} = 6 \)
- \( k = 0.67 \) (taper factor so tip ≈ 2)
- \( p = 0.85 \) (sub-linear for elegant curve)
- \( L = 64 \), \( y_0 = 8 \)

**Blade body cells** (partId: `blade`):

```js
for (let y = 8; y <= 72; y++) {
  const t = (y - 8) / 64;
  const halfW = Math.floor(6 * Math.pow(1 - 0.67 * t, 0.85) + 0.5);
  for (let dx = -halfW; dx <= halfW; dx++) {
    coordinates.push({ x: 32 + dx, y, color: null, partId: 'blade' }); // color resolved later
  }
}
```

**Fuller (center groove) — material slot only, not geometry subtraction:**

```math
\text{fullerLeft}(y) = 32 - \left\lfloor \frac{w(y)}{3} \right\rfloor, \quad
\text{fullerRight}(y) = 32 + \left\lfloor \frac{w(y)}{3} \right\rfloor
```

Cells inside fuller receive `fill: { material: 'holy_steel', intensity: 'medium' }` with trim `void_gold` or `sanctified_gold`.

### 4.2 Crossguard Profile: `weapon.sword.holyfire_paladin_guard`

Horizontal bar at y=74, width 28 cells (x=18 to 46), thickness 3 cells (y=73–75).

**Paladin Cross Motif** (stamped at guard center):

Vertical arm: x=32, y=70 to y=78 (thickness 3)  
Horizontal arm: y=74, x=24 to x=40 (thickness 3)

**Deterministic line rasterization (Bresenham-style integer only):**

```js
function drawThickLine(x0, y0, x1, y1, thickness, partId) {
  // Integer DDA / Bresenham variant returning exact lattice cells
  // No floating point in final cell emission
}
```

### 4.3 Hilt & Pommel

- **Hilt wrap:** 3-cell wide vertical band, leather or wire-wrap material
- **Pommel:** 5×5 orb or cross-capped sphere at y=89–93
  - Formula: circle of radius 4.5 quantized:
    ```math
    (x - 32)^2 + (y - 91)^2 \leq 20.25 \quad \text{(integer test)}
    ```

### 4.4 Holy Fire Motif Profile: `weapon.sword.holyfire_motif`

**Emission zones** (from construction rings + blade edges):

Flames are **not** geometry invention. They occupy pre-declared motif cells adjacent to blade/guard.

**Flame shape formula (deterministic, seed-derived but fixed per spec):**

For each flame origin point \( (o_x, o_y) \) on blade edge:

```math
\text{for } i = 0 \dots h_{\text{max}}:
\quad \text{offset}_x(i) = \lfloor A \cdot \sin(2\pi \cdot f \cdot i / h + \phi) + 0.5 \rfloor
\quad y = o_y - i
```

Where:
- \( A = 2.5 \) (amplitude, quantized)
- \( f = 1.3 \) (frequency)
- \( \phi = \text{FNV-1a hash of partId + seed} \mod 2\pi \) (deterministic phase)
- \( h_{\text{max}} = 9 \) to 14 cells (varies by zone)

Multiple overlapping flame layers create depth without randomness.

**Holy fire material authority** (resolved in `region-fill-amp.js` + `material-registry`):

- Core: `divine_flame_core` (near-white #FFF8E7)
- Mid: `sanctified_gold` (#E8C46A)
- Outer halo: `radiant_blue` (#A0D8FF) with low alpha in render packet only

---

## 5. Shape Grammar Route: `weapon.sword.holy-paladin-v1`

Defined in new or extended `factory/weapon-factory.js` (or `item-foundry.js` extension).

**Route Definition (seam-checked):**

```js
const routeDefinition = {
  contract: 'PB-SHAPE-GRAMMAR-v1',
  class: 'weapon.sword.holy-paladin-v1',
  steps: [
    { id: 'base-silhouette', processor: 'silhouette-composer', emits: ['bladeCells', 'guardCells', 'hiltCells', 'pommelCells'] },
    { id: 'construction', processor: 'construction-line-microprocessor', emits: ['construction.skeleton'] },
    { id: 'holy-fire-motifs', processor: 'holyfire-motif-amp', consumes: ['bladeCells', 'construction.rings'], emits: ['holyFireMotifCells'] },
    { id: 'cross-engraving', processor: 'heraldry-stamp-amp', consumes: ['bladeCells', 'guardCells'], emits: ['crossEngravingCells'] },
    { id: 'geometry-amp', processor: 'geometry-amp', emits: ['geometry.masks.*', 'shaderMasks'] },
    { id: 'material-resolve', processor: 'region-fill-amp', consumes: ['fills'], emits: ['finalCoordinates'] }
  ],
  requiredOutputs: [
    { id: 'blade-cells', kind: 'partCells', selector: 'blade', minCells: 120, fatal: true },
    { id: 'guard-cells', kind: 'partCells', selector: 'guard', minCells: 40, fatal: true },
    { id: 'holyfire-motifs', kind: 'motifCells', selector: 'holyFire', minCells: 25, fatal: true },
    { id: 'cross-engraving', kind: 'motifCells', selector: 'cross', minCells: 12, fatal: true },
    { id: 'center-blade-shader-mask', kind: 'shaderMask', selector: 'blade_core', minCells: 1, fatal: true },
    { id: 'fire-emission-mask', kind: 'shaderMask', selector: 'holy_fire', minCells: 8, fatal: true }
  ]
};
```

**Loud Failure Example:**

If `holyFireMotifCells.length < 25` after motif-amp → route fails with:

```json
{
  "code": "PB_ROUTE_REQUIRED_OUTPUT_EMPTY",
  "route": "weapon.sword.holy-paladin-v1",
  "step": "holy-fire-motifs",
  "requiredOutput": "holyfire-motifs",
  "message": "Holy fire motif emission produced insufficient cells. Check flame origin points and amplitude formula."
}
```

---

## 6. Material & Palette Authority

New entries in `material-registry.js` (or transmutation rules):

```js
'holy_steel': {
  anchors: ['#E8F0F8', '#B8C8D8', '#8FA8C0'],
  trim: 'sanctified_gold'
},
'sanctified_gold': { anchors: ['#F4E8A8', '#D4B860', '#A88C40'] },
'divine_flame_core': { anchors: ['#FFFDF0', '#FFF8D0'] },
'radiant_blue': { anchors: ['#C0E8FF', '#80C0F0'] }
```

All final colors trace to registry. No hard-coded hex in foundry logic.

---

## 7. Shader Packet (PB-SHADER-v1)

```js
const shaderPacket = createShaderPacket({
  contract: 'PB-SHADER-v1',
  id: 'holyfire-paladin-glow-v1',
  targetMasks: ['holy_fire', 'blade_core', 'cross_center'],
  uniforms: {
    glowIntensity: 0.85,
    flamePulseSpeed: 1.2,
    holyHueShift: 0.05,           // subtle blue-white shift
    edgeSoftness: 1.5
  },
  godot: { /* Godot shader code or uniform map */ },
  phaser: { /* pipeline config */ }
});
```

Shader **consumes** geometry masks. Does **not** create new cells.

---

## 8. Example ITEM-SPEC-v1

```js
const spec = {
  contract: 'ITEM-SPEC-v1',
  id: 'paladin.holyfire.sword.v1',
  class: 'weapon',
  archetype: 'sword',
  canvas: { width: 64, height: 96, gridSize: 1 },
  seed: 0xC0FFEE,                    // deterministic
  bytecode: 'HOLY-FIRE-PALADIN-SWORD-ASCENDANT',
  parts: [
    {
      id: 'blade',
      profile: 'weapon.sword.holyfire_paladin_blade',
      fill: { material: 'holy_steel', intensity: 'bright' },
      trim: { material: 'sanctified_gold', anchor: 'blade' }
    },
    {
      id: 'guard',
      profile: 'weapon.sword.holyfire_paladin_guard',
      fill: { material: 'sanctified_gold' }
    },
    {
      id: 'holyFire',
      profile: 'weapon.sword.holyfire_motif',
      fill: { material: 'divine_flame_core', intensity: 'max' }
    }
  ],
  heraldry: {
    primary: 'paladin_cross',
    stampLocations: ['blade_center', 'guard_center']
  },
  effects: {
    shader: 'holyfire-paladin-glow-v1'
  }
};

const bundle = forgeItemAsset(spec, { includeShader: true, includePng: true });
```

**Expected post-forge assertions (golden test):**

```js
bundle.routeDiagnostics.ok === true;
bundle.geometry.masks.blade.length > 120;
bundle.geometry.masks.holy_fire.length > 25;
bundle.shader.contract === 'PB-SHADER-v1';
Buffer.compare(bundle.png, previousGolden) === 0;   // determinism
```

---

## 9. Implementation Roadmap & Files to Touch

1. `codex/core/pixelbrain/part-profile-library.js` — add three new profiles with formulas above
2. `codex/core/pixelbrain/factory/weapon-factory.js` (or extend) — implement `forgeHolyFirePaladinSword` + routeDefinition
3. `codex/core/pixelbrain/shape-grammar-engine.js` — register `weapon.sword.holy-paladin-v1` grammar
4. `codex/core/pixelbrain/holyfire-motif-amp.js` (new) — motif emission using flame formulas
5. `codex/core/pixelbrain/material-registry.js` — add holy materials + transmutation rules
6. `tests/core/pixelbrain/holyfire-paladin-sword.test.js` (new) — determinism + required output tests
7. Update `item-foundry.js` if new class routing needed

**Golden PNG / Aseprite reference** will be committed after first successful deterministic forge.

---

## 10. Anti-Patterns Explicitly Forbidden Here

- Treating holy fire as "shader-only geometry" (must emit real motifCells first)
- Using canvas measurements or DOM for blade width
- Non-deterministic flame phase (must be FNV-1a or fixed lookup)
- Overlapping parts without seam merge contract
- Exporting PNG first and reverse-engineering coordinates

---

## 11. Minimum Competency Checklist for This PDR

- [x] All geometry formulas produce integer lattice cells only
- [x] Construction skeleton declared before motifs
- [x] Required outputs defined with `minCells` and `fatal: true`
- [x] Materials resolve via registry authority
- [x] Shader consumes masks, never invents cells
- [x] Determinism test included (seed → identical PNG/assetPacket)
- [x] Loud failure paths documented
- [x] PDR references existing canonical contracts and PDRs

---

## 12. Final Operating Principle Application

**Authoritative lattice:** Integer cells emitted by part profiles + holyfire-motif-amp using the formulas in §4.  
**Owning contract:** `PixelBrainAssetPacket` + `PB-SHAPE-GRAMMAR-v1` route.  
**Deterministic processor:** `forgeItemAsset` → silhouette → construction → motif AMPs → geometry-amp.  
**Proof test:** `holyfire-paladin-sword.test.js` + golden PNG comparison + repeated `forgeItemAsset(spec)` equality.

When these four answers are clear, implementation may proceed.

---

**Next Action Recommendation:**  
Implement the part profiles and motif AMP first (focused test), then wire the full route. Run the new golden test before any UI or export work.

This PDR is now ready for review and implementation under the PixelBrain Agent Operating Manual laws.