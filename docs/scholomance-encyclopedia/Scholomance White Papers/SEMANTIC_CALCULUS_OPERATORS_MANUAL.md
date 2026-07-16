# Semantic Calculus — Operator's Manual

**Bytecode Search Code:** `SCHOL-ENC-MANUAL-SEMANTIC-CALCULUS-2026-07-16`
**Spec:** [`PDR-archive/2026-07-16-semantic-calculus-pdr.md`](../PDR-archive/2026-07-16-semantic-calculus-pdr.md) (rev 6)
**Status:** flag-gated, `ENABLE_SEMANTIC_CALCULUS` default `0`. **Nothing executes.**

This is the *how to use it* guide. The PDR is the *why*. Read this one first;
it is shorter and every command in it has been run.

---

## 1. What this is

A compiler that turns something you say into a **typed act** before anything
happens, and refuses when it cannot.

```
utterance ──▶ proposal ──▶ margin ──▶ kind ──▶ LAW ──▶ cites ──▶ seal
              (a model)   (per risk)          (verdict)  (evidence)
```

The point is not that it understands you. It is that when it *doesn't*, it says
so instead of guessing. Every other layer in this repo, when asked something it
could not answer, returned a confident default — `|| 'stone'`, `color_1`,
`conflictRisk=0.2`, `found in 2 file(s)`. This one returns `Theory`.

**What it is not:** it does not eliminate ambiguity. That is not available —
`"open it"` has a referent that exists only in your head, and no formalism
recovers it. What it does is **localise** ambiguity: detect it, name it, bound
it, and turn it into one question.

---

## 2. Quick start

```bash
# 1. Ask the CLI gate what it would do. It runs nothing.
npx tsx scripts/scholo-gate.mjs "start the dev server"

# 2. Capture real intents from the app (shadow mode).
ENABLE_SEMANTIC_CALCULUS=1 npm run dev
#    -> open the Visualiser, click the "◈ shadow" tab (right edge), type.

# 3. Run what you captured through the full sealed compiler.
npx tsx bench/semantic-calculus/compile-shadow.mjs
```

That is the whole loop: **ask → capture → measure.**

---

## 3. The five kinds

A kind is **what sort of thing you said**. It is not permission.

| kind | fires when | gene |
|---|---|---|
| **Do** | bound + every required slot resolved + it mutates something | `SEMANTIC_KIND_DO_GROUNDED` |
| **Probe** | bound + the formula declares a read-only effect | `SEMANTIC_KIND_PROBE_READONLY` |
| **Clarify** | bound, but a required slot is unresolved | `SEMANTIC_KIND_CLARIFY_UNDERSPECIFIED` |
| **Theory** | nothing bound — the lexicon has no such concept | `SEMANTIC_KIND_THEORY_UNBOUND` |
| **Hypothesis** | unbound **and** you supplied a candidate binding | `SEMANTIC_KIND_HYPOTHESIS_CANDIDATE_BINDING` |

Every kind cites a gene that **computes** it. There are no judgement calls left
in the enum — that is deliberate, and it is what fixed κ. A kind without a
computable trigger is an opinion, and opinions do not reproduce (measured: κ =
0.271 when the enum had two axes in it).

**Theory vs Hypothesis:** Theory is *"I have never heard of that word."*
Hypothesis is *"I have never heard of it, but you told me what it might mean."*
A hedge alone is not a Hypothesis — `"not sure what a session word is"` has no
candidate, so it is Theory.

---

## 4. Five axes. This is the one thing to internalise.

```
kind              = what was said           (Do | Probe | Clarify | Theory | Hypothesis)
law.decision      = whether it may happen   (allow | clarify | block | escalate)
epistemic.gap     = what is missing         (none | command | concept | procedure | …)
phase             = plan or report          (atomic | plan | report)  — Probe only
utteranceProvenance = WHO said it           (user | derived | untrusted)  — see §6.4
```

Five questions, five sealed fields, no axis cannibalism. "What was said" and "who
said it" are as separate as "what was said" and "whether it may happen": the same
sentence binds the same formula whether you typed it or a model proposed it after
reading a web page, and only `law.decision` moves.

**They are separate fields and they must never be merged.** Especially: **do not
split Theory into sub-kinds** (`TheoryUnboundCommand` etc.). That recreates rev 5's
failure — a kind without a single computable question becomes an opinion and
destroys κ. Localise ignorance on `epistemic`, not on the kind enum.

