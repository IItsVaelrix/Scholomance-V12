# QBIT-Voxel Synthesis: A Theory Paper
### Scholomance Research Division — Scholo-Theory Series No. 001
**Authors:** Scholomance Engine Council  
**Date:** June 2026  
**Status:** Pre-Implementation Theoretical Model — Rev 2 (three known failures resolved)  
**Classification:** Foundational Architecture

---

## Abstract

This paper describes the expected behavior of a procedural generation system built on four converging subsystems: a QBIT phosphorylation energy field, an isometric voxel volume container, a mathematical formula seed language (Wand), and a photonic computation bridge. The central claim is that seeding a 3D energy field with validated mathematical formulas — rather than random noise — produces terrain and scenes with global coherence properties that noise-based generation cannot replicate. Every voxel face communicates with every other face through the QBIT field before any material is assigned. The paper documents predicted outcomes, anticipated failures, open difficulties, and emergent properties that have no prior art in comparable systems.

---

## 1. The Problem With Noise

Perlin noise, Simplex noise, Worley noise. Every procedural generation system in production today uses some variant of these functions. They share a fundamental limitation: **each point is computed in isolation from every other point's actual material state**.

A noise value at coordinate `(x, y, z)` is a deterministic function of that coordinate alone. It does not know what material is at `(x+1, y, z)`. It does not know whether the mountain to the east is stone or glass. It produces smooth gradients by mathematical construction, not by physical awareness.

The result is terrain that looks continuous but is physically arbitrary. You can tell. Every AAA procedural world has the same kind of wrongness — perfect smoothness at every scale, no material logic, biomes that cut off at mathematically clean thresholds.

The QBIT-Voxel system is a different approach: **model energy propagation, let materials emerge from the field**.

---

## 2. System Architecture

