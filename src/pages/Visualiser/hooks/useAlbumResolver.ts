import { useMemo } from 'react';
import { GRIMOIRE_ALBUMS } from '../tracks/albums';
import { GRIMOIRE_TRACKS } from '../tracks/index';
import type { GrimoireAlbum, GrimoireAlbumTrack, GrimoireTrack, TrackPacing } from '../tracks/types';

export interface ResolvedAlbumTrack {
  albumTrack: GrimoireAlbumTrack;
  grimoireTrack: GrimoireTrack | null;
  title: string;
  audioUrl: string;
  coverUrl: string;
  duration: number;
  available: boolean;
  lyrics: string[];
  annotations: { n: number; title: string; body: string }[];
  pacing?: TrackPacing;
}

export interface AlbumResolverResult {
  album: GrimoireAlbum | null;
  tracks: ResolvedAlbumTrack[];
  activeTrack: ResolvedAlbumTrack | null;
  activeTrackIndex: number;
  totalDuration: number;
  warnings: string[];
  notFound: boolean;
  empty: boolean;
}

function resolveTrack(albumTrack: GrimoireAlbumTrack): ResolvedAlbumTrack {
  const gt = GRIMOIRE_TRACKS.find(t => t.id === albumTrack.trackId) ?? null;
  if (!gt) {
    return {
      albumTrack,
      grimoireTrack: null,
      title: albumTrack.titleOverride ?? 'Unknown Track',
      audioUrl: albumTrack.audioUrlOverride ?? '',
      coverUrl: albumTrack.coverUrlOverride ?? '',
      duration: 0,
      available: false,
      lyrics: [],
      annotations: [],
    };
  }
  return {
    albumTrack,
    grimoireTrack: gt,
    title: albumTrack.titleOverride ?? gt.title,
    audioUrl: albumTrack.audioUrlOverride ?? gt.audioUrl,
    coverUrl: albumTrack.coverUrlOverride ?? gt.coverUrl,
    duration: gt.duration,
    available: true,
    lyrics: gt.lyrics,
    annotations: gt.annotations,
    pacing: gt.pacing,
  };
}

export function useAlbumResolver(
  albumId: string,
  trackQuery?: string,
): AlbumResolverResult {
  return useMemo(() => {
    const album = GRIMOIRE_ALBUMS.find(a => a.id === albumId) ?? null;
    if (!album) {
      return {
        album: null,
        tracks: [],
        activeTrack: null,
        activeTrackIndex: -1,
        totalDuration: 0,
        warnings: [`Album "${albumId}" not found`],
        notFound: true,
        empty: false,
      };
    }

    const warnings: string[] = [];
    const sorted = [...album.tracks].sort((a, b) => {
      const da = a.discNumber ?? 1;
      const db = b.discNumber ?? 1;
      if (da !== db) return da - db;
      return a.trackNumber - b.trackNumber;
    });

    const tracks = sorted.map(resolveTrack);

    for (const t of tracks) {
      if (!t.available) {
        warnings.push(`Track "${t.albumTrack.trackId}" not found in registry`);
      }
    }

    const playable = tracks.filter(t => t.available && !t.albumTrack.hidden);
    const totalDuration = album.totalDuration ??
      playable.reduce((sum, t) => sum + t.duration, 0);

    if (playable.length === 0) {
      return {
        album,
        tracks,
        activeTrack: null,
        activeTrackIndex: -1,
        totalDuration,
        warnings: [...warnings, 'No playable tracks'],
        notFound: false,
        empty: true,
      };
    }

    let activeIndex = -1;
    if (trackQuery) {
      activeIndex = tracks.findIndex(t => t.grimoireTrack?.id === trackQuery && t.available);
      if (activeIndex === -1) {
        warnings.push(`Query track "${trackQuery}" not found or unavailable`);
      }
    }
    if (activeIndex === -1) {
      activeIndex = tracks.findIndex(t => t.available && !t.albumTrack.hidden);
    }

    return {
      album,
      tracks,
      activeTrack: activeIndex >= 0 ? tracks[activeIndex] : null,
      activeTrackIndex: activeIndex,
      totalDuration,
      warnings,
      notFound: false,
      empty: false,
    };
  }, [albumId, trackQuery]);
}
