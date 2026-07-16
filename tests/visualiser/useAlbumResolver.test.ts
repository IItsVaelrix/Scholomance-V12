import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAlbumResolver } from '../../src/pages/Visualiser/hooks/useAlbumResolver';
import { GRIMOIRE_ALBUMS } from '../../src/pages/Visualiser/tracks/albums';
import { GRIMOIRE_TRACKS } from '../../src/pages/Visualiser/tracks/index';

describe('useAlbumResolver', () => {
  const validAlbumId = GRIMOIRE_ALBUMS[0].id;

  it('resolves a valid album with all tracks available', () => {
    const { result } = renderHook(() => useAlbumResolver(validAlbumId));
    expect(result.current.album).not.toBeNull();
    expect(result.current.album!.id).toBe(validAlbumId);
    expect(result.current.notFound).toBe(false);
    expect(result.current.empty).toBe(false);
    expect(result.current.tracks.length).toBeGreaterThan(0);
    expect(result.current.tracks.every(t => t.available)).toBe(true);
  });

  it('returns notFound for unknown album ID', () => {
    const { result } = renderHook(() => useAlbumResolver('nonexistent-album'));
    expect(result.current.album).toBeNull();
    expect(result.current.notFound).toBe(true);
    expect(result.current.tracks).toEqual([]);
    expect(result.current.activeTrack).toBeNull();
  });

  it('selects first available track as default active', () => {
    const { result } = renderHook(() => useAlbumResolver(validAlbumId));
    expect(result.current.activeTrack).not.toBeNull();
    expect(result.current.activeTrackIndex).toBe(0);
  });

  it('selects track from query param when valid', () => {
    const firstTrackId = GRIMOIRE_ALBUMS[0].tracks[0].trackId;
    const { result } = renderHook(() => useAlbumResolver(validAlbumId, firstTrackId));
    expect(result.current.activeTrack!.grimoireTrack!.id).toBe(firstTrackId);
  });

  it('falls back to first track when query param is invalid', () => {
    const { result } = renderHook(() => useAlbumResolver(validAlbumId, 'bad-track-id'));
    expect(result.current.activeTrackIndex).toBe(0);
    expect(result.current.warnings.length).toBeGreaterThan(0);
  });

  it('applies title override from album track', () => {
    const { result } = renderHook(() => useAlbumResolver(validAlbumId));
    const track = result.current.tracks[0];
    const albumTrack = GRIMOIRE_ALBUMS[0].tracks[0];
    if (albumTrack.titleOverride) {
      expect(track.title).toBe(albumTrack.titleOverride);
    } else {
      expect(track.title).toBe(track.grimoireTrack!.title);
    }
  });

  it('sorts tracks by discNumber then trackNumber', () => {
    const { result } = renderHook(() => useAlbumResolver(validAlbumId));
    for (let i = 1; i < result.current.tracks.length; i++) {
      const prev = result.current.tracks[i - 1].albumTrack;
      const curr = result.current.tracks[i].albumTrack;
      const prevDisc = prev.discNumber ?? 1;
      const currDisc = curr.discNumber ?? 1;
      if (prevDisc === currDisc) {
        expect(prev.trackNumber).toBeLessThan(curr.trackNumber);
      } else {
        expect(prevDisc).toBeLessThan(currDisc);
      }
    }
  });

  it('derives totalDuration from resolved tracks', () => {
    const { result } = renderHook(() => useAlbumResolver(validAlbumId));
    const expected = result.current.tracks.reduce((sum, t) => sum + t.duration, 0);
    expect(result.current.totalDuration).toBe(expected);
  });

  it('skips hidden tracks for initial selection', () => {
    const { result } = renderHook(() => useAlbumResolver(validAlbumId));
    if (result.current.activeTrack) {
      expect(result.current.activeTrack.albumTrack.hidden).not.toBe(true);
    }
  });
});
