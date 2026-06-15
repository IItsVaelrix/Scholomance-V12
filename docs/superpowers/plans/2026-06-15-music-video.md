# Music Video — Kinetic Typography Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render a 1920×1080 MP4 kinetic typography music video from a `GrimoireTrack`, with each word colored by its phoneme school, animated by ScholoTime, and directed by BPM.

**Architecture:** Remotion composition (`src/video/`) receives a `GrimoireTrack` with word-level timestamps from a `.align.json` sidecar. `useBeatClock` resolves the BPM director state per frame via ScholoTime. `KineticWord` renders each word with school-colored, eased entrance animations. `PixelBrainStage` crossfades background atmosphere based on the dominant school of the last four active words.

**Tech Stack:** Remotion v4, `@remotion/cli`, `@remotion/renderer`, `@remotion/bundler`, Vitest, TypeScript, ScholoTime (`codex/core/scholotime/scholotime.math.js`), schools (`codex/core/constants/schools.js`)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/video/types.ts` | Create | `WordTiming` interface + `validateWordTiming` + `validateAlignSidecar` |
| `src/video/__tests__/types.test.ts` | Create | Validator unit tests |
| `src/pages/Visualiser/tracks/types.ts` | Modify | Add `wordTimings?: WordTiming[]` to `GrimoireTrack` |
| `src/pages/Visualiser/tracks/petrichor.align.json` | Create | Hand-mocked word timings for Petrichor |
| `src/video/useBeatClock.ts` | Create | Remotion hook: `currentFrame` → beat state via ScholoTime |
| `src/video/__tests__/useBeatClock.test.ts` | Create | Golden tests for ScholoTime timing functions |
| `src/video/KineticWord.tsx` | Create | Per-word renderer — eased entrance, school color, glyph ghost |
| `src/video/__tests__/KineticWord.test.tsx` | Create | Word rendering tests |
| `src/video/PixelBrainStage.tsx` | Create | Background atmosphere layer driven by dominant school |
| `src/video/KineticLyricsVideo.tsx` | Create | Root Remotion composition |
| `src/video/Root.tsx` | Create | Remotion `registerRoot` entry |
| `remotion.config.ts` | Create | Remotion CLI configuration |
| `scripts/render-music-video.mjs` | Create | CLI: bundle + render → `output/videos/<id>.mp4` |
| `scripts/align-track.mjs` | Create | WhisperX forced alignment pipeline (last task) |

---

## Task 1: WordTiming Schema and Validator

**Files:**
- Create: `src/video/types.ts`
- Create: `src/video/__tests__/types.test.ts`

- [ ] **Step 1.1: Write the failing tests**

```ts
// src/video/__tests__/types.test.ts
import { validateWordTiming, validateAlignSidecar } from '../types';

const validTiming = {
  word: 'care',
  startMs: 9450,
  endMs: 9750,
  beat: { index: 0, phase: 0.922, bar: 0, barPhase: 0.230 },
  school: 'WILL',
};

describe('validateWordTiming', () => {
  it('accepts a valid WordTiming', () => {
    expect(validateWordTiming(validTiming)).toBe(true);
  });

  it('rejects null', () => {
    expect(validateWordTiming(null)).toBe(false);
  });

  it('rejects missing beat.bar', () => {
    expect(validateWordTiming({
      ...validTiming,
      beat: { index: 0, phase: 0 },
    })).toBe(false);
  });

  it('rejects missing school', () => {
    const { school: _, ...noSchool } = validTiming;
    expect(validateWordTiming(noSchool)).toBe(false);
  });

  it('rejects non-number startMs', () => {
    expect(validateWordTiming({ ...validTiming, startMs: '9450' })).toBe(false);
  });
});

describe('validateAlignSidecar', () => {
  it('accepts valid sidecar', () => {
    expect(validateAlignSidecar({ wordTimings: [validTiming] })).toBe(true);
  });

  it('rejects empty object', () => {
    expect(validateAlignSidecar({})).toBe(false);
  });

  it('rejects sidecar where one entry is invalid', () => {
    expect(validateAlignSidecar({
      wordTimings: [validTiming, { word: 'bad' }],
    })).toBe(false);
  });
});
```

- [ ] **Step 1.2: Run tests to verify they fail**

```bash
npx vitest run src/video/__tests__/types.test.ts
```

Expected: `FAIL — Cannot find module '../types'`

- [ ] **Step 1.3: Implement `src/video/types.ts`**

```ts
export interface WordBeat {
  index: number;
  phase: number;
  bar: number;
  barPhase: number;
}

export interface WordTiming {
  word: string;
  startMs: number;
  endMs: number;
  beat: WordBeat;
  school: string;
}

export interface AlignSidecar {
  wordTimings: WordTiming[];
}

export function validateWordTiming(v: unknown): v is WordTiming {
  if (!v || typeof v !== 'object') return false;
  const w = v as Record<string, unknown>;
  if (typeof w.word !== 'string') return false;
  if (typeof w.startMs !== 'number') return false;
  if (typeof w.endMs !== 'number') return false;
  if (typeof w.school !== 'string') return false;
  if (!w.beat || typeof w.beat !== 'object') return false;
  const b = w.beat as Record<string, unknown>;
  return (
    typeof b.index === 'number' &&
    typeof b.phase === 'number' &&
    typeof b.bar === 'number' &&
    typeof b.barPhase === 'number'
  );
}

