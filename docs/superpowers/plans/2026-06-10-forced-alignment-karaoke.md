# Forced-Alignment Karaoke Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the heuristic lyric pacing in the Bytecode Visualiser with ground-truth word-level timestamps produced by an offline ML forced-alignment pipeline, with the heuristic kept as fallback.

**Architecture:** An offline Python CLI (`scripts/align_lyrics.py`) runs Demucs vocal separation then torchaudio MMS_FA CTC forced alignment of the canonical lyrics, emitting a static `alignment-v1` JSON into `public/data/alignment/`. The frontend gains a pure lookup module + fetch hook in the visualizer kit; `BytecodeVisualiserPage` uses real line/word spans when the artifact exists and falls back to the existing BPM/syllable estimate when it doesn't.

**Tech Stack:** Python 3.13 (venv: torch CPU, torchaudio, demucs), ffmpeg, TypeScript/React, vitest.

**Spec:** `docs/superpowers/specs/2026-06-10-forced-alignment-karaoke-design.md`

---

## File map

| File | Action | Responsibility |
|---|---|---|
| `src/kits/scholomance-visualizer-kit/utils/lyricAlignment.ts` | Create | Types, `parseAlignment` validation, `lineAtTime`/`wordAtTime` binary search (pure, testable) |
| `src/kits/scholomance-visualizer-kit/hooks/useLyricAlignment.ts` | Create | Fetch + validate the artifact; `null` on any failure |
| `src/kits/scholomance-visualizer-kit/index.ts` | Modify (append) | Export the new public API |
| `tests/core/lyricAlignment.test.js` | Create | Unit tests for parse + lookups |
| `tests/components/useLyricAlignment.test.jsx` | Create | Hook tests with stubbed fetch |
| `src/pages/Visualiser/BytecodeVisualiserPage.tsx` | Modify | Alignment-driven active line/word, `data-sung`, sync provenance row, ~8 Hz progress ticker |
| `src/pages/Visualiser/BytecodeVisualiser.css` | Modify (append) | Karaoke luminance lift |
| `scripts/align_lyrics.py` | Create | Offline pipeline CLI |
| `scripts/align_lyrics_requirements.txt` | Create | Pinned pipeline deps (CPU wheels) |
| `scripts/petrichor.lyrics.txt` | Create (generated) | Canonical lyric lines, one per line |
| `public/data/alignment/149036d5-….alignment-v1.json` | Create (generated) | Petrichor timing artifact |
| `.gitignore` | Modify (append) | Ignore `.venv-align/`, `tmp/` audio |

---

### Task 1: Alignment lookup module (pure functions)

**Files:**
- Create: `src/kits/scholomance-visualizer-kit/utils/lyricAlignment.ts`
- Test: `tests/core/lyricAlignment.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/core/lyricAlignment.test.js`:

```js
import { describe, expect, it } from 'vitest';
import {
  parseAlignment,
  lineAtTime,
  wordAtTime,
} from '../../src/kits/scholomance-visualizer-kit/utils/lyricAlignment';

const FIXTURE = {
  version: 'alignment-v1',
  trackId: 't1',
  source: { aligner: 'torchaudio-mms_fa', separator: 'htdemucs', generatedAt: '2026-06-10T00:00:00Z' },
  lines: [
    { index: 0, startS: 9.3, endS: 12.8 },
    { index: 1, startS: 13.1, endS: 16.0 },
  ],
  words: [
    { line: 0, word: 0, text: 'I', startS: 9.3, endS: 9.4, confidence: 0.9, interpolated: false },
    { line: 0, word: 1, text: "don't", startS: 9.45, endS: 9.8, confidence: 0.8, interpolated: false },
    { line: 1, word: 0, text: 'care', startS: 13.1, endS: 13.6, confidence: 0.95, interpolated: false },
  ],
};

describe('parseAlignment', () => {
  it('accepts a valid artifact', () => {
    expect(parseAlignment(FIXTURE)).not.toBeNull();
  });

  it.each([
    ['non-object', 'nope'],
    ['null', null],
    ['wrong version', { ...FIXTURE, version: 'alignment-v2' }],
    ['missing trackId', { ...FIXTURE, trackId: undefined }],
    ['empty lines', { ...FIXTURE, lines: [] }],
    ['empty words', { ...FIXTURE, words: [] }],
    ['null line time (failed line)', { ...FIXTURE, lines: [{ index: 0, startS: null, endS: null }, ...FIXTURE.lines.slice(1)] }],
    ['non-finite word time', { ...FIXTURE, words: [{ ...FIXTURE.words[0], startS: Infinity }, ...FIXTURE.words.slice(1)] }],
    ['unsorted words', { ...FIXTURE, words: [FIXTURE.words[2], FIXTURE.words[0], FIXTURE.words[1]] }],
    ['unsorted lines', { ...FIXTURE, lines: [FIXTURE.lines[1], FIXTURE.lines[0]] }],
  ])('rejects %s', (_name, bad) => {
    expect(parseAlignment(bad)).toBeNull();
  });
});

describe('lineAtTime', () => {
  const lines = FIXTURE.lines;
  it('is -1 before the first line starts', () => expect(lineAtTime(lines, 0)).toBe(-1));
  it('activates at exactly startS', () => expect(lineAtTime(lines, 9.3)).toBe(0));
  it('holds the line through the gap to the next line', () => expect(lineAtTime(lines, 12.95)).toBe(0));
  it('advances at the next startS', () => expect(lineAtTime(lines, 13.1)).toBe(1));
  it('holds the last line after its end', () => expect(lineAtTime(lines, 200)).toBe(1));
});

describe('wordAtTime', () => {
  const words = FIXTURE.words;
  it('is -1 before the first word', () => expect(wordAtTime(words, 1)).toBe(-1));
  it('returns the word containing t', () => expect(wordAtTime(words, 9.5)).toBe(1));
  it('activates at exactly startS', () => expect(wordAtTime(words, 9.45)).toBe(1));
  it('is -1 in the gap between words', () => expect(wordAtTime(words, 9.42)).toBe(-1));
  it('is -1 after the last word ends', () => expect(wordAtTime(words, 14)).toBe(-1));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/core/lyricAlignment.test.js`
