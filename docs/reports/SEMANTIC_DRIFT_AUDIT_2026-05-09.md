# Scholomance Feedback Report: Semantic Drift Audit

## 1. Summary
A forensic audit of the Scholomance V12 codebase reveals significant "Semantic Drift" where implementation has diverged from the "World-Law" (VAELRIX_LAW). Critical violations include widespread hardcoded z-indexes (Law 10) and non-deterministic logic in core engine modules (Law 6). These fractures create "entropy" that threatens the resonance and stability of the system.

## 2. Classification
Forensic Audit | Architecture & Quality | HIGH RISK | Mode H: VAELRIX_LAW Tribunal

## 3. What Works
✅ **Diagnostic Infrastructure**: The `PB-ERR-v1` bytecode system is well-defined and partially integrated into core microprocessors.
✅ **Immune System Research**: White papers and PDRs (e.g., `ARCH-2026-04-26-IMMUNE-SYSTEM.md`) show a clear understanding of the threat model.
✅ **QA Guardrails**: Existing tests like `immunity.stasis.test.js` demonstrate an active attempt to gate non-deterministic code.

## 4. What Needs Improvement
⚠️ **Stacking Sovereignty (Law 10)**: 84 instances of hardcoded z-indexes >= 10. Values like `2000`, `9000`, and `9999` are scattered across CSS files, bypassing semantic tiers.
⚠️ **Determinism Decay (Law 6)**: `Math.random()` found in `codex/core/opponent.engine.js`, `gear-glide-amp.js`, and `wordLookupPipeline.js`. This is a critical violation in the "Brain" layer.
⚠️ **Entropy in IDs**: Widespread use of `Date.now()` and `Math.random()` for ID generation instead of deterministic or seeded sequences.
⚠️ **Bytecode Consistency**: Many error paths still use standard `Error` objects or `console.log` instead of the mandated `PB-ERR-v1` format.

## 5. Scholomance Fit
| Dimension | Grade | Why |
|---|---|---|
| CODEx Alignment | B- | Schemas are respected but implementation details (like z-index) are drifting. |
| PixelBrain Synergy | C | Non-deterministic "jitter" found in core amplifiers. |
| TrueSight Integrity | D | Hardcoded z-indexes risk occluding the Truesight overlay (Law 10 violation). |
| Agent Autonomy | B | Agent boundaries are clear, but agents (specifically Gemini/Claude) are leaking entropy. |

## 6. Engineering Impact
- **Maintainability**: High. Random z-indexes lead to "z-index wars" that are hard to debug.
- **Reliability**: Medium. Non-deterministic combat/scoring can lead to unreproducible bugs.
- **Scale**: Low impact on scale, but high impact on "System Coherence."

## 7. Experience Impact
- **Aesthetics**: Potential for UI overlapping bugs (occlusion).
- **Lore**: The "World-Law" feels less "sovereign" when it is ignored by the implementation.

## 8. Architecture / Dependency Impact
- Violations of the four-layer separation (Core/Services/Runtime/Server) are emerging as "convenience hacks."

## 9. Risks
| Risk | Severity | Why It Matters | Mitigation |
|---|---|---|---|
| UI Occlusion | High | Critical overlays (errors, tutorials) might be hidden behind "z-index: 9999" components. | Migration to `StackingTier` constants. |
| Desync in Combat | High | Non-deterministic scoring makes player experience inconsistent and prevents replay-ability. | Replace `Math.random()` with `seedrandom(seed)`. |
| Audit Blindness | Medium | Standard Errors are harder for AI agents to parse and recover from than `PB-ERR-v1`. | Refactor error paths to use bytecode. |

## 10. Recommended Improvements
| Priority | Recommendation | Why | Validation |
|---|---|---|---|
| P0 | Seal Law 10 (Stacking) | Stop UI drift and occlusion risks. | `grep` search for `z-index` > 1 should return 0 results. |
| P0 | Restore Law 6 (Determinism) | Ensure the "Brain" (Core) is pure and deterministic. | `immunity.stasis.test.js` pass on all `codex/core`. |
| P1 | Standardize Bytecode Errors | Enable agent-to-agent forensic analysis. | Audit `codex/server` for `PB-ERR-v1` compliance. |

## 11. Implementation Path
1. **The Stasis Clamp (UI)**: Batch refactor all CSS files to use CSS variables derived from `StackingTier`.
2. **The Seeding Ritual (Core)**: Inject `seed` parameters into all `codex/core` engines and replace `Math.random()`.
3. **The Encyclopedia Update**: Document these "Tears in the Weave" in the Scholomance Encyclopedia per Law 11.

## 12. QA / Validation Checklist
| Check | Purpose | Status |
|---|---|---|
| Zero Hardcoded Z-Index | Compliance with Law 10 | 🔴 FAILED (84 violations) |
| Deterministic Core | Compliance with Law 6 | 🔴 FAILED (Math.random in core) |
| Bytecode Error Format | Compliance with Law 9 | 🟡 PARTIAL |

## 13. VAELRIX_LAW Grade
**Grade**: C-
**Reason**: The system has strong "Laws" but the "Weave" (implementation) is actively drifting. Entropy is high in the UI and Core layers.
**Upgrade Path**: Perform a "Great Stasis Pass" to clamp all z-indexes and seed all core logic.

## 14. Remaining Unknowns
- How many `Math.random()` calls are hidden behind libraries or complex wrappers?
- Is there "Math-rot" in the coordinate systems that hasn't been detected yet?

## 15. FeedbackTraceIR
```json
{
  "traceId": "FT-20260509-SEMANTIC-DRIFT-001",
  "version": "1.0",
  "findings": [
    {
      "category": "LAW_VIOLATION",
      "law": 10,
      "severity": "CRITICAL",
      "file": "src/components/shared/FloatingPanel.css",
      "detail": "z-index: 2000 !important found"
    },
    {
      "category": "LAW_VIOLATION",
      "law": 6,
      "severity": "CRITICAL",
      "file": "codex/core/opponent.engine.js",
      "detail": "Math.random() used in decision-making"
    }
  ],
  "recommendation": "GREAT_STASIS_PASS",
  "checksum": "DEADC0DE"
}
```
