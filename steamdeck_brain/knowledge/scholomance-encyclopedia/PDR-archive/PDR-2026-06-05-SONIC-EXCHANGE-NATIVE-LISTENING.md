# PDR: The Sonic Exchange — Scholomance-Native Listening Platform
## A reactive, AI-transparent music marketplace that buries Bandcamp on the listening experience

**Status:** Approved
**Date:** 2026-06-05
**Classification:** Architectural | Audio Engine | Data Model | Commerce | Discovery | UI + Rendering
**Priority:** High
**Primary Goal:** Turn the existing one-shot ambient player (`src/pages/Listen/`) into a full **artist → release → track** music platform with upload, discovery, social, and name-your-price commerce — where every track ships a precompiled **resonance sidecar** so the listening experience is a frame-synced reactive instrument, not a waveform strip; and where **AI provenance is a first-class, transparent feature** rather than contraband.

---

## 1. Executive Summary

Scholomance already owns the part of "a better Bandcamp" that is genuinely hard: a real-time, audio-reactive listening engine. `src/lib/ambient/ambientPlayer.service.js` (2,136 lines) is a full Web Audio pipeline — `AudioContext → MediaElementSource → AnalyserNode` (FFT 2048), percussive-transient detection, live BPM tracking, smooth crossfade tuning, `setSinkId` output routing, CORS-retry + embed fallback — feeding three Phaser visualizer scenes (`CrystalBallScene`, `SignalChamberScene`, `AlchemicalLabScene`) and a `SpectrumCanvas`. It already loads a **precompiled "resonance sidecar"** (`ResonanceTimeline`, `RESONANCE_TICK`) sampled at `audio.currentTime` for frame-synced visuals. Bandcamp's player, by comparison, is HTML5 `<audio>` plus a static SVG waveform.

What is missing is everything *around* the player — the unglamorous catalog and commerce layer:

- **No content model.** Content is five hardcoded "schools" pointing at frozen Suno CDN URLs (`src/data/sonicStationBuckets.js`). There is no artist, release, or track entity.
- **Audio upload was deliberately removed** (`src/hooks/useAmbientPlayer.ts:112` — *"Upload/archive stations were removed; clear any stale dynamic schools"*). The provider layer still supports arbitrary `"direct"` mp3 URLs (`src/lib/musicEmbeds.js`), so the plumbing is dormant, not absent.
- **No discovery, no transport UI** (we have `seek(offset)` but no scrubbable timeline), **no artist pages, no commerce.**

This PDR builds that layer on the rails already in the repo: the versioned SQLite/Turso migration system (now at v14 after the Accounts/OAuth PDR), the existing image-**upload route pattern** (`codex/server/routes/imageAnalysis.routes.js`), the **TurboQuant** semantic-search engine for discovery, the **Cell Wall** for engine→UI wiring, and the **bytecode error** transport for failures.

**The wedge.** The owner was banned from Bandcamp for using AI. Bandcamp's posture is prohibition-by-vibe: AI music is contraband, detection is opaque, appeals are a black box. The Sonic Exchange inverts this into a product advantage: a **Provenance Ledger** where model, prompt-lineage, human-edit ratio, and stems are *declared, signed, and displayed* as a badge of craft — not hidden. Transparency becomes the brand. That is the one thing Bandcamp structurally cannot copy without admitting AI music belongs on the platform.

---

## 2. Problem Statement

1. **The engine has no catalog to point at.** The best reactive player in the indie-music space is wired to five frozen URL arrays. It cannot represent "an artist with three releases and twelve tracks."
2. **Creators can't get music in.** Upload is removed; there is no ingest, transcode, or per-track sidecar compilation.
3. **Listeners can't find anything.** No browse, search, tags, mood, or recommendation surface.
4. **There is no transport contract.** No progress/scrub, queue, gapless, or per-release tracklist. The player loops one randomly-picked track per school.
5. **There is no way to support an artist.** No purchase, no name-your-price, no download, no payout.
6. **AI provenance is unowned territory.** Every other platform treats it as a liability to police. Nobody treats it as a feature to celebrate. That gap is the entire reason this product can exist.

---

## 3. Product Goal

A self-hostable, zero-cost-tier-friendly music platform where:

- An artist signs in (accounts/OAuth already shipped), uploads a release, and **every track is auto-fingerprinted and given a compiled resonance sidecar** so it plays back as a reactive audiovisual piece on any device.
- A listener browses by **school taxonomy + semantic vibe search**, plays gapless queues with a scrubbable waveform, drops **timestamp-anchored comments**, follows artists, and embeds the **holographic player** (`HolographicEmbed.jsx`) anywhere.
- A fan supports an artist via **name-your-price** purchase and gets a real download with an embedded provenance manifest.
- AI-assisted work wears its **Provenance Ledger** openly: model, prompt lineage, stem availability, human-edit ratio — declared by the artist, surfaced as a filterable, sortable, *desirable* attribute.

---

## 4. Non-Goals

- **Not a streaming royalty/PRO clearinghouse.** No Spotify-style mechanical licensing in v1.
- **Not a DAW.** We compile reactive sidecars; we do not edit audio in-browser.
- **Not an AI music *generator*.** We host, fingerprint, and celebrate AI-assisted music; generation stays in the artist's own tools (Suno, etc.). We are the gallery, not the brush.
- **Not a social network rebuild.** Follows + timestamped comments + activity feed only; no DMs, no groups in v1.
- **Not abandoning the existing ambient "station" mode.** The school-tuned ambient cockpit (`ListenPage.tsx`) stays as a *discovery surface*; it becomes one view onto the catalog, not a separate dead-end.

---

## 5. Core Design Principles

1. **The sidecar is the moat.** Every track gets a precompiled `ResonanceTimeline`. The reactive experience must work even when live FFT is denied (CORS, iOS Safari, embeds) — the sidecar is the deterministic fallback *and* the primary art layer. This is what Bandcamp cannot ship.
2. **Provenance is a feature, not a confession.** Transparency is the product. The ledger is signed, immutable per-version, and *boasted about* in UI.
3. **Reuse the rails.** Migrations on the existing versioned system; uploads on the existing image-route pattern; discovery on TurboQuant; engine→UI through the Cell Wall; failures through bytecode errors. No parallel infrastructure.
4. **Zero-cost-tier honest.** Storage and transcode must fit the `zero_cost_infrastructure_pdr` ethos (object storage + on-demand/queue transcode, not an always-on render farm).
5. **Degrade, never break.** Every richer capability (live FFT → sidecar → static waveform; lossless → mp3; download → stream-only) has a defined fallback. Honesty over hype: a track with no sidecar says so.
6. **The catalog is the source of truth.** `sonicStationBuckets.js` becomes a *seed*, then a DB-backed view. No feature may re-hardcode content.

---

## 6. Current-State Facts (verified)

- **Engine:** `src/lib/ambient/ambientPlayer.service.js` — `createTrackController` builds an `<audio>` (`crossOrigin="anonymous"`, `loop`) → `createMediaElementSource` → `AnalyserNode` (`fftSize 2048`, `smoothingTimeConstant 0.8`). Percussive pulse via `getPercussivePulseLevelFromWaveform`; `BPM_TRACKING_CONFIG` EMA tempo; fade in/out (`fadeControllerVolume`); crossfade "tuning" state machine; `applySinkId` device routing; Suno-embed iframe fallback when direct audio fails.
- **Resonance sidecar:** `loadResonanceSidecar(fingerprintId, durationMs)` fetches a compiled JSON via `resolveResonanceUrl`, builds a `ResonanceTimeline`, validates duration (`validateDurationSync`), and emits `RESONANCE_TICK` each rAF at `audio.currentTime`. Keyed today off `schoolConfig.resonanceFingerprintId`.
- **Visualizers:** `src/pages/Listen/scenes/{CrystalBallScene,SignalChamberScene,AlchemicalLabScene}.js`, plus `CrystalBallVisualizer.tsx`, `SpectrumCanvas`. Phaser 4 (per `PDR-2026-06-04-PHASER4-COMBAT-SPIKE`).
- **Embed:** `src/pages/Listen/HolographicEmbed.jsx` (18 KB) already exists — an embeddable player concept.
- **Content model today:** `src/data/sonicStationBuckets.js` — `Object.freeze` buckets `{ SONIC, VOID, WILL, ALCHEMY, PSYCHIC } → string[]` of Suno mp3 URLs. Helpers: `getSonicStationTrackPool`, `pickRandomSonicStationTrack`.
- **Providers:** `src/lib/musicEmbeds.js` → `getTrackEmbedConfig` resolves `suno` and `direct` providers; `direct` + an `audioUrl` is the upload path we will feed.
- **Upload removed:** `src/hooks/useAmbientPlayer.ts:112-115`.
- **Server:** Fastify 5 (`codex/server/index.js`); `better-sqlite3` local (`scholomance_user.sqlite`) or Turso; versioned `USER_MIGRATIONS` (v1–v14 after the OAuth PDR); async `db.execute(sql, params)`; SQLite write queue (`codex/server/db/sqliteWriteQueue.js`).
- **Upload pattern exists:** `codex/server/routes/imageAnalysis.routes.js` + `codex/server/services/imageDuplication.service.js` (multipart ingest, dedup) — the template for audio ingest.
- **Auth:** accounts + sessions + OAuth foundation per `PDR-2026-06-03-ACCOUNTS-EMAIL-OAUTH.md`; `user_identities` (v14). Artists are users.
- **Discovery substrate:** TurboQuant (`turboquant_integration_bridge_pdr.md`, `codex/server/services/codebaseSearch.service.js`) — reusable for catalog semantic search.