Expected: FAIL — cannot resolve `../../src/kits/scholomance-visualizer-kit/utils/lyricAlignment`.

- [ ] **Step 3: Implement the module**

Create `src/kits/scholomance-visualizer-kit/utils/lyricAlignment.ts`:

```ts
/** alignment-v1 — static forced-alignment timing artifact.
    Produced offline by scripts/align_lyrics.py; consumed read-only here. */

export interface AlignmentWord {
  line: number;       // lyric line index in the canonical lyrics array
  word: number;       // word index within the line (tokens containing a letter)
  text: string;       // display token, never the normalized form
  startS: number;
  endS: number;
  confidence: number; // mean CTC posterior over the word's tokens
  interpolated?: boolean;
  backing?: boolean;  // parenthetical backing vocal
}

export interface AlignmentLine {
  index: number;
  startS: number;
  endS: number;
}

export interface LyricAlignment {
  version: 'alignment-v1';
  trackId: string;
  source: { aligner: string; separator: string | null; generatedAt: string };
  lines: AlignmentLine[];
  words: AlignmentWord[];
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Strict gate: any malformed artifact returns null and the caller falls back
    to the heuristic estimate. Monotonic startS is required by the binary
    searches below. */
export function parseAlignment(data: unknown): LyricAlignment | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (d.version !== 'alignment-v1' || typeof d.trackId !== 'string') return null;
  const { lines, words } = d as { lines?: unknown; words?: unknown };
  if (!Array.isArray(lines) || lines.length === 0) return null;
  if (!Array.isArray(words) || words.length === 0) return null;
  let prev = -Infinity;
  for (const l of lines) {
    if (!l || !Number.isInteger((l as AlignmentLine).index)) return null;
    if (!finite((l as AlignmentLine).startS) || !finite((l as AlignmentLine).endS)) return null;
    if ((l as AlignmentLine).startS < prev) return null;
    prev = (l as AlignmentLine).startS;
  }
  prev = -Infinity;
  for (const w of words) {
    const x = w as AlignmentWord;
    if (!x || typeof x.text !== 'string') return null;
    if (!Number.isInteger(x.line) || !Number.isInteger(x.word)) return null;
    if (!finite(x.startS) || !finite(x.endS)) return null;
    if (x.startS < prev) return null;
    prev = x.startS;
  }
  return data as LyricAlignment;
}

/** Index of the last entry with startS <= t, or -1. */
function lastStarted(arr: ReadonlyArray<{ startS: number }>, t: number): number {
  let lo = 0;
  let hi = arr.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid].startS <= t) { ans = mid; lo = mid + 1; } else { hi = mid - 1; }
  }
  return ans;
}

/** Active line position in `lines` (-1 before the first). Lines hold through
    instrumental gaps until the next line starts — matches reader behaviour. */
export function lineAtTime(lines: ReadonlyArray<AlignmentLine>, t: number): number {
  return lastStarted(lines, t);
}

/** Active word index in `words`, or -1 outside any word's [startS, endS).
    Words do NOT hold through gaps — the highlight goes dark between phrases. */
export function wordAtTime(words: ReadonlyArray<AlignmentWord>, t: number): number {
  const i = lastStarted(words, t);
  if (i < 0) return -1;
  return t < words[i].endS ? i : -1;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/core/lyricAlignment.test.js`
Expected: PASS (all ~20 cases).

- [ ] **Step 5: Commit**

```bash
git add src/kits/scholomance-visualizer-kit/utils/lyricAlignment.ts tests/core/lyricAlignment.test.js
git commit -m "feat(visualizer-kit): alignment-v1 parse + time lookup module"
```

---

