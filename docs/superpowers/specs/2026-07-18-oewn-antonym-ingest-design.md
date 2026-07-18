# OEWN Antonym Ingest (Additive) — Design

**Date:** 2026-07-18  
**Branch:** `feat/lexical-graph-foundation` (or follow-on)  
**Depends on:** existing `scholomance_dict.sqlite` WordNet tables (`wordnet_synset`, `wordnet_lemma`, `wordnet_rel`)  
**Unblocks:** Analyze Oppositions group; sense-aware Analyze grouping (follow-on)

## Goal

Ingest Open English WordNet (OEWN) **antonym** relations into the existing dictionary DB so `lexiconAdapter.lookupAntonyms` and Analyze **Oppositions** return real, evidence-backed rows — without a full dictionary rebuild.

## Problem

The current OEWN ingest in `scripts/build_scholomance_dict.py` only records **`SynsetRelation`** edges under `<Synset>`. In OEWN LMF, antonyms are primarily **`SenseRelation`** edges under `<Sense>`:

```xml
<Sense id="…" synset="oewn-…">
  <SenseRelation relType="antonym" target="…"/>
</Sense>
```

Measured on the live DB (2026-07-18): `wordnet_rel` has hypernym/similar/etc., but **`rel='antonym'` count = 0**. Analyze therefore honest-empties Oppositions.

## Non-goals

- Full CMU/OEWN/Kaikki dictionary rebuild
- Sense-aware Analyze UI / multi-badge dedupe / panel chrome renames (separate follow-on)
- New sense-relation table (deferred; this slice projects to synset pairs)
- Fabricating antonyms from free-dictionary / Datamuse APIs (reciprocal closure of OEWN-asserted antonyms is **not** fabrication — see below)

## Approach (approved)

**Synset-projected additive ingest into existing `wordnet_rel`, scoped to `source='oewn'`.**

1. Download / open the **pinned OEWN release** that matches the DB (default: 2024).
2. Parse and validate **outside** any write transaction.
3. Project SenseRelation (+ any SynsetRelation) antonyms to synset pairs; apply **reciprocal closure**; dedupe.
4. Abort on release mismatch or unresolved coverage above threshold.
5. `BEGIN IMMEDIATE` → delete **only** OEWN antonyms → insert set → write meta → `COMMIT`.
6. Patch full builder so future rebuilds use the same shared projection rules.

## Architecture

```
OEWN XML (.xml.gz) ──► parse+validate (no DB write lock)
        │                 - lexicon/version metadata
        │                 - sense→synset map
        │                 - SenseRelation + SynsetRelation antonyms
        │                 - reciprocal closure + dedupe
        │                 - synset existence + resolution ratio
        ▼
BEGIN IMMEDIATE
  DELETE wordnet_rel WHERE rel='antonym' AND source='oewn'
  INSERT projected reciprocal antonym set (source='oewn')
  UPDATE meta stamps
COMMIT
        │
        ▼
lexicon.sqlite.adapter.lookupAntonyms
        │
        ▼
lexicalAnalyze.service → Oppositions group
```

Shared projection helpers live in a module both the additive CLI and `build_scholomance_dict.py` can import (or a small shared Python module under `scripts/` / `dict_data` tooling) so builder and CLI produce **identical** antonym sets from the same fixture.

## CLI contract

```bash
python scripts/ingest_oewn_antonyms.py \
  --db scholomance_dict.sqlite \
  --oewn_path dict_data/english-wordnet-2024.xml.gz \
  --expected-release 2024 \
  --timestamp 2026-07-18T09:00:00Z
```

