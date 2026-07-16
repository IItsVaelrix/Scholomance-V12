# Album Page Design

**Date:** 2026-07-16
**Status:** Draft (rev 3 — corrections applied)
**Author:** Vaelrix

## Overview

A Bandcamp-inspired album experience within the Visualiser section. Albums group multiple `GrimoireTrack` entries under a single release. The album page uses a split layout: album identity on the left, active track experience (karaoke lyrics + WMP-style bar spectrum) on the right.

## Data Model

### GrimoireAlbumTrack

Album-specific track entry preserving global track reuse while giving the album ownership over sequencing, overrides, and metadata.

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
```

### GrimoireAlbum

```ts
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

`model` and `modelVersion` are optional — a compilation may contain songs from different Suno versions, making album-level model metadata factually misleading. Model provenance belongs on each track; album metadata summarizes only when uniform.

`totalDuration` is derived from resolved track durations when possible:

```ts
const totalDuration = playableTracks.reduce(
  (sum, track) => sum + track.duration, 0
);
```

An explicit override is used only when the album includes gaps, transitions, or hidden content that make the computed total inaccurate.

Albums are exported from `tracks/index.ts` alongside `GRIMOIRE_TRACKS`. Album definitions live in `tracks/albums.ts`.

### Track Resolution

`useAlbumResolver` hook resolves album track data:

- Finds the album by ID from the registry
- Resolves each `GrimoireAlbumTrack.trackId` against `GRIMOIRE_TRACKS`
- Applies overrides: `titleOverride`, `audioUrlOverride`, `coverUrlOverride` take precedence over the global track's values
- Filters or marks tracks with unresolvable `trackId` as unavailable
- Sorts by `discNumber` then `trackNumber`
- Chooses the initial active track using the playable ordering contract (see below)
- Returns resolved track list, album metadata, and any resolution warnings

### Playable Ordering

Initial track selection and next/previous navigation skip tracks that are not playable:

```
initial track =
  valid query track if playable
  else first non-hidden, available track
  else empty/unavailable state
```

Next and previous skip:

- Unavailable tracks (unresolvable `trackId`)
- Hidden tracks (unless explicitly enabled)
- Malformed entries

Bonus tracks remain playable unless a separate rule says otherwise.

## Routing

| Path | Page | Purpose |
|---|---|---|
| `/visualiser` | `BytecodeVisualiserPage` | Existing — unchanged |
| `/visualiser/albums` | `AlbumIndexPage` | Grid of all albums |
| `/visualiser/album/:albumId` | `AlbumPage` | Split-layout album experience |

Routes added in `src/main.jsx`.

### Route Validation

- **Valid album** → renders `AlbumPage`
- **Unknown album ID** → renders `AlbumNotFound` state (not a silent redirect to the first album)
- **Valid album with invalid track IDs** → renders album, marks missing tracks as unavailable in the track list
- **Empty album (zero valid tracks)** → renders intentional empty state, not broken transport

### URL-Addressable Active Tracks

Track selection is encoded in the query string:

```
/visualiser/album/:albumId?track=:trackId
```

Updated via React Router's `useSearchParams` with `{ replace: true }`:

```ts
const [searchParams, setSearchParams] = useSearchParams();

function setTrackQuery(trackId: string) {
  const next = new URLSearchParams(searchParams);
  next.set("track", trackId);
  setSearchParams(next, { replace: true });
}
```

**Not** `history.replaceState` — direct browser history mutation can leave React Router unaware of the URL change, causing components consuming router location to not rerender consistently. Using the router-owned API keeps the browser URL, React Router location, refresh state, and any analytics listeners synchronized.

Enables sharing, browser refresh restoration, back/forward navigation, deep links from discography, and analytics attribution.

## Album Page Layout

`/visualiser/album/:albumId` uses a two-panel split layout mirroring the existing visualiser's spread pattern.

### Left Panel — Album Identity (`AlbumSidebar`)

- Album cover art (large, hero-style)
- Album title + artist + optional subtitle
- Release date, genres, model info (when uniform)
- Description text (prose block)
- Track list: track number, title (with override), duration, play button per track
- Active/playing track highlighted with `aria-current="true"`
- Unavailable tracks rendered as disabled with visual indicator
- Hidden tracks excluded from list (unless a debug flag is set)
- Bonus tracks shown with a badge
- Clicking a track starts playback and activates it on the right panel