---

## 7. Change Classification

| Dimension | Classification | Reason |
|-----------|---------------|--------|
| `artists / releases / tracks / track_assets` tables (migration v15) | Structural (additive) | New catalog entities; no existing columns changed |
| `track_provenance` table (v16) | Structural (additive) | Signed AI-provenance ledger, versioned |
| `track_resonance` table + sidecar store (v17) | Structural (additive) | Sidecar fingerprint registry; binds engine to catalog |
| `track_lyrics / track_annotations` tables (v18) | Structural (additive) | Lyrics and annotations substrate |
| `purchases / payouts` tables (v19) | Structural (additive) | Commerce ledger |
| `follows / track_comments / plays` tables (v20) | Structural (additive) | Social + analytics |
| Audio ingest route + transcode/sidecar worker | Structural | New `/artist/*` upload routes on the image-route pattern |
| `getTrackEmbedConfig` catalog-id resolution | Additive | Resolve `track:<id>` → asset URL alongside `suno`/`direct` |
| `ambientPlayer.service` sidecar keying | Behavioral | Key sidecar off `track.fingerprintId`, not `school.resonanceFingerprintId` |
| Transport UI (scrub/queue/gapless) | UI | New player chrome; reuses `seek`, analyser, sidecar |
| Discovery surfaces (browse/search/artist pages) | UI | New routes on existing SPA |
| `sonicStationBuckets.js` | Behavioral (demotion) | Becomes a DB seed, not the source of truth |

---

## 8. Architecture

```
                       ┌────────────────────────────────────────────────┐
                       │                 SPA (React, Vite)               │
   Discovery  ─────────┤  Browse · Vibe Search · Artist Page · Release   │
   Player     ─────────┤  Reactive Player (transport + Phaser scenes)    │
   Studio     ─────────┤  Upload · Provenance Ledger · Payouts           │
   Embed      ─────────┤  HolographicEmbed (iframe, public)              │
                       └───────────────┬─────────────────┬──────────────┘
                                       │ REST + session   │ sidecar JSON / audio
                       ┌───────────────▼─────────────────▼──────────────┐
                       │              Fastify 5 API (codex/server)        │
   /artist/upload  ────┤  multipart ingest → queue                       │
   /catalog/*      ────┤  artists/releases/tracks/search (TurboQuant)    │
   /commerce/*     ────┤  name-your-price · checkout · download grants   │
   /social/*       ────┤  follows · timestamp comments · plays           │
                       └───────┬───────────────┬───────────────┬─────────┘
                               │               │               │
                   ┌───────────▼──┐   ┌────────▼────────┐  ┌───▼─────────┐
                   │ SQLite/Turso │   │ Object storage  │  │  Transcode  │
                   │ catalog +    │   │ audio assets +  │  │  + Sidecar  │
                   │ provenance + │   │ sidecar JSON +  │  │  Compiler   │
                   │ commerce     │   │ art + downloads │  │  (worker)   │
                   └──────────────┘   └─────────────────┘  └─────────────┘
```

**Key flow — ingest → reactive:** artist uploads master → ingest validates + stores original → transcode worker produces stream mp3 (+ optional lossless download asset) → **sidecar compiler** runs offline FFT/onset/tempo analysis once and emits a `ResonanceTimeline` JSON → `track_resonance.fingerprintId` registered → player loads track, `resolveResonanceUrl(fingerprintId)` already wired, scenes react frame-synced on every device. The expensive analysis happens **once at upload**, not per-play — that is why the experience is richer than live-FFT-only competitors and works inside sandboxed embeds.

---

## 9. Data Model

