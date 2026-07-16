"""
Regression tests for CODE_BRAIN's evidence.

Found 2026-07-16 while trying to wire CODE_BRAIN into the Semantic Calculus cite
resolver. Three bugs in four lines of _ripgrep_keyword:

    if len(refs) >= 3:
        break

1. NONDETERMINISM. ripgrep searches in parallel, so its output order is thread
   scheduling order. Taking "the first 3" took a different 3 on each run —
   measured: two identical queries returned evidence from entirely different
   files (visemeMapping.ARCHIVED.js vs Scrying_Orb_Landing_UX_Report.md).

2. A COUNT THAT LIED. `files` was derived from the truncated sample and reported
   as the population: "'shadowBlur' found in 2 file(s)" when 18 files contained
   it. A sample size wearing a population's clothes.

3. SILENT INCOMPLETENESS. Because --max-count is per-file, the first file to
   report could supply all 3 matches, so the brain could see one file and claim
   it had searched.

Why it matters beyond tidiness: cites are sealed into a SemanticAct (F5), and a
nondeterministic cite makes replay identity a lie. A cite that misses the real
evidence while claiming completeness is citation theatre — worse than no cite,
because it looks like a warrant.
"""

import unittest
from pathlib import Path

from vaelrix_forcefield import create_force_field
from vaelrix_forcefield.brains import code_brain as cb


class CodeBrainEvidence(unittest.TestCase):
    def setUp(self):
        self.field = create_force_field("shadowBlur")
        self.root = cb._project_root()

    def test_ripgrep_results_are_deterministic(self):
        """The bug in one line: these differed."""
        a = cb._ripgrep_keyword("shadowBlur", self.root)
        b = cb._ripgrep_keyword("shadowBlur", self.root)
        self.assertEqual([r.source for r in a], [r.source for r in b])

    def test_results_are_ranked_not_arrival_ordered(self):
        # Written when the sort was alphabetical; ranking deliberately changed that.
        # The invariant is not "alphabetical" — it is a TOTAL, deterministic order:
        # relevance descending, source ascending as the tiebreak. Alphabetical was
        # the bug (it put .ARCHIVED.js above the live file); arrival order was the
        # worse bug (nondeterministic).
        refs = cb._ripgrep_keyword("shadowBlur", self.root)
        keys = [(-r.relevance, r.source) for r in refs]
        self.assertEqual(keys, sorted(keys), "parallel arrival order leaked into evidence")

    def test_ripgrep_is_not_truncated_before_counting(self):
        # 18+ files contain shadowBlur; the old code returned exactly 3 refs.
        refs = cb._ripgrep_keyword("shadowBlur", self.root)
        self.assertGreater(len(refs), 3, "results truncated before the population could be counted")

    def test_the_finding_reports_the_population_not_the_sample(self):
        r = cb.run_code_brain(self.field, query="shadowBlur")
        finding = r.findings[0]
        # The truth, independently: how many files actually match?
        refs = cb._ripgrep_keyword("shadowBlur", self.root)
        true_count = len({ref.source.split(":")[0] for ref in refs})
        self.assertIn(f"found in {true_count} file(s)", finding)
        self.assertGreater(true_count, 3)

    def test_truncation_is_disclosed_not_hidden(self):
        r = cb.run_code_brain(self.field, query="shadowBlur")
        self.assertIn("showing", r.findings[0], "sample presented as if it were everything")

    def test_evidence_is_still_bounded(self):
        """Honesty must not cost the budget: report all, attach few."""
        r = cb.run_code_brain(self.field, query="shadowBlur")
        self.assertLessEqual(len(r.evidence), 5)

    def test_run_code_brain_is_deterministic(self):
        a = cb.run_code_brain(self.field, query="shadowBlur")
        b = cb.run_code_brain(self.field, query="shadowBlur")
        self.assertEqual(a.findings, b.findings)
        self.assertEqual([e.source for e in a.evidence], [e.source for e in b.evidence])

    def test_evidence_refs_point_at_real_file_lines(self):
        """A cite must be checkable, or it is decoration."""
        r = cb.run_code_brain(self.field, query="shadowBlur")
        root = cb._project_root()
        for ev in r.evidence:
            path, _, line_no = ev.source.rpartition(":")
            self.assertTrue((root / path).exists(), f"cite points at a nonexistent file: {path}")
            self.assertTrue(line_no.isdigit(), f"cite has no line number: {ev.source}")


if __name__ == "__main__":
    unittest.main()


