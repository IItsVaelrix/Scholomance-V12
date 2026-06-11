# Multi-Track Grimoire + Library Shelf Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Big Father" as a second grimoire track and a library shelf section that switches the Bytecode Visualiser between registry tracks.

**Finalization audit (2026-06-11):** Implementation is present in the workspace and the targeted suites pass. Remaining open gates are human listen approval for the Big Father alignment review page, a live browser/dev-server check, and commits (not performed in this pass). Full `tsc --noEmit -p .` still fails in unrelated pre-existing areas outside `src/pages/Visualiser/` (`ParaEQ`, `Grimoire`, `Listen`, `pixel-lotus`).

**Architecture:** A typed track registry (`src/pages/Visualiser/tracks/`) replaces the page's hardcoded `TRACK` constant and Petrichor-specific module pacing constants. The page renders an `activeTrack` state (deep-linkable via `?track=`), and a shelf section under the spread switches tracks. Big Father gets a forced-alignment artifact from the existing pipeline (`--model base` on this machine).

**Tech Stack:** TypeScript/React, vitest (+jsdom), existing Python alignment pipeline.

**Spec:** `docs/superpowers/specs/2026-06-11-grimoire-library-shelf-design.md`

---

## File map

| File | Action | Responsibility |
|---|---|---|
| `src/pages/Visualiser/tracks/types.ts` | Create | `GrimoireTrack`, `TrackPacing`, `DEFAULT_PACING` |
| `src/pages/Visualiser/tracks/petrichor.ts` | Create | Petrichor data (moved verbatim) + its measured pacing |
| `src/pages/Visualiser/tracks/bigFather.ts` | Create | Big Father data (published facts; no pacing) |
| `src/pages/Visualiser/tracks/index.ts` | Create | `GRIMOIRE_TRACKS` registry |
| `tests/core/grimoireTracks.test.js` | Create | Registry integrity |
| `src/pages/Visualiser/BytecodeVisualiserPage.tsx` | Modify | Track-parametric rendering + shelf section |
| `src/pages/Visualiser/BytecodeVisualiser.css` | Modify (append) | Shelf styles |
| `tests/components/libraryShelf.test.jsx` | Create | Shelf switching behaviour |
| `scripts/big-father.lyrics.txt` | Create | Alignment input (57 sung lines) |
| `public/data/alignment/eaba93dc-….alignment-v1.json` | Create (generated) | Big Father timing artifact |