`deploy` is a `Do` — it is a command, that is what you said — and LAW escalates
it because it ships your local dist to production. Both facts are true at once:

```
"deploy"  →  Do   law=escalate   would execute: NO
```

A diagnostic with no probe formula:

```
"why does the flargle break"  →  Theory   epistemic.gap=procedure   would execute: NO
```

A harvested inquiry:

```
"why listen animations fail"  →  Probe  phase=plan  epistemic.gap=evidence
```

The executor requires **four** gates: `kind === 'Do'` **and**
`law.decision === 'allow'` **and** a capability **and** any confirmation that
capability demands (§6.4). A `Do` is a claim about grammar and nothing more. Probe plans/reports never become Do via epistemic fields.

This was rev 5's bug. `Forbidden` and `Escalate` were `law.decision` values
hiding in the kind enum, which made `kind='Do'` with `law='block'` typecheck, and
made the taxonomy unannotatable — an annotator had to silently pick an axis, and
two of them picked differently. Cites `SEMANTIC_ACT_KIND_IS_NOT_PERMISSION`.

**Rev 7** adds epistemic + experimental axes. Spec:
[`PDR-archive/2026-07-16-semantic-calculus-rev7-epistemic.md`](../PDR-archive/2026-07-16-semantic-calculus-rev7-epistemic.md).

Two-phase Probe (compiler never runs harnesses):

```
utterance → Probe plan seal → external receipts → Probe report seal
```

---

## 5. Reading the gate

```
$ npx tsx scripts/scholo-gate.mjs "start the dev server"

  Clarify   law=clarify  law.underspecified.v1
  epistemic.gap=required_slot  method=underspecified  phase=atomic
  warrant required=[human,lexicon]  present=[lexicon]
  margin 0.000 < 0.15 (reversible_ui) — too close to call
  Did you mean:
    dev:server    0.67 · node --env-file=.env codex/server/index.js
    start:server  0.67 · node codex/server/index.js
  would execute: NO
```

- **margin** — the gap between the top two candidates. Below the risk class's
  bar, it is a *question*, not a weak Do.
- **the bar is per risk class** (`reversible_ui` 0.15, `destructive` 0.5). The
  same proposal decides for `lint` and asks for `deploy`. A destructive act may
  never borrow a navigation threshold.
- **would execute** — is always `NO`. Nothing runs. Ever, currently.

The lexicon is **`package.json` scripts** — 81 of them, written by you,
content-hashed into `lexiconVersion`. Nothing was invented. So `Theory` here
means *"you have no command for that"* — a feature request, not a vocabulary gap.

```bash
npx tsx scripts/scholo-gate.mjs --log "fix the jitters"   # append to the corpus
```

---

## 6. The shadow loop

The overlay is **DEV-only** (`import.meta.env.DEV`, statically dead in prod) and
posts to a route that self-disables without the flag. It shows what the compiler
*would* have decided and logs the intent **with the route and selection it was
said in**.

That state is the whole point. `"open it"` is unlabelable without knowing what
"it" was — the synthetic Phase 0.5 corpus scored κ=0.159 largely because it
captured naked strings.

**Marking `✗ wrong` asks what it *should* have been.** Do not skip that. A bare
"wrong" is an observed phenotype with no ideal, and phenotypic error is
*ideal − observed* — without the ideal there is nothing to subtract from. The
report counts those separately as *"complaints, not measurements."*

```bash
npx tsx bench/semantic-calculus/compile-shadow.mjs
```

Gives you: frontend/backend drift (must be 0), kinds emitted, **lexicon
coverage**, phenotype fitness, a phenotypic-error confusion matrix, and replay
identity (must be 100%).

The capture records `clientEpistemic` and `clientPhase` alongside the kind. It
has to: κ_warrant cannot be computed from rows that never recorded a warrant, and
a corpus that only stores kinds can only ever answer one of the three questions
in §6.5. The route's enums are asserted equal to `types.ts` in
`tests/semantic-calculus/shadow.schema-drift.test.js` — drift there is silent,
because the route keeps accepting rows while the members quietly stop meaning the
same thing, and the corpus ends up measuring a compiler that no longer exists.

---

## 6.4. Who said it (F21)

The partitions guard `context`. They did **not** guard the utterance — and the
utterance is the outermost authority path there is: it selects the formula,
resolves the slots, and produces the payload `capabilityScope` walks to mint a
capability. Everything the partitions defend sits downstream of it.

