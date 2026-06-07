import { YTDL_CONFIG } from './ytdl.config.js';
import { YtdlError, YTDL_ERROR_CATEGORIES, YTDL_ERROR_CODES } from './ytdl.errors.js';

export function normalizeYoutubeUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch (e) {
    throw new YtdlError(
      YTDL_ERROR_CATEGORIES.INPUT,
      YTDL_ERROR_CODES.URL_INVALID,
      `Invalid URL provided: ${rawUrl}`,
      { rawUrl }
    );
  }

  const host = url.hostname.toLowerCase();

  if (!YTDL_CONFIG.allowedHosts.has(host)) {
    throw new YtdlError(
      YTDL_ERROR_CATEGORIES.INPUT,
      YTDL_ERROR_CODES.HOST_UNSUPPORTED,
      `Unsupported host: ${host}`,
      { host }
    );
  }

  // Reject playlist URLs
  if (url.searchParams.has('list')) {
    throw new YtdlError(
      YTDL_ERROR_CATEGORIES.INPUT,
      YTDL_ERROR_CODES.URL_INVALID,
      `Playlists are not supported in v1. Remove the 'list' parameter.`,
      { rawUrl }
    );
  }

  return url.toString();
}
