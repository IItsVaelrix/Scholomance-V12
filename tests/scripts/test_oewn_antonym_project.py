import os
import sys
import unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "scripts"))

from oewn_antonym_project import (  # noqa: E402
    parse_oewn_antonyms,
    project_antonyms,
)

FIXTURE = os.path.join(ROOT, "tests", "fixtures", "oewn-antonym-mini.xml")


class TestProject(unittest.TestCase):
    def test_parse_release(self):
        parsed = parse_oewn_antonyms(FIXTURE)
        self.assertEqual(parsed.release, "2024")

    def test_resolution_metrics_use_asserted_not_projected(self):
        # Fixture lock: 3 SenseRelation antonyms + 1 SynsetRelation antonym = 4 asserted.
        # good→oewn-bad-missing is unresolved → resolved=3, unresolved=1.
        parsed = parse_oewn_antonyms(FIXTURE)
        existing = {"oewn-syn-hot", "oewn-syn-cold", "oewn-syn-good"}
        proj = project_antonyms(parsed, existing)
        self.assertEqual(proj.asserted_count, 4)
        self.assertEqual(proj.resolved_asserted_count, 3)
        self.assertEqual(proj.unresolved_asserted_count, 1)
        self.assertEqual(proj.unresolved_ratio, 1 / 4)
        self.assertEqual(proj.resolution_ratio, 3 / 4)
        self.assertIn(("oewn-syn-hot", "oewn-syn-cold"), proj.projected_pairs)
        self.assertIn(("oewn-syn-cold", "oewn-syn-hot"), proj.projected_pairs)
        # Reciprocal closure is an output statistic; must not feed the ratio.
        self.assertEqual(proj.projected_count_after_closure, len(proj.projected_pairs))
        self.assertGreaterEqual(proj.projected_count_after_closure, 2)


if __name__ == "__main__":
    unittest.main()
