import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ENERGY_TYPES,
  cellIndex,
  createVoxelVolume,
  getCellMaterialId,
  isCellOccupied,
  setCellMaterial,
} from '../../../codex/core/pixelbrain/voxel-volume.js';
import { collectFaces } from '../../../codex/core/pixelbrain/iso-projector.js';
import { renderFacesToSVG } from '../../../codex/core/pixelbrain/voxel-svg-renderer.js';
import { resolveBlockId } from '../../../codex/core/pixelbrain/block-taxonomy.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname);
const GODOT_ASSET_DIR = resolve(__dirname, '../../../godot_project/assets');
const PUBLIC_DATA_DIR = resolve(__dirname, '../../../public/data/pixelbrain');

const WIDTH = 48;
const HEIGHT = 18;
const DEPTH = 48;
const CHUNK_SIZE = 12;
const WORLD_SEED = 'VOIDMETAL-CAVE-20260617';
const CRYSTAL_POINTS = Object.freeze([[8, 10], [18, 11], [24, 24], [34, 27], [39, 35], [12, 36], [25, 38]]);
const PATH_RUNE_POINTS = Object.freeze([[5, 8], [12, 12], [20, 10], [27, 17], [34, 25], [41, 33], [17, 20], [12, 29], [10, 39], [25, 38]]);

const MATERIALS = Object.freeze({
  voidstone: 1,
  basalt: 2,
  voidmetal: 3,
  cyanCrystal: 4,
  pathRune: 5,
});

const MATERIAL_COLORS = Object.freeze({
  top: Object.freeze({
    1: '#171321',
    2: '#272033',
    3: '#7b6cff',
    4: '#c8fbff',
    5: '#66f6ff',
  }),
  left: Object.freeze({
    1: '#0d0a14',
    2: '#171222',
    3: '#4637a6',
    4: '#6ee7ff',
    5: '#24c7df',
  }),
  right: Object.freeze({
    1: '#05040a',
    2: '#0b0710',
    3: '#22185f',
    4: '#0ea5c6',
    5: '#0e8397',
  }),
});

const vol = createVoxelVolume(WIDTH, HEIGHT, DEPTH);
const mineables = [];
const walkable = [];
const collisionSolids = [];

function hash3(x, y, z) {
  let h = 2166136261;
  h ^= x + 374761393; h = Math.imul(h, 16777619);
  h ^= y + 668265263; h = Math.imul(h, 16777619);
  h ^= z + 2147483647; h = Math.imul(h, 16777619);
  return (h >>> 0) / 4294967295;
}

function setVoxel(x, y, z, materialId, energy = 0.1, energyType = ENERGY_TYPES.STRUCTURAL) {
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT || z < 0 || z >= DEPTH) return;
  setCellMaterial(vol, x, y, z, materialId);
  const i = cellIndex(vol, x, y, z);
  vol.energyField[i] = energy;
  vol.energyTypes[i] = energyType;
}

function clearVoxel(x, y, z) {
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT || z < 0 || z >= DEPTH) return;
  const i = cellIndex(vol, x, y, z);
  vol.cells[i] = 0;
  vol.energyField[i] = 0;
  vol.energyTypes[i] = 0;
}

function occupied(x, y, z) {
  return x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT && z >= 0 && z < DEPTH && isCellOccupied(vol, x, y, z);
}

function carveSphere(cx, cy, cz, rx, ry, rz) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z += 1) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        const dz = (z - cz) / rz;
        if (dx * dx + dy * dy + dz * dz <= 1) clearVoxel(x, y, z);
      }
    }
  }
}

function carveTunnel(points, radius = 3.2, height = 3.8) {
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.z - a.z)) * 2;
    for (let step = 0; step <= steps; step += 1) {
      const t = step / Math.max(1, steps);
      const x = a.x + (b.x - a.x) * t;
      const z = a.z + (b.z - a.z) * t;
      const y = a.y + (b.y - a.y) * t;
      carveSphere(x, y, z, radius, height, radius);
    }
  }
}

