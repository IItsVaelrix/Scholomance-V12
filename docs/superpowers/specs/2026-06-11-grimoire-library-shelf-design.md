# Multi-Track Grimoire + Library Shelf — Design

**Date:** 2026-06-11
**Status:** Approved
**Scope:** Add "Big Father" (Suno id `eaba93dc-bf75-4319-a67e-ddcedafc1c43`) to the
Bytecode Visualiser and turn the single-track page into a registry-driven multi-track
grimoire with a library shelf section. Suno grimoire tracks only — the YouTube/SoundCloud
entries in `src/data/library.js` are out of scope.

## Problem

`src/pages/Visualiser/BytecodeVisualiserPage.tsx` hardcodes one track (Petrichor) as a
~130-line `TRACK` constant plus Petrichor-specific pacing constants at module scope
(`TRACK_BPM = 123`, `CHORUS_START_LINE = 62`, syllables-per-beat values). A second track
cannot be added without either duplicating the blob or inheriting the wrong pacing.
There is no way to browse tracks.

## Decision

Track registry (typed per-track modules) + a library shelf section on the visualiser
page. Rejected: tracks as runtime-fetched JSON (async states + lost typing for no
benefit); a second hardcoded blob with a toggle (file growth, ambient pacing constants).

## Component 1 — Track registry `src/pages/Visualiser/tracks/`

- `types.ts` — `GrimoireTrack`:
  - `id, title, artist, model, modelVersion, duration, sunoUrl, audioUrl, coverUrl`
  - `meta: [string, string][]`, `provenance { statement, tools, assistance }`
  - `lyrics: string[]`, `annotations: { n, title, body }[]`
  - `pacing?: { bpm, chorusStartLine?, verseSylPerBeat, chorusSylPerBeat, leadInS,
    tailS, coupletCostMax }` — optional; **a track without measured tempo gets no
    pacing block** (honesty law: no invented BPM). The heuristic fallback then uses
    generic defaults (bpm 120, 1.2 syl/beat, 0 lead-in/tail) and the UI already labels
    that path "estimated".
- `petrichor.ts` — existing TRACK data moved verbatim; its measured pacing
  (bpm 123, chorusStartLine 62, verse 1.6 / chorus 0.7 syl-per-beat, leadIn 9, tail 6,
  coupletCostMax 0.75) moves into its `pacing` block.
- `bigFather.ts` — published facts only: title "Big Father", artist Vaelrix,
  chirp-fenix v5.5, duration 206.64 s (3:27), released 2026-06-11,
  `audioUrl https://cdn1.suno.ai/eaba93dc-bf75-4319-a67e-ddcedafc1c43.mp3`,
  `coverUrl https://cdn2.suno.ai/image_eaba93dc-bf75-4319-a67e-ddcedafc1c43.jpeg`,
  style line from the published tags (Sorrow Jazz / Hyperpop / Cinematic Trip-hop,
  Aeolian E minor). Lyrics extracted from the song page's clip JSON for this clip id
  (first extraction attempt matched another clip's prompt — the implementation must
  match the prompt to clip `eaba93dc-…` specifically and verify against the page).
  No `pacing` block. Annotations optional (empty array is fine at launch).
- `index.ts` — `GRIMOIRE_TRACKS: GrimoireTrack[]`, shelf order = release order
  (Petrichor first, default track).

## Component 2 — Page refactor + library shelf

- `BytecodeVisualiserPage` renders `activeTrack` state instead of the module constant.
  Initial value: `?track=<id>` query param when it matches a registry id, else the first
  registry entry. Switching calls `history.replaceState` to keep the URL shareable; no
  router changes.
- The truesight/pacing effect (engine init, coloured lyrics, line beats, couplet
  symmetry) re-runs per track — deps `[activeTrack]`; `lineBeats`/`coloredLyrics` reset
  on switch. Pacing constants read from `activeTrack.pacing` with the generic defaults
  above when absent.
- `<audio key={track.id} src={track.audioUrl}>` so a switch tears down the element:
  playback stops, progress resets to 0. The Web Audio analyser graph rebuilds on next
  play (`createMediaElementSource` is per-element).
- Karaoke: `useLyricAlignment(activeTrack.id)` — already id-keyed, no changes to the
  alignment stack.
- **Library shelf**: a section beneath the spread (`bcv-library`), heading "Library".
  One tile per registry track: cover thumbnail, title, style line. Active tile marked
  and `aria-pressed`; click switches `activeTrack`. Styled in `BytecodeVisualiser.css`
  to match the grimoire surface. Cover load failure falls back to the ◈ glyph like the
  main cover does.

## Component 3 — Big Father alignment artifact

Run the existing pipeline (`scripts/align_lyrics.py`) for the new track on this machine:

1. Extract lyrics → `scripts/big-father.lyrics.txt` (one line per lyric line; must match
   `bigFather.ts` lyrics exactly — a unit test asserts this indirectly via the registry).
2. `curl` the MP3 → `tmp/bigfather.mp3`; verify duration ≈ 206.6 s with ffprobe.
3. Demucs separation, then alignment with `--model base` (MMS gets earlyoom-killed on
   this machine — see project memory), `--review` page emitted.
4. Listen-gate: the user reviews sync quality before the artifact is committed.
5. Artifact: `public/data/alignment/eaba93dc-bf75-4319-a67e-ddcedafc1c43.alignment-v1.json`
   with truthful `source` (aligner `torchaudio-wav2vec2-base960h`, separator `htdemucs`).

## Error handling

- Unknown `?track=` → default track (no crash, no blank page).
- Cover image errors → glyph fallback (existing pattern).
- Missing alignment artifact for a track → heuristic sync, meta row "estimated"
  (existing behaviour, now per-track).
- A track without `pacing` uses generic defaults — never another track's constants.

## Testing

- New registry test (`tests/core/grimoireTracks.test.js`): unique ids, non-empty
  lyrics, every annotation `n` within `lyrics.length`, https URLs, duration > 0;
  Petrichor remains first.
- New shelf test (jsdom): clicking the Big Father tile swaps the rendered title and
  lyrics; `aria-pressed` follows.
- Existing suites stay green: 28 alignment tests, `npm run test:qa:stasis` (default
  render is still Petrichor).
- E2E: dev server — switch tracks, confirm Big Father plays, karaoke lights words once
  its artifact exists, Petrichor unchanged.
