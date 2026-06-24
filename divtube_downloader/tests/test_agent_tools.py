import tempfile
import unittest
from pathlib import Path

from tui.utils.agent_tools import (
    ImportGraph,
    PatchResult,
    SymbolMatch,
    TestResult,
    apply_patch,
    find_symbol,
    get_recent_errors,
    list_project_tree,
    read_import_graph,
    run_targeted_tests,
)


class TestListProjectTree(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.root = Path(self.tmpdir.name)
        (self.root / "src").mkdir()
        (self.root / "src" / "main.py").write_text("pass\n")
        (self.root / "tests").mkdir()
        (self.root / "tests" / "test_main.py").write_text("pass\n")

    def tearDown(self):
        self.tmpdir.cleanup()

    def test_lists_tree_with_ignored_dirs_filtered(self):
        (self.root / "node_modules").mkdir()
        (self.root / "node_modules" / "bad.js").write_text("x")
        tree = list_project_tree(self.root, max_depth=3)
        self.assertIn("src/", tree)
        self.assertIn("main.py", tree)
        self.assertNotIn("node_modules", tree)


class TestFindSymbol(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.root = Path(self.tmpdir.name)
        (self.root / "mod.py").write_text(
            "def target_func():\n    pass\n\n"
            "class TargetClass:\n    pass\n\n"
            "target_var = 1\n"
        )

    def tearDown(self):
        self.tmpdir.cleanup()

    def test_finds_function(self):
        matches = find_symbol("target_func", root=self.root, include="*.py")
        self.assertTrue(any(m.kind == "function" for m in matches))

    def test_finds_class_and_variable(self):
        classes = find_symbol("TargetClass", root=self.root, include="*.py")
        self.assertTrue(any(m.kind == "class" for m in classes))
        vars_ = find_symbol("target_var", root=self.root, include="*.py")
        self.assertTrue(any(m.kind == "variable" for m in vars_))


class TestReadImportGraph(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.path = Path(self.tmpdir.name) / "sample.py"
        self.path.write_text(
            "import os\n"
            "from pathlib import Path as P\n"
            "from json import loads\n"
        )

    def tearDown(self):
        self.tmpdir.cleanup()

    def test_parses_regular_and_from_imports(self):
        graph = read_import_graph(self.path)
        targets = {e.target for e in graph.edges}
        self.assertIn("os", targets)
        self.assertIn("pathlib.Path", targets)
        self.assertIn("json.loads", targets)
        aliases = {e.alias for e in graph.edges}
        self.assertIn("P", aliases)


class TestGetRecentErrors(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.log_dir = Path(self.tmpdir.name)
        (self.log_dir / "error.log").write_text(
            "INFO all good\nERROR something broke\nTraceback line\n"
        )

    def tearDown(self):
        self.tmpdir.cleanup()

    def test_extracts_error_lines(self):
        errors = get_recent_errors(log_dir=self.log_dir, n=10)
        self.assertTrue(any("ERROR something broke" in e for e in errors))
        self.assertTrue(any("Traceback" in e for e in errors))
        self.assertFalse(any("INFO all good" in e for e in errors))

    def test_strips_ansi_by_default(self):
        (self.log_dir / "app.log").write_text("\x1b[31mERROR colored\x1b[0m\n")
        errors = get_recent_errors(log_dir=self.log_dir, n=10)
        self.assertTrue(any("ERROR colored" in e and "\x1b" not in e for e in errors))


class TestApplyPatch(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.path = Path(self.tmpdir.name) / "file.py"
        self.path.write_text("old_value = 1\n")

    def tearDown(self):
        self.tmpdir.cleanup()

    def test_applies_unique_patch(self):
        result = apply_patch(self.path, "old_value = 1", "new_value = 2")
        self.assertIsInstance(result, PatchResult)
        self.assertTrue(result.success)
        self.assertEqual(self.path.read_text(), "new_value = 2\n")
        self.assertTrue(Path(result.backup_path).exists())

    def test_rejects_ambiguous_target(self):
        self.path.write_text("old = 1\nold = 2\n")
        result = apply_patch(self.path, "old =", "new =")
        self.assertFalse(result.success)


class TestRunTargetedTests(unittest.TestCase):
    def test_runs_existing_search_governor_tests(self):
        result = run_targeted_tests("divtube_downloader.tests.test_search_governor", timeout=60)
        self.assertIsInstance(result, TestResult)
        self.assertTrue(result.success, result.stderr)
        self.assertIn("OK", result.stderr or result.stdout)


if __name__ == "__main__":
    unittest.main()