export function validateAlignSidecar(v: unknown): v is AlignSidecar {
  if (!v || typeof v !== 'object') return false;
  const a = v as Record<string, unknown>;
  if (!Array.isArray(a.wordTimings)) return false;
  return a.wordTimings.every(validateWordTiming);
}
```

- [ ] **Step 1.4: Run tests to verify they pass**

```bash
npx vitest run src/video/__tests__/types.test.ts
```

Expected: all 8 tests PASS

- [ ] **Step 1.5: Commit**

```bash
git add src/video/types.ts src/video/__tests__/types.test.ts
git commit -m "feat(video): WordTiming schema and runtime validator"
```

---

## Task 2: Extend GrimoireTrack

**Files:**
- Modify: `src/pages/Visualiser/tracks/types.ts`

- [ ] **Step 2.1: Add `wordTimings` to `GrimoireTrack`**

In `src/pages/Visualiser/tracks/types.ts`, add the import and field. Open the file — the `GrimoireTrack` interface ends before the `DEFAULT_PACING` export. Add:

```ts
import type { WordTiming } from '../../../video/types';
```

At the top of the file, then add to `GrimoireTrack`:

```ts
export interface GrimoireTrack {
  // ... all existing fields unchanged ...
  pacing?: TrackPacing;
  wordTimings?: WordTiming[];  // populated by .align.json sidecar at render time
}
```

- [ ] **Step 2.2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. If path alias errors appear for `../../../video/types`, adjust the import path to be relative from `src/pages/Visualiser/tracks/types.ts` to `src/video/types.ts`.

- [ ] **Step 2.3: Commit**

```bash
git add src/pages/Visualiser/tracks/types.ts
git commit -m "feat(video): add optional wordTimings to GrimoireTrack"
```

---

## Task 3: Hand-Mocked Alignment Sidecar

**Files:**
- Create: `src/pages/Visualiser/tracks/petrichor.align.json`

Petrichor has BPM 123, leadInS 9. Beat duration = 60000/123 ≈ 487.8ms. These timings approximate the first line "I just care that I miss you" starting at the 9-second mark.

- [ ] **Step 3.1: Create the sidecar**

```json
{
  "wordTimings": [
    {
      "word": "I",
      "startMs": 9000,
      "endMs": 9200,
      "beat": { "index": 0, "phase": 0.0, "bar": 0, "barPhase": 0.0 },
      "school": "PSYCHIC"
    },
    {
      "word": "just",
      "startMs": 9250,
      "endMs": 9420,
      "beat": { "index": 0, "phase": 0.512, "bar": 0, "barPhase": 0.128 },
      "school": "WILL"
    },
    {
      "word": "care",
      "startMs": 9450,
      "endMs": 9750,
      "beat": { "index": 0, "phase": 0.922, "bar": 0, "barPhase": 0.230 },
      "school": "WILL"
    },
    {
      "word": "that",
      "startMs": 9800,
      "endMs": 9970,
      "beat": { "index": 1, "phase": 0.639, "bar": 0, "barPhase": 0.410 },
      "school": "WILL"
    },
    {
      "word": "I",
      "startMs": 10020,
      "endMs": 10180,
      "beat": { "index": 2, "phase": 0.090, "bar": 0, "barPhase": 0.522 },
      "school": "PSYCHIC"
    },
    {
      "word": "miss",
      "startMs": 10220,
      "endMs": 10450,
      "beat": { "index": 2, "phase": 0.501, "bar": 0, "barPhase": 0.625 },
      "school": "SONIC"
    },
    {
      "word": "you",
      "startMs": 10500,
      "endMs": 11200,
      "beat": { "index": 3, "phase": 0.075, "bar": 0, "barPhase": 0.769 },
      "school": "ABJURATION"
    },
    {
      "word": "I",
      "startMs": 11400,
      "endMs": 11600,
      "beat": { "index": 4, "phase": 0.20, "bar": 1, "barPhase": 0.05 },
      "school": "PSYCHIC"
    },
    {
      "word": "prepared",
      "startMs": 11650,
      "endMs": 12000,
      "beat": { "index": 4, "phase": 0.71, "bar": 1, "barPhase": 0.18 },
      "school": "WILL"
    },
    {
      "word": "my",
      "startMs": 12050,
      "endMs": 12200,
      "beat": { "index": 5, "phase": 0.21, "bar": 1, "barPhase": 0.30 },
      "school": "PSYCHIC"
    },
    {
      "word": "life",
      "startMs": 12250,
      "endMs": 12550,
      "beat": { "index": 5, "phase": 0.72, "bar": 1, "barPhase": 0.43 },
      "school": "PSYCHIC"
    },
    {
      "word": "knowing",
      "startMs": 12600,
      "endMs": 12900,
      "beat": { "index": 6, "phase": 0.23, "bar": 1, "barPhase": 0.56 },
      "school": "ABJURATION"
    },
    {
      "word": "my",
      "startMs": 12950,
      "endMs": 13100,
      "beat": { "index": 6, "phase": 0.74, "bar": 1, "barPhase": 0.68 },
      "school": "PSYCHIC"
    },
    {
      "word": "life",
      "startMs": 13150,
      "endMs": 13400,
      "beat": { "index": 7, "phase": 0.24, "bar": 1, "barPhase": 0.81 },
      "school": "PSYCHIC"
    },
    {
      "word": "is",
      "startMs": 13450,
      "endMs": 13600,
      "beat": { "index": 7, "phase": 0.75, "bar": 1, "barPhase": 0.94 },
      "school": "SONIC"
    },
    {
      "word": "no",
      "startMs": 13650,
      "endMs": 13850,
      "beat": { "index": 8, "phase": 0.05, "bar": 2, "barPhase": 0.01 },
      "school": "ABJURATION"
    },
    {
      "word": "longer",
      "startMs": 13900,
      "endMs": 14250,
      "beat": { "index": 8, "phase": 0.56, "bar": 2, "barPhase": 0.14 },
      "school": "ABJURATION"
    },
    {
      "word": "yours",
      "startMs": 14300,
      "endMs": 15100,
      "beat": { "index": 9, "phase": 0.07, "bar": 2, "barPhase": 0.27 },
      "school": "SONIC"
    }
  ]
}
```

- [ ] **Step 3.2: Validate the sidecar against the schema**

```bash
node -e "
const { validateAlignSidecar } = await import('./src/video/types.ts').catch(() => ({ validateAlignSidecar: () => 'cannot run ts directly' }));
const data = JSON.parse(require('fs').readFileSync('./src/pages/Visualiser/tracks/petrichor.align.json', 'utf8'));
console.log('wordTimings count:', data.wordTimings.length);
console.log('schools present:', [...new Set(data.wordTimings.map(w => w.school))].join(', '));
"
```

Expected output: `wordTimings count: 18` and at least 4 distinct schools listed.

- [ ] **Step 3.3: Commit**

```bash
git add src/pages/Visualiser/tracks/petrichor.align.json
git commit -m "feat(video): hand-mocked petrichor.align.json for Remotion development"
```

---

## Task 4: Install Remotion and Wire Root Composition

**Files:**
- Create: `remotion.config.ts`
- Create: `src/video/Root.tsx`
- Create: `src/video/KineticLyricsVideo.tsx` (shell)

- [ ] **Step 4.1: Install Remotion**

```bash
npm install remotion @remotion/cli @remotion/bundler @remotion/renderer
```

Expected: installs without peer dependency errors. Note the installed version — pin it in `package.json` to avoid drift.

- [ ] **Step 4.2: Create Remotion config**

```ts
// remotion.config.ts
import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setEntryPoint('./src/video/index.ts');
```

- [ ] **Step 4.3: Create `KineticLyricsVideo` shell**

```tsx
// src/video/KineticLyricsVideo.tsx
import { AbsoluteFill, Audio } from 'remotion';
import type { GrimoireTrack } from '../pages/Visualiser/tracks/types';

