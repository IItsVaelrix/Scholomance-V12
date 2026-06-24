# PDR-2026-05-10-ANTIGEN-REGENERATION — Antigen Regeneration via Memory Cell Infusion

## Subtitle
Bridging Private Memory and Collective Immunity

**Status:** Draft
**Classification:** Architectural | Immune System | AI Safety
**Priority:** High
**Primary Goal:** Formalize the loop where private agent memories (bug fixes and "scars") are vectorized and infused into the public immune system as predictive antigens, governed by a new sovereign law.

---

# 1. Executive Summary

Scholomance currently possesses a two-layer immune system: **Innate** (regex-based) and **Adaptive** (Clerical RAID). However, the Adaptive layer is currently seeded manually or via infrequent Merlin reports. This PDR introduces **Antigen Regeneration**, a mechanism that allows the system to learn from the "scars" left by previous sessions.

By creating a **Memory Cell Infusion** pipeline, finding summaries in the private `memory/` folder are extracted, vectorized using TurboQuant, and injected into the public `clerical-raid` substrate. This turns every fixed bug into a permanent, predictive guardrail that watches for the "genes to light up" (semantic resonance) if the bug ever attempts to return.

---

# 2. Problem Statement

1.  **Information Siloing**: Bug fixes and architectural lessons learned in one session are often lost to the next session because the `memory/` folder is private and unindexed by the public immune system.
2.  **Pathogen Drift**: AI agents frequently re-introduce "zombie bugs" (like legacy port drift or Archive-based hallucinations) because the immune system doesn't "remember" why they were purged.
3.  **Manual Seeding Bottleneck**: Expanding the `clerical-raid` pattern library requires manual intervention, leading to a "reactive" rather than "proactive" defense.

---

# 3. Product Goal

A self-learning immune system that automatically generates new antigen patterns from documented bug fixes in private memory, ensuring that once a "fracture" is sealed, it remains sealed across all future agent iterations.

---

# 4. Non-Goals

-   **Shared Session State**: This does not involve sharing task lists, heartbeats, or active session metadata.
-   **Automated Repair**: This system detects and blocks; it does not automatically rewrite code.
-   **PII Leakage**: We are NOT syncing the entire memory folder; we are only infusing specific, tagged findings.

---

# 5. Core Design Principles

-   **Privacy-by-Annotation**: No finding is infused unless it carries the explicit `// INFUSION_ALLOW` or `# INFUSION_ALLOW` tag.
-   **Semantic Resonance**: Use TurboQuant vectors to detect "ghosts" of old code even if the variable names have changed.
-   **Lawful Injection**: The infusion must be codified under a new section of `VAELRIX_LAW.md`.

---

# 6. Feature Overview

-   **Law 16 (The Law of Memory Sharing)**: A mandate for agents to transition private scars into public antigens.
-   **Memory Cell Infusion Script**: A Node.js utility (`scripts/memory-cell-infusion.js`) that crawls the private memory directory.
-   **Hypothesis Scanning**: A mode in `cleri-raid` that takes a vectorized memory finding as a "hypothesis" and scans the codebase to see if any logic "lights up" (matches the signature).

---

# 7. Architecture

```
┌───────────────────┐       ┌─────────────────────────┐       ┌──────────────────────┐
│  Private Memory   │  ───▶ │ Memory Cell Infusion    │  ───▶ │ Clerical RAID        │
│  (scars/fixes)    │       │ (Vectorization Engine)  │       │ (Public Registry)    │
└───────────────────┘       └─────────────────────────┘       └──────────────────────┘
          │                              │                              │
          │                              ▼                              │
          │                 ┌─────────────────────────┐                 │
          └───────────────▶ │ Hypothesis Scan         │ ◀───────────────┘
                            │ "Genes lighting up"     │
                            └─────────────────────────┘
```

---

# 8. Module Breakdown

-   **`codex/core/immunity/memory-infusion.engine.js`**: Logic for parsing Markdown-based findings and validating the `INFUSION_ALLOW` contract.
-   **`scripts/memory-cell-infusion.js`**: CLI interface for agents to trigger the "regeneration" ritual.
-   **`codex/core/immunity/clerical-raid.substrate.js`**: A new, git-ignored but repo-local file for storing "transient" antigens before they are graduated to `SEED_PATTERNS`.

---

# 9. ByteCode IR Design

**Signal Type**: `PB-OK-v1-ANTIGEN-REGEN`

**Context Shape**:
```json
{
  "source": "memory/semantic_drift_findings.md",
  "hypothesis": "Math.random in combat scoring",
  "vector_id": "REGEN-####",
  "genes_lit": ["codex/core/scoring.js", "tests/qa/stasis.js"]
}
```

---

# 10. Implementation Phases

-   **Phase 1: Law Injection**: Commit Law 16 to `VAELRIX_LAW.md`.
-   **Phase 2: Infusion Substrate**: Build the `memory-cell-infusion.js` script with PII guards.
-   **Phase 3: Vector Bridge**: Connect the infusion script to TurboQuant for real-time vectorization.
-   **Phase 4: Genetic Lighting**: Update `cleri-raid.js` to support hypothetical scans based on newly infused antigens.

---

# 11. QA Requirements

-   **Privacy Audit**: Run a scan on generated antigens to ensure no secrets or PII leaked from the private memory.
-   **Resonance Test**: Manually re-introduce a bug described in memory and verify the "genes light up" within 500ms.
-   **Checksum Integrity**: Ensure that infused antigens produce deterministic signatures.

---

# 12. Success Criteria

-   A bug fixed in session A and tagged `INFUSION_ALLOW` is detected as a `PAT-###` violation in session B.
-   The Diagnostic Report summary includes a `totalAntigensRegenerated` metric.
-   The immune system blocks the re-introduction of `codex/core/rhyme/` using a signature derived from a memory "scar."

---

**Status:** Draft
**Author:** Gemini-Backend (Debug Inquisitor)
**Verified:** 2026-05-10 via Feedback Skill Audit.
