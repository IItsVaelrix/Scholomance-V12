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

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname);

const WIDTH = 18;
const HEIGHT = 34;
const DEPTH = 10;

const MATERIALS = Object.freeze({
  voidLeather: 1,
  scholarRobe: 2,
  goldArmor: 3,
  psychicGlow: 4,
  warmSkin: 5,
});

const KEY_LIGHT = Object.freeze({ x: -8, y: 44, z: 18, intensity: 0.85 });
const FILL_LIGHT = Object.freeze({ x: 24, y: 22, z: 16, intensity: 0.18 });
const CHARACTER_PALETTE = Object.freeze({
  top: Object.freeze({
    1: '#171021',
    2: '#241a3f',
    3: '#f6b863',
    4: '#d9fbff',
    5: '#c98f45',
  }),
  left: Object.freeze({
    1: '#0d0914',
    2: '#151024',
    3: '#d49f55',
    4: '#75e6ff',
    5: '#9f6a31',
  }),
  right: Object.freeze({
    1: '#030206',
    2: '#05030a',
    3: '#6f431d',
    4: '#11b5d8',
    5: '#553017',
  }),
});

const vol = createVoxelVolume(WIDTH, HEIGHT, DEPTH);
const voxels = [];

function place(x, y, z, materialId, energy = 0, energyType = ENERGY_TYPES.STRUCTURAL) {
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT || z < 0 || z >= DEPTH) return;
  setCellMaterial(vol, x, y, z, materialId);
  const i = cellIndex(vol, x, y, z);
  vol.energyField[i] = energy;
  vol.energyTypes[i] = energyType;
}

function box(x0, x1, y0, y1, z0, z1, materialId, energy = 0, energyType = ENERGY_TYPES.STRUCTURAL) {
  for (let y = y0; y <= y1; y += 1) {
    for (let z = z0; z <= z1; z += 1) {
      for (let x = x0; x <= x1; x += 1) place(x, y, z, materialId, energy, energyType);
    }
  }
}

function oval(cx, cy, cz, rx, ry, rz, materialId, energy = 0, energyType = ENERGY_TYPES.STRUCTURAL) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z += 1) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        const dz = (z - cz) / rz;
        if (dx * dx + dy * dy + dz * dz <= 1) place(x, y, z, materialId, energy, energyType);
      }
    }
  }
}

function ring(cx, cy, cz, r, materialId, energy = 0.9, energyType = ENERGY_TYPES.PHOTONIC) {
  for (let a = 0; a < 360; a += 12) {
    const rad = a * Math.PI / 180;
    const x = Math.round(cx + Math.cos(rad) * r);
    const z = Math.round(cz + Math.sin(rad) * Math.max(1, r * 0.42));
    place(x, cy, z, materialId, energy, energyType);
  }
}

function occupied(x, y, z) {
  return x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT && z >= 0 && z < DEPTH && isCellOccupied(vol, x, y, z);
}

function faceAmbientOcclusion(face) {
  const { x, y, z, faceType } = face;
  const sampleOffsets = {
    top: [
      [-1, 1, 0], [1, 1, 0], [0, 1, -1], [0, 1, 1],
      [-1, 1, -1], [1, 1, -1], [-1, 1, 1], [1, 1, 1],
    ],
    left: [
      [0, 1, 1], [-1, 0, 1], [1, 0, 1], [0, -1, 1],
      [-1, 1, 1], [1, 1, 1], [-1, -1, 1], [1, -1, 1],
    ],
    right: [
      [1, 1, 0], [1, 0, -1], [1, 0, 1], [1, -1, 0],
      [1, 1, -1], [1, 1, 1], [1, -1, -1], [1, -1, 1],
    ],
  }[faceType] || [];

  const occluders = sampleOffsets.reduce((count, [dx, dy, dz]) => (
    count + (occupied(x + dx, y + dy, z + dz) ? 1 : 0)
  ), 0);

  const verticalContact = faceType !== 'top' && occupied(x, y - 1, z) ? 0.16 : 0;
  return Number(Math.min(0.95, occluders / Math.max(1, sampleOffsets.length) + verticalContact).toFixed(3));
}

