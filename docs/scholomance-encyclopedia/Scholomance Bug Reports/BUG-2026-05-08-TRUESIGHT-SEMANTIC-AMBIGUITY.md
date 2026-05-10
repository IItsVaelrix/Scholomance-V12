# BUG-2026-05-08 — TRUESIGHT SEMANTIC AMBIGUITY (STATE DESYNC)

## Bytecode Search Code
`SCHOL-ENC-BUG-TS-AMBIG-V1`

## Bug Description
The `analysisMode` state was semantically overloaded, representing both UI Feature Selection (e.g., Astrology, Vowel Panel) and Compiler Depth (e.g., Balanced, Deep). This caused asynchronous desyncs in the `useVerseSynthesis` bridge, where the compiler would silently fall back to `BALANCED` depth when a UI-only feature mode was active, leading to bit-misaligned analytical artifacts.

## Root Cause
1. **Polymorphic State:** A single variable was shared across disparate layers with conflicting semantic requirements.
2. **Implicit Fallback:** The `resolveTruesightAnalysisMode` function silently defaulted to `BALANCED` for any mode it didn't recognize as a "Depth" config, ignoring the UI's intent for "Deep" analysis in modes like `ASTROLOGY`.

## Thought Process
1. **Semantic Resonance:** TurboQuant search for "Semantic Ambiguity" pointed to the `VOWEL_PANEL_DECOUPLE_HANDOFF.md` and `analysisModes.js`.
2. **Forensic Audit:** Confirmed that `ANALYSIS_MODES` and `TRUESIGHT_ANALYSIS_MODES` were partially overlapping but incoherently managed.
3. **Decoupling Ritual:** Decided to split the concern into "UI Feature Modes" and "Compiler Depths" with an explicit mapping registry.

## Changes Made
| File | Lines Changed | Rationale |
|------|---------------|-----------|
| `src/lib/truesight/compiler/analysisModes.js` | 1-110 | Separated `ANALYSIS_MODES` (UI) from `COMPILER_DEPTHS` (Compiler). Added `resolveCompilerDepth` mapping. |
| `src/pages/Read/ReadPage.jsx` | 1100-1120 | Decoupled `VowelFamilyPanel` from `isTruesight` state. |
| `src/pages/Read/ToolsSidebar.jsx` | 140-160 | Added "Phoneme Breakdown" tool to allow standalone vowel analysis. |

## Testing
1. **Backend QA:** Ran `npm run test:qa:backend` to ensure no regressions in phonetic engine accuracy or hybrid search.
2. **Manual Verification:** Confirmed that the `VowelFamilyPanel` now opens via the "Phoneme Breakdown" tool regardless of the Truesight overlay state.

## Lessons Learned
Polymorphism is a pathogen when it crosses asynchronous boundaries. State should have a single semantic master. If a variable travels from the UI to the Compiler, its meaning must be reconciled via an explicit mapping, not implicit fallback.
