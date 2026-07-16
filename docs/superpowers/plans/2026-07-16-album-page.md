# Album Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Bandcamp-inspired album experience within `/visualiser/album/:albumId` — split layout with album sidebar (cover, metadata, track list) and active track experience (WMP bar spectrum + karaoke lyrics + transport).

**Architecture:** Two custom hooks (`useAlbumResolver`, `useAlbumAudioEngine`) handle data resolution and audio lifecycle. Five presentational components (`AlbumPage`, `AlbumSidebar`, `WmpSpectrum`, `AlbumLyrics`, `AlbumTransport`) compose the UI. An `AlbumIndexPage` provides the album grid. All state is local — no global store changes.

**Tech Stack:** React 18, TypeScript, React Router v7 (`useSearchParams`), Web Audio API, Canvas 2D, Vitest, @testing-library/react, framer-motion.

## Global Constraints

- CSS prefix: `alb-` (album), BEM-like, matching existing `bcv-` conventions
- CSS variables reference existing `--bcv-*` tokens where applicable, define `--alb-*` for album-specific values
- Hooks use named function exports, cancellation flag pattern, graceful degradation
- `play()` returns `Promise<void>` (HTMLMediaElement.play() can reject)
- `useSearchParams` with `{ replace: true }` for URL updates — never `history.replaceState`
- `crossOrigin="anonymous"` on `<audio>` element, set before `src`
- Canvas: imperative painting, refs only for FFT data, no React state per frame
- `prefers-reduced-motion`: low-cadence real data (2–4 FPS), no peak decay animation
- All interactive elements keyboard-accessible with visible focus
- Test runner: `vitest run` with `--reporter=verbose`
- Lint: `npx eslint . --ext js,jsx,ts,tsx --report-unused-disable-directives --quiet`
- Typecheck: `npx tsc -p tsconfig.json`

---

## File Structure

| File | Responsibility |
|---|---|
| `src/pages/Visualiser/tracks/types.ts` | Add `GrimoireAlbumTrack`, `GrimoireAlbum` interfaces |
| `src/pages/Visualiser/tracks/albums.ts` | Album definitions referencing `GRIMOIRE_TRACKS` |
| `src/pages/Visualiser/tracks/index.ts` | Re-export albums |
| `src/pages/Visualiser/hooks/useAlbumResolver.ts` | Album lookup, track resolution, playable ordering |
| `src/pages/Visualiser/hooks/useAlbumAudioEngine.ts` | Persistent audio graph, PlaybackStatus, AnalysisAvailability |
| `src/pages/Visualiser/WmpSpectrum.tsx` | Canvas: WMP vertical bar spectrum with peak hold + reflection |
| `src/pages/Visualiser/AlbumLyrics.tsx` | Extracted karaoke lyrics with phoneme coloring |
| `src/pages/Visualiser/AlbumTransport.tsx` | Play/pause, prev/next, progress bar, time display |
| `src/pages/Visualiser/AlbumSidebar.tsx` | Left panel: cover, metadata, track list |
| `src/pages/Visualiser/AlbumPage.tsx` | Page shell, split layout, state orchestration |
| `src/pages/Visualiser/AlbumIndexPage.tsx` | Album grid landing page |
| `src/pages/Visualiser/AlbumPage.css` | All album experience styles |
| `src/pages/Visualiser/DiscographyNav.tsx` | Add "Albums" link |
| `src/main.jsx` | Add 2 new routes |
| `tests/visualiser/useAlbumResolver.test.ts` | Resolver hook tests |
| `tests/visualiser/useAlbumAudioEngine.test.ts` | Audio engine hook tests |
| `tests/visualiser/AlbumPage.test.tsx` | Album page integration tests |
| `tests/visualiser/AlbumIndexPage.test.tsx` | Album index page tests |

---

### Task 1: Data Model — Types and Album Definitions

**Files:**
- Modify: `src/pages/Visualiser/tracks/types.ts`
- Create: `src/pages/Visualiser/tracks/albums.ts`
- Modify: `src/pages/Visualiser/tracks/index.ts`
- Test: `tests/visualiser/albumData.test.ts`

**Interfaces:**
- Consumes: `GrimoireTrack` from `./types.ts`
- Produces: `GrimoireAlbumTrack`, `GrimoireAlbum`, `GRIMOIRE_ALBUMS`, `resolveAlbumTracks()`

- [ ] **Step 1: Write the failing test**

```ts
// tests/visualiser/albumData.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/visualiser/albumData.test.ts --reporter=verbose`
Expected: FAIL — `albums.ts` does not exist yet

- [ ] **Step 3: Add GrimoireAlbumTrack and GrimoireAlbum to types.ts**

Append to `src/pages/Visualiser/tracks/types.ts`:

```ts
export interface GrimoireAlbumTrack {
  trackId: string;
  trackNumber: number;
  discNumber?: number;
  titleOverride?: string;
  audioUrlOverride?: string;
  coverUrlOverride?: string;
  hidden?: boolean;
  bonus?: boolean;
}

export interface GrimoireAlbum {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  description: string;
  releaseDate: string;
  tracks: GrimoireAlbumTrack[];
  model?: string;
  modelVersion?: string;
  subtitle?: string;
  genres?: string[];
  totalDuration?: number;
  featured?: boolean;
  status?: "draft" | "released" | "archived";
}
```

- [ ] **Step 4: Create albums.ts with an initial album grouping all 4 existing tracks**

Create `src/pages/Visualiser/tracks/albums.ts`:

```ts
import type { GrimoireAlbum } from './types';
import { PETRICHOR, BIG_FATHER, POLARITY, DAYDREAMING_NIGHTMARES } from './index';

export const GRIMOIRE_ALBUMS: GrimoireAlbum[] = [
  {
    id: 'grimoire-vol-1',
    title: 'Grimoire Vol. I',
    artist: 'Vaelrix',
    coverUrl: PETRICHOR.coverUrl,
    description: 'The first collection of Suno incantations — cinematic emo rock, hyperpop, and dark ambient forged through the Vaelrix persona.',
    releaseDate: '2026-06-10',
    status: 'released',
    genres: ['Cinematic Emo Rock', 'Hyperpop', 'Dark Ambient'],
    tracks: [
      { trackId: PETRICHOR.id, trackNumber: 1 },
      { trackId: BIG_FATHER.id, trackNumber: 2 },
      { trackId: POLARITY.id, trackNumber: 3 },
      { trackId: DAYDREAMING_NIGHTMARES.id, trackNumber: 4 },
    ],
  },
];
```

- [ ] **Step 5: Update index.ts to re-export albums**

Add to `src/pages/Visualiser/tracks/index.ts`:

```ts
export type { GrimoireAlbumTrack, GrimoireAlbum } from './types';
export { GRIMOIRE_ALBUMS } from './albums';
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/visualiser/albumData.test.ts --reporter=verbose`
Expected: PASS (all 5 tests)

- [ ] **Step 7: Commit**

```bash
git add src/pages/Visualiser/tracks/types.ts src/pages/Visualiser/tracks/albums.ts src/pages/Visualiser/tracks/index.ts tests/visualiser/albumData.test.ts
git commit -m "feat(album): add GrimoireAlbum data model and initial album definition"
```

---

### Task 2: useAlbumResolver Hook

**Files:**
- Create: `src/pages/Visualiser/hooks/useAlbumResolver.ts`
- Test: `tests/visualiser/useAlbumResolver.test.ts`

**Interfaces:**
- Consumes: `GrimoireAlbum`, `GrimoireAlbumTrack`, `GrimoireTrack`, `GRIMOIRE_ALBUMS`, `GRIMOIRE_TRACKS`
- Produces: `useAlbumResolver(albumId: string, trackQuery?: string) => AlbumResolverResult`

