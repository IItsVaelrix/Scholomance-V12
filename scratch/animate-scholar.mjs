// PROVE THE D-LAYER end-to-end: animate the VOID scholar by driving its blocks
// through voxel-rig (pivots) + voxel-keyframe (compose/apply/frameAt), re-voxelize
// per frame, render, and assemble a GIF + a verification montage.
import {
  createVoxelVolume, setCellOccupancy, setCellMaterial,
  getCellMaterialId, isCellOccupied,
} from '../codex/core/pixelbrain/voxel-volume.js';
import { collectFaces, project } from '../codex/core/pixelbrain/iso-projector.js';
import { renderFacesToSVG } from '../codex/core/pixelbrain/voxel-svg-renderer.js';
import { createRig, addNode, worldPivot } from '../codex/core/pixelbrain/voxel-rig.js';
import { composeTransform, applyTransform, frameAt, FPS_DEFAULT } from '../codex/core/pixelbrain/voxel-keyframe.js';
import { buildScholarCells } from './scholar-cells.mjs';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import sharp from 'sharp';

const { cells, meta } = buildScholarCells();
const { cx, cz, stx, stz, faceMid, eyes, orbCenter } = meta;

// --- Rig: one node per animatable block; pivots are world-space (root-relative) ---
const rig = createRig();
const PIVOTS = {
  body:  { x: cx, y: 2, z: cz },          // bob/sway about the base
  armR:  { x: cx + 10, y: 44, z: cz },    // shoulder
  armL:  { x: cx, y: 44, z: cz + 10 },    // shoulder
  staff: { x: stx, y: 2, z: stz },        // staff foot
  orb:   { x: stx, y: 54, z: stz },       // orb center (scale pulse)
};
for (const [name, pivot] of Object.entries(PIVOTS)) addNode(rig, { name, parent: 'root', pivot });

// --- Per-block keyframe as a function of loop angle a ∈ [0,2π) ---
function keyframeFor(block, a) {
  const s = Math.sin(a);
  switch (block) {
    case 'body':  return { translate: { x: 0, y: 0.6 * s, z: 0 }, rotateDeg: { x: 0, y: 3 * s, z: 0 } };
    case 'armR':  return { rotateDeg: { x: 7 * s, y: 0, z: 0 } };   // swing forward/back
    case 'armL':  return { rotateDeg: { x: -7 * s, y: 0, z: 0 } };  // opposite phase
    case 'staff': return { translate: { y: 0.4 * Math.sin(a + 1) } };
    case 'orb':   return { translate: { y: 0.4 * Math.sin(a + 1) }, scale: { x: 1 + 0.12 * Math.sin(2 * a), y: 1 + 0.12 * Math.sin(2 * a), z: 1 + 0.12 * Math.sin(2 * a) } };
    default:      return {};
  }
}

// transform a world point through a block's keyframe (reuses the D-layer path)
const xform = (block, a, p) =>
  applyTransform(p, composeTransform(keyframeFor(block, a), worldPivot(rig, block)));

const N = 16;
const SUB = [-0.25, 0.25]; // 8-corner subsampling to keep rotated solids hole-free
const FRAMES_DIR = new URL('./frames/', import.meta.url);
rmSync(FRAMES_DIR, { recursive: true, force: true });
mkdirSync(FRAMES_DIR, { recursive: true });

// ---- pass 1: transform + collect faces per frame, track a global screen bbox ----
const perFrame = [];
let gMinX = Infinity, gMinY = Infinity, gMaxX = -Infinity, gMaxY = -Infinity;
const FACE_LIGHT = { top: 1.0, left: 0.55, right: 0.3 };

