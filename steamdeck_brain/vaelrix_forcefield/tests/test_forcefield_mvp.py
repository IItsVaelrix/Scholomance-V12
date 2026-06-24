"""Tests for the Vaelrix Cortex ForceField MVP."""

import unittest

from .. import (
    apply_routing,
    arbitrate_amplifier_results,
    block_search,
    confirm_fact,
    confirm_file,
    confirm_symbol,
    create_force_field,
    get_registry,
    record_search,
    reject_path,
    reset_phase_counters,
    select_amplifiers,
    should_allow_search,
    update_force_field,
)
from ..types import AmplifierResult, ResonanceScore


class TestForceFieldCreation(unittest.TestCase):
    def test_create_force_field(self):
        field = create_force_field("Fix the search bug", classification="diagnostic", priority="safety")
        self.assertEqual(field.task.rawUserRequest, "Fix the search bug")
        self.assertEqual(field.task.classification, "diagnostic")
        self.assertEqual(field.task.priority, "safety")
        self.assertTrue(field.task.taskId)

    def test_update_force_field_is_immutable(self):
        field = create_force_field("x")
        new_field = update_force_field(field, search=field.search)
        self.assertIsNot(new_field, field)


class TestContextLedger(unittest.TestCase):
    def test_confirm_file_blocks_search(self):
        field = create_force_field("Why does search loop?", classification="architectural")
        field = confirm_file(field, "search_governor", "tui/utils/search_governor.py")

        decision = should_allow_search(
            field,
            "search_governor implementation",
            "Need to understand the governor",
        )
        self.assertFalse(decision.allowed)
        self.assertIn("known target", decision.reason)

    def test_repeated_search_blocked(self):
        field = create_force_field("x")
        field = record_search(field, "auth middleware", "Need to find auth code")

        decision = should_allow_search(field, "auth middleware", "Still looking")
        self.assertFalse(decision.allowed)
        self.assertIn("already searched", decision.reason)

    def test_search_without_reason_blocked(self):
        field = create_force_field("x")
        decision = should_allow_search(field, "auth", "")
        self.assertFalse(decision.allowed)

    def test_search_budget_enforced(self):
        field = create_force_field("x")
        field.search.maxSearchesPerPhase = 1
        field = record_search(field, "a", "reason")

        decision = should_allow_search(field, "b", "reason")
        self.assertFalse(decision.allowed)
        self.assertIn("budget", decision.reason)


class TestAmplifierRouter(unittest.TestCase):
    def test_code_task_activates_code_brains(self):
        field = create_force_field("Fix the search bug, add tests, and reduce regression risk")
        routing = select_amplifiers(field, get_registry())
        self.assertIn("CODE_BRAIN", routing.activeBrains)
        self.assertIn("TEST_BRAIN", routing.activeBrains)
        self.assertIn("RISK_BRAIN", routing.activeBrains)
        self.assertNotIn("PIXEL_BRAIN", routing.activeBrains)
        self.assertNotIn("RHYME_BRAIN", routing.activeBrains)

    def test_lyric_task_activates_creative_brains(self):
        field = create_force_field("Break down this Vaelrix verse, its rhyme and phonemes")
        routing = select_amplifiers(field, get_registry())
        self.assertIn("RHYME_BRAIN", routing.activeBrains)
        self.assertIn("PHONEME_BRAIN", routing.activeBrains)
        self.assertIn("LORE_BRAIN", routing.activeBrains)
        self.assertNotIn("CODE_BRAIN", routing.activeBrains)
        self.assertNotIn("UI_BRAIN", routing.activeBrains)

    def test_apply_routing_updates_field(self):
        field = create_force_field("Refactor the code")
        field = apply_routing(field, get_registry())
        self.assertIn("CODE_BRAIN", field.routing.activeBrains)
        self.assertIn("CODE_BRAIN", field.routing.activationReasons)


class TestCouncilArbiter(unittest.TestCase):
    def test_deduplicates_findings(self):
        field = create_force_field("x")
        results = [
            AmplifierResult(
                brainId="CODE_BRAIN",
                findings=["Use a governor", "Add tests"],
                resonance=ResonanceScore(
                    intentMatch=0.9,
                    evidenceStrength=0.8,
                    novelty=0.7,
                    actionability=0.9,
                ),
            ),
            AmplifierResult(
                brainId="RISK_BRAIN",
                findings=["Use a governor", "Watch budget"],
                resonance=ResonanceScore(
                    intentMatch=0.8,
                    evidenceStrength=0.7,
                    novelty=0.6,
                    actionability=0.8,
                ),
            ),
        ]
        output = arbitrate_amplifier_results(field, results)
        self.assertEqual(len(output.acceptedFindings), 3)
        self.assertTrue(any("Duplicate" in r for r in output.rejectedFindings))

    def test_flags_high_conflict_risk(self):
        field = create_force_field("x")
        results = [
            AmplifierResult(
                brainId="CODE_BRAIN",
                findings=["Delete the file"],
                resonance=ResonanceScore(conflictRisk=0.9),
            )
        ]
        output = arbitrate_amplifier_results(field, results)
        self.assertEqual(len(output.acceptedFindings), 0)
        self.assertEqual(len(output.contradictions), 1)

    def test_selects_next_action(self):
        field = create_force_field("x")
        results = [
            AmplifierResult(
                brainId="CODE_BRAIN",
                findings=["Add governor"],
                recommendedAction="Implement SearchGovernor",
                resonance=ResonanceScore(
                    intentMatch=1.0,
                    evidenceStrength=1.0,
                    actionability=1.0,
                ),
            )
        ]
        output = arbitrate_amplifier_results(field, results)
        self.assertEqual(output.nextAction, "Implement SearchGovernor")


if __name__ == "__main__":
    unittest.main()
