# PIR-2026-07-13 — The Resonance Quadratic

**Post-Incident Review.** Why TrueSight died, why the backend core-dumped, why the system "felt stupid", and the arithmetic behind each fix.

---

## 1. The complaint

> "TrueSight color isn't working: STATE/??? Dictionary Oracle timed out, 0x0301"
> "Would this explain why my system feels *stupid* when it shouldn't?"

Two symptoms. One root. Neither error message told the truth.

---

## 2. The lie in the error message

`0x0301` is a generic wrapper (`ReadPage.jsx:1371`). The real string was `Dictionary Oracle timed out`, thrown at `scholomanceDictionary.api.js:169` when a 5,000 ms `AbortController` fires.

But **the dictionary was innocent**. A cold-booted backend answers `POST /api/lexicon/lookup-batch` in **11 ms**. The timeout came from `POST /api/analysis/panels`, which is fetched through the *same* `fetchJson` and therefore inherits the same abort **and the same error string**.

The message named the wrong subsystem. Every hypothesis it suggested was a dead end: rate limiting (disproved — 40 rapid calls, all 200), cold-start (disproved — 11 ms first query), main-thread blocking (disproved — worst long task 189 ms), a dead backend (disproved — the Vite proxy 500s in 46 ms, it does not hang).

---

## 3. The actual bug: a quadratic on the wire

Panel analysis emitted a JSON response that grew with the **square** of the verse.

| verse in | response out | bytes per input char |
|---|---|---|
| 500 chars | 1.2 MB | 2,466 |
| 1,500 chars | 7.7 MB | 5,111 |
| 3,000 chars | 30.4 MB | 10,139 |

Read the third column. **The bytes-per-character ratio itself doubles when the input doubles.** A linear payload has a constant ratio; a quadratic payload has a ratio that scales with `n`. That is the signature, and it is unmistakable:

```
payload(n) ∝ n²        because   payload(n)/n ∝ n
```

Extrapolating: 6,000 chars ≈ 120 MB, 12,000 ≈ 480 MB. At 12,000 the process died exactly where the arithmetic says it must:

```
FATAL ERROR: Reached heap limit Allocation failed — JavaScript heap out of memory
  ... in v8::internal::JsonStringify
```

It ran out of memory **serialising its own response**.

### Where the n² came from

On a 1,500-char verse (246 words), `allConnections` held 18,243 entries:

| count | type | share |
|---|---|---|
| **18,032** | `phrase_compound` | **98.8%** |
| 125 | perfect | |
| 46 | assonance | |
| 40 | near | |

246 words admit `C(246,2) = 30,135` possible pairs. `findPhraseConnections` emitted **18,032 of them — 60% of every possible pair in the document.** It ran an explicit nested loop over every multi-token window against every other:

```js
for (let i = 0; i < phraseNodes.length; i++)
  for (let j = i + 1; j < phraseNodes.length; j++)
```

And **no client read a single one.** `buildResonanceGate` colours only `identity/perfect/near/slant` and `assonance`, and explicitly excludes `phrase_compound`. The backend was computing, serialising, transmitting and parsing 18,032 objects so the browser could throw all of them away.

---

## 4. Why it was quadratic — the information-theoretic point

This is the whole insight, and it was the user's:

> *"Surely the more efficient way is to make each bucketed token state-independent as a vector… so the rhyme pair activates for that pair itself, and isn't referential to all the other ones."*

A rhyme was stored **referentially** — as a *pair*. But two words rhyme because of a property **each one holds independently**: its rhyme tail. `higher`, `fire` and `desire` all end `AY-ER`. The pair is *derivable* from the property; storing it is redundant.

```
store the pairs:     C(n,2) = n(n-1)/2   =  O(n²)
store the property:  n                    =  O(n)
```

Same information. Quadratically different cost. 246 words carry 246 tails — but 30,135 potential pairs.

---

## 5. The fix: the Resonance Fingerprint

Each token gets **one fixed-width code**, in the SCD64 discipline already used in this codebase: 64 hex chars, 8 blocks of 8, each block `sha256(canonical).slice(0,8)`.

```
FIRE   = R1FA031C 89E61C09 D78004D9 DAC10C9A 3FF70B6C F8CB5854 150BDEE9 4EB265BA
DESIRE = R1FA031C 89E61C09 D78004D9 DAC10C9A 3FF70B6C F8CB5854 CEA30C05 4EB265BA
                                                               ^^^^^^^^ onset only
```

**The load-bearing property:** a block is a hash of its canonical string, so

