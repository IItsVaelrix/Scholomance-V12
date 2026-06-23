# Keyword Gap Analysis PDR v1

## Bytecode Search Code
`SCHOL-ENC-BYKE-SEARCH-PDR-KEYWORD-GAP-ANALYSIS`

## 0. Document Status

**Project name:** Career Keyword Gap Analysis
**Codex name:** Resonance Alignment Engine
**Document type:** Product Design Requirements / Engineering Handoff
**Target codebase:** Scholomance / `src/lib/career/`
**Primary implementation mode:** Deterministic, pure, read-only analysis + one behavior-preserving transmuter change
**Implementation priority:** High — closes the gap between "themed string transformer" and "credible ATS tool"
**Risk level:** Low runtime risk (analysis is pure/read-only); one scoped behavior change to `transmuteToSigil`
**Owner intent:** Make the Career Transmuter actually align a résumé to a target job description instead of swapping vocabulary blindly

---

## 1. Executive Summary

### What to Build

A deterministic `keyword-gap` module that compares a résumé against a target **job description (JD)** and reports what the JD asks for that the résumé is missing — with a numeric match score — and that **stops the existing synonym swap from deleting JD keywords**.

This PDR scopes **three pieces as one indivisible Phase 1 deliverable**, because shipping any one without the others leaves the product internally contradictory:

1. **Keyword-gap analysis** — extract the JD's important terms, classify each as matched/missing against the résumé.
2. **Match score** — a single 0–100 number quantifying coverage, plus the matched/missing breakdown behind it.
3. **Swap-conflict resolution** — when the JD uses a word that `TORQUE_MAP` would rewrite (e.g. JD says *managed*, transmuter swaps *managed → Catalyzed*), the transmuter must **preserve the literal JD term** instead of silently lowering the match score it just measured.

### Why It Exists

Today the Career Transmuter is a static thesaurus with a theme. It has **no concept of the job being applied to**, so:

* It cannot tell a user what they are missing.
* It produces no score, so there is no measurable outcome.
* Its headline mechanic — replacing `managed → Catalyzed`, `led → Orchestrated` — **reduces literal keyword overlap** with the JD. Real ATS (Workday, Greenhouse, Lever, Taleo) match on literal terms from the posting. The current tool can actively hurt the thing it claims to optimize.

The three deliverables together flip this: the tool measures alignment to a specific JD, reports the gap, and stops working against itself.

### The Non-Negotiable Coupling

> Gap analysis that runs on top of an unchanged synonym swap is a tool that **measures a keyword gap and then widens it.**

Therefore deliverable 3 (swap-conflict resolution) is not optional polish — it is the load-bearing half of deliverable 1. Phase 1 is not complete until all three ship together.

---

## 2. Change Classification

**Primary classification:** Feature (new analysis capability)
**Secondary classification:** Behavioral (scoped change to `transmuteToSigil` word replacement)
**Cosmetic impact:** New score + gap UI (out of scope here; this PDR is the engine)
**Backward compatibility:** `transmuteToSigil(text)` with no options behaves exactly as today. New behavior is opt-in via `options.preserveKeywords`.

---

## 3. Problem Statement

The category-defining tools (Jobscan, Teal, Rezi, Resume Worded) all work on one axis the Transmuter lacks: **the target job description.** They diff the résumé against the JD, surface missing hard/soft skills, and produce a match score.

The Transmuter instead:

* Takes no JD input.
* Performs context-free synonym substitution from a fixed 25-entry map.
* Injects 8 generic buzz-phrases chosen by a hash, unrelated to any role.
* Emits no score and no actionable gap.

The result is a novelty. This PDR makes it JD-aware and self-consistent.

---

## 4. Goals

### Phase 1 Goals (all three ship together)

1. Create `src/lib/career/keyword-gap.js`.
2. Deterministically extract weighted keywords (unigrams + bigrams) from a JD.
3. Classify each JD keyword as **matched** or **missing** against the résumé using symmetric light stemming.
4. Produce a **match score** (weighted coverage, 0–100) plus a raw count score.
5. Detect **torque conflicts**: JD keywords that `TORQUE_MAP` would rewrite away.
6. Add an opt-in `preserveKeywords` option to `transmuteToSigil` that **skips** swaps for those terms.
7. Provide one orchestrator entry, `buildKeywordAwareSigil(resume, jd, options)`, that wires analysis → preserve set → transmute.
8. Full Vitest coverage: determinism, stemming symmetry, score math, conflict detection, preserve behavior, empty/malformed input.
9. Preserve all existing `transmuteToSigil` behavior when no JD/options are supplied.