### Task 2: `useLyricAlignment` hook

**Files:**
- Create: `src/kits/scholomance-visualizer-kit/hooks/useLyricAlignment.ts`
- Modify: `src/kits/scholomance-visualizer-kit/index.ts` (append exports)
- Test: `tests/components/useLyricAlignment.test.jsx`

- [ ] **Step 1: Write the failing tests**

Create `tests/components/useLyricAlignment.test.jsx`:

```jsx
// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLyricAlignment } from '../../src/kits/scholomance-visualizer-kit/hooks/useLyricAlignment';

const VALID = {
  version: 'alignment-v1',
  trackId: 't1',
  source: { aligner: 'torchaudio-mms_fa', separator: 'htdemucs', generatedAt: '2026-06-10T00:00:00Z' },
  lines: [{ index: 0, startS: 9.3, endS: 12.8 }],
  words: [{ line: 0, word: 0, text: 'I', startS: 9.3, endS: 9.4, confidence: 0.9, interpolated: false }],
};

const flush = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => vi.unstubAllGlobals());

describe('useLyricAlignment', () => {
  it('returns the parsed alignment when the artifact loads', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => VALID }));
    const { result } = renderHook(() => useLyricAlignment('t1'));
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current.words).toHaveLength(1);
    expect(fetch).toHaveBeenCalledWith('/data/alignment/t1.alignment-v1.json');
  });

  it('stays null on HTTP failure (no artifact -> heuristic fallback)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }));
    const { result } = renderHook(() => useLyricAlignment('t1'));
    await flush();
    expect(result.current).toBeNull();
  });

  it('stays null on schema mismatch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ version: 'alignment-v2' }) }));
    const { result } = renderHook(() => useLyricAlignment('t1'));
    await flush();
    expect(result.current).toBeNull();
  });

  it('stays null when the artifact is for a different track', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...VALID, trackId: 'other' }) }));
    const { result } = renderHook(() => useLyricAlignment('t1'));
    await flush();
    expect(result.current).toBeNull();
  });

  it('stays null on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    const { result } = renderHook(() => useLyricAlignment('t1'));
    await flush();
    expect(result.current).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/components/useLyricAlignment.test.jsx`
Expected: FAIL — cannot resolve the hook module.

- [ ] **Step 3: Implement the hook**

Create `src/kits/scholomance-visualizer-kit/hooks/useLyricAlignment.ts`:

```ts
import { useEffect, useState } from 'react';
import { parseAlignment, type LyricAlignment } from '../utils/lyricAlignment';

/** Loads the static alignment-v1 artifact for a track. Returns null until it
    loads — and stays null on any failure, which is the signal to keep the
    heuristic sync (exactly the pre-alignment behaviour). */
export function useLyricAlignment(trackId: string): LyricAlignment | null {
  const [alignment, setAlignment] = useState<LyricAlignment | null>(null);

  useEffect(() => {
    let cancelled = false;
    setAlignment(null);
    const url = `${import.meta.env.BASE_URL}data/alignment/${trackId}.alignment-v1.json`;
    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const parsed = parseAlignment(await res.json());
        if (!parsed || parsed.trackId !== trackId) throw new Error('schema mismatch');
        if (!cancelled) setAlignment(parsed);
      } catch {
        if (!cancelled) console.info(`[lyricAlignment] no artifact for ${trackId} — estimated sync`);
      }
    })();
    return () => { cancelled = true; };
  }, [trackId]);

  return alignment;
}
```

- [ ] **Step 4: Append kit exports**

Append to `src/kits/scholomance-visualizer-kit/index.ts`:

```ts
export { useLyricAlignment } from './hooks/useLyricAlignment';
export { parseAlignment, lineAtTime, wordAtTime } from './utils/lyricAlignment';
export type { LyricAlignment, AlignmentLine, AlignmentWord } from './utils/lyricAlignment';
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/components/useLyricAlignment.test.jsx tests/core/lyricAlignment.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/kits/scholomance-visualizer-kit/hooks/useLyricAlignment.ts src/kits/scholomance-visualizer-kit/index.ts tests/components/useLyricAlignment.test.jsx
git commit -m "feat(visualizer-kit): useLyricAlignment artifact loader hook"
```

---

### Task 3: Page integration + karaoke CSS

**Files:**
- Modify: `src/pages/Visualiser/BytecodeVisualiserPage.tsx`
- Modify: `src/pages/Visualiser/BytecodeVisualiser.css` (append)

All edits below are exact string replacements against the current file.

- [ ] **Step 1: Add imports**

In `BytecodeVisualiserPage.tsx`, replace:

```ts
import { alignPhonemes } from '../../lib/phonology/phonemeAlignment.js';
import './BytecodeVisualiser.css';
```

with:

```ts
import { alignPhonemes } from '../../lib/phonology/phonemeAlignment.js';
import { useLyricAlignment } from '../../kits/scholomance-visualizer-kit/hooks/useLyricAlignment';
import { lineAtTime, wordAtTime } from '../../kits/scholomance-visualizer-kit/utils/lyricAlignment';
import './BytecodeVisualiser.css';
```

