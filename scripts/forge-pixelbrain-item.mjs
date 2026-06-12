/**
 * Forge a PixelBrain item from an archived ITEM-SPEC-v1 file.
 *
 * Usage:
 *   node scripts/forge-pixelbrain-item.mjs specs/scimitar.hd.v1.json [--out output/foundry/scimitar] [--scale 4]
 *
 * Writes the full Foundry bundle:
 *   - <name>.json        PixelBrainAssetPacket (embeds spec id + hash)
 *   - <name>.pbrain      godot-ready artifact
 *   - <name>.gdshader    Godot canvas_item shader (when spec.shader present)
 *   - <name>.phaser.js   Phaser PostFXPipeline (when spec.shader present)
 *   - <name>.png         rendered sprite
 *   - <name>.forge.diagnostics.json   spec hash, shader hash, provenance
 *
 * The spec FILE is the provenance authority: the bundle's embedded spec hash
 * must always re-derive from the archived spec, so any forge output can be
 * regenerated from the repo alone.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, basename } from 'node:path';

import { forgeItemAsset } from '../codex/core/pixelbrain/item-foundry.js';
import { hashItemSpec } from '../codex/core/pixelbrain/item-spec.js';

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--out') args.out = argv[++i];
    else if (argv[i] === '--scale') args.scale = Number(argv[++i]);
    else args._.push(argv[i]);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const specPath = args._[0];
if (!specPath) {
  console.error('Usage: node scripts/forge-pixelbrain-item.mjs <spec.json> [--out <dir>] [--scale <n>]');
  process.exit(1);
}

const rawSpec = JSON.parse(readFileSync(resolve(specPath), 'utf8'));
const name = String(rawSpec.archetype || basename(specPath).replace(/\.json$/i, ''));
const outDir = resolve(args.out || `output/foundry/${name}`);
mkdirSync(outDir, { recursive: true });

const bundle = forgeItemAsset(rawSpec, { pngScale: Number.isFinite(args.scale) ? args.scale : 4 });
const specHash = hashItemSpec(bundle.spec);

writeFileSync(resolve(outDir, `${name}.json`), JSON.stringify(bundle.assetPacket, null, 2), 'utf8');
writeFileSync(resolve(outDir, `${name}.pbrain`), bundle.godotArtifact, 'utf8');
if (bundle.godotShader) writeFileSync(resolve(outDir, `${name}.gdshader`), bundle.godotShader, 'utf8');
if (bundle.phaserPipeline) writeFileSync(resolve(outDir, `${name}.phaser.js`), bundle.phaserPipeline, 'utf8');
if (bundle.png) writeFileSync(resolve(outDir, `${name}.png`), bundle.png);
writeFileSync(
  resolve(outDir, `${name}.forge.diagnostics.json`),
  JSON.stringify(
    {
      spec: { file: resolve(specPath), id: bundle.spec.id, hash: specHash },
      shader: bundle.shader ? { id: bundle.shader.packet.id, hash: bundle.shader.hash } : null,
      cells: bundle.assetPacket.geometry.coordinates.length,
      motifCells: bundle.motifs.cells.size,
      fillHash: bundle.fills.hash,
      assetPacketId: bundle.assetPacket.id,
    },
    null,
    2,
  ),
  'utf8',
);

console.log('==================================================');
console.log(`  FOUNDRY FORGE — ${bundle.spec.id}`);
console.log('==================================================');
console.log(`  spec hash    : ${specHash}`);
console.log(`  shader hash  : ${bundle.shader ? bundle.shader.hash : '(no shader)'}`);
console.log(`  cells        : ${bundle.assetPacket.geometry.coordinates.length}`);
console.log(`  motif cells  : ${bundle.motifs.cells.size}`);
console.log(`  → ${outDir}/${name}.{json,pbrain,gdshader,phaser.js,png,forge.diagnostics.json}`);
console.log('==================================================');
