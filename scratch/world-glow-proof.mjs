// Smoke-proof the WorldScenePortal glow path on a single-chunk world:
// collectWorldSeeds -> seedsToLightPoints -> worldRenderOptions (the exact chain
// the portal now uses). before = AO+AA only, after = + seed glow cue.
import { createChunkedWorldVolume, getOrLoadChunk, generateWorldChunk, collectWorldSeeds } from '../codex/core/pixelbrain/chunked-world-volume.js';
import { collectFaces } from '../codex/core/pixelbrain/iso-projector.js';
import { getCellMaterialId, isCellOccupied } from '../codex/core/pixelbrain/voxel-volume.js';
import { renderFacesToSVG } from '../codex/core/pixelbrain/voxel-svg-renderer.js';
import { worldRenderOptions, seedsToLightPoints } from '../codex/core/pixelbrain/world-render-options.js';
import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import sharp from 'sharp';

const worldSpec = { chunkSize: { w: 32, h: 32, d: 32 }, chunkCount: { x: 1, y: 1, z: 1 }, seed: 7, formula: { type: 'fibonacci', iterations: 6, scale: 0.75 } };
const world = createChunkedWorldVolume(worldSpec);
getOrLoadChunk(world, 0, 0, 0, generateWorldChunk);
const vol = world.chunks.get('0,0,0');

const faces = collectFaces(vol, (x, y, z) => getCellMaterialId(vol, x, y, z), (x, y, z) => isCellOccupied(vol, x, y, z))
  .map(f => ({ ...f, type: f.faceType }));

const lightPoints = seedsToLightPoints(collectWorldSeeds(world), { size: worldSpec.chunkSize.w });
console.log(`faces=${faces.length} worldSeeds=${collectWorldSeeds(world).length} lightPoints=${lightPoints.length}`);

const before = renderFacesToSVG(faces, worldRenderOptions());
const after = renderFacesToSVG(faces, worldRenderOptions(lightPoints));
writeFileSync('scratch/_wg_before.svg', before);
writeFileSync('scratch/_wg_after.svg', after);
execSync('rsvg-convert -w 300 scratch/_wg_before.svg -o scratch/_wg_before.png');
execSync('rsvg-convert -w 300 scratch/_wg_after.svg -o scratch/_wg_after.png');
const m = await sharp('scratch/_wg_before.png').metadata();
await sharp({ create: { width: m.width * 2 + 8, height: m.height, channels: 3, background: '#000' } })
  .composite([{ input: 'scratch/_wg_before.png', left: 0, top: 0 }, { input: 'scratch/_wg_after.png', left: m.width + 8, top: 0 }])
  .png().toFile('scratch/world-glow-proof.png');
console.log('left = AO+AA only, right = + seed glow cue');
