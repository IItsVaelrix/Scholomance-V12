import fs from 'node:fs/promises';
import path from 'node:path';
import { YtdlError, YTDL_ERROR_CATEGORIES, YTDL_ERROR_CODES } from './ytdl.errors.js';

export async function writeManifest(outputDir, manifestData) {
  const manifestPath = path.join(outputDir, 'manifest.json');
  
  // Discover actual files in the directory to confirm what was produced
  let filesInDir = [];
  try {
    filesInDir = await fs.readdir(outputDir);
  } catch (e) {
    throw new YtdlError(
      YTDL_ERROR_CATEGORIES.FILESYSTEM,
      YTDL_ERROR_CODES.WRITE_FAILED,
      `Failed to read output directory for manifest generation: ${outputDir}`,
      { outputDir, error: e.message }
    );
  }

  // Auto-discover the media/thumbnail/info extensions
  const files = {};
  for (const file of filesInDir) {
    if (file === 'manifest.json') continue;
    
    if (file.endsWith('.info.json')) {
      files.info = file;
    } else if (file.match(/\.(jpg|jpeg|webp|png)$/)) {
      files.thumbnail = file;
    } else {
      files.media = file; // Fallback for video/audio source
    }
  }

  const finalManifest = {
    schema: "PB-YTDL-MANIFEST-v1",
    videoId: manifestData.videoId,
    url: manifestData.url,
    licenseDeclaration: manifestData.licenseDeclaration,
    profile: manifestData.profile,
    files: files,
    createdAt: new Date().toISOString(),
    toolchain: manifestData.toolchain || {
      runner: "npm run yt",
      backend: "yt-dlp",
      wrapper: "youtube-dl-exec"
    }
  };

  try {
    await fs.writeFile(manifestPath, JSON.stringify(finalManifest, null, 2), 'utf-8');
  } catch (e) {
    throw new YtdlError(
      YTDL_ERROR_CATEGORIES.FILESYSTEM,
      YTDL_ERROR_CODES.WRITE_FAILED,
      `Failed to write manifest.json to ${outputDir}`,
      { outputDir, error: e.message }
    );
  }

  return finalManifest;
}
