"""
Vaelrix Cortex ForceField — Amplifier Router.

Decides which specialist brains activate for a given task.
"""

from __future__ import annotations

from copy import deepcopy

from typing import Any

from .types import AmplifierBrain, RoutingField, VaelrixCortexForceField


def _get_activation_reason(
    field: VaelrixCortexForceField,
    brain: AmplifierBrain,
) -> str | None:
    """Return the first matched activation signal, or None if no signal matches."""
    haystack_parts = [
        field.task.rawUserRequest,
        field.task.normalizedGoal,
        field.task.classification,
        *field.task.successCriteria,
    ]
    haystack = " ".join(haystack_parts).lower()

    for signal in brain.activationSignals:
        if signal.lower() in haystack:
            return f"Matched activation signal: {signal}"
    return None


def _apply_scdna_routing(
    active: list[str],
    reasons: dict[str, str],
    gene_matches: list[Any],
) -> None:
    """Merge SCDNA gene activationBrains into the routing decisions."""
    for gene in gene_matches:
        for brain_id in gene.activationBrains:
            if brain_id not in active:
                active.append(brain_id)
            reasons[brain_id] = (
                f"Activated by SCDNA gene in {gene.domain} domain"
            )


def select_amplifiers(
    field: VaelrixCortexForceField,
    registry: list[AmplifierBrain] | None = None,
    gene_matches: list[Any] | None = None,
) -> RoutingField:
    """Return a RoutingField describing active and suppressed brains."""
    brains = registry or []
    active: list[str] = []
    suppressed: dict[str, str] = {}
    reasons: dict[str, str] = {}

    for brain in brains:
        reason = _get_activation_reason(field, brain)
        if reason:
            active.append(brain.id)
            reasons[brain.id] = reason
        else:
            suppressed[brain.id] = "No activation signal matched current task"

    if gene_matches:
        _apply_scdna_routing(active, reasons, gene_matches)

    return RoutingField(
        activeBrains=active,
        suppressedBrains=suppressed,
        activationReasons=reasons,
        maxCouncilRounds=2,
    )


def apply_routing(
    field: VaelrixCortexForceField,
    registry: list[AmplifierBrain] | None = None,
    gene_matches: list[Any] | None = None,
) -> VaelrixCortexForceField:
    """
    Update the ForceField with the router's chosen active/suppressed brains.

    Preserves existing active brains and reasons (e.g. from SCDNA) and merges
    signal-based routing on top.
    """
    new_field = deepcopy(field)
    signal_routing = select_amplifiers(new_field, registry, gene_matches=gene_matches)

    merged_active = list(new_field.routing.activeBrains)
    merged_reasons = dict(new_field.routing.activationReasons)
    for brain_id in signal_routing.activeBrains:
        if brain_id not in merged_active:
            merged_active.append(brain_id)
        merged_reasons[brain_id] = signal_routing.activationReasons.get(
            brain_id, merged_reasons.get(brain_id, "Activated by router")
        )

    merged_suppressed = {
        brain_id: reason
        for brain_id, reason in signal_routing.suppressedBrains.items()
        if brain_id not in merged_active
    }

    new_field.routing = RoutingField(
        activeBrains=merged_active,
        suppressedBrains=merged_suppressed,
        activationReasons=merged_reasons,
        maxCouncilRounds=signal_routing.maxCouncilRounds,
        personalityWeights=new_field.routing.personalityWeights,
    )
    return new_field
