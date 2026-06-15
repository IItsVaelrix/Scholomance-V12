# Scholomance Music Video — Design Spec
_Date: 2026-06-15_

## Goal

Generate rendered MP4 music videos (3–5 minutes) from Scholomance rap tracks, using kinetic professional typography synced to the beat. First deliverable: lyric videos where every word is colored by its phoneme school, animated by ScholoTime, and directed by BPM.

---

## Role Architecture

Three systems with distinct, non-overlapping responsibilities:

| Role | System | Owns |
|------|--------|------|
| Authority | PixelBrain | Visual vocabulary — school colors, glyphs, atmosphere parameters |
| Presenter | ScholoTime | Timing and motion — easing, beat resolution, interpolation |
| Director | BPM | Global pulse — every visual event is downstream of the BPM grid |

The render pipeline reads as:
```
BPM grid → resolves beat/bar state per frame (ScholoTime)
                      ↓
       ScholoTime eases the transition
                      ↓
       PixelBrain supplies the visual asset
                      ↓
       Remotion composites the frame
```

---

## Data Model

### WordTiming

```ts
interface WordTiming {
  word: string;
  startMs: number;
  endMs: number;
  beat: {
    index: number;    // which beat this word lands on
    phase: number;    // 0–1 position within that beat (0 = downbeat, 0.5 = "and")
    bar: number;      // which bar
    barPhase: number; // 0–1 position within the bar
  };
  school: string;     // keyof typeof SCHOOLS — derived from dominant vowel family via G2P
}
```

`beat` is pre-computed by the alignment script using `resolveBeatState` + `resolveBarState` from ScholoTime at the track's BPM. The BPM director's grid is stored per word so the renderer reads it directly.

`school` is derived by running the word through G2P → dominant vowel family → `VOWEL_FAMILY_TO_SCHOOL`. Words with no resolvable vowel family fall back to `VOID`.

### Storage — Sidecar Files

Word timings are stored as `.align.json` sidecars, not inlined into track TypeScript files:

```
src/pages/Visualiser/tracks/
  bigFather.ts            ← unchanged GrimoireTrack definition
  bigFather.align.json    ← { wordTimings: WordTiming[] }
  petrichor.ts
  petrichor.align.json
```

The track loader merges them at runtime. A missing sidecar means `wordTimings` is `undefined` — the existing heuristic syllable-per-beat pacing in the Visualiser continues to work without modification. No regressions.

---

## Forced Alignment Pipeline

**Script:** `scripts/align-track.mjs <trackId>`

```
1. Load GrimoireTrack by ID
2. Download audio from GrimoireTrack.audioUrl
3. Run WhisperX forced alignment (Python subprocess) against GrimoireTrack.lyrics
   → raw word timestamps { word, startMs, endMs }
4. For each word:
   a. Run through G2P → extract dominant vowel family → VOWEL_FAMILY_TO_SCHOOL → school
   b. resolveBeatState(startMs, { bpm: pacing.bpm, offsetMs: pacing.leadInS * 1000 })
   c. resolveBarState(beatState) 
   → WordTiming object
5. Write WordTiming[] to src/pages/Visualiser/tracks/<trackId>.align.json
```

WhisperX uses phoneme-level forced alignment on top of Whisper — it aligns against the *existing* lyrics rather than re-transcribing. BPM offset (`TrackPacing.leadInS`) is applied before beat resolution so the director's grid is correctly phase-aligned to the audio intro.

---

## Remotion Composition Architecture

**Location:** `src/video/`

**Root composition:** `KineticLyricsVideo` — receives `GrimoireTrack` (with merged `wordTimings`) as Remotion input props. Canvas: 1920×1080, 30fps.

### Components

**`BeatClock` (BPM Director)**
Not a visual component. A React hook `useBeatClock()` that converts Remotion's `useCurrentFrame()` to milliseconds via `frameIndexToTimeMs`, then calls `resolveBeatState` + `resolveBarState`. Returns the current beat state. Every other component calls `useBeatClock()` — the director speaks once per frame and everything listens. No component computes time independently.

**`KineticWord` (ScholoTime Presenter)**
Renders one `WordTiming`. Reads beat state from `useBeatClock()`. Applies `applyEasing()` to compute scale, opacity, and position offset for entrance and sustain. Words on bar downbeats (`barPhase < 0.1`) use `easeOutCubic` for a more aggressive entrance. Pickup words use `smoothstep`. ScholoTime owns all interpolation — no hand-authored CSS keyframes.

Word color: `generateSchoolColor(word.school)` from PixelBrain's school authority.

**`PixelBrainStage` (PixelBrain Authority)**
Background and ambient layer. Tracks the dominant school across the last 4 active words and crossfades `atmosphere.auroraIntensity`, `atmosphere.saturation`, and `atmosphere.vignetteStrength` using `smoothstep` easing from ScholoTime. When a VOID cluster hits, the scene drains of color and the vignette deepens. When ALCHEMY peaks, the aurora blazes pink. PixelBrain owns what transitions look and feel like.

---

## Glyph Treatment

Each school has a glyph (♩ SONIC, ◬ PSYCHIC, ∅ VOID, ⚗ ALCHEMY, ⚡ WILL, ☠ NECROMANCY, ◇ ABJURATION, ◉ DIVINATION).

Glyphs are **typographic ghosts**, not badges:

- Rendered behind the word at ~15% opacity, school color, ~60% of word's cap-height, anchored to the word's leading edge
- On word entrance: blooms outward (scale 1.0→1.4, opacity 40%→0%) over exactly one beat phase (ScholoTime `phase` 0→1) — the glyph is the shockwave of the word arriving
- For sustained words (spanning multiple beats): re-pulses at 10% opacity on each beat it spans — a heartbeat, not a flash
- The viewer feels the school through motion; the glyph is never a label

---

## Audio Path

| Context | Approach |
|---------|----------|
| Live browser preview | Web Audio API / Web Worker (existing Visualiser path, unchanged) |
| Rendered video | Remotion `<Audio>` + `useAudioData()` |

Remotion's `useAudioData()` decodes the Suno audio into per-frame FFT data at render time. This means the `BytecodeVisualiser` mandala can be composited as a background layer with real frequency data during render — no synthetic approximation, no Web Worker.

ScholoTime's beat resolution works identically in both contexts. It only needs BPM + a time value — it doesn't care whether time comes from `performance.now()` or Remotion's `currentFrame`.

---

## Render Script

**Script:** `scripts/render-music-video.mjs <trackId>`

```
1. Load GrimoireTrack + merge <trackId>.align.json
2. Pass as Remotion inputProps to KineticLyricsVideo composition
3. renderMedia({ fps: 30, width: 1920, height: 1080, codec: 'h264' })
4. Output: output/videos/<trackId>.mp4
```

Audio is muxed directly by Remotion/ffmpeg — no separate audio merge step.

---

## Out of Scope (v1)

- PixelBrain character sprites composited into the video (architecture supports it via `PixelBrainStage`, defer to v2)
- Resolution/fps CLI flags (hardcoded 1920×1080 30fps for v1)
- Web-based alignment editor for manual timestamp correction