```ts
interface ResolvedAlbumTrack {
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

interface AlbumResolverResult {
  album: GrimoireAlbum | null;
  tracks: ResolvedAlbumTrack[];
  activeTrack: ResolvedAlbumTrack | null;
  activeTrackIndex: number;
  totalDuration: number;
  warnings: string[];
  notFound: boolean;
  empty: boolean;
}
```

- [ ] **Step 1: Write the failing tests**

```ts
// tests/visualiser/useAlbumResolver.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/visualiser/useAlbumResolver.test.ts --reporter=verbose`
Expected: FAIL — module not found

- [ ] **Step 3: Implement useAlbumResolver**

Create `src/pages/Visualiser/hooks/useAlbumResolver.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/visualiser/useAlbumResolver.test.ts --reporter=verbose`
Expected: PASS (all 9 tests)

- [ ] **Step 5: Commit**

```bash
git add src/pages/Visualiser/hooks/useAlbumResolver.ts tests/visualiser/useAlbumResolver.test.ts
git commit -m "feat(album): add useAlbumResolver hook with track resolution and ordering"
```

---

### Task 3: useAlbumAudioEngine Hook

**Files:**
- Create: `src/pages/Visualiser/hooks/useAlbumAudioEngine.ts`
- Test: `tests/visualiser/useAlbumAudioEngine.test.ts`

**Interfaces:**
- Consumes: `ResolvedAlbumTrack` from `useAlbumResolver`
- Produces: `useAlbumAudioEngine(opts) => AlbumAudioEngineResult`

```ts
type PlaybackStatus = "idle" | "loading" | "playing" | "paused" | "buffering" | "ended" | "error";
type AnalysisAvailability = "uninitialized" | "available" | "cors-blocked" | "unsupported";

interface AlbumAudioEngineResult {
  status: PlaybackStatus;
  currentTime: number;
  duration: number;
  analyser: AnalyserNode | null;
  analysisAvailability: AnalysisAvailability;
  error: string | null;
  play(): Promise<void>;
  pause(): void;
  seek(time: number): void;
}
```

- [ ] **Step 1: Write the failing tests**

```ts
// tests/visualiser/useAlbumAudioEngine.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAlbumAudioEngine } from '../../src/pages/Visualiser/hooks/useAlbumAudioEngine';
import type { ResolvedAlbumTrack } from '../../src/pages/Visualiser/hooks/useAlbumResolver';

function makeTrack(overrides: Partial<ResolvedAlbumTrack> = {}): ResolvedAlbumTrack {
  return {
    albumTrack: { trackId: 'test', trackNumber: 1 },
    grimoireTrack: null,
    title: 'Test Track',
    audioUrl: 'https://cdn1.suno.ai/test.mp3',
    coverUrl: 'https://cdn2.suno.ai/test.jpg',
    duration: 180,
    available: true,
    lyrics: ['Line one'],
    annotations: [],
    ...overrides,
  };
}

describe('useAlbumAudioEngine', () => {
  let audioEl: HTMLAudioElement;

  beforeEach(() => {
    audioEl = document.createElement('audio');
    audioEl.crossOrigin = 'anonymous';
    audioEl.preload = 'metadata';
  });

  it('starts with idle status', () => {
    const { result } = renderHook(() =>
      useAlbumAudioEngine({
        audioRef: { current: audioEl },
        activeTrack: makeTrack(),
        autoplayIntent: false,
        onEnded: vi.fn(),
      })
    );
    expect(result.current.status).toBe('idle');
    expect(result.current.currentTime).toBe(0);
    expect(result.current.analyser).toBeNull();
    expect(result.current.analysisAvailability).toBe('uninitialized');
  });

  it('play returns a promise', () => {
    const { result } = renderHook(() =>
      useAlbumAudioEngine({
        audioRef: { current: audioEl },
        activeTrack: makeTrack(),
        autoplayIntent: false,
        onEnded: vi.fn(),
      })
    );
    const playResult = result.current.play();
    expect(playResult).toBeInstanceOf(Promise);
  });

  it('seek sets audio currentTime', () => {
    const { result } = renderHook(() =>
      useAlbumAudioEngine({
        audioRef: { current: audioEl },
        activeTrack: makeTrack(),
        autoplayIntent: false,
        onEnded: vi.fn(),
      })
    );
    act(() => { result.current.seek(42); });
    expect(audioEl.currentTime).toBe(42);
  });

  it('pause sets audio paused', () => {
    const { result } = renderHook(() =>
      useAlbumAudioEngine({
        audioRef: { current: audioEl },
        activeTrack: makeTrack(),
        autoplayIntent: false,
        onEnded: vi.fn(),
      })
    );
    act(() => { result.current.pause(); });
    expect(audioEl.paused).toBe(true);
  });

  it('updates src when activeTrack changes', () => {
    const track1 = makeTrack({ audioUrl: 'https://cdn1.suno.ai/a.mp3' });
    const track2 = makeTrack({ audioUrl: 'https://cdn1.suno.ai/b.mp3' });

    const { rerender } = renderHook(
      ({ track }) => useAlbumAudioEngine({
        audioRef: { current: audioEl },
        activeTrack: track,
        autoplayIntent: false,
        onEnded: vi.fn(),
      }),
      { initialProps: { track: track1 } }
    );

    expect(audioEl.src).toContain('/a.mp3');

    rerender({ track: track2 });
    expect(audioEl.src).toContain('/b.mp3');
  });

  it('transitions to loading on play event', () => {
    const { result } = renderHook(() =>
      useAlbumAudioEngine({
        audioRef: { current: audioEl },
        activeTrack: makeTrack(),
        autoplayIntent: false,
        onEnded: vi.fn(),
      })
    );

    act(() => { audioEl.dispatchEvent(new Event('play')); });
    expect(result.current.status).toBe('loading');
  });

  it('transitions to playing on playing event', () => {
    const { result } = renderHook(() =>
      useAlbumAudioEngine({
        audioRef: { current: audioEl },
        activeTrack: makeTrack(),
        autoplayIntent: false,
        onEnded: vi.fn(),
      })
    );

    act(() => { audioEl.dispatchEvent(new Event('playing')); });
    expect(result.current.status).toBe('playing');
  });

  it('transitions to paused on pause event', () => {
    const { result } = renderHook(() =>
      useAlbumAudioEngine({
        audioRef: { current: audioEl },
        activeTrack: makeTrack(),
        autoplayIntent: false,
        onEnded: vi.fn(),
      })
    );

    act(() => { audioEl.dispatchEvent(new Event('pause')); });
    expect(result.current.status).toBe('paused');
  });

  it('transitions to ended and calls onEnded', () => {
    const onEnded = vi.fn();
    const { result } = renderHook(() =>
      useAlbumAudioEngine({
        audioRef: { current: audioEl },
        activeTrack: makeTrack(),
        autoplayIntent: false,
        onEnded,
      })
    );

    act(() => { audioEl.dispatchEvent(new Event('ended')); });
    expect(result.current.status).toBe('ended');
    expect(onEnded).toHaveBeenCalledOnce();
  });

  it('transitions to error on error event', () => {
    const { result } = renderHook(() =>
      useAlbumAudioEngine({
        audioRef: { current: audioEl },
        activeTrack: makeTrack(),
        autoplayIntent: false,
        onEnded: vi.fn(),
      })
    );

    act(() => { audioEl.dispatchEvent(new Event('error')); });
    expect(result.current.status).toBe('error');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/visualiser/useAlbumAudioEngine.test.ts --reporter=verbose`
