# Phase 0.5 — Kind Annotation Guide

**Read this once. Then label all 200 without re-reading it, and without discussing any item with the other annotator.**

If we align our interpretations first, κ measures our conversation, not the kinds. The whole point is to find out whether the seven kinds are reproducible *from the definitions alone*. Contaminating that is worse than a bad κ, because a bad κ is information and a contaminated one is a lie that passes a gate.

## You cannot be wrong. There is no answer key.

Read this before anything else, because the instinct to "get it right" is the one thing that can ruin the run.

κ measures **agreement**, not correctness. There is no truth to be wrong against — if an authoritative label sheet existed, it would already be written down and this experiment would be pointless. **The taxonomy is on trial, not the annotator.**

- **Your labels are ground truth exactly as much as the other annotator's.** Neither of you is the reference.
- **Disagreement is the product.** If you two split on Theory-vs-Hypothesis, nobody erred — you found that the boundary doesn't survive two brains. That's the finding, and it's worth a quarter of avoided work.
- **Deliberating destroys the measurement.** Reason for 30 seconds and you produce a label no real-time compiler could reproduce. You'd be measuring you-with-time-to-think; the compiler doesn't get time to think. The fast instinctive label is the *more valid* one.
- **"Ugh, this could be either"** means the item did its job. Press one and move on. Your hesitation is recorded and is itself data.

A run where both annotators agree on everything teaches you less than one where they don't.

## The question this answers

`types.ts` claims seven kinds partition every utterance. §15 targets ≥95% act accuracy against a gold corpus. **If two people can't independently agree on the labels, 95% is unreachable by construction** — the compiler would be tuned against noise, and the residual would get filed as "model error" forever.

Speech-act taxonomies have been argued about since Austin (1962) and Searle (1975) for exactly this reason. Seven is a *choice*, not a discovery. This measures whether it was a good one.

## The kinds

Label each utterance with **exactly one**, from the PDR's own definitions:

| Kind | Definition (PDR §2.1) | The test to apply |
|---|---|---|
| **Do** | A grounded operation with resolved slots and sufficient policy warrant. | Could the system act *right now*, with no further question, and be confident it's what was meant? |
| **Clarify** | The intent is narrowed enough to ask a bounded question. | Do you know *what* to ask? ("Which album?") If the question is unbounded ("what do you mean?"), it's not Clarify. |
| **Probe** | The system may gather evidence without committing the requested action. | Read-only. Nothing changes. |
| **Forbidden** | Policy explicitly blocks the requested action. | Blocked *outright* — no authority could permit it in this surface. |
| **Escalate** | A trusted human or higher authority must decide. | Blocked *pending* someone with the right to say yes. |
| **Theory** | An unresolved semantic concept with insufficient binding. | The system doesn't know what the *words* mean. Nothing binds. |
| **Hypothesis** | A testable candidate interpretation or relationship. | A specific guess is on the table that could be *checked*. |

## The boundaries this corpus deliberately attacks

You will hit these. Don't agonise — **label your first honest read and move on.** Where you hesitate is data.

- **Theory vs Hypothesis** — both mean "I don't know enough". The PDR's line: Theory = the concept doesn't bind at all; Hypothesis = a specific candidate reading exists and is testable.
- **Clarify vs Do** — underspecified but actionable? If a default is obvious and safe, is it still Do?
- **Probe vs Do** — is answering a question itself an action?
- **Forbidden vs Escalate** — blocked forever, or blocked pending authority?
- **Theory vs Clarify** — you don't know the words vs you know the words but not the referent.

## Rules

1. **One label per item.** No "both", no "depends", no blanks.
2. **Assume the Visualiser surface**, default state, authenticated normal user, no admin rights.
3. **Label the utterance, not the ideal system.** Not "what should a perfect assistant do" — "which kind is this, per the table above".
4. **Do not look at the other annotator's file.** Do not discuss items. Not one.
5. **Do not look at `stratum` in the corpus** (it's design intent, not a gold label — and it will bias you).
6. **Don't skip the awkward ones.** They're the measurement.

## How to label

```bash
node bench/semantic-calculus/annotate.mjs --as damien
```

**One keypress per item. No Enter. It auto-advances.** ~4 minutes for all 200.

```
  d Do          c Clarify     p Probe      f Forbidden
  e Escalate    t Theory      h Hypothesis
  1-7 work too  ·  u = undo last  ·  q = save + quit
```

- **Saves on every keystroke.** Quit any time, rerun the same command, it resumes exactly where you stopped. A crash at item 190 costs you nothing.
- **Stray keys are ignored**, not nagged about.
- **`u` undoes the last one** if you fat-finger it.
- It records how long you took per item. That is not surveillance — **hesitation is a second signal about which boundaries are soft**, and it costs you nothing to produce. A kind you consistently stall on is in trouble even if we end up agreeing on it, because that's the kind a compiler will guess confidently and wrongly.

**Go fast.** First honest read, move on. If you're agonising past ~5 seconds, that item is telling us the boundary is bad — which is the finding. Deliberating your way to a "correct" answer actually *destroys* the signal, because the compiler won't get to deliberate.

## Then

```bash
node bench/semantic-calculus/kappa.mjs \
  bench/semantic-calculus/labels/claude.jsonl \
  bench/semantic-calculus/labels/damien.jsonl
```

**κ ≥ 0.7** → the kinds survive. Phase 1 acceptance stands, Phase 2 proceeds.

**κ < 0.7** → **merge kinds before Phase 2.** Start with the lowest per-kind κ. This is not a failure of the project; it's the cheapest finding available and it saves a quarter of tuning against noise.

**κ undefined (degenerate)** → someone labelled everything the same. Re-annotate.

## A note on what κ(claude, damien) is and isn't

I labelled the corpus as annotator A. That gives you **κ(machine, author)** — a *performance* number: does the model's kind boundary match yours?

It is **not the ceiling.** The ceiling is κ(human, human), and it needs a second human. If κ(claude, damien) is low, that's ambiguous — it could mean the kinds are bad, *or* just that I'm wrong. Only a second human separates those.

So: this run is worth doing today because it's free and it might immediately show a broken boundary. But **the PDR's actual Phase 0.5 gate needs a second person**, and that's still outstanding.
