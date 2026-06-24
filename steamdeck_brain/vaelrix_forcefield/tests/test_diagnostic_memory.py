"""Tests for automatic diagnostic memory submission."""

import os
import tempfile
import unittest

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))
from vaelrix_forcefield.diagnostic_memory_submitter import (
    get_diagnostic_memory_stats,
    query_diagnostic_memory,
    submit_health_signal,
    submit_to_diagnostic_memory,
)
from vaelrix_forcefield.pixelbrain.bytecode_health import (
    encode_archived_health,
    encode_clean_health,
    encode_red_distress,
)
from vaelrix_forcefield.brain_bridge import BrainBridge


class TestDiagnosticMemorySubmitter(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(suffix=".sqlite", delete=False)
        self.db_path = self.tmp.name
        self.tmp.close()

    def tearDown(self):
        try:
            os.unlink(self.db_path)
        except OSError:
            pass

    def _ok_signal(self, cell="IMMUNITY_SCAN", check="TEST_CHECK"):
        return encode_clean_health(cell, check, {"test": True})

    def _red_signal(self, cell="TRUESIGHT_OVERLAY", check="TEST_RED"):
        return encode_red_distress(cell, check, {"error": "crit"})

    def _archived_signal(self, cell="FORCEFIELD", check="TEST_ARCH"):
        return encode_archived_health(cell, check, {"stub": True})

    def test_submit_single_signal(self):
        signal = self._ok_signal()
        result = submit_health_signal(
            signal,
            source="brain",
            session_id="test-session",
            db_path=self.db_path,
        )
        self.assertTrue(result["inserted"])
        self.assertEqual(result["severity"], "OK")
        self.assertEqual(result["source"], "brain")
        self.assertEqual(result["sessionId"], "test-session")

    def test_submit_duplicate_signal_is_deduplicated(self):
        signal = self._ok_signal(cell="LAYER_BOUNDARY", check="DUP_TEST")
        r1 = submit_health_signal(signal, db_path=self.db_path, session_id="s1")
        r2 = submit_health_signal(signal, db_path=self.db_path, session_id="s2")
        self.assertTrue(r1["inserted"])
        self.assertTrue(r2["duplicate"])

    def test_submit_batch(self):
        report = submit_to_diagnostic_memory(
            health_signals=[
                self._ok_signal(cell="TEST_COVERAGE", check="BATCH_A"),
                self._red_signal(cell="TRUESIGHT_OVERLAY", check="BATCH_B"),
            ],
            session_id="batch-test",
            db_path=self.db_path,
        )
        self.assertEqual(report["total"], 2)
        self.assertEqual(report["inserted"], 2)
        self.assertEqual(report["failed"], 0)

    def test_query_by_session(self):
        submit_to_diagnostic_memory(
            health_signals=[self._ok_signal(cell="IMMUNITY_SCAN", check="Q_SESS")],
            session_id="query-session",
            db_path=self.db_path,
        )
        results = query_diagnostic_memory(
            session_id="query-session", db_path=self.db_path
        )
        self.assertGreaterEqual(len(results), 1)
        self.assertEqual(results[0]["sessionId"], "query-session")

    def test_query_by_severity(self):
        submit_to_diagnostic_memory(
            health_signals=[self._red_signal(cell="TRUESIGHT_OVERLAY", check="Q_RED")],
            session_id="red-test",
            db_path=self.db_path,
        )
        reds = query_diagnostic_memory(severity="RED", db_path=self.db_path)
        self.assertGreaterEqual(len(reds), 1)
        for r in reds:
            self.assertEqual(r["severity"], "RED")

    def test_stats(self):
        submit_to_diagnostic_memory(
            health_signals=[
                self._ok_signal(cell="TEST_COVERAGE", check="STATS_OK"),
                self._red_signal(cell="TRUESIGHT_OVERLAY", check="STATS_RED"),
            ],
            session_id="stats-test",
            db_path=self.db_path,
        )
        stats = get_diagnostic_memory_stats(db_path=self.db_path)
        self.assertIn("totalSignals", stats)
        self.assertIn("bySeverity", stats)
        self.assertIn("bySource", stats)
        self.assertGreaterEqual(stats["totalSignals"], 2)

    def test_unknown_signal_stored_gracefully(self):
        result = submit_health_signal(
            "garbage-signal-not-parseable",
            db_path=self.db_path,
            session_id="unknown-test",
        )
        self.assertEqual(result["severity"], "UNKNOWN")
        self.assertTrue(result["inserted"])


class TestBrainBridgeDiagnosticMemoryIntegration(unittest.TestCase):
    """Verify automatic submission is wired into BrainBridge.ask()."""

    def test_ask_includes_diagnostic_memory_submission(self):
        mock_llm = lambda p: "test"
        bridge = BrainBridge(llm_client=mock_llm)
        result = bridge.ask("integration test query")
        self.assertIn("diagnostic_memory_submission", result)
        dm = result["diagnostic_memory_submission"]
        self.assertIn("total", dm)
        self.assertIn("inserted", dm)
        self.assertIn("sessionId", dm)


if __name__ == "__main__":
    unittest.main()