export interface KineticLyricsVideoProps {
  track: GrimoireTrack;
}

export function KineticLyricsVideo({ track }: KineticLyricsVideoProps) {
  return (
    <AbsoluteFill style={{ background: '#0a0a0f', fontFamily: 'Space Grotesk, sans-serif' }}>
      <Audio src={track.audioUrl} />
      <div style={{ color: 'white', padding: 40, fontSize: 24 }}>
        {track.title} — {track.artist}
      </div>
    </AbsoluteFill>
  );
}
```

- [ ] **Step 4.4: Create Remotion root and entry**

```tsx
// src/video/Root.tsx
import React from 'react';
import { Composition } from 'remotion';
import { KineticLyricsVideo } from './KineticLyricsVideo';
import { PETRICHOR } from '../pages/Visualiser/tracks/petrichor';

export function RemotionRoot() {
  return (
    <Composition
      id="KineticLyricsVideo"
      component={KineticLyricsVideo}
      durationInFrames={30 * Math.ceil(PETRICHOR.duration)}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ track: PETRICHOR }}
    />
  );
}
```

```ts
// src/video/index.ts
import { registerRoot } from 'remotion';
import { RemotionRoot } from './Root';
registerRoot(RemotionRoot);
```

- [ ] **Step 4.5: Verify Remotion Studio opens**

```bash
npx remotion studio
```

Expected: browser opens at `http://localhost:3000`. You should see "KineticLyricsVideo" in the sidebar and the shell renders with black background and track title.

- [ ] **Step 4.6: Commit**

```bash
git add remotion.config.ts src/video/Root.tsx src/video/KineticLyricsVideo.tsx src/video/index.ts package.json package-lock.json
git commit -m "feat(video): Remotion root composition shell — KineticLyricsVideo"
```

---

## Task 5: useBeatClock + Golden ScholoTime Tests

**Files:**
- Create: `src/video/useBeatClock.ts`
- Create: `src/video/__tests__/useBeatClock.test.ts`

These are the QA golden tests that guard against timing drift between preview and render.

- [ ] **Step 5.1: Write the failing golden tests**

```ts
// src/video/__tests__/useBeatClock.test.ts
import { frameIndexToTimeMs, resolveBeatState, resolveBarState } from '../../../codex/core/scholotime/scholotime.math.js';

describe('frameIndexToTimeMs — golden', () => {
  it('frame 0 = 0ms', () => {
    expect(frameIndexToTimeMs(0, 30)).toBe(0);
  });

  it('frame 30 at 30fps = 1000ms', () => {
    expect(frameIndexToTimeMs(30, 30)).toBe(1000);
  });

  it('frame 1 at 30fps = 33.333...ms', () => {
    expect(frameIndexToTimeMs(1, 30)).toBeCloseTo(33.333, 2);
  });
});

describe('resolveBeatState — golden (Petrichor: BPM 123, leadInMs 9000)', () => {
  const bpm = 123;
  const offsetMs = 9000;
  const beatDuration = 60000 / 123; // ≈487.8ms

  it('at exactly leadIn offset: beat index 0, phase 0', () => {
    const state = resolveBeatState(9000, { bpm, offsetMs });
    expect(state.index).toBe(0);
    expect(state.phase).toBeCloseTo(0, 5);
  });

  it('at half a beat after leadIn: phase ≈ 0.5', () => {
    const state = resolveBeatState(9000 + beatDuration * 0.5, { bpm, offsetMs });
    expect(state.phase).toBeCloseTo(0.5, 2);
  });

  it('at one full beat after leadIn: index 1, phase 0', () => {
    const state = resolveBeatState(9000 + beatDuration, { bpm, offsetMs });
    expect(state.index).toBe(1);
    expect(state.phase).toBeCloseTo(0, 2);
  });

  it('before leadIn: clamps to beat 0', () => {
    const state = resolveBeatState(0, { bpm, offsetMs });
    expect(state.index).toBe(0);
    expect(state.phase).toBeCloseTo(0, 5);
  });
});

describe('resolveBarState — golden (4/4)', () => {
  const bpm = 123;
  const offsetMs = 9000;
  const beatDuration = 60000 / 123;

  it('first downbeat: bar 0, barPhase 0', () => {
    const beat = resolveBeatState(9000, { bpm, offsetMs });
    const bar = resolveBarState(beat);
    expect(bar.index).toBe(0);
    expect(bar.phase).toBeCloseTo(0, 5);
  });

  it('after 4 beats: bar 1, barPhase 0', () => {
    const beat = resolveBeatState(9000 + beatDuration * 4, { bpm, offsetMs });
    const bar = resolveBarState(beat);
    expect(bar.index).toBe(1);
    expect(bar.phase).toBeCloseTo(0, 2);
  });

  it('halfway through bar: barPhase ≈ 0.5', () => {
    const beat = resolveBeatState(9000 + beatDuration * 2, { bpm, offsetMs });
    const bar = resolveBarState(beat);
    expect(bar.phase).toBeCloseTo(0.5, 2);
  });
});
```

- [ ] **Step 5.2: Run tests**

```bash
npx vitest run src/video/__tests__/useBeatClock.test.ts
```

Expected: all tests PASS (these test existing ScholoTime functions — if any fail, ScholoTime has a bug that must be fixed before proceeding).

- [ ] **Step 5.3: Implement `useBeatClock`**

```ts
// src/video/useBeatClock.ts
import { useCurrentFrame } from 'remotion';
import {
  frameIndexToTimeMs,
  resolveBeatState,
  resolveBarState,
} from '../../codex/core/scholotime/scholotime.math.js';
import type { TrackPacing } from '../pages/Visualiser/tracks/types';
import { DEFAULT_PACING } from '../pages/Visualiser/tracks/types';

export interface BeatClockState {
  currentMs: number;
  beatIndex: number;
  beatPhase: number;
  barIndex: number;
  barPhase: number;
}

export function useBeatClock(pacing: TrackPacing = DEFAULT_PACING): BeatClockState {
  const frame = useCurrentFrame();
  const currentMs = frameIndexToTimeMs(frame, 30);
  const beatState = resolveBeatState(currentMs, {
    bpm: pacing.bpm,
    offsetMs: pacing.leadInS * 1000,
  });
  const barState = resolveBarState(beatState);
  return {
    currentMs,
    beatIndex: beatState.index,
    beatPhase: beatState.phase,
    barIndex: barState.index,
    barPhase: barState.phase,
  };
}
```

