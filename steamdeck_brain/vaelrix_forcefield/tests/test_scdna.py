"""Tests for the SCDNA Retrieval Genome Protocol."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

import copy
import tempfile
import unittest
from pathlib import Path

from vaelrix_forcefield import create_force_field
from vaelrix_forcefield.scdna import (
    DEFAULT_GENE_REGISTRY,
    AcceptanceChecklistError,
    CompilationError,
    DecodedGene,
    apply_decoded_gene_to_force_field,
    compile_gene,
    decode_retrieval_gene,
    degrade_gene,
    detect_gene_matches,
    emit_health_signal,
    encode_gene_from_record,
    encode_retrieval_gene,
    is_deprecated,
    recover_gene,
    translate_flag,
    translate_gene_to_english,
    validate_gene,
)
from vaelrix_forcefield.scdna.compiler import (
    _load_json_registry,
    _save_json_registry,
    compiler_cli_main,
)
from vaelrix_forcefield.scdna.types import RetrievalGene


COLOR_DRAGON_COMPACT = (
    "SCDNA:v1:bug:code:warn:CODE_BRAIN+PHONEME_BRAIN+UI_BRAIN+RISK_BRAIN+TEST_BRAIN:"
    "98:NO_FRONTEND_FALLBACK+RUN_REGRESSION_TESTS+HIGH_BLAST_RADIUS+CANONICAL"
)


def _get_color_dragon() -> RetrievalGene:
    return copy.deepcopy(DEFAULT_GENE_REGISTRY["BUGPATTERN_COLOR_DRAGON_FRONTEND_FALLBACK"])


class TestDecoder(unittest.TestCase):
    def test_decodes_valid_gene(self):
        decoded = decode_retrieval_gene(COLOR_DRAGON_COMPACT)
        self.assertEqual(decoded.version, "v1")
        self.assertEqual(decoded.sourceKind, "bug")
        self.assertEqual(decoded.domain, "code")
        self.assertEqual(decoded.action, "warn")
        self.assertEqual(
            list(decoded.activationBrains),
            ["CODE_BRAIN", "PHONEME_BRAIN", "UI_BRAIN", "RISK_BRAIN", "TEST_BRAIN"],
        )
        self.assertAlmostEqual(decoded.confidence, 0.98)
        self.assertIn("NO_FRONTEND_FALLBACK", decoded.flags)

    def test_round_trip(self):
        gene = _get_color_dragon()
        compact = encode_gene_from_record(gene)
        decoded = decode_retrieval_gene(compact)
        self.assertEqual(decoded.sourceKind, gene.identity.sourceKind)
        self.assertEqual(decoded.domain, gene.domain.primary)
        self.assertEqual(decoded.action, gene.instruction.action)
        self.assertEqual(
            list(decoded.activationBrains),
            gene.domain.activationBrains,
        )
        self.assertAlmostEqual(decoded.confidence, gene.retrieval.confidence, places=2)

    def test_invalid_prefix_fails(self):
        with self.assertRaisesRegex(ValueError, "Invalid retrieval gene prefix"):
            decode_retrieval_gene("DNA:v1:bug:code:warn:CODE:98:FLAG")

    def test_invalid_version_fails(self):
        with self.assertRaisesRegex(ValueError, "Unsupported retrieval gene version"):
            decode_retrieval_gene("SCDNA:v2:bug:code:warn:CODE:98:FLAG")

    def test_invalid_part_count_fails(self):
        with self.assertRaisesRegex(ValueError, "Invalid SCDNA gene shape"):
            decode_retrieval_gene("SCDNA:v1:bug:code:warn:CODE:98")

    def test_confidence_bounds(self):
        for bad in ("-1", "101", "3.14"):
            gene = f"SCDNA:v1:bug:code:warn:CODE:{bad}:FLAG"
            with self.assertRaisesRegex(ValueError, "Invalid confidence value"):
                decode_retrieval_gene(gene)


class TestTranslator(unittest.TestCase):
    def test_known_flags_translate(self):
        self.assertIn(
            "frontend fallback logic",
            translate_flag("NO_FRONTEND_FALLBACK"),
        )
        self.assertIn("regression tests", translate_flag("RUN_REGRESSION_TESTS"))

    def test_unknown_flag_surfaces(self):
        text = translate_flag("MYSTERY_FLAG")
        self.assertIn("Unknown flag", text)
        self.assertIn("MYSTERY_FLAG", text)

    def test_english_translation_shape(self):
        text = translate_gene_to_english(
            source_kind="bug",
            domain="code",
            action="warn",
            activation_brains=["CODE_BRAIN"],
            confidence=0.98,
            flags=["CANONICAL"],
        )
        self.assertIn("bug gene", text)
        self.assertIn("code domain", text)
        self.assertIn("warn", text)
        self.assertIn("CODE_BRAIN", text)
        self.assertIn("0.98", text)
        self.assertIn("canonical system rule", text)


class TestValidator(unittest.TestCase):
    def test_valid_gene_passes(self):
        gene = _get_color_dragon()
        self.assertEqual(validate_gene(gene), [])

    def test_missing_stable_id_fails(self):
        gene = RetrievalGene()
        gene.identity.stableId = ""
        errors = validate_gene(gene)
        self.assertIn("Missing stable ID.", errors)

    def test_missing_content_hash_fails(self):
        gene = RetrievalGene()
        gene.identity.stableId = "X"
        errors = validate_gene(gene)
        self.assertIn("Missing content hash.", errors)

    def test_missing_domain_fails(self):
        gene = RetrievalGene()
        gene.identity.stableId = "X"
        gene.identity.contentHash = "x"
        gene.domain.primary = ""  # type: ignore[assignment]
        errors = validate_gene(gene)
        self.assertIn("Missing primary domain.", errors)

    def test_no_brains_fails(self):
        gene = RetrievalGene()
        gene.identity.stableId = "X"
        gene.identity.contentHash = "x"
        gene.domain.primary = "code"
        errors = validate_gene(gene)
        self.assertIn("Gene must activate at least one brain.", errors)

    def test_confidence_out_of_bounds(self):
        gene = _get_color_dragon()
        gene.retrieval.confidence = 1.5
        errors = validate_gene(gene)
        self.assertIn("Confidence must be between 0 and 1.", errors)

    def test_freshness_out_of_bounds(self):
        gene = _get_color_dragon()
        gene.retrieval.freshness = -0.1
        errors = validate_gene(gene)
        self.assertIn("Freshness must be between 0 and 1.", errors)

    def test_missing_imperative_fails(self):
        gene = _get_color_dragon()
        gene.instruction.imperative = ""
        errors = validate_gene(gene)
        self.assertIn("Gene must include an imperative instruction.", errors)

    def test_missing_short_meaning_fails(self):
        gene = _get_color_dragon()
        gene.english.shortMeaning = ""
        errors = validate_gene(gene)
        self.assertIn("Gene must include short English meaning.", errors)


class TestDetector(unittest.TestCase):
    def test_exact_stable_id_wins(self):
        matches = detect_gene_matches("BUGPATTERN_COLOR_DRAGON_FRONTEND_FALLBACK")
        self.assertEqual(matches[0].identity.stableId, "BUGPATTERN_COLOR_DRAGON_FRONTEND_FALLBACK")

    def test_specific_query_matches_relevant_gene(self):
        matches = detect_gene_matches("frontend fallback phoneme coloring")
        ids = [g.identity.stableId for g in matches]
        self.assertIn("BUGPATTERN_COLOR_DRAGON_FRONTEND_FALLBACK", ids)

    def test_broad_domain_word_does_not_activate_all(self):
        # "xyzzy" should not match any gene.
        matches = detect_gene_matches("xyzzy")
        self.assertEqual(len(matches), 0)

    def test_deprecated_gene_skipped(self):
        registry = copy.deepcopy(DEFAULT_GENE_REGISTRY)
        gene = registry["BUGPATTERN_COLOR_DRAGON_FRONTEND_FALLBACK"]
        gene.lifecycle.status = "deprecated"
        matches = detect_gene_matches("color dragon frontend fallback", registry=registry)
        self.assertNotIn(gene, matches)

    def test_sorted_by_relevance(self):
        matches = detect_gene_matches("frontend fallback phoneme coloring")
        ids = [g.identity.stableId for g in matches]
        self.assertIn("BUGPATTERN_COLOR_DRAGON_FRONTEND_FALLBACK", ids)


class TestLifecycle(unittest.TestCase):
    def test_degradation_curve(self):
        gene = _get_color_dragon()
        self.assertAlmostEqual(gene.retrieval.confidence, 0.98)

        degraded = degrade_gene(gene, contradiction_index=1)
        self.assertEqual(degraded.lifecycle.contradictionCount, 1)
        self.assertAlmostEqual(degraded.retrieval.confidence, 0.833, places=3)
        self.assertEqual(degraded.lifecycle.status, "degraded")

    def test_deprecation_threshold(self):
        gene = _get_color_dragon()
        for i in range(1, 6):
            gene = degrade_gene(gene, contradiction_index=i)
        self.assertEqual(gene.lifecycle.status, "deprecated")
        self.assertTrue(is_deprecated(gene))

    def test_recovery(self):
        gene = _get_color_dragon()
        gene = degrade_gene(gene, contradiction_index=1)
        recovered = recover_gene(gene)
        self.assertGreater(recovered.retrieval.confidence, gene.retrieval.confidence)


class TestHealthSignals(unittest.TestCase):
    def test_yellow_format(self):
        signal = emit_health_signal(
            severity="yellow",
            component="GENE_DEGRADED",
            stable_id="X",
            tier="Y1",
            confidence=0.8,
        )
        self.assertTrue(signal.startswith("PB-YELLOW-v1:SCDNA:GENE_DEGRADED:X:Y1:"))
        self.assertIn("confidence=0.8", signal)

    def test_red_format(self):
        signal = emit_health_signal(
            severity="red",
            component="GENE_DEPRECATED",
            stable_id="X",
            tier="R1",
            count=5,
        )
        self.assertTrue(signal.startswith("PB-RED-v1:SCDNA:GENE_DEPRECATED:X:R1:"))
        self.assertIn("count=5", signal)


class TestForceFieldIntegration(unittest.TestCase):
    def test_gene_updates_routing_and_context(self):
        field = create_force_field("Fix color bug")
        decoded = decode_retrieval_gene(COLOR_DRAGON_COMPACT)
        new_field = apply_decoded_gene_to_force_field(field, decoded)

        self.assertIn("CODE_BRAIN", new_field.routing.activeBrains)
        self.assertIn("UI_BRAIN", new_field.routing.activeBrains)
        self.assertIn(
            "Activated by SCDNA gene in code domain",
            new_field.routing.activationReasons.values(),
        )
        self.assertTrue(any("code domain" in fact for fact in new_field.context.confirmedFacts))


class TestCompiler(unittest.TestCase):
    def test_compile_valid_gene(self):
        gene, compact, warnings = compile_gene(
            stable_id="TEST_COMPILE_VALID",
            source_kind="rule",
            domain="code",
            action="warn",
            activation_brains=["CODE_BRAIN", "RISK_BRAIN"],
            imperative="Test imperative.",
            short_meaning="Test meaning.",
            confidence=95,
            accept_checklist=True,
        )
        self.assertEqual(gene.identity.stableId, "TEST_COMPILE_VALID")
        self.assertTrue(gene.identity.contentHash.startswith("scdna-"))
        self.assertTrue(compact.startswith("SCDNA:v1:rule:code:warn:CODE_BRAIN+RISK_BRAIN:95:"))
        self.assertEqual(warnings, [])

    def test_compile_rejects_duplicate_stable_id(self):
        registry = copy.deepcopy(DEFAULT_GENE_REGISTRY)
        with self.assertRaises(CompilationError):
            compile_gene(
                stable_id="BUGPATTERN_COLOR_DRAGON_FRONTEND_FALLBACK",
                source_kind="rule",
                domain="code",
                action="warn",
                activation_brains=["CODE_BRAIN"],
                imperative="Duplicate.",
                short_meaning="Duplicate.",
                confidence=95,
                registry=registry,
                accept_checklist=True,
            )

    def test_compile_rejects_unknown_brain(self):
        with self.assertRaises(CompilationError):
            compile_gene(
                stable_id="TEST_UNKNOWN_BRAIN",
                source_kind="rule",
                domain="code",
                action="warn",
                activation_brains=["IMAGINARY_BRAIN"],
                imperative="Test.",
                short_meaning="Test.",
                confidence=95,
                accept_checklist=True,
            )

    def test_compile_rejects_unknown_flag(self):
        with self.assertRaises(CompilationError):
            compile_gene(
                stable_id="TEST_UNKNOWN_FLAG",
                source_kind="rule",
                domain="code",
                action="warn",
                activation_brains=["CODE_BRAIN"],
                imperative="Test.",
                short_meaning="Test.",
                confidence=95,
                flags=["MYSTERY"],
                accept_checklist=True,
            )

    def test_compile_rejects_too_many_brains(self):
        with self.assertRaises(CompilationError):
            compile_gene(
                stable_id="TEST_TOO_MANY_BRAINS",
                source_kind="rule",
                domain="code",
                action="warn",
                activation_brains=[
                    "CODE_BRAIN",
                    "PHONEME_BRAIN",
                    "UI_BRAIN",
                    "RISK_BRAIN",
                    "TEST_BRAIN",
                ],
                imperative="Test.",
                short_meaning="Test.",
                confidence=95,
                accept_checklist=True,
            )

    def test_compile_requires_checklist(self):
        with self.assertRaises(AcceptanceChecklistError):
            compile_gene(
                stable_id="TEST_CHECKLIST",
                source_kind="rule",
                domain="code",
                action="warn",
                activation_brains=["CODE_BRAIN"],
                imperative="Test.",
                short_meaning="Test.",
                confidence=95,
                accept_checklist=False,
            )


class TestCompilerCLI(unittest.TestCase):
    def test_decode_command(self):
        rc = compiler_cli_main(["decode", COLOR_DRAGON_COMPACT])
        self.assertEqual(rc, 0)

    def test_detect_command(self):
        rc = compiler_cli_main(["detect", "color dragon frontend fallback"])
        self.assertEqual(rc, 0)

    def test_validate_command(self):
        rc = compiler_cli_main(["validate", "--id", "BUGPATTERN_COLOR_DRAGON_FRONTEND_FALLBACK"])
        self.assertEqual(rc, 0)

    def test_add_dry_run(self):
        with tempfile.TemporaryDirectory() as tmp:
            registry_path = Path(tmp) / "registry.json"
            rc = compiler_cli_main(
                [
                    "--registry-path",
                    str(registry_path),
                    "add",
                    "--id",
                    "CLI_TEST_GENE",
                    "--source",
                    "rule",
                    "--domain",
                    "code",
                    "--brains",
                    "CODE_BRAIN,RISK_BRAIN",
                    "--action",
                    "warn",
                    "--imperative",
                    "CLI test imperative.",
                    "--short-meaning",
                    "CLI test meaning.",
                    "--confidence",
                    "92",
                    "--accept-checklist",
                ]
            )
            self.assertEqual(rc, 0)
            self.assertFalse(registry_path.exists())

    def test_add_commit(self):
        with tempfile.TemporaryDirectory() as tmp:
            registry_path = Path(tmp) / "registry.json"
            rc = compiler_cli_main(
                [
                    "--registry-path",
                    str(registry_path),
                    "add",
                    "--id",
                    "CLI_COMMIT_GENE",
                    "--source",
                    "rule",
                    "--domain",
                    "code",
                    "--brains",
                    "CODE_BRAIN,RISK_BRAIN",
                    "--action",
                    "warn",
                    "--imperative",
                    "Commit test imperative.",
                    "--short-meaning",
                    "Commit test meaning.",
                    "--confidence",
                    "93",
                    "--accept-checklist",
                    "--commit",
                ]
            )
            self.assertEqual(rc, 0)
            self.assertTrue(registry_path.exists())
            loaded = _load_json_registry(registry_path)
            self.assertIn("CLI_COMMIT_GENE", loaded)

    def test_json_registry_save_load(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "registry.json"
            registry = {"TEST": _get_color_dragon()}
            _save_json_registry(path, registry)
            loaded = _load_json_registry(path)
            self.assertEqual(
                loaded["TEST"].identity.stableId,
                "BUGPATTERN_COLOR_DRAGON_FRONTEND_FALLBACK",
            )


if __name__ == "__main__":
    unittest.main()