### Right Panel — Active Track Experience

Three stacked sections:

1. **WMP Bar Spectrum** (`WmpSpectrum`) — classic Windows Media Player vertical frequency bars
2. **Karaoke Lyrics** (`AlbumLyrics`) — phoneme-colored words, active line highlighted, auto-scrolling
3. **Transport Controls** (`AlbumTransport`) — play/pause, prev/next track within album, progress bar, time display

### Responsive Behavior

**Desktop** (≥1024px):
```
[ Album sidebar ][ Active track experience ]
```

**Mobile** (<1024px):
```
[ Compact album header: cover thumb + title + artist ]
[ Collapsible track list drawer ]
[ Spectrum (reduced height) ]
[ Lyrics (majority of viewport) ]
[ Sticky bottom transport bar ]
```

The track list collapses into a drawer on mobile to prevent it from pushing the active experience below the fold. Sticky transport remains accessible without covering lyrics.

## Playback Status Model

Replaces the boolean cluster (`playing`, `progress`, `duration`, `repeat`) with an explicit status enum synchronized from media events:

```ts
type PlaybackStatus =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "buffering"
  | "ended"
  | "error";
```

State is derived from `<audio>` element events, not React assumptions:

| Event | Status Transition |
|---|---|
| `play` | → `loading` (playback requested, not yet advancing frames) |
| `waiting` | → `buffering` |
| `playing` | → `playing` (media frames are actively advancing) |
| `canplay` | → `paused` (when newly selected track is ready but autoplay intent is false) |
| `pause` | → `paused` |
| `ended` | → `ended` |
| `error` | → `error` |
| `loadedmetadata` | update `duration` |
| `durationchange` | update `duration` |
| `timeupdate` | update `currentTime` |

The `play` event means playback has been requested — it does not guarantee media frames are actively advancing. The `playing` event is the stronger signal. This prevents the pause icon and active-playing decoration from appearing while the browser is still loading or has not actually begun playback.

`currentTime` and `duration` are read from the audio element, not stored as independent truth.

## Audio Engine — `useAlbumAudioEngine`

### Ownership Model

One persistent `<audio>` element and one persistent Web Audio graph for the lifetime of the page:

```
HTMLAudioElement (crossOrigin="anonymous", preload="metadata")
      ↓
MediaElementAudioSourceNode
      ↓
AnalyserNode
      ↓
AudioContext.destination
```

The graph is created once on first user gesture. On track switch:

1. Pause playback
2. Set `audio.src` to the new track's URL
3. Call `audio.load()`
4. Reset local timing state
5. Resume playback only if prior intent was playing

The graph is **never** recreated unless the element itself is destroyed.

### Cross-Origin Audio Analysis

Because tracks stream through `audioUrl` from external origins, Web Audio analysis may fail or return unusable data without appropriate CORS handling.

The `<audio>` element must declare:

```html
<audio ref={audioRef} crossOrigin="anonymous" preload="metadata" />
```

The `crossOrigin` property must be established **before** assigning `src`. The audio host must return an appropriate `Access-Control-Allow-Origin` header.

The engine distinguishes analysis availability:

```ts
type AnalysisAvailability =
  | "uninitialized"
  | "available"
  | "cors-blocked"
  | "unsupported";
```

When analysis is blocked (`cors-blocked`), playback continues normally while `WmpSpectrum` switches to the deterministic fallback spectrum.

### Hook Contract

```ts
useAlbumAudioEngine({
  audioRef: RefObject<HTMLAudioElement>,
  activeTrack: ResolvedAlbumTrack,
  autoplayIntent: boolean,
  onEnded: () => void,
});
```

Returns:

