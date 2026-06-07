import path from 'node:path';
import fs from 'node:fs/promises';

export function resolveOutputDir({ outputRoot, profile, videoId }) {
  return path.join(outputRoot, profile, videoId);
}

export function createOutputTemplate(outputDir) {
  return path.join(outputDir, 'source.%(ext)s');
}

export async function ensureDirectory(dir) {
  await fs.mkdir(dir, { recursive: true });
}

export async function cleanupDirectory(dir) {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (e) {
    // Ignore errors on cleanup
  }
}
