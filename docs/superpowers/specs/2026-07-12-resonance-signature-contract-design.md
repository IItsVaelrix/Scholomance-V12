# Resonance as Per-Token Signatures, Not Pairwise Connections

**Date:** 2026-07-12
**Status:** Approved for planning
**Supersedes:** the pairwise `phrase_compound` path in `deepRhyme.engine.js`

## Problem

`/api/analysis/panels` emits a JSON payload that grows **quadratically** with the verse:

| verse in | response out | blowup |
|---|---|---|
| 500 chars | 1.2 MB | 2,466× |
| 1,500 chars | 7.7 MB | 5,111× |
| 3,000 chars | 30.4 MB | 10,139× |

Past ~6,000 characters the analysis exceeds the client's 5,000 ms `AbortController` and TrueSight reports `Dictionary Oracle timed out` (bytecode `0x0301`). Past ~12,000 characters the server dies outright: `FATAL ERROR: Reached heap limit Allocation failed — JavaScript heap out of memory`, inside `JSON.stringify`.

**98.8% of that payload is one connection type.** On a 1,500-char verse (246 words):

| count | type |
|---|---|
| **18,032** | `phrase_compound` |
| 125 | perfect |
| 46 | assonance |
| 40 | near |

`findPhraseConnections` (`deepRhyme.engine.js:335`) runs an explicit O(n²) nested scan over every multi-token window pair. 246 words have 30,135 possible pairs; it emits 18,032 of them. Nothing in the frontend reads a single one — `src/lib/truesight/buildResonanceGate.js` colors only `identity`/`perfect`/`near`/`slant` and `assonance`, and explicitly excludes `phrase_compound`.

### The deeper fault

A rhyme is stored **referentially**, as a pair. But two phrases rhyme because of a property each holds **independently** — their ending signature. The pair is *derivable*; storing it is redundant. One signature per token is O(n); every pair is O(n²). Same information, quadratically different cost.

### The architecture already exists

`codex/runtime/rhyme-astrology/queryEngine.js` already does this correctly, and `panelAnalysis.service.js:699` already constructs it. Its output (`data.rhymeAstrology`, ~40 KB) carries per-token signs:

```json
{ "word": "bright", "charStart": 42, "charEnd": 48,
  "sign": "AY-T",
  "dominantVowelFamily": "AY",
  "activeWindowIds": [43, 46, 48, 49] }
```

Backed by a real index — `codex/services/rhyme-astrology/indexRepo.js` exposes `lookupBucketMembers(endingSignature, limit)` and `lookupHotEdges(id, limit)` against a SQLite `rhyme_index`, with a `bucketCandidateCap`.

The endpoint therefore runs **two rhyme systems side by side**: the indexed, bucketed, capped one (40 KB) and the legacy pairwise scan (6.83 MB) — expressing the same information.

## Design

**One representation, two derivations.** Every token *and every multi-token window* is assigned a `sign` (its ending signature, via `buildEndingSignature` in `signatures.js`). `higher fire`, `desire` and `fire` all carry `AY-ER`. A rhyme is "same sign," never a stored pair.

### 1. Wire contract — O(n)

`toMinimalAnalysisPayload` (`panelAnalysis.service.js`) stops emitting `phrase_compound` connections and instead emits:

```js
phraseWindows: [ { charStart, charEnd, sign, syllableCount } ]
```

Pairs are implied by shared `sign` and are never enumerated on the wire. `allConnections` keeps only the types the gate actually consumes.

### 2. Server-side derivation — O(n × cap)

`findPhraseConnections` loses its nested loop and becomes a **sign-assignment pass**. It already builds `phraseNodes` carrying `analysis`; it needs `buildEndingSignature(analysis.phonemes)` rather than pairwise `scoreMultiSyllableMatch`.

