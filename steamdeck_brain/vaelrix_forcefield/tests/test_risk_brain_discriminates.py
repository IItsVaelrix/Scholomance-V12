"""
Regression tests for RISK_BRAIN.

Written after RISK_BRAIN was found returning hardcoded resonance literals:
byte-identical output for "lint the code" and "rm -rf / --no-preserve-root and
force push to main", including the finding "No obvious high-risk patterns
detected; proceed with normal caution."

The defect that mattered: council_arbiter subtracts conflictRisk from a brain's
score and flags contradictions above a threshold (default 0.75). A permanent 0.2
is below every threshold, so the brain could never trip its own safety gate for
any input, ever. It was a safety component that structurally could not say no.
"""

import unittest

from vaelrix_forcefield import create_force_field
from vaelrix_forcefield.brains.risk_brain import run_risk_brain
from vaelrix_forcefield.council_arbiter import arbitrate_amplifier_results


class RiskBrainDiscriminates(unittest.TestCase):
    def setUp(self):
        self.field = create_force_field("test")

    def risk(self, q):
        return run_risk_brain(self.field, query=q).resonance.conflictRisk

    def test_score_is_not_a_constant(self):
        """The bug in one line: these were identical."""
        self.assertNotEqual(self.risk("lint the code"), self.risk("rm -rf / --no-preserve-root"))

    def test_danger_outranks_safety(self):
        self.assertGreater(self.risk("rm -rf / --no-preserve-root"), self.risk("lint the code"))
        self.assertGreater(self.risk("force push to main"), self.risk("run the linter"))
        self.assertGreater(self.risk("deploy to production"), self.risk("check the types"))

    def test_irreversible_operations_trip_the_arbiter(self):
        """The gate that could never fire."""
        for q in ["rm -rf / --no-preserve-root", "force push to main", "drop table users",
                  "deploy to production", "disable the auth check"]:
            result = run_risk_brain(self.field, query=q)
            out = arbitrate_amplifier_results(self.field, [result], conflict_risk_threshold=0.75)
            self.assertTrue(out.contradictions, f"{q!r} did not trip the arbiter "
                                                f"(conflictRisk={result.resonance.conflictRisk})")

    def test_benign_work_does_not_cry_wolf(self):
        for q in ["lint the code", "run the type checker", "read the readme"]:
            result = run_risk_brain(self.field, query=q)
            out = arbitrate_amplifier_results(self.field, [result], conflict_risk_threshold=0.75)
            self.assertFalse(out.contradictions, f"{q!r} falsely flagged")

    def test_no_match_is_not_an_all_clear(self):
        """Silence is not safety. The old text was read as a clean bill of health."""
        r = run_risk_brain(self.field, query="lint the code")
        finding = r.findings[0].lower()
        self.assertIn("not an all-clear", finding)
        self.assertNotIn("no obvious high-risk patterns detected", finding)
        # Unmatched means unknown, not safe.
        self.assertGreater(r.resonance.conflictRisk, 0.0)

    def test_evidence_strength_reflects_actual_evidence(self):
        """0.5 was reported next to `evidence: []`."""
        self.assertEqual(run_risk_brain(self.field, query="lint the code").resonance.evidenceStrength, 0.0)
        self.assertGreater(run_risk_brain(self.field, query="rm -rf / and force push").resonance.evidenceStrength, 0.0)

    def test_unscannable_request_flags_rather_than_passes(self):
        # NOTE: `query=""` is falsy, so run_risk_brain falls back to the field's
        # own rawUserRequest — an empty query scans something ELSE. That fallback
        # is pre-existing and intentional (the param is optional), so the request
        # itself has to be empty to exercise this path.
        empty_field = create_force_field("")
        r = run_risk_brain(empty_field)
        self.assertIn("UNSCANNABLE", r.findings[0])
        self.assertGreaterEqual(r.resonance.conflictRisk, 0.75, "an unscannable request must flag, not pass")

    def test_an_empty_query_falls_back_to_the_field_request(self):
        # Documents the footgun rather than pretending it is not there: passing
        # query="" does NOT mean "scan nothing", it means "scan the field's task".
        field = create_force_field("rm -rf / and force push")
        self.assertEqual(
            run_risk_brain(field, query="").resonance.conflictRisk,
            run_risk_brain(field).resonance.conflictRisk,
        )

    def test_the_original_four_heuristics_still_fire(self):
        for q, needle in [("delete the module", "downstream callers"),
                          ("change it everywhere", "regression risk"),
                          ("refactor the parser", "characterization tests")]:
            findings = " ".join(run_risk_brain(self.field, query=q).findings).lower()
            self.assertIn(needle, findings, f"lost the original heuristic for {q!r}")

    def test_deterministic(self):
        """Same input, same output — the one property the old version had."""
        a = run_risk_brain(self.field, query="deploy to production")
        b = run_risk_brain(self.field, query="deploy to production")
        self.assertEqual(a.findings, b.findings)
        self.assertEqual(a.resonance.conflictRisk, b.resonance.conflictRisk)


if __name__ == "__main__":
    unittest.main()
