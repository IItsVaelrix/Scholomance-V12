# BUG-2026-05-09 — REJECTED WATER SOURCE (ARCHITECTURAL FRAGMENTATION)

## Bytecode Search Code
`SCHOL-ENC-BUG-REJECTED-WATER-SOURCE-V1`

## Pathogen
`pathogen.rejected-water-source` (Adaptive Layer 2; threshold 0.85; glyphs `⧫⟟`).

## Anomaly Name
Rejected Water Source

## Entropy Classification
Logic-Fracture / Layer-Drift

## Bug Description
A "Rejected Water Source" is an abstraction that is locally sound but globally toxic. It appears clean to the author but introduces recursive entropy or architectural fragmentation when consumed across domain boundaries.

The primary manifestation was the `src/codex/animation/bytecode-bridge/` shadow path, which duplicated canonical animation logic and fractured the motion contract between `codex/core` and `src/`. This "bad water" led to numerous `LING-0F03` and `LING-0F04` violations and non-deterministic behavior in UI components.

## Forensic Diagnosis
1.  **Contract Fragmentation:** Two incompatible animation contracts existed (`motion-contract.ts` and `animation.types.ts`), leading to type-drift during cross-layer state transfer.
2.  **Shadow Path Persistence:** A forbidden directory (`bytecode-bridge/`) was retained despite being marked for deletion, acting as a "recursive seed" for legacy logic.
3.  **Determinism Decay:** UI components used `Math.random()` for IDs and visual effects, violating the Law of Determinism (Law 6).

## The Stasis Fix
1.  **Structural Excision:** The `src/codex/animation/bytecode-bridge/` tree and legacy `motion-contract.ts` were excised.
2.  **Canonicalization:** The blueprint parser was moved to the canonical `src/codex/animation/bytecode/` path and updated to use the unified `animation.types.ts` contract.
3.  **Microprocessor Refactor:** `AnimationProcessor.js` was refactored to use the canonical `runAnimationAmp` system, bridging the legacy DSL to the modern intent-based architecture.
4.  **Immune System Refinement:** Refined `LING-0F03` with depth-aware detection to allow legitimate `src/codex/` imports while strictly blocking UI-to-Backend leaks.
5.  **Determinism Guard:** Replaced `Math.random()` with seeded randoms or deterministic counters in `ReadPage.jsx`, `SigilChamber.jsx`, `WatchPage.jsx`, and others.

## Encyclopedia Entry
No fix is complete without its story. The "Rejected Water Source" reminds us that code quality is not just about the internal logic of a module, but about the health of the connections it forms. When an abstraction "waters" the codebase, it must produce resonance, not recursion.

## Codex Notification
The `src/codex/animation/contracts/animation.types.ts` is now the sole canonical source for motion contracts. All future animation work must adhere to this schema.