- [ ] **Step 5.4: Commit**

```bash
git add src/video/useBeatClock.ts src/video/__tests__/useBeatClock.test.ts
git commit -m "feat(video): useBeatClock hook + golden ScholoTime timing tests"
```

---

## Task 6: KineticWord — Active Words, No Glyphs

Render active words. No school colors yet, no glyphs. Prove the word window and easing work.

**Files:**
- Create: `src/video/KineticWord.tsx`
- Create: `src/video/__tests__/KineticWord.test.tsx`
- Modify: `src/video/KineticLyricsVideo.tsx`

- [ ] **Step 6.1: Write the failing tests**

```tsx
// src/video/__tests__/KineticWord.test.tsx
import { render } from '@testing-library/react';
import React from 'react';

// Remotion's useCurrentFrame must be mocked — it reads from a context that
// doesn't exist in jsdom.
vi.mock('remotion', async () => {
  const actual = await vi.importActual<typeof import('remotion')>('remotion');
  return { ...actual, useCurrentFrame: vi.fn(() => 0) };
});

import { useCurrentFrame } from 'remotion';
import { KineticWord } from '../KineticWord';
import type { WordTiming } from '../types';

const activeWord: WordTiming = {
  word: 'care',
  startMs: 0,
  endMs: 500,
  beat: { index: 0, phase: 0, bar: 0, barPhase: 0 },
  school: 'WILL',
};

const futureWord: WordTiming = {
  word: 'future',
  startMs: 2000,
  endMs: 2500,
  beat: { index: 4, phase: 0, bar: 1, barPhase: 0 },
  school: 'SONIC',
};

describe('KineticWord', () => {
  it('renders word text when currentMs is within active window', () => {
    vi.mocked(useCurrentFrame).mockReturnValue(0); // frame 0 = 0ms
    const { getByText } = render(
      <KineticWord timing={activeWord} currentMs={0} />
    );
    expect(getByText('care')).toBeTruthy();
  });

  it('renders nothing when currentMs is before word start', () => {
    const { queryByText } = render(
      <KineticWord timing={futureWord} currentMs={0} />
    );
    expect(queryByText('future')).toBeNull();
  });

  it('renders nothing when currentMs is past word end + linger window', () => {
    const { queryByText } = render(
      <KineticWord timing={activeWord} currentMs={1200} /> // 500ms end + 600ms linger = 1100ms, 1200 is past
    );
    expect(queryByText('care')).toBeNull();
  });

  it('renders with white color before school colors are added', () => {
    const { getByText } = render(
      <KineticWord timing={activeWord} currentMs={100} />
    );
    const el = getByText('care');
    expect(el.style.color).toBe('white');
  });
});
```

- [ ] **Step 6.2: Run tests to verify they fail**

```bash
npx vitest run src/video/__tests__/KineticWord.test.tsx
```

Expected: `FAIL — Cannot find module '../KineticWord'`

- [ ] **Step 6.3: Implement `KineticWord` (bare — white text, no school color, no glyph)**

The active window: show a word if `currentMs >= word.startMs && currentMs <= word.endMs + 600`. This keeps words visible up to 600ms after they end, creating natural linger. 

Entrance animation: over the first 200ms of the word's active window, scale from 0.85→1.0 and opacity from 0→1 using `easeOutCubic`. Downbeat words (`barPhase < 0.1`) use a stronger pop: scale 0.7→1.0.

```tsx
// src/video/KineticWord.tsx
import React from 'react';
import { applyEasing, clamp01 } from '../../codex/core/scholotime/scholotime.math.js';
import type { WordTiming } from './types';

const LINGER_MS = 600;
const ENTRANCE_MS = 200;

interface KineticWordProps {
  timing: WordTiming;
  currentMs: number;
}

export function KineticWord({ timing, currentMs }: KineticWordProps) {
  if (currentMs < timing.startMs || currentMs > timing.endMs + LINGER_MS) {
    return null;
  }

  const elapsed = currentMs - timing.startMs;
  const entranceProgress = clamp01(elapsed / ENTRANCE_MS);
  const eased = applyEasing(entranceProgress, 'easeOutCubic');

  const isDownbeat = timing.beat.barPhase < 0.1;
  const scaleFrom = isDownbeat ? 0.7 : 0.85;
  const scale = scaleFrom + (1 - scaleFrom) * eased;
  const opacity = eased;

  return (
    <div
      style={{
        display: 'inline-block',
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: 'center bottom',
        color: 'white',
        fontSize: 80,
        fontWeight: 700,
        letterSpacing: '-0.02em',
        lineHeight: 1.1,
        userSelect: 'none',
      }}
    >
      {timing.word}
    </div>
  );
}
```

- [ ] **Step 6.4: Wire words into `KineticLyricsVideo`**

Replace the shell contents in `src/video/KineticLyricsVideo.tsx`:

```tsx
// src/video/KineticLyricsVideo.tsx
import React from 'react';
import { AbsoluteFill, Audio, useCurrentFrame } from 'remotion';
import type { GrimoireTrack } from '../pages/Visualiser/tracks/types';
import { DEFAULT_PACING } from '../pages/Visualiser/tracks/types';
import { useBeatClock } from './useBeatClock';
import { KineticWord } from './KineticWord';

export interface KineticLyricsVideoProps {
  track: GrimoireTrack;
}

export function KineticLyricsVideo({ track }: KineticLyricsVideoProps) {
  const pacing = track.pacing ?? DEFAULT_PACING;
  const { currentMs } = useBeatClock(pacing);
  const words = track.wordTimings ?? [];

  return (
    <AbsoluteFill style={{ background: '#0a0a0f', fontFamily: 'Space Grotesk, sans-serif' }}>
      <Audio src={track.audioUrl} />
      <AbsoluteFill
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignContent: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: '80px 120px',
        }}
      >
        {words.map((timing, i) => (
          <KineticWord key={i} timing={timing} currentMs={currentMs} />
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
```

- [ ] **Step 6.5: Run tests**

```bash
npx vitest run src/video/__tests__/KineticWord.test.tsx
```

Expected: all 4 tests PASS.

- [ ] **Step 6.6: Preview in Remotion Studio**

```bash
npx remotion studio
```

