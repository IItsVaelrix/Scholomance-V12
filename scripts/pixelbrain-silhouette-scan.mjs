#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import sharp from 'sharp';
import { generateSilhouetteFromImage } from '../codex/core/pixelbrain/image-to-pixel-art.js';
import { buildSilhFormBlock, traceContour } from '../codex/core/pixelbrain/silhouette-scan.js';

function arg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

function parseGrid(value) {
  if (!value) return { width: 32, height: 48, depth: 16 };
  const match = /^(\d+)x(\d+)x(\d+)$/.exec(value);
  if (!match) {
    throw new Error('GRID must be formatted as widthxheightxdepth, e.g. 32x48x16');
  }
  return { width: Number(match[1]), height: Number(match[2]), depth: Number(match[3]) };
}

async function pngToContour(path, canvasSize) {
  if (!path) return null;
  const image = sharp(readFileSync(path)).ensureAlpha().raw();
  const { data, info } = await image.toBuffer({ resolveWithObject: true });
  const silhouette = generateSilhouetteFromImage({
    pixelData: data,
    dimensions: { width: info.width, height: info.height },
  }, {
    ...canvasSize,
    gridSize: 1,
  });
  return traceContour(silhouette);
}

try {
  const id = arg('--id') || 'unnamed';
  const outputPath = arg('--out');
  const frontPath = arg('--front');
  const grid = parseGrid(arg('--grid'));

  if (!frontPath) {
    console.error('Usage: node scripts/pixelbrain-silhouette-scan.mjs --front front.png [--side side.png --top top.png] --id ID --out file.silh [--grid 32x48x16]');
    process.exit(1);
  }

  const front = await pngToContour(frontPath, { width: grid.width, height: grid.height });
  const side = await pngToContour(arg('--side'), { width: grid.depth, height: grid.height }) || front;
  const top = await pngToContour(arg('--top'), { width: grid.width, height: grid.depth }) || front;

  const text = buildSilhFormBlock({
    id,
    source: 'scanned',
    grid,
    tolerance: { front: 0, side: 6, top: 6 },
    views: { front, side, top },
  });

  if (outputPath) {
    writeFileSync(outputPath, text);
    console.log(`sealed ${outputPath}`);
  } else {
    process.stdout.write(text);
  }
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
