# Forced-Alignment Karaoke Sync — Design

**Date:** 2026-06-10
**Status:** Approved
**Scope:** Reusable offline alignment pipeline + word-level karaoke sync in the visualiser surfaces. Petrichor (Bytecode Visualiser) is the first track through the pipeline.

## Problem

Lyric sync in `src/pages/Visualiser/BytecodeVisualiserPage.tsx` is fully heuristic: line
durations are estimated from phoneme-engine syllable counts ÷ syllables-per-beat at a
detected BPM, scaled onto the vocal window. There are no ground-truth timestamps anywhere
(Suno publishes none). The estimate drifts within sections and cannot support word-level
karaoke highlight.

## Decision

An offline ML forced-alignment pipeline produces per-word timestamps once per track; the
frontend consumes the resulting static JSON. Chosen approach: **Demucs vocal separation +
torchaudio CTC forced alignment (MMS_FA wav2vec2 bundle)**, because it aligns the
*canonical lyrics we already have* (no transcript-reconciliation step as WhisperX would
need) and runs CPU-only on the dev machine. MFA/Gentle were rejected: built for clean read
speech, painful installs on immutable SteamOS, no advantage over CTC on sung vocals.

Granularity: **word-level** (line spans derived from word spans).
Runtime: **offline script**; output committed as a static asset. Zero runtime ML cost.

## Component 1 — Pipeline script `scripts/align_lyrics.py`

Standalone CLI in its own venv (SteamOS has no system pip). Deps: torch (CPU),
torchaudio, demucs, soundfile; ffmpeg already on the machine. ~2–3 GB one-time model
download.

```
python scripts/align_lyrics.py --audio <file|url> --lyrics lyrics.txt \
    --track-id <id> [--out public/data/alignment/] [--review] [--selftest]
```

Stages:

1. **Decode** — ffmpeg loads local file or URL (e.g. Suno CDN MP3) to WAV.
2. **Separate** — Demucs `htdemucs` extracts the vocal stem (~2–4 min CPU for a 4-min track).
3. **Normalize lyrics** — lowercase, strip punctuation, collapse melisma runs
   ("Oooooohhhhh" → "oh"), tag parentheticals as backing vocals. Every alignable token
   keeps a back-pointer `(lineIndex, wordIndex, displayText)`; display text is never
   mutated.
4. **Align** — torchaudio `forced_align` (MMS_FA bundle) on the 16 kHz mono vocal stem;
   token spans merged back to words with per-word CTC confidence.
5. **Emit** — alignment JSON + console summary (mean confidence, flagged-word count).

Flags:
- `--review` writes a self-contained HTML page (audio element + live word highlight) to
  eyeball sync before committing the JSON.
- `--selftest` runs the tokenizer round-trip on the Petrichor lyrics (melisma,
  parentheticals, apostrophes: "cause'", "will o wisp") without needing models.

Words the aligner cannot place confidently (below threshold or zero-length span) are
interpolated between neighbours and marked `"interpolated": true` — never silently
fabricated (VAELRIX honesty law).

Error handling: fail loudly with actionable messages (missing ffmpeg, model download
failure, OOM). A line that fails alignment entirely emits null times plus a warning; the
script still exits non-zero so the failure is not committed unnoticed.

## Component 2 — Timing artifact

`public/data/alignment/<trackId>.alignment-v1.json` (mirrors the existing
`public/data/resonance/*.resonance.json` static-asset pattern):

```json
{
  "version": "alignment-v1",
  "trackId": "149036d5-397c-4b59-a150-f4f6403c4758",
  "source": { "aligner": "torchaudio-mms_fa", "separator": "htdemucs", "generatedAt": "…" },
  "lines": [ { "index": 0, "startS": 9.32, "endS": 12.81 } ],
  "words": [
    { "line": 0, "word": 0, "text": "I", "startS": 9.32, "endS": 9.41,
      "confidence": 0.93, "interpolated": false }
  ]
}
```

`words[].text` is the display token from the canonical lyrics, not the normalized form.
Line spans are derived: start of first word → end of last word in the line.

## Component 3 — Frontend integration

- New hook in `src/kits/scholomance-visualizer-kit/`: `useLyricAlignment(trackId)` —
  fetches the JSON, validates `version === "alignment-v1"`, returns `{ lines, words }` or
  `null`.
- `BytecodeVisualiserPage`: when alignment data exists, the heuristic beat-grid in
  `lyricLineAt` is bypassed by a binary search over real line spans; the active word index
  is derived from `progress` the same way. The Truesight overlay marks the active word
  with `data-sung`; the karaoke highlight is a CSS brightness/glow lift only — school
  colours are untouched (colour hygiene preserved).
- Sync provenance becomes explicit in the meta panel: "Sync — forced-aligned (MMS)" when
  alignment data drives the display, vs "estimated" for the heuristic.
- **Fallback is exactly today's behaviour.** No alignment file, fetch failure, or schema
  mismatch → the BPM/syllable heuristic runs unchanged (silent degrade, `console.info`).

## Testing

- Vitest units (frontend): line/word binary-search lookup boundaries (lead-in, between
  lines, outro), schema validation, heuristic fallback when fetch fails or version
  mismatches.
- Python `--selftest`: tokenizer round-trip on Petrichor lyrics.
- End-to-end verification: run the pipeline on Petrichor, open the `--review` page,
  spot-check five hard cases — first sung word, a chorus line, a melisma "Oooooohhhhh",
  a parenthetical backing vocal, the final word.

## Honest accuracy expectation

On separated vocals, clean verse words typically land within a few tens of milliseconds.
Harmonised or heavily melismatic passages will drift; per-word confidence flags surface
exactly those spots. This is dramatically better than the syllable-rate estimate, not
literally "perfect" — the review page is the acceptance gate.