function faceCenter(face) {
  const offsets = {
    top: { x: 0.5, y: 1.02, z: 0.5 },
    left: { x: 0.5, y: 0.5, z: 1.02 },
    right: { x: 1.02, y: 0.5, z: 0.5 },
  };
  const offset = offsets[face.faceType] || { x: 0.5, y: 0.5, z: 0.5 };
  return { x: face.x + offset.x, y: face.y + offset.y, z: face.z + offset.z };
}

function faceNormal(face) {
  switch (face.faceType) {
    case 'top': return { x: 0, y: 1, z: 0 };
    case 'left': return { x: 0, y: 0, z: 1 };
    case 'right': return { x: 1, y: 0, z: 0 };
    default: return { x: 0, y: 1, z: 0 };
  }
}

function normalize3(v) {
  const len = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len, length: len };
}

function dot3(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function rayOccluded(origin, light) {
  const toLight = normalize3({ x: light.x - origin.x, y: light.y - origin.y, z: light.z - origin.z });
  const step = 0.35;
  for (let t = step * 2; t < toLight.length; t += step) {
    const x = Math.floor(origin.x + toLight.x * t);
    const y = Math.floor(origin.y + toLight.y * t);
    const z = Math.floor(origin.z + toLight.z * t);
    if (occupied(x, y, z)) return true;
  }
  return false;
}

function lightContribution(face, light) {
  const origin = faceCenter(face);
  const normal = faceNormal(face);
  const toLight = normalize3({ x: light.x - origin.x, y: light.y - origin.y, z: light.z - origin.z });
  const lambert = Math.max(0, dot3(normal, toLight));
  const attenuation = 1 / (1 + toLight.length * 0.035);
  const shadow = rayOccluded(origin, light) ? 0.22 : 1;
  return lambert * attenuation * shadow * light.intensity;
}

function rayTracedLight(face) {
  const direct = lightContribution(face, KEY_LIGHT) + lightContribution(face, FILL_LIGHT);
  const emissive = face.materialId === MATERIALS.psychicGlow ? 0.45 : 0;
  const goldSpecularLift = face.materialId === MATERIALS.goldArmor
    ? ({ top: 0.12, left: 0.07, right: -0.04 }[face.faceType] || 0)
    : 0;
  const topLeftFormBias = {
    top: 0.24,
    left: 0.14,
    right: -0.12,
  }[face.faceType] || 0;
  const heightLift = Math.max(0, Math.min(0.1, (face.y / HEIGHT) * 0.1));
  return Number(Math.max(0, Math.min(1, 0.22 + direct + emissive + goldSpecularLift + topLeftFormBias + heightLift)).toFixed(3));
}

// Boots and stance.
box(5, 7, 0, 3, 3, 5, MATERIALS.voidLeather, 0.1);
box(10, 12, 0, 3, 3, 5, MATERIALS.voidLeather, 0.1);
box(4, 7, 0, 1, 5, 7, MATERIALS.voidLeather, 0.1);
box(10, 13, 0, 1, 5, 7, MATERIALS.voidLeather, 0.1);

// Robe, shoulders, and hooded silhouette.
box(5, 12, 4, 13, 3, 6, MATERIALS.scholarRobe, 0.2);
box(4, 13, 11, 17, 3, 6, MATERIALS.scholarRobe, 0.25);
box(3, 14, 15, 19, 3, 6, MATERIALS.scholarRobe, 0.25);
box(6, 11, 18, 21, 3, 6, MATERIALS.scholarRobe, 0.3);

// Gold armor/inlay: shoulder caps, bracers, belt, and central robe clasp.
box(3, 5, 17, 19, 3, 5, MATERIALS.goldArmor, 0.38, ENERGY_TYPES.SHIELDING);
box(12, 14, 17, 19, 4, 6, MATERIALS.goldArmor, 0.34, ENERGY_TYPES.SHIELDING);
box(2, 4, 10, 12, 3, 5, MATERIALS.goldArmor, 0.32, ENERGY_TYPES.STRUCTURAL);
box(13, 15, 10, 12, 4, 6, MATERIALS.goldArmor, 0.28, ENERGY_TYPES.STRUCTURAL);
box(5, 12, 10, 11, 2, 3, MATERIALS.goldArmor, 0.36, ENERGY_TYPES.RESONANT);
box(8, 9, 12, 18, 2, 2, MATERIALS.goldArmor, 0.4, ENERGY_TYPES.RESONANT);

// Arms and hands.
box(2, 4, 10, 18, 3, 5, MATERIALS.scholarRobe, 0.2);
box(13, 15, 10, 18, 4, 6, MATERIALS.scholarRobe, 0.2);
box(3, 5, 17, 19, 3, 5, MATERIALS.goldArmor, 0.38, ENERGY_TYPES.SHIELDING);
box(12, 14, 17, 19, 4, 6, MATERIALS.goldArmor, 0.34, ENERGY_TYPES.SHIELDING);
box(2, 4, 10, 12, 3, 5, MATERIALS.goldArmor, 0.32, ENERGY_TYPES.STRUCTURAL);
box(13, 15, 10, 12, 4, 6, MATERIALS.goldArmor, 0.28, ENERGY_TYPES.STRUCTURAL);
box(1, 3, 8, 10, 4, 5, MATERIALS.warmSkin, 0.35, ENERGY_TYPES.RESONANT);
box(14, 16, 8, 10, 5, 6, MATERIALS.warmSkin, 0.35, ENERGY_TYPES.RESONANT);

// Head, face, hair cap.
oval(8.5, 24, 4.5, 4.2, 4.8, 3.2, MATERIALS.warmSkin, 0.35, ENERGY_TYPES.RESONANT);
box(5, 12, 27, 30, 2, 6, MATERIALS.voidLeather, 0.2, ENERGY_TYPES.ENTROPIC);
box(6, 11, 30, 31, 3, 5, MATERIALS.voidLeather, 0.2, ENERGY_TYPES.ENTROPIC);

// Eyes, sigil, and halo.
box(6, 6, 24, 24, 2, 2, MATERIALS.psychicGlow, 0.95, ENERGY_TYPES.PHOTONIC);
box(11, 11, 24, 24, 2, 2, MATERIALS.psychicGlow, 0.95, ENERGY_TYPES.PHOTONIC);
box(8, 9, 18, 18, 2, 2, MATERIALS.psychicGlow, 0.75, ENERGY_TYPES.RESONANT);
ring(8.5, 32, 4.5, 5, MATERIALS.psychicGlow, 0.85, ENERGY_TYPES.PHOTONIC);

// Back mantle and spell lattice.
box(5, 12, 8, 20, 7, 8, MATERIALS.voidLeather, 0.1, ENERGY_TYPES.SHIELDING);
for (let y = 7; y <= 21; y += 3) {
  place(8, y, 2, MATERIALS.psychicGlow, 0.7, ENERGY_TYPES.RESONANT);
  place(9, y, 2, MATERIALS.psychicGlow, 0.7, ENERGY_TYPES.RESONANT);
}

const faces = collectFaces(
  vol,
  (x, y, z) => getCellMaterialId(vol, x, y, z),
  (x, y, z) => isCellOccupied(vol, x, y, z),
).map(face => ({
  ...face,
  type: face.faceType,
  ao: faceAmbientOcclusion(face),
  light: rayTracedLight(face),
  energy: vol.energyField[cellIndex(vol, face.x, face.y, face.z)],
  energyType: vol.energyTypes[cellIndex(vol, face.x, face.y, face.z)],
}));

for (let y = 0; y < HEIGHT; y += 1) {
  for (let z = 0; z < DEPTH; z += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const materialId = getCellMaterialId(vol, x, y, z);
      if (materialId === 0) continue;
      const i = cellIndex(vol, x, y, z);
      voxels.push({
        x,
        y,
        z,
        materialId,
        energy: Number(vol.energyField[i].toFixed(3)),
        energyType: vol.energyTypes[i],
      });
    }
  }
}