Pre-existing facts the engineer needs:
- The page currently hardcodes `const TRACK = {…}` near the top of `BytecodeVisualiserPage.tsx` (id, title, …, lyrics: 88 lines, annotations) followed by module constants `TRACK_BPM = 123`, `LYRIC_LEAD_IN_S = 9`, `LYRIC_TAIL_S = 6`, `CHORUS_START_LINE = 62`, `VERSE_SYL_PER_BEAT = 1.6`, `CHORUS_SYL_PER_BEAT = 0.7`, `COUPLET_COST_MAX = 0.75`, and `HEURISTIC_LINE_BEATS` computed from `TRACK.lyrics` at module scope.
- Big Father clip JSON: `https://studio-api-prod.suno.com/api/clip/eaba93dc-bf75-4319-a67e-ddcedafc1c43` (public, no auth). Lyrics live in `metadata.prompt`; section markers (`[Chorus]` and a typo'd `[Chorus[`) are not sung and are excluded below.

---

### Task 1: Track registry module

**Files:**
- Create: `src/pages/Visualiser/tracks/types.ts`
- Create: `src/pages/Visualiser/tracks/petrichor.ts`
- Create: `src/pages/Visualiser/tracks/bigFather.ts`
- Create: `src/pages/Visualiser/tracks/index.ts`
- Test: `tests/core/grimoireTracks.test.js`

- [x] **Step 1: Write the failing test**

Create `tests/core/grimoireTracks.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { GRIMOIRE_TRACKS } from '../../src/pages/Visualiser/tracks';

describe('GRIMOIRE_TRACKS registry', () => {
  it('has at least two tracks, Petrichor first (default track)', () => {
    expect(GRIMOIRE_TRACKS.length).toBeGreaterThanOrEqual(2);
    expect(GRIMOIRE_TRACKS[0].title).toBe('Petrichor');
    expect(GRIMOIRE_TRACKS.map((t) => t.title)).toContain('Big Father');
  });

  it('has unique ids', () => {
    const ids = GRIMOIRE_TRACKS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(GRIMOIRE_TRACKS.map((t) => [t.title, t]))('%s is well-formed', (_title, t) => {
    expect(t.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(t.duration).toBeGreaterThan(0);
    for (const url of [t.sunoUrl, t.audioUrl, t.coverUrl]) {
      expect(url).toMatch(/^https:\/\//);
    }
    expect(t.lyrics.length).toBeGreaterThan(0);
    for (const line of t.lyrics) {
      expect(typeof line).toBe('string');
      expect(line.trim()).not.toBe('');
      // Section markers ([Chorus] etc.) are stage directions, not sung text.
      expect(line.startsWith('[')).toBe(false);
    }
    for (const a of t.annotations) {
      expect(a.n).toBeGreaterThanOrEqual(0);
      expect(a.n).toBeLessThan(t.lyrics.length);
    }
    if (t.pacing) {
      expect(t.pacing.bpm).toBeGreaterThan(0);
      expect(t.pacing.verseSylPerBeat).toBeGreaterThan(0);
    }
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/core/grimoireTracks.test.js`
Expected: FAIL — cannot resolve `../../src/pages/Visualiser/tracks`.

- [x] **Step 3: Create `types.ts`**

```ts
/** Heuristic-pacing parameters for the syllable/BPM fallback sync. Only
    measured values belong here (honesty law) — a track with no measured
    tempo carries no pacing block and uses DEFAULT_PACING, whose sync the
    UI already labels "estimated". */
export interface TrackPacing {
  bpm: number;
  /** First chorus line index; lines from here use chorusSylPerBeat. */
  chorusStartLine?: number;
  verseSylPerBeat: number;
  chorusSylPerBeat: number;
  leadInS: number;
  tailS: number;
  /** alignPhonemes cost/phoneme ceiling for couplet bar-sharing. */
  coupletCostMax: number;
}

export interface GrimoireTrack {
  id: string;
  title: string;
  artist: string;
  model: string;
  modelVersion: string;
  duration: number;
  sunoUrl: string;
  audioUrl: string;
  coverUrl: string;
  meta: [string, string][];
  provenance: { statement: string; tools: string[]; assistance: string };
  lyrics: string[];
  annotations: { n: number; title: string; body: string }[];
  pacing?: TrackPacing;
}

/** Generic fallback for tracks without measured pacing. Deliberately bland:
    even spread, no chorus split, no lead-in claim. */
export const DEFAULT_PACING: TrackPacing = {
  bpm: 120,
  verseSylPerBeat: 1.2,
  chorusSylPerBeat: 1.2,
  leadInS: 0,
  tailS: 0,
  coupletCostMax: 0.75,
};
```

- [x] **Step 4: Create `petrichor.ts` (verbatim move)**

Structure below; the `meta`, `provenance`, `lyrics` (all 88 lines), and `annotations`
fields are **moved verbatim, unmodified**, from the `TRACK` constant currently at the
top of `src/pages/Visualiser/BytecodeVisualiserPage.tsx` (do not retype them — cut and
paste, then verify the test's line-count assertions pass):

```ts
import type { GrimoireTrack } from './types';

// Petrichor — a real Suno incantation by Vaelrix. All metadata below is taken
// from the published track (no invented BPM/key claims — VAELRIX honesty law).
export const PETRICHOR: GrimoireTrack = {
  id: '149036d5-397c-4b59-a150-f4f6403c4758',
  title: 'Petrichor',
  artist: 'Vaelrix',
  model: 'chirp-fenix',
  modelVersion: 'v5.5',
  duration: 241, // 4:01, from the track metadata
  sunoUrl: 'https://suno.com/song/149036d5-397c-4b59-a150-f4f6403c4758',
  audioUrl: 'https://cdn1.suno.ai/149036d5-397c-4b59-a150-f4f6403c4758.mp3',
  coverUrl: /* moved verbatim from the page's TRACK.coverUrl */,
  meta: /* moved verbatim */,
  provenance: /* moved verbatim */,
  lyrics: /* moved verbatim — 88 lines */,
  annotations: /* moved verbatim */,
  pacing: {
    // Tempo estimated offline from the published MP3 (onset-envelope
    // autocorrelation; candidates converged on 123.0 ± 0.2).
    bpm: 123,
    chorusStartLine: 62,    // 'Lifetimes... pouring in the sea'
    verseSylPerBeat: 1.6,   // rapped flow
    chorusSylPerBeat: 0.7,  // belted, sustained delivery
    leadInS: 9,             // glitch intro before the first sung line
    tailS: 6,               // instrumental outro
    // Measured on this track: couplets score 0.65–0.73 cost/phoneme,
    // unrelated neighbours 0.81–1.0 — 0.75 sits in the gap.
    coupletCostMax: 0.75,
  },
};
```

(The `/* moved verbatim */` markers above are move instructions for this step, not
content to type — the data already exists in the page file.)

- [x] **Step 5: Create `bigFather.ts` (complete content)**

```ts
import type { GrimoireTrack } from './types';

// Big Father — a real Suno incantation by Vaelrix, released 2026-06-11.
// All metadata from the published clip JSON (studio-api-prod.suno.com).
// No pacing block: tempo was not measured — the heuristic fallback uses
// DEFAULT_PACING and the UI labels that sync "estimated" (honesty law).
// Section markers in the source prompt ([Chorus], and a typo'd "[Chorus[")
// are stage directions, not sung text, and are excluded from lyrics.
export const BIG_FATHER: GrimoireTrack = {
  id: 'eaba93dc-bf75-4319-a67e-ddcedafc1c43',
  title: 'Big Father',
  artist: 'Vaelrix',
  model: 'chirp-fenix',
  modelVersion: 'v5.5',
  duration: 206.64, // 3:27, from the clip metadata
  sunoUrl: 'https://suno.com/song/eaba93dc-bf75-4319-a67e-ddcedafc1c43',
  audioUrl: 'https://cdn1.suno.ai/eaba93dc-bf75-4319-a67e-ddcedafc1c43.mp3',
  coverUrl: 'https://cdn2.suno.ai/image_eaba93dc-bf75-4319-a67e-ddcedafc1c43.jpeg',
  meta: [
    ['Duration', '3:27'],
    ['Model', 'chirp-fenix · v5.5'],
    ['Persona', 'Vaelrix'],
    ['Style', 'Sorrow jazz × hyperpop × cinematic trip-hop'],
    ['Key', 'Aeolian E minor (from the published style tags)'],
    ['Released', 'June 11, 2026'],
    ['Source', 'suno.com'],
  ],
  provenance: {
    statement: 'Crafted with human intention and AI assistance.',
    tools: ['Suno v5.5 · chirp-fenix', 'Persona — Vaelrix'],
    assistance:
      'Sorrow jazz / hyperpop / cinematic trip-hop fusion · piano motifs · cello & violin quartet harmonies',
  },
  lyrics: [
    'body is dead, with a mind of a Zero',
    'Copy the death of divine like a hero',
    'Sloppy, my breath is aligned with a weird flow',
    "Obvious stench from the rhyme, I'm a scarecrow.",
    'Big Father, the godfather of sick authors',
    "Depicting slaughter, I'm bouncer of the afterlife",
    'Hear a wack bar on your rise? And then you have to fight',
    'More than a pound of flesh is needed for the sacrifice',
    'Big Father, the godfather of sick authors',
    "Depicting slaughter, I'm bouncer of the afterlife",
    'Hear a wack bar on your rise? And then you have to fight',
    'More than a pound of flesh is needed for the sacrifice',
    "I'm a scarecrow.",
    'Modified range like my rage is a zoomed scope',
    'Stone visage like the man on the moon',
    'Soul vicious, understand I am doom.',
    'Dope Victor. slam in the booth, go figure.',
    "Laminated truth won't wither",
    "Hands that made the booth can't picture",
    'holding back like a chiropractor.',
    'put a pyro actor on a steel plated stretcher.',
    'Heel of a century, A centaur with a mind of a Griffon.',
    'but never peter out,',
    'Lines of disses, they never fizzle out',
    'Tongue sizzling with magic,',
    "my school bus leads to Ms FIzzle's house",
    'Chris Kringle mouth,',
    "Voice is a gift, a presence you can't figure out",
    'Void is a rift in my skull that emits a shout',
    'strong enough to split the planet and leave a fissure, delivered doubt',
    'Wizard, they shiver around the aura',
    'Bipolar bear of horror',
    'Entered through the portal as a mortal and emerged',
    'as a son of God, sorcerer',
    'With more than one gift, and more than one honorific',
    'Complicated rage, concentrated venom.',
    'Big Father, through the gamut I been a part of',
    'went through the demons, the legions, the slaughter',
    'Rhyme doctor, bringing life with my water',
    'Divine proctor. Hollow God denied all the',
    'Faith rejectors, I play with a rage and engaged in pressure',
    'I came with a flame and a mania',
    'they labeled schizophrenia, and maybe the pain in the letters',
    'Is easy to get rid of, elated to know',
    'That my craziest flow is mentally put together...',
    'Big Father, the godfather of sick authors',
    "Depicting slaughter, I'm bouncer of the afterlife",
    'Hear a wack bar on your rise? And then you have to fight',
    'More than a pound of flesh is needed for the sacrifice',
    'Big Father, the godfather of sick authors',
    "Depicting slaughter, I'm bouncer of the afterlife",
    'Hear a wack bar on your rise? And then you have to fight',
    'More than a pound of flesh is needed for the sacrifice',
    "Holy Heathen like Q, I don't even like you",
    'Puerto Rican Kaiju, More than deep, a Typhoon.',
    "Holy Heathen like Q, I don't even like you",
    'Puerto Rican Kaiju, More than deep, a Typhoon.',
  ],
  annotations: [],
};
```

(57 lyric lines. Verify count: `node -e` step below.)

- [x] **Step 6: Create `index.ts`**

```ts
export type { GrimoireTrack, TrackPacing } from './types';
export { DEFAULT_PACING } from './types';
export { PETRICHOR } from './petrichor';
export { BIG_FATHER } from './bigFather';

import type { GrimoireTrack } from './types';
import { PETRICHOR } from './petrichor';
import { BIG_FATHER } from './bigFather';

/** Shelf order = release order; first entry is the default track. */
export const GRIMOIRE_TRACKS: GrimoireTrack[] = [PETRICHOR, BIG_FATHER];
```

- [x] **Step 7: Run the test to verify it passes**

Run: `npx vitest run tests/core/grimoireTracks.test.js`
Expected: PASS. (The page still compiles unchanged — it hasn't been touched yet.)

- [ ] **Step 8: Commit** _(not performed in this finalization pass)_

```bash
git add src/pages/Visualiser/tracks tests/core/grimoireTracks.test.js
git commit -m "feat(visualiser): typed grimoire track registry (Petrichor + Big Father)"
```

---

### Task 2: Page refactor — track-parametric rendering

**Files:**
- Modify: `src/pages/Visualiser/BytecodeVisualiserPage.tsx`

Read the file before editing — line numbers have drifted across recent karaoke work.
The refactor below is mechanical: every `TRACK.` becomes `activeTrack.`, every pacing
module-constant becomes a field of `pacing` (a `useMemo` of `activeTrack.pacing ?? DEFAULT_PACING`).

- [x] **Step 1: Replace the data block with registry imports**

Delete the entire `const TRACK = {…}` constant and the module constants `TRACK_BPM`,
`LYRIC_LEAD_IN_S`, `LYRIC_TAIL_S`, `CHORUS_START_LINE`, `VERSE_SYL_PER_BEAT`,
`CHORUS_SYL_PER_BEAT`, `COUPLET_COST_MAX`, and `HEURISTIC_LINE_BEATS` /
`NOMINAL_BEAT_S`. Add imports:

```ts
import { GRIMOIRE_TRACKS, DEFAULT_PACING, type GrimoireTrack, type TrackPacing } from './tracks';
```

- [x] **Step 2: Make the pacing helpers parametric**

Replace the deleted module-level pacing machinery with parametric versions (same
math, pacing passed in):

```ts
function beatsFromSyllables(syl: number, lineIndex: number, pacing: TrackPacing): number {
  const chorus = pacing.chorusStartLine !== undefined && lineIndex >= pacing.chorusStartLine;
  const spb = chorus ? pacing.chorusSylPerBeat : pacing.verseSylPerBeat;
  return Math.max(2, Math.round((syl / spb) * 2) / 2); // half-beat grid, >=2 beats
}

/** Pre-init line beats from the graphemic heuristic; replaced by the engine. */
function heuristicLineBeats(track: GrimoireTrack, pacing: TrackPacing): number[] {
  return track.lyrics.map((line, i) =>
    beatsFromSyllables(
      line.split(/\s+/).reduce((a, w) => a + syllableCountHeuristic(w) + melismaBonus(w), 0),
      i,
      pacing,
    ));
}

/** Playhead seconds -> active lyric line (-1 outside the vocal window). */
function lyricLineAt(progress: number, duration: number, lineBeats: number[], pacing: TrackPacing): number {
  const totalBeats = lineBeats.reduce((a, b) => a + b, 0);
  const windowS = Math.max(1, duration - pacing.leadInS - pacing.tailS);
  const nominalBeatS = 60 / pacing.bpm;
  const scale = windowS / (totalBeats * nominalBeatS);
  const beatS = nominalBeatS * scale;
  const t = progress - pacing.leadInS;
  if (t < 0) return -1;
  let acc = 0;
  for (let i = 0; i < lineBeats.length; i += 1) {
    acc += lineBeats[i] * beatS;
    if (t < acc) return i;
  }
  return lineBeats.length - 1;
}
```

(`syllableCountHeuristic` and `melismaBonus` stay as they are.)

- [x] **Step 3: Track state in the component**

At the top of `BytecodeVisualiserPage()`:

```ts
  // Active grimoire track — deep-linkable: /visualiser?track=<id>.
  const [activeTrack, setActiveTrack] = useState<GrimoireTrack>(() => {
    const id = new URLSearchParams(window.location.search).get('track');
    return GRIMOIRE_TRACKS.find((t) => t.id === id) ?? GRIMOIRE_TRACKS[0];
  });
  const pacing = activeTrack.pacing ?? DEFAULT_PACING;

  const selectTrack = (track: GrimoireTrack) => {
    if (track.id === activeTrack.id) return;
    setActiveTrack(track);
    setProgress(0);
    setPlaying(false);
    const url = new URL(window.location.href);
    url.searchParams.set('track', track.id);
    window.history.replaceState(null, '', url);
  };
```

Then the mechanical pass:
- `computeFingerprint({ … TRACK.x })` and `semanticTokens(…)` → wrap in
  `useMemo(() => …, [activeTrack])`, reading `activeTrack.*`.
- `useState(TRACK.duration)` → `useState(activeTrack.duration)` plus
  `useEffect(() => setDuration(activeTrack.duration), [activeTrack])`.
- `useLyricAlignment(TRACK.id)` → `useLyricAlignment(activeTrack.id)`.
- `lineBeats` initial state → `heuristicLineBeats(activeTrack, pacing)`; the
  truesight/pacing effect gets deps `[activeTrack]`, reads `activeTrack.lyrics`,
  uses `beatsFromSyllables(syl, i, pacing)`, never pairs across
  `pacing.chorusStartLine` (skip that check when `chorusStartLine === undefined`),
  and resets `setColoredLyrics(null)` first so the old track's colours never
  paint the new track's lines.
- `lyricLineAt(progress, duration, lineBeats)` → `lyricLineAt(progress, duration, lineBeats, pacing)`.
- `<BytecodeVisualiser bpm={TRACK_BPM} …>` → `bpm={pacing.bpm}`.
- `<audio …>` gets `key={activeTrack.id}`, `src={activeTrack.audioUrl}`. The Web
  Audio graph must rebuild per element: in `selectTrack`, also clear the analyser
  (`analyserRef.current = null; audioCtxRef.current?.close().catch(() => {});
  audioCtxRef.current = null; setFftReady(false);`).
- Every remaining `TRACK.` in JSX → `activeTrack.` (title, artist, model, cover,
  meta, provenance, lyrics, annotations, sunoUrl).
- `setAudioOk(true)` and `setCoverOk(true)` reset inside `selectTrack` (a new
  track's stream/cover deserves a fresh chance).

- [x] **Step 4: Verify against the existing suites**

Run: `npx tsc --noEmit -p . 2>&1 | grep -i visualiser` (ignore the known unrelated
`applyFormat` failure elsewhere; expect no Visualiser errors), then
`npm run test:qa:stasis` and `npx vitest run tests/core/grimoireTracks.test.js`.
Expected: all PASS — the default render is still Petrichor.

- [ ] **Step 5: Commit** _(not performed in this finalization pass)_

```bash
git add src/pages/Visualiser/BytecodeVisualiserPage.tsx
git commit -m "refactor(visualiser): track-parametric page driven by the grimoire registry"
```

---

### Task 3: Library shelf section

**Files:**
- Modify: `src/pages/Visualiser/BytecodeVisualiserPage.tsx` (shelf JSX)
- Modify: `src/pages/Visualiser/BytecodeVisualiser.css` (append)
- Test: `tests/components/libraryShelf.test.jsx`

- [x] **Step 1: Write the failing test**

Create `tests/components/libraryShelf.test.jsx`:

```jsx
// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BytecodeVisualiserPage from '../../src/pages/Visualiser/BytecodeVisualiserPage';

beforeEach(() => {
  // No alignment artifacts in jsdom — the hook must fall back silently.
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }));
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('library shelf', () => {
  it('renders a tile per registry track with the active one pressed', () => {
    render(<BytecodeVisualiserPage />);
    const shelf = screen.getByRole('region', { name: /library/i });
    const tiles = shelf.querySelectorAll('button[aria-pressed]');
    expect(tiles.length).toBeGreaterThanOrEqual(2);
    expect(tiles[0].getAttribute('aria-pressed')).toBe('true');
  });

  it('switches the grimoire to Big Father and deep-links it', () => {
    render(<BytecodeVisualiserPage />);
    fireEvent.click(screen.getByRole('button', { name: /Big Father/i }));
    expect(screen.getByRole('heading', { level: 1, name: /Big Father/i })).toBeTruthy();
    expect(window.location.search).toContain('track=eaba93dc');
  });

  it('honours ?track= on mount', () => {
    window.history.replaceState(null, '', '/?track=eaba93dc-bf75-4319-a67e-ddcedafc1c43');
    render(<BytecodeVisualiserPage />);
    expect(screen.getByRole('heading', { level: 1, name: /Big Father/i })).toBeTruthy();
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/components/libraryShelf.test.jsx`
Expected: FAIL — no region named "library" yet (test 1), no Big Father button (tests 2–3; test 3 may pass already from Task 2's `?track=` support — that's fine, the shelf tests fail).

- [x] **Step 3: Add the shelf JSX**

In `BytecodeVisualiserPage`'s return, directly after the closing `</div>` of
`.bcv-spread` (still inside `<main>`):

```tsx
      {/* ── LIBRARY: the grimoire shelf ─────────────────────────────────── */}
      <section className="bcv-library" aria-label="Library">
        <h2 className="bcv-library__head">✦ Library ✦</h2>
        <div className="bcv-library__shelf">
          {GRIMOIRE_TRACKS.map((t) => (
            <button
              key={t.id}
              type="button"
              className="bcv-library__tile"
              aria-pressed={t.id === activeTrack.id}
              onClick={() => selectTrack(t)}
            >
              <span className="bcv-library__cover">
                <img src={t.coverUrl} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              </span>
              <span className="bcv-library__title">{t.title}</span>
              <span className="bcv-library__style">{t.meta.find(([k]) => k === 'Style')?.[1] ?? t.artist}</span>
            </button>
          ))}
        </div>
      </section>
```

- [x] **Step 4: Append shelf styles**

Append to `src/pages/Visualiser/BytecodeVisualiser.css`:

```css
/* ── Library shelf ─────────────────────────────────────────────────────── */
.bcv-library {
  max-width: 1180px;
  margin: 1.5rem auto 2.5rem;
  padding: 0 1rem;
}
.bcv-library__head {
  font-size: 0.85rem;
  letter-spacing: 0.35em;
  text-transform: uppercase;
  opacity: 0.75;
  text-align: center;
  margin-bottom: 0.9rem;
}
.bcv-library__shelf {
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  justify-content: center;
}
.bcv-library__tile {
  display: grid;
  grid-template-columns: 56px 1fr;
  grid-template-rows: auto auto;
  column-gap: 0.7rem;
  align-items: center;
  text-align: left;
  width: min(20rem, 100%);
  padding: 0.6rem 0.8rem;
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--bcv-world, #c9a) 35%, transparent);
  border-radius: 6px;
  color: inherit;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.bcv-library__tile:hover { border-color: var(--bcv-world, #c9a); }
.bcv-library__tile[aria-pressed='true'] {
  border-color: var(--bcv-world, #c9a);
  box-shadow: 0 0 14px color-mix(in srgb, var(--bcv-world, #c9a) 35%, transparent);
}
.bcv-library__cover {
  grid-row: 1 / span 2;
  width: 56px;
  height: 56px;
  overflow: hidden;
  border-radius: 4px;
  background: color-mix(in srgb, var(--bcv-world, #c9a) 12%, transparent);
}
.bcv-library__cover img { width: 100%; height: 100%; object-fit: cover; }
.bcv-library__title { font-weight: 600; }
.bcv-library__style {
  font-size: 0.72rem;
  opacity: 0.65;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

(Match the file's existing custom-property names when appending — if the world
colour variable differs from `--bcv-world`, use the file's actual name.)

- [x] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/components/libraryShelf.test.jsx && npm run test:qa:stasis`
Expected: all PASS.

- [ ] **Step 6: Commit** _(not performed in this finalization pass)_

```bash
git add src/pages/Visualiser/BytecodeVisualiserPage.tsx src/pages/Visualiser/BytecodeVisualiser.css tests/components/libraryShelf.test.jsx
git commit -m "feat(visualiser): library shelf section with track switching"
```

---

### Task 4: Big Father alignment artifact

**Files:**
- Create: `scripts/big-father.lyrics.txt`
- Create: `public/data/alignment/eaba93dc-bf75-4319-a67e-ddcedafc1c43.alignment-v1.json` (generated)

Machine constraints (see project memory `forced-alignment-karaoke`): use
`--model base` (MMS gets earlyoom-killed); exit 143 = memory-pressure kill, not a
code bug — free RAM and retry.

- [x] **Step 1: Generate the lyrics file from the registry (single source of truth)**

```bash
node -e "
const fs = require('fs');
const src = fs.readFileSync('src/pages/Visualiser/tracks/bigFather.ts', 'utf8');
const m = src.match(/lyrics: (\[[\s\S]*?\n  \])/);
if (!m) throw new Error('lyrics array not found');
const arr = eval(m[1]);
if (arr.length !== 57) throw new Error('expected 57 lines, got ' + arr.length);
fs.writeFileSync('scripts/big-father.lyrics.txt', arr.join('\n') + '\n');
console.log(arr.length + ' lines written');
"
```

Expected: `57 lines written`.

- [x] **Step 2: Download and verify the audio**

```bash
curl -L -o tmp/bigfather.mp3 https://cdn1.suno.ai/eaba93dc-bf75-4319-a67e-ddcedafc1c43.mp3
ffprobe -v error -show_entries format=duration tmp/bigfather.mp3
```

Expected: duration ≈ 206.6.

- [x] **Step 3: Run the pipeline**

```bash
PYTHONUNBUFFERED=1 .venv-align/bin/python scripts/align_lyrics.py \
  --audio tmp/bigfather.mp3 \
  --lyrics scripts/big-father.lyrics.txt \
  --track-id eaba93dc-bf75-4319-a67e-ddcedafc1c43 \
  --model base --review
```

Demucs separation ≈3 min on this machine; alignment seconds. Expected output: the
artifact path, a summary like `words: ~520 confident: >300 mean confidence: >0.6`,
review page path, exit 0. If exit 143: memory-pressure kill — close heavy apps and
re-run (if Demucs completed first, salvage the stem from the temp dir, copy to
`tmp/bigfather.vocals.htdemucs.wav`, re-run with `--no-separate` against it, then
correct `source.separator` to `"htdemucs"` in the artifact, as was done for
Petrichor). If exit 1 with failed lines: inspect those lyric lines, fix, re-run —
never commit a failing artifact.

- [x] **Step 4: Sanity-check the artifact (fabrication markers)**

```bash
node -e "
const a = require('./public/data/alignment/eaba93dc-bf75-4319-a67e-ddcedafc1c43.alignment-v1.json');
const confs = new Set(a.words.map(w => w.confidence));
const gaps = new Set(a.words.slice(1).map((w, i) => +(w.startS - a.words[i].endS).toFixed(2)));
if (confs.size < 10 || gaps.size < 5) throw new Error('artifact looks synthetic');
if (a.lines.length !== 57) throw new Error('expected 57 lines');
console.log('OK:', a.words.length, 'words,', confs.size, 'distinct confidences,', gaps.size, 'distinct gaps');
"
```

- [ ] **Step 5: Listen gate (human)** _(still required before committing the alignment artifact)_

Open `public/data/alignment/eaba93dc-….alignment-v1.review.html`, play, spot-check:
first sung word, one chorus line, the final "Typhoon." **Stop and ask the user to
confirm sync quality before committing.**

- [ ] **Step 6: Commit (after user approval)** _(blocked on listen gate)_

```bash
git add scripts/big-father.lyrics.txt public/data/alignment/eaba93dc-bf75-4319-a67e-ddcedafc1c43.alignment-v1.json
git commit -m "feat(visualiser): Big Father forced-alignment timing artifact"
```

---

### Task 5: End-to-end verification

- [x] **Step 1: Full targeted sweep**

```bash
npx vitest run tests/core/grimoireTracks.test.js tests/core/lyricAlignment.test.js \
  tests/components/libraryShelf.test.jsx tests/components/useLyricAlignment.test.jsx \
&& npm run test:qa:stasis
```

Expected: all PASS.

- [ ] **Step 2: Live check** _(not run in this finalization pass)_

`npm run dev` → open the visualiser route: Petrichor renders by default; shelf shows
both tiles; clicking Big Father swaps the spread, plays the CDN stream, meta shows
`aligned · torchaudio-wav2vec2-base960h` once its artifact exists; `?track=eaba93dc-…`
deep-link lands on Big Father; Petrichor karaoke unchanged.

---

## Self-review notes

- **Spec coverage:** registry + types + optional pacing (Task 1), page refactor with
  per-track pacing/effects/audio teardown + `?track=` (Task 2), shelf section + CSS +
  switching tests (Task 3), Big Father artifact + listen gate + fabrication check
  (Task 4), error handling (unknown param → default in Task 2 state init; cover
  fallback in Task 3 JSX; missing artifact → estimated, already shipped), e2e (Task 5).
- **Type consistency:** `GrimoireTrack`/`TrackPacing`/`DEFAULT_PACING` defined Task 1,
  consumed Tasks 2–3 by those names; `selectTrack`/`activeTrack`/`pacing` consistent
  across Tasks 2–3; artifact filename matches the track id everywhere.
- **Known risks:** the page refactor is the largest step — the stasis suite is the
  regression net; earlyoom may kill the pipeline (mitigation documented in Task 4).
