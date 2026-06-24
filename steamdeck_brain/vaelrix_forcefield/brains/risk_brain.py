"""
Vaelrix Cortex ForceField — Risk Brain.

Heuristic risk analysis: flags broad searches, unsafe edits, and regression-prone
patterns mentioned in the request.
"""

from __future__ import annotations

from ..types import AmplifierBrain, AmplifierResult, ResonanceScore, VaelrixCortexForceField


RISK_BRAIN = AmplifierBrain(
    id="RISK_BRAIN",
    domain=["risk", "safety", "regression", "dependencies"],
    activationSignals=["risk", "safe", "regression", "dependency", "blast radius", "dangerous"],
    allowedTools=["search_code", "read_file", "diagnostic_scan"],
    defaultSearchBudget=3,
)


def run_risk_brain(
    field: VaelrixCortexForceField,
    query: str | None = None,
) -> AmplifierResult:
    q = (query or field.task.rawUserRequest).lower()
    findings: list[str] = []

    if "delete" in q or "remove" in q:
        findings.append("Removing code may break downstream callers; verify with search before deleting.")
    if "global" in q or "everywhere" in q:
        findings.append("Broad changes increase regression risk; apply in small, testable batches.")
    if "search" in q and ("loop" in q or "again" in q or "repeated" in q):
        findings.append("Repeated search is often a working-memory anti-pattern; use a Context Ledger.")
    if "refactor" in q:
        findings.append("Refactors should preserve public behavior; add characterization tests if absent.")
    if not findings:
        findings.append("No obvious high-risk patterns detected; proceed with normal caution.")

    return AmplifierResult(
        brainId=RISK_BRAIN.id,
        summary="Risk scan based on task wording.",
        findings=findings,
        recommendedAction="Review flagged risks before editing files.",
        resonance=ResonanceScore(
            intentMatch=0.7,
            evidenceStrength=0.5,
            novelty=0.5,
            conflictRisk=0.2,
            actionability=0.7,
        ),
    )