### Phase 2 Goals (explicitly out of scope here)

1. Quantification prompts ("this bullet has no metric").
2. Résumé section/structure detection.
3. Drive the resonance anchors from the JD's top **matched** keywords instead of the static buzz list.
4. Skills-lexicon expansion + synonym grouping (e.g. "JS" ≈ "JavaScript").
5. File-format ingestion (PDF/DOCX → text).

---

## 5. Non-Goals

Phase 1 must **not**:

1. Fabricate or inject skills the user does not have (no keyword stuffing).
2. Auto-insert missing JD keywords into the résumé body.
3. Make any network call, scrape a URL, or call an LLM.
4. Store, log, or transmit résumé/JD text (PII).
5. Use a full Porter/Snowball stemmer (Phase 1 uses a small, symmetric, deterministic stemmer).
6. Mutate caller-owned input.
7. Use `Date.now()`, `performance.now()`, or `Math.random()` anywhere.
8. Change `transmuteToSigil` output when called the old way (no options).

---

## 6. Dependency Check

| System | Relationship | Risk |
| ------ | ------------ | ---- |
| `transmuter.js` `TORQUE_MAP` | Read (for conflict detection) + new `preserveKeywords` skip | Low — requires exporting the map/keys |
| `transmuteToSigil` | Scoped behavior change (opt-in) | Low — gated behind options, covered by existing 22 tests |
| `CareerPage.tsx` | Future consumer (score + gap UI) | Out of scope here |

### Required upstream change

`transmuter.js` must export its torque vocabulary so the analyzer can detect conflicts without duplicating the map:

```js
export const TORQUE_MAP = { /* unchanged */ };
```

### Dependency direction (no cycles)

```text
transmuter.js          (leaf: TORQUE_MAP, transmuteToSigil)
      ▲
keyword-gap.js         (imports TORQUE_MAP; pure analysis)
      ▲
sigil-pipeline.js      (orchestrator: imports both)
```

`transmuter.js` must never import `keyword-gap.js`.

---

## 7. Architecture Overview

```text
résumé text ─┐
             ├─► analyzeKeywordGap ─► KeywordGapReport ─┐
JD text ─────┘        │ (pure)        (score, matched,  │
                      │                missing,         │
                      ▼                torqueConflicts) │
              detectTorqueConflicts ───────────────────┤
                                                        ▼
                                          preserveKeywords (JD terms)
                                                        │
                                                        ▼
résumé text ───────────────────────────────► transmuteToSigil({ preserveKeywords })
                                                        │
                                                        ▼
                                              { sigil, report }
```

---

## 8. Proposed File Map

```text
src/lib/career/
  transmuter.js        (MODIFY: export TORQUE_MAP; add preserveKeywords option)
  keyword-gap.js       (NEW: analyzeKeywordGap, detectTorqueConflicts, helpers)
  sigil-pipeline.js    (NEW: buildKeywordAwareSigil orchestrator)
  stopwords.js         (NEW: frozen stopword set)

tests/unit/
  careerTransmuter.test.js   (EXTEND: preserveKeywords behavior)
  keywordGap.test.js         (NEW)
  sigilPipeline.test.js      (NEW)
```

---

## 9. Public API

```js
// keyword-gap.js
analyzeKeywordGap(resumeText, jobDescriptionText, options) // -> KeywordGapReport
detectTorqueConflicts(jobKeywords, torqueMap)              // -> TorqueConflict[]

// transmuter.js (modified)
transmuteToSigil(text, options) // options.preserveKeywords?: string[]

// sigil-pipeline.js
buildKeywordAwareSigil(resumeText, jobDescriptionText, options) // -> { sigil, report }
```

### Options

```js
{
  topK?: number,            // JD keywords considered for scoring (default 30)
  minLength?: number,       // min token length to count (default 3)
  includeBigrams?: boolean, // default true
  skillsLexicon?: string[], // terms to weight higher (default built-in seed)
  preserveKeywords?: string[] // transmuter only: terms to NOT swap
}
```

---

## 10. Core Contracts

### KeywordGapReport