Expected: FAIL — module not found

- [ ] **Step 3: Implement useAlbumAudioEngine**

Create `src/pages/Visualiser/hooks/useAlbumAudioEngine.ts`:

```ts
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { ResolvedAlbumTrack } from './useAlbumResolver';

export type PlaybackStatus =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "buffering"
  | "ended"
  | "error";

export type AnalysisAvailability =
  | "uninitialized"
  | "available"
  | "cors-blocked"
  | "unsupported";

export interface AlbumAudioEngineResult {
  status: PlaybackStatus;
  currentTime: number;
  duration: number;
  analyser: AnalyserNode | null;
  analysisAvailability: AnalysisAvailability;
  error: string | null;
  play(): Promise<void>;
  pause(): void;
  seek(time: number): void;
}

interface UseAlbumAudioEngineOptions {
  audioRef: RefObject<HTMLAudioElement | null>;
  activeTrack: ResolvedAlbumTrack;
  autoplayIntent: boolean;
  onEnded: () => void;
}

export function useAlbumAudioEngine({
  audioRef,
  activeTrack,
  autoplayIntent,
  onEnded,
}: UseAlbumAudioEngineOptions): AlbumAudioEngineResult {
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(activeTrack.duration);
  const [error, setError] = useState<string | null>(null);
  const [analysisAvailability, setAnalysisAvailability] = useState<AnalysisAvailability>('uninitialized');

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const autoplayIntentRef = useRef(autoplayIntent);
  autoplayIntentRef.current = autoplayIntent;

  const ensureGraph = useCallback(() => {
    const el = audioRef.current;
    if (!el || sourceRef.current) return;
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaElementSource(el);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.82;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
      setAnalysisAvailability('available');
    } catch {
      setAnalysisAvailability('unsupported');
    }
  }, [audioRef]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    el.src = activeTrack.audioUrl;
    el.load();
    setCurrentTime(0);
    setDuration(activeTrack.duration);
    setError(null);

    if (autoplayIntentRef.current) {
      setStatus('loading');
    } else {
      setStatus('idle');
    }
  }, [activeTrack, audioRef]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onPlay = () => setStatus('loading');
    const onPlaying = () => setStatus('playing');
    const onPause = () => setStatus('paused');
    const onWaiting = () => setStatus('buffering');
    const onCanPlay = () => {
      if (!autoplayIntentRef.current) setStatus('paused');
    };
    const onEnded = () => {
      setStatus('ended');
      onEndedRef.current();
    };
    const onError = () => {
      setStatus('error');
      setError(el.error?.message ?? 'Audio load failed');
    };
    const onLoadedMetadata = () => setDuration(el.duration || activeTrack.duration);
    const onDurationChange = () => setDuration(el.duration || activeTrack.duration);
    const onTimeUpdate = () => setCurrentTime(el.currentTime);

    el.addEventListener('play', onPlay);
    el.addEventListener('playing', onPlaying);
    el.addEventListener('pause', onPause);
    el.addEventListener('waiting', onWaiting);
    el.addEventListener('canplay', onCanPlay);
    el.addEventListener('ended', onEnded);
    el.addEventListener('error', onError);
    el.addEventListener('loadedmetadata', onLoadedMetadata);
    el.addEventListener('durationchange', onDurationChange);
    el.addEventListener('timeupdate', onTimeUpdate);

    return () => {
      el.removeEventListener('play', onPlay);
      el.removeEventListener('playing', onPlaying);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('waiting', onWaiting);
      el.removeEventListener('canplay', onCanPlay);
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('error', onError);
      el.removeEventListener('loadedmetadata', onLoadedMetadata);
      el.removeEventListener('durationchange', onDurationChange);
      el.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, [audioRef, activeTrack]);

  useEffect(() => {
    return () => {
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  const play = useCallback(async () => {
    const el = audioRef.current;
    if (!el) return;
    ensureGraph();
    await audioCtxRef.current?.resume().catch(() => {});
    await el.play();
  }, [audioRef, ensureGraph]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, [audioRef]);

  const seek = useCallback((time: number) => {
    const el = audioRef.current;
    if (el) el.currentTime = time;
    setCurrentTime(time);
  }, [audioRef]);

  return {
    status,
    currentTime,
    duration,
    analyser: analyserRef.current,
    analysisAvailability,
    error,
    play,
    pause,
    seek,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/visualiser/useAlbumAudioEngine.test.ts --reporter=verbose`
Expected: PASS (all 10 tests)

- [ ] **Step 5: Commit**

```bash
git add src/pages/Visualiser/hooks/useAlbumAudioEngine.ts tests/visualiser/useAlbumAudioEngine.test.ts
git commit -m "feat(album): add useAlbumAudioEngine hook with persistent graph and PlaybackStatus"
```

---

### Task 4: WmpSpectrum Canvas Component

**Files:**
- Create: `src/pages/Visualiser/WmpSpectrum.tsx`

**Interfaces:**
- Consumes: `AnalyserNode`, `AnalysisAvailability` from `useAlbumAudioEngine`
- Produces: `<WmpSpectrum analyser={} analysisAvailability={} bpm={} reducedMotion={} />`

- [ ] **Step 1: Implement WmpSpectrum**

