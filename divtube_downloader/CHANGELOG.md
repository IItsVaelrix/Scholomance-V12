# Changelog — DivTube_downloader

All notable changes to this app are recorded here.
Format follows [Keep a Changelog](https://keepachangelog.com/); this app is at **v1.0-SNAPSHOT**.

## [Unreleased] — 2026-06-22

### Security
- **Removed hardcoded API keys** from `test_key.py` and `list_models.py`; both now
  read `GEMINI_API_KEY` from the environment and fail fast if it is unset.
- Added `_env.py` — a zero-dependency `.env` loader (real environment variables
  always take precedence over `.env` values).
- Added `.env.example` documenting every required key with placeholders.
- Added a local `divtube_downloader/.gitignore` so `.env`, `.venv/`, `build/`,
  `.gradle/`, `*.log`, `divtube_memory.db`, and `niche_database.sqlite` can never
  be committed.
- Deduplicated `.env` — collapsed four conflicting `CUSTOM_API_BASE` / `CUSTOM_MODELS_URL`
  blocks down to the single active provider (OpenCode).

> ⚠️ Any keys previously committed in plaintext should be treated as compromised
> and rotated (Gemini, xAI/Grok, OpenCode).

### Added
- **`Esc` now stops a running agent.** Cancels in-flight work and resets the
  loading bar: killable subprocesses (`/analyze`, `/download` via the Java
  backend) are terminated, and thread/network agents (`/critique`,
  `/scholomance`) are invalidated via a generation token so their late output is
  dropped. Bound in the footer as **Stop**; idle `Esc` is a no-op.
  (See `tests/test_agent_stop.py`.)
- **`@` file picker now connects to the Archive of Dominance.** When the
  Scholomance bridge is online, typing `@` searches the full corpus (~34K files)
  via server-side path matching instead of only the local project. Falls back to
  the local picker when the archive is offline.
- `ArchiveBridge.search_paths(query, limit)` and `ArchiveBridge.list_paths(limit)`
  — synchronous methods returning plain path lists for the picker.
- Filesystem-walk fallback for the `@` picker so it still populates when the
  project is untracked by git (respects the standard ignore dirs, caps at 5000
  entries).
- Regression test suite `tests/test_file_select_modal.py`.

### Fixed
- **`@` find-file modal crashed on every keystroke.** The modal's key handler was
  named `handle_key`, which collides with a reserved async hook on Textual's
  `Widget` (`_on_key` does `await self.handle_key(...)`); the sync override
  returned `None`, raising `TypeError: object NoneType can't be used in 'await'
  expression`. Renamed to `on_modal_key`.
- The `@` picker came up empty when `git ls-files` returned nothing (untracked
  project) — now backed by the filesystem-walk fallback above.

### Notes
- Archive searches spawn a short-lived Node subprocess per query (bridge design,
  warm from module cache). Searches are debounced to fire at ≥2 characters and run
  off the UI thread with a stale-result guard.

---

## [Unreleased] — 2026-06-22 (continued)

### Added

- **🧠 OOV Subject Resolution for NLU-AMP** — Design spec for wiring Datamuse
  `meansLike()` into the NLU pipeline to resolve out-of-vocabulary words
  (e.g. "reggaeton warrior"). Introduces `selectOOVCandidate()` (sync picker) +
  `resolveOOVSubject()` (async Datamuse lookup), fires only when no subject
  extracted, max one OOV word per prompt. Includes `build_oov_lexicon.mjs` —
  offline Datamuse enrichment with coherence clustering.
  (`docs/superpowers/specs/2026-06-22-oov-subject-resolution-design.md`)

- **📊 YouTube Intelligence SEO Critique Engine (`/intel <url>`)** — Fully
  operational deterministic SEO critique pipeline:
  - **Thumbnail engine** (291 lines) — Otsu thresholding, contrast, luminosity
  - **Title engine** (171 lines) — Construction rules scoring
  - **Tag engine** (171 lines) — Semantic clustering analysis
  - **Performance engine** (71 lines) — Telemetry banding
  - **Pipeline orchestrator** — Weighted composite scoring
  - **Schema** (`intel/schema.py`, 188 lines) — `SeoCritiqueResult`,
    `DeterminismInfo`, `Flag`
  - **Report renderer** — Markdown + prose output
  - **IntelLabService** — TUI integration
  - Fully deterministic: same input → byte-identical ledger. 10 test cases.
  (`intel/`, `build_youtube_intel.py`, `tui/services/intel_lab_service.py`)

- **🎨 Assonance Color Tier Design** — Third color tier for Truesight overlay:
  `rhyme` (glow) → `assonance` (soft tint) → `none` (grey). Old
  `Set<resonantCharStarts>` → `Map<charStart, 'rhyme' | 'assonance'>`.
  Assonance connections (~0.62 score) get a muted visual tier instead of being
  filtered out entirely.
  (`docs/superpowers/specs/2026-06-21-assonance-color-tier-design.md`)

- **🔁 SCD64 TokenWeight→SCD64 SCORE_DRIFT Loop** — First runtime detector to
  mint a confirmed SCD64 (SCORE_DRIFT family, v05, SCORING domain). Bridge
  `tokenWeightToSCD64` is confirmed-only, gated on real ranker evidence.
  Includes `SCORE_DRIFT` family registration in glossary +
  spatial-immune-orchestrator with sync-guard test.

### Fixed

- **SCD64 IntelliSense Matcher Hardening:**
  - Removed stale `src/core/scd64/RuleRegistry.js` fossil that shadowed the
    `.ts` under vite (missing RESONANCE_GHOST rule entirely)
  - Added assignment-context guard to RESONANCE_GHOST patterns —
    destructuring defaults (`resonantCharStarts = null`) no longer false-positive
  - Refactored `evaluateLegacyPatterns` → config-driven rules so one SCD64
    family can host multiple non-contaminating rules

- **🎨 Color Bug — Wrong School/Color for Vowel Nuclei** —
  `syllabifier.js syllabifyDeep` now folds the nucleus through
  `VOWEL_TO_BASE_FAMILY` + `normalizeVowelFamily` (matching `phoneme.engine`),
  fixing wrong school/color for AH/AY/OY/UH/AW nuclei. New
  `SCD64.COLOR_DRAGON.VOWELFAMILY_SOURCE` rule detects the raw-nucleus fossil.

### Tests
- SCORE_DRIFT family/bridge tests
- RuleRegistry precision + vowelFamily tests
- SyllabifyDeep folding tests
