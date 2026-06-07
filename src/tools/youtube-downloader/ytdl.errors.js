export const YTDL_ERROR_CATEGORIES = Object.freeze({
  POLICY: 'POLICY',
  INPUT: 'INPUT',
  TOOLCHAIN: 'TOOLCHAIN',
  DOWNLOAD: 'DOWNLOAD',
  FILESYSTEM: 'FILESYSTEM',
  MANIFEST: 'MANIFEST'
});

export const YTDL_ERROR_CODES = Object.freeze({
  RIGHTS_REQUIRED: 0x1001,
  LICENSE_REQUIRED: 0x1002,
  URL_INVALID: 0x1101,
  HOST_UNSUPPORTED: 0x1102,
  PROFILE_UNKNOWN: 0x1103,
  BINARY_MISSING: 0x1201,
  DOWNLOAD_FAILED: 0x1301,
  WRITE_FAILED: 0x1401,
  MANIFEST_INVALID: 0x1501
});

export class YtdlError extends Error {
  constructor(category, code, message, context = {}) {
    super(message);
    this.name = 'YtdlError';
    this.module = 'YTDL';
    this.category = category;
    this.code = code;
    this.context = context;
  }

  toJSON() {
    return {
      module: this.module,
      category: this.category,
      code: this.code,
      message: this.message,
      context: this.context
    };
  }
}
