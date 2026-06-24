# 🜂 THE SCHOLOMANCE WHITE PAPER: THE CAREER IGNITION CHAMBER

## Bytecode Search Code
`SCHOL-ENC-BYKE-SEARCH-WP-CAREER-RESONANCE-ALIGNMENT`

## SUBTITLE: FROM THESAURUS-WITH-A-THEME TO A JD-AWARE ALIGNMENT ENGINE
**Date:** 2026-06-03
**Author:** Scholomance Auditor (Career/Frontend)
**Classification:** ARCHIVE — HONEST ASSESSMENT, NO PARTICIPATION TROPHIES
**Subject:** `src/pages/Career/CareerPage.tsx` + `src/lib/career/*`

---

## 0. Executive Summary

The Career page ("Career Ignition Chamber") is a résumé-optimization surface. It has
**two layers that are currently at very different stages of maturity**, and any honest
white paper has to keep them separate or it becomes marketing:

1. **The shipped product (UI + transmuter).** What a user actually touches today. It
   takes pasted text, runs a deterministic verb-upgrade pass ("led" → "Orchestrated"),
   wraps it in ceremonial scaffolding, and downloads a `.txt`. It is polished, idempotent,
   and well-tested — but in feature terms it is a **themed string transformer.**
2. **The Resonance Alignment Engine (new, Phase 1).** A deterministic keyword-gap
   analyzer (`src/lib/career/keyword-gap.js`) that diffs a résumé against a target job
   description, scores coverage 0–100, surfaces missing keywords, and stops the
   transmuter from deleting the very keywords it measures.

**The headline finding of this paper:** the engine is genuinely good — B+/A- craft by
industry standards for its scope — but **it is not yet wired into the page.**
`CareerPage.tsx:59` still calls `transmuteToSigil(content)` directly; nothing in `src/`
imports `analyzeKeywordGap` or `buildKeywordAwareSigil` outside the engine's own module
cluster and its tests. The civilization-grade machine is built, bolted down, and
**currently dark.**

---

## 1. WHAT IT DOES

### 1.1 The shipped product (today)

`CareerPage.tsx` is a single-textarea ritual:

- User pastes experience text (`void-textarea`, `CareerPage.tsx:120`).
- "Ignite Transmutation" starts a **cosmetic 3-second progress ritual** with a
  pixel health-bar that interpolates green→red (`handleIgnite`, `CareerPage.tsx:33-55`;
  `getHealthColor`, `:80-86`).
- On completion it calls `transmuteToSigil(content)` (`finalizeRitual`, `:57-77`),
  replaces the textarea with the result, and auto-downloads a `.txt` via
  `generateSigilFile`.

The transmuter itself (`src/lib/career/transmuter.js`) is deterministic and idempotent:

- **Torque Map** — 25 fixed verb upgrades across five "schools" (`TORQUE_MAP`, `:13-48`).
- **Spectral Anchors** — 8 buzz-phrases, one-to-three appended based on length, selected
  by a `djb2` hash of the content so the choice is stable (`SPECTRAL_ANCHORS`, `:50`;
  `pickAnchors`, `:116`; sigil assembly, `:190`).
- **Idempotency** — `stripSigil` (`:92`) removes prior scaffolding anchored to
  start/end only, so re-transmuting a sigil reproduces it rather than nesting headers.
  This is genuinely careful work and is pinned by tests.

### 1.2 The Resonance Alignment Engine (built, not yet surfaced)

`analyzeKeywordGap(resumeText, jobDescriptionText, options)` (`keyword-gap.js:223`)
returns a **frozen** `KeywordGapReport`:

- `score` (weighted coverage) and `rawScore` (unweighted), both integers in `[0,100]`,
  divide-by-zero guarded so an empty JD yields `0`, never `NaN` (`:264-272`).
- `matched` / `missing` / `jobKeywords` — weighted, stably ordered keyword hits.
- `torqueConflicts` — JD terms the transmuter would otherwise rewrite away.
- `diagnostics` + `metadata` (`deterministic: true`, `topK`, `jdKeywordCount`,
  `resumeStemCount`).

`buildKeywordAwareSigil` (`sigil-pipeline.js:22`) is the orchestrator: it analyzes the
**raw** résumé, derives the preserve-set from detected conflicts, and transmutes with
those terms held literal — so the tool stops measuring a gap and then widening it.

---

## 2. HOW IT SURPASSES OTHERS IN ITS NICHE

The niche is keyword/ATS résumé optimizers: **Jobscan, Teal, Rezi, Resume Worded.**
The engine layer beats them on three axes that are *architectural*, not cosmetic:

### 2.1 Privacy by construction
Every named competitor is a SaaS that **uploads your résumé to a server.** The Resonance
Alignment Engine makes **zero network calls, zero PII persistence, no logging** (PDR
Non-Goals #3/#4; verifiable by inspection — there is no `fetch`, no storage, no clock in
`keyword-gap.js`). Analysis runs entirely client-side and offline. For a user pasting
salary history and contact details, "the analysis never leaves your machine" is a real,
defensible advantage no SaaS competitor can match.

### 2.2 Determinism and testability
Competitor scores drift between runs and versions; they are black boxes. This engine
guarantees **same `(resume, jd, options)` ⇒ byte-identical report**, enforced by a stable
total order (weight desc, then term asc — `byWeightThenTerm`, `:109`) and a single
fixed rounding rule. It is covered by **48 unit tests** including hand-computed score
math, determinism-across-runs, and frozen-output assertions. A résumé tool you can write
a regression test against is, in this niche, almost unheard of.

### 2.3 The self-sabotage fix (genuinely novel)
The transmuter's signature mechanic — swapping "managed" → "Catalyzed" — actively *lowers*
literal keyword overlap with the JD, which is exactly what real ATS match on. The engine
detects these **torque conflicts** (`detectTorqueConflicts`, `:193`) and preserves the
literal JD term (`preserveKeywords`, `transmuter.js`). No competitor needs this because no
competitor invented the problem — but within this product it converts a feature that
*hurt* the user into one that doesn't. That is real engineering, not a thesaurus.

### 2.4 Honesty
Competitors routinely imply their score predicts "ATS pass rate." This engine labels its
output **"Resonance Alignment" — a transparent heuristic** (PDR Risk 3, §19 Q1) and does
not overclaim. Refusing to lie to the user is, unfortunately, a differentiator.

> **The caveat that keeps this section honest:** all four advantages live in the *engine*.
> A user cannot experience any of them yet, because the page does not call it (§0, §6.1).

---

## 3. HOW GOOD IT IS — INDUSTRY-STANDARD GRADING

Two grades, because there are two layers.

| Layer | Grade | Justification |
| :--- | :--- | :--- |
| **Resonance Alignment Engine** | **B+ / A-** | Deterministic, frozen, pure, prototype-pollution-safe (`Map`-based counting), 48 tests, divide-by-zero guarded, dependency-acyclic. Held below A by heuristic crudeness (see §4). |
| **Transmuter** | **B** | Idempotent, newline-preserving, hash-seeded, well-tested. A correct, careful implementation of a limited idea. |
| **Shipped product (UX)** | **C** | Functional novelty. The engine is dark; the "3-second ritual" is pure theater; the page promises JD-awareness it does not deliver (§6). |

**Where the engine sits vs. the category leaders:**

- **Conceptual core (JD diff + coverage score):** at parity. We do the thing the
  category is defined by.
- **Lexicon breadth & synonym grouping:** behind. Competitors have thousands of skills
  and "JS ≈ JavaScript" grouping; our seed lexicon is ~28 stems (`DEFAULT_SKILLS_LEXICON`,
  `:55-61`).
- **Format ingestion:** behind. They parse PDF/DOCX; we take plain text only.
- **Determinism, privacy, transparency:** ahead, decisively (§2).

Net: **the engine is a credible, honest, privacy-first entrant whose core is at parity
and whose architecture is ahead — gated entirely by the fact that it is not yet a
product.**

---

## 4. IMPROVEMENT OPPORTUNITIES

Ordered by leverage.

1. **WIRE THE ENGINE INTO THE PAGE.** (Critical, §6.1.) Add a second JD textarea, call
   `buildKeywordAwareSigil`, and render `report.score`, `report.missing` (as chips), and
   a torque-conflict notice. Everything in §2 is invisible until this ships. This is the
   single highest-leverage change in the entire feature and it is *already specified*
   (PDR Step 8 / Phase 2).
2. **Drive the Spectral Anchors from the JD.** Today anchors are 8 static buzz-phrases
   chosen by a hash (`pickAnchors`) — unrelated to any role. PDR Phase 2 Goal 3: seed
   them from the JD's top *matched* keywords. This alone would make the output role-aware.
3. **Expand the skills lexicon + add synonym grouping.** ~28 stems is a seed, not a
   lexicon. "JS"≈"JavaScript", "k8s"≈"kubernetes". This is the gap between "toy" and
   "tool."
4. **Harden tech-token handling.** `normalizeText` keeps `#`/`.` to save `c#`/`node.js`,
   but the `minLength=3` floor then drops `c#` (length 2) while meaningless `###` survives
   as a keyword; and `node.js` stems to `node.j`. Documented limitation (PDR §12.1), but a
   real precision leak for a tech résumé.
5. **Quantification prompts** (PDR Phase 2 Goal 1): "this bullet has no metric." High user
   value, low engine cost.
6. **Replace the cosmetic 3s timer with real feedback.** The ritual currently measures
   nothing — see §6.

