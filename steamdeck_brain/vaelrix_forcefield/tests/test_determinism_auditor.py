"""Tests for the ForceField Determinism Auditor."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))
import unittest

from vaelrix_forcefield import create_force_field, run_amplifiers
from vaelrix_forcefield.amplifier_registry import get_registry
from vaelrix_forcefield.amplifier_router import apply_routing
from vaelrix_forcefield.brains import run_determinism_brain
from vaelrix_forcefield.determinism_auditor import audit_determinism
from vaelrix_forcefield.types import (
    AmplifierResult,
    ResonanceScore,
    ToolCallRequest,
    VaelrixCortexForceField,
)


class TestDeterminismAuditor(unittest.TestCase):
    def test_passes_when_deterministic_mode_off(self):
        field = create_force_field("Refactor the code")
        field.determinism.deterministicMode = False
        result = audit_determinism(field, [])
        self.assertEqual(result.brainId, "DETERMINISM_BRAIN")
        self.assertIn("skipped", result.summary.lower())
        self.assertFalse(result.bytecodes)

    def test_warns_when_seed_missing(self):
        field = create_force_field("Run regression test")
        field.determinism.deterministicMode = True
        result = audit_determinism(field, [])
        self.assertTrue(any("seed" in f for f in result.findings))
        self.assertTrue(result.bytecodes)

    def test_flags_banned_tool_in_brain_allowed_tools(self):
        field = create_force_field("Run deterministic test")
        field.determinism.deterministicMode = True
        field.determinism.seed = 42
        field.determinism.bannedNonDeterministicTools = ["run_command"]

        mock_result = AmplifierResult(
            brainId="TEST_BRAIN",
            findings=["Run tests"],
            requestedToolCalls=[ToolCallRequest(tool="run_command", args={}, reason="run")],
            resonance=ResonanceScore(),
        )
        result = audit_determinism(field, [mock_result])
        self.assertTrue(any("run_command" in f for f in result.findings))
        self.assertTrue(any("0704" in b for b in result.bytecodes))

    def test_flags_unstable_order(self):
        field = create_force_field("x")
        field.routing.activeBrains = ["CODE_BRAIN", "TEST_BRAIN"]
        results = [
            AmplifierResult(brainId="TEST_BRAIN", findings=["t"], resonance=ResonanceScore()),
            AmplifierResult(brainId="CODE_BRAIN", findings=["c"], resonance=ResonanceScore()),
        ]
        result = audit_determinism(field, results)
        self.assertTrue(any("unstable" in f for f in result.findings))
        self.assertTrue(any("0705" in b for b in result.bytecodes))

    def test_brain_runner_returns_audit(self):
        field = create_force_field("stable reproducible test")
        result = run_determinism_brain(field)
        self.assertEqual(result.brainId, "DETERMINISM_BRAIN")
        self.assertTrue(result.findings)

    def test_does_not_flag_run_tests_outside_deterministic_mode(self):
        field = create_force_field("Run tests")
        field.determinism.deterministicMode = False
        mock_result = AmplifierResult(
            brainId="TEST_BRAIN",
            findings=["Run tests"],
            requestedToolCalls=[ToolCallRequest(tool="run_tests", args={}, reason="run")],
            resonance=ResonanceScore(),
        )
        result = audit_determinism(field, [mock_result])
        # run_tests is in the non-deterministic set, but deterministic mode is off.
        self.assertFalse(any("run_tests" in f for f in result.findings))


if __name__ == "__main__":
    unittest.main()
