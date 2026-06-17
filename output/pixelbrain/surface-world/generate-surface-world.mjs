import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname);
const GODOT_ASSET_DIR = resolve(__dirname, '../../../godot_project/assets');

const WIDTH = 64;
const HEIGHT = 24;
const DEPTH = 64;
const CHUNK_SIZE = 12;
const WORLD_SEED = 'SURFACE-WORLD-20260617';

const MATERIALS = Object.freeze({
  grimstone: 1,
  peat:      2,
  ash_grass: 3,
  grimwood:  4,
  ruins:     5,
});

const cells = new Uint8Array(WIDTH * HEIGHT * DEPTH);

function idx(x, y, z) {
  return x + WIDTH * (y + HEIGHT * z);
}

function hash3(x, y, z) {
  let h = 2166136261;
  h ^= (x + 374761393) & 0xffffffff; h = Math.imul(h, 16777619) >>> 0;
  h ^= (y + 668265263) & 0xffffffff; h = Math.imul(h, 16777619) >>> 0;
  h ^= (z + 2147483647) & 0xffffffff; h = Math.imul(h, 16777619) >>> 0;
  return h / 4294967295;
}

function setVoxel(x, y, z, matId) {
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT || z < 0 || z >= DEPTH) return;
  cells[idx(x, y, z)] = matId;
}

function getVoxel(x, y, z) {
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT || z < 0 || z >= DEPTH) return 0;
  return cells[idx(x, y, z)];
}

// Bilinear-interpolated heightmap — smooth rolling hills, Y range 5–14
function surfaceY(x, z) {
  const gx = Math.floor(x / 6);
  const gz = Math.floor(z / 6);
  const tx = (x % 6) / 6;
  const tz = (z % 6) / 6;
  const h00 = hash3(gx,     0, gz);
  const h10 = hash3(gx + 1, 0, gz);
  const h01 = hash3(gx,     0, gz + 1);
  const h11 = hash3(gx + 1, 0, gz + 1);
  const h = h00 * (1 - tx) * (1 - tz)
          + h10 * tx        * (1 - tz)
          + h01 * (1 - tx)  * tz
          + h11 * tx        * tz;
  return 5 + Math.round(h * 9); // Y 5–14
}

// --- terrain fill ---
for (let z = 0; z < DEPTH; z += 1) {
  for (let x = 0; x < WIDTH; x += 1) {
    const sy = surfaceY(x, z);
    for (let y = 0; y <= sy; y += 1) {
      let mat;
      if (y < 3) {
        mat = MATERIALS.grimstone;
      } else if (y < sy - 1) {
        mat = MATERIALS.peat;
      } else if (y === sy - 1) {
        mat = hash3(x, 11, z) > 0.45 ? MATERIALS.peat : MATERIALS.grimstone;
      } else {
        // cap — grimstone outcroppings on steep terrain
        const steepness = Math.abs(surfaceY(x + 1, z) - sy) + Math.abs(surfaceY(x, z + 1) - sy);
        mat = steepness >= 3 ? MATERIALS.grimstone : MATERIALS.ash_grass;
      }
      setVoxel(x, y, z, mat);
    }
  }
}

// --- grimstone surface outcroppings ---
for (let z = 2; z < DEPTH - 2; z += 1) {
  for (let x = 2; x < WIDTH - 2; x += 1) {
    const sy = surfaceY(x, z);
    const h = hash3(x, 77, z);
    if (h > 0.88) {
      const boulderH = 1 + Math.floor(hash3(x, 78, z) * 2);
      for (let dy = 1; dy <= boulderH; dy += 1) {
        setVoxel(x, sy + dy, z, MATERIALS.grimstone);
        if (dy === 1) {
          if (hash3(x + 1, 79, z) > 0.5) setVoxel(x + 1, sy + 1, z, MATERIALS.grimstone);
          if (hash3(x - 1, 79, z) > 0.5) setVoxel(x - 1, sy + 1, z, MATERIALS.grimstone);
          if (hash3(x, 79, z + 1) > 0.5) setVoxel(x, sy + 1, z + 1, MATERIALS.grimstone);
        }
      }
    }
  }
}

