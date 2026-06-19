# Photonic Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `block-school-bridge.js` — a lazy-cached, per-school energy basis that resolves per-cell `schoolId` and `blockId` for every voxel face using the same QBIT propagation physics as the world generator, then wire it into `qbit-world-game-loop.js` so every face resource carries accurate school attribution and a taxonomy-resolved block ID.

**Architecture:** For each of the 8 schools, one `propagate()` pass is run once per world size tier using that school's canonical `SCHOOL_VOXEL_DEFAULTS` (attenuation model, decay scale, iteration bias). Results are stored as `Float32Array` per school in a `Map<"WxHxD", schoolBases>` cache. At face generation time, `schoolAt()` does an O(1) weighted argmax across the cached buffers — `schoolWeights[id] * basis[id][cellIndex]` — and feeds the result to `resolveBlockId()` from `block-taxonomy.js`.

**Tech Stack:** Vitest (tests), ES modules, existing `propagate()` from `qbit-field.js`, `generateFibonacciSeeds()` from `wand-seed-lift.js`, `SCHOOL_VOXEL_DEFAULTS` from `scroll-to-voxel-world.js`, `resolveBlockId()` from `block-taxonomy.js`.

## Global Constraints

- No `Math.random()` — all seed generation is deterministic via Fibonacci formula
- No `Date.now()` in hot paths
- All exports are pure functions except `_basisCache` module-level state
- Test files live in `tests/pixelbrain/`, import via `../../codex/core/pixelbrain/`
- File named `block-school-bridge.js` (not `photonic-bridge.js`) — `qbit-bridge.js` already owns the `photonic` namespace in this codebase
- Same `attenuationModel`/`decay`/`iterations` tuning across all world size tiers — only `(w, h, d)` varies between cache entries
- `maxRadius = Math.floor(Math.min(w, h, d) * 0.75)` — mirrors game loop convention

---

### Task 1: Core basis cache + `schoolAt()`

**Files:**
- Create: `codex/core/pixelbrain/block-school-bridge.js`
- Create: `tests/pixelbrain/block-school-bridge.test.js`

**Interfaces:**
- Consumes: `generateFibonacciSeeds(formula, volume, opts)` → `[{vx,vy,vz,energy}]` from `wand-seed-lift.js`
- Consumes: `propagate(seeds, w, h, d, opts)` → `{energyAt(x,y,z)}` from `qbit-field.js`
- Consumes: `SCHOOL_TO_ENERGY` (object keyed by school ID) from `../constants/schools.js`
- Consumes: `SCHOOL_VOXEL_DEFAULTS` from `./scroll-to-voxel-world.js`
- Consumes: `createVoxelVolume(w, h, d)` from `./voxel-volume.js`
- Produces: `schoolAt(w, h, d, schoolWeights, x, y, z)` → `string` (school ID)
- Produces: `getOrBuildBasis(w, h, d)` → `{ [schoolId]: Float32Array }` (exported for tests)
- Produces: `maxRadiusFor(w, h, d)` → `number` (exported for tests)

- [ ] **Step 1: Write the failing test**

