# OEWN Antonym Ingest (Additive) — Design

**Date:** 2026-07-18  
**Branch:** `feat/lexical-graph-foundation` (or follow-on)  
**Depends on:** existing `scholomance_dict.sqlite` WordNet tables (`wordnet_synset`, `wordnet_lemma`, `wordnet_rel`)  
**Unblocks:** Analyze Oppositions group; sense-aware Analyze grouping (follow-on)

## Goal

Ingest Open English WordNet (OEWN) **antonym** relations into the existing dictionary DB so `lexiconAdapter.lookupAntonyms` and Analyze **Oppositions** return real, evidence-backed rows — without a full dictionary rebuild.

## Problem

The current OEWN ingest in `scripts/build_scholomance_dict.py` only records **`SynsetRelation`** edges under `<Synset>`. In OEWN LMF, antonyms are **`SenseRelation`** edges under `<Sense>`:

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
- Fabricating antonyms from free-dictionary / Datamuse APIs

## Approach (approved)

**Synset-projected additive ingest into existing `wordnet_rel`.**

1. Download OEWN 2024 LMF XML if needed.
2. Pass A: map `sense_id → synset_id` from every `<Sense>`.
3. Pass B: collect `SenseRelation` with `relType="antonym"`.
4. Project each `(sense, targetSense)` → `(synset_id, target_synset_id)`; skip unresolved ends; dedupe pairs.
5. One transaction: delete existing `rel='antonym'` rows, then insert projected pairs.
6. Also patch full builder so future rebuilds capture SenseRelation antonyms.

## Architecture

```
OEWN XML (.xml.gz)
        │
        ▼
scripts/ingest_oewn_antonyms.py
   pass1: Sense → synset map
   pass2: SenseRelation antonym → synset pairs
        │
        ▼
scholomance_dict.sqlite
   wordnet_rel (rel='antonym', source='oewn')
        │
        ▼
lexicon.sqlite.adapter.lookupAntonyms
        │
        ▼
lexicalAnalyze.service → Oppositions group
```

Builder parity: `ingest_oewn_xml` in `build_scholomance_dict.py` gains the same SenseRelation → antonym projection during LexicalEntry parsing (in addition to existing SynsetRelation handling).

## CLI contract

```bash
python scripts/ingest_oewn_antonyms.py \
  --db scholomance_dict.sqlite \
  --oewn_path dict_data/english-wordnet-2024.xml.gz
```

| Flag | Behavior |
|------|----------|
| `--db` | Target SQLite path (default: `scholomance_dict.sqlite`) |
| `--oewn_path` | Local OEWN LMF XML or `.xml.gz` |
| `--download` | If path missing, fetch `https://en-word.net/static/english-wordnet-2024.xml.gz` into `dict_data/` |

`dict_data/*` remains gitignored (except README / `.gitkeep`).

### Write rules

- Single SQL transaction; rollback on failure.
- `DELETE FROM wordnet_rel WHERE rel = 'antonym'` then bulk insert.
- Row shape: `(synset_id, 'antonym', target_synset_id, 'oewn', 'https://en-word.net/')`.
- Dedupe identical `(synset_id, target_synset_id)` before insert.
- Do not modify other `rel` values.
- Idempotent: re-run replaces antonym set only.
- Meta stamps: `oewn_antonym_source`, `oewn_antonym_ingested_at`, `oewn_antonym_count` (and optionally skipped unresolved count in stdout).

### Errors

- Missing OEWN path (and no `--download`) → non-zero exit, clear message.
- Missing / unreadable DB → fail before writes.
- Parse / IO failure mid-pass → rollback; no partial antonym set left behind after delete (transaction wraps delete+insert).

## Files

| Path | Responsibility |
|------|----------------|
| `scripts/ingest_oewn_antonyms.py` | Additive CLI |
| `scripts/build_scholomance_dict.py` | SenseRelation antonym capture in full builds |
| `dict_data/README.md` | Ops note for antonym ingest + OEWN URL |
| `package.json` | Optional `dict:ingest-antonyms` script |
| `tests/server/lexicon.antonyms.test.js` | `lookupAntonyms` smoke against live DB or fixture |

## Verification

1. `SELECT COUNT(*) FROM wordnet_rel WHERE rel='antonym'` ≫ 0 (thousands expected).
2. `lookupAntonyms('hot')` and `lookupAntonyms('good')` non-empty.
3. `POST /api/lexical/analyze` with query `hot` → Oppositions group has items (not honest-empty).
4. Second CLI run: antonym count stable; non-antonym relation counts unchanged.
5. Vitest for antonym lookup passes.

## Honesty / law notes

- Only OEWN-asserted antonyms; never invent.
- Synset projection can slightly blur rare sense-specific antonymy; acceptable for Oppositions lighting-up. Sense-true storage may follow when Analyze moves to sense cards.
- Analyze honesty law unchanged: if a lemma has no antonym rows, Oppositions still returns `{ items: [], emptyReason }`.

## Follow-ons (out of scope)

- Sense-aware Analyze grouping (CLEAVE → SEPARATE / ADHERE cards)
- Deduplicated related lemmas with multiple relation badges
- Panel title / MEANINGS label / collapsible sections
- Optional `wordnet_sense_rel` table if projection proves too lossy

## Success criteria

- [ ] Additive CLI lands and is documented
- [ ] Live DB has non-zero `antonym` rows from OEWN
- [ ] Existing `lookupAntonyms` works without adapter signature changes
- [ ] Analyze Oppositions lights up for antonym-bearing lemmas
- [ ] Full builder path also records SenseRelation antonyms