class CodeBrainSearchActuallyRuns(unittest.TestCase):
    """
    The search was dead in every non-interactive context and said so as "No
    direct matches for keywords: X".

        cmd = [rg, "--json", "--line-number", "--max-count", "3", keyword]
                                                          # ^ no search path

    ripgrep with no path searches the cwd ONLY when stdin is a TTY; otherwise it
    reads stdin. Under subprocess.run stdin is never a TTY, so rg blocked, hit the
    10s timeout, and `except Exception: return []` reported the failure as an
    empty result. It appeared to work only when a human ran it from a shell and rg
    inherited that terminal — so it was broken in the MCP server, the daemon, and
    CI, i.e. everywhere it is actually used.
    """

    def setUp(self):
        self.root = cb._project_root()

    def test_command_names_an_explicit_search_path(self):
        import inspect
        src = inspect.getsource(cb._ripgrep_keyword)
        self.assertIn('"."', src, "rg with no path reads stdin and hangs in a subprocess")

    def test_search_works_without_a_tty(self):
        """
        The regression, exercised for real: a child process with stdin closed —
        the condition under which this has been silently dead (MCP server, daemon,
        CI). Passing a TTY-inherited shell is what made it look healthy.
        """
        import os, subprocess, sys
        pkg_root = Path(cb.__file__).parents[2]  # dir CONTAINING vaelrix_forcefield
        env = {**os.environ, "PYTHONPATH": str(pkg_root)}
        code = (
            "from vaelrix_forcefield.brains import code_brain as cb;"
            "print(len(cb._ripgrep_keyword('shadowBlur', cb._project_root())))"
        )
        out = subprocess.run([sys.executable, "-c", code], capture_output=True,
                             text=True, stdin=subprocess.DEVNULL, timeout=60, env=env)
        self.assertTrue(out.stdout.strip().isdigit(),
                        f"search crashed with no TTY: {out.stderr[-400:]}")
        self.assertGreater(int(out.stdout.strip()), 3, "search returned nothing with no TTY")

    def test_a_timeout_is_not_reported_as_no_matches(self):
        """A failed search must not look like a clean one."""
        import inspect
        src = inspect.getsource(cb._ripgrep_keyword)
        self.assertIn("TimeoutExpired", src)
        self.assertNotIn("except Exception:\n        return []", src)


class CodeBrainRanking(unittest.TestCase):
    """
    relevance was hardcoded to 0.7 on every ref — the same defect as RISK_BRAIN's
    constant conflictRisk. With every score identical the only ordering left was
    alphabetical, so a query for "shadowBlur" cited visemeMapping.ARCHIVED.js and
    a UX report while the live implementation never surfaced. A cite pointing at
    dead code is a warrant for nothing.
    """

    def setUp(self):
        self.root = cb._project_root()

    def test_relevance_is_not_a_constant(self):
        refs = cb._ripgrep_keyword("shadowBlur", self.root)
        self.assertGreater(len({r.relevance for r in refs}), 1, "every ref scored identically")

    def test_live_source_outranks_archived_copies(self):
        live = cb._score_evidence("src/pages/Visualiser/BytecodeVisualiser.tsx:39",
                                  "ctx.shadowBlur = 12;", "shadowBlur")
        dead = cb._score_evidence("codex/core/archive/truesight/color/visemeMapping.ARCHIVED.js:62",
                                  "const shadowBlur = isAnchor ? 0 : 2;", "shadowBlur")
        self.assertGreater(live, dead)

    def test_source_outranks_tests_and_docs(self):
        src = cb._score_evidence("src/a.ts:1", "ctx.shadowBlur = 4;", "shadowBlur")
        tst = cb._score_evidence("tests/a.test.ts:1", "ctx.shadowBlur = 4;", "shadowBlur")
        doc = cb._score_evidence("docs/report.md:1", "shadowBlur is expensive", "shadowBlur")
        self.assertGreater(src, tst)
        self.assertGreater(src, doc)

    def test_a_comment_mentioning_it_is_weaker_than_code_doing_it(self):
        code = cb._score_evidence("src/a.ts:1", "this.ctx.shadowBlur = 8;", "shadowBlur")
        note = cb._score_evidence("src/a.ts:2", "// shadowBlur is slow here", "shadowBlur")
        self.assertGreater(code, note)

    def test_the_real_bug_site_ranks_first(self):
        """End to end: the query that started this must surface the actual file."""
        field = create_force_field("BytecodeVisualiser shadowBlur stutter")
        r = cb.run_code_brain(field, query="BytecodeVisualiser shadowBlur stutter")
        top = r.evidence[0].source
        self.assertIn("BytecodeVisualiser", top, f"top cite was {top!r}")
        self.assertNotIn("ARCHIVED", top)

    def test_ranking_is_deterministic(self):
        a = cb._ripgrep_keyword("shadowBlur", self.root)
        b = cb._ripgrep_keyword("shadowBlur", self.root)
        self.assertEqual([(r.source, r.relevance) for r in a], [(r.source, r.relevance) for r in b])
