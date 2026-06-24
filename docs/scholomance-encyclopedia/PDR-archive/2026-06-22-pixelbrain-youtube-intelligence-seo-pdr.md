# PDR: YouTube Intelligence Lab — SEO Critique Engine (divtube)

**File:** `2026-06-22-pixelbrain-youtube-intelligence-seo-pdr.md`
**Status:** Finalized design, ready for implementation planning
**Owner:** Vaelrix / Scholomance
**Target system:** `divtube_downloader/` (Java telemetry backend + Python Textual TUI)
**Primary command:** `/intel <youtube_url>`
**Core thesis:** Deterministic scores. Strategist prose on top. No vibes machine for the math.

> This document supersedes the original aspirational PDR. It is reconciled with the
> **actual** state of the codebase (see §2) and three settled design decisions (see §3).

---

## 1. Executive Summary

The YouTube Intelligence Lab takes a video URL and returns a professional SEO critique by
treating the video package as a sprite: thumbnail = silhouette/readability, title =
construction geometry, tags = semantic clustering, telemetry = proof pressure.

The **telemetry half already exists and works** (Java + YouTube Data API). This PDR specifies
the **missing critique half**: thumbnail readability, title construction, tag clustering,
performance banding, a reference-grounded report — built in **Python** inside the TUI app.

The critique **scores and flags are fully deterministic** (same input → byte-identical ledger).
The report **prose** is written by Claude grounded in those scores + the reference library,
with a deterministic template fallback when no API key is present.

```txt
/intel <url>
 → (existing) Java fetches telemetry → youtube-analysis-<id>-<ts>.json
 → Python loads JSON, fetches thumbnail
 → run thumbnail / title / tag / performance engines  (deterministic)
 → write youtube-critique-<id>-<ts>.json  (scores + flags ledger)
 → render markdown report (LLM prose if key, else template)
 → display in TUI
```

---

## 2. Reconciliation With Actual Codebase

The original PDR assumed a JS "PixelBrain" host and unknown backend shape. Ground truth:

| Original assumption | Actual state |
|---|---|
| Critique runs in JS PixelBrain | The YouTube tool is a **standalone Java + Python-TUI app** in `divtube_downloader/`, **not** wired into the JS Scholomance/PixelBrain app. |
| `VideoAnalysis.java` "can be extended to emit metadata" | **Done.** `divtube/youtube/analysis/` has `YouTubeAnalysisService`, `YouTubeApiClient`, `AnalysisExportService`, models `VideoAnalysis/VideoOverview/TagIntelligence/VideoTelemetry/ChannelSnapshot/CommentPulse`. |
| Thumbnail fetching unknown | Thumbnail **URL** is already in the analysis JSON (`overview.thumbnail`); pixel fetch is **not** implemented. |
| Telemetry/derived metrics unknown | **Done.** JSON already carries `viewCount/likeCount/commentCount/engagementRate/viewsPerDay/performanceScore` + channel snapshot + comment sentiment. |
| CLI routing unknown | `tui/ui/app.py` registers `/intel` → `AgentService.run_command("3", url)` → shells Gradle → Java writes `youtube-analysis-<id>-<ts>.json`, TUI prints the path. **Works today.** |

**Net:** telemetry/ledger acquisition is complete. This PDR builds only the critique + report.

---

## 3. Settled Design Decisions

1. **Critique home = Python TUI layer.** Java keeps owning telemetry (untouched). Python reads
   the analysis JSON, fetches the thumbnail, runs all critique engines, renders the report.
2. **Critique voice = deterministic scores + LLM prose.** Engines produce a deterministic
   score/flag ledger (saved separately). Claude writes the strategist-voice prose grounded in
   that ledger + references. **Graceful fallback:** if `ANTHROPIC_API_KEY` is absent, a
   deterministic template produces the prose so `/intel` never hard-fails.
3. **Scope = core `/intel <url>` report only.** Thumbnail + title + tag + performance engines,
   SEO reference library, deterministic ledger, rendered report. **Deferred:** `/intel compare`
   (competitor delta + blueprint) and sub-commands (`/intel thumbnail|title|tags`).

---

## 4. New Dependencies & Manual Setup

The venv currently has only `textual` + `rich`. Implementation adds:

- `Pillow` — thumbnail pixel pipeline (downscale, grayscale, threshold, components).
- `anthropic` — LLM prose pass (optional at runtime).
- A small HTTP fetch for thumbnail bytes (`urllib` from stdlib — no new dep) .