```sql
-- migration v15: catalog core
CREATE TABLE IF NOT EXISTS artists (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL,
  handle       TEXT NOT NULL UNIQUE,           -- @slug, used in URLs
  display_name TEXT NOT NULL,
  bio          TEXT,
  avatar_url   TEXT,
  banner_url   TEXT,
  primary_school TEXT,                          -- SONIC|VOID|WILL|ALCHEMY|PSYCHIC
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS releases (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  artist_id    INTEGER NOT NULL,
  slug         TEXT NOT NULL,
  title        TEXT NOT NULL,
  kind         TEXT NOT NULL DEFAULT 'album',   -- album|single|ep
  cover_url    TEXT,
  about        TEXT,
  price_mode   TEXT NOT NULL DEFAULT 'nyp',     -- free|nyp|fixed
  price_min_cents INTEGER NOT NULL DEFAULT 0,
  currency     TEXT NOT NULL DEFAULT 'USD',
  visibility   TEXT NOT NULL DEFAULT 'draft',   -- draft|public|unlisted
  published_at DATETIME,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(artist_id, slug),
  FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tracks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  release_id   INTEGER NOT NULL,
  position     INTEGER NOT NULL,
  title        TEXT NOT NULL,
  duration_ms  INTEGER,
  school       TEXT,                            -- per-track school tag (vibe)
  explicit     INTEGER NOT NULL DEFAULT 0,
  stream_url   TEXT,                            -- transcoded mp3 (object storage)
  download_url TEXT,                            -- gated lossless/mp3 (purchase)
  waveform_url TEXT,                            -- precomputed peaks JSON
  fingerprint_id TEXT,                          -- → track_resonance / sidecar
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(release_id, position),
  FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS track_tags (
  track_id INTEGER NOT NULL,
  tag      TEXT NOT NULL,                        -- free-form genre/mood
  PRIMARY KEY (track_id, tag),
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);
```

```sql
-- migration v16: provenance ledger (the wedge)
CREATE TABLE IF NOT EXISTS track_provenance (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  track_id      INTEGER NOT NULL,
  version       INTEGER NOT NULL DEFAULT 1,
  origin        TEXT NOT NULL,                   -- human|ai_assisted|ai_generated|hybrid
  model         TEXT,                            -- e.g. 'suno-v4', 'udio-1.5'
  prompt_lineage TEXT,                           -- JSON: prompts/seeds/iterations (artist-declared)
  human_edit_ratio REAL,                         -- 0..1 declared
  stems_available INTEGER NOT NULL DEFAULT 0,
  license       TEXT NOT NULL DEFAULT 'all_rights_reserved',
  declared_by   INTEGER NOT NULL,                -- users.id
  signature     TEXT,                            -- HMAC over canonical JSON (tamper-evident)
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_provenance_track ON track_provenance(track_id, version);
```

```sql
-- migration v17: resonance sidecar registry (binds engine to catalog)
CREATE TABLE IF NOT EXISTS track_resonance (
  fingerprint_id TEXT PRIMARY KEY,               -- sha256(stream asset) prefix
  track_id       INTEGER NOT NULL,
  sidecar_url    TEXT NOT NULL,                  -- compiled ResonanceTimeline JSON
  schema_version TEXT NOT NULL,
  analysis_version TEXT NOT NULL,
  source_duration_ms INTEGER NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending',-- pending|ready|failed
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);
```

```sql
-- migration v19: commerce
CREATE TABLE IF NOT EXISTS purchases (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER,                          -- null = guest (email-only)
  email        TEXT,
  release_id   INTEGER,
  track_id     INTEGER,                          -- one of release_id/track_id set
  amount_cents INTEGER NOT NULL,
  currency     TEXT NOT NULL DEFAULT 'USD',
  provider     TEXT NOT NULL DEFAULT 'stripe',
  provider_ref TEXT,                             -- payment intent id
  download_token TEXT,                           -- single-use, hashed
  status       TEXT NOT NULL DEFAULT 'pending',  -- pending|paid|refunded
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS payouts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  artist_id    INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'accrued',  -- accrued|requested|paid
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE
);
```

