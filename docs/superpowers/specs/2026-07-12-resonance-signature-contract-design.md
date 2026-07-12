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

Past ~6,000 characters the analysis exceeds the client's 5,000 ms `AbortController` and TrueSight reports `Dictionary Oracle timed out` (bytecode `0x0301`). Past ~12,000 characters the server dies: `FATAL ERROR: Reached heap limit Allocation failed — JavaScript heap out of memory`, inside `JSON.stringify`.

**98.8% of that payload is one connection type.** On a 1,500-char verse (246 words):

| count | type |
|---|---|
| **18,032** | `phrase_compound` |
| 125 | perfect |
| 46 | assonance |
| 40 | near |

`findPhraseConnections` (`deepRhyme.engine.js:335`) runs an explicit O(n²) nested scan over every multi-token window pair. 246 words have 30,135 possible pairs; it emits 18,032. Nothing in the frontend reads one — `src/lib/truesight/buildResonanceGate.js` colors only `identity`/`perfect`/`near`/`slant` and `assonance`, and explicitly excludes `phrase_compound`.

### The deeper fault

A rhyme is stored **referentially**, as a pair. But two phrases rhyme because of a property each holds **independently** — its rhyme tail. The pair is *derivable*; storing it is redundant. One signature per token is O(n); every pair is O(n²). Same information, quadratically different cost.

### The architecture already exists

`codex/runtime/rhyme-astrology/queryEngine.js` already does this correctly, and `panelAnalysis.service.js:699` already constructs it. Its output (`data.rhymeAstrology`, ~40 KB) carries per-token signs:

```json
{ "word": "bright", "charStart": 42, "charEnd": 48,
  "sign": "AY-T", "dominantVowelFamily": "AY",
  "activeWindowIds": [43, 46, 48, 49] }
```

Backed by `codex/services/rhyme-astrology/indexRepo.js` — SQLite `rhyme_index`, `lookupBucketMembers(endingSignature, limit)`, `lookupHotEdges(id, limit)`, `bucketCandidateCap`.

The endpoint runs **two rhyme systems side by side**: the indexed, bucketed, capped one (40 KB) and the legacy pairwise scan (6.83 MB), expressing the same information.

## Design

**One representation, two derivations.** Every token and every multi-token window carries a `sign` — a **quantized phonetic code** for its rhyme tail. `higher fire`, `desire` and `fire` all land on the same code. A rhyme is "same sign," never a stored pair. Perfect rhymes collide exactly; slant rhymes collide approximately; nothing is enumerated.

### Unit 1 — The phonetic tail embedding (enables slant rhyme)

```
rhyme tail (ARPABET) → articulatory feature vector → TurboQuant (Hadamard + sign bits) → SimHash code → bucket
```

The tail is embedded over **articulatory features** — vowel height / backness / rounding; coda manner / place / voicing — so that `AY-ER` ≈ `AY-UR`, and `-IN` ≈ `-IM` (same place, different nasal). `codex/core/quantization/turboquant.js` supplies the primitive (`fastHadamardTransform`, `quantizeF32To4Bit`); the sign-bits of the rotated vector become the bucket code.

Exact-string signs (`AY-ER`) are the degenerate case of the quantized sign, so the existing `endingSignature` path stays valid while this lands.

**Threshold:** tuned empirically against a representative dense fixture so the colored set stays close to today's 125 perfect / 40 near / 46 assonance, with a hard cap on connections per bucket. Over-coloring is the known failure mode here (see the TrueSight skittles notes) and the tuning target is *not* maximal recall.

### Unit 2 — The g2p grapheme embedding (independent live bug)

`createVectorNNPhonemeSignature` (`codex/core/phonology/g2p/candidates/vector-nn.candidate.generator.js:14`) is a **stub that carries zero phonetic information**:

```js
const rand = seededRandom(VECTOR_AMP_SEED + word.length);   // seeded by word.LENGTH only
for (let i = 0; i < 256; i++) vec[i] = rand() * 2 - 1;       // random numbers
```

Measured cosine similarities from it:

| pair | similarity | reality |
|---|---|---|
| DESIRE vs BANANA | **1.0000** | unrelated (both 6 letters) |
| FIRE vs GLOW | **1.0000** | not a rhyme (both 4 letters) |
| **FIRE vs DESIRE** | **-0.0398** | **a real rhyme — scored as unrelated** |

It is wired into `substring.candidate.generator.js:56`, where it tops up **OOV pronunciation candidates**. So unknown words currently receive candidate pronunciations chosen by word length, which can feed the phoneme engine wrong phonemes.

This is **grapheme space**, not phoneme space — its job is "spelled like these dictionary words, borrow their pronunciation." It is filled in with a real character-n-gram embedding, and it is a **separate unit with its own test**: it fails differently from Unit 1 and must be verifiable independently.