const packet = {
  contract: 'PB-VOXEL-CHAR-v1',
  schemaVersion: '0.1.0',
  id: 'void-scholar-voxel-v1',
  bytecode: 'PB-VOXEL-CHAR-v1-VOID-SCHOLAR-RESONANT',
  dimensions: { width: WIDTH, height: HEIGHT, depth: DEPTH },
  materials: {
    1: { id: 'voidLeather', role: 'outline-hair-boots', colorHint: '#171021' },
    2: { id: 'scholarRobe', role: 'robe-body-dark-violet', colorHint: '#241a3f' },
    3: { id: 'goldArmor', role: 'armor-inlay-bracers-belt-clasp', colorHint: '#f6b863' },
    4: { id: 'psychicGlow', role: 'eyes-halo-lattice', colorHint: '#d9fbff' },
    5: { id: 'warmSkin', role: 'skin-hands-face-only', colorHint: '#c98f45' },
  },
  voxels,
  diagnostics: {
    occupiedVoxels: voxels.length,
    visibleFaces: faces.length,
    energyVoxels: voxels.filter(v => v.energy > 0).length,
    ambientOcclusion: {
      min: Math.min(...faces.map(face => face.ao)),
      max: Math.max(...faces.map(face => face.ao)),
      average: Number((faces.reduce((sum, face) => sum + face.ao, 0) / faces.length).toFixed(3)),
    },
    rayTracedLighting: {
      keyLight: KEY_LIGHT,
      fillLight: FILL_LIGHT,
      min: Math.min(...faces.map(face => face.light)),
      max: Math.max(...faces.map(face => face.light)),
      average: Number((faces.reduce((sum, face) => sum + face.light, 0) / faces.length).toFixed(3)),
    },
  },
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(resolve(OUT_DIR, 'void-scholar-voxel.packet.json'), JSON.stringify(packet, null, 2));
writeFileSync(resolve(OUT_DIR, 'void-scholar-voxel.preview.svg'), renderFacesToSVG(faces, {
  tileSize: 10,
  padding: 64,
  background: '#03040a',
  materialColors: CHARACTER_PALETTE,
  ambientOcclusion: true,
  ambientOcclusionStrength: 0.3,
  lighting: true,
  lightingStrength: 0.28,
  antialias: true,
}));
writeFileSync(resolve(OUT_DIR, 'void-scholar-voxel.preview.3.svg'), renderFacesToSVG(faces, {
  tileSize: 10,
  padding: 64,
  background: '#03040a',
  materialColors: CHARACTER_PALETTE,
  ambientOcclusion: true,
  ambientOcclusionStrength: 0.3,
  lighting: true,
  lightingStrength: 0.28,
  antialias: true,
}));
writeFileSync(resolve(OUT_DIR, 'void-scholar-voxel.preview.4.svg'), renderFacesToSVG(faces, {
  tileSize: 10,
  padding: 64,
  background: '#03040a',
  materialColors: CHARACTER_PALETTE,
  ambientOcclusion: true,
  ambientOcclusionStrength: 0.3,
  lighting: true,
  lightingStrength: 0.28,
  antialias: true,
}));
writeFileSync(resolve(OUT_DIR, 'void-scholar-voxel.preview.5.svg'), renderFacesToSVG(faces, {
  tileSize: 10,
  padding: 64,
  background: '#03040a',
  materialColors: CHARACTER_PALETTE,
  ambientOcclusion: true,
  ambientOcclusionStrength: 0.3,
  lighting: true,
  lightingStrength: 0.28,
  antialias: true,
}));

console.log(JSON.stringify(packet.diagnostics, null, 2));