```ts
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

`play()` returns a `Promise` because `HTMLMediaElement.play()` can reject (user-gesture restrictions). Callers handle rejection without pretending the command was synchronous.

This prevents `AlbumPage` from becoming an event-listener thicket and ensures all media state flows through one authoritative source.

### Sequencing Ownership — Option A

The audio engine owns **browser media mechanics**. `AlbumPage` (or a dedicated playback controller) owns **album semantics**.

- The engine reports that media ended via `onEnded()`
- `AlbumPage` decides: next track, first track under repeat, or final ended state
- The engine does **not** understand album order, hidden tracks, unavailable tracks, discs, or routing

This prevents split-brain progression where both `onEnded` and the hook attempt to advance or loop.

### Track Switching Contract

| Situation | Behavior |
|---|---|
| User selects another track while playing | Switch and continue playing |
| User selects another track while paused | Switch but remain paused |
| Track ends | `AlbumPage` advances to next playable track |
| Final track ends | Stop, unless album repeat is enabled (then loop to first) |
| Previous pressed after 3+ seconds | Restart current track |
| Previous pressed near beginning (<3s) | Move to previous playable track |
| Audio load fails | Keep album page active, show track-level error, status → `error` |
| Active track missing from registry | Disable playback, surface invalid album data |
| Album has zero valid tracks | Render empty-state page, not broken transport |
| Failed `audio.play()` | Promise rejects, status remains `paused`, UI reflects actual state |

### Repeat Policy

- `repeat` toggles album-level repeat (owned by `AlbumPage`)
- When enabled: `onEnded` on the final track causes `AlbumPage` to select the first playable track and call `play()`
- When disabled: `onEnded` on the final track sets status to `ended` and stops

## WmpSpectrum Visualization

A `<canvas>` element rendering the classic WMP "Bars" aesthetic.

### Visual Specification

- **64 vertical bars**, evenly spaced across canvas width
- **Bar height** = FFT magnitude for that frequency bin, scaled to canvas height
- **Color gradient** per bar (bottom to top):
  - Bottom: deep magenta `hsl(312, 90%, 40%)`
  - Mid: violet `hsl(280, 85%, 55%)`
  - Top: cyan-white `hsl(196, 90%, 80%)`
- **Peak hold** — small bright dot above each bar showing recent peak, decays downward slowly
- **Mirror/reflection** — bars reflect below baseline at ~30% opacity (glassy floor effect)
- **Background** — dark `#0a0a0f` with subtle scanline overlay (matching existing CRT aesthetic)

### Analysis Fallback

`WmpSpectrum` reads `analysisAvailability` from the audio engine:

- `"available"` → real FFT data drives the bars
- `"cors-blocked"`, `"unsupported"`, `"uninitialized"` → deterministic synthetic spectrum (beat-synced sine pulses, same as the mandala fallback in `BytecodeVisualiser`)

Playback continues normally in all cases. The visualization degrades gracefully.

### Performance Contract

- `devicePixelRatio` canvas scaling for sharp rendering on HiDPI displays
- `ResizeObserver` for responsive canvas sizing
- One `requestAnimationFrame` loop, cancelled on pause/unmount
- Frame-rate throttling when tab is hidden (`document.visibilityState`)
- **No React state updates per animation frame** — all FFT values stay in refs
- Preallocated `Uint8Array` for FFT data (never reallocated per frame)
- Peak arrays stored in refs, not state
- Canvas paints imperatively — FFT values never travel through React state at 60 FPS
- Scanlines rendered in the canvas paint or one non-animated CSS overlay — no stacked translucent layers

### Reduced Motion

When `prefers-reduced-motion` is active:

- If real audio analysis is available: update bars at 2–4 FPS (low cadence, real data)
- Disable peak decay animation and reflection movement
- Use synthetic static data only when audio analysis itself is unavailable
- A frozen synthetic visualization while real audio plays would feel disconnected — reduced motion means less temporal motion, not fabricated audio information

### Accessibility

- Canvas marked `aria-hidden="true"` (decorative)
- Text fallback for spectrum state available via visually-hidden live region when track changes

## Lyric Sync

Extracted from `BytecodeVisualiserPage` into `AlbumLyrics.tsx`:

- `useLyricAlignment` hook for forced-alignment artifacts when available
- Falls back to `lyricLineAt` heuristic with `lineBeats` from phoneme engine
- `wordTruesight` coloring for phoneme school colors
- Active line auto-scrolls into view during playback
- Auto-scroll pauses when user manually scrolls (resumes on next play interaction)
- Hover annotations (truesight panel) included
- No lyrics → renders "Instrumental" state, not empty container

