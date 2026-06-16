# QBIT-Voxel Synthesis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the QBIT-Voxel procedural generation pipeline to Level 1 success — a 32³ voxel crystal seeded from a Fibonacci formula, propagated through a QBIT energy field, projected isometrically, and rendered to SVG with coherent material clustering.

**Architecture:** Formula seeds (2D Fibonacci spiral) are lifted to 3D QBIT seed points. A QBIT energy field propagates outward from those seeds using inverse-square attenuation, then three AMP stages run in order: HollownessAMP (pure-position occupancy), SymmetryAMP asymmetry injection, BiomeCoherenceAMP (neighbor negotiation). The IsoProjector renders visible faces to a sorted list, which the SVG renderer converts to a `<polygon>`-based SVG.

**Tech Stack:** Vanilla JS ES modules, Vitest, existing `codex/core/pixelbrain/` module system.

**Spec:** `docs/Scholo-Theory/QBIT-VOXEL-SYNTHESIS.md` — implementation follows Section 8 ordering.

**Scope:** Steps 1–9 only (Section 8). VoxelScenePortal (Step 10), DivWand node (Step 11), Photonic Bridge 3D extension (Step 12), and school-scroll integration (Step 13) are deferred to the next plan.

---

## File Map

**New files:**
- `codex/core/pixelbrain/voxel-volume.js` — typed-array schema + cell accessors
- `codex/core/pixelbrain/qbit-field.js` — energy propagation + material assignment
- `codex/core/pixelbrain/hollowness-amp.js` — pure-position occupancy
- `codex/core/pixelbrain/iso-projector.js` — visible face extraction + painter's sort
- `codex/core/pixelbrain/biome-coherence-amp.js` — neighbor negotiation loop
- `codex/core/pixelbrain/wand-seed-lift.js` — 2D coords → 3D seed points
- `codex/core/pixelbrain/voxel-svg-renderer.js` — face array → SVG string

**Modified files:**
- `codex/core/constants/schools.js` — add `SCHOOL_TO_ENERGY` export
- `codex/core/pixelbrain/material-registry.js` — add `emissionFactor` field to existing materials (needed by extended kinase)
- `codex/core/pixelbrain/qbit-phosphorylation.js` — extend `kinase.call` to accept `qbitEnergy`, `qbitGradient`; return `emission`, `materialBleed`
- `codex/core/pixelbrain/symmetry-amp.js` — add `applyAsymmetryToLattice` + three microprocessors + handle `sourceType: 'formula'`

**Test files:**
- `tests/pixelbrain/voxel-volume.test.js`
- `tests/pixelbrain/qbit-field.test.js`
- `tests/pixelbrain/hollowness-amp.test.js`
- `tests/pixelbrain/iso-projector.test.js`
- `tests/pixelbrain/biome-coherence-amp.test.js`
- `tests/pixelbrain/wand-seed-lift.test.js`
- `tests/pixelbrain/voxel-svg-renderer.test.js`
- `tests/pixelbrain/voxel-pipeline.test.js` — Level 1 integration test

---

## Task 1: SCHOOL_TO_ENERGY + emissionFactor on materials

**Files:**
- Modify: `codex/core/constants/schools.js`
- Modify: `codex/core/pixelbrain/material-registry.js`

- [ ] **Step 1: Add SCHOOL_TO_ENERGY export to schools.js**

At the bottom of `codex/core/constants/schools.js`, after the existing exports, add:

```js
export const SCHOOL_TO_ENERGY = Object.freeze({
  SONIC:      { type: 'RESONANT',   typeId: 0, baseThreshold: 0.35, emission: 0.2 },
  PSYCHIC:    { type: 'PHOTONIC',   typeId: 1, baseThreshold: 0.30, emission: 0.4 },
  VOID:       { type: 'STRUCTURAL', typeId: 2, baseThreshold: 0.55, emission: 0.0 },
  ALCHEMY:    { type: 'THERMAL',    typeId: 3, baseThreshold: 0.25, emission: 0.7 },
  WILL:       { type: 'KINETIC',    typeId: 4, baseThreshold: 0.40, emission: 0.5 },
  NECROMANCY: { type: 'ENTROPIC',   typeId: 5, baseThreshold: 0.60, emission: 0.1 },
  ABJURATION: { type: 'SHIELDING',  typeId: 6, baseThreshold: 0.50, emission: 0.0 },
  DIVINATION: { type: 'RADIANT',    typeId: 7, baseThreshold: 0.20, emission: 0.9 },
});
```

- [ ] **Step 2: Add emissionFactor to material-registry.js**

`emissionFactor` defaults to 0 for all existing materials. The extended kinase reads it. Add it as a non-breaking field to the SOURCE_MATERIAL entry and a representative selection of non-source materials. Place after `MATERIAL_REGISTRY_VERSION`:

```js
// Add after MATERIAL_REGISTRY_VERSION declaration at top of file:
export const DEFAULT_EMISSION_FACTOR = 0;
```

Then in each material definition that has a `rules` block, add `emissionFactor: 0` to the root of the material object (not inside rules). Example for `icy_fire`:
```js
icy_fire: Object.freeze({
  id: 'icy_fire',
  label: 'Icy Fire',
  emissionFactor: 0,       // ← add this line
  category: MATERIAL_CATEGORIES.FLAME,
  anchors: Object.freeze({ ... }),
  rules: Object.freeze({ ... }),
}),
```

Apply this pattern to every material in the registry. It is a non-breaking addition — existing code that does not read `emissionFactor` is unaffected.

- [ ] **Step 3: Commit**

```bash
git add codex/core/constants/schools.js codex/core/pixelbrain/material-registry.js
git commit -m "feat(voxel): add SCHOOL_TO_ENERGY and emissionFactor to material registry"
```

---

## Task 2: VoxelVolume schema

**Files:**
- Create: `codex/core/pixelbrain/voxel-volume.js`
- Create: `tests/pixelbrain/voxel-volume.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/pixelbrain/voxel-volume.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  createVoxelVolume,
  cellIndex,
  getCellMaterialId,
  isCellOccupied,
  setCellMaterial,
  setCellOccupancy,
  ENERGY_TYPES,
} from '../../codex/core/pixelbrain/voxel-volume.js';

describe('VoxelVolume', () => {
  it('creates volume with correct dimensions', () => {
    const v = createVoxelVolume(8, 8, 8);
    expect(v.width).toBe(8);
    expect(v.height).toBe(8);
    expect(v.depth).toBe(8);
    expect(v.cells.length).toBe(512);
    expect(v.energyField.length).toBe(512);
    expect(v.energyTypes.length).toBe(512);
  });

  it('cellIndex is consistent: same input → same index', () => {
    const v = createVoxelVolume(4, 4, 4);
    const i1 = cellIndex(v, 1, 2, 3);
    const i2 = cellIndex(v, 1, 2, 3);
    expect(i1).toBe(i2);
  });

  it('cellIndex produces unique values for different cells', () => {
    const v = createVoxelVolume(4, 4, 4);
    const indices = new Set();
    for (let y = 0; y < 4; y++) {
      for (let z = 0; z < 4; z++) {
        for (let x = 0; x < 4; x++) {
          indices.add(cellIndex(v, x, y, z));
        }
      }
    }
    expect(indices.size).toBe(64);
  });

  it('setCellMaterial + getCellMaterialId round-trips', () => {
    const v = createVoxelVolume(4, 4, 4);
    setCellMaterial(v, 1, 2, 3, 7);
    expect(getCellMaterialId(v, 1, 2, 3)).toBe(7);
  });

  it('setCellOccupancy + isCellOccupied round-trips', () => {
    const v = createVoxelVolume(4, 4, 4);
    expect(isCellOccupied(v, 0, 0, 0)).toBe(false);
    setCellOccupancy(v, 0, 0, 0, true);
    expect(isCellOccupied(v, 0, 0, 0)).toBe(true);
  });

  it('material and occupancy flags are independent', () => {
    const v = createVoxelVolume(4, 4, 4);
    setCellMaterial(v, 0, 0, 0, 5);
    setCellOccupancy(v, 0, 0, 0, true);
    expect(getCellMaterialId(v, 0, 0, 0)).toBe(5);
    expect(isCellOccupied(v, 0, 0, 0)).toBe(true);
    setCellMaterial(v, 0, 0, 0, 3);
    expect(isCellOccupied(v, 0, 0, 0)).toBe(true);
    expect(getCellMaterialId(v, 0, 0, 0)).toBe(3);
  });

  it('isCellOccupied returns false for out-of-bounds', () => {
    const v = createVoxelVolume(4, 4, 4);
    expect(isCellOccupied(v, -1, 0, 0)).toBe(false);
    expect(isCellOccupied(v, 4, 0, 0)).toBe(false);
    expect(isCellOccupied(v, 0, -1, 0)).toBe(false);
  });

  it('ENERGY_TYPES has 8 entries with unique typeIds', () => {
    const ids = Object.values(ENERGY_TYPES);
    expect(ids.length).toBe(8);
    expect(new Set(ids).size).toBe(8);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/pixelbrain/voxel-volume.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement voxel-volume.js**

Create `codex/core/pixelbrain/voxel-volume.js`:

```js
export const ENERGY_TYPES = Object.freeze({
  RESONANT:   0,
  PHOTONIC:   1,
  STRUCTURAL: 2,
  THERMAL:    3,
  KINETIC:    4,
  ENTROPIC:   5,
  SHIELDING:  6,
  RADIANT:    7,
});

