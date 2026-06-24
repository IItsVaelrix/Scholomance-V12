import os
import tempfile
import unittest
from pathlib import Path

from tui.utils.search_governor import (
    AgentMemory,
    SearchFinding,
    ripgrepMany,
    shouldSearchAgain,
)


class TestSearchFinding(unittest.TestCase):
    def test_confidence_computed_from_signal_density(self):
        finding = SearchFinding(query="auth", files=["a.ts", "b.ts"], symbols=["login"])
        self.assertGreater(finding.confidence, 0.0)
        self.assertIn("2 file(s)", finding.reason)


class TestShouldSearchAgain(unittest.TestCase):
    def test_allows_first_search(self):
        memory = AgentMemory()
        self.assertTrue(shouldSearchAgain(memory, "auth"))

    def test_blocks_repeated_query_case_insensitive(self):
        memory = AgentMemory()
        memory.searchHistory.append(SearchFinding(query="Auth", files=["a.ts"]))
        self.assertFalse(shouldSearchAgain(memory, "auth"))

    def test_blocks_after_high_confidence_target(self):
        memory = AgentMemory()
        memory.searchHistory.append(SearchFinding(query="a", files=["1"], confidence=0.85))
        memory.searchHistory.append(SearchFinding(query="b", files=["2"], confidence=0.2))
        memory.searchHistory.append(SearchFinding(query="c", files=["3"], confidence=0.2))
        # 3+ searches and at least one high-confidence hit -> stop.
        self.assertFalse(shouldSearchAgain(memory, "new"))

    def test_continues_when_no_high_confidence(self):
        memory = AgentMemory()
        for i in range(3):
            memory.searchHistory.append(
                SearchFinding(query=f"q{i}", files=["x"], confidence=0.2)
            )
        self.assertTrue(shouldSearchAgain(memory, "new"))


class TestRipgrepMany(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.root = Path(self.tmpdir.name)
        (self.root / "auth.ts").write_text("function login() {}\nconst session = 1;\n")
        (self.root / "middleware.ts").write_text("export function authMiddleware() {}\n")

    def tearDown(self):
        self.tmpdir.cleanup()

    def test_batches_multiple_queries_in_one_call(self):
        findings = ripgrepMany(
            ["login", "session", "authMiddleware"],
            root=self.root,
            max_results_per_query=10,
        )
        by_query = {f.query: f for f in findings}

        self.assertEqual(len(findings), 3)
        self.assertIn("auth.ts", by_query["login"].files)
        self.assertIn("auth.ts", by_query["session"].files)
        self.assertIn("middleware.ts", by_query["authMiddleware"].files)

    def test_returns_empty_for_no_matches(self):
        findings = ripgrepMany(["zzzzzzzzz"], root=self.root)
        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].files, [])

    def test_filters_ignored_dirs(self):
        ignored = self.root / "node_modules"
        ignored.mkdir()
        (ignored / "bad.ts").write_text("const login = 1;\n")

        findings = ripgrepMany(["login"], root=self.root)
        self.assertNotIn("node_modules/bad.ts", findings[0].files)


if __name__ == "__main__":
    unittest.main()