- [ ] **Step 2: Load the artifact and add the karaoke progress ticker**

Inside the component, directly after the fallback-simulator effect (the block ending `}, [playing, repeat, audioOk, duration]);`), insert:

```ts
  // Ground-truth karaoke sync: static forced-alignment artifact, when one
  // exists for this track. Null -> every consumer below keeps the heuristic.
  const alignment = useLyricAlignment(TRACK.id);

  // timeupdate fires ~4 Hz — too coarse for word-level highlight (words run
  // ~0.2-0.5 s). While playing with alignment data, refine at ~8 Hz; the
  // mandala survives this re-render rate by design (stable readFFT identity).
  useEffect(() => {
    if (!playing || !audioOk || !alignment) return;
    const id = window.setInterval(() => {
      const el = audioRef.current;
      if (el) setProgress(el.currentTime);
    }, 120);
    return () => window.clearInterval(id);
  }, [playing, audioOk, alignment]);
```

- [ ] **Step 3: Switch active line/word to alignment when present**

Replace:

```ts
  // Beat-sync: active lyric line tracks the playhead via the weighted estimate.
  const activeLine = lyricLineAt(progress, duration, lineBeats);
```

with:

```ts
  // Beat-sync: forced-aligned line spans when the artifact exists; the
  // syllable-rate estimate is the unchanged fallback path.
  const alignedPos = alignment ? lineAtTime(alignment.lines, progress) : -1;
  const activeLine = alignment
    ? (alignedPos < 0 ? -1 : alignment.lines[alignedPos].index)
    : lyricLineAt(progress, duration, lineBeats);
  const sungIdx = alignment ? wordAtTime(alignment.words, progress) : -1;
  const sungWord = alignment && sungIdx >= 0 ? alignment.words[sungIdx] : null;
```

- [ ] **Step 4: Per-word `data-sung` in the lyric render**

Replace:

```tsx
                <span className="bcv-lyric-text">
                  {coloredLyrics
                    ? coloredLyrics[i].map((tok, j) =>
                        tok.color
                          ? <span key={j} className="bcv-tsword" style={{ '--w': tok.color } as CSSProperties}>{tok.word}</span>
                          : <span key={j}>{tok.word}</span>,
                      )
                    : line}
                </span>
```

with:

```tsx
                <span className="bcv-lyric-text">
                  {coloredLyrics
                    ? (() => {
                        // Word counter mirrors the aligner's tokenizer: a
                        // token is a word iff it contains a letter.
                        let w = -1;
                        return coloredLyrics[i].map((tok, j) => {
                          const isWord = /[A-Za-z]/.test(tok.word);
                          if (isWord) w += 1;
                          const sung = isWord && sungWord !== null && sungWord.line === i && sungWord.word === w;
                          return (
                            <span
                              key={j}
                              className={tok.color ? 'bcv-tsword' : undefined}
                              style={tok.color ? ({ '--w': tok.color } as CSSProperties) : undefined}
                              data-sung={sung ? 'true' : undefined}
                            >{tok.word}</span>
                          );
                        });
                      })()
                    : line}
                </span>
```

- [ ] **Step 5: Sync provenance row in the meta panel**

Replace:

```tsx
            <dl className="bcv-meta">
              {TRACK.meta.map(([k, v]) => (
                <div className="bcv-meta__row" key={k}><dt>{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
```

with:

```tsx
            <dl className="bcv-meta">
              {TRACK.meta.map(([k, v]) => (
                <div className="bcv-meta__row" key={k}><dt>{k}</dt><dd>{v}</dd></div>
              ))}
              {/* Honesty law: declare whether sync is measured or estimated. */}
              <div className="bcv-meta__row"><dt>Sync</dt><dd>{alignment ? 'forced-aligned · MMS' : 'estimated'}</dd></div>
            </dl>
```

- [ ] **Step 6: Karaoke CSS**

Append to `src/pages/Visualiser/BytecodeVisualiser.css`:

```css
/* ── Karaoke (forced alignment) ────────────────────────────────────────────
   The word being sung gets a luminance lift only — hue stays the school's.
   Colour marks meaning, brightness marks time (colour hygiene). */
.bcv-lyrics .bcv-lyric-text span[data-sung='true'] {
  filter: brightness(1.45);
  text-shadow: 0 0 14px currentColor;
}
```

- [ ] **Step 7: Regression checks**

Run: `npm run test:qa:stasis`
Expected: PASS (page still renders; no artifact exists yet so the heuristic path is exercised).

