"""
Vaelrix Cortex ForceField — Council Arbiter.

Merges, ranks, and deduplicates Amplifier outputs.
"""

from __future__ import annotations

from copy import deepcopy

from .types import (
    AmplifierResult,
    CouncilArbiterOutput,
    ResonanceScore,
    VaelrixCortexForceField,
)


def _normalize_finding(finding: str) -> str:
    return " ".join(finding.strip().lower().split())


def _score_result(result: AmplifierResult, weights: dict[str, float] | None = None) -> float:
    r = result.resonance
    score = (
        r.intentMatch * 0.3
        + r.evidenceStrength * 0.25
        + r.novelty * 0.15
        + r.actionability * 0.25
        - r.conflictRisk * 0.2
    )
    weight = (weights or {}).get(result.brainId, 1.0)
    return score * weight


def arbitrate_amplifier_results(
    field: VaelrixCortexForceField,
    results: list[AmplifierResult],
    conflict_risk_threshold: float = 0.75,
    personality_weights: dict[str, float] | None = None,
) -> CouncilArbiterOutput:
    """
    Merge Amplifier outputs into accepted findings, rejected duplicates,
    flagged contradictions, and a recommended next action.

    ``personality_weights`` scales each brain's resonance score by its
    task-personality weight.
    """
    accepted: list[str] = []
    rejected: list[str] = []
    contradictions: list[str] = []
    seen: set[str] = set()

    weights = personality_weights or field.routing.personalityWeights or {}
    sorted_results = sorted(results, key=lambda r: _score_result(r, weights), reverse=True)

    for result in sorted_results:
        for finding in result.findings:
            key = _normalize_finding(finding)
            if not key:
                continue

            if key in seen:
                rejected.append(f"Duplicate finding from {result.brainId}: {finding}")
                continue

            if result.resonance.conflictRisk >= conflict_risk_threshold:
                contradictions.append(
                    f"Potential conflict from {result.brainId}: {finding}"
                )
                continue

            seen.add(key)
            accepted.append(f"[{result.brainId}] {finding}")

    next_action = (
        sorted_results[0].recommendedAction
        if sorted_results
        else "No confident next action was produced by active Amplifiers"
    )

    return CouncilArbiterOutput(
        acceptedFindings=accepted,
        rejectedFindings=rejected,
        contradictions=contradictions,
        nextAction=next_action,
        fieldUpdates={},
    )


def update_field_from_arbiter(
    field: VaelrixCortexForceField,
    output: CouncilArbiterOutput,
) -> VaelrixCortexForceField:
    """Apply non-conflicting accepted findings to the ForceField context."""
    new_field = deepcopy(field)
    for finding in output.acceptedFindings:
        if finding not in new_field.context.confirmedFacts:
            new_field.context.confirmedFacts.append(finding)
    return new_field
