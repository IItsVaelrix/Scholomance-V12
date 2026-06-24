# PDR-2026-05-10-ENGINE-ADAPTER — Unified Engine Adapter for Cell Wall Integrity

## Subtitle
Sealing the Core/UI Boundary via Sanctioned Architectural Gateways

**Status:** Draft
**Classification:** Architectural | Preventative | Security
**Priority:** Critical
**Primary Goal:** Establish a new `src/lib/engine.adapter.js` to serve as the exclusive gateway for UI and worker modules to access `codex/` core logic, resolving the remaining 14 critical cell wall violations (`LING-0F03`, `LING-0F08`).

---

# 1. Executive Summary

The Scholomance "Cell Wall" mandate (Law 11) prohibits direct imports from the `codex/` (Brain) layer into the `src/` (Body) layer. While several adapters exist (e.g., `pixelbrain.adapter.js`), 14 critical violations remain where UI data and web workers reach directly into the core.

This PDR introduces the **Unified Engine Adapter**. It will wrap all remaining unsanctioned core imports, providing a hardened, documented, and lint-compliant API surface for the frontend. Specifically, it will resolve the direct crossings in `src/data/schools.js` and `src/workers/microprocessor.worker.js`, ensuring 100% compliance with the architectural boundary.

---

# 2. Problem Statement

1.  **Direct Cell Wall Breaches**: 14 sites in `src/` currently import from `../../codex/` directly. This creates fragile coupling where core refactors can silently break the UI.
2.  **Bypassed Observability**: Direct imports bypass the diagnostic sensors in the adapter layer, making it harder to track how the UI interacts with the engine.
3.  **Inconsistent Conventions**: Some UI files use `processor-bridge.js` while others use direct imports, leading to a fragmented developer experience.

---

# 4. Product Goal

Achieve zero critical cell wall violations by routing all remaining core interactions through a sanctioned `src/lib/engine.adapter.js`.

---

# 5. Core Design Principles

-   **Opaque Wrapping**: The adapter must hide the internal directory structure of `codex/`.
-   **Contract Enforcement**: Every exported function must validate its inputs against the `SCHEMA_CONTRACT.md`.
-   **Surgical Replacement**: Replace direct imports one-by-one to ensure no behavioral regressions.

---

# 6. Feature Overview

-   **`src/lib/engine.adapter.js`**: The new central registry for general engine logic.
-   **School Logic Wrapper**: Sanctioned access to `codex/core/constants/schools.js`.
-   **Microprocessor Gateway**: A clean interface for `src/workers/` to access `codex/core/microprocessors/`.
-   **Automated Audit**: Re-running `npm run diagnostic:scan` must show 0 `LING-0F03` and `LING-0F08` violations after implementation.

---

# 7. Architecture

```
┌───────────────────┐       ┌─────────────────────────┐       ┌──────────────────────┐
│     UI Layers     │       │    Engine Adapter       │       │     Codex Core       │
│  (Pages, Hooks)   │  ───▶ │  (src/lib/engine.js)    │  ───▶ │   (codex/core/*)     │
└───────────────────┘       └─────────────────────────┘       └──────────────────────┘
          │                              ▲                              ▲
          │                              │                              │
          └──────────────────────────────┴──────────────────────────────┘
                    All crossings must pass through the Adapter
```

---

# 8. Module Breakdown

-   **`src/lib/engine.adapter.js`**:
    -   `getSchools()`: Wraps `CORE_SCHOOLS`.
    -   `calculateDominantSchool()`: Wraps `computeDominantSchool`.
    -   `runMicroprocessor()`: Wraps `verseIRMicroprocessors.execute`.

---

# 10. Implementation Phases

-   **Phase 1: Adapter Scaffolding**: Create the file and initial exports.
-   **Phase 2: Schools Remediation**: Update `src/data/schools.js` to use the adapter.
-   **Phase 3: Worker Remediation**: Update `src/workers/microprocessor.worker.js` to use the adapter.
-   **Phase 4: Global Sweep**: Identify and fix the remaining 12 bridge violations using the `cleri:probe`.

---

# 11. QA Requirements

-   **Diagnostic Verification**: `LING-0F03` and `LING-0F08` must drop to zero.
-   **Smoke Test**: The School Wheel and Microprocessor pipelines must function identically to their pre-purge state.

---

# 12. Success Criteria

-   No file in `src/` (excluding `src/lib/` adapters) contains an import statement starting with `../../codex/`.
-   All 14 critical violations are resolved.

---

**Status:** Draft
**Author:** Gemini-Backend (Debug Inquisitor)
**Verified:** 2026-05-10
