# CODEx Song Stats Panel — Design Spec

**Date:** 2026-07-18  
**Status:** Draft for review  
**Surface:** Read page → CODEx Metrics tool slot  
**Approach:** Greenfield `songStats` engine + new panel UI (full replace of heuristic ledger in that slot)

## Problem

CODEx Metrics (`HeuristicScorePanel`) currently shows a weighted “scholastic heuristic ledger” (~10 bars: phoneme density, alliteration, rhyme quality, MATTR vocabulary, meter, etc.). That presentation is hard to interpret as song craft and does not match industry-cited song-science methodologies.

## Goal

Replace CODEx Metrics content with a **Song Stats** panel driven by three methodologies:

1. **Rhyme Density** — Raplyzer / DopeLearning (Malmi): vowel-sequence sliding-window scoring  
2. **Unique Vocabulary** — song-normalized Daniels-style unique lemmas per 100 words  
3. **Flow Alignment** — SPS + syncopation; estimated from text, upgraded when forced alignment exists  

Plus a small **composite** score for at-a-glance comparison.

## Decisions (locked)

| Decision | Choice |
|----------|--------|
| Old heuristic ledger in CODEx Metrics | **Full replace** (removed from this slot) |
| Flow without audio | **Estimated** from text; label fidelity; upgrade when alignment exists |
| Vocabulary at song scope | **Unique lemmas per 100 words** (not 35k discography baseline) |
| Headline number | **Three stats + composite** |
| Composite weights | **RD 40% · Vocab 35% · Flow 25%** |
| Architecture | **Greenfield** `songStats` engine; combat / AnalysisPanel / Visualiser unchanged in this redesign |

## Non-goals

- Changing combat scoring engines (`COMBAT_SCORING_HEURISTICS`)  
- Changing AnalysisPanel literary / heuristic commentary  
- Rewiring Visualiser `songScore` charts (optional later consumer of the same engine)  
- Full spaCy/NLTK production lemmatization (lightweight lemma/stem OK for v1)  
- Implementing a full Parncutt model beyond a clear syncopation index contract  

## Architecture

```
lyrics / AnalyzedDocument (+ optional alignment, beatGrid)
        │
        ▼
┌───────────────────────────┐
│  songStats.engine         │
├───────────────────────────┤
│ rhymeDensity              │
│ uniqueVocabulary          │
│ flowAlignment             │
│ composite                 │
└───────────────────────────┘
        │
        ▼
   SongStatsPanel  (CODEx Metrics slot)
```

### Module placement (proposed)

- `codex/core/song-stats/` — pure compute (`rhymeDensity.js`, `uniqueVocabulary.js`, `flowAlignment.js`, `composite.js`, `index.js`)  
- `src/components/SongStatsPanel.jsx` (+ CSS) — UI  
- Read wiring: replace `HeuristicScorePanel` usage for the Metrics tool with `SongStatsPanel`  
- `HeuristicScorePanel` may remain temporarily if unused elsewhere; delete or leave orphaned only if imports prove clear

### Result contract

```ts
type SongStatPillar = {
  id: 'rhyme_density' | 'unique_vocabulary' | 'flow_alignment';
  value: number;           // primary display number (Flow: SPS)
  unit: string;            // e.g. 'RD', '/100w', 'SPS'
  secondary?: Record<string, number | string>; // Flow: { syncopationIndex }
  normalized01: number;    // for bars + composite
  fidelity: 'exact' | 'estimated' | 'aligned';
  diagnostics: Array<{ code: string; message: string }>;
};

type SongStatsResult = {
  wordCount: number;
  pillars: {
    rhymeDensity: SongStatPillar;
    uniqueVocabulary: SongStatPillar;
    flowAlignment: SongStatPillar;
  };
  composite: {
    total0to100: number | null;
    band: string;
    weights: { rhymeDensity: 0.40; uniqueVocabulary: 0.35; flowAlignment: 0.25 };
  };
  meta: {
    rhymeWindow: number;   // default 24
    fidelitySummary: 'estimated' | 'aligned'; // mirrors Flow fidelity (RD/Vocab are exact)
  };
};
```

## Formulas

### 1. Rhyme Density (Raplyzer / DopeLearning)

Pipeline:

`Text → Grapheme-to-Phoneme → Vowel Isolation → Sliding-Window Scoring → RD`

1. **G2P** via existing CMU / CODEx phonology path.  
2. **Vowel isolation:** discard consonant phonemes; retain ordered vowel phonemes (+ stress marks).  
3. **Window:** for each word \(w\), compare against the previous **24** words (config range 16–32).  
4. **Per-word score:** \(Score(w) = L(w)^2\) where \(L\) is the longest matching vowel-sequence length vs any preceding word in the window.  
5. **Density:**  
   \[
   RD = \frac{\sum_{w \in Song} Score(w)}{N}
   \]  
   where \(N\) is word count.

**Display:** raw RD (e.g. `1.42`) + gloss “avg multi-syllable rhyme mass per word”.  
**Composite normalize:** \(RD_n = \mathrm{clamp}(RD / 2.0,\ 0..1)\) (ceiling 2.0 = “very dense”; tunable constant).  
**G2P miss:** word contributes \(L = 0\); count OOV in diagnostics.  
**Fidelity:** `exact` (text+phonemes sufficient).

### 2. Unique Vocabulary (song-normalized Daniels)

Daniels’ discography method uses a 35,000-word fixed baseline. Songs are shorter, so v1 uses a **length-normalized** density:

