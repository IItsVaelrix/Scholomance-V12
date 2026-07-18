import { useEffect, useMemo, useRef } from 'react';
import { buildSourceFingerprint } from '../../codex/core/song-stats/fingerprint.js';
import { DEFAULT_BEATS_PER_LINE, DEFAULT_BPM, DEFAULT_RHYME_WINDOW } from '../../codex/core/song-stats/constants.js';
import { resolveSongStatsDisplay } from '../../codex/core/song-stats/staleGuard.js';

/**
 * Bridges the server-attached `songStats` field (computed server-side from
 * the same AnalyzedDocument used for the rest of panel analysis) into
 * Read-page state, applying the fingerprint-identity stale guard so a
 * failed computation never silently shows a result for different lyrics.
 *
 * @param {string} rawText - the current scroll/editor content driving analysis
 * @param {{ songStats?: import('../../codex/core/song-stats/types.js').SongStatsResult | null } | null} deepAnalysis
 * @returns {{
 *   songStats: import('../../codex/core/song-stats/types.js').SongStatsResult | null,
 *   computeFailed: boolean,
 * }}
 */
export function useSongStats(rawText, deepAnalysis) {
  const lastGoodRef = useRef(null);

  const currentFingerprint = useMemo(() => buildSourceFingerprint({
    raw: String(rawText || ''),
    rhymeWindow: DEFAULT_RHYME_WINDOW,
    bpm: DEFAULT_BPM,
    beatsPerLine: DEFAULT_BEATS_PER_LINE,
  }), [rawText]);

  const nextResult = deepAnalysis?.songStats ?? null;
  // deepAnalysis being present but carrying no songStats means the server's
  // (non-fatal) computeSongStats pass failed for this analysis round; a
  // missing deepAnalysis just means there is nothing to show yet.
  const computeFailed = Boolean(deepAnalysis) && !nextResult;

  useEffect(() => {
    if (nextResult) {
      lastGoodRef.current = nextResult;
    }
  }, [nextResult]);

  const songStats = resolveSongStatsDisplay({
    computeFailed,
    lastGood: lastGoodRef.current,
    currentFingerprint,
    nextResult,
  });

  return {
    songStats,
    computeFailed: computeFailed && !songStats,
  };
}