```sql
-- migration v20: social + analytics
CREATE TABLE IF NOT EXISTS follows (
  follower_id INTEGER NOT NULL,                  -- users.id
  artist_id   INTEGER NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (follower_id, artist_id)
);
CREATE TABLE IF NOT EXISTS track_comments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  track_id    INTEGER NOT NULL,
  user_id     INTEGER NOT NULL,
  at_ms       INTEGER,                            -- timestamp anchor (SoundCloud-style)
  body        TEXT NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS plays (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  track_id    INTEGER NOT NULL,
  user_id     INTEGER,
  ms_played   INTEGER NOT NULL DEFAULT 0,
  source      TEXT,                               -- web|embed|station
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

`persistence` APIs (mirroring `userPersistence.*` shape): `catalog.artists.*`, `catalog.releases.*`, `catalog.tracks.*`, `catalog.provenance.*`, `catalog.resonance.*`, `commerce.purchases.*`, `commerce.payouts.*`, `social.follows.*`, `social.comments.*`, `analytics.plays.*`.

---

## 10. The Bells and Whistles (feature surface)

**Listening (the part that beats Bandcamp):**
- **Reactive playback by default** — every track drives the Phaser scenes via its sidecar; live FFT layers on top when available; static waveform is the floor.
- **Scrubbable waveform** from precomputed `waveform_url` peaks, with **timestamp comment pins**.
- **Gapless + crossfade queue** — generalize the existing tuning crossfade to album playback; queue model on top of `setSchool`.
- **Per-track "vibe skin"** — `school` selects palette/scene (`schoolAudio.config`), so a release can choreograph its own visual journey track-to-track.
- **Holographic embed** — `HolographicEmbed.jsx` made public + signed; sidecar makes it reactive even sandboxed.
- **Output-device routing + haptics** already in-engine; expose in transport.

**For artists (the Studio):**
- Drag-drop upload → auto transcode → **auto sidecar compile** → preview reactive player before publish.
- **Provenance Ledger editor** — declare origin/model/prompt-lineage/stems/human-edit ratio; signed at save; rendered as a badge.
- Name-your-price / fixed / free per release; payout ledger; basic stats from `plays`.

**Discovery:**
- Browse by **school** + tag; **semantic "find me something that feels like…" search via TurboQuant** over track text + tags + provenance.
- **"Made with AI, proudly" filter** — sort/boost by provenance transparency. The anti-Bandcamp front page.
- Artist pages, release pages, activity feed for followed artists.

**The Provenance wedge, concretely:**
- A **"Glass Box" badge** on every AI-assisted track: tap to see model, declared prompt lineage, human-edit ratio, stem availability.
- Provenance is **signed** (HMAC) and **versioned** — edits create a new version, the history is visible. Trust through receipts, not policing.
- Downloads embed a provenance manifest (sidecar `id3`/JSON), so the transparency travels with the file.

---

## 11. The Grimoire Spread — UI Mandate (centerpiece)

> **Canonical reference:** [`docs/images/concept-grimoire-spread.png`](../../images/concept-grimoire-spread.png) (1672×941). This image is the binding visual contract for the listening surface; the descriptions below are extracted from it and govern implementation.

The entire listening experience is a single **open grimoire** — a leather-bound tome on a near-black ground, gilt filigree corners, two facing parchment pages, a brass transport bar set into the spine's lower edge, and a vertical icon rail on the outer left. It is **not** a conventional player chrome. Left page = the song's *meaning* (human-legible). Right page = the song's *identity* (machine-derived, deterministic). The seam between them is the product thesis: **"THE PATTERN IS LAW · THE SOUND IS CODE"** (rendered along the right page's lower border).

### 11.1 Left page — "VERSES & VERITAS" (meaning)

Top-to-bottom, exactly as in the concept:
- **Header cartouche:** `✦ VERSES & VERITAS ✦`.
- **Title block:** song title in large engraved serif caps (`ECHOES OF THE VEIL`) with a small inline sigil; artist below in gilt small-caps (`LUMEN ARCANUM`); `from the album <RELEASE>` line.
- **Single centered cover art**, square, framed like an inset plate (the only raster image on the page).
- **Metadata column** (left), iconed rows: `DURATION`, `BPM`, `KEY`, `GENRE`, `FILE TYPE` (e.g. `FLAC · 24bit · 48kHz`), `RELEASED`.
- **PROVENANCE column** (right) — *the wedge, displayed proudly, not hidden*: a one-line credo ("Crafted with human intention and AI assistance."), `TOOLS & MODEL` (e.g. `Suno v3.5`, `Custom Lyric Model`, `Runecore™`), `ASSISTANCE` (e.g. harmonic generation, texture layering, mastering polish). This panel is rendered from the **signed `track_provenance` ledger** (§9, `provenance.sign.js`).
- **Lyrics**, line-numbered `01..N`. The **currently-sung line is highlighted** in warm gilt (karaoke); highlight advances from timed lyric data (§11.3). Past/future lines sit in muted ink.
- **Annotations (Genius-style):** cards in the right gutter, each tied to a line number by a dotted leader, expandable (`▾ VIEW MORE / VIEW LESS`), e.g. *"05 Echoes Call — the 'veil' is the threshold between the known and forgotten."* Rendered from `track_annotations` (§11.3), anchored to a line range.
- **Transport bar** (spans the spine's foot): elapsed `2:18`, scrubbable progress, total `4:37`, and shuffle / prev / **play-pause (large, centered)** / next / repeat — brass, inset.

### 11.2 Right page — "BYTECODE VISUALISER · Deterministic Visual Experience" (identity)

This is the `visual.genome.js` engine made visible. **No live audio is read at render time** — every element is derived once, at upload, from the audio's checksum fingerprint + semantic cues, so it is byte-identical on every device and immune to browser/Web-Audio/CORS/iOS pitfalls. Panels, as in the concept:
- **SONG FINGERPRINT** (`7F3A-9C1D-2B6E-E7A9`) and **SHA-256 CHECKSUM** (hex blocks) — from `tracks.fingerprint_id` / `track_resonance`.
- **BYTECODE SEED** (`0xVEIL-136-Dm`) and **DETERMINISTIC ENGINE** (`GlyphCore vX`) — from `genome.readouts.bytecodeSeed` + `GLYPHCORE_ENGINE` (shipped).
- **Center sacred-geometry render** — concentric rings, an eye-in-triangle, rune circle, vertical light beam, particle bloom; driven by `genome.archetype / symmetry / palette / glyphs / layers`, **modulated over time by the resonance sidecar** (genome = instrument, sidecar = score).
- **SEMANTIC MAP** — dotted list of extracted themes (`Veil, Threshold, Memory, Echo, …`) from `genome.readouts.semanticMap`.
- **ENERGY MATRIX** — constellation dot-grid (sidecar band energies).
- **SPECTRAL ANALYSIS** — two precomputed spectrum/waveform plots (sidecar).
- **COORDINATES** (`X/Y/Z`) and **RITUAL SYNC** (`PHASE`, `CYCLE n/7`) — from `genome.readouts.coordinates` / `ritualSync` (shipped).
- **Lower border:** runic frieze + the credo line.

### 11.3 Data-model deltas this mandate requires

The concept reveals fields beyond Phase-0 catalog; fold into **migration v18** (lyrics + annotations + track musical metadata):

```sql
-- migration v18: lyrics, annotations, track musical metadata
ALTER TABLE tracks ADD COLUMN bpm REAL;            -- "BPM 136"
ALTER TABLE tracks ADD COLUMN musical_key TEXT;    -- "KEY D minor" / "Dm"
ALTER TABLE tracks ADD COLUMN genre TEXT;          -- "Darkwave / Occult Electronica"