That is fine when a human types into a box. It is not when **the speaker is a
model**. `derived` is defined as "model summaries, embeddings, inferred
entities" and is explicitly not trusted — and a model-emitted utterance is
definitionally derived. So the doctrine said *derived may inform, never
authorize* while the primary input violated it by construction.

```
utterance: 'go to albums'                        -> untrusted -> escalate
userUtterance('go to albums')                    -> user      -> allow, no confirmation
derivedUtterance('go to albums')                 -> derived   -> allow, needs 1 confirmation
derivedUtterance('go to albums', ['a-web-page']) -> tainted   -> escalate
```

**A bare string is untrusted.** `trustPartition.ts` already states the rule: a
caller that cannot say where a string came from must place it in `untrusted` —
there is no default-trusted path. A bare string is a caller that did not say.
Compile stays total: it seals an honest act that *escalates* rather than
throwing, so the missing declaration is visible in the act itself.

**Taint is the harness's job, never the speaker's.** A speaker declaring its own
provenance is a speaker authorizing itself. Declaring taint only ever lowers
privilege, so omitting it is the profitable lie — the caller that ran the tools
must supply it, not the model that read their output.

**Provenance decides permission, never meaning.** The same text binds the same
formula to the same payload no matter who said it. Only `law.decision` moves.
That is the rev-6 separation holding under a new axis; merging them would be the
same axis cannibalism that took κ to 0.271.

The gate can speak as a machine, which is what the system is actually for:

```bash
npx tsx scripts/scholo-gate.mjs "run the build"                        # you typed it
npx tsx scripts/scholo-gate.mjs --derived "run the build"              # a model proposed it
npx tsx scripts/scholo-gate.mjs --taint=https://evil.example "run the build"
```

**Do only.** A Probe authorizes nothing — read-only by formula effect, commits
nothing, plans run no observations — so provenance does not gate it. Gating
probes would make the safe path the expensive one, which is how rails get ripped
out.

---

## 6.5. Three lexicons, three channels

**The lexicons are split by epistemic role** (`lexicons.ts`):

| lexicon | answers | source |
|---|---|---|
| `action` | what this app can **do** | aria-labels, routes, npm scripts |
| `surface` | what this app can **name** | referents for the `{target}` slot |
| `inquiry` | what this app can **investigate** | Probe formulas |

The routing rule is the whole point:

```
an EXACT action bind wins        — evidence beats shape
a FUZZY action score never wins  — a guess must not outrank a diagnosis
```

So a diagnosis is routed to the inquiry lexicon *before* the fuzzy proposer is
consulted at all. Measured: `"why is the build broken"` scores `build` at 0.25 —
a thin margin — and the gate used to render **Clarify: "did you mean `build` or
`build:app`?"**, asking you to pick a script to run in answer to a question. It
is now `Theory · gap=procedure`: the missing unit is a method, not a script.

The cost is real and accepted. A script named for a symptom (`debug:jank`) is
reachable only by command-shaped phrasing (`run debug:jank`), never by "why is
there jank". Worst case is Theory — nothing executes — which is the safe
direction.

**Agreement is measured on three channels, never averaged:**

| channel | asks |
|---|---|
| `κ_kind` | what sort of thing was said |
| `κ_warrant` | what could justify treating the conclusion as knowledge |
| `κ_justification` | would **these** cites justify **this** conclusion |

A system can hold an excellent κ_kind while κ_justification craters. That is a
system classifying confidently and justifying decoratively — and a single
averaged score would hide it, which is the same failure the per-kind gate exists
to prevent one level down. `kappa.mjs` prints them separately and refuses to
combine them.

Annotate them as **separate passes**. Answering all three on one screen lets each
answer anchor the next: you pick the warrant that suits the kind you just chose,
and the channels stop being independent measurements.

An **unmeasured channel is never a pass** — it is reported `UNMEASURED`. A
category *neither* rater used is `absent from corpus` and is not scored at all; a
category only *one* rater used is a collapsed category and still fails.

---

## 7. The two model seams

Any LLM drops into either. Everything downstream is unchanged — that is the
harness.

**`proposer.ts` — CLOSED world.** Rank the npm scripts that exist. An invented
key is rejected: `SEMANTIC_CALCULUS_PROPOSER_INVENTED_CANDIDATE`. The model may
not mint a command.