1. Tokenize → lowercase → strip punctuation.  
2. Lemmatize (lightweight stemmer/lemma pipeline already in tree; upgrade path to richer lemmatizer later).  
3.  
   \[
   V = \frac{\#\ \text{unique lemmas}}{N} \times 100
   \]  
   → **unique lemmas per 100 words**.

**Display:** \(V\) (e.g. `42.6 / 100w`) + secondary raw unique lemma count.  
**Composite normalize:** \(V_n = \mathrm{clamp}(V / 60,\ 0..1)\) (60 unique/100w ≈ song-scope ceiling).  
**Lemmatizer failure:** fall back to normalized surface token as lemma.  
**Fidelity:** `exact` (text-only methodology).

### 3. Flow Alignment

| Mode | When | Metrics |
|------|------|---------|
| `estimated` | no usable alignment / beat grid | Delivery tempo proxy: \(SPS = S / t_{est}\) where \(t_{est}\) uses **90 BPM**, **4 beats/line** defaults (overridable); syncopation proxy from primary-stress placement vs an even line subdivision grid |
| `aligned` | forced-alignment artifact + beat grid available | True syllables-per-second \(S/t\); syncopation from \(\lvert t_{syllable} - t_{beat\ grid}\rvert\) (Parncutt-style index) |

**Display:** primary **SPS** (`value`); **Syncopation Index** in `secondary`; fidelity chip (`estimated` / `aligned`).  
**Pillar normalize:** \(F_n = 0.55 \cdot SPS_n + 0.45 \cdot Sync_n\) (each sub-metric clamped 0–1; SPS ceiling **8.0** syl/s for \(SPS_n\)).  
**Partial/bad alignment:** stay on `estimated`; diagnostic `alignment_incomplete`.  
**Fidelity:** `estimated` or `aligned`.  
**meta.fidelitySummary:** mirrors Flow fidelity (`estimated` | `aligned`). RD and Vocab remain `exact`.

### 4. Composite

\[
C = 100 \times (0.40\,RD_n + 0.35\,V_n + 0.25\,F_n)
\]

**Bands** (reuse familiar labels mapped to \(C\)):

| Band | Range |
|------|-------|
| Godlike | ≥ 90 |
| Master | ≥ 75 |
| Adept | ≥ 60 |
| Neophyte | < 60 |

### Short / empty text

If \(N < 8\): pillars show “—” / zeros; `composite.total0to100 = null`; diagnostic `need_more_lyrics`. Do not invent density.

## UI

**Chrome:** Keep tool name **CODEx Metrics**; subtitle **Song Stats**. Same floating / embedded Read slots.

**Layout (top → bottom):**

1. **Header** — composite seal (\(C\) 0–100 or “—”) + band; fidelity note if any pillar is estimated  
2. **Three stat cards** (not a long heuristic list):  
   - Rhyme Density — big RD, gloss, bar from \(RD_n\)  
   - Unique Vocabulary — big \(V\) `/100w`, secondary unique count, bar from \(V_n\)  
   - Flow — SPS + Syncopation, fidelity chip, bar from \(F_n\)  
3. **Footer** — word count · window 24 · weights 40/35/25 · top diagnostic line if present  

**Removed from this slot:** genre profile block; per-heuristic contribution list; weight/contribution micro-metrics.

**Embedded mode:** Compact row (composite + three mini values); expand shows full cards.

**A11y:** `aria-label="CODEx Song Stats"`; each card is a labeled group announcing the primary numeric value.

**Live update:** Same analyze/score refresh trigger as today’s Metrics panel.

## Data flow

1. Read already has analyzed document / score refresh path.  
2. `computeSongStats(doc, { alignment?, beatGrid?, rhymeWindow? })` → `SongStatsResult`.  
3. `SongStatsPanel` renders the result.  
4. When an alignment artifact exists for the active track, pass it → Flow `aligned`; else `estimated`.

## Error handling

| Case | Behavior |
|------|----------|
| \(N < 8\) | Empty state + `need_more_lyrics` |
| G2P OOV | \(L=0\) for that word; OOV count in diagnostics |
| Lemmatizer miss | Use normalized token |
| Alignment incomplete | Flow stays `estimated`; `alignment_incomplete` |
| Compute throw | Panel shows last good result or empty state; no crash of Read |

## Testing

- **Unit RD:** fixture verses with known vowel chains (including spelling-divergent matches like matrix/naked-style).  
- **Unit Vocab:** density rises with distinct lemmas; plateaus under pure repetition.  
- **Unit Flow:** same lyrics under estimated vs aligned fixtures produce different fidelity + numeric SPS.  
- **Component:** three cards + composite; fidelity chip when estimated.  
- **Regression:** CODEx Metrics entry no longer renders the old multi-heuristic ledger.

## Rollout

- Feature remains behind the existing Metrics toggle.  
- Swap Read wiring from `HeuristicScorePanel` → `SongStatsPanel`.  
- Do not change combat default scoring in this slice.

## Open constants (implementation may tune with fixtures)

| Constant | v1 default |
|----------|------------|
| Rhyme window | 24 |
| \(RD\) normalize ceiling | 2.0 |
| Vocab normalize ceiling | 60 unique / 100w |
| Flow blend | 0.55 SPS · 0.45 Sync |
| Estimated pacing | 90 BPM · 4 beats/line |
| SPS normalize ceiling | 8.0 syl/s |
| Min words | 8 |
| Composite weights | 0.40 / 0.35 / 0.25 |

Tune ceilings only with documented fixture evidence; do not silently change weights without a spec update.