---

## 5. PRAISE — ARCHITECTURE DECISIONS THAT EARN IT (grudgingly)

These are above average and I am not in the habit of saying so for free.

- **The leaf `text-utils.js` for `stem`/`normalizeText`.** Extracting the symmetric
  stemmer into a shared leaf so the transmuter's preserve-set and the analyzer stem
  *byte-identically* is the correct call. The whole determinism contract depends on this
  symmetry, and it was designed in, not patched on.
- **Enforced acyclic dependency direction** (`text-utils` ← `keyword-gap` ← `pipeline`;
  transmuter never imports the analyzer). A lesser implementation would have let the
  transmuter reach back into the analyzer and created a cycle. This one didn't.
- **`Map`-based frequency counting** (`extractKeywords`, `:123`). Using a `Map` instead of
  a bare object means a JD containing `__proto__`/`constructor` cannot pollute a
  prototype. That is a defensive instinct most résumé parsers lack — I tried the attack;
  it failed.
- **Frozen output + opt-in behavior change.** The report is `Object.freeze`d top-to-bottom,
  and `transmuteToSigil` is byte-identical to legacy when called with no options. The new
  power is gated; the old contract is untouched.
- **The `stopwords ∩ TORQUE_MAP` invariant** (`stopwords.js`, guarded by test). Catching
  that a term which is *both* a stopword and a torque key becomes structurally
  unprotectable — and writing a test that fails if any future torque key regresses into
  the stopword set — is the kind of seam-closing that separates "passes its tests" from
  "thought it through."

---

## 6. ADMONISHMENT — WHAT IS NOT UP TO PAR

No apology, because none is owed to code.

### 6.1 The engine is dark (the cardinal sin)
`CareerPage.tsx:4` imports only `transmuteToSigil`. `:59` calls it directly. There is no
JD input on the page, no score readout, no missing-keyword display. **A user cannot reach
a single capability described in §2.** A white paper that claimed otherwise would be
lying. Building an excellent engine and not connecting it is the most expensive form of
"done."

### 6.2 The placeholder writes a check the page can't cash
The textarea placeholder reads *"...or paste a Job Description to begin the
transmutation..."* (`CareerPage.tsx:122`). There is **no JD-aware code path.** The UI is
advertising the Phase 1 engine it does not call. This is a claim-vs-reality defect, not a
cosmetic one.

### 6.3 The "ritual" measures nothing
`handleIgnite` runs a hardcoded 3-second `setInterval` progress bar (`:40-54`) that has
**zero relationship to any computation** — the actual transmute is synchronous and
instant. The green→red health bar implies risk/degradation that does not exist. It is
honest theater at best and misleading feedback at worst; once the engine is wired, this
real estate should show the *alignment score climbing*, not a fake timer.

### 6.4 Auto-download with no preview
`finalizeRitual` (`:71`) triggers a file download automatically on every ignition. The
user never confirms, never previews the diff, and gets a `career_sigil.txt` whether they
wanted a file or not. Industry tools show the change and let the user decide.

### 6.5 Heuristic crudeness (engine-level, minor)
The symmetric stemmer is deliberately crude: `managed/managing` collapse correctly, but
`queries/query` and `studies/study` do not. Accepted Phase-1 tradeoff (PDR Risk 2), but it
will produce visible misses the moment real users arrive.

---

## 7. VERDICT

> The hard part is done and done well. The Resonance Alignment Engine is deterministic,
> private, honestly-labeled, and seam-hardened — a B+/A- core that genuinely out-architects
> the SaaS incumbents on privacy and reproducibility. And then it was left unplugged behind
> a 3-second progress bar that times nothing, on a page that promises a job-description
> feature it does not call.

**The single sentence that matters:** ship §4.1 — wire `buildKeywordAwareSigil` into
`CareerPage.tsx`, show the score and the missing keywords — and this feature jumps from a
**C-grade novelty to a B-grade tool overnight**, because the B-grade tool already exists in
the repo. It is just not on.

---

## 8. APPENDIX — VERIFICATION

```bash
# Engine + transmuter + pipeline suites (48 tests, green)
npx vitest run tests/unit/keywordGap.test.js \
               tests/unit/sigilPipeline.test.js \
               tests/unit/careerTransmuter.test.js

# Confirm the engine is NOT yet consumed by the UI (returns only engine-internal hits)
grep -rn "analyzeKeywordGap\|buildKeywordAwareSigil" src/pages/
```

**Source of record:**
- `docs/scholomance-encyclopedia/PDR-archive/Keyword Gap Analysis PDR.md` (the spec)
- `src/lib/career/{text-utils,stopwords,keyword-gap,sigil-pipeline,transmuter}.js`
- `src/pages/Career/CareerPage.tsx`