`multisyllabic_rhyme` genuinely needs pairs (`wordA`/`wordB`, `syllablesMatched`, tier, line coverage) and calls `rhymeEngine.analyzeDocument()` itself — it does not read the wire. It gets pairs by enumerating **within a sign bucket only**, bounded by `bucketCandidateCap`. Cost drops from O(n²) across the document to O(n × cap) inside buckets, and the pairs it receives are real rhymes rather than cross-bucket coincidences.

### 3. The gate stays authoritative

The **backend assigns** the sign; the frontend groups by it and colors. The browser never recomputes a vowel family and never compares phonetics — it renders confirmed indices only. This satisfies `BUGPATTERN_COLOR_DRAGON_FRONTEND_FALLBACK` and is *strictly more* compliant than today, where the frontend receives 18k raw connections and applies its own score thresholds locally.

### 4. Failure semantics

`phoneme.engine.js:509` currently swallows Oracle failures:

```js
} catch (_e) { /* noop — authority lookup is best-effort */ }
```

When `lookupBatch` fails, `AUTHORITY_CACHE` stays empty and **every word silently falls back to spelling-based heuristic vowel families** (`heuristic_fallback` / `rule_based_split`, line 783). Coloring does not stop — it becomes confidently *wrong* (`love`/`move`, `though`/`tough` get inverted). This is the "system feels stupid" symptom and it is the exact drift the gene forbids: *"do not trust frontend-only phoneme analysis over backend truth."*

The empty catch is removed. Authority failure must surface, and TrueSight must render **uncolored** rather than heuristically mis-colored.

## Regression Net

The load-bearing invariant — **coloring must not change**:

- `perfect` / `near` / `assonance` connection counts identical before and after on a fixture verse (baseline: 125 / 46 / 40 on the 1,500-char fixture).
- The resonance gate's colored `charStart` set is byte-identical.

Plus:
- Payload size: 1,500-char verse must drop from ~7.7 MB to well under 1 MB.
- A 12,000-char verse must not OOM and must return inside the 5,000 ms client abort.
- `npm test`, `npm run test:qa`, rhyme-coloring regression tests, immunity scan on changed files.

## Accepted Limitations

1. **Perfect tail compounds only.** Exact-sign matching catches `higher fire` ↔ `desire` (both `AY-ER`) but not *slant* compounds. Fuzzy matching needs similar signs to collide into one bucket — i.e. LSH. `codex/core/quantization/turboquant.js` provides the right primitive (Hadamard rotation → sign-bit SimHash codes), but it currently only *estimates similarity between two vectors* (`estimateInnerProduct`), which is still pairwise; and `buildPhoneticSignature` returns a **symbolic** object, not a numeric vector. Both an embedding and an LSH bucketing layer would need building. Deferred — and cheap to add later precisely because the contract will already be per-token rather than pairwise.

2. **Density score moves.** Capping bucket candidates means `multisyllabic_rhyme`'s density will not be bit-identical to today on dense verses. Accepted: its current input is 18k mostly-junk pairs.

## Files

| File | Change |
|---|---|
| `codex/core/rhyme-astrology/deepRhyme.engine.js` | `findPhraseConnections` → sign-assignment pass; drop the nested pairwise loop |
| `codex/server/services/panelAnalysis.service.js` | emit `phraseWindows`; stop emitting `phrase_compound` |
| `codex/core/heuristics/multisyllabic_rhyme.js` | derive pairs from capped intra-bucket enumeration |
| `codex/core/phonology/phoneme.engine.js` | remove the silent `catch`; surface authority failure |
| `src/lib/truesight/buildResonanceGate.js` | render uncolored when authority is unavailable |

## Prior Art In-Repo

- `codex/runtime/rhyme-astrology/queryEngine.js` — bucket lookup by `endingSignature`, `bucketCandidateCap`
- `codex/services/rhyme-astrology/indexRepo.js` — SQLite `rhyme_index`, `lookupBucketMembers`, `lookupHotEdges`
- `codex/core/rhyme-astrology/signatures.js` — `buildPhoneticSignature`, `buildEndingSignature`
- `deepRhyme.engine.js:626` — `buildPhoneticBuckets`, already used by every connection finder **except** the phrase scan