| Flag | Required | Behavior |
|------|----------|----------|
| `--db` | yes (default path ok) | Target SQLite path |
| `--oewn_path` | yes | Local OEWN LMF XML or `.xml.gz` |
| `--expected-release` | **yes** | Exact OEWN release string expected in lexicon metadata (e.g. `2024`). Mismatch → abort before writes |
| `--timestamp` | **yes** (write mode) | ISO-8601 UTC stamp for `oewn_antonym_ingested_at`. **No `Date.now()` / `time.time()` for stamped fields.** Missing → reject write mode |
| `--download` | no | If path missing, fetch the **pinned URL for `--expected-release`** into `dict_data/` |
| `--max-unresolved-ratio` | no | Default strict threshold (e.g. `0.02`). Abort if unresolved/asserted exceeds this |

Pinned download URL for release `2024`:  
`https://en-word.net/static/english-wordnet-2024.xml.gz`

`dict_data/*` remains gitignored (except README / `.gitkeep`).

### Source scoping (do not erase other antonyms)

```sql
DELETE FROM wordnet_rel
WHERE rel = 'antonym'
  AND source = 'oewn';
```

Never `DELETE … WHERE rel = 'antonym'` alone. Future manual / alternate-source antonyms (`source='manual'`, etc.) must survive re-ingestion.

### Reciprocal closure

Global WordNet documents antonym with `reverse: antonym`. For every resolved directed edge `A → B`, project:

- `synset(A) → synset(B)`
- `synset(B) → synset(A)`

Then deduplicate. This is symmetric closure required by the relation definition, not invention of new antonym pairs.

Verification must include:

- `lookupAntonyms("hot")` contains `"cold"`
- `lookupAntonyms("cold")` contains `"hot"`

### Version / coverage gates (before any write)

1. Stream-parse lexicon metadata; read OEWN release/version.
2. Confirm it equals `--expected-release`.
3. Compute SHA-256 of the source file; store for provenance.
4. After projection, verify each projected synset ID exists in `wordnet_synset`.
5. Compute:
   - `asserted_count` — directed sense/synset antonym edges found in XML (pre-closure)
   - `projected_count` — unique synset pairs after projection + reciprocal + dedupe that resolve in DB
   - `unresolved_count` — edges/pairs dropped for missing sense map or missing synset
   - `resolution_ratio` — `projected_count / max(asserted_count_after_projection_attempt, 1)` (exact formula documented in implementation; must be abort-gated)
6. Abort if release incompatible **or** unresolved coverage exceeds `--max-unresolved-ratio`.

No silent projection of OEWN 2025 (or other) onto a 2024-tied synset set.

### Meta stamps

| Key | Value |
|-----|--------|
| `oewn_antonym_release` | e.g. `2024` |
| `oewn_antonym_source_url` | pinned download URL or file URI |
| `oewn_antonym_source_sha256` | hex digest of source bytes |
| `oewn_antonym_asserted_count` | integer |
| `oewn_antonym_projected_count` | integer |
| `oewn_antonym_unresolved_count` | integer |
| `oewn_antonym_resolution_ratio` | decimal string |
| `oewn_antonym_ingested_at` | caller `--timestamp` only |

### Transaction order

1. Parse and validate source **outside** transaction (two streaming passes; reopen gzip/XML per pass).
2. Verify release + synset coverage + resolution ratio; abort → **no DB writes**.
3. `BEGIN IMMEDIATE`
4. `DELETE … rel='antonym' AND source='oewn'`
5. Insert projected reciprocal set
6. Write meta
7. `COMMIT`

Parsing before `BEGIN` avoids holding a write lock across two full XML passes. The validated result set exists before any deletion.

### Implementation hardening (XML)

- Reopen the XML or gzip stream separately for each pass.
- Use streaming `iterparse`.
- `elem.clear()` processed elements to bound memory.
- Handle the LMF namespace explicitly (`{*}Sense`, `{*}SenseRelation`, etc.).
- Full builder: collect **both** existing `SynsetRelation` antonym **and** projected `SenseRelation` antonym.
- Deduplicate across asserted synset edges, projected sense edges, and reciprocal closure.

### Row shape

`(synset_id, 'antonym', target_synset_id, 'oewn', source_url)`

### Errors

