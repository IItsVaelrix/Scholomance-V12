import { YTDL_CONFIG } from './ytdl.config.js';
import { YtdlError, YTDL_ERROR_CATEGORIES, YTDL_ERROR_CODES } from './ytdl.errors.js';

export function assertDownloadPolicy(args) {
  if (!args.iHaveRights) {
    throw new YtdlError(
      YTDL_ERROR_CATEGORIES.POLICY,
      YTDL_ERROR_CODES.RIGHTS_REQUIRED,
      'Download blocked: rights confirmation (--i-have-rights) is required.'
    );
  }

  if (!YTDL_CONFIG.allowedLicenses.has(args.license)) {
    throw new YtdlError(
      YTDL_ERROR_CATEGORIES.POLICY,
      YTDL_ERROR_CODES.LICENSE_REQUIRED,
      `Download blocked: valid license declaration (--license) is required. Allowed: ${Array.from(YTDL_CONFIG.allowedLicenses).join(', ')}`,
      { license: args.license }
    );
  }

  return true;
}