function exposeVoidmetalCluster(cx, cy, cz, radius, idPrefix) {
  let count = 0;
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
    for (let z = Math.floor(cz - radius); z <= Math.ceil(cz + radius); z += 1) {
      for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
        const d = Math.hypot((x - cx) / radius, (y - cy) / radius, (z - cz) / radius);
        if (d > 1 || !occupied(x, y, z)) continue;
        const touchesAir = [
          [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
        ].some(([dx, dy, dz]) => !occupied(x + dx, y + dy, z + dz));
        if (!touchesAir) continue;
        setVoxel(x, y, z, MATERIALS.voidmetal, 0.92, ENERGY_TYPES.ENTROPIC);
        count += 1;
        mineables.push({
          id: `${idPrefix}-${count}`,
          resource: 'voidmetal',
          voxel: { x, y, z },
          hardness: 3,
          yield: 2 + Math.floor(hash3(x, y, z) * 4),
          respawns: false,
        });
      }
    }
  }
}

function addCrystalLamp(x, y, z) {
  setVoxel(x, y, z, MATERIALS.cyanCrystal, 1, ENERGY_TYPES.PHOTONIC);
  setVoxel(x, y + 1, z, MATERIALS.cyanCrystal, 1, ENERGY_TYPES.PHOTONIC);
}

function markPathRune(x, z) {
  setVoxel(x, 1, z, MATERIALS.pathRune, 0.78, ENERGY_TYPES.RESONANT);
}

function isProtectedWalkway(x, z) {
  return PATH_RUNE_POINTS.some(([px, pz]) => Math.hypot(x - px, z - pz) <= 1.45);
}

function applyTerrainDetailPass() {
  for (let z = 2; z < DEPTH - 2; z += 1) {
    for (let x = 2; x < WIDTH - 2; x += 1) {
      const floorSolid = occupied(x, 1, z);
      const bodyClear = !occupied(x, 2, z) && !occupied(x, 3, z);
      if (!floorSolid || !bodyClear) continue;
      const floorMaterial = getCellMaterialId(vol, x, 1, z);
      const canRetextureFloor = floorMaterial === MATERIALS.voidstone || floorMaterial === MATERIALS.basalt;

      const floorNoise = hash3(x, 31, z);
      const ridgeNoise = hash3(Math.floor(x / 2), 37, Math.floor(z / 2));
      if (canRetextureFloor && (floorNoise > 0.62 || ridgeNoise > 0.74)) {
        setVoxel(x, 1, z, MATERIALS.basalt, 0.18 + floorNoise * 0.12);
      } else if (canRetextureFloor && floorNoise < 0.18) {
        setVoxel(x, 1, z, MATERIALS.voidstone, 0.15 + ridgeNoise * 0.1);
      }

      if (isProtectedWalkway(x, z) || floorMaterial === MATERIALS.voidmetal) continue;
      const rubbleNoise = hash3(x, 43, z);
      if (rubbleNoise > 0.948) {
        setVoxel(x, 2, z, rubbleNoise > 0.985 ? MATERIALS.voidstone : MATERIALS.basalt, 0.22 + rubbleNoise * 0.16);
        if (rubbleNoise > 0.991 && !occupied(x, 3, z)) {
          setVoxel(x, 3, z, MATERIALS.basalt, 0.2 + hash3(x, 44, z) * 0.14);
        }
      }
    }
  }

  for (let y = 7; y < HEIGHT - 2; y += 1) {
    for (let z = 3; z < DEPTH - 3; z += 1) {
      for (let x = 3; x < WIDTH - 3; x += 1) {
        if (!occupied(x, y, z) || occupied(x, y - 1, z) || occupied(x, y - 2, z)) continue;
        const dripNoise = hash3(x, y + 59, z);
        if (dripNoise > 0.985) {
          setVoxel(x, y - 1, z, MATERIALS.voidstone, 0.16 + dripNoise * 0.16);
          if (dripNoise > 0.996 && !occupied(x, y - 2, z)) {
            setVoxel(x, y - 2, z, MATERIALS.basalt, 0.16 + hash3(x, y + 60, z) * 0.16);
          }
        }
      }
    }
  }
}

