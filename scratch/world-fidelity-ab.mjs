// Fidelity A/B on real world-gen output. NO asset or portal is mutated.
// BEFORE = exactly what the portals do today: renderFacesToSVG(faces)
// AFTER  = the renderer quality already available + the photonic lightPoints
//          the world loop ALREADY computes but the portals drop.
import { buildQbitWorldGameLoop, QBIT_WORLD_PRESETS } from '../codex/core/pixelbrain/qbit-world-game-loop.js';
import { renderFacesToSVG } from '../codex/core/pixelbrain/voxel-svg-renderer.js';
import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import sharp from 'sharp';

const SCHOOLS = ['VOID', 'ALCHEMY'];
const png = async (svg, name) => {
  const p = `scratch/_${name}.svg`;
  writeFileSync(p, svg);
  execSync(`rsvg-convert -w 300 "${p}" -o "scratch/_${name}.png"`);
  return `scratch/_${name}.png`;
};

const rows = [];
for (const school of SCHOOLS) {
  const world = buildQbitWorldGameLoop(QBIT_WORLD_PRESETS[school]);
  const { faces, lightPoints } = world;

  const before = renderFacesToSVG(faces);                 // current portal behavior
  const after = renderFacesToSVG(faces, {                 // available fidelity
    background: '#0b1020',
    ambientOcclusion: true, ambientOcclusionStrength: 0.45,
    lighting: true, antialias: true,
    lightPoints,                                          // photonic glow, currently discarded
  });

  const b = await png(before, `${school}_before`);
  const a = await png(after, `${school}_after`);
  rows.push({ school, b, a, faces: faces.length, lp: lightPoints.length });
}

// stitch a labeled 2x2 (rows = schools, cols = before|after)
const meta = await sharp(rows[0].b).metadata();
const W = meta.width, H = meta.height, pad = 6;
const composites = [];
for (let i = 0; i < rows.length; i++) {
  composites.push({ input: rows[i].b, left: 0, top: i * (H + pad) });
  composites.push({ input: rows[i].a, left: W + pad, top: i * (H + pad) });
}
await sharp({ create: { width: W * 2 + pad, height: rows.length * (H + pad) - pad, channels: 3, background: '#000' } })
  .composite(composites).png().toFile('scratch/world-fidelity-ab.png');

console.log('rows:', rows.map(r => `${r.school} faces=${r.faces} lightPoints=${r.lp}`).join(' | '));
console.log('left col = BEFORE (portal default), right col = AFTER (AO+AA+glow)');