**Manual user steps (front-loaded, all of them):**
1. `ANTHROPIC_API_KEY` is optional. To enable strategist prose, add it via the existing
   `/import`-style key wizard (extended to accept the Anthropic key) or place it in
   `divtube_downloader/.env`. Without it, the report renders with deterministic template prose.
2. No other manual steps; `Pillow`/`anthropic` install into the existing `.venv` via the
   bootstrap in `run.sh` (extend the dependency check there).

---

## 5. Architecture & Data Flow

```txt
/intel <url>   (TUI command, tui/ui/app.py)
   │
   ▼
IntelLabService  (tui/services/intel_lab_service.py)   ← new orchestrator (thin, impure)
   ├─ 1. AgentService.run_command("3", url)   → Java writes youtube-analysis-<id>-<ts>.json  [UNCHANGED]
   ├─ 2. locate freshest analysis JSON for that videoId
   ├─ 3. fetch thumbnail bytes (overview.thumbnail)        → intel/thumbnail/fetch.py
   ├─ 4. run_critique(analysis, thumbnail_bytes, refs)     → intel/pipeline.py   (PURE)
   ├─ 5. write ledger: youtube-critique-<id>-<ts>.json     (scores + flags only)
   ├─ 6. render markdown report                            → intel/report/renderer.py
   │        prose: Claude if key else template             → intel/report/prose.py
   └─ 7. return markdown → TUI (Textual Markdown widget / chat-log)
```

### Package layout (pure core, no Textual/Java/network imports)

```txt
divtube_downloader/intel/
  __init__.py
  schema.py              # dataclasses: VideoAnalysis(load), Scores, Flag, SeoCritiqueResult
                         #   + SCHEMA_VERSION, SCORING_VERSION, RULESET_VERSION
  pipeline.py            # run_critique(analysis, thumbnail_bytes|None, references) -> SeoCritiqueResult
  engines/
    __init__.py
    thumbnail_engine.py  # 48px · grayscale · 1-bit(Otsu) · connected components · 6 sub-scores
    title_engine.py      # length · hook · keyword placement · curiosity · clarity · uniqueness
    tag_engine.py        # normalize · cluster · tightness · coverage · stuffing · alignment
    performance_engine.py# bands + confidence guard from existing telemetry
  thumbnail/
    fetch.py             # url -> bytes (impure leaf; injected, never imported by engines)
  references.py          # parse references/seo/*.md into structured rule blocks
  report/
    renderer.py          # scores + flags + references -> deterministic markdown skeleton
    prose.py             # fill prose sections: Claude(grounded) OR deterministic template
  errors.py              # YTSEO_* structured error codes

divtube_downloader/references/seo/
  ctr-psychology.md  thumbnail-readability.md  title-construction-lines.md
  tag-clustering.md  retention-hooks.md  competitor-delta-analysis.md  critique-rubric.md

divtube_downloader/tui/services/intel_lab_service.py   # orchestrator (impure)

divtube_downloader/tests/intel/                        # unit tests (pure, no Textual/Java)
```

---

## 6. Engines & Deterministic Scoring