> two fingerprints share a block **if and only if** that canonical is identical.

Sharing a rhyme-bearing block **is** the bucket. No probability. Recall is *guaranteed*, not sampled.

The block-match count also grades the rhyme for free, landing on the **same tiers** `src/core/scd64/compareSCD64.ts` already defines:

| pair | blocks | SCD64 tier | rhyme |
|---|---|---|---|
| LIGHT ~ NIGHT | 7–8/8 | IDENTICAL / MUTATION | perfect |
| SIN ~ SIM | 6/8 | MUTATION | slant |
| OLD ~ OWED | 5–6/8 | RELATED_FAMILY | near |
| DESIRE ~ BANANA | 2/8 | WEAK_NEIGHBOR | none |

IDENTICAL / MUTATION / RELATED_FAMILY / WEAK_NEIGHBOR **is** perfect / slant / near / unrelated. The format already encoded graded family resemblance — which is exactly what a rhyme is.

### The blocks, and why each exists

| block | canonical | catches |
|---|---|---|
| `TAIL` | the exact rhyme tail | perfect rhymes |
| `CODALAST` | nucleus + **final** phoneme | coda-length shear: `OLD`(OW-L-D) ~ `OWED`(OW-D) |
| `CODAFIRST` | nucleus + **first** coda phoneme | consonant append: `line`(AY-N) ~ `mind`(AY-N-D) |
| `CODACLASS` | nucleus + manner/nasality, **`place` deliberately dropped** | slant: N and M differ *only* in `place` — that is what makes them slant partners |

Dropping `place` from `CODACLASS` is not a bug. It is the entire mechanism by which `SIN` and `SIM` become candidates.

---

## 6. The approach that failed, and the arithmetic that killed it

The first design used **SimHash over TurboQuant's Hadamard rotation**. It was implemented, measured, and rejected.

SimHash collision probability per bit, for two vectors at angle θ:

```
P(one bit agrees) = 1 − θ/π
```

For a genuine near-rhyme at cosine 0.85 → θ ≈ 31.8° ≈ 0.555 rad:

```
P(bit)          = 1 − 0.555/π            ≈ 0.823
P(8-bit band)   = 0.823⁸                 ≈ 0.22
P(any of 4)     = 1 − (1 − 0.22)⁴        ≈ 0.63
```

**A real rhyme became a candidate 63% of the time.** A coin flip decided whether it was ever *looked at* — and in this system **a missed candidate is invisible forever**: it can never be scored, so it can never be emitted. It failed in both directions simultaneously: `SIN~SIM` stopped colliding while `DESIRE~BANANA` started.

Deterministic block equality replaces `P ≈ 0.63` with `P = 1`.

**Rule extracted:** never let a probabilistic structure gate recall. Precision failures cost compute (a false candidate is rejected by the scorer). Recall failures cost *truth*.

---

## 7. Bounding the residue

Bucketing alone is not enough: rhyme-dense verse produces **large buckets**, and comparing within a bucket of size `k` is still `O(k²)`.

The first cap truncated each bucket to its first 16 members **in document order** — which made *every window past the 16th structurally unreachable*. A rhyme in the last stanza could never be found. Fast, and silently wrong.

Replaced with a **sliding window**: every node compares against its next `CAP` bucket-neighbours.

```
before:  bucket.slice(0, CAP)  →  O(CAP²) per bucket, and nodes past CAP never compared
after:   each node × next CAP  →  O(k · CAP) per bucket, every node participates
total:   O(n · CAP)            →  linear in the document
```

`PHRASE_BUCKET_CANDIDATE_CAP = 16`. At 32 the 24,000-char OOM crash returns.

**Invariant preserved throughout:** bucketing changes only *which pairs are examined*. Every surviving candidate is still scored by the pre-existing `scoreMultiSyllableMatch` at unchanged thresholds (`syllablesMatched ≥ 2 && score ≥ 0.6`). No score moved, so **no colour could move.**

---

## 8. The results

### Payload — quadratic to linear

| verse | before | after | bytes/char before | bytes/char after |
|---|---|---|---|---|
| 500 | 1.2 MB | **296 KB** | 2,466 | **606** |
| 1,500 | 7.7 MB | **625 KB** | 5,111 | **427** |
| 3,000 | 30.4 MB | **1,181 KB** | 10,139 | **403** |
| 6,000 | ~120 MB (est.) | **2,274 KB** | — | **388** |
| 12,000 | **OOM crash** | **4,481 KB** | — | **382** |
| 24,000 | **OOM crash** | **8,976 KB** | — | **383** |