```js
{
  schemaVersion: 1,
  score: number,        // 0..100 weighted coverage over the topK JD keywords
  rawScore: number,     // 0..100 unweighted matched/total over topK
  matched: KeywordHit[],
  missing: KeywordHit[],
  jobKeywords: KeywordHit[],   // the topK considered, weight-sorted
  torqueConflicts: TorqueConflict[],
  diagnostics: string[],
  metadata: {
    deterministic: true,
    topK: number,
    jdKeywordCount: number,
    resumeTokenCount: number
  }
}
```

### KeywordHit

```js
{ term: string, stem: string, kind: 'unigram' | 'bigram',
  frequency: number, weight: number, inSkillsLexicon: boolean, matched: boolean }
```

### TorqueConflict

```js
// JD keyword "managed" would be rewritten to "Catalyzed" by the transmuter.
{ jobTerm: 'managed', torqueKey: 'managed', wouldReplaceWith: 'Catalyzed' }
```

---

## 11. Determinism Contract

1. Same `(resume, jd, options)` ⇒ identical `KeywordGapReport` (deep-equal, including array order).
2. Keyword ordering is a **stable total order**: weight descending, then term ascending — never insertion/Map-iteration order.
3. The stemmer is **symmetric**: `stem(x)` applied to résumé and JD sides uses the identical function, so `managed`/`managing`/`manage` collapse to one stem on both sides.
4. No `Date.now()`, `performance.now()`, `Math.random()`.
5. No mutation of `resumeText`, `jobDescriptionText`, `options`, or `TORQUE_MAP`.
6. Score is rounded with a single fixed rule (`Math.round`) so it is reproducible.
7. `diagnostics` strings are stable for the same input.

---

## 12. Strategy

### 12.1 Normalization

```js
function normalizeText(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/['’]/g, '')              // team's -> teams
    .replace(/[^a-z0-9+#.\s-]/g, ' ')  // keep tech tokens: c++, c#, node.js, ci-cd
    .replace(/\s+/g, ' ')
    .trim();
}
```

> Known limitation (documented, not a bug): keeping `.` for `node.js` means trailing sentence periods can cling to a token; the stemmer and stopword pass absorb most of this. Tightening tech-token handling is a Phase 2 lexicon concern.

### 12.2 Light symmetric stemmer

Intentionally aggressive but **symmetric** — both sides get the same transform, so matching is consistent even when the linguistic stem is "wrong":

```js
function stem(token) {
  let t = token;
  if (t.length > 4 && t.endsWith('ing')) t = t.slice(0, -3);
  else if (t.length > 3 && t.endsWith('ed')) t = t.slice(0, -2);
  else if (t.length > 3 && t.endsWith('es')) t = t.slice(0, -2);
  else if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss')) t = t.slice(0, -1);
  if (t.length > 4 && t.endsWith('e')) t = t.slice(0, -1); // manage/managed/managing -> manag
  return t;
}
```

### 12.3 Keyword extraction & weighting

* Tokenize normalized text; drop stopwords and tokens shorter than `minLength`.
* Candidates = unigrams + adjacent bigrams (order preserved).
* Weight per term:

```js
weight = base(kind) * (1 + Math.log2(frequency)) * (inSkillsLexicon ? 1.5 : 1)
// base: unigram = 1.0, bigram = 2.0  (multi-word skills matter more)
```

* Keep the top `topK` JD keywords by the stable order.

### 12.4 Matching

* Build the résumé stem set once.
* A **unigram** keyword is matched if its stem is in the résumé set.
* A **bigram** keyword is matched if **both** component stems are in the résumé set (forgiving; phrase adjacency not required). This choice favors recall; documented so it can be tightened later.

### 12.5 Scoring

```js
score    = Math.round(100 * sumWeights(matched) / sumWeights(all));   // weighted
rawScore = Math.round(100 * count(matched)      / count(all));        // unweighted
```

Empty JD ⇒ score `0`, empty `jobKeywords`, explicit diagnostic — never `NaN` (guard the divide-by-zero).

### 12.6 Swap-conflict resolution

```js
function detectTorqueConflicts(jobKeywords, torqueMap) {
  const byStem = new Map(); // stem(torqueKey) -> { key, value }
  for (const [low, high] of Object.entries(torqueMap)) {
    byStem.set(stem(low), { key: low, value: high });
  }
  const conflicts = [];
  for (const kw of jobKeywords) {
    if (kw.kind !== 'unigram') continue;
    const hit = byStem.get(kw.stem);
    if (hit) conflicts.push({ jobTerm: kw.term, torqueKey: hit.key, wouldReplaceWith: hit.value });
  }
  return conflicts; // stable order: jobKeywords is already weight-sorted
}
```

