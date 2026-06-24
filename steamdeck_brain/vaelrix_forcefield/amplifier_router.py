"""
Vaelrix Cortex ForceField — Amplifier Router.

Decides which specialist brains activate for a given task.
"""

from __future__ import annotations

from copy import deepcopy

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


def select_amplifiers(
    field: VaelrixCortexForceField,
    registry: list[AmplifierBrain] | None = None,
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

    return RoutingField(
        activeBrains=active,
        suppressedBrains=suppressed,
        activationReasons=reasons,
        maxCouncilRounds=2,
    )


def apply_routing(
    field: VaelrixCortexForceField,
    registry: list[AmplifierBrain] | None = None,
) -> VaelrixCortexForceField:
    """Update the ForceField with the router's chosen active/suppressed brains."""
    new_field = deepcopy(field)
    new_field.routing = select_amplifiers(new_field, registry)
    return new_field