The bytes-per-char column is the proof. Before: **doubles** with each doubling of input (`∝ n`, so payload `∝ n²`). After: **constant at ≈ 383** (payload `∝ n`).

**At 3,000 chars: 30.4 MB → 1.18 MB, a 25.7× reduction.** At 12,000 the old code did not have a payload — it had a core dump.

### Latency — against a 5,000 ms client abort

| verse | before | after |
|---|---|---|
| 3,000 | 3.67 s | **1.22 s** |
| 6,000 | 13.41 s ✗ timed out | **2.25 s** ✓ |
| 12,000 | **OOM — server core-dumped** | **4.78 s** ✓ |
| 24,000 | **OOM — server core-dumped** | 12.55 s (survives) |

The server no longer dies at any input size.

### Colour — provably unchanged

The load-bearing regression gate, on the committed fixture `tests/fixtures/rhyme/dense-verse.txt` (75 words):

| type | before | after |
|---|---|---|
| perfect | 34 | **34** |
| assonance | 44 | **44** |
| near | 29 | **29** |
| slant | 6 | **6** |
| *phrase_compound* | *1,335* | *694* |

Every coloured type is byte-identical. The 1,335 junk pairs collapsed — which was the point.

---

## 9. Why the system "felt stupid" — a separate bug, same investigation

`phoneme.engine.js` had this:

```js
} catch (_e) { /* noop — authority lookup is best-effort */ }
```

When the Dictionary Oracle failed, the error was **discarded**. `AUTHORITY_CACHE` stayed empty, and every word silently fell through to the heuristic path — which guesses the vowel family **from spelling**.

TrueSight did not stop colouring. It coloured **confidently wrong**:

| pair | spelling says | pronunciation says |
|---|---|---|
| love / move | rhyme | **do not rhyme** |
| though / tough | rhyme | **do not rhyme** |
| word / sword | rhyme | **do not rhyme** |

The system looked like it was working and was quietly lying. That is what "stupid" felt like — not slowness, a *silent demotion to guessing from spelling*.

Fixed in two halves: the failure is now **knowable** (`PhonemeEngine.authorityFailure`) and **honest** (the gate renders **uncoloured** rather than wrong). *A blank gate is honest; a wrong gate is a lie.*

**And a trap worth recording:** both halves shipped with green unit tests while the bug was still live — because `ReadPage.jsx` called `buildResonanceGate(connections)` with **no second argument**. The flag was emitted on the wire and read by the gate, and nothing joined the two. The early return was dead code. *Unit tests at both ends of a chain can both pass while the middle hop does not exist.* `tests/lib/authorityGate.chain.test.js` now asserts the chain, not the units.

---

## 10. Bonus defect found en route

`createVectorNNPhonemeSignature` (the g2p OOV pronunciation retriever) built a 256-dim vector from `seededRandom(SEED + word.length)` — seeded on the word's **length** and nothing else. Every word of the same length got an identical vector.

| pair | before | reality |
|---|---|---|
| DESIRE ~ BANANA | **1.0000** | unrelated (both 6 letters) |
| FIRE ~ GLOW | **1.0000** | not a rhyme (both 4 letters) |
| **FIRE ~ DESIRE** | **−0.0398** | **a real rhyme, scored as unrelated** |

It scored non-rhymes as perfect and real rhymes as orthogonal — **exactly inverted** — and it was wired into OOV pronunciation candidate selection, feeding wrong phonemes into the engine. Now a hashed character-n-gram embedding of spelling: FIRE~DESIRE **0.559**, DESIRE~BANANA **0.000**.

---

## 11. Lessons

1. **A ratio that grows is a quadratic.** Bytes-per-char doubling with each doubling of input diagnosed the bug before a profiler was opened.
2. **Referential storage is the quadratic.** If a relation is derivable from a property each participant holds independently, store the property. `n` beats `n(n−1)/2`.
3. **Never let a probabilistic structure gate recall.** A false candidate costs compute; a missed candidate costs truth.
4. **Silent fallbacks are worse than failures.** A system that degrades to guessing without telling you doesn't look broken — it looks *stupid*.
5. **Test the chain, not the units.** Both ends can be green while the middle hop is missing.
6. **The error message named the wrong subsystem.** "Dictionary Oracle timed out" was the dictionary's error string on the *analysis* endpoint's timeout. Shared error paths launder blame.

---

*Entry Status: RESOLVED | 9 tasks | 10 source files | Branch V13 | Last Updated: 2026-07-13*
