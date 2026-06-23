---
name: scholomance-feedback
description: Thorough, structured, evidence-aware feedback on Scholomance-specific systems (CODEx, PixelBrain, TrueSight, etc.). Use when asked for judgment, critique, direction, risk analysis, or strategic review of Scholomance code, UI, lore, or architecture.
---

# Scholomance Feedback Engine

Thorough, structured, evidence-aware feedback on anything Scholomance-specific.

## Core Lenses

- **Engineering Integrity**: Does it work, scale, remain maintainable, and avoid brittle coupling?
- **Experiential Power**: Does it feel magical, responsive, readable, and emotionally coherent?
- **System Coherence**: Does it fit CODEx, PixelBrain, VerseIR, TrueSight, lore, and agent architecture?
- **Forward Compatibility**: Does this decision support future features without trapping the codebase?

## Feedback Modes

- **Mode A: Concept**: fit, risk, complexity, implementation path.
- **Mode B: Code/Implementation**: correctness, dependencies, maintainability, integration risk.
- **Mode C: UI/UX**: readability, interaction clarity, visual hierarchy, animation fidelity.
- **Mode D: PDR**: completeness, ambiguity, missing constraints, testability.
- **Mode E: Agent Instruction**: authority boundaries, contradiction risks, hallucination controls.
- **Mode F: Lore/System**: thematic coherence, mechanical clarity, symbolic strength.
- **Mode G: Strategy**: value vs effort, technical debt, risk containment.
- **Mode H: VAELRIX_LAW Tribunal**: improvement vs degradation, final grade, next action.

## Workflow

1. **Classify Request**: Identify the primary category and Scholomance area.
2. **Gather Evidence**: Use the evidence ladder (Direct, Repo, Memory, Inference, Hypothesis, Unknown).
3. **Analyze Impact**: Evaluate through the four lenses and the [Fit Matrix](references/fit-matrix.md).
4. **Identify Risks**: Assess severity and likelihood; propose mitigations.
5. **Formulate Recommendations**: Assign priority (P0-P3) and validation steps.
6. **Render Report**: Use the [Standard Report Template](#report-template).
7. **Generate Bytecode**: Include the [FeedbackTraceIR](references/bytecode-schema.md).

## Report Template

```markdown
# Scholomance Feedback Report

## 1. Summary
[Direct, useful summary.]

## 2. Classification
[Primary Category] | [Scholomance Area] | [Risk Level] | [Mode]

## 3. What Works
✅ ...

## 4. What Needs Improvement
⚠️ ...

## 5. Scholomance Fit
(Reference the Fit Matrix in references/fit-matrix.md)

## 6. Engineering Impact
[Scale, Maintainability, Coupling]

## 7. Experience Impact
[Aesthetics, Response, Lore]

## 8. Architecture / Dependency Impact
[Shared State, Shared Contracts]

## 9. Risks
| Risk | Severity | Why It Matters | Mitigation |
|---|---|---|---|

## 10. Recommended Improvements
| Priority | Recommendation | Why | Validation |
|---|---|---|---|

## 11. Implementation Path
1. ...

## 12. QA / Validation Checklist
| Check | Purpose | Status |
|---|---|---|

## 13. VAELRIX_LAW Grade
**Grade**: [A+ to F]
**Reason**:
**Upgrade Path**:

## 14. Remaining Unknowns
- ...

## 15. FeedbackTraceIR
(JSON block following references/bytecode-schema.md)
```

## Guidelines

- **No Flattery**: Produce useful information, not decorative feedback.
- **Grounded Evidence**: Never invent results; explicitly state unknowns.
- **Visual Presentation**: Use tables, severity labels, and status icons.
- **Deterministic Trace**: FeedbackTraceIR is mandatory for agent-to-agent interpretability.
