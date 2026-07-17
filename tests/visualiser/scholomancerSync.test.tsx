// @vitest-environment jsdom
//
// Scholomancer has no alignment artifact, so it runs on the estimated
// (syllable-spread) sync in AlbumLyrics. Damien reports a 12s instrumental
// intro: with leadInS at DEFAULT_PACING's 0, line 01 lights up at t=0 and the
// whole lyric sheet runs ~12s ahead of the vocal.
//
// These tests pin the intro. They do NOT claim beat accuracy — the estimated
// sync spreads lines by syllable count and knows nothing about bars.
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AlbumLyrics } from '../../src/pages/Visualiser/AlbumLyrics';
import { SCHOLOMANCER } from '../../src/pages/Visualiser/tracks/scholomancer';

const resolved = {
  albumTrack: { trackId: SCHOLOMANCER.id, trackNumber: 1 },
  // No grimoireTrack id that useLyricAlignment can fetch an artifact for — the
  // estimated path is exactly what we're testing.
  grimoireTrack: null,
  title: SCHOLOMANCER.title,
  audioUrl: SCHOLOMANCER.audioUrl,
  coverUrl: SCHOLOMANCER.coverUrl,
  duration: SCHOLOMANCER.duration,
  available: true,
  lyrics: SCHOLOMANCER.lyrics,
  annotations: [],
  pacing: SCHOLOMANCER.pacing,
};

function activeLineAt(t: number): number {
  const { container, unmount } = render(
    <AlbumLyrics track={resolved as never} currentTime={t} status="playing" reducedMotion />,
  );
  const idx = [...container.querySelectorAll('.alb-lyrics__line')].findIndex((el) =>
    el.classList.contains('is-active'),
  );
  unmount();
  return idx;
}

describe('Scholomancer estimated sync — the 12s intro', () => {
  it('highlights no line while the intro is still playing', () => {
    // -1 = findIndex found no .is-active line.
    expect(activeLineAt(0)).toBe(-1);
    expect(activeLineAt(6)).toBe(-1);
    expect(activeLineAt(11.5)).toBe(-1);
  });

  it('opens on the first line once the vocal enters at 12s', () => {
    expect(activeLineAt(12.5)).toBe(0);
  });

  it('still finishes on the last line at the end of the song', () => {
    // leadInS must delay the sheet, not truncate it: the lines are squeezed into
    // the remaining 162s rather than running 12s off the end.
    expect(activeLineAt(SCHOLOMANCER.duration - 1)).toBe(SCHOLOMANCER.lyrics.length - 1);
  });
});
