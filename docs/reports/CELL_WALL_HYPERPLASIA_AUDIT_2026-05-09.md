# Scholomance Feedback Report: Cell Wall Hyperplasia Audit

## 1. Summary
A deep-tissue audit of the `codex/` directory reveals advanced "Cell Wall Hyperplasia"—a condition where the boundaries between the Core Engine and the UI Substrate (`src/lib/`) have effectively collapsed. 46 instances of illegal imports were found where the "Brain" (Core) is dependent on the "Render Layer" (Lib/Truesight). This violates VAELRIX_LAW 5 and Law 10.

## 2. Classification
Architectural Audit | Layer Separation | CRITICAL RISK | Mode H: VAELRIX_LAW Tribunal

## 3. What Works
✅ **UI -> Codex Isolation**: The `LING-0F03` immunity rule successfully prevents the UI from importing directly from the Codex root, maintaining a "one-way" vision from the Brain to the UI.

## 4. What Needs Improvement
⚠️ **Brain-to-Lib Leakage (Layer 1-3 Collapse)**: `codex/core` is heavily dependent on `src/lib`. This makes the "Pure Analysis" layer impure and environment-dependent.
⚠️ **Truesight Coupling**: Core scoring heuristics (`rhyme-astrology`, `semantic-extractor`) are importing from `src/lib/truesight/compiler/`. This couples game-logic outcomes to visual-rendering IR formats.
⚠️ **Data Duplication/Shadowing**: Shared data like `SCHOOLS` and `WORD_REGEX` are being pulled from `src/data` into `codex/core`, creating a dependency on the UI's data assets.
⚠️ **Processor Bridge Intrusion**: PixelBrain engines are importing `processor-bridge.js` from `src/lib/`, which is a "convenience hack" to access UI-side processing logic from within the core bytecode engine.

## 5. Scholomance Fit
| Dimension | Grade | Why |
|---|---|---|
| CODEx Layering | F | The four-layer separation is a fiction in the current implementation. |
| Determinism Integrity | D | Dependencies on `src/lib` introduce risks of environment-leaking logic (e.g., regex flags, locale-specific string manipulation). |
| TrueSight Sovereignty | C- | Truesight is "polluting" the core scoring engine with its IR compiler logic. |

## 6. Engineering Impact
- **Brittleness**: High. A change in `src/lib/wordTokenization.js` could silently break `combat.scoring.js` without a single test failing in the Core layer (if integration tests are missing).
- **Testability**: Poor. Testing `codex/core` now requires mocking or including the entire `src/lib` substrate.
- **Portability**: The "Brain" cannot be easily moved to a pure-logic worker or separate service because it is tethered to the UI codebase.

## 7. Risks
| Risk | Severity | Why It Matters | Mitigation |
|---|---|---|---|
| Circular Dependency | High | Complexity will eventually lead to Vite/Node build failures as layers wrap around each other. | Strict import-graph enforcement. |
| Logic Drift | High | Scoring might use a different regex version than the UI highlighter, leading to "Phantom Matches." | Move shared logic to `codex/core/constants`. |
| Hyperplasia | Critical | The "Cell Wall" (boundaries) becomes so thick with hacks that the system becomes unmaintainable. | Surgical decoupling of `src/lib`. |

## 8. Recommended Improvements
| Priority | Recommendation | Why | Validation |
|---|---|---|---|
| P0 | Extract `WORD_REGEX` to Core | Centralize tokenization authority in the Brain. | Move to `codex/core/constants/regex.js`. |
| P0 | Decouple Heuristics from Lib | Pure logic must not depend on `src/lib`. | Move `literaryDevices.detector.js` logic to `codex/core/heuristics/utils/`. |
| P1 | Encapsulate Truesight IR | The Brain should produce data, not consume the Render-IR compiler. | Propose a clean interface for `VerseIR` in `SCHEMA_CONTRACT.md`. |

## 9. Implementation Path: The Great Decoupling
1. **The Neutral Zone**: Create `codex/core/shared/` for logic that currently lives in `src/lib` but is used by the Brain.
2. **The Data Migration**: Move `src/data/schools.js` and similar shared constants into `codex/core/constants/`.
3. **The Immunity Expansion**: Add a new rule `LING-0F06: Forbidden Codex -> Lib import` to `innate.rules.js` to prevent re-infection.

## 10. VAELRIX_LAW Grade
**Grade**: D
**Reason**: While the system is functional, the "Cell Wall" is failing. The Brain is effectively "parasitizing" the UI layer for its core functions.
**Upgrade Path**: Immediate extraction of shared logic from `src/lib` into `codex/core/shared`.

## 11. FeedbackTraceIR
```json
{
  "traceId": "FT-20260509-CELL-WALL-HYPERPLASIA-001",
  "version": "1.0",
  "findings": [
    {
      "category": "ARCH_VIOLATION",
      "law": 5,
      "severity": "CRITICAL",
      "file": "codex/core/analysis.pipeline.js",
      "detail": "Core importing from src/lib/wordTokenization.js"
    },
    {
      "category": "ARCH_VIOLATION",
      "law": 5,
      "severity": "CRITICAL",
      "file": "codex/core/rhyme-astrology/deepRhyme.engine.js",
      "detail": "Core dependent on Truesight compiler (src/lib/truesight/compiler/)"
    }
  ],
  "recommendation": "LAYER_HARDENING_PHASE",
  "checksum": "BADA55"
}
```