CREATE TABLE IF NOT EXISTS track_lyrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  track_id INTEGER NOT NULL,
  line_index INTEGER NOT NULL,            -- 0-based; "01.." in UI
  start_ms INTEGER,                        -- karaoke highlight in
  end_ms INTEGER,                          -- highlight out
  text TEXT NOT NULL,
  words_json TEXT,                         -- optional [{t,d,w}] word-level timing
  UNIQUE(track_id, line_index),
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS track_annotations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  track_id INTEGER NOT NULL,
  start_line INTEGER NOT NULL,             -- anchor (inclusive)
  end_line INTEGER NOT NULL,               -- anchor (inclusive); == start_line for single-line
  title TEXT,                              -- e.g. "Echoes Call"
  body TEXT NOT NULL,
  author_user_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);
```

`catalogPersistence.lyrics.*` (replaceForTrack, listByTrack) and `catalogPersistence.annotations.*` (create, listByTrack) follow the Phase-0 persistence shape. The right-page readouts need **no table** — they are pure derivations of the fingerprint (already deterministic via `deriveVisualGenome`).

### 11.4 Navigation taxonomy (outer-left rail)

The app's primary nav is the tome's tabbed edge, top icon = global play/pause, then: **LIBRARY · GRIMOIRE · RITUALS · CODEX · ARTIFACTS · HISTORY**. (GRIMOIRE = this spread; LIBRARY = browse/discovery; the rest map to existing/forthcoming surfaces — names are canon from the concept.)

### 11.5 Palette tokens (wand-extracted from the concept)

Extracted via PixelBrain-style color-byte sampling of the concept (`ffmpeg palettegen`, dominant set) + the small-area arcane accents read directly:

| Token | Hex | Role |
|---|---|---|
| `--ink-black` | `#110b0d` | tome ground / deepest shadow |
| `--leather` | `#231b2b` → `#321e0f` | cover, page edges (violet-brown) |
| `--bronze` | `#89643e` / `#ab8c6f` | filigree, rules, iconography |
| `--gold` | `#c9a55a` | titles, highlighted lyric line, accents |
| `--parchment` | `#dbc5a9` / `#ceb597` | page fill |
| `--ink` | `#2a1d12` | body text on parchment |
| `--arc-magenta` | `#c026d3` | right-page geometry primary |
| `--arc-violet` | `#7c3aed` | right-page geometry secondary |
| `--arc-cyan` | `#22d3ee` | right-page accents / spectral |