All sub-scores normalize to `[0,1]`, combine by fixed PDR weights, round **once** at the end via
explicit `int(x + 0.5)` (no banker's-rounding platform drift). No randomness, no timestamps in
any formula. Each engine returns `{score:int(0..100), metrics:dict, flags:[Flag]}`.

### 6.1 Thumbnail Readability (Pillow)

Pipeline: load → crop/pad to 16:9 → downscale to 48px width (nearest) → grayscale (luminosity
`0.299R/0.587G/0.114B`) → contrast-normalize → **Otsu** threshold → 4-connectivity components.

```txt
score = silhouette·25 + focalDominance·20 + contrast·20 + textLegibility·15 + cropSafety·10 + colorSeparation·10
```

- `silhouette` = 1 − normalized(componentCount); one dominant blob ≈1, noise field ≈0.
- `focalDominance` = triangular band peaking for largest-component area ∈ [18%,55%] of frame.
- `contrast` = clamp01(|fgMean − bgMean| / 255), fg/bg split at Otsu threshold.
- `textLegibility` = fraction of thin (≤1px stroke) components surviving downscale.
  Reported as `textLikelyReadableAt48px` — **heuristic, never OCR truth**.
- `cropSafety` = penalty if largest bbox is within 5% of any edge.
- `colorSeparation` = saturation/hue spread of the pre-grayscale 48px image.

Flags: `THUMBNAIL_LOW_SILHOUETTE`, `THUMBNAIL_TEXT_COLLAPSE_48PX`, `THUMBNAIL_LOW_FOREGROUND_CONTRAST`.
Missing/failed thumbnail → score `null`, flag `YTSEO_THUMBNAIL_FETCH_FAILED`, rest of critique continues.

### 6.2 Title Construction (pure string)

Rules: `maxRec=50, hardWarn=60, hookWindow=3 words, keywordFrontload=32 chars`.

```txt
score = length·20 + hookFrontload·25 + keywordPlacement·20 + curiosityGap·15 + clarity·15 + uniqueness·5
```

"Keyword" = longest non-stopword token or capitalized brand token (shipped stopword list).
Flags: `TITLE_MOBILE_TRUNCATION` (>60), `TITLE_HOOK_AFTER_WORD_3`, `TITLE_KEYWORD_AFTER_CHAR_32`.
Empty title → critical schema warning `YTSEO_INVALID_VIDEO_ANALYSIS_SCHEMA`.

### 6.3 Tag Clustering

Normalize (lowercase/trim/dedupe/**stable sort**) → assign each tag to clusters
(identity / genre / format / mood / technology / audience-intent) via a shipped
keyword→cluster lexicon.

```txt
score = semanticTightness·35 + coverageCompleteness·25 + stuffingPenaltyInverse·20 + longTailSpecificity·10 + titleTagAlignment·10
```

Flags: `TAG_STUFFING_RISK` (near-dup variants / count over threshold),
`TAG_CLUSTER_TOO_BROAD` (≥2 expected clusters missing).

### 6.4 Performance (from existing telemetry)

```txt
bands:      <2% weak · 2–4% low · 4–8% healthy · 8–15% strong · >15% suspicious
confidence: views<100 LOW · <1000 MED · else HIGH
```

Flags: `PERFORMANCE_LOW_ENGAGEMENT`, `PERFORMANCE_LOW_SAMPLE_CONFIDENCE`.
(Reference video: 12 views / 25% engagement → `suspicious` + `LOW` — the guard rail working.)

### 6.5 Overall

`overallScore` = weighted average of {thumbnail, title, tag, performance}; `replicationValue`
derived from those four. All weights pinned under `scoring_version = "2026.06.22"`.

---

## 7. Data Contracts

### 7.1 Input — analysis JSON (already produced by Java; loaded by `schema.py`)

The existing `youtube-analysis-<id>-<ts>.json`: `overview{videoId,title,channelTitle,publishDate,
thumbnail,duration,categoryId,defaultLanguage}`, `tags{tags[],tagCount,hasTags}`,
`telemetry{viewCount,likeCount,commentCount,engagementRate,viewsPerDay,performanceScore}`,
`channel{...}`, `comments{...}`.

### 7.2 Output — `SeoCritiqueResult` ledger (`youtube-critique-<id>-<ts>.json`)

```json
{
  "analysisRunId": "YT-INTEL-<DATE>-<VIDEOID>",
  "videoId": "DQY-tRnHGCU",
  "overallScore": 0,
  "scores": { "thumbnailReadability": 0, "titleConstruction": 0, "tagClustering": 0, "performance": 0, "replicationValue": 0 },
  "flags": [ { "severity": "WARN", "code": "TITLE_MOBILE_TRUNCATION", "message": "..." } ],
  "metrics": { "thumbnail": {}, "title": {}, "tags": {}, "performance": {} },
  "determinism": { "schemaVersion": "YT-SEO-CRITIQUE-v1", "rulesetVersion": "seo-library-v1", "scoringVersion": "2026.06.22" }
}
```

The ledger contains **scores/flags/metrics only** — no prose, no analysis timestamp inside any
score. The report markdown is rendered separately and is allowed to vary (prose layer).

---

## 8. Reference Library (SEO Library of Alexandria)

Seven markdown files under `references/seo/`. Each uses the fixed contract so the renderer/prose
can parse them:

```md
# Reference Name
## Principle
## Deterministic Checks
## Failure Modes
## Critique Language
## Scoring Impact
```

`references.py` parses these into structured blocks keyed by flag code, so a raised flag pulls its
"Critique Language" deterministically. The LLM prose pass is **grounded** in these blocks (passed
as context) and forbidden from inventing principles outside them.

---

## 9. Report Rendering

Deterministic markdown skeleton (PDR §15.2): Verdict · Scorecard table · What Worked · What
Failed · Why It Probably Worked · Replicate · Avoid · Rewrite Suggestions · Thumbnail Fixes · Tag
Suggestions · Final Blueprint. The **structure, scorecard numbers, and flag list are
deterministic**; only the narrative prose in the freeform sections is LLM-or-template filled.

`prose.py` exposes one interface `write_sections(scores, flags, references) -> dict[str,str]`
with two implementations chosen at runtime:
- **Claude** (if `ANTHROPIC_API_KEY`): grounded prompt = scores + flags + matched reference blocks.
- **Template** (fallback): deterministic sentences assembled from reference "Critique Language".

---

## 10. Determinism Rules

- No random scoring; no score change between runs on identical input.
- Stable sort for tags and clusters; stable iteration order everywhere.
- Every scoring formula versioned; `schemaVersion` in every ledger.
- Raw telemetry (analysis JSON) stored separately from critique ledger.
- Timestamps never enter score calculation.
- Every flag has a stable code.
- **Test:** run same URL twice → identical ledger (scores + flags), prose may differ.

---

## 11. Structured Errors (module `YTSEO`)

```txt
YTSEO_INVALID_URL
YTSEO_THUMBNAIL_FETCH_FAILED
YTSEO_MISSING_TELEMETRY
YTSEO_INVALID_VIDEO_ANALYSIS_SCHEMA
YTSEO_REFERENCE_LIBRARY_MISSING
YTSEO_SCORING_VERSION_MISMATCH
```

Emitted as structured objects `{category,severity,moduleId:"YTSEO",errorCode,context}` so the TUI
can print recovery hints. Missing data → warnings + partial analysis, never a crash.

---

## 12. QA Plan (pure unit tests, no Textual/Java/network)

- **Thumbnail:** high-contrast fixture >75; noisy fixture <50; text-heavy fails 48px text;
  blank → stable failure; same fixture → same score.
- **Title:** <50 no length warn; >60 → `TITLE_MOBILE_TRUNCATION`; hook after word 3 →
  `TITLE_HOOK_AFTER_WORD_3`; keyword after char 32 → `TITLE_KEYWORD_AFTER_CHAR_32`; empty → schema warn.
- **Tags:** dup collapse; unrelated tags raise stuffing; tight tags > random; identity-only →
  `TAG_CLUSTER_TOO_BROAD`.
- **Performance:** views<100 → LOW confidence; <4% engagement → weak flag; viewsPerDay max-1-day guard;
  missing counts degrade gracefully.
- **Determinism:** `run_critique` twice on a fixture analysis → identical ledger dict.

Thumbnail fixtures are tiny generated PNGs committed under `tests/intel/fixtures/`.

---

## 13. Implementation Milestones

1. **Schema + references skeleton** — `schema.py`, version constants, 7 reference files, `references.py` parser.
2. **Title + tag + performance engines** + their unit tests (no image dep needed yet).
3. **Thumbnail engine** — `thumbnail/fetch.py` + `thumbnail_engine.py` + fixtures/tests.
4. **Pipeline + ledger** — `pipeline.run_critique`, ledger writer, determinism test.
5. **Report renderer + prose** — deterministic skeleton, template prose, then Claude prose with fallback.
6. **TUI wiring** — `IntelLabService`, `/intel` routes through it, Markdown render; extend `run.sh`
   dependency bootstrap; extend key wizard for `ANTHROPIC_API_KEY`.

---

## 14. Non-Goals

No reverse-engineering YouTube's algorithm; no view guarantees; no scraping private/restricted data;
no deceptive-thumbnail/title encouragement; no spam automation. Deferred (future PDR): `/intel
compare`, `/intel thumbnail|title|tags`, cockpit visual overlays of thumbnail failures.

---

## 15. Definition of Done

- `/intel <url>` returns a full deterministic report rendered in the TUI.
- Thumbnail score computed from real thumbnail pixels (or clean null + flag when fetch fails).
- Title/tag/performance flags accurate and stable; every critique line traces to a flag + reference.
- Repeated runs on same input → identical score ledger.
- Reference library drives critique language; LLM prose grounded in it, template fallback works offline.
- Missing data → warnings, not crashes.