### Accessibility

- Active lyric line uses more than color: weight increase + side marker + background shift
- Phoneme colors meet WCAG contrast requirements against the dark background
- Keyboard-accessible word hover (focus triggers annotation panel)
- No information communicated solely through color

## Album Index Page

`/visualiser/albums` — a grid of album cards:

- Album cover art
- Title + artist
- Release date
- Track count
- Optional genre tags

Only albums with `status !== "draft"` are shown (unless a debug flag is set). Clicking navigates to `/visualiser/album/:albumId`. Styled with existing CSS variables and panel patterns.

## Navigation

- `DiscographyNav` gets an "Albums" link at the top routing to `/visualiser/albums`
- Album page has a back link to the album index
- Track switching within an album updates the `?track=` query param via `setSearchParams` with `{ replace: true }` (no navigation, no history flooding)

## Component Architecture

```
AlbumPage
├── useAlbumResolver        — album lookup, track resolution, ordering, initial track
├── useAlbumAudioEngine     — media events, AudioContext, analyser, play/pause/seek, cleanup
├── AlbumSidebar            — cover, metadata, track list
├── WmpSpectrum             — canvas: WMP vertical bar spectrum
├── AlbumLyrics             — karaoke lyrics with phoneme coloring
└── AlbumTransport          — play/pause, track skip, progress bar
```

### Hook Responsibilities

**`useAlbumResolver`**:
- Finds the album from the registry by route param
- Resolves each `GrimoireAlbumTrack.trackId` against `GRIMOIRE_TRACKS`
- Applies overrides (title, audio URL, cover URL)
- Filters/marks unresolvable tracks as unavailable
- Sorts by disc number then track number
- Derives `totalDuration` from resolved tracks (unless album provides an override)
- Chooses initial active track using the playable ordering contract
- Returns resolved track list, album metadata, resolution warnings

**`useAlbumAudioEngine`**:
- Persistent `<audio>` element and Web Audio graph lifecycle
- Media event synchronization → `PlaybackStatus` (play → loading, playing → playing)
- `AnalysisAvailability` tracking for CORS and browser support
- AnalyserNode creation on first user gesture
- `play()` returns `Promise<void>` (handles user-gesture rejection)
- `pause()` and `seek()` are synchronous
- Track switching (src change, not graph rebuild)
- Track completion → `onEnded` callback (AlbumPage owns sequencing)
- Cleanup on unmount (cancel RAF, close AudioContext, remove listeners)

## Accessibility Contract

- Track rows are keyboard-accessible (`<button>` elements) with visible focus states
- `aria-current="true"` on the active track row
- Play/pause button labels update dynamically (`aria-label="Play"` / `aria-label="Pause"`)
- Progress bar is an accessible range input with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and human-readable `aria-valuetext` (e.g., "2:34 of 4:01")
- Spectrum canvas is `aria-hidden="true"`
- Active lyric highlight uses weight + side marker + background (not color alone)
- Phoneme colors meet WCAG AA contrast against dark background
- All interactive elements reachable via keyboard

### Focus Management

Focus movement is context-dependent, not automatic:

| Trigger | Focus Behavior |
|---|---|
| Explicit activation from track list | Keep focus on the activated track button |
| Automatic advancement (track ends, next track starts) | Do **not** move focus |
| Next/previous from transport controls | Keep focus on the transport control; announce new track via `aria-live` region |
| Repeat loops to first track | Do **not** move focus |

This preserves user context and prevents auto-advancement from hijacking navigation. An `aria-live="polite"` region announces track changes for screen readers without stealing focus.

## Files Created

| File | Purpose |
|---|---|
| `src/pages/Visualiser/AlbumPage.tsx` | Split-layout album page shell |
| `src/pages/Visualiser/AlbumSidebar.tsx` | Left panel: cover, metadata, track list |
| `src/pages/Visualiser/WmpSpectrum.tsx` | Canvas: WMP bar spectrum |
| `src/pages/Visualiser/AlbumLyrics.tsx` | Extracted karaoke lyrics |
| `src/pages/Visualiser/AlbumTransport.tsx` | Transport controls |
| `src/pages/Visualiser/AlbumIndexPage.tsx` | Album grid landing |
| `src/pages/Visualiser/AlbumPage.css` | Album experience styles |
| `src/pages/Visualiser/hooks/useAlbumResolver.ts` | Album lookup + track resolution |
| `src/pages/Visualiser/hooks/useAlbumAudioEngine.ts` | Audio graph lifecycle + playback state |
| `src/pages/Visualiser/tracks/albums.ts` | Album definitions |

