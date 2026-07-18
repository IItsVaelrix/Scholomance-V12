/**
 * Stable source fingerprint from song-stats inputs (FNV-1a 32-bit).
 *
 * @param {{ raw: string, rhymeWindow: number, alignmentId?: string | null, beatGridId?: string | null }} inputs
 * @returns {string}
 */
export function buildSourceFingerprint({ raw, rhymeWindow, alignmentId = null, beatGridId = null }) {
  const payload = JSON.stringify({ raw, rhymeWindow, alignmentId, beatGridId });
  let hash = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