for (let f = 0; f < N; f++) {
  // frameAt sanity: the f-th frame sits at f/fps seconds (proves the D2 timeline map)
  const sec = f / FPS_DEFAULT;
  if (frameAt(sec, FPS_DEFAULT) !== f) throw new Error(`frameAt mismatch at ${f}`);
  const a = (2 * Math.PI * f) / N;

  const vol = createVoxelVolume(64, 64, 64);
  for (const c of cells) {
    for (const ox of SUB) for (const oy of SUB) for (const oz of SUB) {
      const p = xform(c.block, a, { x: c.x + ox, y: c.y + oy, z: c.z + oz });
      const x = Math.round(p.x), y = Math.round(p.y), z = Math.round(p.z);
      if (x < 0 || y < 0 || z < 0 || x >= 64 || y >= 64 || z >= 64) continue;
      setCellOccupancy(vol, x, y, z, true);
      setCellMaterial(vol, x, y, z, c.m);
    }
  }

  const faces = collectFaces(vol,
    (x, y, z) => getCellMaterialId(vol, x, y, z),
    (x, y, z) => isCellOccupied(vol, x, y, z));
  for (const fc of faces) { fc.type = fc.faceType; fc.light = FACE_LIGHT[fc.faceType] ?? 0.5; }
  for (const fc of faces) {
    if (fc.sx < gMinX) gMinX = fc.sx; if (fc.sy < gMinY) gMinY = fc.sy;
    if (fc.sx > gMaxX) gMaxX = fc.sx; if (fc.sy > gMaxY) gMaxY = fc.sy;
  }

  // glow points, transformed through the same D-layer path so they track the parts
  const fg = xform('body', a, { x: cx + 3, y: faceMid, z: cz + 3 });
  const og = xform('orb', a, orbCenter);
  const e1 = xform('body', a, eyes[0]); const e2 = xform('body', a, eyes[1]);
  const lp = (p, r, e) => { const s = project(p.x, p.y, p.z); return { sx: s.sx, sy: s.sy, r, schoolId: 'VOID', energy: e }; };
  const lightPoints = [lp(fg, 110, 0.45), lp(og, 120, 1.0), lp(e1, 20, 1.0), lp(e2, 20, 1.0)];

  perFrame.push({ faces, lightPoints });
}

// ---- pass 2: pin a constant frame with invisible sentinel faces, render, rasterize ----
const M = 24; // margin in screen units
const sentinel = (sx, sy) => ({ type: 'top', materialId: 0, sx, sy, ao: 0, light: 0.5 });
const pinMin = sentinel(gMinX - M, gMinY - M);
const pinMax = sentinel(gMaxX + M, gMaxY + M);

for (let f = 0; f < N; f++) {
  const { faces, lightPoints } = perFrame[f];
  const svg = renderFacesToSVG([pinMin, pinMax, ...faces], {
    background: '#0b1020', ambientOcclusion: true, ambientOcclusionStrength: 0.45,
    lighting: true, antialias: true, lightPoints,
  });
  const idx = String(f).padStart(3, '0');
  const svgPath = new URL(`./frames/frame_${idx}.svg`, import.meta.url);
  writeFileSync(svgPath, svg);
  execSync(`rsvg-convert -w 300 "${svgPath.pathname}" -o "${new URL(`./frames/frame_${idx}.png`, import.meta.url).pathname}"`);
}

// ---- GIF (12 fps loop) ----
const framesGlob = new URL('./frames/frame_%03d.png', import.meta.url).pathname;
const gifPath = new URL('./scholar-anim.gif', import.meta.url).pathname;
execSync(`ffmpeg -y -framerate 12 -i "${framesGlob}" -filter_complex "[0:v] split [a][b];[a] palettegen [p];[b][p] paletteuse" "${gifPath}" 2>/dev/null`);

// ---- verification montage: 4x4 grid of the 16 frames ----
const tile = await sharp(new URL('./frames/frame_000.png', import.meta.url).pathname).metadata();
const TW = Math.round(tile.width / 2), TH = Math.round(tile.height / 2);
const composites = [];
for (let f = 0; f < N; f++) {
  const idx = String(f).padStart(3, '0');
  const buf = await sharp(new URL(`./frames/frame_${idx}.png`, import.meta.url).pathname).resize(TW, TH).toBuffer();
  composites.push({ input: buf, left: (f % 4) * TW, top: Math.floor(f / 4) * TH });
}
await sharp({ create: { width: TW * 4, height: TH * 4, channels: 3, background: '#000' } })
  .composite(composites).png().toFile(new URL('./scholar-montage.png', import.meta.url).pathname);

console.log(`frames=${N} fps=12 gif=scholar-anim.gif montage=scholar-montage.png`);
console.log(`global bbox sx[${gMinX.toFixed(0)},${gMaxX.toFixed(0)}] sy[${gMinY.toFixed(0)},${gMaxY.toFixed(0)}]`);