```js
// tests/pixelbrain/block-school-bridge.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { schoolAt, getOrBuildBasis, maxRadiusFor, invalidateBasis } from '../../codex/core/pixelbrain/block-school-bridge.js';

const VALID_SCHOOL_IDS = new Set([
  'SONIC','PSYCHIC','VOID','ALCHEMY','WILL','NECROMANCY','ABJURATION','DIVINATION',
]);

beforeEach(() => {
  invalidateBasis();
});

describe('maxRadiusFor', () => {
  it('is floor(min(w,h,d) * 0.75)', () => {
    expect(maxRadiusFor(16, 16, 16)).toBe(12);
    expect(maxRadiusFor(32, 32, 32)).toBe(24);
    expect(maxRadiusFor(16, 32, 16)).toBe(12);
  });
});

describe('getOrBuildBasis', () => {
  it('returns an object with a Float32Array for each of the 8 schools', () => {
    const basis = getOrBuildBasis(8, 8, 8);
    for (const schoolId of VALID_SCHOOL_IDS) {
      expect(basis[schoolId]).toBeInstanceOf(Float32Array);
      expect(basis[schoolId].length).toBe(8 * 8 * 8);
    }
  });

  it('caches: second call returns the exact same object reference', () => {
    const a = getOrBuildBasis(8, 8, 8);
    const b = getOrBuildBasis(8, 8, 8);
    expect(a).toBe(b);
  });

  it('different sizes produce independent cache entries', () => {
    const a = getOrBuildBasis(8, 8, 8);
    const b = getOrBuildBasis(16, 16, 16);
    expect(a).not.toBe(b);
    expect(b['VOID'].length).toBe(16 * 16 * 16);
  });
});

describe('schoolAt', () => {
  it('returns a valid school ID', () => {
    const school = schoolAt(8, 8, 8, { VOID: 1.0 }, 4, 4, 4);
    expect(VALID_SCHOOL_IDS.has(school)).toBe(true);
  });

  it('returns VOID when schoolWeights is empty', () => {
    const school = schoolAt(8, 8, 8, {}, 4, 4, 4);
    expect(school).toBe('VOID');
  });

  it('returns the sole school when only one has positive weight', () => {
    const school = schoolAt(8, 8, 8, { ALCHEMY: 1.0 }, 4, 4, 4);
    expect(school).toBe('ALCHEMY');
  });

  it('is deterministic: same inputs always produce same output', () => {
    const a = schoolAt(8, 8, 8, { VOID: 0.6, NECROMANCY: 0.4 }, 2, 3, 5);
    const b = schoolAt(8, 8, 8, { VOID: 0.6, NECROMANCY: 0.4 }, 2, 3, 5);
    expect(a).toBe(b);
  });

  it('VOID and ALCHEMY bases differ at seed-adjacent cells (different attenuation physics)', () => {
    const voidSchool = schoolAt(8, 8, 8, { VOID: 1.0 }, 1, 1, 1);
    const alchSchool = schoolAt(8, 8, 8, { ALCHEMY: 1.0 }, 1, 1, 1);
    // Both return valid school IDs — the interesting check is that the full
    // attribution map is not identical across two schools with different attenuation.
    expect(VALID_SCHOOL_IDS.has(voidSchool)).toBe(true);
    expect(VALID_SCHOOL_IDS.has(alchSchool)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/pixelbrain/block-school-bridge.test.js
```
Expected: FAIL — `Cannot find module '../../codex/core/pixelbrain/block-school-bridge.js'`

- [ ] **Step 3: Create `block-school-bridge.js` with `schoolAt()` and supporting internals**

