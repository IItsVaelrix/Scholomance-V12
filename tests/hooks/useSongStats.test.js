// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSongStats } from '../../src/hooks/useSongStats.js';
import { buildSourceFingerprint } from '../../codex/core/song-stats/fingerprint.js';
import { DEFAULT_BEATS_PER_LINE, DEFAULT_BPM, DEFAULT_RHYME_WINDOW } from '../../codex/core/song-stats/constants.js';

function fingerprintFor(raw) {
  return buildSourceFingerprint({
    raw,
    rhymeWindow: DEFAULT_RHYME_WINDOW,
    bpm: DEFAULT_BPM,
    beatsPerLine: DEFAULT_BEATS_PER_LINE,
  });
}

function songStatsResult(sourceFingerprint) {
  return {
    wordCount: 40,
    pillars: {},
    composite: { label: 'technical_density', total0to100: 61, band: 'Adept', provisional: false, weights: {} },
    meta: { sourceFingerprint },
  };
}

describe('useSongStats', () => {
  it('returns null and no failure while there is no analysis yet', () => {
    const { result } = renderHook(() => useSongStats('some lyrics', null));
    expect(result.current.songStats).toBeNull();
    expect(result.current.computeFailed).toBe(false);
  });

  it('passes through a successful songStats result', () => {
    const raw = 'some lyrics';
    const stats = songStatsResult(fingerprintFor(raw));
    const { result } = renderHook(() => useSongStats(raw, { songStats: stats }));
    expect(result.current.songStats).toBe(stats);
    expect(result.current.computeFailed).toBe(false);
  });

  it('falls back to the last good result when a later compute fails but content is unchanged', () => {
    const raw = 'some lyrics';
    const stats = songStatsResult(fingerprintFor(raw));
    const { result, rerender } = renderHook(
      ({ text, deepAnalysis }) => useSongStats(text, deepAnalysis),
      { initialProps: { text: raw, deepAnalysis: { songStats: stats } } },
    );
    expect(result.current.songStats).toBe(stats);

    // Same content, but this round's deepAnalysis carries no songStats
    // (server-side computeSongStats failed for this pass).
    rerender({ text: raw, deepAnalysis: { songStats: null } });

    expect(result.current.songStats).toBe(stats);
    expect(result.current.computeFailed).toBe(false);
  });

  it('shows stats_compute_failed (null) when a failed compute follows edited content', () => {
    const originalText = 'some lyrics';
    const stats = songStatsResult(fingerprintFor(originalText));
    const { result, rerender } = renderHook(
      ({ text, deepAnalysis }) => useSongStats(text, deepAnalysis),
      { initialProps: { text: originalText, deepAnalysis: { songStats: stats } } },
    );
    expect(result.current.songStats).toBe(stats);

    // Content changed and the new round's compute failed.
    rerender({ text: 'completely different lyrics now', deepAnalysis: { songStats: null } });

    expect(result.current.songStats).toBeNull();
    expect(result.current.computeFailed).toBe(true);
  });
});
