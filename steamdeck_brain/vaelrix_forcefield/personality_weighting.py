"""
Vaelrix Cortex ForceField — Personality-aware brain weighting.

Adjusts each active brain's influence in the Council Arbiter based on the
task's classification and priority. Users can override weights through the
ForceField routing field.
"""

from __future__ import annotations

from .types import AmplifierBrain, VaelrixCortexForceField


# Classification-driven boosts for relevant brain families.
_CLASSIFICATION_WEIGHTS: dict[str, dict[str, float]] = {
    "diagnostic": {"CODE_BRAIN": 1.2, "MEMORY_BRAIN": 1.1, "RISK_BRAIN": 1.1},
    "behavioral": {"CODE_BRAIN": 1.3, "TEST_BRAIN": 1.2, "RISK_BRAIN": 1.1},
    "structural": {"ARCHITECTURE_BRAIN": 1.4, "CODE_BRAIN": 1.2, "RISK_BRAIN": 1.1},
    "architectural": {"ARCHITECTURE_BRAIN": 1.5, "CODE_BRAIN": 1.2, "RISK_BRAIN": 1.2},
    "creative": {"RHYME_BRAIN": 1.3, "PHONEME_BRAIN": 1.2, "LORE_BRAIN": 1.1, "CRITIQUE_BRAIN": 1.1},
    "research": {"MEMORY_BRAIN": 1.3, "LORE_BRAIN": 1.2, "ARCHITECTURE_BRAIN": 1.1},
    "planning": {"ARCHITECTURE_BRAIN": 1.3, "RISK_BRAIN": 1.2, "MEMORY_BRAIN": 1.1},
    "cosmetic": {"UI_BRAIN": 1.4, "PIXEL_BRAIN": 1.2, "CRITIQUE_BRAIN": 1.1},
}

# Priority-driven adjustments.
_PRIORITY_WEIGHTS: dict[str, dict[str, float]] = {
    "safety": {"RISK_BRAIN": 1.3, "TEST_BRAIN": 1.2, "DETERMINISM_BRAIN": 1.1},
    "speed": {"CODE_BRAIN": 1.2, "UI_BRAIN": 1.1},
    "depth": {"MEMORY_BRAIN": 1.3, "ARCHITECTURE_BRAIN": 1.2, "LORE_BRAIN": 1.1},
    "minimal_change": {"RISK_BRAIN": 1.3, "CODE_BRAIN": 1.1},
}


def compute_personality_weights(
    field: VaelrixCortexForceField,
    registry: list[AmplifierBrain] | None = None,
) -> dict[str, float]:
    """
    Compute personality-aware weights for every active brain.

    The final weight is the product of:
      - base brain weight
      - classification boost
      - priority boost
      - user override from field.routing.personalityWeights

    Only active brains receive a weight; suppressed brains are not scored.
    """
    from .amplifier_registry import get_registry

    brains = registry or get_registry()
    brain_by_id = {b.id: b for b in brains}
    active = field.routing.activeBrains

    classification = field.task.classification
    priority = field.task.priority
    overrides = field.routing.personalityWeights

    weights: dict[str, float] = {}
    for brain_id in active:
        brain = brain_by_id.get(brain_id)
        if brain is None:
            continue
        weight = brain.weight
        weight *= _CLASSIFICATION_WEIGHTS.get(classification, {}).get(brain_id, 1.0)
        weight *= _PRIORITY_WEIGHTS.get(priority, {}).get(brain_id, 1.0)
        weight *= overrides.get(brain_id, 1.0)
        weights[brain_id] = round(weight, 3)

    return weights


def apply_personality_weights(
    field: VaelrixCortexForceField,
    weights: dict[str, float],
) -> VaelrixCortexForceField:
    """Store computed personality weights in the ForceField (immutable)."""
    from copy import deepcopy

    new_field = deepcopy(field)
    new_field.routing.personalityWeights = dict(weights)
    return new_field