for (let y = 0; y < HEIGHT; y += 1) {
  for (let z = 0; z < DEPTH; z += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const edge = x < 2 || z < 2 || x > WIDTH - 3 || z > DEPTH - 3;
      const material = edge || y < 2 || y > 13 || hash3(x, y, z) > 0.73
        ? MATERIALS.voidstone
        : MATERIALS.basalt;
      setVoxel(x, y, z, material, 0.12 + hash3(x, y, z) * 0.18);
    }
  }
}

carveTunnel([
  { x: 5, y: 4, z: 8 },
  { x: 12, y: 4, z: 12 },
  { x: 20, y: 4, z: 10 },
  { x: 27, y: 4, z: 17 },
  { x: 34, y: 4, z: 25 },
  { x: 41, y: 4, z: 33 },
], 3.1, 3.4);

carveTunnel([
  { x: 20, y: 4, z: 10 },
  { x: 17, y: 5, z: 20 },
  { x: 12, y: 5, z: 29 },
  { x: 10, y: 4, z: 39 },
], 2.8, 3.2);

carveTunnel([
  { x: 28, y: 4, z: 17 },
  { x: 30, y: 5, z: 28 },
  { x: 25, y: 5, z: 38 },
], 2.7, 3.1);

carveSphere(24, 5, 24, 8, 5, 7);
carveSphere(38, 5, 35, 5, 4, 5);
carveSphere(11, 5, 36, 5, 4, 5);

exposeVoidmetalCluster(16, 5, 17, 3.4, 'voidmetal-west-vein');
exposeVoidmetalCluster(31, 5, 25, 4.2, 'voidmetal-heart-vein');
exposeVoidmetalCluster(40, 5, 35, 3.6, 'voidmetal-deep-vein');
exposeVoidmetalCluster(10, 5, 39, 3.2, 'voidmetal-south-vein');

for (const [x, z] of CRYSTAL_POINTS) {
  addCrystalLamp(x, 2, z);
}
for (const [x, z] of PATH_RUNE_POINTS) {
  markPathRune(x, z);
}

applyTerrainDetailPass();

for (let z = 0; z < DEPTH; z += 1) {
  for (let x = 0; x < WIDTH; x += 1) {
    const floorSolid = occupied(x, 1, z);
    const bodyClear = !occupied(x, 2, z) && !occupied(x, 3, z);
    const headClear = !occupied(x, 4, z);
    if (floorSolid && bodyClear && headClear) {
      walkable.push({ x, y: 2, z });
    }
  }
}

for (let y = 0; y < HEIGHT; y += 1) {
  for (let z = 0; z < DEPTH; z += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const materialId = getCellMaterialId(vol, x, y, z);
      if (materialId === 0) continue;
      collisionSolids.push({ x, y, z, materialId, blockId: resolveBlockId('VOID', materialId, x, y, z) });
    }
  }
}

const faces = collectFaces(
  vol,
  (x, y, z) => getCellMaterialId(vol, x, y, z),
  (x, y, z) => isCellOccupied(vol, x, y, z),
).map((face, index) => ({
  ...face,
  id: `${face.x}:${face.y}:${face.z}:${face.faceType}:${index}`,
  type: face.faceType,
  resource: face.materialId === MATERIALS.voidmetal
    ? {
      id: `voidmetal.face.${face.x}.${face.y}.${face.z}.${face.faceType}`,
      materialName: 'voidmetal',
      materialId: face.materialId,
      resource: 'voidmetal',
      amount: 2,
      position: { x: face.x, y: face.y, z: face.z },
      faceType: face.faceType,
      energyType: 'ENTROPIC',
      schoolId: 'VOID',
    }
    : null,
}));