These seed the SPA's grimoire theme; the **per-track** right-page palette still comes from `genome.palette` (school-anchored), layered over the arcane base.

### 11.6 Reduced-motion & degrade

Honor `usePrefersReducedMotion` (existing): the right page renders the genome as a **still plate** (no sidecar modulation) under reduced motion, and as a static plate whenever a sidecar is absent — never blank. The left page is fully functional with zero motion.

---

## 12. Audio Ingest, Transcode & Sidecar Compilation

1. **Ingest** (`POST /artist/releases/:id/tracks`, multipart) — reuse `imageAnalysis.routes.js` pattern (size/type guards, dedup hash via `imageDuplication.service` analog). Store original in object storage; create `tracks` row `status=pending`.
2. **Transcode worker** — produce `stream.mp3` (e.g. 192k) + optional download asset; compute `waveform.json` peaks; write `stream_url`, `waveform_url`, `duration_ms`.
3. **Sidecar compiler** — run the **same analysis math already in the engine** offline (`getPercussivePulseLevelFromWaveform`, BPM EMA, FFT bands) over the full decoded buffer to emit a `ResonanceTimeline`-schema JSON. Register `track_resonance(fingerprint_id, sidecar_url, status='ready')`; set `tracks.fingerprint_id`.
4. **Playback** — `getTrackEmbedConfig` resolves `track:<id>` → `stream_url` (provider `direct`); `ambientPlayer.service` keys `loadResonanceSidecar` off `track.fingerprint_id` instead of `school.resonanceFingerprintId`. **No engine rewrite** — one keying change + a catalog resolver.

**Cost posture (zero-cost-tier honest):** transcode + sidecar are queued, on-demand, idempotent (keyed by content hash); they never run per-play. Failures emit a bytecode error and degrade the track to "live-FFT only, no sidecar" with an honest UI badge.

---

## 13. Implementation Phases

**Phase 0 — Seed the model (unblocked).** Migrations v15–v17; `catalog.*` + `provenance.*` + `resonance.*` persistence with tests; import `sonicStationBuckets.js` as a seed artist ("Scholomance Station") so the catalog is non-empty day one.

**Phase 1 — Player on catalog.** `getTrackEmbedConfig` resolves `track:<id>`; sidecar keyed off `track.fingerprint_id`; transport UI (scrub + queue + gapless) over the existing engine; release/artist read pages. *Milestone: play a DB release end-to-end with reactive scenes.*

**Phase 2 — Ingest + sidecar.** Upload route + transcode worker + sidecar compiler; Studio upload→preview→publish. *Milestone: an artist uploads a track and hears it react without writing any JSON.*

**Phase 3 — Provenance wedge.** Ledger editor, signing, Glass Box badge, "Made with AI, proudly" discovery filter, download manifest embedding.

**Phase 4 — Discovery + social.** TurboQuant vibe search; tags/browse; follows; timestamp comments; activity feed; play analytics (v20).

**Phase 5 — Commerce.** Stripe name-your-price checkout (v19); single-use download grants; payout ledger; guest (email-only) purchases.

**Phase 6 — Embed + polish.** Public signed `HolographicEmbed`; oEmbed; QA, a11y (reduced-motion already supported), perf budget on scenes.

---

## 14. ByteCode IR / Error Design