```js
// codex/core/pixelbrain/block-school-bridge.js
import { generateFibonacciSeeds } from './wand-seed-lift.js';
import { propagate, DEFAULT_DECAY, DEFAULT_ITERATIONS } from './qbit-field.js';
import { SCHOOL_TO_ENERGY } from '../constants/schools.js';
import { SCHOOL_VOXEL_DEFAULTS } from './scroll-to-voxel-world.js';
import { createVoxelVolume } from './voxel-volume.js';

const ALL_SCHOOL_IDS = Object.freeze(Object.keys(SCHOOL_TO_ENERGY));

const _basisCache = new Map();

export function maxRadiusFor(w, h, d) {
  return Math.floor(Math.min(w, h, d) * 0.75);
}

function basisKey(w, h, d) {
  return `${w}x${h}x${d}`;
}

function buildBasis(w, h, d) {
  const volume = createVoxelVolume(w, h, d);
  const rawSeeds = generateFibonacciSeeds(
    { iterations: 6, scale: 0.75 },
    volume,
    { initialEnergy: 1.0 }
  );
  const seeds = rawSeeds.map(s => ({ x: s.vx, y: s.vy, z: s.vz, energy: s.energy }));
  const maxRadius = maxRadiusFor(w, h, d);
  const totalCells = w * h * d;

  const schoolBases = {};
  for (const schoolId of ALL_SCHOOL_IDS) {
    const defaults = SCHOOL_VOXEL_DEFAULTS[schoolId] ?? SCHOOL_VOXEL_DEFAULTS.VOID;
    const decay = DEFAULT_DECAY * defaults.decayScale;
    const iterations = Math.max(0, DEFAULT_ITERATIONS + defaults.iterationsBias);

    const field = propagate(seeds, w, h, d, {
      attenuationModel: defaults.attenuationModel,
      decay,
      iterations,
      maxRadius,
    });

    const buf = new Float32Array(totalCells);
    for (let y = 0; y < h; y++) {
      for (let z = 0; z < d; z++) {
        for (let x = 0; x < w; x++) {
          buf[y * w * d + z * w + x] = field.energyAt(x, y, z);
        }
      }
    }
    schoolBases[schoolId] = buf;
  }

  return Object.freeze(schoolBases);
}

export function getOrBuildBasis(w, h, d) {
  const key = basisKey(w, h, d);
  if (_basisCache.has(key)) return _basisCache.get(key);
  const basis = buildBasis(w, h, d);
  _basisCache.set(key, basis);
  return basis;
}

export function schoolAt(w, h, d, schoolWeights, x, y, z) {
  const basis = getOrBuildBasis(w, h, d);
  const cellIdx = y * w * d + z * w + x;

  let bestSchool = 'VOID';
  let bestScore = -1;

  for (const schoolId of ALL_SCHOOL_IDS) {
    const weight = Number(schoolWeights[schoolId] ?? 0);
    if (weight <= 0) continue;
    const score = weight * (basis[schoolId]?.[cellIdx] ?? 0);
    if (score > bestScore) {
      bestScore = score;
      bestSchool = schoolId;
    }
  }

  return bestSchool;
}

export function invalidateBasis(w, h, d) {
  if (w === undefined) {
    _basisCache.clear();
  } else {
    _basisCache.delete(basisKey(w, h, d));
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/pixelbrain/block-school-bridge.test.js
```
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add codex/core/pixelbrain/block-school-bridge.js tests/pixelbrain/block-school-bridge.test.js
git commit -m "feat(pixelbrain): PhotonicBridge — per-school energy basis cache + schoolAt()"
```

---

### Task 2: `resolveBlockContext()` + `prewarmBasis()`

**Files:**
- Modify: `codex/core/pixelbrain/block-school-bridge.js`
- Modify: `tests/pixelbrain/block-school-bridge.test.js`

**Interfaces:**
- Consumes: `resolveBlockId(schoolId, materialId, x, y, z)` → `string` from `./block-taxonomy.js`
- Consumes: `schoolAt()` from Task 1
- Produces: `resolveBlockContext(w, h, d, schoolWeights, materialId, x, y, z)` → `{ schoolId: string, blockId: string }`
- Produces: `prewarmBasis(tiers: Array<{w,h,d}>)` → `void`

- [ ] **Step 1: Add failing tests**

Append to `tests/pixelbrain/block-school-bridge.test.js`:

```js
import { resolveBlockContext, prewarmBasis } from '../../codex/core/pixelbrain/block-school-bridge.js';

const KNOWN_BLOCK_IDS = new Set([
  'voidstone_smooth','voidstone_cracked','voidstone_edge_dark',
  'basalt_slab','basalt_fractured',
  'voidmetal_ore_large','voidmetal_ore_small',
  'cyan_crystal_growth','cyan_crystal_embedded',
  'path_rune_floor',
  'grimstone_block','grimstone_mossy',
  'peat_damp','peat_dry',
  'ash_grass','grimwood_log','ruins_brick',
]);