| Condition | Behavior |
|-----------|----------|
| Missing `--timestamp` in write mode | Reject before parse/write |
| Missing OEWN path (no `--download`) | Non-zero exit |
| Release ≠ `--expected-release` | Abort before writes |
| Unresolved ratio above threshold | Abort before writes |
| Malformed XML | Abort before writes; DB unchanged |
| Missing / locked DB | Fail before writes |
| Mid-transaction failure | Rollback; OEWN antonym set unchanged from pre-BEGIN state |

## Files

| Path | Responsibility |
|------|----------------|
| `scripts/ingest_oewn_antonyms.py` | Additive CLI |
| `scripts/oewn_antonym_project.py` (or equivalent shared module) | Parse, project, reciprocal, dedupe, validate — shared by CLI + builder |
| `scripts/build_scholomance_dict.py` | Use shared module; SynsetRelation + SenseRelation antonyms |
| `dict_data/README.md` | Ops note: pinned 2024 URL, CLI flags, provenance |
| `package.json` | Optional `dict:ingest-antonyms` script |
| `tests/server/lexicon.antonyms.test.js` (+ Python/fixture tests as needed) | QA matrix below |
| `tests/fixtures/oewn-antonym-mini.xml` (or `.xml.gz`) | Tiny LMF fixture with sense antonyms + known synsets |

### Regression fixture (DB seed for survival test)

Preload three rows before re-ingest:

| rel | source | purpose |
|-----|--------|---------|
| `antonym` | `oewn` | Replaced by ingest |
| `antonym` | `manual` | **Must survive** |
| `similar` | `oewn` | **Must survive** (non-antonym) |

After ingestion: only the old OEWN antonym set is replaced; `manual` antonym and `oewn` similar remain.

## QA / test matrix

| # | Assertion |
|---|-----------|
| 1 | Reciprocal lookup: `hot`↔`cold` (fixture or live after ingest) |
| 2 | Non-OEWN antonyms (`source='manual'`) survive re-ingestion |
| 3 | Release mismatch fails **before** writes |
| 4 | Excessive unresolved synsets fail **before** writes |
| 5 | Malformed XML leaves the database unchanged |
| 6 | Missing `--timestamp` rejects write mode |
| 7 | Builder and additive CLI produce **identical** antonym sets from the same fixture |
| 8 | Repeated execution produces identical rows and counts |
| 9 | Existing non-antonym relation counts remain byte-for-byte stable (count + checksum of non-antonym `wordnet_rel` rows, or equivalent) |

Live smoke (post-ingest on real DB): Analyze Oppositions for antonym-bearing lemmas is non-empty.

## Honesty / law notes

- Only OEWN-asserted antonym pairs enter the set; reciprocal edges are the declared reverse of that relation.
- Synset projection can slightly blur rare sense-specific antonymy; acceptable for Oppositions lighting-up. Sense-true storage may follow when Analyze moves to sense cards.
- Analyze honesty law unchanged: if a lemma has no antonym rows, Oppositions still returns `{ items: [], emptyReason }`.
- Caller-provided `--timestamp` only — no internal wall-clock for stamped meta (matches lexical-graph CLI law).

## Follow-ons (out of scope)

- Sense-aware Analyze grouping (CLEAVE → SEPARATE / ADHERE cards)
- Deduplicated related lemmas with multiple relation badges
- Panel title / MEANINGS label / collapsible sections
- Optional `wordnet_sense_rel` table if projection proves too lossy

## Success criteria

- [ ] Additive CLI lands with scoped delete, reciprocal closure, release gates, caller timestamp
- [ ] Shared projection module used by CLI and full builder
- [ ] Live DB has non-zero OEWN `antonym` rows; manual antonyms (if any) untouched
- [ ] `lookupAntonyms` works bidirectionally for known pairs without adapter signature changes
- [ ] Full QA matrix green
- [ ] Analyze Oppositions lights up for antonym-bearing lemmas