Reuse `codex/core/pixelbrain/bytecode-error.js`. New codes (proposed) under existing categories:
- `INGEST_REJECTED` (VALUE) — bad type/size/dedup hit.
- `TRANSCODE_FAILED` (STATE) — worker failure; track stays `pending`.
- `SIDECAR_COMPILE_FAILED` (STATE) — degrade to live-FFT-only; surface honest badge.
- `PROVENANCE_SIGNATURE_INVALID` (VALUE) — tamper-evidence on ledger read.
- `PURCHASE_GRANT_INVALID` (STATE) — expired/used download token.

All failures are non-fatal to the page; the player always falls back down the degrade ladder (§5.5).

---

## 15. QA Requirements

- **Persistence:** unit tests for every `catalog.*/commerce.*/social.*` API incl. cascade deletes; migrations apply clean on better-sqlite3 **and** Turso (parity with the OAuth PDR bar).
- **Sidecar parity:** golden test that the offline compiler and the in-engine analysis agree within tolerance on a fixture track (same `getPercussivePulseLevelFromWaveform` output envelope).
- **Degrade ladder:** test live-FFT-denied (no CORS) → sidecar plays; sidecar-missing → static waveform; download-only-on-purchase enforced.
- **Provenance signing:** tamper a stored ledger row → read raises `PROVENANCE_SIGNATURE_INVALID`.
- **Commerce:** name-your-price floor enforced; download token single-use; refund flips status; guest purchase deliverable by email.
- **Security:** upload type/size guards; signed embeds; per-artist authz on Studio routes; no unauth payout requests.
- **A11y/perf:** scenes honor `usePrefersReducedMotion`; scene frame budget; lint + typecheck + vitest green.

---

## 16. Success Criteria

- [ ] Migrations v15–v20 applied on both DB backends.
- [ ] A DB-backed release plays end-to-end with reactive Phaser scenes (no hardcoded URLs in the path).
- [ ] An artist uploads a track and gets an auto-compiled reactive sidecar with zero manual JSON.
- [ ] Provenance Ledger: declare → sign → Glass Box badge → "Made with AI, proudly" filter works.
- [ ] Scrubbable waveform + timestamp comments + gapless queue.
- [ ] Name-your-price purchase yields a single-use download with embedded provenance manifest.
- [ ] Public signed holographic embed reacts via sidecar inside a sandboxed iframe.
- [ ] TurboQuant vibe search returns relevant tracks; follows + feed live.
- [ ] `sonicStationBuckets.js` is a seed only; no feature re-hardcodes content.
- [ ] Lint + typecheck + vitest green; degrade ladder verified.

---

## 17. Risk Checklist

- ❏ **Rights & DMCA** — uploads need a takedown path + report flow before public commerce (legal surface, not engineering).
- ❏ **Provenance is self-declared** — frame honestly as *artist-attested*, signed + versioned; do not claim detection we don't do (honesty over hype).
- ❏ **Storage/egress cost** — object storage + CDN; sidecar/transcode idempotent + queued; never per-play.
- ❏ **Sidecar drift** — compiler analysis version pinned; `validateDurationSync` already guards desync.
- ❏ **Payment/tax/payout** — Stripe Connect or manual payout ledger in v1; KYC is the real cost center.
- ❏ **iOS Safari autoplay** — engine already handles user-gesture unlock + embed fallback; keep it.
- ❏ **Scope creep into a DAW / generator** — hard non-goal (§4).
- ❏ **Don't regress the ambient station** — it becomes a catalog view, not a casualty.

---

## 18. Glossary

| Term | Definition |
|------|-----------|
| **Resonance sidecar** | Precompiled `ResonanceTimeline` JSON per track; sampled at `audio.currentTime` to drive visuals frame-synced, independent of live FFT. The moat. |
| **Fingerprint id** | Content-hash key binding a track's stream asset to its sidecar (`track_resonance`). |
| **Provenance Ledger** | Signed, versioned, artist-declared record of how a track was made (model, prompt lineage, human-edit ratio, stems). The wedge. |
| **Glass Box badge** | UI affordance exposing the Provenance Ledger; transparency-as-feature. |
| **School** | Existing Scholomance taxonomy (SONIC/VOID/WILL/ALCHEMY/PSYCHIC) used as the platform's native genre/vibe axis and scene/palette selector. |
| **Degrade ladder** | Defined fallback chain: live FFT → sidecar → static waveform; lossless → mp3; download → stream-only. |
| **Name-your-price (NYP)** | Pricing mode with a `price_min_cents` floor (incl. 0 = free), Bandcamp-style. |
| **Station mode** | The existing school-tuned ambient cockpit (`ListenPage.tsx`), retained as a discovery surface onto the catalog. |