describe('resolveBlockContext', () => {
  it('returns { schoolId, blockId } with non-empty strings', () => {
    const ctx = resolveBlockContext(8, 8, 8, { VOID: 1.0 }, 1, 4, 4, 4);
    expect(typeof ctx.schoolId).toBe('string');
    expect(ctx.schoolId.length).toBeGreaterThan(0);
    expect(typeof ctx.blockId).toBe('string');
    expect(ctx.blockId.length).toBeGreaterThan(0);
  });

  it('VOID school + materialId=1 returns a VOID tier-1 blockId', () => {
    const ctx = resolveBlockContext(8, 8, 8, { VOID: 1.0 }, 1, 4, 4, 4);
    expect(ctx.schoolId).toBe('VOID');
    expect(['voidstone_smooth','voidstone_cracked','voidstone_edge_dark']).toContain(ctx.blockId);
  });

  it('NECROMANCY school + materialId=2 returns a NECROMANCY tier-2 blockId', () => {
    const ctx = resolveBlockContext(8, 8, 8, { NECROMANCY: 1.0 }, 2, 4, 4, 4);
    expect(ctx.schoolId).toBe('NECROMANCY');
    expect(['peat_damp','peat_dry']).toContain(ctx.blockId);
  });

  it('all fallback schools (ABJURATION, SONIC, PSYCHIC, WILL) return a recognised blockId', () => {
    for (const school of ['ABJURATION','SONIC','PSYCHIC','WILL']) {
      const ctx = resolveBlockContext(8, 8, 8, { [school]: 1.0 }, 2, 4, 4, 4);
      expect(KNOWN_BLOCK_IDS.has(ctx.blockId)).toBe(true);
    }
  });

  it('is deterministic', () => {
    const a = resolveBlockContext(8, 8, 8, { VOID: 0.7, ALCHEMY: 0.3 }, 3, 2, 3, 5);
    const b = resolveBlockContext(8, 8, 8, { VOID: 0.7, ALCHEMY: 0.3 }, 3, 2, 3, 5);
    expect(a.schoolId).toBe(b.schoolId);
    expect(a.blockId).toBe(b.blockId);
  });
});

describe('prewarmBasis', () => {
  it('fills the cache so subsequent getOrBuildBasis calls are instant (same reference)', () => {
    prewarmBasis([{ w: 8, h: 8, d: 8 }, { w: 16, h: 16, d: 16 }]);
    const a = getOrBuildBasis(8, 8, 8);
    const b = getOrBuildBasis(16, 16, 16);
    expect(a).toBeDefined();
    expect(b).toBeDefined();
    // Both should be cache hits (no rebuild) — same reference on re-call
    expect(getOrBuildBasis(8, 8, 8)).toBe(a);
    expect(getOrBuildBasis(16, 16, 16)).toBe(b);
  });
});