export function createVoxelVolume(width, height, depth) {
  const size = width * height * depth;
  return {
    width,
    height,
    depth,
    cells: new Uint16Array(size),       // packed: materialId(12 bits high) | flags(4 bits low)
    energyField: new Float32Array(size),
    energyTypes: new Uint8Array(size),
  };
}

// YZX layout: y is outermost, x is innermost
export function cellIndex(volume, x, y, z) {
  return y * volume.width * volume.depth + z * volume.width + x;
}

export function getCellMaterialId(volume, x, y, z) {
  return volume.cells[cellIndex(volume, x, y, z)] >> 4;
}

export function isCellOccupied(volume, x, y, z) {
  if (x < 0 || x >= volume.width || y < 0 || y >= volume.height || z < 0 || z >= volume.depth) {
    return false;
  }
  return (volume.cells[cellIndex(volume, x, y, z)] & 0x1) !== 0;
}

export function setCellMaterial(volume, x, y, z, materialId) {
  const i = cellIndex(volume, x, y, z);
  const flags = volume.cells[i] & 0xF;
  volume.cells[i] = (materialId << 4) | flags;
}

export function setCellOccupancy(volume, x, y, z, occupancy) {
  const i = cellIndex(volume, x, y, z);
  const matId = volume.cells[i] >> 4;
  volume.cells[i] = (matId << 4) | (occupancy ? 0x1 : 0x0);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/pixelbrain/voxel-volume.test.js
```

Expected: All 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add codex/core/pixelbrain/voxel-volume.js tests/pixelbrain/voxel-volume.test.js
git commit -m "feat(voxel): VoxelVolume typed-array schema + cell accessors"
```

---

## Task 3: QBITField propagation

**Files:**
- Create: `codex/core/pixelbrain/qbit-field.js`
- Create: `tests/pixelbrain/qbit-field.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/pixelbrain/qbit-field.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createVoxelVolume, getCellMaterialId, isCellOccupied } from '../../codex/core/pixelbrain/voxel-volume.js';
import { propagate, assignMaterial, MATERIAL_THRESHOLDS } from '../../codex/core/pixelbrain/qbit-field.js';

describe('assignMaterial', () => {
  it('returns 0 for zero energy', () => {
    expect(assignMaterial(0)).toBe(0);
  });
  it('returns earth (1) for low energy', () => {
    expect(assignMaterial(0.1)).toBe(1);
  });
  it('returns stone (2) for mid energy', () => {
    expect(assignMaterial(0.35)).toBe(2);
  });
  it('returns granite (3) for high energy', () => {
    expect(assignMaterial(0.6)).toBe(3);
  });
  it('returns crystal (4) for max energy', () => {
    expect(assignMaterial(0.75)).toBe(4);
  });
});

describe('propagate', () => {
  it('returns a field object with energyAt and gradientAt', () => {
    const v = createVoxelVolume(8, 8, 8);
    const seeds = [{ vx: 4, vy: 4, vz: 4, energy: 1.0, energyType: 0 }];
    const field = propagate(v, seeds);
    expect(typeof field.energyAt).toBe('function');
    expect(typeof field.gradientAt).toBe('function');
  });

  it('cell at seed position has energy 1.0 (normalized maximum)', () => {
    const v = createVoxelVolume(8, 8, 8);
    const seeds = [{ vx: 4, vy: 4, vz: 4, energy: 1.0, energyType: 0 }];
    const field = propagate(v, seeds);
    const energy = field.energyAt({ x: 4, y: 4, z: 4 });
    expect(energy).toBeCloseTo(1.0);
  });

  it('energy decreases with distance from seed', () => {
    const v = createVoxelVolume(16, 16, 16);
    const seeds = [{ vx: 8, vy: 8, vz: 8, energy: 1.0, energyType: 0 }];
    const field = propagate(v, seeds);
    const near = field.energyAt({ x: 8, y: 8, z: 8 });
    const mid = field.energyAt({ x: 12, y: 8, z: 8 });
    const far = field.energyAt({ x: 15, y: 8, z: 8 });
    expect(near).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(far);
  });

  it('assigns materialId from energy thresholds after propagation', () => {
    const v = createVoxelVolume(8, 8, 8);
    const seeds = [{ vx: 4, vy: 4, vz: 4, energy: 1.0, energyType: 0 }];
    propagate(v, seeds);
    // Cell at seed gets max energy → crystal (materialId 4)
    expect(getCellMaterialId(v, 4, 4, 4)).toBe(4);
  });

  it('propagates deterministically: same seeds → same field', () => {
    const v1 = createVoxelVolume(8, 8, 8);
    const v2 = createVoxelVolume(8, 8, 8);
    const seeds = [{ vx: 3, vy: 3, vz: 3, energy: 1.0, energyType: 0 }];
    const f1 = propagate(v1, seeds);
    const f2 = propagate(v2, seeds);
    expect(f1.energyAt({ x: 3, y: 3, z: 3 })).toBe(f2.energyAt({ x: 3, y: 3, z: 3 }));
    expect(f1.energyAt({ x: 0, y: 0, z: 0 })).toBe(f2.energyAt({ x: 0, y: 0, z: 0 }));
  });

  it('energyField is normalized to [0,1]', () => {
    const v = createVoxelVolume(8, 8, 8);
    const seeds = [
      { vx: 2, vy: 2, vz: 2, energy: 1.0, energyType: 0 },
      { vx: 6, vy: 6, vz: 6, energy: 1.0, energyType: 0 },
    ];
    propagate(v, seeds);
    let max = 0;
    for (let i = 0; i < v.energyField.length; i++) {
      if (v.energyField[i] > max) max = v.energyField[i];
    }
    expect(max).toBeCloseTo(1.0);
  });

  it('gradientAt returns a unit vector', () => {
    const v = createVoxelVolume(8, 8, 8);
    const seeds = [{ vx: 4, vy: 4, vz: 4, energy: 1.0, energyType: 0 }];
    const field = propagate(v, seeds);
    const g = field.gradientAt({ x: 5, y: 4, z: 4 });
    const len = Math.sqrt(g.nx ** 2 + g.ny ** 2 + g.nz ** 2);
    expect(len).toBeCloseTo(1.0, 3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/pixelbrain/qbit-field.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement qbit-field.js**

Create `codex/core/pixelbrain/qbit-field.js`:

```js
import { cellIndex, setCellMaterial } from './voxel-volume.js';

export const MATERIAL_THRESHOLDS = [
  { materialId: 1, threshold: 0.00 },
  { materialId: 2, threshold: 0.25 },
  { materialId: 3, threshold: 0.50 },
  { materialId: 4, threshold: 0.70 },
];

export function assignMaterial(energy, thresholds = MATERIAL_THRESHOLDS) {
  if (energy <= 0) return 0;
  let matId = thresholds[0].materialId;
  for (const { materialId, threshold } of thresholds) {
    if (energy >= threshold) matId = materialId;
  }
  return matId;
}

export function propagate(volume, seedPoints, options = {}) {
  const {
    attenuationModel = 'inverse_square',
    maxRadius = 48,
    energyFloor = 0.01,
  } = options;
  const { width, height, depth, energyField } = volume;
  const maxRadiusSq = maxRadius * maxRadius;

  energyField.fill(0);

  for (const seed of seedPoints) {
    const { vx, vy, vz, energy: seedEnergy } = seed;
    for (let y = 0; y < height; y++) {
      for (let z = 0; z < depth; z++) {
        for (let x = 0; x < width; x++) {
          const dx = x - vx, dy = y - vy, dz = z - vz;
          const distSq = dx * dx + dy * dy + dz * dz;
          if (distSq > maxRadiusSq) continue;
          const i = cellIndex(volume, x, y, z);
          const contrib = distSq < 1 ? seedEnergy : seedEnergy / distSq;
          energyField[i] += contrib;
        }
      }
    }
  }

  // Normalize to [0, 1]
  let maxE = 0;
  for (let i = 0; i < energyField.length; i++) {
    if (energyField[i] > maxE) maxE = energyField[i];
  }
  if (maxE > 0) {
    for (let i = 0; i < energyField.length; i++) {
      energyField[i] /= maxE;
      if (energyField[i] < energyFloor) energyField[i] = 0;
    }
  }

  // Assign materialId from energy + dominant energyType from nearest seed
  for (let y = 0; y < height; y++) {
    for (let z = 0; z < depth; z++) {
      for (let x = 0; x < width; x++) {
        const i = cellIndex(volume, x, y, z);
        const energy = energyField[i];
        setCellMaterial(volume, x, y, z, assignMaterial(energy));
        if (energy > 0 && seedPoints.length > 0) {
          let nearest = seedPoints[0], nearestDist = Infinity;
          for (const s of seedPoints) {
            const d = (x - s.vx) ** 2 + (y - s.vy) ** 2 + (z - s.vz) ** 2;
            if (d < nearestDist) { nearestDist = d; nearest = s; }
          }
          volume.energyTypes[i] = nearest.energyType ?? 0;
        }
      }
    }
  }

  return {
    energyAt(cell) {
      return volume.energyField[cellIndex(volume, cell.x, cell.y, cell.z)];
    },
    gradientAt(cell) {
      const { x, y, z } = cell;
      const e = (x2, y2, z2) => {
        if (x2 < 0 || x2 >= width || y2 < 0 || y2 >= height || z2 < 0 || z2 >= depth) return 0;
        return volume.energyField[cellIndex(volume, x2, y2, z2)];
      };
      const nx = e(x + 1, y, z) - e(x - 1, y, z);
      const ny = e(x, y + 1, z) - e(x, y - 1, z);
      const nz = e(x, y, z + 1) - e(x, y, z - 1);
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      return { nx: nx / len, ny: ny / len, nz: nz / len };
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/pixelbrain/qbit-field.test.js
```

Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add codex/core/pixelbrain/qbit-field.js tests/pixelbrain/qbit-field.test.js
git commit -m "feat(voxel): QBITField inverse-square propagation + material threshold assignment"
```

---

## Task 4: HollownessAMP

**Files:**
- Create: `codex/core/pixelbrain/hollowness-amp.js`
- Create: `tests/pixelbrain/hollowness-amp.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/pixelbrain/hollowness-amp.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createVoxelVolume, isCellOccupied } from '../../codex/core/pixelbrain/voxel-volume.js';
import { computeHollownessAMP, applyHollownessAMP, HOLLOW_THRESHOLD } from '../../codex/core/pixelbrain/hollowness-amp.js';

const formula = { iterations: 8 };

describe('computeHollownessAMP', () => {
  it('returns a value in [0, 1)', () => {
    const v = createVoxelVolume(32, 32, 32);
    for (let x = 0; x < 32; x += 4) {
      for (let z = 0; z < 32; z += 4) {
        const h = computeHollownessAMP({ x, y: 0, z }, formula, v);
        expect(h).toBeGreaterThanOrEqual(0);
        expect(h).toBeLessThan(1);
      }
    }
  });

  it('is deterministic: same cell → same value', () => {
    const v = createVoxelVolume(32, 32, 32);
    const h1 = computeHollownessAMP({ x: 10, y: 5, z: 10 }, formula, v);
    const h2 = computeHollownessAMP({ x: 10, y: 5, z: 10 }, formula, v);
    expect(h1).toBe(h2);
  });

  it('is independent of y (pure XZ function)', () => {
    const v = createVoxelVolume(32, 32, 32);
    const h1 = computeHollownessAMP({ x: 10, y: 0, z: 10 }, formula, v);
    const h2 = computeHollownessAMP({ x: 10, y: 15, z: 10 }, formula, v);
    expect(h1).toBe(h2);
  });
});

describe('applyHollownessAMP', () => {
  it('marks cells as occupied only where energy > 0 AND hollowness > threshold', () => {
    const v = createVoxelVolume(8, 8, 8);
    // Set energy for one cell
    const { cellIndex } = await import('../../codex/core/pixelbrain/voxel-volume.js');
    v.energyField[0] = 0.9; // cell (0,0,0)
    applyHollownessAMP(v, formula);
    // Whether occupied depends on hollowness at (0,0,0):
    const h = computeHollownessAMP({ x: 0, y: 0, z: 0 }, formula, v);
    expect(isCellOccupied(v, 0, 0, 0)).toBe(h > HOLLOW_THRESHOLD);
  });

  it('never marks zero-energy cells as occupied', () => {
    const v = createVoxelVolume(8, 8, 8);
    // energyField is all zeros
    applyHollownessAMP(v, formula);
    for (let y = 0; y < 8; y++) {
      for (let z = 0; z < 8; z++) {
        for (let x = 0; x < 8; x++) {
          expect(isCellOccupied(v, x, y, z)).toBe(false);
        }
      }
    }
  });

  it('preserves materialId when setting occupancy', () => {
    const v = createVoxelVolume(8, 8, 8);
    const { setCellMaterial, getCellMaterialId } = await import('../../codex/core/pixelbrain/voxel-volume.js');
    setCellMaterial(v, 3, 3, 3, 7);
    v.energyField[v.width * v.depth * 3 + v.width * 3 + 3] = 1.0;
    applyHollownessAMP(v, formula);
    expect(getCellMaterialId(v, 3, 3, 3)).toBe(7);
  });
});
```

Note: The test uses `await import(...)` in non-async `it` blocks. Rewrite as regular imports at the top of the file instead:

```js
import { describe, it, expect } from 'vitest';
import {
  createVoxelVolume,
  isCellOccupied,
  setCellMaterial,
  getCellMaterialId,
  cellIndex,
} from '../../codex/core/pixelbrain/voxel-volume.js';
import { computeHollownessAMP, applyHollownessAMP, HOLLOW_THRESHOLD } from '../../codex/core/pixelbrain/hollowness-amp.js';

const formula = { iterations: 8 };

describe('computeHollownessAMP', () => {
  it('returns a value in [0, 1)', () => {
    const v = createVoxelVolume(32, 32, 32);
    for (let x = 0; x < 32; x += 4) {
      for (let z = 0; z < 32; z += 4) {
        const h = computeHollownessAMP({ x, y: 0, z }, formula, v);
        expect(h).toBeGreaterThanOrEqual(0);
        expect(h).toBeLessThan(1);
      }
    }
  });

  it('is deterministic', () => {
    const v = createVoxelVolume(32, 32, 32);
    const h1 = computeHollownessAMP({ x: 10, y: 5, z: 10 }, formula, v);
    const h2 = computeHollownessAMP({ x: 10, y: 5, z: 10 }, formula, v);
    expect(h1).toBe(h2);
  });

  it('is independent of y', () => {
    const v = createVoxelVolume(32, 32, 32);
    const h1 = computeHollownessAMP({ x: 10, y: 0, z: 10 }, formula, v);
    const h2 = computeHollownessAMP({ x: 10, y: 15, z: 10 }, formula, v);
    expect(h1).toBe(h2);
  });
});

describe('applyHollownessAMP', () => {
  it('never marks zero-energy cells as occupied', () => {
    const v = createVoxelVolume(8, 8, 8);
    applyHollownessAMP(v, formula);
    for (let y = 0; y < 8; y++) {
      for (let z = 0; z < 8; z++) {
        for (let x = 0; x < 8; x++) {
          expect(isCellOccupied(v, x, y, z)).toBe(false);
        }
      }
    }
  });

  it('marks cells occupied based on hollowness when energy > 0', () => {
    const v = createVoxelVolume(8, 8, 8);
    v.energyField[cellIndex(v, 4, 4, 4)] = 0.9;
    applyHollownessAMP(v, formula);
    const h = computeHollownessAMP({ x: 4, y: 4, z: 4 }, formula, v);
    expect(isCellOccupied(v, 4, 4, 4)).toBe(h > HOLLOW_THRESHOLD);
  });

  it('preserves materialId when applying occupancy', () => {
    const v = createVoxelVolume(8, 8, 8);
    setCellMaterial(v, 3, 3, 3, 7);
    v.energyField[cellIndex(v, 3, 3, 3)] = 1.0;
    applyHollownessAMP(v, formula);
    expect(getCellMaterialId(v, 3, 3, 3)).toBe(7);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/pixelbrain/hollowness-amp.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement hollowness-amp.js**

Create `codex/core/pixelbrain/hollowness-amp.js`:

```js
import { cellIndex } from './voxel-volume.js';

export const HOLLOW_THRESHOLD = 0.4;
const PHI = 1.6180339887;

// Pure position function — no summation, no random, no energy accumulation.
// Occupancy is decoupled from the QBIT energy field entirely.
export function computeHollownessAMP(cell, formula, volume) {
  const nx = cell.x / volume.width;
  const nz = cell.z / volume.depth;
  const dist = Math.sqrt((nx - 0.5) ** 2 + (nz - 0.5) ** 2);
  return (dist * PHI * (formula.iterations ?? 8)) % 1.0;
}

export function applyHollownessAMP(volume, formula) {
  const { width, height, depth } = volume;
  for (let y = 0; y < height; y++) {
    for (let z = 0; z < depth; z++) {
      for (let x = 0; x < width; x++) {
        const i = cellIndex(volume, x, y, z);
        const hasEnergy = volume.energyField[i] > 0;
        const h = computeHollownessAMP({ x, y, z }, formula, volume);
        const solid = hasEnergy && h > HOLLOW_THRESHOLD;
        const matId = volume.cells[i] >> 4;
        volume.cells[i] = (matId << 4) | (solid ? 0x1 : 0x0);
      }
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/pixelbrain/hollowness-amp.test.js
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add codex/core/pixelbrain/hollowness-amp.js tests/pixelbrain/hollowness-amp.test.js
git commit -m "feat(voxel): HollownessAMP — pure position occupancy, zero summation dependency"
```

---

## Task 5: IsoProjector

**Files:**
- Create: `codex/core/pixelbrain/iso-projector.js`
- Create: `tests/pixelbrain/iso-projector.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/pixelbrain/iso-projector.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createVoxelVolume, setCellOccupancy, setCellMaterial } from '../../codex/core/pixelbrain/voxel-volume.js';
import { project, ISO_TILE_SIZE } from '../../codex/core/pixelbrain/iso-projector.js';

describe('IsoProjector', () => {
  it('returns empty array for volume with no occupied cells', () => {
    const v = createVoxelVolume(4, 4, 4);
    expect(project(v)).toEqual([]);
  });

  it('produces up to 3 faces per solid cell (top, left, right)', () => {
    const v = createVoxelVolume(4, 4, 4);
    setCellOccupancy(v, 2, 0, 2, true);
    const faces = project(v);
    // Isolated cell: top face always visible; left (x-1=1 is empty) and right (z+1=3 is empty) also visible
    expect(faces.length).toBe(3);
    const types = new Set(faces.map(f => f.type));
    expect(types.has('top')).toBe(true);
    expect(types.has('left')).toBe(true);
    expect(types.has('right')).toBe(true);
  });

  it('top face hidden when cell directly above is solid', () => {
    const v = createVoxelVolume(4, 4, 4);
    setCellOccupancy(v, 2, 0, 2, true);
    setCellOccupancy(v, 2, 1, 2, true); // block above
    const faces = project(v);
    const topFacesAt020 = faces.filter(f => f.type === 'top' && f.x === 2 && f.y === 0 && f.z === 2);
    expect(topFacesAt020.length).toBe(0);
  });

  it('left face hidden when adjacent x-1 cell is solid', () => {
    const v = createVoxelVolume(4, 4, 4);
    setCellOccupancy(v, 2, 0, 2, true);
    setCellOccupancy(v, 1, 0, 2, true); // block to left
    const faces = project(v);
    const leftFacesAtTarget = faces.filter(f => f.type === 'left' && f.x === 2 && f.y === 0 && f.z === 2);
    expect(leftFacesAtTarget.length).toBe(0);
  });

  it('faces are sorted by sortKey ascending (back-to-front)', () => {
    const v = createVoxelVolume(8, 4, 8);
    for (let x = 0; x < 8; x++) {
      for (let z = 0; z < 8; z++) {
        setCellOccupancy(v, x, 0, z, true);
      }
    }
    const faces = project(v);
    for (let i = 1; i < faces.length; i++) {
      expect(faces[i].sortKey).toBeGreaterThanOrEqual(faces[i - 1].sortKey);
    }
  });

  it('each face includes voxel coordinates, materialId, and screen position', () => {
    const v = createVoxelVolume(4, 4, 4);
    setCellOccupancy(v, 1, 0, 1, true);
    setCellMaterial(v, 1, 0, 1, 3);
    const faces = project(v);
    const top = faces.find(f => f.type === 'top');
    expect(top).toBeDefined();
    expect(top.x).toBe(1);
    expect(top.y).toBe(0);
    expect(top.z).toBe(1);
    expect(top.materialId).toBe(3);
    expect(typeof top.sx).toBe('number');
    expect(typeof top.sy).toBe('number');
  });

  it('screen position sx = (x - z) * tileSize', () => {
    const v = createVoxelVolume(8, 4, 8);
    setCellOccupancy(v, 3, 0, 5, true);
    const faces = project(v, { tileSize: 16 });
    const top = faces.find(f => f.type === 'top' && f.x === 3 && f.z === 5);
    expect(top).toBeDefined();
    expect(top.sx).toBe((3 - 5) * 16);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/pixelbrain/iso-projector.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement iso-projector.js**

Create `codex/core/pixelbrain/iso-projector.js`:

```js
import { isCellOccupied, getCellMaterialId, cellIndex } from './voxel-volume.js';

export const ISO_TILE_SIZE = 16;

export function project(volume, options = {}) {
  const { tileSize = ISO_TILE_SIZE } = options;
  const faces = [];

  for (let y = 0; y < volume.height; y++) {
    for (let z = 0; z < volume.depth; z++) {
      for (let x = 0; x < volume.width; x++) {
        if (!isCellOccupied(volume, x, y, z)) continue;

        const materialId = getCellMaterialId(volume, x, y, z);
        const i = cellIndex(volume, x, y, z);
        const energy = volume.energyField[i];
        const energyType = volume.energyTypes[i];
        const sx = (x - z) * tileSize;
        const sy = (x + z) * (tileSize / 2) - y * tileSize;
        const sortKey = (z + y) * 10000 + x * 10 + materialId;

        if (!isCellOccupied(volume, x, y + 1, z)) {
          faces.push({ type: 'top', x, y, z, materialId, sx, sy, sortKey, energy, energyType });
        }
        if (!isCellOccupied(volume, x - 1, y, z)) {
          faces.push({ type: 'left', x, y, z, materialId, sx, sy, sortKey: sortKey - 0.1, energy, energyType });
        }
        if (!isCellOccupied(volume, x, y, z + 1)) {
          faces.push({ type: 'right', x, y, z, materialId, sx, sy, sortKey: sortKey - 0.05, energy, energyType });
        }
      }
    }
  }

  faces.sort((a, b) => a.sortKey - b.sortKey);
  return faces;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/pixelbrain/iso-projector.test.js
```

Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add codex/core/pixelbrain/iso-projector.js tests/pixelbrain/iso-projector.test.js
git commit -m "feat(voxel): IsoProjector — visible face extraction with painter's algorithm sort"
```

---

## Task 6: Extended phosphorylation (backward-compatible)

**Files:**
- Modify: `codex/core/pixelbrain/qbit-phosphorylation.js`

No separate test file — the existing phosphorylation tests (if any) must continue to pass. The extension is backward-compatible.

- [ ] **Step 1: Extend buildKinase call signature**

In `codex/core/pixelbrain/qbit-phosphorylation.js`, change the `call` method inside `buildKinase`:

Before:
```js
call({ sdfValue, normal }) {
  if (sdfValue > 0) return { color: null, confidence: 0 };
  // ...
  return { color, confidence };
},
```

After:
```js
call({ sdfValue, normal, qbitEnergy, qbitGradient }) {
  if (sdfValue > 0) return { color: null, confidence: 0, emission: 0, materialBleed: null };

  const depth = Math.min(1, -sdfValue / 20);

  const lightNx = -0.707, lightNy = -0.707;
  const lit = Math.max(0, normal.nx * lightNx + normal.ny * lightNy);
  const shading = 0.4 + 0.6 * lit;

  if (anchors.length === 0) return { color: null, confidence: 0, emission: 0, materialBleed: null };

  const idx = Math.min(anchors.length - 1, Math.floor(depth * anchors.length));
  const baseColor = anchors[idx];

  if (!HEX_COLOR_RE.test(baseColor)) return { color: null, confidence: 0, emission: 0, materialBleed: null };

  const color = shadedHex(baseColor, shading);
  const confidence = 0.5 + 0.5 * depth;

  // qbitEnergy extends shading; falls back to SDF depth when absent
  const effectiveEnergy = qbitEnergy ?? depth;
  const emission = effectiveEnergy * (material.emissionFactor ?? 0);

  return { color, confidence, emission, materialBleed: null };
},
```

- [ ] **Step 2: Update the existing phosphorylate function call site**

The `phosphorylate` function calls `kinase.call({ sdfValue, normal })` at line ~71. This still works because the new `qbitEnergy` and `qbitGradient` params are optional. No change needed there — the fallback `qbitEnergy ?? depth` handles the absence.

- [ ] **Step 3: Verify existing tests still pass**

```bash
npx vitest run tests/pixelbrain/
```

Expected: All existing pixelbrain tests pass. No regressions.

- [ ] **Step 4: Commit**

```bash
git add codex/core/pixelbrain/qbit-phosphorylation.js
git commit -m "feat(voxel): extend kinase.call to accept qbitEnergy/qbitGradient — backward compatible"
```

---

## Task 7: SymmetryAMP asymmetry extension

**Files:**
- Modify: `codex/core/pixelbrain/symmetry-amp.js`
- Create: `tests/pixelbrain/symmetry-amp-asymmetry.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/pixelbrain/symmetry-amp-asymmetry.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  rotationalBreaker,
  lateralDrift,
  verticalVariance,
  applyAsymmetryToLattice,
  runSymmetryAmpProcessor,
} from '../../codex/core/pixelbrain/symmetry-amp.js';

function makeLattice(cols, rows) {
  const cells = new Map();
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      cells.set(`${col},${row}`, { col, row, color: '#ff0000', emphasis: 1 });
    }
  }
  return { cols, rows, cells };
}

describe('rotationalBreaker', () => {
  it('returns a function', () => {
    expect(typeof rotationalBreaker()).toBe('function');
  });

  it('produces deterministic output for same cell', () => {
    const mp = rotationalBreaker(0.3);
    const cell = { col: 5, row: 3 };
    const d1 = mp(cell, 10, 10);
    const d2 = mp(cell, 10, 10);
    expect(d1.dc).toBe(d2.dc);
    expect(d1.dr).toBe(d2.dr);
  });
});

describe('lateralDrift', () => {
  it('returns a function', () => {
    expect(typeof lateralDrift()).toBe('function');
  });

  it('dr is always 0 (lateral only)', () => {
    const mp = lateralDrift(0.5);
    for (let c = 0; c < 10; c++) {
      const d = mp({ col: c, row: c });
      expect(d.dr).toBe(0);
    }
  });
});

describe('verticalVariance', () => {
  it('returns a function', () => {
    expect(typeof verticalVariance()).toBe('function');
  });

  it('dc is always 0 (vertical only)', () => {
    const mp = verticalVariance(1.2);
    for (let c = 0; c < 10; c++) {
      const d = mp({ col: c, row: c }, 10);
      expect(d.dc).toBe(0);
    }
  });
});

describe('applyAsymmetryToLattice', () => {
  it('returns a new lattice object', () => {
    const lattice = makeLattice(4, 4);
    const symmetry = { type: 'radial', confidence: 0.9, significant: true };
    const result = applyAsymmetryToLattice(lattice, symmetry, [lateralDrift(0.5)]);
    expect(result).not.toBe(lattice);
    expect(result.cols).toBe(lattice.cols);
    expect(result.rows).toBe(lattice.rows);
  });

  it('preserves cell count', () => {
    const lattice = makeLattice(4, 4);
    const symmetry = { type: 'radial', confidence: 0.9, significant: true };
    const result = applyAsymmetryToLattice(lattice, symmetry, [
      rotationalBreaker(0.3),
      lateralDrift(0.5),
      verticalVariance(1.2),
    ]);
    expect(result.cells.size).toBe(lattice.cells.size);
  });
});

describe('runSymmetryAmpProcessor with sourceType formula', () => {
  it('handles sourceType: formula without error when pixelData missing', () => {
    // formula source doesn't need pixelData — it should not error out
    const result = runSymmetryAmpProcessor({
      assetId: 'test',
      sourceType: 'formula',
      options: { autoApply: false },
    });
    // Without pixelData, returns ok:false — verify it handles formula sourceType gracefully
    expect(result.assetId).toBe('test');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/pixelbrain/symmetry-amp-asymmetry.test.js
```

Expected: FAIL — `rotationalBreaker`, `lateralDrift`, `verticalVariance`, `applyAsymmetryToLattice` are not exported.

- [ ] **Step 3: Add asymmetry exports to symmetry-amp.js**

At the bottom of `codex/core/pixelbrain/symmetry-amp.js`, before the `SymmetryProcessor` export, add:

```js
/**
 * Asymmetry microprocessors — deterministic positional drift functions.
 * All three are pure functions of cell position: no random seed, no summation.
 * Used to break radial symmetry produced by formula-seeded voxel terrain.
 */

export function rotationalBreaker(strength = 0.3) {
  return function (cell, cols, rows) {
    const angle = Math.atan2(cell.row - rows / 2, cell.col - cols / 2);
    const hash = Math.sin(angle * 127.1) * 43758.5453;
    const drift = (hash - Math.floor(hash)) * strength;
    return {
      dc: Math.cos(angle + Math.PI / 2) * drift,
      dr: Math.sin(angle + Math.PI / 2) * drift,
    };
  };
}

export function lateralDrift(strength = 0.5) {
  return function (cell) {
    const hash = Math.sin(cell.col * 127.1 + cell.row * 311.7) * 43758.5453;
    return { dc: (hash - Math.floor(hash) - 0.5) * strength, dr: 0 };
  };
}

export function verticalVariance(strength = 1.2) {
  return function (cell, cols) {
    const hash = Math.sin((cell.col / cols) * 523.7) * 43758.5453;
    return { dc: 0, dr: (hash - Math.floor(hash) - 0.5) * strength };
  };
}

/**
 * Apply asymmetry microprocessors to a lattice.
 * Displaces each cell by the summed delta from all microprocessors.
 * When two cells land on the same position, last write wins (Map key overwrite).
 */
export function applyAsymmetryToLattice(lattice, symmetry, microprocessors) {
  const { cols, rows, cells } = lattice;
  const newCells = new Map();

  cells.forEach((cell) => {
    let dc = 0, dr = 0;
    for (const mp of microprocessors) {
      const delta = mp(cell, cols, rows);
      dc += delta.dc;
      dr += delta.dr;
    }
    const newCol = Math.round(Math.max(0, Math.min(cols - 1, cell.col + dc)));
    const newRow = Math.round(Math.max(0, Math.min(rows - 1, cell.row + dr)));
    const newKey = `${newCol},${newRow}`;
    newCells.set(newKey, { ...cell, col: newCol, row: newRow });
  });

  return { ...lattice, cells: newCells };
}
```

Also update the `runSymmetryAmpProcessor` STEP 5 block to handle `sourceType: 'formula'`:

Find this block:
```js
  // STEP 5: Apply to lattice (if autoApply + lattice provided + significant)
  let modifiedLattice;
  if (options.autoApply && input.lattice && normalizedSymmetry.significant && normalizedSymmetry.type !== 'none') {
    modifiedLattice = applySymmetryToLattice(input.lattice, normalizedSymmetry);
    diagnostics.push(`AUTO_APPLIED: ${normalizedSymmetry.type} symmetry to lattice`);
  }
```

Replace with:
```js
  // STEP 5: Apply to lattice (if autoApply + lattice provided + significant)
  let modifiedLattice;
  if (options.autoApply && input.lattice && normalizedSymmetry.significant && normalizedSymmetry.type !== 'none') {
    if (input.sourceType === 'formula' && (normalizedSymmetry.scores?.radial ?? 0) > 0.65) {
      modifiedLattice = applyAsymmetryToLattice(input.lattice, normalizedSymmetry, [
        rotationalBreaker(0.3),
        lateralDrift(0.5),
        verticalVariance(1.2),
      ]);
      diagnostics.push('AUTO_ASYMMETRIZED: formula source with high radial confidence');
    } else {
      modifiedLattice = applySymmetryToLattice(input.lattice, normalizedSymmetry);
      diagnostics.push(`AUTO_APPLIED: ${normalizedSymmetry.type} symmetry to lattice`);
    }
  }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/pixelbrain/symmetry-amp-asymmetry.test.js
```

Expected: All 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add codex/core/pixelbrain/symmetry-amp.js tests/pixelbrain/symmetry-amp-asymmetry.test.js
git commit -m "feat(voxel): SymmetryAMP asymmetry microprocessors + formula sourceType handling"
```

---

## Task 8: BiomeCoherenceAMP

**Files:**
- Create: `codex/core/pixelbrain/biome-coherence-amp.js`
- Create: `tests/pixelbrain/biome-coherence-amp.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/pixelbrain/biome-coherence-amp.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  createVoxelVolume,
  setCellMaterial,
  setCellOccupancy,
  getCellMaterialId,
  cellIndex,
} from '../../codex/core/pixelbrain/voxel-volume.js';
import { runBiomeCoherenceAMP, getNeighbors6, NEGOTIATION_THRESHOLD } from '../../codex/core/pixelbrain/biome-coherence-amp.js';

function makeField(volume, energies) {
  for (const [x, y, z, e] of energies) {
    volume.energyField[cellIndex(volume, x, y, z)] = e;
  }
  return {
    energyAt: (cell) => volume.energyField[cellIndex(volume, cell.x, cell.y, cell.z)],
  };
}

describe('getNeighbors6', () => {
  it('returns up to 6 occupied neighbors', () => {
    const v = createVoxelVolume(4, 4, 4);
    // Set center and all 6 neighbors as occupied
    for (const [x, y, z] of [[1,1,1],[0,1,1],[2,1,1],[1,0,1],[1,2,1],[1,1,0],[1,1,2]]) {
      setCellOccupancy(v, x, y, z, true);
      setCellMaterial(v, x, y, z, 2);
    }
    const neighbors = getNeighbors6({ x: 1, y: 1, z: 1 }, v);
    expect(neighbors.length).toBe(6);
  });

  it('ignores empty (non-occupied) neighbors', () => {
    const v = createVoxelVolume(4, 4, 4);
    setCellOccupancy(v, 1, 1, 1, true);
    const neighbors = getNeighbors6({ x: 1, y: 1, z: 1 }, v);
    expect(neighbors.length).toBe(0);
  });
});

describe('runBiomeCoherenceAMP', () => {
  it('does not change materials when all cells already agree', () => {
    const v = createVoxelVolume(4, 4, 4);
    for (let x = 0; x < 4; x++) {
      for (let z = 0; z < 4; z++) {
        setCellOccupancy(v, x, 0, z, true);
        setCellMaterial(v, x, 0, z, 2);
        v.energyField[cellIndex(v, x, 0, z)] = 0.5;
      }
    }
    const field = makeField(v, []);
    field.energyAt = (cell) => v.energyField[cellIndex(v, cell.x, cell.y, cell.z)];
    runBiomeCoherenceAMP(v, field);
    // All cells should still be materialId 2
    for (let x = 0; x < 4; x++) {
      for (let z = 0; z < 4; z++) {
        expect(getCellMaterialId(v, x, 0, z)).toBe(2);
      }
    }
  });

  it('lone cell with different material flips to majority when energetically similar', () => {
    const v = createVoxelVolume(4, 4, 4);
    // 3x1 row: cells at x=0,1,2 all mat=2 with energy ~0.5
    // Cell at x=3 mat=3 with energy 0.5 (no real boundary)
    for (let x = 0; x < 4; x++) {
      setCellOccupancy(v, x, 0, 0, true);
      setCellMaterial(v, x, 0, 0, x < 3 ? 2 : 3);
      v.energyField[cellIndex(v, x, 0, 0)] = 0.5;
    }
    const field = { energyAt: (cell) => v.energyField[cellIndex(v, cell.x, cell.y, cell.z)] };
    runBiomeCoherenceAMP(v, field);
    // cell at x=3 should flip to 2 (majority neighbor)
    expect(getCellMaterialId(v, 3, 0, 0)).toBe(2);
  });

  it('preserves biome boundary where energy delta > NEGOTIATION_THRESHOLD', () => {
    const v = createVoxelVolume(4, 4, 4);
    // Two cells side by side with very different energies
    setCellOccupancy(v, 0, 0, 0, true);
    setCellMaterial(v, 0, 0, 0, 2);
    v.energyField[cellIndex(v, 0, 0, 0)] = 0.2;
    setCellOccupancy(v, 1, 0, 0, true);
    setCellMaterial(v, 1, 0, 0, 4);
    v.energyField[cellIndex(v, 1, 0, 0)] = 0.9;
    const field = { energyAt: (cell) => v.energyField[cellIndex(v, cell.x, cell.y, cell.z)] };
    runBiomeCoherenceAMP(v, field);
    // Energy delta = 0.7 >> NEGOTIATION_THRESHOLD — boundary preserved
    expect(getCellMaterialId(v, 0, 0, 0)).toBe(2);
    expect(getCellMaterialId(v, 1, 0, 0)).toBe(4);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/pixelbrain/biome-coherence-amp.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement biome-coherence-amp.js**

Create `codex/core/pixelbrain/biome-coherence-amp.js`:

```js
import { cellIndex, getCellMaterialId, setCellMaterial, isCellOccupied } from './voxel-volume.js';

export const NEGOTIATION_THRESHOLD = 0.05;

export function getNeighbors6(cell, volume) {
  const { x, y, z } = cell;
  return [
    [x + 1, y, z], [x - 1, y, z],
    [x, y + 1, z], [x, y - 1, z],
    [x, y, z + 1], [x, y, z - 1],
  ]
    .filter(([nx, ny, nz]) => isCellOccupied(volume, nx, ny, nz))
    .map(([nx, ny, nz]) => ({ x: nx, y: ny, z: nz, materialId: getCellMaterialId(volume, nx, ny, nz) }));
}

function majorityMaterial(cell, neighbors) {
  const counts = new Map();
  for (const n of neighbors) {
    counts.set(n.materialId, (counts.get(n.materialId) ?? 0) + 1);
  }
  let best = cell.materialId, bestCount = 0;
  counts.forEach((count, matId) => {
    if (count > bestCount) { bestCount = count; best = matId; }
  });
  return best;
}

export function runBiomeCoherenceAMP(volume, field) {
  let unstable = true;
  while (unstable) {
    unstable = false;
    for (let y = 0; y < volume.height; y++) {
      for (let z = 0; z < volume.depth; z++) {
        for (let x = 0; x < volume.width; x++) {
          if (!isCellOccupied(volume, x, y, z)) continue;
          const cell = { x, y, z, materialId: getCellMaterialId(volume, x, y, z) };
          const neighbors = getNeighbors6(cell, volume);
          if (neighbors.length === 0) continue;
          for (const neighbor of neighbors) {
            if (neighbor.materialId === cell.materialId) continue;
            const energyDelta = Math.abs(field.energyAt(cell) - field.energyAt(neighbor));
            if (energyDelta < NEGOTIATION_THRESHOLD) {
              const majority = majorityMaterial(cell, neighbors);
              if (majority !== cell.materialId) {
                setCellMaterial(volume, x, y, z, majority);
                cell.materialId = majority;
                unstable = true;
                break;
              }
            }
          }
        }
      }
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/pixelbrain/biome-coherence-amp.test.js
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add codex/core/pixelbrain/biome-coherence-amp.js tests/pixelbrain/biome-coherence-amp.test.js
git commit -m "feat(voxel): BiomeCoherenceAMP — self-organizing material negotiation"
```

---

## Task 9: Wand seed lift

**Files:**
- Create: `codex/core/pixelbrain/wand-seed-lift.js`
- Create: `tests/pixelbrain/wand-seed-lift.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/pixelbrain/wand-seed-lift.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createVoxelVolume, ENERGY_TYPES } from '../../codex/core/pixelbrain/voxel-volume.js';
import { liftToVoxelSeeds, generateFibonacciSeeds, SEED_CONFIGS } from '../../codex/core/pixelbrain/wand-seed-lift.js';

describe('SEED_CONFIGS', () => {
  it('has all 6 formula types', () => {
    const keys = Object.keys(SEED_CONFIGS);
    expect(keys).toContain('fibonacci');
    expect(keys).toContain('fractal_iter');
    expect(keys).toContain('parametric_curve');
    expect(keys).toContain('vectorized_text');
  });
});

describe('liftToVoxelSeeds', () => {
  it('converts 2D coords to 3D seed points', () => {
    const v = createVoxelVolume(32, 32, 32);
    const coords2D = [{ x: 400, y: 300 }, { x: 200, y: 100 }];
    const seeds = liftToVoxelSeeds(coords2D, v, { canvasSize: { width: 800, height: 600 } });
    expect(seeds.length).toBe(2);
    for (const seed of seeds) {
      expect(seed.vx).toBeGreaterThanOrEqual(0);
      expect(seed.vx).toBeLessThan(32);
      expect(seed.vy).toBeGreaterThanOrEqual(0);
      expect(seed.vy).toBeLessThan(32);
      expect(seed.vz).toBeGreaterThanOrEqual(0);
      expect(seed.vz).toBeLessThan(32);
    }
  });

  it('each seed has energy and energyType fields', () => {
    const v = createVoxelVolume(32, 32, 32);
    const coords2D = [{ x: 400, y: 300 }];
    const seeds = liftToVoxelSeeds(coords2D, v);
    expect(seeds[0].energy).toBeDefined();
    expect(typeof seeds[0].energyType).toBe('number');
  });

  it('clamps out-of-canvas coords to volume bounds', () => {
    const v = createVoxelVolume(32, 32, 32);
    const coords2D = [{ x: -100, y: 5000 }];
    const seeds = liftToVoxelSeeds(coords2D, v);
    expect(seeds[0].vx).toBeGreaterThanOrEqual(0);
    expect(seeds[0].vz).toBeLessThan(32);
  });

  it('is deterministic', () => {
    const v = createVoxelVolume(32, 32, 32);
    const coords2D = [{ x: 400, y: 300 }];
    const s1 = liftToVoxelSeeds(coords2D, v);
    const s2 = liftToVoxelSeeds(coords2D, v);
    expect(s1[0].vx).toBe(s2[0].vx);
    expect(s1[0].vz).toBe(s2[0].vz);
  });
});

describe('generateFibonacciSeeds', () => {
  it('generates multiple seeds from Fibonacci formula', () => {
    const v = createVoxelVolume(32, 32, 32);
    const seeds = generateFibonacciSeeds({ iterations: 6, scale: 0.75 }, v);
    expect(seeds.length).toBeGreaterThan(10);
  });

  it('all seeds are within volume bounds', () => {
    const v = createVoxelVolume(32, 32, 32);
    const seeds = generateFibonacciSeeds({ iterations: 8, scale: 0.75 }, v);
    for (const seed of seeds) {
      expect(seed.vx).toBeGreaterThanOrEqual(0);
      expect(seed.vx).toBeLessThan(32);
      expect(seed.vy).toBeGreaterThanOrEqual(0);
      expect(seed.vy).toBeLessThan(32);
      expect(seed.vz).toBeGreaterThanOrEqual(0);
      expect(seed.vz).toBeLessThan(32);
    }
  });

  it('is deterministic', () => {
    const v = createVoxelVolume(32, 32, 32);
    const s1 = generateFibonacciSeeds({ iterations: 6, scale: 0.75 }, v);
    const s2 = generateFibonacciSeeds({ iterations: 6, scale: 0.75 }, v);
    expect(s1.length).toBe(s2.length);
    expect(s1[0].vx).toBe(s2[0].vx);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/pixelbrain/wand-seed-lift.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement wand-seed-lift.js**

Create `codex/core/pixelbrain/wand-seed-lift.js`:

```js
import { ENERGY_TYPES } from './voxel-volume.js';

export const SEED_CONFIGS = Object.freeze({
  'fibonacci':        { lift: 'surface_scatter',   energySpread: 'radial'    },
  'fractal_iter':     { lift: 'recursive_columns',  energySpread: 'fractal'   },
  'parametric_curve': { lift: 'terrain_ridge',      energySpread: 'linear'    },
  'grid_projection':  { lift: 'floor_plane',        energySpread: 'uniform'   },
  'composite':        { lift: 'multi_region',       energySpread: 'blended'   },
  'vectorized_text':  { lift: 'glyph_monuments',    energySpread: 'inscribed' },
});

export function liftToVoxelSeeds(coords2D, volume, options = {}) {
  const {
    energyType = ENERGY_TYPES.STRUCTURAL,
    initialEnergy = 1.0,
    yProjection = 'surface',
    canvasSize = { width: 800, height: 600 },
  } = options;

  const surfaceY = Math.floor(volume.height * 0.75);
  const midY = Math.floor(volume.height / 2);
  const vy = yProjection === 'surface' ? surfaceY : midY;

  return coords2D.map(({ x, y }) => {
    const vx = Math.round((x / canvasSize.width) * (volume.width - 1));
    const vz = Math.round((y / canvasSize.height) * (volume.depth - 1));
    return {
      vx: Math.max(0, Math.min(volume.width - 1, vx)),
      vy: Math.max(0, Math.min(volume.height - 1, vy)),
      vz: Math.max(0, Math.min(volume.depth - 1, vz)),
      energy: initialEnergy,
      energyType,
    };
  });
}

// Generates Fibonacci golden-ratio spiral seed points directly —
// does not depend on formula-to-coordinates.js to avoid coupling.
export function generateFibonacciSeeds(formula, volume, options = {}) {
  const { iterations = 8, scale = 0.75 } = formula;
  const canvasSize = options.canvasSize ?? { width: 800, height: 600 };
  const { width: cw, height: ch } = canvasSize;
  const cx = cw / 2, cy = ch / 2;
  const phi = (1 + Math.sqrt(5)) / 2;
  // Number of points derived from golden ratio power — matches Fibonacci sequence count
  const n = Math.round(Math.pow(phi, iterations));
  const maxR = Math.min(cw, ch) * scale * 0.5;
  const coords2D = [];

  for (let i = 0; i < n; i++) {
    const angle = i * 2 * Math.PI * (1 - 1 / phi);
    const r = Math.sqrt(i / n) * maxR;
    coords2D.push({
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    });
  }

  return liftToVoxelSeeds(coords2D, volume, { ...options, canvasSize });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/pixelbrain/wand-seed-lift.test.js
```

Expected: All 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add codex/core/pixelbrain/wand-seed-lift.js tests/pixelbrain/wand-seed-lift.test.js
git commit -m "feat(voxel): wand-seed-lift — 2D formula coords → 3D QBIT seed points"
```

---

## Task 10: SVG face renderer

**Files:**
- Create: `codex/core/pixelbrain/voxel-svg-renderer.js`
- Create: `tests/pixelbrain/voxel-svg-renderer.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/pixelbrain/voxel-svg-renderer.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { renderFacesToSVG } from '../../codex/core/pixelbrain/voxel-svg-renderer.js';

function makeFace(type, x, y, z, materialId, tileSize = 16) {
  const hw = tileSize;
  const hh = tileSize / 2;
  const sx = (x - z) * tileSize;
  const sy = (x + z) * hh - y * tileSize;
  return { type, x, y, z, materialId, sx, sy, sortKey: 0, energy: 0.5, energyType: 0 };
}

describe('renderFacesToSVG', () => {
  it('returns a valid SVG string', () => {
    const faces = [makeFace('top', 0, 0, 0, 2)];
    const svg = renderFacesToSVG(faces);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('returns empty-body SVG for empty face array', () => {
    const svg = renderFacesToSVG([]);
    expect(svg).toContain('<svg');
    expect(svg).not.toContain('<polygon');
  });

  it('generates a polygon for each non-void face', () => {
    const faces = [
      makeFace('top', 0, 0, 0, 2),
      makeFace('left', 0, 0, 0, 2),
      makeFace('right', 0, 0, 0, 2),
    ];
    const svg = renderFacesToSVG(faces);
    const count = (svg.match(/<polygon/g) || []).length;
    expect(count).toBe(3);
  });

  it('skips void materialId (0) — no polygon rendered', () => {
    const faces = [makeFace('top', 0, 0, 0, 0)]; // materialId 0 = void
    const svg = renderFacesToSVG(faces);
    expect(svg).not.toContain('<polygon');
  });

  it('each polygon has a fill attribute', () => {
    const faces = [makeFace('top', 2, 0, 2, 3)];
    const svg = renderFacesToSVG(faces);
    expect(svg).toContain('fill="');
  });

  it('top face is lighter than left face (lighter tones on top)', () => {
    const top = makeFace('top', 0, 0, 0, 2);
    const left = makeFace('left', 0, 0, 0, 2);
    const svgTop = renderFacesToSVG([top]);
    const svgLeft = renderFacesToSVG([left]);
    const fillTop = svgTop.match(/fill="(#[0-9a-fA-F]+)"/)?.[1];
    const fillLeft = svgLeft.match(/fill="(#[0-9a-fA-F]+)"/)?.[1];
    expect(fillTop).toBeDefined();
    expect(fillLeft).toBeDefined();
    // Parse brightness: top should be numerically brighter (higher hex value)
    const hexVal = (h) => parseInt(h.slice(1), 16);
    expect(hexVal(fillTop)).toBeGreaterThan(hexVal(fillLeft));
  });

  it('SVG includes a viewBox attribute', () => {
    const faces = [makeFace('top', 3, 0, 3, 2)];
    const svg = renderFacesToSVG(faces);
    expect(svg).toContain('viewBox=');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/pixelbrain/voxel-svg-renderer.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement voxel-svg-renderer.js**

Create `codex/core/pixelbrain/voxel-svg-renderer.js`:

```js
// Three light levels per material: top (brightest), left (mid), right (darkest)
const MATERIAL_COLORS = {
  top:   { 1: '#6b7280', 2: '#9ca3af', 3: '#d1d5db', 4: '#bae6fd' },
  left:  { 1: '#374151', 2: '#4b5563', 3: '#6b7280', 4: '#7dd3fc' },
  right: { 1: '#1f2937', 2: '#374151', 3: '#4b5563', 4: '#38bdf8' },
};

function facePoints(face, tileSize) {
  const { type, sx, sy } = face;
  const hw = tileSize;
  const hh = tileSize / 2;
  const fh = tileSize;

  switch (type) {
    case 'top':
      return [[sx, sy], [sx + hw, sy + hh], [sx, sy + 2 * hh], [sx - hw, sy + hh]];
    case 'left':
      return [[sx - hw, sy + hh], [sx, sy + 2 * hh], [sx, sy + 2 * hh + fh], [sx - hw, sy + hh + fh]];
    case 'right':
      return [[sx, sy + 2 * hh], [sx + hw, sy + hh], [sx + hw, sy + hh + fh], [sx, sy + 2 * hh + fh]];
    default:
      return [];
  }
}

export function renderFacesToSVG(faces, options = {}) {
  const { tileSize = 16, padding = 40, background = '#0f172a' } = options;

  if (faces.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1" width="1" height="1"></svg>`;
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const face of faces) {
    for (const [px, py] of facePoints(face, tileSize)) {
      if (px < minX) minX = px;
      if (py < minY) minY = py;
      if (px > maxX) maxX = px;
      if (py > maxY) maxY = py;
    }
  }

  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;
  const ox = -minX + padding;
  const oy = -minY + padding;

  const polys = faces
    .map(face => {
      const fill = MATERIAL_COLORS[face.type]?.[face.materialId];
      if (!fill) return '';
      const pts = facePoints(face, tileSize)
        .map(([px, py]) => `${px + ox},${py + oy}`)
        .join(' ');
      return `  <polygon points="${pts}" fill="${fill}" />`;
    })
    .filter(Boolean)
    .join('\n');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
    `  <rect width="${width}" height="${height}" fill="${background}" />`,
    polys,
    `</svg>`,
  ].join('\n');
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/pixelbrain/voxel-svg-renderer.test.js
```

Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add codex/core/pixelbrain/voxel-svg-renderer.js tests/pixelbrain/voxel-svg-renderer.test.js
git commit -m "feat(voxel): SVG face renderer — isometric polygon output with material color map"
```

---

## Task 11: Level 1 integration test (The Crystal)

**Files:**
- Create: `tests/pixelbrain/voxel-pipeline.test.js`

This test exercises the entire pipeline end-to-end. It is the Level 1 success criterion from the spec: a 32³ crystal from a Fibonacci seed with coherent material clustering.

- [ ] **Step 1: Write the Level 1 integration test**

Create `tests/pixelbrain/voxel-pipeline.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createVoxelVolume, ENERGY_TYPES, getCellMaterialId, isCellOccupied } from '../../codex/core/pixelbrain/voxel-volume.js';
import { propagate } from '../../codex/core/pixelbrain/qbit-field.js';
import { applyHollownessAMP } from '../../codex/core/pixelbrain/hollowness-amp.js';
import { runBiomeCoherenceAMP } from '../../codex/core/pixelbrain/biome-coherence-amp.js';
import { project } from '../../codex/core/pixelbrain/iso-projector.js';
import { generateFibonacciSeeds } from '../../codex/core/pixelbrain/wand-seed-lift.js';
import { renderFacesToSVG } from '../../codex/core/pixelbrain/voxel-svg-renderer.js';

describe('Level 1: 32³ Fibonacci Crystal', () => {
  // Build the crystal once and reuse across all assertions
  let volume, field, faces, svg;

  beforeAll(() => {
    // Step 1: Create volume
    volume = createVoxelVolume(32, 32, 32);

    // Step 2: Generate Fibonacci seeds (iterations=8 yields ~47 points)
    const seeds = generateFibonacciSeeds(
      { iterations: 8, scale: 0.75 },
      volume,
      { energyType: ENERGY_TYPES.STRUCTURAL }
    );
    expect(seeds.length).toBeGreaterThan(0);

    // Step 3: QBIT propagation
    field = propagate(volume, seeds, {
      attenuationModel: 'inverse_square',
      maxRadius: 32,
      energyFloor: 0.01,
    });

    // Step 4: HollownessAMP
    applyHollownessAMP(volume, { iterations: 8 });

    // Step 5: BiomeCoherenceAMP
    runBiomeCoherenceAMP(volume, field);

    // Step 6: IsoProjector
    faces = project(volume);

    // Step 7: SVG render
    svg = renderFacesToSVG(faces);
  });

  it('pipeline runs without errors', () => {
    expect(svg).toBeDefined();
  });

  it('volume has at least some occupied cells', () => {
    let solidCount = 0;
    for (let y = 0; y < 32; y++) {
      for (let z = 0; z < 32; z++) {
        for (let x = 0; x < 32; x++) {
          if (isCellOccupied(volume, x, y, z)) solidCount++;
        }
      }
    }
    expect(solidCount).toBeGreaterThan(0);
    // Crystal should fill between 5% and 90% of volume
    expect(solidCount / (32 * 32 * 32)).toBeGreaterThan(0.05);
    expect(solidCount / (32 * 32 * 32)).toBeLessThan(0.9);
  });

  it('center cells have higher-energy materials than edge cells', () => {
    // Center cells should be crystal (4) or granite (3); edges should be earth (1) or stone (2)
    const centerMatId = getCellMaterialId(volume, 16, 24, 16);
    const edgeMatId = getCellMaterialId(volume, 0, 24, 0);
    // Center energy ≥ edge energy — materialId is monotonic with energy
    expect(centerMatId).toBeGreaterThanOrEqual(edgeMatId);
  });

  it('multiple material types are present (not a binary world)', () => {
    const materialsFound = new Set();
    for (let y = 0; y < 32; y++) {
      for (let z = 0; z < 32; z++) {
        for (let x = 0; x < 32; x++) {
          if (isCellOccupied(volume, x, y, z)) {
            materialsFound.add(getCellMaterialId(volume, x, y, z));
          }
        }
      }
    }
    expect(materialsFound.size).toBeGreaterThanOrEqual(2);
  });

  it('faces are sorted back-to-front', () => {
    for (let i = 1; i < faces.length; i++) {
      expect(faces[i].sortKey).toBeGreaterThanOrEqual(faces[i - 1].sortKey);
    }
  });

  it('SVG is a valid XML string with polygons', () => {
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('<polygon');
  });

  it('pipeline is deterministic: two runs produce identical SVGs', () => {
    const v2 = createVoxelVolume(32, 32, 32);
    const seeds2 = generateFibonacciSeeds({ iterations: 8, scale: 0.75 }, v2, { energyType: ENERGY_TYPES.STRUCTURAL });
    const field2 = propagate(v2, seeds2, { attenuationModel: 'inverse_square', maxRadius: 32, energyFloor: 0.01 });
    applyHollownessAMP(v2, { iterations: 8 });
    runBiomeCoherenceAMP(v2, field2);
    const faces2 = project(v2);
    const svg2 = renderFacesToSVG(faces2);
    expect(svg).toBe(svg2);
  });
});
```

- [ ] **Step 2: Run integration test**

```bash
npx vitest run tests/pixelbrain/voxel-pipeline.test.js
```

Expected: All 7 tests PASS. If the determinism test fails, check that `generateFibonacciSeeds` produces the same seed order each call (it should since it uses no random state).

- [ ] **Step 3: Save the Level 1 crystal SVG as a fixture**

```bash
node -e "
import { createVoxelVolume, ENERGY_TYPES } from './codex/core/pixelbrain/voxel-volume.js';
import { propagate } from './codex/core/pixelbrain/qbit-field.js';
import { applyHollownessAMP } from './codex/core/pixelbrain/hollowness-amp.js';
import { runBiomeCoherenceAMP } from './codex/core/pixelbrain/biome-coherence-amp.js';
import { project } from './codex/core/pixelbrain/iso-projector.js';
import { generateFibonacciSeeds } from './codex/core/pixelbrain/wand-seed-lift.js';
import { renderFacesToSVG } from './codex/core/pixelbrain/voxel-svg-renderer.js';
import { writeFileSync } from 'fs';

const v = createVoxelVolume(32, 32, 32);
const seeds = generateFibonacciSeeds({ iterations: 8, scale: 0.75 }, v, { energyType: ENERGY_TYPES.STRUCTURAL });
const field = propagate(v, seeds, { attenuationModel: 'inverse_square', maxRadius: 32, energyFloor: 0.01 });
applyHollownessAMP(v, { iterations: 8 });
runBiomeCoherenceAMP(v, field);
const faces = project(v);
const svg = renderFacesToSVG(faces, { tileSize: 16 });
writeFileSync('output/pixelbrain/qbit-crystal-level1.svg', svg);
console.log('Level 1 crystal saved:', faces.length, 'faces');
" --input-type=module
```

If the output directory doesn't exist: `mkdir -p output/pixelbrain/`. Open `output/pixelbrain/qbit-crystal-level1.svg` in a browser to visually verify: should show an isometric crystalline formation with concentric material rings, not random noise.

- [ ] **Step 4: Run all pixelbrain tests to confirm no regressions**

```bash
npx vitest run tests/pixelbrain/
```

Expected: All tests pass, including pre-existing `color-intensity-rating-microprocessor.test.js` and `shader.test.js`.

- [ ] **Step 5: Commit**

```bash
git add tests/pixelbrain/voxel-pipeline.test.js output/pixelbrain/qbit-crystal-level1.svg
git commit -m "feat(voxel): Level 1 integration test — 32³ Fibonacci crystal passes full pipeline"
```

---

## Self-Review Against Spec

**Section 8 coverage:**

| Step | Spec requirement | Task |
|------|-----------------|------|
| 1 | VoxelVolume schema | Task 2 |
| 2 | QBITField propagation | Task 3 |
| 3 | HollownessAMP | Task 4 |
| 4 | IsoProjector | Task 5 |
| 5 | Extended phosphorylation | Task 6 |
| 6 | symmetry-amp.js asymmetry extension | Task 7 |
| 7 | BiomeCoherenceAMP | Task 8 |
| 8 | Wand seed lift | Task 9 |
| 9 | SVG face renderer | Task 10 |

**Other spec requirements:**

| Requirement | Location | Task |
|-------------|----------|------|
| SCHOOL_TO_ENERGY | Section 2.4 | Task 1 |
| emissionFactor for extended kinase | Section 2.3 | Task 1 + Task 6 |
| SEED_CONFIGS (all 6 types) | Section 2.6 | Task 9 |
| NEGOTIATION_THRESHOLD for BiomeCoherenceAMP | Section 2.3a | Task 8 |
| `sourceType: 'formula'` in SymmetryAMP | Section 6, Failure 3 | Task 7 |
| Level 1 crystal visual test | Section 4 | Task 11 |

**Not covered (deferred to next plan):**
- Steps 10–13 (VoxelScenePortal, DivWand node, Photonic Bridge 3D, school-scroll integration)
- Chunked world volume (Section 2.5, memory ceiling)
- glyph_monuments lift implementation (SEED_CONFIGS entry present; lift function deferred)

**Type consistency check:**
- `field.energyAt(cell)` — `cell` needs `{x, y, z}` — verified: all callers pass this shape
- `cellIndex(volume, x, y, z)` — all usages match this 4-argument signature
- `applyHollownessAMP(volume, formula)` — formula needs `{ iterations }` — verified in integration test
- `generateFibonacciSeeds(formula, volume, options)` — consistent across test and plan

**Placeholder scan:** No TBDs, no "handle edge cases", no "similar to Task N". Every code block is complete.