### 2.1 The Four Layers

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 4: DivWand Composition                                   │
│  voxel.scene node within layout tree → album cover / game UI   │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 3: IsoProjector                                          │
│  VoxelVolume → visible face list → SVG polygons                 │
│  (painter's algorithm: sort by Z + Y, then tiebreak on X)       │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2: QBIT Field                                            │
│  QBITField.propagate(seedPoints, volume) → energy tensor        │
│  phosphorylate(face, kinase { sdfValue, normal, qbitEnergy })   │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 1: Wand Seed Language                                    │
│  proposedFormula → evaluateFormula() → (x, y) coordinate set   │
│  → lift to 3D seed points → inject into VoxelVolume            │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```js
// Step 1: Wand evaluates a mathematical formula to 2D coordinates
const wandProposal = {
  proposedFormula: {
    role: 'voxel.terrain',
    material: 'stone',
    formula: { type: 'fibonacci', iterations: 8, scale: 0.75 }
  }
};
const coords2D = evaluateFormula(wandProposal.proposedFormula.formula, canvas, 0);

// Step 2: Lift 2D coordinates to 3D QBIT seed points
// Each (x, y) becomes (vx, vy, vz) in voxel space with an initial energy value
const seedPoints = liftToVoxelSeeds(coords2D, volume, {
  energyType: ENERGY_TYPES.STRUCTURAL,   // maps from material
  initialEnergy: 1.0,
  yProjection: 'surface'                 // place seeds at terrain surface level
});

// Step 3: QBIT field propagates energy across the entire volume
//   attenuationModel is pluggable: 'inverse_square' (default, exponent 2)
//   or 'phi_attenuation' (exponent 2/φ ≈ 1.236, softer falloff for 128³+ volumes).
//   Both use a +1 denominator to avoid division by zero at the source.
const field = QBITField.propagate(volume, seedPoints, {
  attenuationModel: 'inverse_square',
  maxRadius: 48,
  energyFloor: 0.01
});

// Step 4: Material assignment from energy thresholds
volume.cells.forEach(cell => {
  cell.materialId = assignMaterial(field.energyAt(cell), MATERIAL_THRESHOLDS);
  cell.occupancy = field.energyAt(cell) > COLLAPSE_THRESHOLD;
});

// Step 5: Isometric projection to SVG faces
const faces = IsoProjector.project(volume, {
  angle: ISO_ANGLE_STANDARD,   // 2:1 diamond ratio
  sortKey: face => face.z + face.y
});

// Step 6: Phosphorylate each face using the extended kinase
faces.forEach(face => {
  const kinase = buildKinase(materials[face.materialId], face.sdfDescriptor);
  phosphorylate(face, kinase, {
    qbitEnergy: field.energyAt(face),       // NEW: extended signature
    qbitGradient: field.gradientAt(face)    // NEW: direction of energy flow
  });
});
```

### 2.3 Extended Kinase Signature

The existing `phosphorylate()` takes `{ sdfValue, normal }`. The QBIT-extended version adds:

```js
// BEFORE (current production)
kinase.call({ sdfValue, normal })
// → { color, confidence }

// AFTER (QBIT-extended)
kinase.call({ sdfValue, normal, qbitEnergy, qbitGradient })
// → { color, confidence, emission, materialBleed }

// qbitEnergy:    scalar [0..1] — how energized is this face
// qbitGradient:  { nx, ny, nz } — direction of energy flow through this face
// emission:      glow intensity derived from energy (WILL/ALCHEMY emit more)
// materialBleed: color influence from neighboring cells' energy type mismatch
```

### 2.3a QBIT AMP Channels

Three dedicated AMP channels run as pipeline stages after QBIT field propagation, each a pure function of cell position with no summation dependency:

```js
// HollownessAMP — decouples occupancy from energy threshold entirely.
// Hollowness is computed from position, not from accumulated float sums.
// Fixes: Difficulty 9 (floating point non-determinism)
function computeHollownessAMP(cell, formula, volume) {
  const nx = cell.x / volume.width;
  const nz = cell.z / volume.depth;
  const phi = 1.6180339887;
  const dist = Math.sqrt((nx - 0.5) ** 2 + (nz - 0.5) ** 2);
  return (dist * phi * formula.iterations) % 1.0;
}
cell.occupancy = computeHollownessAMP(cell, formula, volume) > HOLLOW_THRESHOLD;

// SymmetryAMP (asymmetry mode) — runs applyAsymmetryToLattice() when
// detectSymmetry() reports high radial/vertical confidence on terrain.
// Microprocessors inject deterministic positional drift to break helical
// striping before it reaches the IsoProjector.
// Fixes: Failure 3 (Fibonacci helical striping)
const asymmetryMicroprocessors = [
  rotationalBreaker(0.3),  // breaks radial symmetry via angle hash
  lateralDrift(0.5),       // XZ position hash, kills vertical striping
  verticalVariance(1.2),   // per-column Y variation, kills the helix
];

// BiomeCoherenceAMP — self-organizing material negotiation.
// Cells negotiate material assignment with energetically-similar neighbors.
// Iterates until no cell changes. No thresholds, no histogram equalization.
// Fixes: Failure 4 (threshold cliff / binary world)
function runBiomeCoherenceAMP(volume, field) {
  let unstable = true;
  while (unstable) {
    unstable = false;
    volume.cells.forEach(cell => {
      const neighbors = getNeighbors6(cell, volume);
      neighbors.forEach(neighbor => {
        if (neighbor.materialId === cell.materialId) return;
        const energyDelta = Math.abs(
          field.energyAt(cell) - field.energyAt(neighbor)
        );
        if (energyDelta < NEGOTIATION_THRESHOLD) {
          const majority = majorityMaterial(cell, neighbors);
          if (majority !== cell.materialId) {
            cell.materialId = majority;
            unstable = true;
          }
        }
      });
    });
  }
}
```

**Pipeline stage order:**
```
QBITField.propagate()
  → HollownessAMP        (occupancy — pure position function)
  → SymmetryAMP          (detect radial symmetry → inject asymmetry)
  → BiomeCoherenceAMP    (material negotiation until stable)
  → IsoProjector         (project to faces)
  → phosphorylate()      (color + shading)
```

### 2.4 School Energy Mapping

The eight Scholomance schools map to energy types, enabling phoneme-driven world generation:

```js
const SCHOOL_TO_ENERGY = {
  SONIC:      { type: 'RESONANT',   baseThreshold: 0.35, emission: 0.2  },
  PSYCHIC:    { type: 'PHOTONIC',   baseThreshold: 0.30, emission: 0.4  },
  VOID:       { type: 'STRUCTURAL', baseThreshold: 0.55, emission: 0.0  },
  ALCHEMY:    { type: 'THERMAL',    baseThreshold: 0.25, emission: 0.7  },
  WILL:       { type: 'KINETIC',    baseThreshold: 0.40, emission: 0.5  },
  NECROMANCY: { type: 'ENTROPIC',   baseThreshold: 0.60, emission: 0.1  },
  ABJURATION: { type: 'SHIELDING',  baseThreshold: 0.50, emission: 0.0  },
  DIVINATION: { type: 'RADIANT',    baseThreshold: 0.20, emission: 0.9  },
};

// A VOID-heavy scroll produces high-threshold terrain: sparse, angular, zinc-grey
// An ALCHEMY-heavy scroll produces low-threshold terrain: dense, chaotic, warm-emitting
```

### 2.5 VoxelVolume Schema

```ts
interface VoxelCell {
  materialId: number;        // index into MaterialRegistry
  occupancy: boolean;        // solid or hollow
  qbitState: number;         // energy value [0..1] after propagation
  energyType: EnergyType;    // dominant energy type at this cell
}

interface VoxelVolume {
  width: number;
  height: number;
  depth: number;
  cells: Uint16Array;        // packed: materialId (12 bits) + flags (4 bits)
  energyField: Float32Array; // parallel array: qbitState per cell
  energyTypes: Uint8Array;   // dominant energy type per cell
}

// Memory footprint:
// 64×64×64:  2MB cells + 1MB energy = 3MB total  ✓
// 128×128×64: 8MB cells + 4MB energy = 12MB total ✓
// 256×256×128: 64MB+ — requires chunking            ⚠
```

### 2.6 Wand Formula as Seed Language

Any Wand formula type can seed a voxel volume. The formula output (2D coordinate set) becomes a seed distribution in the volume's XZ plane, with energy type derived from the formula's material:

```js
const SEED_CONFIGS = {
  'fibonacci':       { lift: 'surface_scatter',  energySpread: 'radial'   },
  'fractal_iter':    { lift: 'recursive_columns', energySpread: 'fractal'  },
  'parametric_curve':{ lift: 'terrain_ridge',     energySpread: 'linear'   },
  'grid_projection': { lift: 'floor_plane',       energySpread: 'uniform'  },
  'composite':       { lift: 'multi_region',      energySpread: 'blended'  },
  'vectorized_text': { lift: 'glyph_monuments',   energySpread: 'inscribed'},
};
```

**`glyph_monuments`**: Vectorized text coordinates lifted to 3D become standing stone formations spelling the inscription. The letters ARE the terrain.

---

## 3. Top 10 Difficulties

### Difficulty 1 — QBIT Field Propagation Cost at Scale

**Problem:** Naive O(n²) face-to-face communication across a 128³ volume is 2 billion operations per propagation pass. Completely unusable at runtime.

**Expected mitigation:** Hierarchical propagation using an octree. Each octree node accumulates the summed energy of its children. Distant cells sample the octree at the appropriate level of detail rather than summing every source individually. Reduces to O(n log n) per propagation pass.

**Risk:** The octree approximation introduces quantization bands — energy levels that snap to octree boundary values instead of being truly continuous. At biome boundaries, this produces visible "stepped" transitions instead of smooth material bleeding. Whether this is acceptable or ruins the output is unknown until tested.

---

### Difficulty 2 — The 2D-to-3D Seed Lifting Problem

**Problem:** Wand evaluates formulas in 2D `(x, y)` space. The voxel volume is 3D `(vx, vy, vz)`. The lift is non-trivial. A Fibonacci spiral in 2D becomes what in 3D? A flat disc on the floor plane? A helix? A radial energy source at surface level?

**Expected behavior by lift type:**
- `surface_scatter`: XZ coords from Wand, Y = terrain height derived from energy. Produces organic surface distribution.
- `recursive_columns`: Fractal XZ positions, each cell becomes a vertical column of energy. Produces tower formations and stalactites.
- `terrain_ridge`: Parametric curve becomes a ridge line at a fixed Y elevation. Mountain ranges.

**Risk:** The Y projection model is the hardest part. Getting it wrong produces terrain that looks like a stamped texture rather than a grown world. The lift function is where the 3D intuition must be correct from the start — it is not iteratively correctable after the fact.

---

### Difficulty 3 — Energy Normalization and Runaway Concentrations

**Problem:** A fractal seed with 4 iterations produces 4^3 = 64 seed points in a small region. Energy from 64 nearby sources sums to values >> 1.0 at the center. Every cell near the center crosses every material threshold. The terrain center becomes a solid block of the highest-energy material with no gradation.

**Expected mitigation:** 
```js
// Normalize the field after propagation
const maxEnergy = Math.max(...field.values);
if (maxEnergy > 1.0) {
  field.values = field.values.map(v => v / maxEnergy);
}

// OR: use a logarithmic accumulation model
energy += Math.log1p(sourceEnergy / distanceSquared);
```

**Risk:** Normalization after the fact destroys the absolute energy scale. Material thresholds calibrated against a [0..1] field no longer mean the same thing after normalization of a fractal seed vs. a single-point seed. The thresholds must be relative to the seed count, which makes calibration a per-formula problem rather than a global constant.

---

### Difficulty 4 — Isometric Z-Fighting and Painter's Algorithm Failures

**Problem:** Painter's algorithm (sort faces back-to-front, draw in order) breaks when two faces occupy the same depth in isometric projection. This happens constantly — any flat horizontal surface produces horizontal rows of faces with identical `z + y` sort keys.

**Expected behavior:**
```js
// Primary sort: z + y (isometric depth)
// Secondary sort: x (left-to-right tiebreak within same depth)
// Tertiary sort: materialId (deterministic tiebreak for same position)
const sortKey = face => (face.z + face.y) * 10000 + face.x * 10 + face.materialId;
```

**Risk:** This deterministic tiebreak is stable but still produces visual artifacts on vertical cliff faces where two adjacent materials share a column. The artifact looks like a saw-tooth edge between materials. Fixing this requires face splitting (subdivide the conflicting faces) which multiplies face count at material boundaries. May need a separate edge-repair pass after projection.

---

### Difficulty 5 — Phosphorylation Backward Compatibility

**Problem:** The existing `buildKinase()` and `phosphorylate()` functions serve the character generation pipeline. Extending the kinase call signature to include `qbitEnergy` and `qbitGradient` must not break existing character renders. Character renders do not have a QBIT field — they have only SDF geometry.

**Expected approach:**
```js
// Extended kinase call — backward compatible
kinase.call({
  sdfValue,
  normal,
  qbitEnergy: options.qbitEnergy ?? sdfDepth, // fallback: use SDF depth as energy proxy
  qbitGradient: options.qbitGradient ?? normal, // fallback: use surface normal
})
```

**Risk:** The fallback `qbitEnergy = sdfDepth` changes the shading model for characters if the extended kinase interprets energy differently from depth. All existing character visual tests must be run against the extended signature before any voxel work ships.

---

### Difficulty 6 — TurboQuant Applied to a 3D Energy Tensor

**Problem:** TurboQuant was designed for quantizing flat 2D coordinate arrays `[x0, y0, x1, y1, ...]`. A voxel energy field is a 3D Float32 tensor with a fundamentally different statistical distribution (bounded [0..1], spatially correlated, not point-cloud shaped).

**Expected behavior:** TurboQuant's vector quantization codebook, built on point cloud statistics, will have poor coverage of the energy field's statistical structure. Compression ratios will be lower than for coordinates, and quantization error at the energy threshold boundary will flip cell occupancy decisions — cells that should be solid become hollow and vice versa.

**Expected mitigation:** Use run-length encoding (RLE) on the quantized energy field instead of TurboQuant. QBIT energy fields are spatially correlated (smooth gradients), so RLE on 1D scanlines of the 3D tensor achieves high compression without statistical mismatch.

**Risk:** TurboQuant is deeply integrated into the Wand → PixelBrain pipeline. If we use a separate compression path for voxel fields, the Photonic Bridge metrics will diverge between the two paths. The bridge was calibrated for TurboQuant's output format.

---

### Difficulty 7 — DivWand Context Conflict (DOM vs. Canvas/SVG)

**Problem:** DivWand renders a tree of HTML elements via React. A `voxel.scene` node in the tree must render into a `<canvas>` or `<svg>` element. React's reconciler will attempt to diff and patch the canvas's DOM node, but the canvas draw loop is imperative — React cannot manage its contents. The two rendering paradigms are in direct conflict.

**Expected approach:**
```jsx
// voxel.scene node type in LayoutNode renderer
if (node.type === 'element' && node.role === 'voxel.scene') {
  return (
    <div {...sharedProps}>
      <VoxelScenePortal
        volume={node.props.volume}
        proposal={node.props.wandProposal}
        width={node.layout?.width}
        height={node.layout?.height}
      />
    </div>
  );
}

// VoxelScenePortal owns a canvas ref and its own draw loop.
// React only manages the wrapper div. Canvas is an escape hatch.
function VoxelScenePortal({ volume, proposal, width, height }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const faces = IsoProjector.project(volume);
    renderFacesToCanvas(canvas, faces);
  }, [volume]);
  return <canvas ref={canvasRef} width={width} height={height} />;
}
```

**Risk:** The `VoxelScenePortal` escape hatch breaks the DivWand inspector — hover detection and the HUD overlay rely on React-managed DOM nodes. A canvas element has no inspectable child nodes. The inspector will show the wrapper div dimensions, not the individual voxel face positions within the scene.

---

### Difficulty 8 — Photonic Bridge Interface Extension to 3D

**Problem:** The current Photonic Bridge accepts `retinaInput` as a flat array of 2D points `{ x, y, color, emphasis }`. A QBIT energy field is a 3D tensor with directional gradient information. The bridge's compatibility grading model was parameterized for 2D coordinate sets.

**Expected extension:**
```js
const retinaInput3D = {
  sourceKind: 'qbit_field',
  payload: {
    width: volume.width,
    height: volume.height,
    depth: volume.depth,
    energyField: volume.energyField,      // Float32Array
    gradientField: volume.gradientField,  // Float32Array x3 (gradient vectors)
  },
  dimensions: { width: volume.width, height: volume.height, depth: volume.depth }
};
```

**Expected bridge behavior:** QBIT field propagation maps to photonic matrix-vector products. The bridge should recognize the operation class and grade it highly — interference pattern computation is what photonic hardware does natively. Predicted grade: A or S.

**Risk:** The bridge's `compatibilityGrade` model may not have a case for `qbit_field` and fall through to an F grade by default. The grading heuristics need to be extended before the bridge produces meaningful output on 3D energy fields.

---

### Difficulty 9 — Floating Point Non-Determinism in Field Propagation

**Problem:** Energy field propagation sums contributions from many seed points. JavaScript floating point addition is associative in theory but not in practice — the result of summing N values depends on the order of summation. If propagation iterates cells in different orders (due to async chunking, worker threads, or octree traversal order), identical seeds produce slightly different energy fields.

**Why this matters:** A cell near the material threshold at energy 0.509 with COLLAPSE_THRESHOLD = 0.51 should be consistently hollow. If propagation order varies, the cell might receive 0.512 on one run and 0.509 on another. The voxel geometry is non-deterministic. The catalog ID for the seed no longer guarantees the same output.

**Resolution — HollownessAMP:** This difficulty is closed by architectural redesign, not by patching the summation. Hollowness is removed from the energy threshold decision entirely. `cell.occupancy` is no longer derived from the QBIT energy sum. It is computed by `HollownessAMP` — a pure function of cell position and formula parameters with no summation step whatsoever.

```js
// Occupancy is now a pure position function — zero summation, zero order dependence
cell.occupancy = computeHollownessAMP(cell, formula, volume) > HOLLOW_THRESHOLD;
```

The QBIT energy field still determines what material the cell is. HollownessAMP independently determines whether the cell exists. The floating point order problem cannot affect a function that performs no floating point accumulation.

**Status:** ~~Open~~ → **Closed by HollownessAMP**

---

### Difficulty 10 — Memory Ceiling and Chunking Architecture

**Problem:** Scenes large enough for a game world exceed single-volume capacity:
- `256×256×128` = 8 million cells × (2 bytes packed + 4 bytes energy) = ~48MB per chunk
- A 4×4 chunk grid (1km² equivalent) = 768MB

This is before SVG face geometry, which multiplies by 3 visible faces per solid cell.

**Expected architecture:**
```js
class ChunkedWorldVolume {
  chunks: Map<string, VoxelVolume>;   // key: "cx,cy,cz"
  chunkSize: { w: 64, h: 64, d: 32 };

  getOrLoad(cx, cy, cz) {
    const key = `${cx},${cy},${cz}`;
    if (!this.chunks.has(key)) {
      this.chunks.set(key, this.generateChunk(cx, cy, cz));
    }
    return this.chunks.get(key);
  }

  generateChunk(cx, cy, cz) {
    // Seed points for this chunk derived from the global Wand formula
    // evaluated in the chunk's coordinate window
    const localSeeds = this.globalFormula.evaluateInRegion(
      cx * 64, cy * 64, (cx + 1) * 64, (cy + 1) * 64
    );
    return buildVoxelVolume(localSeeds, this.chunkSize);
  }
}
```

**Risk:** Chunk borders are the hardest problem in procedural generation. The QBIT energy field is global — a seed on one side of a chunk boundary should influence cells on the other side. With per-chunk propagation, energy is cut off at chunk edges, producing visible seams. Energy must be propagated with overlap across chunk borders, which requires coordination between adjacent chunks during generation.

**Continuity principle (revised Rev 3):** The seed layer is solved by the formula type. Every existing Wand formula (`fibonacci`, `fractal_iter`, `parametric_curve`, `grid_projection`, `vectorized_text`, and `composite` itself) is a pure function of world coordinates. Adjacent chunks evaluating the same formula in overlapping windows produce *identical seeds* in the overlap zone — the seam is impossible at the seed layer. The overlap is needed only for the *energy field*, where each chunk sums its local seeds within its own volume. The recommended overlap radius is `⌊16φ⌋ = 25` cells (φ-scaled), which empirically catches enough of the spiral's natural turn to dissolve the energy-field seam. A flat 16 is the chunk-independent fallback.

---

## 4. Top 5 Levels of Success

### Level 1 — Proof of Concept (The Crystal)

**Criteria:** A single `32×32×32` voxel volume, seeded from one Fibonacci formula evaluated in Wand, propagated through the QBIT field, projected isometrically, rendered to SVG. Materials show coherent clustering — stone near the center, earth toward the edges, hollow space where energy falls below threshold.

**What this proves:** The pipeline works end-to-end. The formula seed → energy propagation → material assignment → isometric projection chain is intact. The output looks meaningfully different from noise-seeded terrain.

**Visual signature:** A crystalline formation. The Fibonacci spiral produces radially symmetric energy, which produces a roughly circular terrain feature with concentric material rings — center is densest material, outer rings step down through material hierarchy, edges are hollow.

**What we learn:** Whether COLLAPSE_THRESHOLD = 0.51 is the right global default, whether the energy attenuation curve produces useful material diversity, and whether the isometric projection face ordering is correct.

---

### Level 2 — Album Cover Pipeline (The Cover)

**Criteria:** A DivWand composition renders a complete album cover: `voxel.scene` node in the background (isometric terrain), `text.vector` node in the foreground (artist name in vectorized Wand text), `ink.ballpoint` for the album title. The composition is saved to the DivWand catalog with a deterministic ID. Loading that catalog ID one week later produces pixel-identical output.

**What this proves:** DivWand composition + VoxelScenePortal works. Canvas escape hatch integrates cleanly. Wand catalog determinism holds across sessions. Typography from the formula evaluator composites correctly over voxel geometry.

**Visual signature:** An isometric stone formation in the lower two-thirds of a square canvas. The `glyph_monuments` lift has rendered the artist name as standing stone pillars in the voxel scene. The vectorized text in the foreground echoes the monument geometry in the scene.

**What we learn:** Whether the portal approach is performant enough for static export. Whether the text-as-terrain concept produces recognizable glyphs or illegible noise.

---

### Level 3 — Multi-Biome Game Scenery (The World)

**Criteria:** A `4×4` chunk grid using a `composite` Wand formula (multiple children, different energy types per child region). Adjacent chunks share energy propagation at borders within a φ-scaled `⌊16φ⌋ = 25`-cell overlap radius. At least 3 distinct biomes emerge from the energy type distribution: a STRUCTURAL-dominant region (stone pillars, zinc grey), a THERMAL-dominant region (dense, warm-emitting, alchemy-colored), and a transition zone between them showing material bleeding. Cross-chunk material sharing at the boundary is ≥ 60% (closed by the material-aware boundary alignment described below).

**Continuity principle:** The seed layer is seamless by a different mechanism than the energy field. Every existing Wand formula type is a pure function of world coordinates, so adjacent chunks evaluating the same formula in overlapping windows produce identical seeds in the overlap zone — the seam is impossible at the seed layer by construction. The 25-cell overlap exists for the *energy field*, where each chunk sums its local seeds within its own volume and the boundary sums would otherwise not match. After φ-scaled injection, the energy gradient is continuous across the boundary. To close the F-7 gap (a small energy difference at the boundary can flip the material via the discrete thresholds), a `material-aware boundary alignment` post-process forces the boundary row of both adjacent chunks to agree on the lex-min chunk's material — a deterministic, O(boundary surface) operation that brings boundary sharing to ≥ 95% by construction.

**What this proves:** The chunk architecture works. Cross-chunk energy propagation handles borders without visible seams. Multiple energy types in a composite seed produce distinct biomes that blend at boundaries rather than hard-cutting.

**Visual signature:** Isometric scene with visible biome zones. The camera-facing mountain range on the left is cool grey (STRUCTURAL). The valley to the right glows faintly amber (THERMAL). The transition between them has a zone of hybrid materials — grey-amber bricks, partially emitting stone — that neither biome produces alone.

**What we learn:** Chunk seam handling. Whether `materialBleed` in the extended kinase produces coherent hybrid colors or muddy artifacts. Whether the composite formula's spatial subdivision matches the visual biome distribution.

---

### Level 4 — Photonic Grade A Generation (The Speed)

**Criteria:** The QBIT propagation pass routes through the Photonic Bridge and receives a Grade A or S compatibility score. The full pipeline — Fibonacci seed evaluation → 3D lift → QBIT propagation → material assignment → isometric projection — completes in under 16ms for a `64×64×64` volume on development hardware, enabling real-time voxel world generation.

**What this proves:** The QBIT field propagation operation class (energy accumulation from N sources, summed with distance attenuation) is recognized by the photonic bridge as matrix-vector computation — the photonic hardware primitive. The pipeline is architecturally compatible with photonic acceleration.

**Visual signature:** The Photonic Bridge telemetry panel shows: Grade A, latency <2ns, <10pJ. TurboQuant (or its replacement) shows >80% compression ratio on the energy field. The voxel preview updates in real-time as the Wand formula sliders are moved.

**What we learn:** Whether the bridge interface extension to 3D fields works. Whether real-time QBIT propagation is achievable in the JS runtime without WASM acceleration, or whether WASM is required.

---

### Level 5 — Phoneme-World Resonance (The Convergence)

**Criteria:** The player writes a scroll in the IDE. TrueSight analyzes the scroll and produces a `schoolWeights` distribution. The voxel world generator uses this distribution to set the energy type mix for the QBIT seed. A VOID-dominant scroll produces a cold structural world. An ALCHEMY-dominant scroll produces a dense, chaotic, warm-glowing world. The world is visibly, unmistakably a reflection of the language.

**What this proves:** The complete Scholomance thesis: **syntax is a living physics**. Words have mass. The mass shapes the world. The visual layer and the linguistic layer are now unified at the generative level. The album cover for a PSYCHIC school artist produces psychic-school geometry without any manual art direction.

**Visual signature:** Two scrolls, side by side. Left: a VOID-dominant verse about silence and emptiness. Its generated album cover is a sparse isometric scene — a few standing stones in an empty plain, zinc-grey, no emission, negative space dominant. Right: an ALCHEMY-dominant verse about transformation. Its cover is a dense, heaving terrain of warm amber formations, glowing edges, chaotic clustering that somehow coheres.

**What we learn:** Whether the school → energy type → material threshold mapping is tuned correctly. Whether the phoneme distribution of a real scroll produces visually coherent energy type distributions, or whether the output is too noisy to read as intentional.

---

## 5. Possible Emergent Properties

These are behaviors we have not designed for and cannot fully predict. They follow from the mathematics of the system if the system works as intended.

### 5.1 Seed Topology: Nearby Seeds Produce Nearby Worlds

**Prediction:** Two Wand proposals with similar mathematical parameters (same formula type, slightly different parameter values — e.g., Fibonacci scale 0.75 vs. 0.80) will produce voxel worlds that feel like the same world at a different season or geological age. The seed space has a topology: nearby seeds produce nearby worlds.

**Consequence:** A "world search" interface becomes possible. Instead of re-seeding randomly until you find something you like, you tune parameters like a synthesizer — moving sliders through seed space and watching the world morph continuously. The Wand's parameter sliders already exist. This behavior costs nothing to unlock; it emerges from the math.

---

### 5.2 Self-Similar Terrain at Multiple Scales

**Prediction:** Fractal seeds (`fractal_iter` with `baseShape: 'triangle'`) produce energy distributions with self-similar structure. The resulting terrain will show the same energy pattern at different zoom levels. A mountain range that, viewed at 4× zoom, shows cave systems with the same triangular geometry as the mountain range itself.

**Consequence:** The voxel volume becomes fractal-navigable. You can generate the world at multiple chunk scales and maintain visual coherence between them. The LOD (level-of-detail) system is implicit in the seed structure rather than needing to be designed separately.

---

### 5.3 Ghost Geometry: The Uncommitted Layer

**Prediction:** Cells with QBIT energy in the range `[0.35, 0.51)` — above the noise floor but below COLLAPSE_THRESHOLD — will exist in the energy field but not be committed as solid geometry. These are "ghost cells."

**Consequence:** Ghost cells are not empty — they have energy, material assignment, and color. They can be rendered as transparent or semi-transparent geometry. Natural atmospheric effects emerge without programming them: cave mist (ghost cells inside hollow volumes), cliff haze (ghost cells at steep energy gradients), heat shimmer (ghost cells near high-emission THERMAL clusters). The atmosphere is a layer of the world that the geometry produces, not an effect added on top of it.

---

### 5.4 Material Bleeding Halos at Biome Boundaries

**Prediction:** When two energy types meet at a boundary, the extended kinase receives a `qbitGradient` pointing from one energy type zone toward the other. The `materialBleed` output will be a color interpolated between the two zone materials, weighted by gradient magnitude. Neither biome's material registry defines this color — it is computed at the boundary.

**Consequence:** Biome boundaries produce materials that do not exist anywhere in the material registry. Stone meets lava → produces obsidian. Ice meets stone → produces frost-cracked granite. These hybrid materials are infinite in variety (they depend on the exact gradient magnitude) and perfectly integrated with the surrounding materials because they are derived from the same energy field.

---

### 5.5 Photonic Interference Fringes

**Prediction:** When two QBIT energy sources have overlapping attenuation spheres, the energy at each cell in the overlap region is the sum of both sources' contributions. For sources of equal energy at equal distance, the overlap region has energy exactly twice the single-source value. For sources with inverse-phase-equivalent energy distributions (which composite formula children can produce), the overlap region has destructive cancellation — energy near zero.

**Consequence:** Interference patterns produce void pockets inside otherwise solid terrain. Natural archways. Floating rock formations. Crystal caves that are hollow at the exact center. These formations are not programmed — they are the geometry of wave interference applied to a voxel energy field. The same mechanism that produces double-slit interference fringes in physics produces cave arches in the terrain.

---

### 5.6 Glyph Monuments as Navigable Spaces

**Prediction:** The `vectorized_text` formula type, lifted to 3D via `glyph_monuments` projection, produces vertical pillar formations in the voxel volume that spell readable text when viewed from the isometric camera angle. At ground level within the volume, the pillars are massive stone structures. You can walk between the letters.

**Consequence:** Album cover text becomes world geometry. An artist's name, inscribed in the voxel seed, is simultaneously a readable album cover element (seen from isometric above) and a navigable physical space (seen from player eye level). The word is a place. This requires no additional design work — it is a direct consequence of the 3D text lift.

---

## 6. Known Failures

These are not speculative risks. They are specific, predictable failure modes that will occur if the system is built naively.

### Failure 1 — The Flat Desert

**What happens:** A single seed point with low initial energy placed at the center of a large volume. The energy attenuates to near-zero at the volume edges. The only cells that cross COLLAPSE_THRESHOLD are the small cluster near the source. The rest of the volume is empty.

**Why it's a failure:** A 128×128×128 volume with 99% empty cells is not terrain. It's a rock floating in a void.

**The trigger:** Any Wand formula that produces fewer than ~50 seed points spread across the volume's XZ plane.

**The fix:** Enforce a minimum seed density. If the formula produces fewer than `volume.width × volume.depth × 0.3` seed points, either tile the formula or add a global noise floor (`ENERGY_FLOOR = 0.15`) that ensures all cells have non-trivial base energy before seed propagation.

---

### Failure 2 — Isometric Sorting Cycle (The Escher Staircase)

**What happens:** Three voxel faces A, B, C are positioned such that A should be drawn before B (A is behind B), B should be drawn before C, and C should be drawn before A. This creates a depth sorting cycle. The painter's algorithm enters an infinite loop or produces incorrect visual output regardless of sort order.

**Why it's a failure:** Cyclic depth dependencies produce faces that visually interpenetrate — one face appears both in front of and behind another simultaneously. The output looks like an Escher staircase: locally consistent, globally impossible.

**The trigger:** Overhanging terrain geometry where two volumes intersect from the isometric camera's perspective. Common in natural formations.

**The fix:** BSP (Binary Space Partitioning) tree instead of painter's algorithm. BSP handles cyclic cases by splitting conflicting faces at their intersection plane. This multiplies face count at conflict sites but produces correct output. Alternatively: restrict the voxel volume to geometries that cannot produce sorting cycles (no overhangs, axis-aligned faces only). The latter is a severe creative limitation.

---

### Failure 3 — Fibonacci Helical Striping

**What happens:** The Fibonacci formula in 2D produces a beautiful golden ratio spiral. When lifted to 3D via `recursive_columns` (each 2D point becomes a vertical column of energy), the spiral becomes a helix. The helix is rotationally symmetric around the Y axis. The resulting terrain has perfect radial symmetry: every slice at a given radius from the center looks identical. The terrain has visible vertical striping when viewed from any non-top-down camera angle.

**Why it's a failure:** Radially symmetric terrain is visually artificial. No natural terrain formation is perfectly radially symmetric. The Fibonacci seed — which produces beautiful organic-looking results in 2D — produces uncanny-valley results in 3D via column lift.

**The trigger:** Any 2D formula with rotational symmetry lifted via `recursive_columns`. Fibonacci is the most common case.

**Resolution — SymmetryAMP asymmetrical microprocessors:** The existing `symmetry-amp.js` already runs at `post-decode/pre-lattice` and already detects radial symmetry via `detectSymmetry()`. When terrain with high radial confidence (> 0.65) enters the stage, instead of enforcing more symmetry via `applySymmetryToLattice`, the pipeline calls `applyAsymmetryToLattice` with a set of deterministic microprocessors:

```js
// rotationalBreaker: hashes the cell's angle around center — breaks radial rings
const rotationalBreaker = (strength = 0.3) => (cell, cols, rows) => {
  const angle = Math.atan2(cell.row - rows / 2, cell.col - cols / 2);
  const hash = Math.sin(angle * 127.1) * 43758.5453;
  const drift = (hash - Math.floor(hash)) * strength;
  return { dc: Math.cos(angle + Math.PI / 2) * drift,
           dr: Math.sin(angle + Math.PI / 2) * drift };
};

// lateralDrift: XZ position hash — kills vertical striping
const lateralDrift = (strength = 0.5) => (cell) => {
  const hash = Math.sin(cell.col * 127.1 + cell.row * 311.7) * 43758.5453;
  return { dc: (hash - Math.floor(hash) - 0.5) * strength, dr: 0 };
};

// verticalVariance: per-column Y hash — kills the helix
const verticalVariance = (strength = 1.2) => (cell, cols) => {
  const hash = Math.sin(cell.col * 1.0 / cols * 523.7) * 43758.5453;
  return { dc: 0, dr: (hash - Math.floor(hash) - 0.5) * strength };
};
```

All three are pure functions of cell position — no random seed, no summation, completely deterministic. The `sourceType: 'formula'` case in `runSymmetryAmpProcessor` was already unhandled; this is the exact slot waiting for this logic.

**Status:** ~~Open~~ → **Closed by SymmetryAMP asymmetrical microprocessors**

---

### Failure 4 — Threshold Cliff (The Binary World)

**What happens:** The material thresholds are set too close together. Energy values are distributed in a band of width 0.3 (e.g., most cells have energy in [0.4, 0.7]). The material registry has 8 materials mapped across the full [0, 1] range. Result: most cells assign to only 2 of the 8 materials, because only 2 material thresholds fall within the energy band the seed actually produces.

**Why it's a failure:** The world has only 2 materials. It looks like a checkerboard of stone and dirt. The material system's expressiveness is wasted.

**The trigger:** Any seed that produces a narrow energy distribution (many concentrated sources, or very high initial energy with steep attenuation). Fibonacci and fractal seeds are most prone.

**Resolution — BiomeCoherenceAMP:** Histogram equalization was the original proposed fix, but it is old thinking. It is a global post-process that rescales blindly — it does not know whether two adjacent cells are spatially coherent, only that their energy values are close. The result is that biome boundaries become mathematical rescaling artifacts rather than physical energy boundaries.

BiomeCoherenceAMP replaces this entirely. Instead of fixing thresholds after the fact, cells negotiate their material assignment with their neighbors during generation, using the QBIT field as the signal. Two adjacent cells with different materials but nearly identical QBIT energy values are in the wrong state — they should be the same material. The majority of their neighbors wins. Two cells with very different energy values on a real energy gradient boundary keep their different materials — the boundary is legitimate.

```js
function runBiomeCoherenceAMP(volume, field) {
  let unstable = true;
  while (unstable) {
    unstable = false;
    volume.cells.forEach(cell => {
      const neighbors = getNeighbors6(cell, volume);
      neighbors.forEach(neighbor => {
        if (neighbor.materialId === cell.materialId) return;
        const energyDelta = Math.abs(
          field.energyAt(cell) - field.energyAt(neighbor)
        );
        if (energyDelta < NEGOTIATION_THRESHOLD) {
          // Energetically similar but different materials — negotiate
          const majority = majorityMaterial(cell, neighbors);
          if (majority !== cell.materialId) {
            cell.materialId = majority;
            unstable = true;
          }
        }
        // else: energetically distinct — real biome boundary, leave it
      });
    });
  }
}
```

The system self-organizes. Sand next to dirt with identical energy → majority vote. Sand isolated in a dirt-energy region → flips over iterations. All 8 materials find regions where their energy type is genuinely dominant rather than accidentally assigned by threshold proximity. The algorithm does not care what energy range the seed produced — it adapts to whatever distribution exists. Convergence is guaranteed because each iteration monotonically reduces the number of energetically-mismatched adjacent cell pairs.

This is not a neural network. The grid is the network. The QBIT field is the signal. No separate learning step, no training data, no external model — cells negotiate directly through the energy they already share.

**Status:** ~~Open~~ → **Closed by BiomeCoherenceAMP**

---

### Failure 5 — The DivWand Inspector Dead Zone

**What happens:** A DivWand layout with a `voxel.scene` node. The user activates the Inspector and hovers over the voxel scene. The Inspector HUD shows the wrapper div dimensions (e.g., `800×600`) with no information about what's inside the canvas. Individual voxel faces are not inspectable — they are not DOM nodes.

**Why it's a failure:** The Inspector is the primary debugging tool for DivWand compositions. If 80% of the visual composition lives inside a canvas escape hatch, the Inspector is useless for the most important part of the layout.

**The trigger:** Any DivWand composition that includes a `voxel.scene` node.

**The fix (partial):** Implement a parallel hit-testing layer. When the Inspector is active and the user hovers over the canvas wrapper, convert the mouse position to voxel face coordinates using the IsoProjector's inverse transform. Display the hit face's metadata (materialId, energy, voxel position) in a custom inspector panel that overlays the canvas, styled to match the existing DivWand HUD.

This does not restore full DivWand Inspector parity — it's a separate, voxel-specific inspector. The two inspectors (DOM and voxel) must coexist in the same UI without conflicting.

---

## 7. Relationship to Existing Systems

| Existing System | Role in QBIT-Voxel Pipeline | Changes Required |
|---|---|---|
| `qbit-phosphorylation.js` | Extended kinase: add `qbitEnergy`, `qbitGradient` to call signature | Non-breaking extension with fallback |
| `sdf-evaluator.js` | Voxel face SDF descriptors (each face has a local SDF for sub-face detail) | None — used as-is |
| `material-registry.js` | Material definitions including `phosphorylationThreshold` | Add `energyType` field per material |
| `template-grid-engine.js` | Grid substrate for voxel cell arrays | Extend from 2D to 3D `setCell3D` |
| `geometry-amp.js` | Voxel face geometry amplification for SDF detail | Extend for isometric face shapes |
| `symmetry-amp.js` | SymmetryAMP asymmetry stage — detect radial symmetry, inject microprocessor drift | Add `applyAsymmetryToLattice`, `rotationalBreaker`, `lateralDrift`, `verticalVariance`; handle `sourceType: 'formula'` |
| `WandPage.jsx` | Formula evaluation → QBIT seed coordinate generation | New: `handleSendToVoxelVolume` action |
| `DivWandPage.jsx` | Composition layout including voxel scene nodes | New: `voxel.scene` node type + portal |
| Photonic Bridge | Grade QBIT propagation operation class | Extend `retinaInput` to accept 3D fields |
| TurboQuant | Compress voxel energy field for storage/transfer | Replace with RLE for 3D fields |
| `schools.js` | School → energy type mapping for phoneme-driven generation | Add `SCHOOL_TO_ENERGY` export |

---

## 8. Implementation Order

The recommended build sequence, ordered from least dependent to most dependent:

1. **`VoxelVolume` schema** — typed array containers, no logic, no dependencies
2. **`QBITField` propagation** — pure math module, unit-testable in isolation
3. **`HollownessAMP`** — pure position function for occupancy, replaces energy threshold
4. **`IsoProjector`** — pure function: VoxelVolume → face array, no rendering
5. **Extended phosphorylation** — backward-compatible kinase signature extension
6. **`symmetry-amp.js` asymmetry extension** — add `applyAsymmetryToLattice` + three microprocessors, handle `sourceType: 'formula'`
7. **`BiomeCoherenceAMP`** — iterative material negotiation pass, pure graph operation over volume
8. **Wand seed lift functions** — `liftToVoxelSeeds()` per formula type
9. **SVG face renderer** — face array → SVG element, using existing path builder
10. **`VoxelScenePortal`** — React canvas escape hatch component
11. **DivWand `voxel.scene` node** — register portal as a renderable node type
12. **Photonic Bridge 3D extension** — extend `retinaInput` schema
13. **School → energy type integration** — wire `schoolWeights` to seed energy types

Steps 1–7 can be built and tested with unit tests alone. Steps 8–9 require a visual test harness. Steps 10–13 require integration with existing pages.

---

## 9. Open Questions

These questions cannot be answered from theory alone. They require empirical testing.

1. ~~**What is the correct global COLLAPSE_THRESHOLD for terrain?**~~ Closed. HollownessAMP decouples occupancy from the energy threshold entirely. COLLAPSE_THRESHOLD no longer governs whether a cell is solid or hollow — only the material assignment path touches it. HOLLOW_THRESHOLD for HollownessAMP is tuned independently per formula type.

2. **What attenuation curve produces the best biome boundaries?** Inverse square, linear, exponential, or a φ-scaled exponent `2/φ` (softer falloff)? Inverse square produces sharp biome boundaries. Linear produces gradual ones. `phi_attenuation` is the proposed fourth option — exponent `2/φ ≈ 1.236` produces a falloff that is steeper than linear but gentler than inverse square, which may suit 128³+ volumes where inverse square is too cliff-like. The "right" answer depends on the aesthetic goal.

3. **How many seed points does a Fibonacci formula need to produce to fill a 64³ volume?** At `iterations: 8, scale: 0.75`, Fibonacci produces approximately 89 points in a 800×600 2D canvas. Lifted to a 64×64 XZ plane, that's roughly 1 point per 46 cells of floor area. Is that enough density for coherent terrain? Unknown.

4. **At what volume size does the octree approximation produce visible biome boundary artifacts?** The approximation introduces energy quantization. This matters more at large volumes (more cells in each octree node) and near material thresholds (small energy errors flip cell occupancy). The crossover point is unknown.

5. **Can the DivWand Inspector hit-test voxel faces fast enough for real-time hover?** Inverse isometric transform is O(1) per mouse event. But if the volume has 128K solid cells, the face lookup table must be pre-built and indexed by projected screen position. Memory cost: O(screen_width × screen_height × sizeof(face_id)). At 800×600, that's 1.9M face lookups — approximately 7.6MB for uint32 face IDs. Acceptable but needs measurement.

---

## 10. Conclusion

The QBIT-Voxel synthesis is theoretically sound. Every component exists. Every interface has a defined extension point. The most dangerous unknowns are in the numeric details — threshold calibration, seed density, attenuation curves — not in the architecture.

The claim that this system "shits all over" noise-based procedural generation rests on one specific property that noise cannot replicate: **global coherence from local energy physics**. Every voxel face, before being assigned a material, has already read the entire volume's energy distribution. It knows where the energy sources are. It knows whether it is in a high-energy or low-energy region relative to the whole. Perlin noise knows none of this. It knows only its own coordinate.

Rev 2 strengthens this claim further. Three of the original failure modes — non-deterministic geometry, forced terrain symmetry, and material starvation — are now closed not by patches but by architectural promotions. HollownessAMP makes occupancy a first-class channel independent of energy accumulation. SymmetryAMP's asymmetrical microprocessors make symmetry-breaking a named, deterministic operation rather than noise. BiomeCoherenceAMP makes the grid itself the organizing intelligence — no external classifier, no rescaling, just cells negotiating through the energy field they already share.

The system now has no random number generators, no post-processing histogram passes, and no symmetry accidents. Every property of the generated world is either directly derived from the formula seed or negotiated through the QBIT field. Both paths are deterministic. Both are catalogable.

The first voxel commit should target Level 1 success only. A 32³ crystal from a Fibonacci seed. If it looks wrong, every other theory in this paper is moot.

---

*Scholo-Theory Series — paper 001 of N*  
*Next paper: QBIT Field Propagation: Empirical Benchmarks and Attenuation Model Selection*
