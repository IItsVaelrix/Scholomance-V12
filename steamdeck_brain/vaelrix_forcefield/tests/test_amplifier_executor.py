"""Tests for the Amplifier Executor and lightweight brain implementations."""

import unittest

from vaelrix_forcefield import (
    arbitrate_amplifier_results,
    create_force_field,
    get_registry,
    select_amplifiers,
)
from vaelrix_forcefield.amplifier_executor import run_amplifiers
from vaelrix_forcefield.brains import (
    CRITIQUE_BRAIN,
    MEMORY_BRAIN,
    RISK_BRAIN,
    TEST_BRAIN,
    run_code_brain,
    run_critique_brain,
    run_memory_brain,
    run_risk_brain,
    run_test_brain,
)


class TestCodeBrain(unittest.TestCase):
    def test_finds_keyword_in_project(self):
        field = create_force_field("What does the search governor do?")
        result = run_code_brain(field)
        self.assertEqual(result.brainId, "CODE_BRAIN")
        self.assertTrue(result.findings)

    def test_no_keywords_returns_low_actionability(self):
        field = create_force_field("hi")
        result = run_code_brain(field)
        self.assertEqual(result.brainId, "CODE_BRAIN")
        self.assertLess(result.resonance.actionability, 0.5)


class TestTestBrain(unittest.TestCase):
    def test_suggests_tests_for_refactor(self):
        field = create_force_field("Refactor the auth code")
        result = run_test_brain(field)
        self.assertEqual(result.brainId, "TEST_BRAIN")
        self.assertTrue(any("test" in f.lower() for f in result.findings))


class TestRiskBrain(unittest.TestCase):
    def test_flags_global_changes(self):
        field = create_force_field("Change this everywhere in the codebase")
        result = run_risk_brain(field)
        self.assertEqual(result.brainId, "RISK_BRAIN")
        self.assertTrue(any("regression" in f.lower() for f in result.findings))


class TestMemoryBrain(unittest.TestCase):
    def test_summarizes_empty_context(self):
        field = create_force_field("x")
        result = run_memory_brain(field)
        self.assertEqual(result.brainId, "MEMORY_BRAIN")
        self.assertTrue(any("No prior context" in f for f in result.findings))


class TestCritiqueBrain(unittest.TestCase):
    def test_flags_short_request(self):
        field = create_force_field("x")
        result = run_critique_brain(field)
        self.assertEqual(result.brainId, "CRITIQUE_BRAIN")
        self.assertTrue(any("short" in f.lower() for f in result.findings))


class TestAmplifierExecutor(unittest.TestCase):
    def test_runs_active_brains(self):
        field = create_force_field("Fix the bug and add tests")
        field.routing = select_amplifiers(field, get_registry())
        results = run_amplifiers(field)
        self.assertTrue(results)
        brain_ids = {r.brainId for r in results}
        self.assertIn("CODE_BRAIN", brain_ids)
        self.assertIn("TEST_BRAIN", brain_ids)

    def test_arbiter_consumes_results(self):
        field = create_force_field("Fix the bug and add tests")
        field.routing = select_amplifiers(field, get_registry())
        results = run_amplifiers(field)
        output = arbitrate_amplifier_results(field, results)
        self.assertTrue(output.acceptedFindings or output.nextAction)


if __name__ == "__main__":
    unittest.main()