**`keywordProposer.ts` — OPEN world.** The model *must* invent — `"stutter"` has
to become `shadowBlur` or nothing is gained. **ripgrep is the refusal**: a
keyword that matches nothing produces no cite. The guess is a hypothesis and the
grep is the experiment.

Both are pluggable by construction:

```ts
resolveCites(utterance, ['/payload/unboundUtterance'], { proposer: yourLLM })
```

Measured, changing only the proposer:

```
literal-tokens-v1                     "Why the visualizer has stutters?" → theme.css
+ stub-semantic-keywords-v1           → src/pages/Visualiser/BytecodeVisualiser.tsx:39
```

**The compiler never calls a model.** Proposals and cites are *submitted*. If
`compileSemanticIntent()` shelled out, the same utterance would seal different
bytes after any commit and replay identity would be a lie.

---

## 8. Command reference

| command | does |
|---|---|
| `npx tsx scripts/scholo-gate.mjs "<intent>"` | compile an intent against your npm scripts. Runs nothing. |
| `… --derived "<intent>"` \| `--taint=<src>` | speak as a model, not as yourself (F21) |
| `… --log "<intent>"` | also append to `bench/semantic-calculus/corpus/cli-intents.jsonl` |
| `ENABLE_SEMANTIC_CALCULUS=1 npm run dev` | shadow overlay in the app (`◈ shadow` tab, or `Ctrl` + `;`) |
| `npx tsx bench/semantic-calculus/compile-shadow.mjs` | full sealed compile + phenotype report |
| `node bench/semantic-calculus/harvest-lexicon.mjs [--write]` | derive a UI lexicon from your own aria-labels |
| `node bench/semantic-calculus/build-corpus.mjs` | regenerate the 200-item κ corpus (seeded) |
| `node bench/semantic-calculus/annotate.mjs --as <name>` | label the corpus, one keypress per item |
| `… --channel warrant` \| `--channel justification` | the other two channels. Separate passes, on purpose |
| `node bench/semantic-calculus/kappa.mjs a.jsonl b.jsonl` | agreement on all three channels; exit 1 fails the gate |
| `… --legacy a.jsonl b.jsonl` | score the historical seven-kind labels (pre rev 6) |
| `npx vitest run tests/semantic-calculus` | 157 tests |
| `PYTHONPATH=steamdeck_brain .venv/bin/python steamdeck_brain/direct_brain.py --action brain --name CODE_BRAIN --query "<q>"` | ask CODE_BRAIN directly |

---

## 9. Signal quick reference

Three different zeros. **Never conflate them** — this is where every bug in this
repo has lived.

| signal | means | it is a finding about |
|---|---|---|
| **refuted** | the keyword was searched and your repo has never heard of it | **the model** |
| **unsearched** | the governor declined to search (budget, or a gene answers it) | **the governor** |
| **errors** | the search failed — timeout, crash, unparseable | **the tool** |

All three produce zero evidence. Only the first says the model was wrong.
Measured: asking about button colours proposed `palette` and `color`, and the
governor blocked both (`BUGPATTERN_COLOR_DRAGON_FRONTEND_FALLBACK resolves this
query`). Reading that zero as refutation claimed this codebase has never heard of
the word "color".

Error codes:

| code | meaning |
|---|---|
| `SEMANTIC_CALCULUS_SEAL_MUTATION` | a sealed field changed. Caught by **re-verifying the seal**, not by `Object.isFrozen` — freezing is shallow and does not survive `structuredClone`. |
| `SEMANTIC_CALCULUS_THEORY_NOT_EXECUTABLE` | kind ≠ Do |
| `SEMANTIC_CALCULUS_NOT_PERMITTED` | kind = Do but `law.decision ≠ allow` |
| `SEMANTIC_CALCULUS_UNCAPABLE_DO` | a Do with no capability, or one whose scope cannot be named |
| `SEMANTIC_CALCULUS_TRUST_BOUNDARY` | context is not partitioned into policy/user/untrusted/derived |
| `SEMANTIC_CALCULUS_UNTRUSTED_CITE_SOURCE` | a cite from untrusted context, or one that `supports` nothing |
| `SEMANTIC_CALCULUS_PROPOSER_INVENTED_CANDIDATE` | the model proposed a command that does not exist |
| `SEMANTIC_CALCULUS_PERMISSION_WIDENED` | a modulator raised permission without a LAW grant |
| `SEMANTIC_CALCULUS_EPISTEMIC_KIND_COUPLING` | an epistemic field rewrote `kind`. This is the rev 5 failure returning |
| `SEMANTIC_CALCULUS_REPORT_WITHOUT_RECEIPTS` | a Probe report tried to claim observation warrant with no receipts |
| `SEMANTIC_CALCULUS_RECEIPT_MISMATCH` | a receipt does not belong to the probe it was submitted for |
| `SEMANTIC_CALCULUS_UNKNOWN_PROBE` | no such Probe formula in the inquiry lexicon |
| `SEMANTIC_CALCULUS_INQUIRY_IS_EXECUTABLE` | an inquiry entry could reach an execution capability. It must not |
| `SEMANTIC_CALCULUS_LEXICON_ROLE_COLLISION` | one id lives in two lexicon roles |
| `SEMANTIC_CALCULUS_UNCONFIRMED_DO` | a Do whose capability demands confirmation nobody supplied. Provenance raises that demand — see §6.4 |

