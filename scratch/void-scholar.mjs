// VOID Scholar — voxel sprite draft v5 @ 64^3
// Robe lifted off the floor over legs + obsidian shoes; real protruding sleeves.
import {
  createVoxelVolume, setCellMaterial, setCellOccupancy,
  getCellMaterialId, isCellOccupied,
} from '../codex/core/pixelbrain/voxel-volume.js';
import { collectFaces, project } from '../codex/core/pixelbrain/iso-projector.js';
import { renderFacesToSVG } from '../codex/core/pixelbrain/voxel-svg-renderer.js';
import { writeFileSync } from 'node:fs';

// 1 obsidian/void-dark, 2 mid gray (legs/cuff/hem), 3 light gray (staff), 4 void-blue
const ROBE = 4, VOIDFACE = 1, TRIM = 2, STAFF = 3, ORB = 4, LEG = 2, SHOE = 1, HAND = 1;

const W = 64, H = 64, D = 64;
const vol = createVoxelVolume(W, H, D);
const cx = 30, cz = 30;

const put = (x, y, z, m) => {
  x = Math.round(x); y = Math.round(y); z = Math.round(z);
  if (x < 0 || y < 0 || z < 0 || x >= W || y >= H || z >= D) return;
  setCellOccupancy(vol, x, y, z, true);
  setCellMaterial(vol, x, y, z, m);
};
const lerp = (a, b, t) => a + (b - a) * t;
const disc = (xc, y, zc, r, m) => {
  for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++)
    for (let dz = -Math.ceil(r); dz <= Math.ceil(r); dz++)
      if (dx * dx + dz * dz <= r * r) put(xc + dx, y, zc + dz, m);
};

// ---- Legs + obsidian shoes: forward + apart so they clear the hemline ----
// Feet pushed toward the camera (+x,+z) and separated along screen-x (x - z),
// shoe toes biased forward so they protrude past the lifted robe hem.
const FEET = [{ x: cx + 5, z: cz + 0 }, { x: cx + 0, z: cz + 5 }]; // R then L on screen
for (const f of FEET) {
  for (let y = 4; y <= 14; y++) disc(f.x, y, f.z, 2.0, LEG);     // shin (hidden inside robe above hem)
  for (let y = 2; y <= 3; y++)                                   // obsidian shoe, toe to camera
    for (let dx = -1; dx <= 3; dx++) for (let dz = -1; dz <= 3; dz++)
      put(f.x + dx, y, f.z + dz, SHOE);
}

// ---- Robe body: hem lifted to y8, straight slim column (no overhang flare) ----
function robeRadius(y) {
  if (y <= 22) return 7.5;                          // straight lower robe
  if (y <= 40) return lerp(7.5, 8.5, (y - 22) / 18);// gentle widen to torso
  if (y <= 45) return lerp(8.5, 10, (y - 40) / 5);  // shoulder flare
  return 9;
}
for (let y = 8; y <= 45; y++) {
  const base = robeRadius(y);
  for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) {
    const dx = x - cx, dz = z - cz;
    const theta = Math.atan2(dz, dx);
    const r = base * (1 + 0.03 * Math.cos(6 * theta + 0.5)); // subtle folds, no front seam
    if (dx * dx + dz * dz <= r * r) put(x, y, z, y <= 9 ? TRIM : ROBE);
  }
}

// ---- Sleeves: real tubes that protrude past the robe edge, ending in hands ----
function buildArm(axc, azc) {
  for (let y = 28; y <= 44; y++) disc(axc, y, azc, y <= 30 ? 2.4 : 3.0, ROBE); // sleeve
  for (let y = 27; y <= 28; y++) {                                             // cuff ring
    for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
      const d2 = dx * dx + dz * dz; if (d2 <= 9 && d2 >= 3) put(axc + dx, y, azc + dz, TRIM);
    }
  }
  for (let y = 24; y <= 26; y++) disc(axc, y, azc, 1.6, HAND);                 // dark hand peeking out
}
buildArm(cx + 10, cz);  // +x sleeve (screen right)
buildArm(cx, cz + 10);  // +z sleeve (screen left)

// ---- Neck inset (shoulder/head break) ----
for (let y = 46; y <= 48; y++) disc(cx, y, cz, 4.5, ROBE);

// ---- Hood: cowl opening toward camera over a dark void face ----
const FACE_LO = 51, FACE_HI = 58;
const hoodInner = (y) => lerp(8, 3.2, (y - 49) / 13) - 2.6;
for (let y = 49; y <= 62; y++) {
  const t = (y - 49) / 13, rO = lerp(8, 3.2, t), rI = rO - 2.6;
  for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) {
    const dx = x - cx, dz = z - cz, d2 = dx * dx + dz * dz;
    if (d2 <= rO * rO && d2 >= rI * rI) {
      const front = dx >= 0 && dz >= 0 && (dx + dz) > rI * 0.5;
      if (y >= FACE_LO && y <= FACE_HI && front) continue; // open the face
      put(x, y, z, ROBE);
    }
  }
}
for (let y = FACE_LO; y <= FACE_HI; y++) disc(cx, y, cz, hoodInner(y), VOIDFACE); // void fill

// ---- Glowing void-eyes on the camera-facing cavity surface ----
const EYE_Y = 55;
const eye1 = { x: cx + 3, y: EYE_Y, z: cz + 1 }; // screen-right
const eye2 = { x: cx + 1, y: EYE_Y, z: cz + 3 }; // screen-left
for (const e of [eye1, eye2]) put(e.x, e.y, e.z, ORB);

// ---- Staff + orb ----
const stx = cx + 19, stz = cz;
for (let y = 2; y <= 50; y++) put(stx, y, stz, STAFF);
for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) for (let dz = -3; dz <= 3; dz++)
  if (dx * dx + dy * dy + dz * dz <= 9.5) put(stx + dx, 54 + dy, stz + dz, ORB);

// ---- render ----
const faces = collectFaces(vol,
  (x, y, z) => getCellMaterialId(vol, x, y, z),
  (x, y, z) => isCellOccupied(vol, x, y, z));
const FACE_LIGHT = { top: 1.0, left: 0.55, right: 0.3 };
for (const f of faces) { f.type = f.faceType; f.light = FACE_LIGHT[f.faceType] ?? 0.5; }

const fg = project(cx + 3, (FACE_LO + FACE_HI) / 2, cz + 3), og = project(stx, 54, stz);
const e1 = project(eye1.x, eye1.y, eye1.z), e2 = project(eye2.x, eye2.y, eye2.z);
const lightPoints = [
  { sx: fg.sx, sy: fg.sy, r: 110, schoolId: 'VOID', energy: 0.45 },
  { sx: og.sx, sy: og.sy, r: 120, schoolId: 'VOID', energy: 1.0 },
  { sx: e1.sx, sy: e1.sy, r: 20, schoolId: 'VOID', energy: 1.0 },
  { sx: e2.sx, sy: e2.sy, r: 20, schoolId: 'VOID', energy: 1.0 },
];

const svg = renderFacesToSVG(faces, {
  background: '#0b1020', ambientOcclusion: true, ambientOcclusionStrength: 0.45,
  lighting: true, antialias: true, lightPoints,
});
writeFileSync(new URL('./void-scholar.svg', import.meta.url), svg);
console.log(`faces=${faces.length} svg bytes=${svg.length}`);