Create `src/pages/Visualiser/WmpSpectrum.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import type { AnalysisAvailability } from './hooks/useAlbumAudioEngine';

interface WmpSpectrumProps {
  analyser: AnalyserNode | null;
  analysisAvailability: AnalysisAvailability;
  bpm?: number;
  reducedMotion?: boolean;
  binCount?: number;
}

export function WmpSpectrum({
  analyser,
  analysisAvailability,
  bpm = 120,
  reducedMotion = false,
  binCount = 64,
}: WmpSpectrumProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const fftData = new Uint8Array(binCount);
    const peaks = new Float32Array(binCount);
    const peakDecay = new Float32Array(binCount);

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    let lastFrameTime = 0;
    const lowCadenceInterval = 1000 / 3;

    const getSyntheticData = (t: number) => {
      const pulse = 0.6 + 0.4 * Math.sin(t * (bpm / 60) * Math.PI);
      for (let i = 0; i < binCount; i++) {
        const env = Math.max(0, 1 - i / binCount);
        fftData[i] = Math.round(
          Math.max(0, (0.5 + 0.5 * Math.sin(t * 2.1 + i * 0.21)) * 210 * env * pulse)
        );
      }
    };

    const draw = (tMs: number) => {
      if (reducedMotion && tMs - lastFrameTime < lowCadenceInterval) {
        raf = requestAnimationFrame(draw);
        return;
      }
      lastFrameTime = tMs;
      const t = tMs / 1000;
      const W = canvas.width;
      const H = canvas.height;

      if (analyser && analysisAvailability === 'available') {
        analyser.getByteFrequencyData(fftData);
      } else {
        getSyntheticData(t);
      }

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, W, H);

      const barWidth = (W / binCount) * 0.8;
      const gap = (W / binCount) * 0.2;
      const baselineY = H * 0.65;

      for (let i = 0; i < binCount; i++) {
        const mag = fftData[i] / 255;
        const barHeight = mag * baselineY * 0.9;
        const x = i * (barWidth + gap) + gap / 2;

        const grad = ctx.createLinearGradient(x, baselineY, x, baselineY - barHeight);
        grad.addColorStop(0, 'hsl(312, 90%, 40%)');
        grad.addColorStop(0.5, 'hsl(280, 85%, 55%)');
        grad.addColorStop(1, 'hsl(196, 90%, 80%)');

        ctx.fillStyle = grad;
        ctx.fillRect(x, baselineY - barHeight, barWidth, barHeight);

        if (!reducedMotion) {
          if (mag > peaks[i]) {
            peaks[i] = mag;
            peakDecay[i] = 0;
          } else {
            peakDecay[i] += 0.003;
            peaks[i] = Math.max(0, peaks[i] - peakDecay[i]);
          }
          const peakY = baselineY - peaks[i] * baselineY * 0.9;
          ctx.fillStyle = 'hsl(196, 90%, 90%)';
          ctx.fillRect(x, peakY - 2 * dpr, barWidth, 2 * dpr);
        }

        const reflGrad = ctx.createLinearGradient(x, baselineY, x, baselineY + barHeight * 0.3);
        reflGrad.addColorStop(0, 'hsla(280, 85%, 55%, 0.3)');
        reflGrad.addColorStop(1, 'hsla(280, 85%, 55%, 0)');
        ctx.fillStyle = reflGrad;
        ctx.fillRect(x, baselineY, barWidth, barHeight * 0.3);
      }

      ctx.fillStyle = 'rgba(0,0,0,0.04)';
      for (let y = 0; y < H; y += 3) {
        ctx.fillRect(0, y, W, 1);
      }

      if (!reducedMotion || analysisAvailability !== 'available') {
        raf = requestAnimationFrame(draw);
      }
    };

    if (reducedMotion && analysisAvailability !== 'available') {
      draw(0);
    } else {
      raf = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [analyser, analysisAvailability, bpm, reducedMotion, binCount]);

  return <canvas ref={canvasRef} className="alb-spectrum" aria-hidden="true" />;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: No errors related to WmpSpectrum

- [ ] **Step 3: Commit**

```bash
git add src/pages/Visualiser/WmpSpectrum.tsx
git commit -m "feat(album): add WmpSpectrum canvas with WMP bar aesthetic, peak hold, reflection"
```

---

### Task 5: AlbumLyrics Component

**Files:**
- Create: `src/pages/Visualiser/AlbumLyrics.tsx`

**Interfaces:**
- Consumes: `ResolvedAlbumTrack` from `useAlbumResolver`, `PlaybackStatus` from `useAlbumAudioEngine`, `wordTruesight` from `./truesightColor`, `useLyricAlignment` from kits
- Produces: `<AlbumLyrics track={} currentTime={} status={} reducedMotion={} />`

- [ ] **Step 1: Implement AlbumLyrics**

Create `src/pages/Visualiser/AlbumLyrics.tsx`:

```tsx
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useLyricAlignment } from '../../kits/scholomance-visualizer-kit/hooks/useLyricAlignment';
import { lineAtTime, wordAtTime } from '../../kits/scholomance-visualizer-kit/utils/lyricAlignment';
import { wordTruesight } from './truesightColor';
import type { ResolvedAlbumTrack } from './hooks/useAlbumResolver';
import type { PlaybackStatus } from './hooks/useAlbumAudioEngine';
import type { TrackPacing } from './tracks/types';

interface AlbumLyricsProps {
  track: ResolvedAlbumTrack;
  currentTime: number;
  status: PlaybackStatus;
  reducedMotion?: boolean;
}

function syllableCountHeuristic(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z']/g, '');
  if (!w) return 0;
  let count = (w.match(/[aeiouy]+/g) ?? []).length;
  if (count > 1 && w.endsWith('e') && !w.endsWith('le')) count -= 1;
  return Math.max(1, count);
}

function melismaBonus(word: string): number {
  const runs = word.toLowerCase().match(/([aeiou])\1{2,}/g);
  return runs ? runs.length * 3 : 0;
}

function beatsFromSyllables(syl: number, lineIndex: number, pacing: TrackPacing): number {
  const chorus = pacing.chorusStartLine !== undefined && lineIndex >= pacing.chorusStartLine;
  const spb = chorus ? pacing.chorusSylPerBeat : pacing.verseSylPerBeat;
  return Math.max(2, Math.round((syl / spb) * 2) / 2);
}

const DEFAULT_PACING: TrackPacing = {
  bpm: 120, verseSylPerBeat: 1.2, chorusSylPerBeat: 1.2,
  leadInS: 0, tailS: 0, coupletCostMax: 0.75,
};

function computeLineBeats(track: ResolvedAlbumTrack): number[] {
  const pacing = track.pacing ?? DEFAULT_PACING;
  return track.lyrics.map((line, i) =>
    beatsFromSyllables(
      line.split(/\s+/).reduce((a, w) => a + syllableCountHeuristic(w) + melismaBonus(w), 0),
      i,
      pacing,
    )
  );
}

function lyricLineAt(progress: number, duration: number, lineBeats: number[], pacing: TrackPacing): number {
  const totalBeats = lineBeats.reduce((a, b) => a + b, 0);
  const windowS = Math.max(1, duration - pacing.leadInS - pacing.tailS);
  const nominalBeatS = 60 / pacing.bpm;
  const scale = windowS / (totalBeats * nominalBeatS);
  const beatS = nominalBeatS * scale;
  const t = progress - pacing.leadInS;
  if (t < 0) return -1;
  let acc = 0;
  for (let i = 0; i < lineBeats.length; i++) {
    acc += lineBeats[i] * beatS;
    if (t < acc) return i;
  }
  return lineBeats.length - 1;
}

