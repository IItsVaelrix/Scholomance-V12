import { writeFile } from 'fs/promises';
import path from 'path';

/**
 * Local Disk Audio Adapter for Ingestion
 * Conforms to the IngestStorage interface for ingestTrackAudio.
 */
export class LocalAudioAdapter {
  constructor({ uploadPath }) {
    if (!uploadPath) throw new Error('LocalAudioAdapter requires an uploadPath');
    this.uploadPath = uploadPath;
  }

  /**
   * @param {object} args
   * @param {string} args.fingerprintId
   * @param {string} args.sha256
   * @param {Uint8Array|Buffer} args.bytes
   * @param {string} args.format
   * @param {number} args.trackId
   * @returns {Promise<{url:string}>}
   */
  async putAudio({ fingerprintId, format, bytes }) {
    // Generate filename based on fingerprint
    const extension = format === 'wav' ? 'wav' : (format === 'flac' ? 'flac' : 'mp3');
    const filename = `${fingerprintId}.${extension}`;
    const destination = path.join(this.uploadPath, filename);
    
    await writeFile(destination, bytes);
    
    return { url: `/audio/${filename}` };
  }

  /**
   * @param {object} args
   * @param {string} args.fingerprintId
   * @param {object} args.json
   * @param {number} args.trackId
   * @returns {Promise<{url:string}>}
   */
  async putSidecar({ fingerprintId, json }) {
    const filename = `${fingerprintId}.sidecar.json`;
    const destination = path.join(this.uploadPath, filename);
    
    await writeFile(destination, JSON.stringify(json, null, 2));
    
    return { url: `/audio/${filename}` };
  }
}