Run: `npx vitest run tests/core/lyricAlignment.test.js tests/components/useLyricAlignment.test.jsx`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/pages/Visualiser/BytecodeVisualiserPage.tsx src/pages/Visualiser/BytecodeVisualiser.css
git commit -m "feat(visualiser): word-level karaoke sync from alignment artifact, heuristic fallback"
```

---

### Task 4: Pipeline script with selftest (stdlib-only path first)

**Files:**
- Create: `scripts/align_lyrics.py`
- Create: `scripts/align_lyrics_requirements.txt`
- Modify: `.gitignore` (append)

The selftest exercises tokenization/normalization with no ML deps, so it runs under system `python3` before the venv exists. ML imports stay inside functions.

- [ ] **Step 1: Create the requirements file**

Create `scripts/align_lyrics_requirements.txt`:

```
--extra-index-url https://download.pytorch.org/whl/cpu
torch>=2.6
torchaudio>=2.6
demucs>=4.0.1
soundfile>=0.12
```

- [ ] **Step 2: Write the full pipeline script**

Create `scripts/align_lyrics.py`:

```python
#!/usr/bin/env python3
"""Forced-alignment lyric timing pipeline (alignment-v1).

ffmpeg decode -> Demucs htdemucs vocal separation -> torchaudio MMS_FA CTC
forced alignment of the canonical lyrics -> static JSON artifact consumed by
the visualiser frontend.

Usage:
  python scripts/align_lyrics.py --audio <file|url> --lyrics lyrics.txt \
      --track-id <id> [--out public/data/alignment] [--review] [--no-separate]
  python scripts/align_lyrics.py --selftest

The selftest needs no ML dependencies. The align run needs the venv from
scripts/align_lyrics_requirements.txt (torch CPU + torchaudio + demucs).
Exit code is non-zero if any lyric line failed alignment entirely, so a bad
artifact is never committed unnoticed.
"""

import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

CONFIDENCE_FLOOR = 0.40  # below this, a word's span is replaced by interpolation


# ── Lyric tokenization ──────────────────────────────────────────────────────

def tokenize_lines(lines):
    """Display words with (line, word) indices. A token is a word iff it
    contains a letter — this rule is mirrored exactly by the frontend's
    /[A-Za-z]/ counter, so indices line up. Parenthetical runs are tagged
    backing vocals."""
    out = []
    for li, line in enumerate(lines):
        wi = 0
        depth = 0
        for tok in line.split():
            if not re.search(r"[A-Za-z]", tok):
                continue
            backing = depth > 0 or tok.startswith("(")
            depth = max(0, depth + tok.count("(") - tok.count(")"))
            out.append({"line": li, "word": wi, "display": tok, "backing": backing})
            wi += 1
    return out


def normalize_word(display):
    """Display token -> alignable lowercase form. Melisma letter-runs collapse
    ("Oooooohhhhh" -> "oh"); only letters and apostrophes survive."""
    w = display.lower()
    w = re.sub(r"([a-z])\1{2,}", r"\1", w)
    w = re.sub(r"[^a-z']", "", w)
    return w.strip("'")


# ── Audio stages (ffmpeg / demucs subprocesses) ─────────────────────────────

def run(cmd):
    print("  $", " ".join(map(str, cmd)))
    res = subprocess.run(cmd)
    if res.returncode != 0:
        sys.exit(f"command failed ({res.returncode}): {cmd[0]}")


def decode(audio, wav_out):
    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg not found on PATH")
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", audio,
         "-ac", "2", "-ar", "44100", str(wav_out)])


def separate_vocals(wav_in, workdir):
    """Demucs htdemucs two-stem split; returns the vocal stem path."""
    run([sys.executable, "-m", "demucs.separate", "-n", "htdemucs",
         "--two-stems", "vocals", "-o", str(workdir), str(wav_in)])
    stem = workdir / "htdemucs" / wav_in.stem / "vocals.wav"
    if not stem.exists():
        sys.exit(f"demucs did not produce {stem}")
    return stem


def to_16k_mono(wav_in, wav_out):
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav_in),
         "-ac", "1", "-ar", "16000", str(wav_out)])


# ── Forced alignment (torchaudio MMS_FA) ────────────────────────────────────

def align(vocals16k, words):
    """Returns {word_list_index: (startS, endS, score)} for every word the
    aligner placed. Confidence is the duration-weighted mean token posterior."""
    import torch
    import torchaudio
    from torchaudio.pipelines import MMS_FA as bundle

    waveform, sr = torchaudio.load(str(vocals16k))
    if sr != bundle.sample_rate:
        sys.exit(f"expected {bundle.sample_rate} Hz input, got {sr}")

    model = bundle.get_model(with_star=False)
    tokenizer = bundle.get_tokenizer()
    aligner = bundle.get_aligner()

    norms = [normalize_word(w["display"]) for w in words]
    keep = [i for i, n in enumerate(norms) if n]
    transcript = [norms[i] for i in keep]

    with torch.inference_mode():
        emission, _ = model(waveform)
        token_spans = aligner(emission[0], tokenizer(transcript))

    seconds_per_frame = waveform.size(1) / emission.size(1) / bundle.sample_rate
    aligned = {}
    for idx, spans in zip(keep, token_spans):
        start = spans[0].start * seconds_per_frame
        end = spans[-1].end * seconds_per_frame
        dur = sum(s.end - s.start for s in spans)
        score = sum(s.score * (s.end - s.start) for s in spans) / max(1, dur)
        aligned[idx] = (start, end, score)
    return aligned