Scrub to the 9-second mark in the KineticLyricsVideo composition. Words from the mock sidecar should appear and disappear with eased entrances. The first word ("I" at 9000ms) should have a strong pop (downbeat). Verify words don't pile up — linger behavior should feel natural.

- [ ] **Step 6.7: Commit**

```bash
git add src/video/KineticWord.tsx src/video/__tests__/KineticWord.test.tsx src/video/KineticLyricsVideo.tsx
git commit -m "feat(video): KineticWord renders active words with ScholoTime-eased entrance"
```

---

## Task 7: School Colors

**Files:**
- Modify: `src/video/KineticWord.tsx`
- Modify: `src/video/__tests__/KineticWord.test.tsx`

- [ ] **Step 7.1: Add school color test**

Add to `src/video/__tests__/KineticWord.test.tsx`:

```tsx
import { SCHOOLS } from '../../../codex/core/constants/schools.js';

it('applies school color from PixelBrain SCHOOLS registry', () => {
  const { getByText } = render(
    <KineticWord timing={activeWord} currentMs={100} /> // activeWord.school = 'WILL'
  );
  const el = getByText('care');
  expect(el.style.color).toBe(SCHOOLS.WILL.color); // '#ef4444'
});

it('falls back to VOID color for unknown school', () => {
  const voidWord: WordTiming = {
    ...activeWord,
    word: 'void',
    school: 'UNKNOWN_SCHOOL',
  };
  const { getByText } = render(
    <KineticWord timing={voidWord} currentMs={100} />
  );
  const el = getByText('void');
  expect(el.style.color).toBe(SCHOOLS.VOID.color); // '#94a3b8'
});
```

- [ ] **Step 7.2: Run tests to verify new ones fail**

```bash
npx vitest run src/video/__tests__/KineticWord.test.tsx
```

Expected: 2 new tests FAIL (color is still 'white')

- [ ] **Step 7.3: Add school color to `KineticWord`**

In `src/video/KineticWord.tsx`, replace the `color: 'white'` style:

Add import at top:
```tsx
import { generateSchoolColor } from '../../codex/core/constants/schools.js';
```

Replace `color: 'white'` in the style object with:
```tsx
color: generateSchoolColor(timing.school),
```

`generateSchoolColor` already handles unknown school IDs by returning `'#888888'`. Override this to return VOID's color instead — VOID is the honesty school for unknown phonemic content:

```tsx
import { generateSchoolColor, SCHOOLS } from '../../codex/core/constants/schools.js';

// In KineticWord, before the return:
const schoolColor = SCHOOLS[timing.school]?.color ?? SCHOOLS.VOID.color;
```

And in the style: `color: schoolColor`

- [ ] **Step 7.4: Run tests**

```bash
npx vitest run src/video/__tests__/KineticWord.test.tsx
```

Expected: all 6 tests PASS.

- [ ] **Step 7.5: Preview — verify school colors appear**

```bash
npx remotion studio
```