The transmuter consumes `preserveKeywords` (the conflicting JD terms) and **skips** those torque entries:

```js
export function transmuteToSigil(text, options = {}) {
  if (!text) return "";
  const preserve = buildPreserveStemSet(options.preserveKeywords); // Set of stemmed terms

  let optimized = stripSigil(String(text));

  Object.entries(TORQUE_MAP).forEach(([low, high]) => {
    if (preserve.has(stem(low))) return; // keep the literal JD keyword
    optimized = optimized.replace(new RegExp(`\\b${low}\\b`, 'gi'), high);
  });
  // ...unchanged normalization, resonance, wrapping...
}
```

> Note: `stem` must be shared between modules. Extract it to a tiny `src/lib/career/text-utils.js` (or export from `keyword-gap.js`) so transmuter and analyzer use the byte-identical function — the determinism contract depends on symmetry.

### 12.7 Orchestrator

```js
// sigil-pipeline.js
import { analyzeKeywordGap } from './keyword-gap.js';
import { transmuteToSigil } from './transmuter.js';

export function buildKeywordAwareSigil(resumeText, jobDescriptionText, options = {}) {
  const report = analyzeKeywordGap(resumeText, jobDescriptionText, options);
  const preserveKeywords = report.torqueConflicts.map((c) => c.jobTerm);
  const sigil = transmuteToSigil(resumeText, { ...options, preserveKeywords });
  return { sigil, report };
}
```

---

## 13. Implementation Plan

**Step 1 — Extract shared `stem`/`normalizeText`** into `text-utils.js`; re-point any transmuter usage. No behavior change yet.

**Step 2 — Export `TORQUE_MAP`** from `transmuter.js`.

