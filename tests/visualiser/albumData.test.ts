import { describe, it, expect } from 'vitest';
import { GRIMOIRE_ALBUMS } from '../../src/pages/Visualiser/tracks/albums';
import { GRIMOIRE_TRACKS } from '../../src/pages/Visualiser/tracks/index';
import type { GrimoireAlbum, GrimoireAlbumTrack } from '../../src/pages/Visualiser/tracks/types';

describe('GrimoireAlbum type', () => {
  it('every album has required fields', () => {
    for (const album of GRIMOIRE_ALBUMS) {
      expect(album.id).toBeTruthy();
      expect(album.title).toBeTruthy();
      expect(album.artist).toBeTruthy();
      expect(album.coverUrl).toBeTruthy();
      expect(typeof album.description).toBe('string');
      expect(album.releaseDate).toBeTruthy();
      expect(Array.isArray(album.tracks)).toBe(true);
      expect(album.tracks.length).toBeGreaterThan(0);
    }
  });

  it('every album track has trackId and trackNumber', () => {
    for (const album of GRIMOIRE_ALBUMS) {
      for (const track of album.tracks) {
        expect(track.trackId).toBeTruthy();
        expect(typeof track.trackNumber).toBe('number');
        expect(track.trackNumber).toBeGreaterThan(0);
      }
    }
  });

  it('every trackId references a valid GrimoireTrack', () => {
    const trackIds = new Set(GRIMOIRE_TRACKS.map(t => t.id));
    for (const album of GRIMOIRE_ALBUMS) {
      for (const track of album.tracks) {
        expect(trackIds.has(track.trackId)).toBe(true);
      }
    }
  });

  it('album IDs are unique', () => {
    const ids = GRIMOIRE_ALBUMS.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('tracks within an album have unique trackNumber+discNumber combinations', () => {
    for (const album of GRIMOIRE_ALBUMS) {
      const keys = album.tracks.map(t => `${t.discNumber ?? 1}-${t.trackNumber}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});