Scrub to 9s. Words should be colored: PSYCHIC blue (#3b82f6) for "I", WILL red (#ef4444) for "just/care/that", SONIC teal (#1ab4a8) for "miss", ABJURATION cyan (#06b6d4) for "you".

- [ ] **Step 7.6: Commit**

```bash
git add src/video/KineticWord.tsx src/video/__tests__/KineticWord.test.tsx
git commit -m "feat(video): school colors via PixelBrain SCHOOLS registry, VOID fallback"
```

---

## Task 8: Glyph Ghosts

**Files:**
- Modify: `src/video/KineticWord.tsx`
- Modify: `src/video/__tests__/KineticWord.test.tsx`

The glyph is a ghost — it blooms outward as the word arrives, then dissipates. It re-pulses on each beat for sustained words.

- [ ] **Step 8.1: Add glyph tests**

Add to `src/video/__tests__/KineticWord.test.tsx`:

```tsx
import { SCHOOLS } from '../../../codex/core/constants/schools.js';

it('renders the school glyph element alongside the word', () => {
  const { container } = render(
    <KineticWord timing={activeWord} currentMs={50} />
  );
  // activeWord.school = 'WILL', glyph = '⚡'
  expect(container.textContent).toContain('⚡');
});

it('does not render glyph for words past the linger window', () => {
  const { container } = render(
    <KineticWord timing={activeWord} currentMs={1200} />
  );
  expect(container.textContent).not.toContain('⚡');
});
```

- [ ] **Step 8.2: Run tests to verify they fail**

```bash
npx vitest run src/video/__tests__/KineticWord.test.tsx
```

Expected: 2 new glyph tests FAIL

- [ ] **Step 8.3: Add glyph ghost to `KineticWord`**

The glyph bloom: opacity goes from 0.4→0 and scale from 1.0→1.4 over one beat phase duration. For the beat phase duration at runtime, use `timing.beat` — the word knows which beat it landed on, and `barPhase` tells us its position in the bar. Approximate the beat duration from the pacing (passed as a prop), or accept it directly.

Update `KineticWord`'s props to accept `beatDurationMs`:

```tsx
// src/video/KineticWord.tsx
import React from 'react';
import { applyEasing, clamp01 } from '../../codex/core/scholotime/scholotime.math.js';
import { SCHOOLS } from '../../codex/core/constants/schools.js';
import type { WordTiming } from './types';

const LINGER_MS = 600;
const ENTRANCE_MS = 200;

interface KineticWordProps {
  timing: WordTiming;
  currentMs: number;
  beatDurationMs: number; // 60000 / bpm
}

export function KineticWord({ timing, currentMs, beatDurationMs }: KineticWordProps) {
  if (currentMs < timing.startMs || currentMs > timing.endMs + LINGER_MS) {
    return null;
  }

  const school = SCHOOLS[timing.school] ?? SCHOOLS.VOID;
  const schoolColor = school.color;
  const glyph = school.glyph;

  const elapsed = currentMs - timing.startMs;
  const entranceProgress = clamp01(elapsed / ENTRANCE_MS);
  const eased = applyEasing(entranceProgress, 'easeOutCubic');

  const isDownbeat = timing.beat.barPhase < 0.1;
  const scaleFrom = isDownbeat ? 0.7 : 0.85;
  const scale = scaleFrom + (1 - scaleFrom) * eased;
  const opacity = eased;

  // Glyph bloom: phase within current beat (re-pulses each beat for sustained words)
  const msSinceWordStart = currentMs - timing.startMs;
  const beatPositionWithinWord = (msSinceWordStart % beatDurationMs) / beatDurationMs;
  const glyphBloomProgress = clamp01(beatPositionWithinWord);
  const glyphOpacity = 0.4 * (1 - applyEasing(glyphBloomProgress, 'easeOutCubic'));
  const glyphScale = 1 + 0.4 * applyEasing(glyphBloomProgress, 'easeOutCubic');

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Glyph ghost — behind the word, blooms outward on entrance */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: `translateY(-50%) scale(${glyphScale})`,
          transformOrigin: 'left center',
          opacity: glyphOpacity,
          color: schoolColor,
          fontSize: '0.6em',
          fontWeight: 400,
          pointerEvents: 'none',
          lineHeight: 1,
        }}
      >
        {glyph}
      </span>
      {/* Word */}
      <span
        style={{
          display: 'inline-block',
          opacity,
          transform: `scale(${scale})`,
          transformOrigin: 'center bottom',
          color: schoolColor,
          fontSize: 80,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          paddingLeft: '0.8em',
          userSelect: 'none',
        }}
      >
        {timing.word}
      </span>
    </div>
  );
}
```

- [ ] **Step 8.4: Update `KineticLyricsVideo` to pass `beatDurationMs`**

In `src/video/KineticLyricsVideo.tsx`, compute and pass `beatDurationMs`:

```tsx
const beatDurationMs = 60000 / pacing.bpm;

// In the map:
{words.map((timing, i) => (
  <KineticWord key={i} timing={timing} currentMs={currentMs} beatDurationMs={beatDurationMs} />
))}
```

- [ ] **Step 8.5: Run tests**

```bash
npx vitest run src/video/__tests__/KineticWord.test.tsx
```

Expected: all 8 tests PASS. (The glyph tests don't check styles — just text content presence.)

- [ ] **Step 8.6: Preview — verify glyphs feel like phonemic shockwaves**

```bash
npx remotion studio
```

Scrub to 9s. The ⚡ glyph for WILL words should bloom briefly as "just", "care", "that" arrive. "I" words (PSYCHIC) should show ◬. "you" (ABJURATION, sustained) should show ◇ re-pulsing on each beat. If glyphs feel like badges, adjust `glyphOpacity` ceiling downward from 0.4.

- [ ] **Step 8.7: Commit**

```bash
git add src/video/KineticWord.tsx src/video/__tests__/KineticWord.test.tsx src/video/KineticLyricsVideo.tsx
git commit -m "feat(video): school glyph ghost — phonemic shockwave bloom on word entrance"
```

---

## Task 9: PixelBrainStage Atmosphere

**Files:**
- Create: `src/video/PixelBrainStage.tsx`
- Create: `src/video/__tests__/PixelBrainStage.test.tsx`
- Modify: `src/video/KineticLyricsVideo.tsx`

PixelBrainStage tracks the dominant school of the last 4 active words and crossfades `atmosphere` values (auroraIntensity, saturation, vignetteStrength) using ScholoTime's `smoothstep`.

- [ ] **Step 9.1: Write the failing tests**

```tsx
// src/video/__tests__/PixelBrainStage.test.tsx
import { render } from '@testing-library/react';
import React from 'react';
import { PixelBrainStage, getDominantSchoolFromWindow } from '../PixelBrainStage';
import type { WordTiming } from '../types';

const makeWord = (school: string, startMs: number): WordTiming => ({
  word: 'x',
  startMs,
  endMs: startMs + 300,
  beat: { index: 0, phase: 0, bar: 0, barPhase: 0 },
  school,
});

describe('getDominantSchoolFromWindow', () => {
  it('returns dominant school from last 4 active words', () => {
    const words = [
      makeWord('VOID', 0),
      makeWord('VOID', 300),
      makeWord('WILL', 600),
      makeWord('VOID', 900),
    ];
    // At currentMs 1100, all 4 are in the trailing 600ms window
    expect(getDominantSchoolFromWindow(words, 1100)).toBe('VOID');
  });

  it('returns VOID when no words are active', () => {
    expect(getDominantSchoolFromWindow([], 0)).toBe('VOID');
  });

  it('ignores words outside the trailing window', () => {
    const words = [
      makeWord('ALCHEMY', 0),    // started 10s ago — outside window
      makeWord('WILL', 9800),   // recent
      makeWord('WILL', 9900),
    ];
    expect(getDominantSchoolFromWindow(words, 10000)).toBe('WILL');
  });
});

describe('PixelBrainStage', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <PixelBrainStage words={[makeWord('VOID', 0)]} currentMs={100} />
    );
    expect(container.firstChild).toBeTruthy();
  });
});
```

- [ ] **Step 9.2: Run tests to verify they fail**

```bash
npx vitest run src/video/__tests__/PixelBrainStage.test.tsx
```

Expected: `FAIL — Cannot find module '../PixelBrainStage'`

- [ ] **Step 9.3: Implement `PixelBrainStage`**

The trailing window for dominant school: words whose `startMs >= currentMs - 2000` (last 2 seconds, roughly 4 words at rap tempo). `smoothstep` from ScholoTime eases the atmosphere transitions.

```tsx
// src/video/PixelBrainStage.tsx
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { applyEasing, clamp01 } from '../../codex/core/scholotime/scholotime.math.js';
import { SCHOOLS } from '../../codex/core/constants/schools.js';
import type { WordTiming } from './types';

const TRAILING_WINDOW_MS = 2000;
const DEFAULT_SCHOOL = 'VOID';

export function getDominantSchoolFromWindow(
  words: WordTiming[],
  currentMs: number
): string {
  const recent = words.filter(
    (w) => w.startMs >= currentMs - TRAILING_WINDOW_MS && w.startMs <= currentMs
  );
  if (recent.length === 0) return DEFAULT_SCHOOL;

  const counts: Record<string, number> = {};
  for (const w of recent) {
    counts[w.school] = (counts[w.school] ?? 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

interface PixelBrainStageProps {
  words: WordTiming[];
  currentMs: number;
}

export function PixelBrainStage({ words, currentMs }: PixelBrainStageProps) {
  const dominantSchool = getDominantSchoolFromWindow(words, currentMs);
  const atm = (SCHOOLS[dominantSchool] ?? SCHOOLS.VOID).atmosphere;

  // Derive CSS values from PixelBrain atmosphere
  const saturation = clamp01(atm.saturation / 100);
  const vignette = clamp01(atm.vignetteStrength);
  const aurora = clamp01(atm.auroraIntensity);

  // Smoothstep the saturation into a CSS filter value
  const satFilter = applyEasing(saturation, 'smoothstep');
  const schoolColor = (SCHOOLS[dominantSchool] ?? SCHOOLS.VOID).color;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {/* Aurora glow — radial gradient using school color */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 120% 60% at 50% 110%, ${schoolColor}${Math.round(aurora * 40).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
          mixBlendMode: 'screen',
        }}
      />
      {/* Saturation overlay — desaturates scene for VOID/NECROMANCY */}
      <AbsoluteFill
        style={{
          backdropFilter: `saturate(${0.2 + satFilter * 0.8})`,
        }}
      />
      {/* Vignette */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 100% 100% at 50% 50%, transparent ${Math.round((1 - vignette) * 60)}%, rgba(0,0,0,${(vignette * 0.85).toFixed(2)}) 100%)`,
        }}
      />
    </AbsoluteFill>
  );
}
```

- [ ] **Step 9.4: Wire `PixelBrainStage` into `KineticLyricsVideo`**

In `src/video/KineticLyricsVideo.tsx`, add the import and render it below the `<Audio>` and above the words layer:

```tsx
import { PixelBrainStage } from './PixelBrainStage';