**Step 3 — Build `stopwords.js`** (frozen `Set` of ~150 common English + résumé-boilerplate words: "responsible", "work", "team" is borderline — keep "team" as it's often a real keyword; document choices).

**Step 4 — Implement `keyword-gap.js`**: `normalize → tokenize → extract → weight → match → score`, plus `detectTorqueConflicts`. Pure, frozen output.

**Step 5 — Add `preserveKeywords`** to `transmuteToSigil` (Step 12.6). Default path unchanged.

**Step 6 — Implement `sigil-pipeline.js`** orchestrator.

**Step 7 — Tests** (Section 14).

**Step 8 — Wire UI** (Phase 2 / separate task): JD textarea, score readout, missing-keyword chips, conflict notice.

---

## 14. QA Plan

### `keywordGap.test.js`

1. Deterministic: same input ⇒ deep-equal report (run twice).
2. Stemmer symmetry: résumé "managed" matches JD "managing"/"manage".
3. Bigram extraction: "project management" surfaces as a weighted bigram.
4. Matched vs missing: a JD term present in résumé is `matched: true`; absent is in `missing`.
5. Score math: hand-computed weighted coverage matches `score`; raw matches `rawScore`.
6. Divide-by-zero: empty JD ⇒ `score === 0`, no `NaN`, diagnostic present.
7. Skills lexicon boost: a lexicon term outranks an equal-frequency non-lexicon term.
8. Stable ordering: equal-weight terms ordered alphabetically.
9. No input mutation: `Object.isFrozen(report)`; inputs unchanged.
10. Conflict detection: JD "managed" ⇒ one `TorqueConflict { torqueKey:'managed', wouldReplaceWith:'Catalyzed' }`.

### `careerTransmuter.test.js` (extend)

11. `preserveKeywords: ['managed']` ⇒ output retains literal "Managed"/"managed", not "Catalyzed".
12. Non-preserved swaps still fire (e.g. "built" → "Architected").
13. No options ⇒ byte-identical to legacy output (golden test).
14. `preserveKeywords` is matched by stem ("managing" preserves "managed").

### `sigilPipeline.test.js`

15. `buildKeywordAwareSigil` returns `{ sigil, report }`; the sigil does **not** swap any JD-conflicting term.
16. End-to-end determinism: same `(resume, jd)` ⇒ identical sigil and report.
17. The score reflects the résumé pre-transmute (analysis runs on raw résumé).

---

## 15. QA Commands

```bash
pnpm test tests/unit/keywordGap.test.js tests/unit/sigilPipeline.test.js tests/unit/careerTransmuter.test.js
pnpm test          # full suite — no regressions
pnpm lint
```

---

## 16. Acceptance Criteria

1. All new + existing career tests pass; full suite green.
2. `analyzeKeywordGap` is deterministic and returns a frozen report.
3. `score`/`rawScore` are integers in `[0, 100]`; empty JD ⇒ `0`, never `NaN`.
4. Every `TORQUE_MAP` key that appears as a JD keyword shows up in `torqueConflicts`.
5. With `preserveKeywords` supplied, the transmuter never rewrites those terms.
6. `transmuteToSigil(text)` with no options is byte-identical to current output (golden test 13).
7. No `Date.now` / `performance.now` / `Math.random` in the analyzer or pipeline.
8. No network, no PII persistence, no skill fabrication.
9. The stemmer is symmetric across résumé and JD (shared function).

---

## 17. Regression Risks

### Risk 1 — Transmuter behavior drift
**Cause:** `preserveKeywords` plumbing alters the default path.
**Mitigation:** golden test 13 pins legacy output; `preserve` is empty when no option given.

### Risk 2 — Over-aggressive stemmer collisions
**Cause:** symmetric-but-crude stemming maps unrelated words together (e.g. "ode"-ish stems).
**Mitigation:** `minLength` floor; accept recall-over-precision in Phase 1; tests assert the common verb families; Phase 2 lexicon refines.

### Risk 3 — Score is misleading vs real ATS
**Cause:** our weighting ≠ any specific ATS algorithm.
**Mitigation:** label the score "Resonance Alignment" (heuristic coverage), not "ATS pass probability." Do not overclaim — the Photonic Retina PDR's Risk 5 lesson applies: heuristic, not hardware-backed.

### Risk 4 — Keyword stuffing temptation
**Cause:** future pressure to auto-insert missing terms.
**Mitigation:** Non-Goal #1/#2 are explicit; the report only *reports* gaps, it never edits the résumé body.

### Risk 5 — Module cycle
**Cause:** transmuter importing keyword-gap.
**Mitigation:** enforced dependency direction (Section 6); `stem` lives in leaf `text-utils.js`.

---

## 18. Glossary

* **Resonance Alignment Engine** — codex name for this analyzer.
* **Keyword Gap** — JD terms important to the role but absent from the résumé.
* **Match Score** — heuristic weighted coverage of JD keywords by the résumé (0–100).
* **Torque Conflict** — a JD keyword that `TORQUE_MAP` would rewrite away, lowering match.
* **Preserve Set** — the JD terms the transmuter must leave literal.
* **Symmetric Stemmer** — one stemming function applied identically to both texts.

---

## 19. Q&A

**Q1: Is this real ATS scoring?**
No. It is a transparent, deterministic heuristic for keyword coverage. We label it as alignment, not "ATS pass rate."

**Q2: Why couple the swap fix into Phase 1?**
Because gap analysis on an unchanged swap measures a gap and then widens it. The two are one feature.

**Q3: Does it change `transmuteToSigil` for existing callers?**
No — only when `preserveKeywords` is passed. Golden test 13 guarantees byte-identical legacy output.

**Q4: Why a crude stemmer instead of Porter?**
Determinism, zero dependencies, and symmetry matter more than linguistic correctness here. Porter is a Phase 2 option behind the same interface.

**Q5: Will it invent skills the user lacks?**
Never. It reports gaps; it does not write the résumé. (Non-Goals #1, #2.)

**Q6: What about multi-word skills like "machine learning"?**
Captured as weighted bigrams (base weight ×2). Trigrams and synonym grouping are Phase 2.

---

## 20. Completion Definition

Phase 1 is complete when `buildKeywordAwareSigil(resume, jd)` returns a deterministic `{ sigil, report }` where the report carries a stable 0–100 score plus matched/missing keywords, the transmuter leaves every JD-conflicting term literal, legacy `transmuteToSigil` output is unchanged, and all three deliverables are proven together by passing tests.

> The correct Phase 1 result: the tool stops admiring its own vocabulary and starts answering the only question that matters — *"does this résumé speak the language of this job, and where doesn't it?"*