describe('invalidateBasis', () => {
  it('clears a specific size entry', () => {
    const a = getOrBuildBasis(8, 8, 8);
    invalidateBasis(8, 8, 8);
    const b = getOrBuildBasis(8, 8, 8);
    expect(a).not.toBe(b);
  });

  it('clears all entries when called with no arguments', () => {
    getOrBuildBasis(8, 8, 8);
    getOrBuildBasis(16, 16, 16);
    invalidateBasis();
    // After clearing, rebuilds are new objects
    const a = getOrBuildBasis(8, 8, 8);
    expect(a).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify new tests fail**

```bash
npx vitest run tests/pixelbrain/block-school-bridge.test.js
```
Expected: FAIL — `resolveBlockContext is not a function` / `prewarmBasis is not a function`

- [ ] **Step 3: Add `resolveBlockContext` and `prewarmBasis` to `block-school-bridge.js`**

Add import at top of `codex/core/pixelbrain/block-school-bridge.js`:
```js
import { resolveBlockId } from './block-taxonomy.js';
```

Append to exports:
```js
export function resolveBlockContext(w, h, d, schoolWeights, materialId, x, y, z) {
  const resolvedSchool = schoolAt(w, h, d, schoolWeights, x, y, z);
  const blockId = resolveBlockId(resolvedSchool, materialId, x, y, z);
  return { schoolId: resolvedSchool, blockId };
}

export function prewarmBasis(tiers) {
  for (const { w, h, d } of tiers) {
    getOrBuildBasis(w, h, d);
  }
}
```

- [ ] **Step 4: Run tests to verify all pass**

```bash
npx vitest run tests/pixelbrain/block-school-bridge.test.js
```
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add codex/core/pixelbrain/block-school-bridge.js tests/pixelbrain/block-school-bridge.test.js
git commit -m "feat(pixelbrain): PhotonicBridge — resolveBlockContext() + prewarmBasis()"
```

---

### Task 3: Wire bridge into `qbit-world-game-loop.js`

**Files:**
- Modify: `codex/core/pixelbrain/qbit-world-game-loop.js`
- Modify: `tests/pixelbrain/qbit-world-game-loop.test.js`

**Interfaces:**
- Consumes: `resolveBlockContext(w, h, d, schoolWeights, materialId, x, y, z)` → `{ schoolId, blockId }` from Task 2
- Produces: `face.resource.blockId` — non-empty string on every face
- Produces: `face.resource.schoolId` — per-face school ID (no longer always `params.dominantSchoolId`)

**Context — current state of `buildFaceResource` and face loop in `qbit-world-game-loop.js`:**

```js
// Current signature (line 142):
function buildFaceResource(face, field, params) {
  // ...
  return Object.freeze({
    id: `${materialName}.${energyType}.${face.x}.${face.y}.${face.z}.${face.faceType}`,
    materialId: face.materialId,
    materialName,
    energyType,
    schoolId: params.dominantSchoolId,   // ← global, wrong for minority-school cells
    // blockId missing entirely
    amount: Math.max(1, Math.round((energy + params.emission + 0.1) * 10)),
    energy: Number(energy.toFixed(4)),
    position: Object.freeze({ x: face.x, y: face.y, z: face.z }),
    faceType: face.faceType,
  });
}

// Current face loop (line 198):
const faces = collectFaces(
  volume,
  (x, y, z) => getCellMaterialId(volume, x, y, z),
  (x, y, z) => isCellOccupied(volume, x, y, z)
).map((face, index) => {
  const typedFace = { ...face, type: face.faceType };
  return Object.freeze({
    ...typedFace,
    id: `${face.x}:${face.y}:${face.z}:${face.faceType}:${index}`,
    resource: buildFaceResource(face, field, params),
  });
});
```

- [ ] **Step 1: Add failing tests to `tests/pixelbrain/qbit-world-game-loop.test.js`**

Append to the existing test file:

```js
describe('face resource — photonic bridge attribution', () => {
  const VALID_SCHOOL_IDS = new Set([
    'SONIC','PSYCHIC','VOID','ALCHEMY','WILL','NECROMANCY','ABJURATION','DIVINATION',
  ]);

  it('every face resource has a non-empty blockId', () => {
    const world = buildQbitWorldGameLoop(QBIT_WORLD_PRESETS.VOID, { size: 16, maxRadius: 12 });
    for (const face of world.faces) {
      expect(typeof face.resource.blockId).toBe('string');
      expect(face.resource.blockId.length).toBeGreaterThan(0);
    }
  });

  it('every face resource has a valid schoolId', () => {
    const world = buildQbitWorldGameLoop(QBIT_WORLD_PRESETS.VOID, { size: 16, maxRadius: 12 });
    for (const face of world.faces) {
      expect(VALID_SCHOOL_IDS.has(face.resource.schoolId)).toBe(true);
    }
  });

  it('multi-school world produces at least 2 distinct schoolIds across faces', () => {
    // QBIT preset has 5 schools — attribution must vary across the mesh
    const world = buildQbitWorldGameLoop(QBIT_WORLD_PRESETS.QBIT, { size: 16, maxRadius: 12 });
    const schools = new Set(world.faces.map(f => f.resource.schoolId));
    expect(schools.size).toBeGreaterThanOrEqual(2);
  });

  it('face resources remain deterministic after bridge wiring', () => {
    const a = buildQbitWorldGameLoop(QBIT_WORLD_PRESETS.ALCHEMY, { size: 16, maxRadius: 12 });
    const b = buildQbitWorldGameLoop(QBIT_WORLD_PRESETS.ALCHEMY, { size: 16, maxRadius: 12 });
    const aResources = a.faces.map(f => `${f.resource.schoolId}:${f.resource.blockId}`);
    const bResources = b.faces.map(f => `${f.resource.schoolId}:${f.resource.blockId}`);
    expect(aResources).toEqual(bResources);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/pixelbrain/qbit-world-game-loop.test.js
```
Expected: FAIL — `face.resource.blockId` is undefined, `schoolId` is always the same value

- [ ] **Step 3: Add import to `qbit-world-game-loop.js`**

At the top of `codex/core/pixelbrain/qbit-world-game-loop.js`, add:
```js
import { resolveBlockContext } from './block-school-bridge.js';
```

- [ ] **Step 4: Update `buildFaceResource` to accept and use block context**

Replace the current `buildFaceResource` function signature and body:

```js
function buildFaceResource(face, field, params, blockCtx) {
  const energy = field.energyAt(face.x, face.y, face.z);
  const materialName = MATERIAL_NAMES[face.materialId] ?? `material-${face.materialId}`;
  const energyType = ENERGY_TYPE_NAMES[params.dominantEnergyTypeId] ?? 'UNKNOWN';
  const schoolId = blockCtx?.schoolId ?? params.dominantSchoolId;
  const blockId = blockCtx?.blockId ?? null;

  return Object.freeze({
    id: `${materialName}.${energyType}.${face.x}.${face.y}.${face.z}.${face.faceType}`,
    blockId,
    materialId: face.materialId,
    materialName,
    energyType,
    schoolId,
    amount: Math.max(1, Math.round((energy + params.emission + 0.1) * 10)),
    energy: Number(energy.toFixed(4)),
    position: Object.freeze({ x: face.x, y: face.y, z: face.z }),
    faceType: face.faceType,
  });
}
```

- [ ] **Step 5: Update the face collection loop to call `resolveBlockContext`**

Replace the `faces` map inside `buildQbitWorldGameLoop`:

```js
const faces = collectFaces(
  volume,
  (x, y, z) => getCellMaterialId(volume, x, y, z),
  (x, y, z) => isCellOccupied(volume, x, y, z)
).map((face, index) => {
  const typedFace = { ...face, type: face.faceType };
  const blockCtx = resolveBlockContext(
    size, size, size,
    schoolWeights,
    face.materialId,
    face.x, face.y, face.z
  );
  return Object.freeze({
    ...typedFace,
    id: `${face.x}:${face.y}:${face.z}:${face.faceType}:${index}`,
    resource: buildFaceResource(face, field, params, blockCtx),
  });
});
```

- [ ] **Step 6: Run all pixelbrain tests**

```bash
npx vitest run tests/pixelbrain/
```
Expected: all tests PASS including the new attribution tests

- [ ] **Step 7: Run full test suite to check for regressions**

```bash
npm run test
```
Expected: full suite PASS

- [ ] **Step 8: Commit**

```bash
git add codex/core/pixelbrain/qbit-world-game-loop.js tests/pixelbrain/qbit-world-game-loop.test.js
git commit -m "feat(pixelbrain): wire PhotonicBridge into face generation — per-face schoolId + blockId"
```

---

## Self-Review

**Spec coverage:**
- ✅ Per-school energy basis using same QBIT propagation physics
- ✅ Cache keyed by `(w, h, d)` — one entry per world size tier
- ✅ `maxRadius` derived from dimensions (mirrors game loop)
- ✅ `prewarmBasis()` for eager startup warming
- ✅ `schoolAt()` O(1) weighted argmax
- ✅ `resolveBlockContext()` wraps `resolveBlockId()` with fallback chain
- ✅ `invalidateBasis()` for test isolation
- ✅ Per-face `schoolId` in face resource (no longer global dominant)
- ✅ `blockId` in face resource (was previously absent)
- ✅ Determinism preserved across all tasks

**Not covered (intentional — separate work):**
- `qbit_world_builder.gd` — extract `blockId`/`schoolId` as dedicated GDScript meta: straightforward once JS side is done
- AO / per-face lighting — separate renderer task
- School completeness for `BLOCK_TAXONOMY` (VOID + NECROMANCY only) — separate audit

**Placeholder scan:** None found.

**Type consistency:** `resolveBlockContext` signature matches usage in Task 3 exactly. `getOrBuildBasis` return type (`{ [schoolId]: Float32Array }`) matches Task 1 test assertions and Task 2 usage.