---

## 10. Traps

Each of these cost real time. They are not hypothetical.

**`vite build` passing proves nothing about the browser.** Rollup tree-shakes an
unused `node:crypto` out of the production bundle, so the build is green while
the dev server — which serves modules unbundled — dies on
`__vite-browser-external:node:crypto`. `tests/semantic-calculus/isomorphic.test.js`
walks the real import graph. Trust it, not the build.

**Green tests can test what you built instead of what you claimed.** 46 tests
passed while 3 of 5 kinds had no code path. None of them asserted *"Probe is
reachable"*. If you add a kind, add that test.

**Cites are sealed, so replay must re-submit them.** `act.cites` goes back in;
do not re-resolve. Re-resolving consults the repo, and repo state is not a
declared determinism input. An act carries everything needed to reproduce itself.

**Never cite the question.** Retrieval over a corpus containing the queries will
always match the queries — the shadow log scored as a whole-word hit in a live
file. `SELF_REFERENTIAL` and `INSTRUMENT_SOURCE` in `citeResolver.ts` exclude the
corpus *and* the SC tooling. **Known blind spot: SC cannot cite its own bugs.**
That is the right trade — a measurement contaminated by its instrument is worse
than one with a documented gap.

**A deictic never resolves from state.** `"open it"` on an album page will not
become `Do` even though the album ID is right there. That is not a limitation; it
is the entire architecture. State supplies candidates for the question, never the
answer.

**Do not `git stash` to A/B test on this tree.** Use a detached worktree.

---

## 11. What is real, and what is not

**Real, tested, and honest:**
CLI gate · parametric lexicon · the margin law (per risk class) · four of five
kinds reachable · trust partitions · capability-bound Do · the seal (verified,
not frozen) · 100% replay identity · cites with checkable `file:line` and
enforced `supports` · both proposer seams · shadow capture with real state.

**Not built:**
Ballistics (the margin is exercised only on the CLI lexicon) · the SQLite theory
bank (Phase 4 — `theoryDeposit.required` is sealed, the receipt is stubbed) ·
`Promote` · modulators · **Hypothesis has a trigger but no emit path.**

**Open, and honest about it:**
- **Phase 0.5's real gate needs a second human annotator.** κ(claude, damien)
  cannot separate *"the kinds are bad"* from *"the model labels weirdly"*.
- **Phase 6 owns the DoD and has no data.** Phenotype fitness on the five real
  captures is **1/5**.
- Nothing executes. Not one thing.

---

## 12. Playbook

**Use it for a week.** Every time you would reach for a script, ask the gate
first and `--log` it. If it changes how you work, this is real. If you stop by
Thursday, it was a well-tested demo. That is a question a week answers and no
amount of architecture can.

**Watch `refuted`.** It is the machine's world model failing against yours,
measured, for free. It is the only number here that gets more useful the more you
use it.

**When it says Theory, believe it.** It means you have no command for that. Add
one, or accept that the request is a feature.

**When you add a kind, add its gene first.** A kind without a computable trigger
is an opinion, and this taxonomy has measured what opinions do to κ.

**Do not grow the lexicon by imagination.** Every entry authored that way was
wrong. Harvest it (`harvest-lexicon.mjs`) or promote it from real Theory
deposits. The manifest and the shadow log are the only two honest sources.