// --- grimwood trees ---
const TREE_POSITIONS = [];
for (let gz = 1; gz < Math.floor(DEPTH / 6) - 1; gz += 1) {
  for (let gx = 1; gx < Math.floor(WIDTH / 6) - 1; gx += 1) {
    if (hash3(gx, 99, gz) > 0.58) {
      const tx = gx * 6 + Math.floor(hash3(gx, 100, gz) * 5);
      const tz = gz * 6 + Math.floor(hash3(gx, 101, gz) * 5);
      if (tx >= 3 && tx < WIDTH - 3 && tz >= 3 && tz < DEPTH - 3) {
        TREE_POSITIONS.push([tx, tz]);
      }
    }
  }
}

const mineables = [];
for (const [tx, tz] of TREE_POSITIONS) {
  const base = surfaceY(tx, tz);
  const treeH = 3 + Math.floor(hash3(tx, 55, tz) * 4);
  for (let ty = base + 1; ty <= base + treeH; ty += 1) {
    setVoxel(tx, ty, tz, MATERIALS.grimwood);
    mineables.push({
      id: `grimwood-${tx}-${ty}-${tz}`,
      resource: 'grimwood',
      voxel: { x: tx, y: ty, z: tz },
      hardness: 2,
      yield: 1 + Math.floor(hash3(tx, ty, tz) * 2),
      respawns: false,
    });
  }
}

// --- scholomance ruins ---
const RUIN_SITES = [
  [12, 14], [38, 12], [20, 44], [46, 36], [9, 52], [52, 52],
];
for (const [rx, rz] of RUIN_SITES) {
  if (rx >= WIDTH - 8 || rz >= DEPTH - 8) continue;
  const wallH = 2 + Math.floor(hash3(rx, 200, rz) * 2);
  const wallLen = 4 + Math.floor(hash3(rx, 201, rz) * 4);
  const baseY = surfaceY(rx, rz);
  for (let wy = baseY + 1; wy <= baseY + wallH; wy += 1) {
    // north wall segment
    for (let wx = rx; wx < rx + wallLen && wx < WIDTH - 1; wx += 1) {
      setVoxel(wx, wy, rz, MATERIALS.ruins);
    }
    // west wall segment (L-shape)
    for (let wz = rz; wz < rz + Math.floor(wallLen * 0.7) && wz < DEPTH - 1; wz += 1) {
      setVoxel(rx, wy, wz, MATERIALS.ruins);
    }
  }
  // crumbled top — randomly remove top course blocks
  for (let wx = rx; wx < rx + wallLen && wx < WIDTH - 1; wx += 1) {
    if (hash3(wx, 202, rz) > 0.6) {
      setVoxel(wx, baseY + wallH, rz, 0);
    }
  }
}

// --- collect gameplay arrays ---
const collisionSolids = [];
const walkable = [];
const occupiedSet = new Set();

for (let y = 0; y < HEIGHT; y += 1) {
  for (let z = 0; z < DEPTH; z += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const mat = getVoxel(x, y, z);
      if (mat === 0) continue;
      collisionSolids.push({ x, y, z, materialId: mat });
      occupiedSet.add(`${x},${y},${z}`);
    }
  }
}

for (let z = 0; z < DEPTH; z += 1) {
  for (let x = 0; x < WIDTH; x += 1) {
    const sy = surfaceY(x, z);
    const floorSolid = getVoxel(x, sy, z) !== 0;
    const bodyClear = getVoxel(x, sy + 1, z) === 0 && getVoxel(x, sy + 2, z) === 0;
    const headClear = getVoxel(x, sy + 3, z) === 0;
    if (floorSolid && bodyClear && headClear) {
      walkable.push({ x, y: sy + 1, z });
    }
  }
}