# ── Artifact assembly ───────────────────────────────────────────────────────

def build_words(words, aligned):
    entries = []
    for i, w in enumerate(words):
        a = aligned.get(i)
        ok = a is not None and a[2] >= CONFIDENCE_FLOOR and a[1] > a[0]
        entry = {
            "line": w["line"], "word": w["word"], "text": w["display"],
            "startS": round(a[0], 3) if a else None,
            "endS": round(a[1], 3) if a else None,
            "confidence": round(a[2], 3) if a else 0.0,
            "interpolated": not ok,
        }
        if w["backing"]:
            entry["backing"] = True
        entries.append(entry)

    # Unreliable words get spans interpolated between confident neighbours —
    # flagged, never silently trusted (honesty law).
    n = len(entries)
    for i, e in enumerate(entries):
        if not e["interpolated"]:
            continue
        j = i - 1
        while j >= 0 and entries[j]["interpolated"]:
            j -= 1
        k = i + 1
        while k < n and entries[k]["interpolated"]:
            k += 1
        lo = entries[j]["endS"] if j >= 0 else 0.0
        hi = entries[k]["startS"] if k < n else None
        if hi is None or lo is None or hi < lo:
            continue  # no anchors -> stays null; caught by build_lines
        slots = k - j
        pos = i - j
        e["startS"] = round(lo + (hi - lo) * (pos - 1) / slots, 3)
        e["endS"] = round(lo + (hi - lo) * pos / slots, 3)
    return entries


def build_lines(num_lines, word_entries):
    lines, failed = [], []
    for li in range(num_lines):
        ws = [w for w in word_entries if w["line"] == li and w["startS"] is not None]
        if ws:
            lines.append({"index": li, "startS": ws[0]["startS"], "endS": ws[-1]["endS"]})
        else:
            lines.append({"index": li, "startS": None, "endS": None})
            failed.append(li)
    return lines, failed


# ── Review page ─────────────────────────────────────────────────────────────

def write_review(path, audio_src, lines, entries):
    by_line = {}
    for i, e in enumerate(entries):
        by_line.setdefault(e["line"], []).append((i, e))
    body = []
    for li, text in enumerate(lines):
        spans = "".join(
            f'<span data-i="{i}"{" class=flag" if e["interpolated"] else ""}>{e["text"]}</span> '
            for i, e in by_line.get(li, [])
        )
        body.append(f"<p>{spans or text}</p>")
    html = f"""<!doctype html><meta charset="utf-8"><title>alignment review</title>
<style>
 body{{background:#111;color:#aaa;font:16px/1.7 serif;max-width:48rem;margin:2rem auto}}
 audio{{width:100%;position:sticky;top:0}}
 span.on{{color:#fff;text-shadow:0 0 10px #fff}}
 span.flag{{border-bottom:1px dotted #c66}}
</style>
<audio controls src="{audio_src}"></audio>
{''.join(body)}
<script>
const W = {json.dumps([{"s": e["startS"], "e": e["endS"]} for e in entries])};
const a = document.querySelector('audio');
a.ontimeupdate = () => {{
  const t = a.currentTime;
  document.querySelectorAll('span[data-i]').forEach(el => {{
    const w = W[+el.dataset.i];
    el.classList.toggle('on', w.s !== null && t >= w.s && t < w.e);
  }});
}};
</script>"""
    path.write_text(html, encoding="utf-8")
    print(f"review page: {path}")


# ── Selftest (stdlib only) ──────────────────────────────────────────────────

def selftest():
    assert normalize_word("Oooooohhhhh)") == "oh"
    assert normalize_word("(Oooooohhhhh)") == "oh"
    assert normalize_word("cause'") == "cause"
    assert normalize_word("I'm") == "i'm"
    assert normalize_word("tree") == "tree"
    assert normalize_word("o") == "o"  # "will o wisp"
    toks = tokenize_lines([
        "whispers underneath the willow tree (Oooooohhhhh)",
        "I love you so much,",
    ])
    assert [t["display"] for t in toks[:5]] == ["whispers", "underneath", "the", "willow", "tree"]
    assert toks[5]["display"] == "(Oooooohhhhh)" and toks[5]["backing"] is True
    assert toks[5]["line"] == 0 and toks[5]["word"] == 5
    assert toks[6] == {"line": 1, "word": 0, "display": "I", "backing": False}
    assert toks[-1]["display"] == "much," and normalize_word("much,") == "much"
    # round-trip: every token maps back to its display form and stable indices
    for t in toks:
        assert re.search(r"[A-Za-z]", t["display"]) and normalize_word(t["display"])
    print("selftest OK")


