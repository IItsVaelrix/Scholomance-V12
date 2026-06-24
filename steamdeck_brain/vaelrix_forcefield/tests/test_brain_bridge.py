"""Integration tests for BrainBridge.ask()."""

import unittest
from typing import Any

from vaelrix_forcefield import BrainBridge, get_registry
from vaelrix_forcefield.amplifier_executor import run_amplifiers
from vaelrix_forcefield.amplifier_registry import get_brain_by_id
from vaelrix_forcefield.brains import BRAIN_RUNNERS, run_code_brain
from vaelrix_forcefield.pixelbrain import emit_error, verify_health
from vaelrix_forcefield.types import (
    AmplifierBrain,
    AmplifierResult,
    ResonanceScore,
    VaelrixCortexForceField,
)


class MockLLM:
    """Deterministic LLM client for integration testing."""

    def __init__(self, answer: str = "mocked answer"):
        self.answer = answer
        self.prompts: list[str] = []

    def __call__(self, prompt: str) -> str:
        self.prompts.append(prompt)
        return self.answer


def run_error_emitting_brain(
    field: VaelrixCortexForceField,
    query: str | None = None,
) -> AmplifierResult:
    """Test brain that emits a verified PB-ERR-v1 bytecode."""
    bytecode = emit_error(
        category="STATE",
        severity="CRIT",
        module="TEST_BRAIN",
        code="9999",
        context={"reason": "forced test error"},
    )
    return AmplifierResult(
        brainId="ERROR_BRAIN",
        summary="Emits a test error bytecode",
        findings=["Test brain detected an error condition"],
        bytecodes=[bytecode],
        resonance=ResonanceScore(
            intentMatch=1.0,
            evidenceStrength=1.0,
            actionability=1.0,
        ),
    )


class TestBrainBridgeAsk(unittest.TestCase):
    def test_ask_returns_structured_response(self):
        mock_llm = MockLLM("Search governor routes and records queries.")
        bridge = BrainBridge(llm_client=mock_llm)
        result = bridge.ask("Find the search governor code")

        self.assertEqual(result["answer"], "Search governor routes and records queries.")
        self.assertIn("findings", result)
        self.assertIn("next_action", result)
        self.assertIn("health_signals", result)
        self.assertIn("raw_results", result)
        self.assertTrue(any(r.brainId == "CODE_BRAIN" for r in result["raw_results"]))

    def test_brain_bytecodes_routed_to_health(self):
        registry = list(get_registry())
        registry.append(
            AmplifierBrain(
                id="ERROR_BRAIN",
                domain=["test"],
                activationSignals=["error", "test"],
                allowedTools=[],
                defaultSearchBudget=1,
            )
        )
        runners = {**BRAIN_RUNNERS, "ERROR_BRAIN": run_error_emitting_brain}
        mock_llm = MockLLM("Health signal observed.")
        bridge = BrainBridge(llm_client=mock_llm, registry=registry, runners=runners)
        result = bridge.ask("test error condition", classification="diagnostic")

        self.assertTrue(
            any(r.brainId == "ERROR_BRAIN" for r in result["raw_results"]),
            "ERROR_BRAIN should activate and run",
        )
        self.assertTrue(
            len(result["health_signals"]) > 0,
            "Brain-emitted PB-ERR-v1 bytecodes should be routed to BytecodeHealth",
        )
        self.assertTrue(
            any(s.startswith("PB-RED-v1") for s in result["health_signals"]),
            "ERROR_BRAIN's CRIT bytecode should become a PB-RED-v1 distress signal",
        )
        for signal in result["health_signals"]:
            self.assertTrue(verify_health(signal), f"Health signal should verify: {signal}")

    def test_code_brain_is_evidence_based(self):
        bridge = BrainBridge()
        result = bridge.ask("Where is the search governor code implemented?")

        code_result = next(r for r in result["raw_results"] if r.brainId == "CODE_BRAIN")
        self.assertTrue(code_result.evidence, "CODE_BRAIN should return real EvidenceRef objects")
        self.assertTrue(code_result.requestedToolCalls, "CODE_BRAIN should request read_file calls")
        self.assertTrue(any(tc.tool == "read_file" for tc in code_result.requestedToolCalls))

    def test_mocked_llm_receives_synthesis_prompt(self):
        mock_llm = MockLLM()
        bridge = BrainBridge(llm_client=mock_llm)
        bridge.ask("Add tests for the refactor")

        self.assertEqual(len(mock_llm.prompts), 1)
        self.assertIn("Vaelrix Cortex synthesis layer", mock_llm.prompts[0])


if __name__ == "__main__":
    unittest.main()