// find flat open spawn near centre
function findSpawn() {
  const cx = Math.floor(WIDTH / 2);
  const cz = Math.floor(DEPTH / 2);
  for (let r = 0; r < 12; r += 1) {
    for (let dz = -r; dz <= r; dz += 1) {
      for (let dx = -r; dx <= r; dx += 1) {
        if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
        const sx = cx + dx;
        const sz = cz + dz;
        if (sx < 2 || sx >= WIDTH - 2 || sz < 2 || sz >= DEPTH - 2) continue;
        const sy = surfaceY(sx, sz);
        if (getVoxel(sx, sy, sz) === 0) continue;
        if (getVoxel(sx, sy + 1, sz) !== 0) continue;
        if (getVoxel(sx, sy + 2, sz) !== 0) continue;
        // ensure relatively flat
        const deltaH = Math.max(
          Math.abs(surfaceY(sx + 1, sz) - sy),
          Math.abs(surfaceY(sx - 1, sz) - sy),
          Math.abs(surfaceY(sx, sz + 1) - sy),
          Math.abs(surfaceY(sx, sz - 1) - sy),
        );
        if (deltaH <= 1) return { x: sx, y: sy, z: sz };
      }
    }
  }
  return { x: cx, y: surfaceY(cx, cz), z: cz };
}

const spawnCell = findSpawn();

const artifact = {
  kind: 'scholomance.world.surface.v1',
  version: 1,
  contract: 'PB-WORLD-SURFACE-v1',
  seed: { value: WORLD_SEED, prng: 'fnv1a-coordinate-hash', deterministic: true },
  terrain: {
    algorithm: 'bilinear-interpolated heightmap with peat/grimstone layers, grimwood trees, and scholomance ruins',
    noise: 'deterministic 3D coordinate hash with 6-unit grid bilinear smoothing',
    surfaceDetail: 'rolling hills, boulder outcroppings, dead tree columns, crumbling wall ruins',
    dimensions: { width: WIDTH, height: HEIGHT, depth: DEPTH },
  },
  chunks: {
    loader: 'player-centered chunk grid',
    size: { x: CHUNK_SIZE, z: CHUNK_SIZE },
    activeRadius: 2,
  },
  dimensions: { width: WIDTH, height: HEIGHT, depth: DEPTH },
  playerSpawn: { x: spawnCell.x, y: spawnCell.y, z: spawnCell.z, facing: 'south' },
  materials: {
    1: { id: 'grimstone',  blocksMovement: true,  mineable: false },
    2: { id: 'peat',       blocksMovement: true,  mineable: false },
    3: { id: 'ash_grass',  blocksMovement: true,  mineable: false },
    4: { id: 'grimwood',   blocksMovement: true,  mineable: true, resource: 'grimwood' },
    5: { id: 'ruins',      blocksMovement: true,  mineable: false },
  },
  gameplay: {
    walkable,
    collisionSolids,
    navigation: {
      controller: 'first-person grid occupancy',
      movementKeys: ['w', 'a', 's', 'd'],
      collision: 'walkable-cell rejection backed by solid voxel collider export',
    },
    mineables,
    mining: {
      toolTags: ['axe', 'hand'],
      action: 'harvest',
      resource: 'grimwood',
    },
  },
  faces: [],
  telemetry: {
    walkableCells: walkable.length,
    solidVoxels: collisionSolids.length,
    mineableNodes: mineables.length,
    treesPlanted: TREE_POSITIONS.length,
    ruinSites: RUIN_SITES.length,
    spawnY: spawnCell.y,
  },
};

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(GODOT_ASSET_DIR, { recursive: true });

writeFileSync(resolve(OUT_DIR, 'surface-world.world.json'), JSON.stringify(artifact, null, 2));
writeFileSync(resolve(GODOT_ASSET_DIR, 'surface-world.qworld'), `${JSON.stringify(artifact)}\n`);

console.log(JSON.stringify(artifact.telemetry, null, 2));
