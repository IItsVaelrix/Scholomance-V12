# Semantic Calculus — Rev 7: Epistemic + Experimental Axes

**Bytecode Search Code:** `SCHOL-ENC-PDR-SEMANTIC-CALCULUS-REV7-EPISTEMIC`  
**Parent:** [`2026-07-16-semantic-calculus-pdr.md`](./2026-07-16-semantic-calculus-pdr.md) (rev 6)  
**Status:** Implemented in `codex/core/semantic-calculus/` (schema `SEMANTIC_ACT_v2`)

---

## 1. Critical non-goal

**Do not split Theory into sub-kinds.**

Rev 5 failed when permission lived inside the kind enum. The same failure mode would return if we encoded epistemic distinctions as:

```ts
// FORBIDDEN
type SemanticKind = 'TheoryUnboundCommand' | 'TheoryUnboundConcept' | ...
```

Kind answers only: **what sort of thing was said?**  
Five members remain: `Do | Clarify | Probe | Theory | Hypothesis`.

---

## 2. Four calculi, one sealed act

| Calculus | Field | Question |
|----------|-------|----------|
| Semantic | `kind` | What was said? |
| Deontic | `law` | May it happen? |
| Epistemic | `epistemic` | What is missing / how bound is the method? |
| Experimental | `phase` + probe payload | Plan or report? What would change belief? |

```ts
interface EpistemicState {
  gap: 'none' | 'command' | 'concept' | 'procedure' | 'required_slot' | 'evidence';
  method: 'bound' | 'underspecified' | 'absent';
  warrantRequired: readonly WarrantKind[];
  warrantPresent: readonly WarrantKind[];
}

type ActPhase = 'atomic' | 'plan' | 'report';
```

**Invariant:** `deriveEpistemic` never mutates `kind`. Kind genes do not read `epistemic.gap`.

---

## 3. Two-phase Probe

1. **Plan** — `compileSemanticIntent` / `compileProbePlan` seals observations + falsifiers + limits. Runs nothing.  
2. **Report** — external harness produces receipts → `compileProbeReport` seals survivors/eliminated with `receiptDigests`.

`plan seal ≠ report seal`. Replay re-submits receipts; it does not re-observe.

---

## 4. Hypothesis status (multi-causal)

```
eliminated      ⇔ observed falsifier triggers (status=observed only)
supported       ⇔ required predictions hold ∧ ¬eliminated
surviving       ⇔ ¬eliminated ∧ testing incomplete
underdetermined ⇔ refused/error/inconclusive on required bits
exclusive       ⇔ supported ∧ all rivals eliminated (opt-in; default off)
```

- Tool failure ≠ elimination  
- Unsearched ≠ refutation  
- Multiple `supported` is legal  

---

## 5. Harvested probes (P1)

- `runtime.csp.img_src`
- `cdn.asset.http`
- `render.stack.listen`
- `motion.visibility.station`

Inquiry lexicon is separate from action (`package.json`) and surface (UI) lexicons. Inquiry never mints Do capabilities.

---

## 6. Schema

```ts
schemaVersion: 'SEMANTIC_ACT_v2'
version: 'SemanticCalculus-v2'
compiler.schemaHash: 'sc-v2-rev7-epistemic'
```

Do not silently add optional fields to v0 seals. FE/BE/corpus/replay must agree on v2.

---

## 7. QA gates (must hold)

- [x] Five kinds only  
- [x] Epistemic does not change law by itself  
- [x] Procedure gap never becomes Do  
- [x] Probe plan performs no observations  
- [x] Report requires receipts  
- [x] Receipt mutation breaks seal  
- [x] Multi-supported hypotheses allowed  
- [x] Path existence alone ≠ observation warrant  

---

## 8. Annotation κ (P6 — tracking)

Measure independently:

- `κ_kind` — existing  
- `κ_warrant` — required warrant class  
- `κ_justification` — “would these cites justify the conclusion?”  

Excellent κ_kind with catastrophic κ_justification = citation theatre.
