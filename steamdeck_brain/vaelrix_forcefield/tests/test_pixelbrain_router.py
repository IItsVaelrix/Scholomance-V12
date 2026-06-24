"""Tests for the PixelBrain error ↔ BytecodeHealth router."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

import unittest

from vaelrix_forcefield.pixelbrain import (
    emit_error,
    error_to_health,
    health_to_error,
    parse_error,
    parse_health,
    verify,
    verify_error,
    verify_health,
)


class TestBytecodeHealthRoundTrip(unittest.TestCase):
    def test_clean_health_verifies(self):
        from vaelrix_forcefield.pixelbrain import encode_clean_health

        bytecode = encode_clean_health("FORCEFIELD", "searchGovernorPass", {"searchCount": 0})
        self.assertTrue(verify_health(bytecode))
        parsed = parse_health(bytecode)
        self.assertEqual(parsed["cellId"], "FORCEFIELD")
        self.assertEqual(parsed["context"]["searchCount"], 0)


class TestPixelBrainRouter(unittest.TestCase):
    def test_crit_error_becomes_red_distress(self):
        err = emit_error(
            category="VALUE",
            severity="CRIT",
            module="FORCEFIELD",
            code="0101",
            context={"reason": "search budget exhausted"},
        )
        health = error_to_health(err)
        self.assertTrue(health.startswith("PB-RED-v1-TRUESIGHT-NODE-DISTRESS"))
        self.assertTrue(verify_health(health))
        parsed = parse_health(health)
        self.assertEqual(parsed["context"]["category"], "VALUE")
        self.assertIn("sourceBytecode", parsed["context"])

    def test_warn_error_becomes_archived(self):
        err = emit_error(
            category="STATE",
            severity="WARN",
            module="FORCEFIELD",
            code="0301",
            context={"currentState": "idle"},
        )
        health = error_to_health(err)
        self.assertTrue(health.startswith("PB-OK-v1-LOGIC-INCOMPLETE"))
        self.assertTrue(verify_health(health))

    def test_red_health_round_trips_to_error(self):
        err = emit_error(
            category="RANGE",
            severity="CRIT",
            module="FORCEFIELD",
            code="0201",
            context={"value": 150, "min": 0, "max": 100},
        )
        health = error_to_health(err)
        recovered = health_to_error(health)
        self.assertIsNotNone(recovered)
        self.assertTrue(verify_error(recovered))
        self.assertEqual(parse_error(recovered)["code"], "0201")

    def test_clean_health_returns_none(self):
        from vaelrix_forcefield.pixelbrain import encode_clean_health

        health = encode_clean_health("FORCEFIELD", "allClean")
        self.assertIsNone(health_to_error(health))

    def test_verify_auto_detects_family(self):
        err = emit_error("TYPE", "CRIT", "FORCEFIELD", "0001", {"x": 1})
        health = error_to_health(err)
        self.assertTrue(verify(err))
        self.assertTrue(verify(health))


if __name__ == "__main__":
    unittest.main()