export function AlbumLyrics({ track, currentTime, status, reducedMotion }: AlbumLyricsProps) {
  const alignment = useLyricAlignment(track.grimoireTrack?.id ?? '');
  const lineBeats = useMemo(() => computeLineBeats(track), [track]);
  const pacing = track.pacing ?? DEFAULT_PACING;
  const [userScrolled, setUserScrolled] = useState(false);
  const lyricsRef = useRef<HTMLOListElement>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const coloredLyrics = useMemo(() =>
    track.lyrics.map(line =>
      line.split(/(\s+)/).map(tok => {
        if (!/\S/.test(tok)) return { word: tok, color: null, school: null };
        const ts = wordTruesight(tok);
        return { word: tok, color: ts?.color ?? null, school: ts?.school ?? null };
      })
    ),
    [track]
  );

  const alignedPos = alignment ? lineAtTime(alignment.lines, currentTime) : -1;
  const activeLine = alignment
    ? (alignedPos < 0 ? -1 : alignment.lines[alignedPos].index)
    : lyricLineAt(currentTime, track.duration, lineBeats, pacing);

  const sungIdx = alignment ? wordAtTime(alignment.words, currentTime) : -1;
  const sungWord = alignment && sungIdx >= 0 ? alignment.words[sungIdx] : null;

  useEffect(() => {
    if (status !== 'playing' || activeLine < 0 || userScrolled) return;
    const el = lyricsRef.current?.children[activeLine] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [activeLine, status, userScrolled, reducedMotion]);

  useEffect(() => {
    if (status === 'playing') setUserScrolled(false);
  }, [status]);

  const handleScroll = () => {
    if (status !== 'playing') return;
    setUserScrolled(true);
    clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => setUserScrolled(false), 5000);
  };

  if (track.lyrics.length === 0) {
    return (
      <div className="alb-lyrics alb-lyrics--instrumental">
        <p className="alb-lyrics__empty">Instrumental</p>
      </div>
    );
  }

  return (
    <ol
      ref={lyricsRef}
      className="alb-lyrics"
      onScroll={handleScroll}
      aria-label="Lyrics"
    >
      {track.lyrics.map((line, i) => (
        <li
          key={i}
          className={i === activeLine ? 'alb-lyrics__line is-active' : 'alb-lyrics__line'}}
          aria-current={i === activeLine ? 'true' : undefined}
        >
          <span className="alb-lyrics__num">{String(i + 1).padStart(2, '0')}</span>
          <span className="alb-lyrics__text">
            {coloredLyrics[i].map((tok, j) => {
              const isWord = /[A-Za-z]/.test(tok.word);
              const sung = isWord && sungWord !== null && sungWord.line === i && sungWord.text === tok.word;
              return (
                <span
                  key={j}
                  className={tok.color ? 'alb-lyrics__word' : undefined}
                  style={tok.color ? ({ '--w': tok.color } as CSSProperties) : undefined}
                  data-sung={sung ? 'true' : undefined}
                >
                  {tok.word}
                </span>
              );
            })}
          </span>
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: No errors related to AlbumLyrics

- [ ] **Step 3: Commit**

```bash
git add src/pages/Visualiser/AlbumLyrics.tsx
git commit -m "feat(album): add AlbumLyrics component with karaoke sync and phoneme coloring"
```

---

### Task 6: AlbumTransport Component

**Files:**
- Create: `src/pages/Visualiser/AlbumTransport.tsx`

**Interfaces:**
- Consumes: `PlaybackStatus` from `useAlbumAudioEngine`
- Produces: `<AlbumTransport status={} currentTime={} duration={} onPlay={} onPause={} onSeek={} onPrev={} onNext={} repeat={} onToggleRepeat={} />`

- [ ] **Step 1: Implement AlbumTransport**

Create `src/pages/Visualiser/AlbumTransport.tsx`:

```tsx
import type { PlaybackStatus } from './hooks/useAlbumAudioEngine';

interface AlbumTransportProps {
  status: PlaybackStatus;
  currentTime: number;
  duration: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onPrev: () => void;
  onNext: () => void;
  repeat: boolean;
  onToggleRepeat: () => void;
  canPrev: boolean;
  canNext: boolean;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function AlbumTransport({
  status,
  currentTime,
  duration,
  onPlay,
  onPause,
  onSeek,
  onPrev,
  onNext,
  repeat,
  onToggleRepeat,
  canPrev,
  canNext,
}: AlbumTransportProps) {
  const isPlaying = status === 'playing' || status === 'loading' || status === 'buffering';
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="alb-transport" role="region" aria-label="Playback controls">
      <span className="alb-transport__time">{fmt(currentTime)}</span>
      <div className="alb-transport__bar">
        <input
          type="range"
          className="alb-transport__slider"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          aria-label="Seek"
          aria-valuenow={Math.round(currentTime)}
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuetext={`${fmt(currentTime)} of ${fmt(duration)}`}
          style={{ '--progress': `${progress}%` } as React.CSSProperties}
        />
      </div>
      <span className="alb-transport__time">{fmt(duration)}</span>
      <div className="alb-transport__controls">
        <button
          type="button"
          className="alb-transport__btn"
          onClick={onPrev}
          disabled={!canPrev}
          aria-label="Previous track"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 20 9 12l10-8v16ZM5 19V5" />
          </svg>
        </button>
        <button
          type="button"
          className="alb-transport__btn alb-transport__btn--play"
          onClick={isPlaying ? onPause : onPlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
              <path d="M7 4h3.4v16H7zM13.6 4H17v16h-3.4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
              <path d="M7 4.5 19.5 12 7 19.5v-15Z" />
            </svg>
          )}
        </button>
        <button
          type="button"
          className="alb-transport__btn"
          onClick={onNext}
          disabled={!canNext}
          aria-label="Next track"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m5 4 10 8-10 8V4ZM19 5v14" />
          </svg>
        </button>
        <button
          type="button"
          className={`alb-transport__btn${repeat ? ' is-on' : ''}`}
          onClick={onToggleRepeat}
          aria-label="Repeat album"
          aria-pressed={repeat}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m17 2 4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: No errors related to AlbumTransport

- [ ] **Step 3: Commit**

```bash
git add src/pages/Visualiser/AlbumTransport.tsx
git commit -m "feat(album): add AlbumTransport with accessible slider, prev/next, repeat"
```

---

### Task 7: AlbumSidebar Component

**Files:**
- Create: `src/pages/Visualiser/AlbumSidebar.tsx`

**Interfaces:**
- Consumes: `ResolvedAlbumTrack`, `AlbumResolverResult` from `useAlbumResolver`, `PlaybackStatus` from `useAlbumAudioEngine`
- Produces: `<AlbumSidebar resolver={} activeIndex={} status={} onSelectTrack={} />`

- [ ] **Step 1: Implement AlbumSidebar**

Create `src/pages/Visualiser/AlbumSidebar.tsx`:

```tsx
import type { AlbumResolverResult, ResolvedAlbumTrack } from './hooks/useAlbumResolver';
import type { PlaybackStatus } from './hooks/useAlbumAudioEngine';

interface AlbumSidebarProps {
  resolver: AlbumResolverResult;
  activeIndex: number;
  status: PlaybackStatus;
  onSelectTrack: (index: number) => void;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function AlbumSidebar({ resolver, activeIndex, status, onSelectTrack }: AlbumSidebarProps) {
  const { album, tracks } = resolver;
  if (!album) return null;

  return (
    <aside className="alb-sidebar" aria-label="Album information">
      <div className="alb-sidebar__cover">
        <img src={album.coverUrl} alt={`${album.title} cover art`} />
      </div>

      <div className="alb-sidebar__info">
        <h1 className="alb-sidebar__title">{album.title}</h1>
        {album.subtitle && <p className="alb-sidebar__subtitle">{album.subtitle}</p>}
        <p className="alb-sidebar__artist">{album.artist}</p>
        <div className="alb-sidebar__meta">
          <span>{album.releaseDate}</span>
          {album.genres && album.genres.length > 0 && (
            <span className="alb-sidebar__genres">
              {album.genres.join(' · ')}
            </span>
          )}
          {album.model && album.modelVersion && (
            <span className="alb-sidebar__model">{album.model} {album.modelVersion}</span>
          )}
        </div>
      </div>

      {album.description && (
        <div className="alb-sidebar__description">
          <p>{album.description}</p>
        </div>
      )}

      <nav className="alb-sidebar__tracklist" aria-label="Track list">
        <ol className="alb-tracklist">
          {tracks.filter(t => !t.albumTrack.hidden).map((track, visibleIdx) => {
            const realIndex = tracks.indexOf(track);
            const isActive = realIndex === activeIndex;
            const isPlaying = isActive && (status === 'playing' || status === 'loading' || status === 'buffering');

            return (
              <li key={`${track.albumTrack.trackId}-${track.albumTrack.trackNumber}`}>
                <button
                  type="button"
                  className={`alb-tracklist__btn${isActive ? ' is-active' : ''}${isPlaying ? ' is-playing' : ''}`}
                  onClick={() => onSelectTrack(realIndex)}
                  disabled={!track.available}
                  aria-current={isActive ? 'true' : undefined}
                  aria-label={`Track ${track.albumTrack.trackNumber}: ${track.title}${!track.available ? ' (unavailable)' : ''}`}
                >
                  <span className="alb-tracklist__num">{track.albumTrack.trackNumber}</span>
                  <span className="alb-tracklist__title">{track.title}</span>
                  {track.albumTrack.bonus && <span className="alb-tracklist__badge">Bonus</span>}
                  <span className="alb-tracklist__duration">{fmt(track.duration)}</span>
                  {isPlaying && <span className="alb-tracklist__indicator" aria-hidden="true">◈</span>}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </aside>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: No errors related to AlbumSidebar

- [ ] **Step 3: Commit**

```bash
git add src/pages/Visualiser/AlbumSidebar.tsx
git commit -m "feat(album): add AlbumSidebar with cover, metadata, and track list"
```

---

### Task 8: AlbumPage Shell — State Orchestration

**Files:**
- Create: `src/pages/Visualiser/AlbumPage.tsx`

**Interfaces:**
- Consumes: `useAlbumResolver`, `useAlbumAudioEngine`, `AlbumSidebar`, `WmpSpectrum`, `AlbumLyrics`, `AlbumTransport`
- Produces: `export default function AlbumPage()`

- [ ] **Step 1: Implement AlbumPage**

Create `src/pages/Visualiser/AlbumPage.tsx`:

```tsx
import { useCallback, useRef, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { useAlbumResolver } from './hooks/useAlbumResolver';
import { useAlbumAudioEngine } from './hooks/useAlbumAudioEngine';
import { AlbumSidebar } from './AlbumSidebar';
import { WmpSpectrum } from './WmpSpectrum';
import { AlbumLyrics } from './AlbumLyrics';
import { AlbumTransport } from './AlbumTransport';
import './AlbumPage.css';

export default function AlbumPage() {
  const { albumId } = useParams<{ albumId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const reducedMotion = usePrefersReducedMotion();

  const trackQuery = searchParams.get('track') ?? undefined;
  const resolver = useAlbumResolver(albumId ?? '', trackQuery);

  const [activeIndex, setActiveIndex] = useState(resolver.activeTrackIndex);
  const [repeat, setRepeat] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const activeTrack = resolver.tracks[activeIndex] ?? resolver.activeTrack;

  const findNextPlayable = useCallback((from: number, direction: 1 | -1): number => {
    const { tracks } = resolver;
    let idx = from + direction;
    while (idx >= 0 && idx < tracks.length) {
      if (tracks[idx].available && !tracks[idx].albumTrack.hidden) return idx;
      idx += direction;
    }
    return -1;
  }, [resolver]);

  const switchTrack = useCallback((index: number, shouldPlay: boolean) => {
    setActiveIndex(index);
    const track = resolver.tracks[index];
    if (!track?.available) return;

    setTrackQuery(track.grimoireTrack?.id ?? '');

    if (shouldPlay) {
      setTimeout(() => {
        audioRef.current?.play().catch(() => {});
      }, 100);
    }
  }, [resolver.tracks]);

  const setTrackQuery = useCallback((trackId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('track', trackId);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const onEnded = useCallback(() => {
    const next = findNextPlayable(activeIndex, 1);
    if (next >= 0) {
      switchTrack(next, true);
    } else if (repeat) {
      const first = findNextPlayable(-1, 1);
      if (first >= 0) switchTrack(first, true);
    }
  }, [activeIndex, repeat, findNextPlayable, switchTrack]);

  const engine = useAlbumAudioEngine({
    audioRef,
    activeTrack: activeTrack ?? resolver.tracks[0],
    autoplayIntent: false,
    onEnded,
  });

  const handleSelectTrack = useCallback((index: number) => {
    const wasPlaying = engine.status === 'playing' || engine.status === 'loading' || engine.status === 'buffering';
    switchTrack(index, wasPlaying || true);
  }, [engine.status, switchTrack]);

  const handlePrev = useCallback(() => {
    if (engine.currentTime > 3) {
      engine.seek(0);
      return;
    }
    const prev = findNextPlayable(activeIndex, -1);
    if (prev >= 0) {
      const wasPlaying = engine.status === 'playing';
      switchTrack(prev, wasPlaying);
    }
  }, [activeIndex, engine, findNextPlayable]);

  const handleNext = useCallback(() => {
    const next = findNextPlayable(activeIndex, 1);
    if (next >= 0) {
      const wasPlaying = engine.status === 'playing';
      switchTrack(next, wasPlaying);
    }
  }, [activeIndex, engine.status, findNextPlayable]);

  const canPrev = findNextPlayable(activeIndex, -1) >= 0;
  const canNext = findNextPlayable(activeIndex, 1) >= 0;

  if (resolver.notFound) {
    return (
      <main className="alb-page alb-page--not-found" aria-label="Album not found">
        <h1>Album Not Found</h1>
        <p>The album you are looking for does not exist.</p>
        <Link to="/visualiser/albums">Browse all albums</Link>
      </main>
    );
  }

  if (resolver.empty) {
    return (
      <main className="alb-page alb-page--empty" aria-label="Empty album">
        <h1>{resolver.album?.title ?? 'Album'}</h1>
        <p>This album has no playable tracks.</p>
        <Link to="/visualiser/albums">Browse all albums</Link>
      </main>
    );
  }

  return (
    <main className="alb-page" aria-label={`${resolver.album?.title} album`}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        preload="metadata"
      />

      <div className="alb-spread">
        <AlbumSidebar
          resolver={resolver}
          activeIndex={activeIndex}
          status={engine.status}
          onSelectTrack={handleSelectTrack}
        />

        <section className="alb-experience" aria-label="Track experience">
          <div className="alb-experience__spectrum">
            <WmpSpectrum
              analyser={engine.analyser}
              analysisAvailability={engine.analysisAvailability}
              bpm={activeTrack?.pacing?.bpm ?? 120}
              reducedMotion={reducedMotion}
            />
          </div>

          <div className="alb-experience__lyrics">
            {activeTrack && (
              <AlbumLyrics
                track={activeTrack}
                currentTime={engine.currentTime}
                status={engine.status}
                reducedMotion={reducedMotion}
              />
            )}
          </div>

          <AlbumTransport
            status={engine.status}
            currentTime={engine.currentTime}
            duration={engine.duration}
            onPlay={() => { engine.play().catch(() => {}); }}
            onPause={engine.pause}
            onSeek={engine.seek}
            onPrev={handlePrev}
            onNext={handleNext}
            repeat={repeat}
            onToggleRepeat={() => setRepeat(r => !r)}
            canPrev={canPrev}
            canNext={canNext}
          />
        </section>
      </div>

      <div aria-live="polite" className="sr-only">
        {activeTrack && engine.status === 'playing'
          ? `Now playing: ${activeTrack.title}`
          : ''}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: No errors related to AlbumPage

- [ ] **Step 3: Commit**

```bash
git add src/pages/Visualiser/AlbumPage.tsx
git commit -m "feat(album): add AlbumPage shell with state orchestration and sequencing"
```

---

### Task 9: AlbumPage.css

**Files:**
- Create: `src/pages/Visualiser/AlbumPage.css`

**Interfaces:**
- Consumes: existing `--bcv-*` CSS variables
- Produces: `--alb-*` variables and all `alb-` prefixed classes

- [ ] **Step 1: Write the stylesheet**

Create `src/pages/Visualiser/AlbumPage.css`:

```css
.alb-page {
  --alb-bg: #0a0a0f;
  --alb-surface: #111118;
  --alb-border: #1e1e2a;
  --alb-ink: #f1ead8;
  --alb-dim: #8a8fae;
  --alb-accent: var(--bcv-magenta, #d65bff);
  --alb-gold: var(--bcv-gold, #d4af37);
  --alb-mono: var(--bcv-mono, 'JetBrains Mono', ui-monospace, monospace);
  --alb-display: var(--bcv-display, 'Cinzel', Georgia, serif);

  min-height: 100vh;
  background: var(--alb-bg);
  color: var(--alb-ink);
  font-family: var(--alb-mono);
}

.alb-page--not-found,
.alb-page--empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  text-align: center;
}

.alb-page--not-found h1,
.alb-page--empty h1 {
  font-family: var(--alb-display);
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  color: var(--alb-gold);
}

.alb-page--not-found a,
.alb-page--empty a {
  color: var(--alb-accent);
  text-decoration: underline;
}

.alb-spread {
  display: grid;
  grid-template-columns: minmax(280px, 380px) 1fr;
  min-height: 100vh;
}

.alb-sidebar {
  border-right: 1px solid var(--alb-border);
  padding: 1.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.alb-sidebar__cover img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 4px;
  display: block;
}

.alb-sidebar__title {
  font-family: var(--alb-display);
  font-size: clamp(1.2rem, 2.5vw, 1.8rem);
  color: var(--alb-gold);
  margin: 0;
  line-height: 1.2;
}

.alb-sidebar__subtitle {
  font-size: 0.85rem;
  color: var(--alb-dim);
  margin: 0.25rem 0 0;
}

.alb-sidebar__artist {
  font-size: 0.95rem;
  color: var(--alb-ink);
  margin: 0.25rem 0 0;
}

.alb-sidebar__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--alb-dim);
}

.alb-sidebar__description {
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--alb-dim);
  border-top: 1px solid var(--alb-border);
  padding-top: 1rem;
}

.alb-sidebar__description p {
  margin: 0;
}

.alb-tracklist {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
}

.alb-tracklist__btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: none;
  border: 1px solid transparent;
  border-radius: 4px;
  color: var(--alb-ink);
  font-family: var(--alb-mono);
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  text-align: left;
}

.alb-tracklist__btn:hover {
  background: var(--alb-surface);
  border-color: var(--alb-border);
}

.alb-tracklist__btn:focus-visible {
  outline: 2px solid var(--alb-accent);
  outline-offset: 2px;
}

.alb-tracklist__btn.is-active {
  background: var(--alb-surface);
  border-color: var(--alb-accent);
}

.alb-tracklist__btn.is-playing {
  color: var(--alb-accent);
}

.alb-tracklist__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.alb-tracklist__num {
  width: 1.5rem;
  text-align: right;
  color: var(--alb-dim);
  flex-shrink: 0;
}

.alb-tracklist__title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alb-tracklist__badge {
  font-size: 0.65rem;
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
  background: var(--alb-accent);
  color: #000;
  flex-shrink: 0;
}

.alb-tracklist__duration {
  color: var(--alb-dim);
  flex-shrink: 0;
  font-size: 0.75rem;
}

.alb-tracklist__indicator {
  color: var(--alb-accent);
  animation: alb-pulse 1.5s ease-in-out infinite;
}

@keyframes alb-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.alb-experience {
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  gap: 1.5rem;
  overflow: hidden;
}

.alb-experience__spectrum {
  flex: 0 0 auto;
  height: clamp(180px, 30vh, 320px);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--alb-border);
}

.alb-spectrum {
  width: 100%;
  height: 100%;
  display: block;
}

.alb-experience__lyrics {
  flex: 1;
  overflow-y: auto;
  min-height: 200px;
}

.alb-lyrics {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.8;
}

.alb-lyrics--instrumental {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.alb-lyrics__empty {
  color: var(--alb-dim);
  font-style: italic;
}

.alb-lyrics__line {
  display: flex;
  gap: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-left: 3px solid transparent;
  transition: border-color 0.2s, background 0.2s;
}

.alb-lyrics__line.is-active {
  border-left-color: var(--alb-accent);
  background: color-mix(in srgb, var(--alb-accent) 8%, transparent);
  font-weight: 600;
}

.alb-lyrics__num {
  color: var(--alb-dim);
  font-size: 0.7rem;
  width: 1.5rem;
  text-align: right;
  flex-shrink: 0;
  padding-top: 0.15rem;
}

.alb-lyrics__text {
  flex: 1;
}

.alb-lyrics__word {
  color: var(--w, currentColor);
  transition: color 0.15s;
}

.alb-lyrics__word[data-sung="true"] {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.alb-transport {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0;
  flex-wrap: wrap;
}

.alb-transport__time {
  font-size: 0.75rem;
  color: var(--alb-dim);
  font-variant-numeric: tabular-nums;
  min-width: 2.5rem;
}

.alb-transport__bar {
  flex: 1;
  min-width: 120px;
}

.alb-transport__slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  background: var(--alb-border);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.alb-transport__slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--alb-accent);
  cursor: pointer;
}

.alb-transport__slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--alb-accent);
  border: none;
  cursor: pointer;
}

.alb-transport__slider:focus-visible {
  outline: 2px solid var(--alb-accent);
  outline-offset: 2px;
}

.alb-transport__controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.alb-transport__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: none;
  border: 1px solid var(--alb-border);
  border-radius: 50%;
  color: var(--alb-ink);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.alb-transport__btn:hover {
  background: var(--alb-surface);
  border-color: var(--alb-dim);
}

.alb-transport__btn:focus-visible {
  outline: 2px solid var(--alb-accent);
  outline-offset: 2px;
}

.alb-transport__btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.alb-transport__btn--play {
  width: 40px;
  height: 40px;
  border-color: var(--alb-accent);
  color: var(--alb-accent);
}

.alb-transport__btn.is-on {
  background: var(--alb-accent);
  color: #000;
  border-color: var(--alb-accent);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 1023px) {
  .alb-spread {
    grid-template-columns: 1fr;
  }

  .alb-sidebar {
    border-right: none;
    border-bottom: 1px solid var(--alb-border);
    max-height: 50vh;
    overflow-y: auto;
  }

  .alb-sidebar__cover img {
    max-height: 200px;
    width: auto;
    max-width: 100%;
  }

  .alb-experience {
    padding: 1rem;
  }

  .alb-experience__spectrum {
    height: clamp(120px, 20vh, 200px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .alb-tracklist__indicator {
    animation: none;
  }

  .alb-lyrics__line,
  .alb-tracklist__btn,
  .alb-transport__btn,
  .alb-lyrics__word {
    transition: none;
  }
}
```

- [ ] **Step 2: Verify the CSS is valid**

Run: `npx vite build --mode development 2>&1 | head -20`
Expected: Build succeeds (Lightning CSS validates the stylesheet)

- [ ] **Step 3: Commit**

```bash
git add src/pages/Visualiser/AlbumPage.css
git commit -m "feat(album): add AlbumPage.css with split layout, track list, transport, responsive"
```

---

### Task 10: AlbumIndexPage and Routing

**Files:**
- Create: `src/pages/Visualiser/AlbumIndexPage.tsx`
- Modify: `src/pages/Visualiser/DiscographyNav.tsx`
- Modify: `src/main.jsx`
- Test: `tests/visualiser/AlbumIndexPage.test.tsx`

**Interfaces:**
- Consumes: `GRIMOIRE_ALBUMS` from `tracks/albums`
- Produces: `export default function AlbumIndexPage()`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/visualiser/AlbumIndexPage.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AlbumIndexPage from '../../src/pages/Visualiser/AlbumIndexPage';

describe('AlbumIndexPage', () => {
  it('renders album cards for released albums', () => {
    render(
      <MemoryRouter>
        <AlbumIndexPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Albums')).toBeInTheDocument();
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
  });

  it('each album card links to the album page', () => {
    render(
      <MemoryRouter>
        <AlbumIndexPage />
      </MemoryRouter>
    );
    const links = screen.getAllByRole('link').filter(
      l => l.getAttribute('href')?.includes('/visualiser/album/')
    );
    expect(links.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/visualiser/AlbumIndexPage.test.tsx --reporter=verbose`
Expected: FAIL — module not found

- [ ] **Step 3: Implement AlbumIndexPage**

Create `src/pages/Visualiser/AlbumIndexPage.tsx`:

```tsx
import { Link } from 'react-router-dom';
import { GRIMOIRE_ALBUMS } from './tracks/albums';
import './AlbumPage.css';

export default function AlbumIndexPage() {
  const visibleAlbums = GRIMOIRE_ALBUMS.filter(a => a.status !== 'draft');

  return (
    <main className="alb-page alb-index" aria-label="Albums">
      <header className="alb-index__header">
        <h1>Albums</h1>
        <Link to="/visualiser" className="alb-index__back">← Visualiser</Link>
      </header>

      <div className="alb-index__grid">
        {visibleAlbums.map(album => (
          <Link
            key={album.id}
            to={`/visualiser/album/${album.id}`}
            className="alb-index__card"
          >
            <img
              src={album.coverUrl}
              alt={`${album.title} cover`}
              className="alb-index__cover"
            />
            <div className="alb-index__info">
              <h2 className="alb-index__title">{album.title}</h2>
              <p className="alb-index__artist">{album.artist}</p>
              <p className="alb-index__meta">
                {album.releaseDate} · {album.tracks.length} tracks
              </p>
              {album.genres && album.genres.length > 0 && (
                <p className="alb-index__genres">{album.genres.join(' · ')}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Add index page styles to AlbumPage.css**

Append to `src/pages/Visualiser/AlbumPage.css`:

```css
.alb-index {
  padding: 2rem;
}

.alb-index__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.alb-index__header h1 {
  font-family: var(--alb-display);
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  color: var(--alb-gold);
  margin: 0;
}

.alb-index__back {
  color: var(--alb-dim);
  text-decoration: none;
  font-size: 0.85rem;
}

.alb-index__back:hover {
  color: var(--alb-accent);
}

.alb-index__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.5rem;
}

.alb-index__card {
  display: flex;
  flex-direction: column;
  background: var(--alb-surface);
  border: 1px solid var(--alb-border);
  border-radius: 6px;
  overflow: hidden;
  text-decoration: none;
  color: var(--alb-ink);
  transition: border-color 0.2s, transform 0.2s;
}

.alb-index__card:hover {
  border-color: var(--alb-accent);
  transform: translateY(-2px);
}

.alb-index__card:focus-visible {
  outline: 2px solid var(--alb-accent);
  outline-offset: 2px;
}

.alb-index__cover {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
}

.alb-index__info {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.alb-index__title {
  font-family: var(--alb-display);
  font-size: 1.1rem;
  color: var(--alb-gold);
  margin: 0;
}

.alb-index__artist {
  font-size: 0.85rem;
  margin: 0;
}

.alb-index__meta {
  font-size: 0.75rem;
  color: var(--alb-dim);
  margin: 0;
}

.alb-index__genres {
  font-size: 0.7rem;
  color: var(--alb-dim);
  margin: 0.25rem 0 0;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/visualiser/AlbumIndexPage.test.tsx --reporter=verbose`
Expected: PASS (2 tests)

- [ ] **Step 6: Add "Albums" link to DiscographyNav**

In `src/pages/Visualiser/DiscographyNav.tsx`, add after the `<h2>Discography</h2>` line inside the `bcv-disco-header` div:

```tsx
<Link to="/visualiser/albums" className="bcv-disco-albums-link">Albums</Link>
```

And add the import at the top:

```tsx
import { Link } from 'react-router-dom';
```

- [ ] **Step 7: Add routes to main.jsx**

In `src/main.jsx`, add the import near the top with the other page imports:

```js
import AlbumIndexPage from "./pages/Visualiser/AlbumIndexPage.tsx";
import AlbumPage from "./pages/Visualiser/AlbumPage.tsx";
```

Add two routes inside the `<App />` children array, after the existing `visualiser` route (line 129):

```js
{ path: "visualiser/albums", element: <AlbumIndexPage /> },
{ path: "visualiser/album/:albumId", element: <AlbumPage /> },
```

- [ ] **Step 8: Run all tests**

Run: `npx vitest run tests/visualiser/ --reporter=verbose`
Expected: All tests pass

- [ ] **Step 9: Run lint and typecheck**

Run: `npx eslint . --ext js,jsx,ts,tsx --report-unused-disable-directives --quiet`
Run: `npx tsc -p tsconfig.json --noEmit`
Expected: No errors

- [ ] **Step 10: Commit**

```bash
git add src/pages/Visualiser/AlbumIndexPage.tsx src/pages/Visualiser/AlbumPage.css src/pages/Visualiser/DiscographyNav.tsx src/main.jsx tests/visualiser/AlbumIndexPage.test.tsx
git commit -m "feat(album): add AlbumIndexPage, routing, and discography nav link"
```

---

### Task 11: Integration Tests and QA

**Files:**
- Create: `tests/visualiser/AlbumPage.test.tsx`

**Interfaces:**
- Consumes: All album components and hooks
- Produces: Integration test coverage for the album page

- [ ] **Step 1: Write integration tests**

```tsx
// tests/visualiser/AlbumPage.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AlbumPage from '../../src/pages/Visualiser/AlbumPage';
import { GRIMOIRE_ALBUMS } from '../../src/pages/Visualiser/tracks/albums';

function renderAlbumPage(albumId?: string) {
  const id = albumId ?? GRIMOIRE_ALBUMS[0].id;
  return render(
    <MemoryRouter initialEntries={[`/visualiser/album/${id}`]}>
      <Routes>
        <Route path="/visualiser/album/:albumId" element={<AlbumPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AlbumPage', () => {
  it('renders album title for valid album', () => {
    renderAlbumPage();
    expect(screen.getByText(GRIMOIRE_ALBUMS[0].title)).toBeInTheDocument();
  });

  it('renders track list with all non-hidden tracks', () => {
    renderAlbumPage();
    const album = GRIMOIRE_ALBUMS[0];
    const visibleTracks = album.tracks.filter(t => !t.hidden);
    for (const track of visibleTracks) {
      const trackNum = screen.getByText(String(track.trackNumber));
      expect(trackNum).toBeInTheDocument();
    }
  });

  it('renders not-found state for unknown album', () => {
    renderAlbumPage('nonexistent-album-id');
    expect(screen.getByText('Album Not Found')).toBeInTheDocument();
  });

  it('renders audio element with crossOrigin', () => {
    renderAlbumPage();
    const audio = document.querySelector('audio');
    expect(audio).not.toBeNull();
    expect(audio?.crossOrigin).toBe('anonymous');
  });

  it('renders spectrum canvas as aria-hidden', () => {
    renderAlbumPage();
    const canvas = document.querySelector('.alb-spectrum');
    expect(canvas).not.toBeNull();
    expect(canvas?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders transport controls', () => {
    renderAlbumPage();
    expect(screen.getByLabelText('Play')).toBeInTheDocument();
    expect(screen.getByLabelText('Previous track')).toBeInTheDocument();
    expect(screen.getByLabelText('Next track')).toBeInTheDocument();
    expect(screen.getByLabelText('Repeat album')).toBeInTheDocument();
  });

  it('renders aria-live region for track announcements', () => {
    renderAlbumPage();
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run tests/visualiser/AlbumPage.test.tsx --reporter=verbose`
Expected: PASS (all 7 tests)

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run tests/visualiser/ --reporter=verbose`
Expected: All tests pass

- [ ] **Step 4: Run lint**

Run: `npx eslint . --ext js,jsx,ts,tsx --report-unused-disable-directives --quiet`
Expected: No errors

- [ ] **Step 5: Run typecheck**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add tests/visualiser/AlbumPage.test.tsx
git commit -m "test(album): add AlbumPage integration tests"
```