## Files Modified

| File | Change |
|---|---|
| `src/pages/Visualiser/tracks/types.ts` | Add `GrimoireAlbum`, `GrimoireAlbumTrack` interfaces |
| `src/pages/Visualiser/tracks/index.ts` | Export albums |
| `src/pages/Visualiser/DiscographyNav.tsx` | Add "Albums" link |
| `src/main.jsx` | Add 2 new routes |

## QA Checklist

### Data

- [ ] Album with valid tracks resolves in declared order (disc + track number)
- [ ] Unknown album ID renders `AlbumNotFound` state
- [ ] Missing track IDs do not crash the page — marked unavailable
- [ ] Empty album renders an intentional empty state
- [ ] Duplicate track IDs behave deterministically
- [ ] Title/audio/cover overrides apply correctly
- [ ] Hidden tracks excluded from track list
- [ ] Bonus tracks shown with badge and remain playable
- [ ] `totalDuration` derived from tracks when not explicitly set
- [ ] Next/previous skip unavailable and hidden tracks

### Playback

- [ ] `play` event → `loading` status (not `playing`)
- [ ] `playing` event → `playing` status (frames advancing)
- [ ] `canplay` → `paused` when autoplay intent is false
- [ ] Switching while playing continues playback
- [ ] Switching while paused remains paused
- [ ] Next and previous obey album ordering (disc-aware)
- [ ] Final-track behavior matches repeat policy
- [ ] Previous after 3+ seconds restarts current track
- [ ] Previous near beginning moves to previous playable track
- [ ] Failed `audio.play()` rejects promise, status remains `paused`
- [ ] Audio graph created only once per page lifetime
- [ ] All listeners and animation frames cleaned up on unmount
- [ ] Track switch does not recreate AudioContext/AnalyserNode
- [ ] `?track=` query param updates via `setSearchParams` with `{ replace: true }`
- [ ] `onEnded` fires, AlbumPage owns sequencing decision
- [ ] CORS-blocked audio → `analysisAvailability` = `"cors-blocked"`, playback continues

### Lyrics

- [ ] Forced alignment wins when present
- [ ] Heuristic fallback works when alignment is absent
- [ ] No lyrics produces "Instrumental" state
- [ ] Auto-scroll pauses when user manually scrolls
- [ ] Hover annotations work with mouse and keyboard

### Visualizer

- [ ] Canvas sharp on high-DPI screens (devicePixelRatio scaling)
- [ ] Resize does not distort bars (ResizeObserver)
- [ ] Hidden tabs stop expensive rendering (visibilityState)
- [ ] Reduced-motion mode uses low-cadence real data when audio available
- [ ] Synthetic output is deterministic when audio unavailable
- [ ] No React re-render per animation frame
- [ ] Scanlines: one layer only, no stacked translucent CSS
- [ ] `analysisAvailability` fallback: spectrum degrades gracefully when CORS-blocked

### Responsive

- [ ] Long titles do not break the sidebar
- [ ] 20+ tracks remain navigable (scrollable list)
- [ ] Sticky transport does not cover lyrics on mobile
- [ ] Cover art does not consume entire mobile viewport
- [ ] Landscape tablet layout remains usable
- [ ] Mobile track list drawer opens/closes correctly

### Accessibility

- [ ] Track rows keyboard-accessible with visible focus
- [ ] `aria-current` on active track
- [ ] Play/pause labels update dynamically
- [ ] Progress bar has accessible value text
- [ ] Spectrum canvas is `aria-hidden`
- [ ] Active lyric uses more than color (weight + marker + background)
- [ ] Phoneme colors meet WCAG AA contrast
- [ ] Focus not moved on automatic track advancement
- [ ] Focus kept on transport control for next/previous
- [ ] `aria-live` region announces track changes
- [ ] `crossOrigin="anonymous"` set before `src` assignment