### Unit 3 — Wire contract, O(n)

`toMinimalAnalysisPayload` (`panelAnalysis.service.js`) stops emitting `phrase_compound` and instead emits:

```js
phraseWindows: [ { charStart, charEnd, sign, syllableCount } ]
```

Pairs are implied by shared `sign` and never enumerated on the wire. `allConnections` keeps only the types the gate consumes.

### Unit 4 — Server-side derivation, O(n × cap)

`findPhraseConnections` loses its nested loop and becomes a **sign-assignment pass** (it already builds `phraseNodes` with `analysis`).

`multisyllabic_rhyme` genuinely needs pairs (`wordA`/`wordB`, `syllablesMatched`, tier, line coverage) and calls `rhymeEngine.analyzeDocument()` itself — it does not read the wire. It gets pairs by enumerating **within a sign bucket only**, bounded by `bucketCandidateCap`. O(n²) across the document becomes O(n × cap) inside buckets, and the pairs are real rhymes rather than cross-bucket coincidences.

### Unit 5 — Failure semantics

`phoneme.engine.js:509` swallows Oracle failures:

```js
} catch (_e) { /* noop — authority lookup is best-effort */ }
```

When `lookupBatch` fails, `AUTHORITY_CACHE` stays empty and **every word silently falls back to spelling-based heuristic vowel families** (`heuristic_fallback` / `rule_based_split`, line 783). Coloring does not stop — it becomes confidently *wrong* (`love`/`move`, `though`/`tough` invert). This is the "system feels stupid" symptom, and the exact drift `BUGPATTERN_COLOR_DRAGON_FRONTEND_FALLBACK` forbids.

The empty catch is removed. Authority failure surfaces, and TrueSight renders **uncolored** rather than heuristically mis-colored.

### The gate stays authoritative

The **backend assigns** the sign; the frontend groups by it and colors. The browser never recomputes a vowel family and never compares phonetics — it renders confirmed indices only. Strictly *more* gene-compliant than today, where the frontend receives 18k raw connections and applies its own score thresholds locally.

## Regression Net

Load-bearing invariant — **coloring must not regress**:

- `perfect` / `near` / `assonance` counts on the fixture verse stay at 125 / 40 / 46 (or move only by an explicitly reviewed delta from slant matching).
- The resonance gate's colored `charStart` set does not flood — measured against the dense fixture, not eyeballed.

Plus:
- 1,500-char verse: payload drops from ~7.7 MB to well under 1 MB.
- 12,000-char verse: no OOM, returns inside the 5,000 ms client abort.
- Unit 2 has its own test: FIRE↔DESIRE must score *high*, DESIRE↔BANANA must score *low* — the current stub inverts both.
- `npm test`, `npm run test:qa`, rhyme-coloring regression tests, immunity scan on changed files.

## Accepted Limitations

**Density score moves.** Capping bucket candidates means `multisyllabic_rhyme`'s density will not be bit-identical on dense verses. Accepted: its current input is 18k mostly-junk pairs.

## Files

| File | Change |
|---|---|
| `codex/core/phonology/g2p/candidates/vector-nn.candidate.generator.js` | **Unit 2** — replace the length-keyed random stub with a real grapheme embedding |
| *(new)* phonetic tail embedding | **Unit 1** — articulatory feature vector + TurboQuant quantized sign |
| `codex/core/rhyme-astrology/deepRhyme.engine.js` | **Unit 4** — `findPhraseConnections` → sign-assignment pass; drop the nested loop |
| `codex/server/services/panelAnalysis.service.js` | **Unit 3** — emit `phraseWindows`; stop emitting `phrase_compound` |
| `codex/core/heuristics/multisyllabic_rhyme.js` | **Unit 4** — pairs from capped intra-bucket enumeration |
| `codex/core/phonology/phoneme.engine.js` | **Unit 5** — remove the silent catch |
| `src/lib/truesight/buildResonanceGate.js` | **Unit 5** — render uncolored when authority is unavailable |

## Prior Art In-Repo

- `codex/runtime/rhyme-astrology/queryEngine.js` — bucket lookup by `endingSignature`, `bucketCandidateCap`
- `codex/services/rhyme-astrology/indexRepo.js` — SQLite `rhyme_index`, `lookupBucketMembers`, `lookupHotEdges`
- `codex/core/rhyme-astrology/signatures.js` — `buildPhoneticSignature`, `buildEndingSignature`
- `codex/core/quantization/turboquant.js` — `fastHadamardTransform`, `quantizeF32To4Bit`, `estimateInnerProduct`
- `deepRhyme.engine.js:626` — `buildPhoneticBuckets`, already used by every connection finder **except** the phrase scan
