// Export the blue/black VOID scholar (scholar-cells.mjs) as a Godot voxel packet
// for the live 3D avatar. Drops the staff + orb (scholar holds the pickaxe), keeps
// each voxel's animation `block` tag (body | armR | armL) so the GDScript rig can
// pivot the parts. Colors follow void-scholar.mjs's documented palette:
//   1 obsidian/void-dark, 2 mid gray (legs/cuff/hem), 3 light gray (staff), 4 void-blue
import { buildScholarCells } from './scholar-cells.mjs';
import { writeFileSync } from 'node:fs';

const { cells, meta } = buildScholarCells();
const { cx, cz } = meta;
const EYE_MATERIAL = 5;
const eyeKey = (p) => `${p.x},${p.y},${p.z}`;
const eyeSet = new Set(meta.eyes.map(eyeKey));

// The source tags legs/shoes as 'body', so they only bob. Reclassify the two leg
// columns into their own blocks (legR near foot (cx+5,cz); legL near (cx,cz+5))
// with hip pivots, so the rig can swing them for a walk cycle. A body voxel is a
// leg if it sits low (shoes, y<=7) or hugs a foot center (shins inside the robe).
function legBlockFor(c) {
  if (c.block !== 'body' || c.y > 15) return null;
  const dR = (c.x - (cx + 5)) ** 2 + (c.z - cz) ** 2;
  const dL = (c.x - cx) ** 2 + (c.z - (cz + 5)) ** 2;
  if (c.y > 7 && Math.min(dR, dL) > 9) return null; // robe, not a shin
  return dR <= dL ? 'legR' : 'legL';
}

// Keep only animatable body/arm parts — staff + orb are dropped entirely.
const kept = cells.filter((c) => c.block === 'body' || c.block === 'armR' || c.block === 'armL');

// Normalize to a tight, origin-based grid (min corner -> 0) so the Godot loader's
// centering math is stable and independent of the 64^3 authoring canvas.
let minX = Infinity, minY = Infinity, minZ = Infinity;
let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
for (const c of kept) {
  minX = Math.min(minX, c.x); minY = Math.min(minY, c.y); minZ = Math.min(minZ, c.z);
  maxX = Math.max(maxX, c.x); maxY = Math.max(maxY, c.y); maxZ = Math.max(maxZ, c.z);
}

const voxels = kept.map((c) => ({
  x: c.x - minX,
  y: c.y - minY,
  z: c.z - minZ,
  // The two void-eyes share the robe material in the source; promote them to a
  // dedicated emissive material so they glow inside the dark hood cavity.
  materialId: eyeSet.has(eyeKey(c)) ? EYE_MATERIAL : c.m,
  block: legBlockFor(c) ?? c.block,
}));

// Pivots from animate-scholar.mjs, shifted into the normalized grid frame.
const pivots = {
  body: { x: 30 - minX, y: 2 - minY, z: 30 - minZ },
  armR: { x: 40 - minX, y: 44 - minY, z: 30 - minZ },
  armL: { x: 30 - minX, y: 44 - minY, z: 40 - minZ },
  legR: { x: cx + 5 - minX, y: 14 - minY, z: cz - minZ },
  legL: { x: cx - minX, y: 14 - minY, z: cz + 5 - minZ },
};

const packet = {
  contract: 'PB-VOXEL-CHAR-v1',
  schemaVersion: '0.2.0',
  id: 'void-scholar-blue-rigged-v1',
  bytecode: 'PB-VOXEL-CHAR-v1-VOID-SCHOLAR-BLUE-RIGGED',
  dimensions: { width: maxX - minX + 1, height: maxY - minY + 1, depth: maxZ - minZ + 1 },
  pivots,
  materials: {
    1: { id: 'voidDark', role: 'face-shoes-hands', colorHint: '#15161f' },
    2: { id: 'midGray', role: 'legs-cuff-hem-trim', colorHint: '#aeb6c4' },
    4: { id: 'voidBlue', role: 'robe-body', colorHint: '#5cc8f5', energy: 0.0 },
    5: { id: 'voidEye', role: 'glowing-eyes', colorHint: '#cdf6ff', energy: 1.3 },
  },
  voxels,
};

const out = new URL('../godot_project/assets/void-scholar-blue.packet.json', import.meta.url);
writeFileSync(out, JSON.stringify(packet, null, 2));
console.log(`voxels=${voxels.length} dims=${packet.dimensions.width}x${packet.dimensions.height}x${packet.dimensions.depth}`);
const count = (b) => voxels.filter((v) => v.block === b).length;
console.log(`blocks: body=${count('body')} armR=${count('armR')} armL=${count('armL')} legR=${count('legR')} legL=${count('legL')}`);
console.log(`pivots: ${JSON.stringify(pivots)}`);
