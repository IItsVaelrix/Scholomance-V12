# PDR-2026-05-10-PROACTIVE-ANTIGEN-PROBE — Theoretical Protein Scanning for Bug Shape Validation

## Subtitle
The Reverse-RAID Microscope for Structural Forensic Analysis

**Status:** Draft
**Classification:** Architectural | Immune System | AI Safety
**Priority:** High
**Primary Goal:** Implement a "Reverse RAID" mechanism that vectorizes bug hypotheses as "Theoretical Proteins" and scans the codebase for structural resonance, allowing the Arbiter to validate their mental model of "bug shapes" before they manifest as active failures.

---

# 1. Executive Summary

Current Scholomance immunity is **Reactive** (blocks known pathogens) or **Passive** (reports current drift). This PDR introduces the **Proactive Antigen Probe**, a tool that allows an agent or the Arbiter to "dream" of a potential bug shape and see where those "genes light up" across the entire repository.

By treating code logic as a **folded protein**—where the "primary sequence" is the text, but the "tertiary structure" is the syntactic and semantic vector—we can use TurboQuant to detect structural "ghosts." This allows for the validation of architectural hypotheses (e.g., "I suspect all our async handlers have unseeded Math.random calls") without needing to write a single regex.

---

# 2. Problem Statement

1.  **Hypothesis Validation Gap**: When the Arbiter suspects a systemic flaw (a "bug shape"), there is currently no way to "probe" the codebase for that structural pattern without manual auditing or writing complex, brittle scripts.
2.  **Structural Invisibility**: Many bugs share a common "structural protein" (e.g., race conditions in specific pipeline configurations) but use different variable names or formatting, making them invisible to standard string-matching tools like Grep.
3.  **The "Ghost" Problem**: AI hallucinations often reintroduce specific *types* of bad logic. We need a way to scan for the "shape of the hallucination" rather than just the specific text of a prior failure.

---

# 3. Product Goal

Create a "Codebase Microscope" that turns a natural language bug description into a vectorized "Theoretical Antigen" and maps its resonance across all files, providing a heatmap of potential architectural fractures.

---

# 4. Non-Goals

-   **Automated Correction**: The probe identifies and highlights; it does not modify code.
-   **Static Analysis replacement**: This does not replace ESLint or existing diagnostic cells; it complements them with semantic structural intuition.
-   **Continuous Monitoring**: The probe is a manual "Inquisition" tool, not a background daemon (though its findings can graduate to background antigens).

---

# 5. Core Design Principles

-   **Protein Folding Analogy**: Treat the `PhonosemanticVector` (V12) as the folded state of the logic.
-   **Reverse Resonance**: Flip the Clerical RAID logic. In RAID, we have a fixed library of bugs and unknown code. In the Probe, we have a fixed code base and an unknown "Theoretical Bug."
-   **Contrast Ratio**: Every hit must report a "Resonance Score" (0-100%) and a "Healthy Contrast" to distinguish between intentional logic and pathological drift.

---

# 6. Feature Overview

-   **`scripts/cleri-probe.js`**: The CLI interface. Takes a hypothesis string (e.g., "unseeded entropy in scoring").
-   **Protein Vectorization Engine**: Uses `generatePhonosemanticVector` to turn the hypothesis into a 256-dimensional search protein.
-   **Genetic Heatmap**: A CLI visualization showing the top-N modules where the "genes light up" (high similarity scores).
-   **Substrate Graduation**: A mechanism to "Shatter the Ghost"—converting a successful probe hit into a permanent `PAT-###` antigen in the immune substrate.

---

# 7. Architecture

```
┌───────────────────┐       ┌─────────────────────────┐       ┌──────────────────────┐
│ Hypothesis String │  ───▶ │ Protein Vectorization   │  ───▶ │ 256-dim Search Vector│
│ (The "Dream")     │       │ (V12 Vector Engine)     │       │ (The "Probe")        │
└───────────────────┘       └─────────────────────────┘       └──────────────────────┘
                                         │                              │
                                         ▼                              ▼
┌───────────────────┐       ┌─────────────────────────┐       ┌──────────────────────┐
│ Project Codebase  │  ───▶ │ Semantic Sweep Engine   │ ◀───  │ Resonance Calculation│
│ (The "Substrate") │       │ (Reverse-RAID logic)    │       │ (Cosine Similarity)  │
└───────────────────┘       └─────────────────────────┘       └──────────────────────┘
                                         │
                                         ▼
                            ┌─────────────────────────┐
                            │ Genetic Heatmap Report  │
                            │ "Genes lighting up..."  │
                            └─────────────────────────┘
```

---

# 8. Module Breakdown

-   **`codex/core/immunity/protein-probe.engine.js`**: Logic for hypothesis vectorization and reverse-similarity scanning.
-   **`scripts/cleri-probe.js`**: CLI entry point.
-   **`codex/core/semantic/vector.utils.js`**: (Existing) provides the `generatePhonosemanticVector` primitive.

---

# 9. ByteCode IR Design

**Signal Type**: `PB-OK-v1-THEORETICAL-PROBE`

**Example Report Payload**:
```json
{
  "hypothesis": "Archive-based hallucination in rhyme logic",
  "signature": "V12-PROT-####",
  "heatmap": [
    { "path": "scripts/create_weighted_dataset.js", "resonance": 0.94, "contrast": "LOW" },
    { "path": "tests/core/rhyme_pipeline.test.js", "resonance": 0.88, "contrast": "MEDIUM" }
  ]
}
```

---

# 10. Implementation Phases

-   **Phase 1: Probe Substrate**: Create `protein-probe.engine.js`.
-   **Phase 2: CLI Microscope**: Build `cleri-probe.js` with basic resonance reporting.
-   **Phase 3: Contrast Calibration**: Implement logic to filter out "Background Noise" (boilerplate code that looks like everything).
-   **Phase 4: Graduation Ritual**: Add the ability to save a probe hit as a permanent `PAT-###` antigen.

---

# 11. QA Requirements

-   **Sensitivity Test**: Probing for "Math.random" must flag `opponent.engine.js` with >90% resonance.
-   **Specificity Test**: Probing for a "Rhyme Hallucination" must NOT flag unrelated modules like `auth.routes.js`.
-   **Performance**: A full-repo probe sweep must complete in <3s on the target environment.

---

# 12. Success Criteria

-   The Arbiter can run `npm run cleri:probe "description"` and find hidden bugs they only suspected existed.
-   The "Genetic Heatmap" accurately identifies the two known hallucination sites (`scripts/create_weighted_dataset.js` and `tests/core/rhyme_pipeline.test.js`).
-   New "Theory-based" antigens are successfully generated from probe results.

---

**Status:** Draft
**Author:** Gemini-Backend (Debug Inquisitor)
**Verified:** 2026-05-10 via Feedback Skill.