// Inside KineticLyricsVideo return, after <Audio>:
<PixelBrainStage words={words} currentMs={currentMs} />
```

- [ ] **Step 9.5: Run tests**

```bash
npx vitest run src/video/__tests__/PixelBrainStage.test.tsx
```

Expected: all 4 tests PASS.

- [ ] **Step 9.6: Preview — verify atmosphere shifts**

```bash
npx remotion studio
```

Scrub through the 9–11s window. PSYCHIC words should produce a blue aurora. WILL words should push a red/orange tint. ABJURATION "you" (sustained) should give a cyan aurora with a lighter vignette. If atmosphere transitions feel abrupt, note that the crossfade sharpness is controlled by `TRAILING_WINDOW_MS` — increasing it smooths transitions.

- [ ] **Step 9.7: Commit**

```bash
git add src/video/PixelBrainStage.tsx src/video/__tests__/PixelBrainStage.test.tsx src/video/KineticLyricsVideo.tsx
git commit -m "feat(video): PixelBrainStage — school atmosphere crossfades via ScholoTime smoothstep"
```

---

## Task 10: Render Script

**Files:**
- Create: `scripts/render-music-video.mjs`
- Create: `output/videos/.gitkeep`

- [ ] **Step 10.1: Install tsx and create output directory**

The render script imports TypeScript files directly — `tsx` is needed to run it:

```bash
npm install --save-dev tsx
mkdir -p output/videos
touch output/videos/.gitkeep
```

- [ ] **Step 10.2: Create the render script**

```js
// scripts/render-music-video.mjs
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { validateAlignSidecar } from '../src/video/types.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

const trackId = process.argv[2];
if (!trackId) {
  console.error('Usage: node scripts/render-music-video.mjs <trackId>');
  console.error('Example: node scripts/render-music-video.mjs petrichor');
  process.exit(1);
}

// Dynamically import the track definition
const trackModule = await import(`../src/pages/Visualiser/tracks/${trackId}.ts`);
const track = Object.values(trackModule).find(
  (v) => v && typeof v === 'object' && v.id
);

if (!track) {
  console.error(`No track found for id: ${trackId}`);
  process.exit(1);
}

// Merge .align.json sidecar if present
const sidecarPath = resolve(
  __dirname,
  `../src/pages/Visualiser/tracks/${trackId}.align.json`
);
if (existsSync(sidecarPath)) {
  const raw = JSON.parse(readFileSync(sidecarPath, 'utf8'));
  if (validateAlignSidecar(raw)) {
    Object.assign(track, raw);
    console.log(`Merged ${raw.wordTimings.length} word timings from sidecar.`);
  } else {
    console.warn(`Warning: ${trackId}.align.json failed validation — rendering without word timings.`);
  }
} else {
  console.warn(`No sidecar found for ${trackId} — rendering without word timings.`);
}

const outputPath = resolve(__dirname, `../output/videos/${trackId}.mp4`);

console.log(`Bundling composition...`);
const bundleLocation = await bundle({
  entryPoint: resolve(__dirname, '../src/video/index.ts'),
});

console.log(`Selecting composition...`);
const composition = await selectComposition({
  serveUrl: bundleLocation,
  id: 'KineticLyricsVideo',
  inputProps: { track },
});

console.log(`Rendering ${track.duration}s at 30fps → ${outputPath}`);
await renderMedia({
  composition,
  serveUrl: bundleLocation,
  codec: 'h264',
  outputLocation: outputPath,
  inputProps: { track },
  onProgress: ({ progress }) => {
    process.stdout.write(`\rProgress: ${Math.round(progress * 100)}%`);
  },
});

console.log(`\nDone: ${outputPath}`);
```

- [ ] **Step 10.3: Run the first render**

```bash
npx tsx scripts/render-music-video.mjs petrichor
```

Expected output:
```
Merged 18 word timings from sidecar.
Bundling composition...
Selecting composition...
Rendering 241s at 30fps → output/videos/petrichor.mp4
Progress: 100%
Done: output/videos/petrichor.mp4
```

Open `output/videos/petrichor.mp4`. At ~9 seconds, school-colored words should appear and animate with eased entrances. The background atmosphere should shift. If the render fails, check the Remotion docs for the installed version's `renderMedia` API signature — it may differ from the above.

- [ ] **Step 10.4: Commit**

```bash
git add scripts/render-music-video.mjs output/videos/.gitkeep
git commit -m "feat(video): render-music-video.mjs — bundles and renders GrimoireTrack to MP4"
```

---

## Task 11: align-track.mjs — WhisperX Pipeline

This is the swamp monster. Build it last — everything else is already proven without it.

**Files:**
- Create: `scripts/align-track.mjs`

**Prerequisite:** WhisperX must be installed in the Python environment:
```bash
pip install whisperx
```
WhisperX requires `ffmpeg` on PATH and a HuggingFace token for the alignment model. See [WhisperX README](https://github.com/m-bain/whisperX) for setup. CPU-only inference is slow (~1× realtime) but functional.

- [ ] **Step 11.1: Create the alignment script**

```js
// scripts/align-track.mjs
import { execSync, spawnSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));

const trackId = process.argv[2];
if (!trackId) {
  console.error('Usage: node scripts/align-track.mjs <trackId>');
  process.exit(1);
}

