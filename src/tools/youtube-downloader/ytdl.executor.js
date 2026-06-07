import youtubedl from 'youtube-dl-exec';
import { YtdlError, YTDL_ERROR_CATEGORIES, YTDL_ERROR_CODES } from './ytdl.errors.js';
import { cleanupDirectory } from './ytdl.paths.js';

export async function fetchInfo(url) {
  try {
    return await youtubedl(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      skipDownload: true
    });
  } catch (e) {
    throw new YtdlError(
      YTDL_ERROR_CATEGORIES.DOWNLOAD,
      YTDL_ERROR_CODES.DOWNLOAD_FAILED,
      `Failed to fetch video info: ${e.message}`,
      { url, error: e.message }
    );
  }
}

export async function downloadMedia(url, options, outputDir) {
  const ytdlOptions = {
    output: options.outputTemplate,
    format: options.format,
    writeInfoJson: options.writeInfoJson,
    writeThumbnail: options.writeThumbnail,
    embedMetadata: options.embedMetadata,
    noWarnings: true,
    restrictFilenames: true,
    noCallHome: true
  };

  if (options.remuxVideo) {
    ytdlOptions.remuxVideo = options.remuxVideo;
  }

  if (options.extractAudio) {
    ytdlOptions.extractAudio = true;
    ytdlOptions.audioFormat = options.audioFormat;
  }

  if (options.skipDownload) {
    ytdlOptions.skipDownload = true;
  }

  try {
    await youtubedl(url, ytdlOptions);
  } catch (e) {
    // Clean up partial downloads on failure
    await cleanupDirectory(outputDir);
    
    throw new YtdlError(
      YTDL_ERROR_CATEGORIES.DOWNLOAD,
      YTDL_ERROR_CODES.DOWNLOAD_FAILED,
      `Failed to download media: ${e.message}`,
      { url, options, error: e.message }
    );
  }
}