function facePolygon(face, tileSize = 8) {
  const { sx, sy, type } = face;
  const hw = tileSize;
  const hh = tileSize / 2;
  const fh = tileSize;
  if (type === 'top') return [[sx, sy], [sx + hw, sy + hh], [sx, sy + 2 * hh], [sx - hw, sy + hh]];
  if (type === 'left') return [[sx - hw, sy + hh], [sx, sy + 2 * hh], [sx, sy + 2 * hh + fh], [sx - hw, sy + hh + fh]];
  if (type === 'right') return [[sx, sy + 2 * hh], [sx + hw, sy + hh], [sx + hw, sy + hh + fh], [sx, sy + 2 * hh + fh]];
  return [];
}

function clampChannel(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function shadeHex(hex, amount) {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `#${clampChannel(r + amount).toString(16).padStart(2, '0')}${clampChannel(g + amount).toString(16).padStart(2, '0')}${clampChannel(b + amount).toString(16).padStart(2, '0')}`;
}

function lerpPoint(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

function buildTextureMarks(face, polygon) {
  const marks = [];
  const materialHash = hash3(face.x, face.y + 101, face.z);
  const detailColor = face.materialId === MATERIALS.voidmetal
    ? 'rgba(190, 180, 255, 0.48)'
    : face.materialId === MATERIALS.cyanCrystal || face.materialId === MATERIALS.pathRune
      ? 'rgba(210, 252, 255, 0.5)'
      : 'rgba(180, 205, 220, 0.16)';
  const shadowColor = face.materialId === MATERIALS.voidmetal
    ? 'rgba(22, 14, 72, 0.5)'
    : 'rgba(0, 0, 0, 0.28)';

  if (face.materialId === MATERIALS.voidstone || face.materialId === MATERIALS.basalt) {
    const lineCount = 1 + Math.floor(materialHash * 3);
    for (let i = 0; i < lineCount; i += 1) {
      const t = 0.22 + hash3(face.x + i, face.y + 113, face.z) * 0.56;
      const s = 0.18 + hash3(face.x, face.y + 127, face.z + i) * 0.26;
      const a = face.type === 'top'
        ? lerpPoint(polygon[0], polygon[1], t)
        : lerpPoint(polygon[0], polygon[3], t);
      const b = face.type === 'top'
        ? lerpPoint(polygon[3], polygon[2], Math.min(0.9, t + s))
        : lerpPoint(polygon[1], polygon[2], Math.min(0.9, t + s));
      marks.push({ type: 'line', x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: i === 0 ? detailColor : shadowColor, width: 0.45 });
    }
  }

  if (face.materialId === MATERIALS.voidmetal || face.materialId === MATERIALS.cyanCrystal || face.materialId === MATERIALS.pathRune) {
    for (let i = 0; i < 2; i += 1) {
      const u = 0.26 + hash3(face.x + i, face.y + 149, face.z) * 0.48;
      const v = 0.28 + hash3(face.x, face.y + 157, face.z + i) * 0.42;
      const edgeA = lerpPoint(polygon[0], polygon[1], u);
      const edgeB = lerpPoint(polygon[3], polygon[2], u);
      const p = lerpPoint(edgeA, edgeB, v);
      marks.push({ type: 'dot', x: p.x, y: p.y, r: face.materialId === MATERIALS.voidmetal ? 0.65 : 0.85, fill: detailColor });
    }
  }

  return marks;
}

function serializeFacesForGodot(rawFaces, tileSize = 8, padding = 80) {
  let minX = Infinity;
  let minY = Infinity;
  for (const face of rawFaces) {
    for (const [x, y] of facePolygon(face, tileSize)) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
    }
  }
  const ox = -minX + padding;
  const oy = -minY + padding;
  return rawFaces.map((face) => {
    const polygon = facePolygon(face, tileSize).map(([x, y]) => ({ x: x + ox, y: y + oy }));
    const baseFill = MATERIAL_COLORS[face.type]?.[face.materialId] ?? '#64748b';
    const shadeAmount = Math.round((hash3(face.x, face.y + 83, face.z) - 0.5) * (face.type === 'top' ? 20 : 14));
    return {
      id: face.id,
      type: face.type,
      materialId: face.materialId,
      fill: shadeHex(baseFill, shadeAmount),
      voxel: { x: face.x, y: face.y, z: face.z },
      sortKey: face.sortKey,
      polygon,
      textureMarks: buildTextureMarks(face, polygon),
      resource: face.resource,
    };
  });
}

const artifact = {
  kind: 'scholomance.qbitworld.voidmetal-cave.v1',
  version: 1,
  contract: 'PB-WORLD-VOIDMETAL-CAVE-v1',
  schoolId: 'VOID',
  seed: {
    value: WORLD_SEED,
    prng: 'fnv1a-coordinate-hash',
    deterministic: true,
  },
  terrain: {
    algorithm: 'hash-noise filled volume with carved ellipsoid tunnels, caverns, ore clusters, rubble, stalactites, crystals, and path runes',
    noise: 'deterministic 3D coordinate hash',
    surfaceDetail: 'per-face shaded texture marks plus deterministic rubble and stalactite dressing',
    dimensions: { width: WIDTH, height: HEIGHT, depth: DEPTH },
  },
  chunks: {
    loader: 'player-centered chunk grid',
    size: { x: CHUNK_SIZE, z: CHUNK_SIZE },
    activeRadius: 1,
  },
  dimensions: { width: WIDTH, height: HEIGHT, depth: DEPTH },
  playerSpawn: { x: 5, y: 2, z: 8, facing: 'east' },
  materials: {
    1: { id: 'voidstone', blocksMovement: true, mineable: false },
    2: { id: 'basalt', blocksMovement: true, mineable: false },
    3: { id: 'voidmetal', blocksMovement: true, mineable: true, resource: 'voidmetal' },
    4: { id: 'cyanCrystal', blocksMovement: true, mineable: false, light: { color: '#6ee7ff', radius: 7 } },
    5: { id: 'pathRune', blocksMovement: false, mineable: false, light: { color: '#24c7df', radius: 3 } },
  },
  gameplay: {
    walkable,
    collisionSolids,
    navigation: {
      controller: 'first-person/topdown hybrid grid occupancy',
      movementKeys: ['w', 'a', 's', 'd'],
      collision: 'walkable-cell rejection backed by solid voxel collider export',
    },
    mineables,
    mining: {
      toolTags: ['pickaxe', 'void-tuned-wand'],
      action: 'mine',
      resource: 'voidmetal',
    },
  },
  faces: serializeFacesForGodot(faces),
  telemetry: {
    walkableCells: walkable.length,
    solidVoxels: collisionSolids.length,
    visibleFaces: faces.length,
    mineableNodes: mineables.length,
    voidmetalVoxels: collisionSolids.filter((voxel) => voxel.materialId === MATERIALS.voidmetal).length,
  },
};

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(GODOT_ASSET_DIR, { recursive: true });
mkdirSync(PUBLIC_DATA_DIR, { recursive: true });

writeFileSync(resolve(OUT_DIR, 'voidmetal-cave.world.json'), JSON.stringify(artifact, null, 2));
writeFileSync(resolve(PUBLIC_DATA_DIR, 'voidmetal-cave.world.json'), JSON.stringify(artifact, null, 2));
writeFileSync(resolve(OUT_DIR, 'voidmetal-cave.preview.svg'), renderFacesToSVG(faces, {
  tileSize: 8,
  padding: 80,
  background: '#02030a',
  materialColors: MATERIAL_COLORS,
  antialias: true,
}));
writeFileSync(resolve(GODOT_ASSET_DIR, 'voidmetal-cave.qworld'), `${JSON.stringify(artifact)}\n`);

console.log(JSON.stringify(artifact.telemetry, null, 2));
