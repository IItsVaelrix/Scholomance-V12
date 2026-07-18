/**
 * Stale-result guard for CODEx Song Stats.
 *
 * Decides what the panel should display when a compute attempt fails,
 * comparing the last known-good result's source fingerprint against the
 * fingerprint of the content currently on screen. A stale result is only
 * ever shown when it still matches the live content identity; otherwise
 * the panel must show an explicit `stats_compute_failed` empty state
 * rather than silently displaying results for different lyrics.
 */

/** @typedef {import('./types.js').SongStatsResult} SongStatsResult */

/**
 * @param {{
 *   computeFailed: boolean,
 *   lastGood: SongStatsResult | null | undefined,
 *   currentFingerprint: string | null | undefined,
 *   nextResult: SongStatsResult | null | undefined,
 * }} params
 * @returns {SongStatsResult | null}
 */
export function resolveSongStatsDisplay({ computeFailed, lastGood, currentFingerprint, nextResult }) {
  if (!computeFailed) return nextResult;
  if (lastGood?.meta?.sourceFingerprint === currentFingerprint) return lastGood;
  return null; // empty → panel shows stats_compute_failed
}
