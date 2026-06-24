"""
Tests for Vaelrix ForceField personality-aware brain weighting.
"""

from __future__ import annotations

import pytest

from vaelrix_forcefield.amplifier_registry import get_registry
from vaelrix_forcefield.council_arbiter import arbitrate_amplifier_results
from vaelrix_forcefield.forcefield import create_force_field
from vaelrix_forcefield.personality_weighting import (
    apply_personality_weights,
    compute_personality_weights,
)
from vaelrix_forcefield.types import AmplifierResult, ResonanceScore


def _make_field(query: str, classification: str, priority: str):
    return create_force_field(query, classification=classification, priority=priority)  # type: ignore[arg-type]


def test_compute_weights_applies_classification_boost():
    field = _make_field("Refactor the data layer", "structural", "speed")
    registry = get_registry()
    field.routing.activeBrains = ["ARCHITECTURE_BRAIN", "CODE_BRAIN", "RISK_BRAIN"]
    weights = compute_personality_weights(field, registry)

    assert weights["ARCHITECTURE_BRAIN"] == pytest.approx(1.4, abs=0.01)
    assert weights["CODE_BRAIN"] == pytest.approx(1.2 * 1.2, abs=0.01)
    assert weights["RISK_BRAIN"] == pytest.approx(1.1 * 1.1, abs=0.01)


def test_compute_weights_applies_priority_boost():
    field = _make_field("Fix race condition", "diagnostic", "safety")
    registry = get_registry()
    field.routing.activeBrains = ["RISK_BRAIN", "TEST_BRAIN", "CODE_BRAIN"]
    weights = compute_personality_weights(field, registry)

    assert weights["RISK_BRAIN"] == pytest.approx(1.1 * 1.3, abs=0.01)
    assert weights["TEST_BRAIN"] == pytest.approx(1.2, abs=0.01)
    assert weights["CODE_BRAIN"] == pytest.approx(1.2, abs=0.01)


def test_compute_weights_applies_user_override():
    field = _make_field("Update lore docs", "creative", "depth")
    registry = get_registry()
    field.routing.activeBrains = ["LORE_BRAIN", "RHYME_BRAIN"]
    field.routing.personalityWeights = {"LORE_BRAIN": 2.0}
    weights = compute_personality_weights(field, registry)

    assert weights["LORE_BRAIN"] == pytest.approx(1.1 * 1.1 * 2.0, abs=0.01)
    assert weights["RHYME_BRAIN"] == pytest.approx(1.3 * 1.0, abs=0.01)


def test_compute_weights_ignores_suppressed_brains():
    field = _make_field("Simple change", "diagnostic", "speed")
    registry = get_registry()
    field.routing.activeBrains = ["CODE_BRAIN"]
    weights = compute_personality_weights(field, registry)

    assert set(weights.keys()) == {"CODE_BRAIN"}


def test_apply_personality_weights_returns_new_field():
    field = _make_field("Refactor", "structural", "speed")
    weights = {"ARCHITECTURE_BRAIN": 2.0}
    new_field = apply_personality_weights(field, weights)

    assert new_field.routing.personalityWeights == weights
    assert field.routing.personalityWeights == {}


def test_arbiter_uses_personality_weights():
    field = _make_field("Design new subsystem", "structural", "speed")
    field.routing.activeBrains = ["ARCHITECTURE_BRAIN", "CODE_BRAIN"]
    weights = {"ARCHITECTURE_BRAIN": 10.0, "CODE_BRAIN": 1.0}

    arch_result = AmplifierResult(
        brainId="ARCHITECTURE_BRAIN",
        findings=["decompose into services"],
        resonance=ResonanceScore(0.7, 0.7, 0.5, 0.6, 0.1),
        recommendedAction="create architecture doc",
    )
    code_result = AmplifierResult(
        brainId="CODE_BRAIN",
        findings=["extract helper function"],
        resonance=ResonanceScore(0.9, 0.9, 0.8, 0.9, 0.0),
        recommendedAction="refactor module",
    )

    output = arbitrate_amplifier_results(field, [arch_result, code_result], personality_weights=weights)

    # Despite CODE_BRAIN's higher raw resonance, ARCHITECTURE_BRAIN's massive
    # personality weight should push its recommendation to the top.
    assert output.nextAction == "create architecture doc"
    assert output.acceptedFindings[0].startswith("[ARCHITECTURE_BRAIN]")