// Load track
const trackModule = await import(`../src/pages/Visualiser/tracks/${trackId}.ts`);
const track = Object.values(trackModule).find((v) => v?.id);
if (!track) { console.error(`No track: ${trackId}`); process.exit(1); }

const tmpDir = resolve(__dirname, '../.tmp/align');
mkdirSync(tmpDir, { recursive: true });

// Download audio
const audioPath = resolve(tmpDir, `${trackId}.mp3`);
if (!existsSync(audioPath)) {
  console.log(`Downloading audio from ${track.audioUrl}...`);
  const resp = await fetch(track.audioUrl);
  if (!resp.ok) { console.error('Download failed'); process.exit(1); }
  await pipeline(resp.body, createWriteStream(audioPath));
  console.log('Downloaded.');
}

// Write lyrics as plain text for WhisperX
const lyricsPath = resolve(tmpDir, `${trackId}.lyrics.txt`);
writeFileSync(lyricsPath, track.lyrics.join('\n'), 'utf8');

// Run WhisperX forced alignment
const whisperxOut = resolve(tmpDir, `${trackId}_whisperx`);
mkdirSync(whisperxOut, { recursive: true });

console.log('Running WhisperX forced alignment...');
const result = spawnSync('whisperx', [
  audioPath,
  '--align_model', 'WAV2VEC2_ASR_LARGE_LV60K_960H',
  '--output_dir', whisperxOut,
  '--output_format', 'json',
  '--language', 'en',
], { stdio: 'inherit' });

if (result.status !== 0) {
  console.error('WhisperX failed. Check Python environment and model availability.');
  process.exit(1);
}

// Parse WhisperX JSON output
const whisperxJsonPath = resolve(whisperxOut, `${trackId}.json`);
const whisperxData = JSON.parse(readFileSync(whisperxJsonPath, 'utf8'));

// WhisperX outputs { segments: [{ words: [{ word, start, end, score }] }] }
const rawWords = whisperxData.segments.flatMap((seg) => seg.words ?? []);

// Import ScholoTime and G2P
const { resolveBeatState, resolveBarState } = await import('../codex/core/scholotime/scholotime.math.js');
const { VOWEL_FAMILY_TO_SCHOOL } = await import('../codex/core/constants/schools.js');
const { adaptG2P } = await import('../codex/core/phonology/g2p/g2p.adapter.js');

const bpm = track.pacing?.bpm ?? 120;
const offsetMs = (track.pacing?.leadInS ?? 0) * 1000;
const suspiciousWords = [];

const wordTimings = rawWords
  .filter((w) => w.word && typeof w.start === 'number')
  .map((w) => {
    const startMs = Math.round(w.start * 1000);
    const endMs = Math.round((w.end ?? w.start + 0.2) * 1000);
    const confidence = w.score ?? 1;

    // Derive school from G2P
    let school = 'VOID';
    try {
      const phonemes = adaptG2P(w.word.replace(/[^a-zA-Z']/g, ''));
      const vowelFamilies = phonemes.filter((p) => VOWEL_FAMILY_TO_SCHOOL[p]);
      if (vowelFamilies.length > 0) {
        school = VOWEL_FAMILY_TO_SCHOOL[vowelFamilies[0]] ?? 'VOID';
      }
    } catch {
      // G2P failure → VOID
    }

    const beatState = resolveBeatState(startMs, { bpm, offsetMs });
    const barState = resolveBarState(beatState);

    if (confidence < 0.8) {
      suspiciousWords.push({ word: w.word, startMs, confidence });
    }

    return {
      word: w.word,
      startMs,
      endMs,
      beat: {
        index: beatState.index,
        phase: Number(beatState.phase.toFixed(4)),
        bar: barState.index,
        barPhase: Number(barState.phase.toFixed(4)),
      },
      school,
    };
  });

// Write sidecar
const sidecarPath = resolve(
  __dirname,
  `../src/pages/Visualiser/tracks/${trackId}.align.json`
);
writeFileSync(sidecarPath, JSON.stringify({ wordTimings }, null, 2), 'utf8');
console.log(`\nWrote ${wordTimings.length} word timings → ${sidecarPath}`);

// Confidence report
if (suspiciousWords.length > 0) {
  console.warn(`\n⚠ ${suspiciousWords.length} suspicious words (confidence < 0.8):`);
  for (const sw of suspiciousWords) {
    console.warn(`  "${sw.word}" at ${sw.startMs}ms — score ${sw.confidence.toFixed(2)}`);
  }
  console.warn('Review these manually and correct the sidecar if needed.');
} else {
  console.log('All words aligned with confidence ≥ 0.8.');
}
```

- [ ] **Step 11.2: Test with Petrichor**

```bash
npx tsx scripts/align-track.mjs petrichor
```

Expected: downloads audio, runs WhisperX, writes `petrichor.align.json` with real timestamps. Compare the first word's `startMs` against the hand-mocked value (~9000ms). The real alignment should land within ~200ms of the mock.

- [ ] **Step 11.3: Re-render with real alignment**

```bash
npx tsx scripts/render-music-video.mjs petrichor
```

Expected: `Merged N word timings from sidecar` with a much larger N than 18. Open the MP4 and verify words land on lyrics at the correct moments. Check the confidence report output for any flagged words — ad libs and doubled vocals are the most common failure mode.

- [ ] **Step 11.4: Commit**

```bash
git add scripts/align-track.mjs
git commit -m "feat(video): align-track.mjs — WhisperX forced alignment with BPM layer and confidence report"
```

---

## QA Checklist

Run these manually before calling v1 complete:

| Test | Expected Result |
|------|----------------|
| Render track without `.align.json` sidecar | Existing Visualiser behavior unchanged; render script warns and outputs title-only video |
| Render track with `.align.json` | Words appear at exact `wordTimings` timestamps |
| BPM offset — first word in mock (`"I"` at 9000ms, leadInS 9) | Word "I" appears at frame 270 (9000ms ÷ 1000 × 30). Verify in Remotion Studio frame counter |
| 30fps render — scrub to final chorus | No visible timing drift between audio and word display |
| VOID school cluster | Background saturation drops, vignette deepens noticeably |
| ALCHEMY school cluster | Aurora intensity rises, pink/magenta bloom visible |
| Sustained word ("you", endMs 11200) | ◇ glyph re-pulses on each beat within the sustain window |
| Unknown school word (`school: "UNKNOWN"`) | Word renders in VOID color `#94a3b8`, ∅ glyph shown |
| Missing audio (bad `audioUrl`) | `renderMedia` throws with a clear error; script exits non-zero |
