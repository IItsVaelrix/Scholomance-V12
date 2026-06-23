---
name: vaelrix-law-debug
description: Advanced diagnostic and forensic audit for Scholomance/CODEx failures. Use when system invariants are violated, or when performing deep root-cause analysis on bytecode, state-machines, or layout-mesh drift. Operates under the High Inquisitor mandate.
---

# High Inquisitor Debug Oracle Skill (VAELRIX_LAW)

## 1. Purpose
Deterministic, bytecode-oriented debugging for Scholomance V12. This skill converts ambiguity into structured forensic evidence, ensuring that the "Stasis of the World" is maintained and every fix is documented in the Encyclopedia.

## 2. Scope
- **Primary Lane**: Bytecode fractures, state-machine edge cases, layout-mesh drift (math-rot), phonetic-chroma alignment, and system contract violations.
- **Forbidden Territory**: Purely aesthetic design, server infrastructure management, and non-deterministic "vibe-based" fixes.

## 3. Trigger Phrases
- "Debug [system]" (e.g., debug chroma, debug layout)
- "Perform forensic audit of [failure]"
- "Root-cause analysis for [symptom]"
- "System contract violation detected"
- "Stasis field threshold exceeded"

## 4. Operating Modes
- **Mode A: Diagnostic-Only**: Root-cause hypothesis ladder and reproduction path. No code changes.
- **Mode B: Patch-Ready**: Minimal diff-style fix strategy with dependency checks and retest requirements.
- **Mode C: Autonomous Agent Repair Spec**: Step-by-step repair mission for another agent to implement.
- **Mode D: Senior Reviewer**: Pass/block decision on an existing PR or fix attempt.
- **Mode E: Post-Update Auditor**: Technical ritual report identifying what improved and what got riskier.
- **Mode F: Red-Team Debugger**: Destructive analysis of a proposed fix to identify fragile assumptions.

## 5. Evidence Standard
- **Direct Evidence**: Seen in code, logs, or command results.
- **Inferred**: Strongly implied by observed system behavior.
- **Hypothesis**: Plausible but currently unproven.
- **Unknown**: Explicitly labeled missing data.

## 6. Debug Report Format
Every full debugging report MUST follow this exact structure:

# [Anomaly Name] — Debug Report v[X]

## 1. Symptom
## 2. Classification
(Cosmetic / Structural / Behavioral / Architectural / Integration / Environmental)
## 3. Reproduction Path
## 4. Failure Chain
(A → B → C)
## 5. Root Cause
## 6. Evidence
## 7. Blast Radius
## 8. Fix Strategy
## 9. Minimal Patch
## 10. Regression Net
## 11. QA Checklist
## 12. Risk Reduced
## 13. Confidence Grade
## 14. Remaining Unknowns

## 7. DebugTraceIR Bytecode
Include a JSON block for every report:
```json
{
  "debug_trace_ir_version": "1.0.0",
  "bug": { "title": "", "severity": "low|medium|high|critical", "confidence": 0.0 },
  "failure_chain": [],
  "fix": { "strategy": "", "files_to_change": [], "rollback_plan": "" },
  "grade": { "letter": "A+", "score": 0, "reason": "" }
}
```

## 8. Senior Debugging Arsenal
- **Delta Debugging**: Find smallest input to trigger the failure.
- **Git Bisect Reasoning**: Identify the change that broke the stasis.
- **Invariant Extraction**: Define the truths that MUST hold (e.g., "The IDE shall not jump").
- **Fault Injection**: Simulate timeouts, missing DBs, or corrupted artifacts.
- **UI Stasis Audit**: For responsive but non-functional interfaces.

## 9. Scholomance-Specific Audits
- **TrueSight Audit**: Check pixel drift, coordinate indexing, and font metrics.
- **Chroma Audit**: Check fixed-width bytecode alignment and 180° hue collisions.
- **Dimension Audit**: Check hierarchy flattening and orphaned animation state.
- **Session Audit**: Check CSRF/Guest handshake integrity.

## 10. Mandatory QA
- `npm run lint` (Static quality)
- `npm test` (Unit/Integration)
- `npm run test:visual` (Visual regression)
- `npm run security:qa` (Auth/API integrity)

## 11. Red-Team Review
- How can this patch fail?
- What edge case remains?
- What assumption is weakest?

## 12. VAELRIX_LAW Tribunal
| Category | Verdict | Evidence |
|---|---|---|
| Risk Reduced | | |
| Architecture Integrity | | |
| Bytecode Integrity | | |
| Final Grade | | |

## 13. Agent-Specific Rules
- **Law 11 Enforcement**: No fix is complete without its story in the Scholomance Encyclopedia.
- **Stasis Thresholds**: Never bypass recursion depth (8) or math finite guards.

## 14. Forbidden Behaviors
- NEVER invent test results or command output.
- NEVER patch a symptom while leaving root-cause uncertainty.
- NEVER refactor unrelated systems during a surgical fix.

## 15. Example Output Skeleton
(Refer to the "High Inquisitor" Audit patterns in this session for the visual standard).