# ── Main ────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--audio", help="audio file path or URL")
    ap.add_argument("--lyrics", help="text file, one lyric line per line")
    ap.add_argument("--track-id", help="track id used in the artifact filename")
    ap.add_argument("--out", default="public/data/alignment", help="output directory")
    ap.add_argument("--review", action="store_true", help="emit an HTML review page")
    ap.add_argument("--no-separate", action="store_true",
                    help="skip Demucs and align against the full mix (lower accuracy)")
    ap.add_argument("--selftest", action="store_true")
    args = ap.parse_args()

    if args.selftest:
        selftest()
        return
    if not (args.audio and args.lyrics and args.track_id):
        ap.error("--audio, --lyrics and --track-id are required (or use --selftest)")

    lyric_lines = [l for l in Path(args.lyrics).read_text(encoding="utf-8").splitlines()
                   if l.strip()]
    words = tokenize_lines(lyric_lines)
    print(f"{len(lyric_lines)} lines, {len(words)} words")

    with tempfile.TemporaryDirectory(prefix="align_") as td:
        tdp = Path(td)
        full = tdp / "full.wav"
        decode(args.audio, full)
        stem = full if args.no_separate else separate_vocals(full, tdp)
        vocals16k = tdp / "vocals16k.wav"
        to_16k_mono(stem, vocals16k)
        aligned = align(vocals16k, words)

    entries = build_words(words, aligned)
    lines, failed = build_lines(len(lyric_lines), entries)

    payload = {
        "version": "alignment-v1",
        "trackId": args.track_id,
        "source": {
            "aligner": "torchaudio-mms_fa",
            "separator": None if args.no_separate else "htdemucs",
            "generatedAt": datetime.now(timezone.utc).isoformat(),
        },
        "lines": lines,
        "words": entries,
    }
    out = Path(args.out) / f"{args.track_id}.alignment-v1.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"artifact: {out}")

    confident = [e for e in entries if not e["interpolated"]]
    mean_conf = sum(e["confidence"] for e in confident) / max(1, len(confident))
    print(f"words: {len(entries)}  confident: {len(confident)}  "
          f"interpolated: {len(entries) - len(confident)}  mean confidence: {mean_conf:.3f}")

    if args.review:
        write_review(out.with_suffix(".review.html"), args.audio, lyric_lines, entries)

    if failed:
        print(f"WARNING: {len(failed)} line(s) failed alignment entirely: {failed}",
              file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Run the selftest to verify it fails appropriately / passes**

Run: `python3 scripts/align_lyrics.py --selftest`
Expected: `selftest OK` (pure-stdlib; if an assertion fires, fix the tokenizer until it passes — these are the spec's hard cases).

- [ ] **Step 4: Append to `.gitignore`**

```
# forced-alignment pipeline (scripts/align_lyrics.py)
.venv-align/
```

- [ ] **Step 5: Commit**

```bash
git add scripts/align_lyrics.py scripts/align_lyrics_requirements.txt .gitignore
git commit -m "feat(scripts): forced-alignment lyric timing pipeline (alignment-v1)"
```

---

### Task 5: Pipeline environment (venv + model deps)

**Files:** none committed (venv is gitignored). ~2–3 GB download; needs network.

- [ ] **Step 1: Create the venv and install**

```bash
python3 -m venv .venv-align
.venv-align/bin/pip install --upgrade pip
.venv-align/bin/pip install -r scripts/align_lyrics_requirements.txt
```

Expected: clean install. **Known risk:** demucs's dependency chain (e.g. `lameenc`) may lack Python 3.13 wheels. If install fails on a demucs dependency, install the rest (`torch`, `torchaudio`, `soundfile`) and plan to run with `--no-separate`, OR install demucs from git (`pip install git+https://github.com/adefossez/demucs`). Report which path was taken.

- [ ] **Step 2: Verify imports**

Run: `.venv-align/bin/python -c "import torch, torchaudio; from torchaudio.pipelines import MMS_FA; import demucs.separate; print('deps OK', torch.__version__, torchaudio.__version__)"`
Expected: `deps OK <versions>` (drop `import demucs.separate` from the check if the `--no-separate` fallback was taken).

- [ ] **Step 3: Re-run selftest inside the venv**

Run: `.venv-align/bin/python scripts/align_lyrics.py --selftest`
Expected: `selftest OK`.

---

### Task 6: Align Petrichor and ship the artifact

**Files:**
- Create: `scripts/petrichor.lyrics.txt` (generated from the TSX source of truth)
- Create: `public/data/alignment/149036d5-397c-4b59-a150-f4f6403c4758.alignment-v1.json`

- [ ] **Step 1: Extract the canonical lyrics from the page source**

```bash
node -e "
const fs = require('fs');
const src = fs.readFileSync('src/pages/Visualiser/BytecodeVisualiserPage.tsx', 'utf8');
const m = src.match(/lyrics: (\[[\s\S]*?\n  \])/);
if (!m) throw new Error('lyrics array not found');
const arr = eval(m[1]);
fs.writeFileSync('scripts/petrichor.lyrics.txt', arr.join('\n') + '\n');
console.log(arr.length + ' lines extracted');
"
```

Expected: `~89 lines extracted` (the TRACK.lyrics array length). Sanity-check first/last lines match the TSX (`I don't care about scar tissues` / `I'm sorry.`).

- [ ] **Step 2: Download the track audio**

```bash
mkdir -p tmp
curl -L -o tmp/petrichor.mp3 https://cdn1.suno.ai/149036d5-397c-4b59-a150-f4f6403c4758.mp3
```

Expected: ~4–8 MB MP3. Verify: `ffprobe -v error -show_entries format=duration tmp/petrichor.mp3` reports ≈241 s.

- [ ] **Step 3: Run the pipeline**

```bash
.venv-align/bin/python scripts/align_lyrics.py \
  --audio tmp/petrichor.mp3 \
  --lyrics scripts/petrichor.lyrics.txt \
  --track-id 149036d5-397c-4b59-a150-f4f6403c4758 \
  --review
```

Expected: several minutes (Demucs on CPU dominates; first run also downloads the htdemucs + MMS_FA weights). Output ends with the artifact path, word/confidence summary, review page path, **exit code 0**. If it exits 1 with failed lines, inspect those lyric lines, fix normalization, re-run — do not commit a failing artifact.

- [ ] **Step 4: Spot-check the review page (acceptance gate)**

Open `public/data/alignment/149036d5-397c-4b59-a150-f4f6403c4758.review.html` in a browser, play, and verify the five hard cases from the spec: first sung word, a chorus line, a melisma "(Oooooohhhhh)", a parenthetical backing vocal, the final word ("sorry."). Dotted-underline words are interpolated — confirm they're rare and plausible. **This step is a human gate: pause and ask the user to confirm the sync quality before committing.**

- [ ] **Step 5: Verify the artifact parses on the frontend side**

```bash
node -e "
const a = require('./public/data/alignment/149036d5-397c-4b59-a150-f4f6403c4758.alignment-v1.json');
if (a.version !== 'alignment-v1') throw new Error('version');
if (!a.lines.every(l => Number.isFinite(l.startS))) throw new Error('null line times');
let prev = -1;
for (const w of a.words) { if (w.startS < prev) throw new Error('unsorted'); prev = w.startS; }
console.log('artifact OK:', a.lines.length, 'lines,', a.words.length, 'words');
"
```

Expected: `artifact OK: ~89 lines, ~600 words`.

- [ ] **Step 6: Commit (artifact + lyrics input; NOT the review page or tmp audio)**

```bash
git add scripts/petrichor.lyrics.txt public/data/alignment/149036d5-397c-4b59-a150-f4f6403c4758.alignment-v1.json
git commit -m "feat(visualiser): Petrichor forced-alignment timing artifact (alignment-v1)"
```

---

### Task 7: End-to-end verification

- [ ] **Step 1: Full targeted test sweep**

Run: `npx vitest run tests/core/lyricAlignment.test.js tests/components/useLyricAlignment.test.jsx && npm run test:qa:stasis`
Expected: all PASS.

- [ ] **Step 2: Live check in the app**

Run the dev server (`npm run dev`), open the Bytecode Visualiser route, confirm:
- Meta panel shows `Sync — forced-aligned · MMS`.
- Active line tracks the vocal (no drift at the chorus, line 62+).
- The sung word carries the brightness/glow lift; gaps between phrases go dark.
- DevTools offline (or rename the artifact): page falls back to heuristic sync, meta shows `estimated`, console says `[lyricAlignment] no artifact … — estimated sync`.

- [ ] **Step 3: Final commit if any fixups were needed**

```bash
git status   # should be clean apart from tmp/ and review html
```

---

## Self-review notes

- **Spec coverage:** pipeline stages (Task 4), venv (Task 5), artifact schema (Tasks 1/4), review page + `--selftest` + `--no-separate` honesty fallbacks (Task 4), hook + validation + fallback (Task 2), page integration + `data-sung` + provenance row + CSS (Task 3), Petrichor run + five-case spot-check (Task 6), vitest units + e2e (Tasks 1, 2, 7). Failed-line → null + non-zero exit (Task 4, `build_lines`/`main`); frontend rejects null line times (Task 1 `parseAlignment` test).
- **Type consistency:** `AlignmentWord.{line,word,text,startS,endS,confidence,interpolated,backing}` matches the Python emitter's keys; `lineAtTime` returns an array position and the page maps through `.index`; the word counter rule (`/[A-Za-z]/`) is identical in `tokenize_lines` and the JSX renderer.
- **Known risks (declared, not hidden):** demucs on Python 3.13 may need the git install or `--no-separate`; 4-minute wav2vec2 inference on CPU is memory-heavy (~few GB) — if OOM, fail loudly per script design.
