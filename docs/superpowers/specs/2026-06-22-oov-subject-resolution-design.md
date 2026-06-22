# OOV Subject Resolution for the NLU-AMP

**Date:** 2026-06-22
**Status:** Approved (design) — pending implementation plan

## Problem

The Natural Language Understanding amplifier
([`naturalLanguageAmp.js`](../../../codex/core/verseir-amplifier/plugins/naturalLanguageAmp.js))
and its entity extractor
([`entity-extractor.js`](../../../codex/core/microprocessors/nlu/entity-extractor.js))
are 100% closed-vocabulary. Every entity is matched with `tokens.includes(keyword)`
against fixed lists in
[`constants.js`](../../../codex/core/microprocessors/nlu/constants.js)
plus membership in `LEXICAL_VISUAL_DB`
([`visual-extractor.js`](../../../codex/core/semantic/visual-extractor.js)).

When a prompt's only meaningful word is out-of-vocabulary (OOV) — e.g.
*"reggaeton warrior"* where `reggaeton` matches no list — and no subject is
extracted, the AMP yields an empty subject and therefore no visual grounding.

The Photonic bridge cannot fix this: it operates on **sound/phonetics**, so a
novel word produces phonetic signal but no *semantic* mapping onto a known
visual concept.

The building block already exists:
[`datamuse.adapter.js`](../../../codex/services/adapters/datamuse.adapter.js)
has `meansLike()` (line 109), whose doc comment states it is *"Used to give
out-of-vocabulary terms a meaning by mapping them onto known words."* It is
**not currently wired into the NLU pipeline**. This design wires it in.

## Decisions (locked)

| Fork | Decision |
| --- | --- |
| OOV mapping source | **Online Datamuse `meansLike`** (no local phonetic fallback, no persistent cache) |
| Resolution scope | **Subject only** — resolved word fills the `SUBJECT` slot; no material/color/mood spraying |
| Trigger policy | **Only when no subject found** — at most one OOV word resolved per prompt |

## Architecture

Three small, isolated units.

### 1. `selectOOVCandidate(tokens, entities)` — pure, sync, local

Location: `entity-extractor.js` (new exported helper).

- Returns a single OOV token string, or `null`.
- Returns a candidate **only when `entities.subject` is empty** (trigger policy).
- A candidate is the **leftmost** token satisfying ALL of:
  - alphabetic
  - length ≥ 4
  - not a stopword
  - not present in any keyword list
  - not in `LEXICAL_VISUAL_DB`
- Leftmost selection guarantees determinism.
- No I/O. Fully unit-testable.

### 2. `resolveOOVSubject(candidate, adapter)` — async, network

Location: new file `codex/core/microprocessors/nlu/oov-resolver.js`.

- `const neighbors = await adapter.meansLike(candidate)` → ranked list.
- Walk `neighbors` in order; return the **first** `n` where
  `SUBJECT_KEYWORDS.includes(n) || LEXICAL_VISUAL_DB.has(n)`.
  Deterministic given Datamuse's ranking.
- Returns `{ original, resolvedTo, via: 'datamuse:meansLike' }`, or `null` when:
  - no neighbor is a known subject, or
  - `meansLike` returns `[]` (it already swallows network errors and returns `[]`).
- A small in-process `Map` memo keyed by lowercased word avoids duplicate calls
  within a single run. **Not persisted** — remains an online-only strategy.

### 3. Orchestration in `naturalLanguageAmp.js`

- Make `parseNaturalLanguagePrompt` **async** and `await` each
  `verseIRMicroprocessors.execute(...)` call. `execute()` is async
  ([`factory.js:58`](../../../codex/core/microprocessors/factory.js)); the current
  code does not await it, so `parsed.entities`/`parsed.confidence` are presently
  unresolved Promises. This refactor fixes that latent bug. The only caller is
  `analyze()`, which is already async.
- After `extractEntities`, if `entities.subject` is empty **and an adapter is
  present in `context.options`**:
  1. `candidate = selectOOVCandidate(tokens, entities)`
  2. if candidate: `resolution = await resolveOOVSubject(candidate, adapter)`
  3. if resolution: push `resolution.resolvedTo` into `entities.subject` and
     record `oovResolutions: [resolution]` on the parsed result.

## Determinism & test-safety (key constraint)

The codebase enforces deterministic/offline conventions (`no-random`,
`deterministic-output`, offline-fallback tests). To respect them:

**OOV resolution only runs when an adapter is supplied via `context.options`
(`options.dictionaryAdapter`). With no adapter, the AMP behaves exactly as it
does today — zero network calls.**

Consequences:

- Existing tests are unaffected: they inject no adapter → no fetch.
- The application wires `createDatamuseAdapter()` into `options` at the call
  site ([`useCODExPipeline.jsx`](../../../src/hooks/useCODExPipeline.jsx) and/or
  the executionContext built in
  [`verseir-amplifier/index.js:651`](../../../codex/core/verseir-amplifier/index.js)).
- New unit tests inject a **fake adapter** exposing `meansLike` that returns
  canned fixtures → deterministic and offline.

## Data flow

```
prompt
  → tokenize
  → extractEntities (closed-vocab)
  → [subject empty? AND adapter present?]
        → selectOOVCandidate
        → adapter.meansLike(candidate)
        → first neighbor that is a known subject
        → entities.subject += resolvedTo ; oovResolutions += {…}
  → mapSemantics (unchanged — now sees a real subject)
```

## Confidence & provenance

An OOV-resolved subject is weaker than a directly-matched one.

- A `severity:'info'` amplifier diagnostic records
  `{ original, resolvedTo, via }`.
- `oovResolutions` is carried in the AMP payload so downstream consumers may
  discount confidence if they choose.
- Scope remains subject-only; mood/material/color are untouched.

## Testing

- **Unit — `selectOOVCandidate`:** picks leftmost OOV; returns `null` when a
  subject already exists, when no candidate qualifies, and when all tokens are
  stopwords/short.
- **Unit — `resolveOOVSubject`** (fake adapter): first known neighbor wins;
  `null` when no neighbor is known; `null` on `[]`; memo prevents a second fetch
  for the same word.
- **Integration — `analyze()`:** with a fake adapter, *"reggaeton …"* resolves
  to a known subject and produces non-empty `entities.subject` +
  `oovResolutions`; with **no** adapter, output is identical to current behavior
  (regression guard).

## Out of scope (YAGNI)

- Persistent / on-disk caching of `meansLike` results.
- Multi-slot resolution (material/color/mood) — excluded by the subject-only decision.
- Resolving every OOV content word — excluded by the trigger policy.
- Local phonetic / embedding fallback for offline OOV resolution.
