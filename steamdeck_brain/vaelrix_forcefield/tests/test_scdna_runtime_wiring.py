"""Tests for SCDNA runtime integration with the Vaelrix ForceField."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

import copy
import json
import tempfile
import unittest
from pathlib import Path

from vaelrix_forcefield import (
    BrainBridge,
    apply_routing,
    apply_scdna_to_force_field,
    create_force_field,
)
from vaelrix_forcefield.amplifier_registry import get_registry
from vaelrix_forcefield.amplifier_router import select_amplifiers
from vaelrix_forcefield.scdna import (
    DEFAULT_GENE_REGISTRY,
    RetrievalGene,
    attach_gene_to_chunk,
    decode_retrieval_gene,
    encode_gene_from_record,
    retrieve_genome_chunks,
)
from vaelrix_forcefield.search_governor import should_allow_search
from vaelrix_forcefield.turboquant import TurboQuantClient


class TestSearchGovernorSCDNA(unittest.TestCase):
    def test_gene_match_blocks_broad_search(self):
        field = create_force_field("color dragon frontend fallback phoneme")
        decision = should_allow_search(field, "color dragon frontend fallback", "Need to find the bug pattern")
        self.assertFalse(decision.allowed)
        self.assertIn("SCDNA gene", decision.reason)
        self.assertIn("BUGPATTERN_COLOR_DRAGON_FRONTEND_FALLBACK", decision.reason)

    def test_known_target_wins_over_gene(self):
        from vaelrix_forcefield.context_ledger import confirm_file

        field = create_force_field("Why does search loop?")
        field = confirm_file(field, "search_governor", "tui/utils/search_governor.py")

        decision = should_allow_search(
            field,
            "search_governor implementation",
            "Need to understand the governor",
        )
        self.assertFalse(decision.allowed)
        self.assertIn("known target", decision.reason)

    def test_low_confidence_gene_allows_search(self):
        registry = copy.deepcopy(DEFAULT_GENE_REGISTRY)
        gene = registry["TOOL_RULE_SEARCH_BEFORE_ASSUME"]
        gene.retrieval.confidence = 0.4
        gene.retrieval.originalConfidence = 0.4

        field = create_force_field("search before assume memory")
        decision = should_allow_search(
            field, "search before assume", "Need evidence", gene_registry=registry
        )
        self.assertTrue(decision.allowed)

    def test_no_gene_match_allows_search(self):
        field = create_force_field("xyzzy unknown pattern")
        decision = should_allow_search(field, "xyzzy unknown pattern", "Need to explore")
        self.assertTrue(decision.allowed)


class TestAmplifierRouterSCDNA(unittest.TestCase):
    def test_gene_matches_activate_brains(self):
        field = create_force_field("color dragon frontend fallback")
        gene = DEFAULT_GENE_REGISTRY["BUGPATTERN_COLOR_DRAGON_FRONTEND_FALLBACK"]
        decoded = decode_retrieval_gene(encode_gene_from_record(gene))

        routing = select_amplifiers(field, get_registry(), gene_matches=[decoded])
        self.assertIn("CODE_BRAIN", routing.activeBrains)
        self.assertIn("PHONEME_BRAIN", routing.activeBrains)
        self.assertIn("UI_BRAIN", routing.activeBrains)
        self.assertIn("RISK_BRAIN", routing.activeBrains)
        self.assertIn("TEST_BRAIN", routing.activeBrains)

    def test_no_gene_matches_routing_unchanged(self):
        field = create_force_field("Break down this Vaelrix verse, its rhyme and phonemes")
        routing = select_amplifiers(field, get_registry())
        self.assertIn("RHYME_BRAIN", routing.activeBrains)
        self.assertIn("PHONEME_BRAIN", routing.activeBrains)
        self.assertIn("LORE_BRAIN", routing.activeBrains)
        self.assertNotIn("CODE_BRAIN", routing.activeBrains)

    def test_apply_routing_merges_signal_and_gene_brains(self):
        field = create_force_field("color dragon frontend fallback")
        gene = DEFAULT_GENE_REGISTRY["BUGPATTERN_COLOR_DRAGON_FRONTEND_FALLBACK"]
        decoded = decode_retrieval_gene(encode_gene_from_record(gene))

        field = apply_routing(field, get_registry(), gene_matches=[decoded])
        self.assertIn("CODE_BRAIN", field.routing.activeBrains)
        self.assertTrue(
            any("SCDNA gene" in reason for reason in field.routing.activationReasons.values())
        )


class TestForceFieldStartupSCDNA(unittest.TestCase):
    def test_apply_scdna_to_force_field_updates_context_and_memory(self):
        field = create_force_field("color dragon frontend fallback")
        field, decoded, contradictions, signals, _registry = apply_scdna_to_force_field(field)

        self.assertTrue(decoded)
        self.assertTrue(
            any("code domain" in fact for fact in field.context.confirmedFacts)
        )
        self.assertTrue(
            any("SCDNA gene matched" in mem for mem in field.memory.workingMemory)
        )
        self.assertTrue(
            any(ref.startswith("scdna:") for ref in field.memory.turboQuantRefs)
        )
        self.assertIn("CODE_BRAIN", field.routing.activeBrains)

    def test_deprecated_gene_not_applied(self):
        registry = copy.deepcopy(DEFAULT_GENE_REGISTRY)
        registry["BUGPATTERN_COLOR_DRAGON_FRONTEND_FALLBACK"].lifecycle.status = "deprecated"

        field = create_force_field("color dragon frontend fallback")
        field, decoded, contradictions, signals, _registry = apply_scdna_to_force_field(
            field, registry=registry
        )
        # Color dragon specifically must not be applied; other genes may still match.
        stable_ids = {g.sourceKind for g in decoded}
        self.assertNotIn("bug", stable_ids)
        self.assertNotIn("CODE_BRAIN", field.routing.activeBrains)


class TestBrainBridgeSCDNA(unittest.TestCase):
    def test_ask_applies_scdna_genes(self):
        bridge = BrainBridge()
        result = bridge.ask("color dragon frontend fallback bug", persist=False)

        field = result["field"]
        self.assertIn("CODE_BRAIN", field.routing.activeBrains)
        self.assertTrue(result["scdna_genes"])
        self.assertTrue(
            any("code domain" in fact for fact in field.context.confirmedFacts)
        )


class TestTurboQuantGenomeChunks(unittest.TestCase):
    def test_attach_and_retrieve_genome_chunk(self):
        client = TurboQuantClient()
        gene = DEFAULT_GENE_REGISTRY["TOOL_RULE_SEARCH_BEFORE_ASSUME"]
        try:
            chunk = attach_gene_to_chunk(
                client,
                gene,
                payload="Always search the codebase before assuming implementation details.",
                summary="Search before assume rule",
                index=1,
            )
            self.assertEqual(chunk.gene.identity.stableId, gene.identity.stableId)
            self.assertTrue(chunk.compressedPayloadRef)

            retrieved = retrieve_genome_chunks(client, "search before assume")
            ids = [r.gene.identity.stableId for r in retrieved]
            self.assertIn(gene.identity.stableId, ids)
        finally:
            client.close()

    def test_retrieve_skips_stale_hash(self):
        client = TurboQuantClient()
        gene = copy.deepcopy(DEFAULT_GENE_REGISTRY["TOOL_RULE_SEARCH_BEFORE_ASSUME"])
        try:
            chunk = attach_gene_to_chunk(
                client,
                gene,
                payload="Search first.",
                summary="Rule",
                index=1,
            )
            # Mutate the registry so the stored hash no longer matches.
            registry = {gene.identity.stableId: gene}
            registry[gene.identity.stableId].identity.contentHash = "tampered"
            retrieved = retrieve_genome_chunks(client, "search first", registry=registry)
            self.assertEqual(len(retrieved), 0)
        finally:
            client.close()


class TestTieredSignals(unittest.TestCase):
    def test_determinism_auditor_emits_tiered_signals(self):
        from vaelrix_forcefield.determinism_auditor import audit_determinism

        field = create_force_field("x", classification="diagnostic")
        field.determinism.deterministicMode = True
        field.determinism.seed = None
        result = audit_determinism(field, [])
        self.assertTrue(result.tieredSignals)
        self.assertTrue(any("Y1" in s for s in result.tieredSignals))

    def test_tool_governor_blocked_emits_red_signal(self):
        from vaelrix_forcefield.tool_governor import should_allow_tool_call

        field = create_force_field("x")
        decision = should_allow_tool_call(field, "read_file", {}, "")
        self.assertFalse(decision.allowed)
        self.assertTrue(decision.tieredSignals)
        self.assertTrue(any("R2" in s for s in decision.tieredSignals))

    def test_tool_governor_high_risk_emits_yellow_signal(self):
        from vaelrix_forcefield.tool_governor import should_allow_tool_call

        field = create_force_field("x")
        decision = should_allow_tool_call(
            field, "replace_file_content", {"path": "x"}, "Edit file"
        )
        self.assertTrue(decision.allowed)
        self.assertTrue(decision.tieredSignals)
        self.assertTrue(any("Y3" in s for s in decision.tieredSignals))

    def test_search_governor_emits_tiered_signals(self):
        field = create_force_field("x")
        decision = should_allow_search(field, "auth", "")
        self.assertFalse(decision.allowed)
        self.assertTrue(decision.tieredSignals)
        self.assertTrue(any("R2" in s for s in decision.tieredSignals))

    def test_brainbridge_routes_all_tiered_signals(self):
        bridge = BrainBridge()
        result = bridge.ask("fix the bug with replace_file_content", persist=False)
        self.assertTrue(result["health_signals"])
        # At least one signal should originate from a non-SCDNA source.
        non_scdna = [s for s in result["health_signals"] if "SCDNA" not in s]
        self.assertTrue(non_scdna)


class TestCompilerSupersedeAndHistory(unittest.TestCase):
    def test_supersede_marks_old_gene_deprecated(self):
        from vaelrix_forcefield.scdna.compiler import _load_json_registry, compiler_cli_main

        with tempfile.TemporaryDirectory() as tmp:
            registry_path = Path(tmp) / "registry.json"
            history_path = Path(tmp) / "history.jsonl"
            # Commit original gene.
            rc = compiler_cli_main(
                [
                    "--registry-path",
                    str(registry_path),
                    "--history-path",
                    str(history_path),
                    "add",
                    "--id",
                    "OLD_RULE",
                    "--source",
                    "rule",
                    "--domain",
                    "code",
                    "--brains",
                    "CODE_BRAIN",
                    "--action",
                    "warn",
                    "--imperative",
                    "Old rule.",
                    "--short-meaning",
                    "Old meaning.",
                    "--confidence",
                    "90",
                    "--accept-checklist",
                    "--commit",
                ]
            )
            self.assertEqual(rc, 0)

            # Supersede with new gene.
            rc = compiler_cli_main(
                [
                    "--registry-path",
                    str(registry_path),
                    "--history-path",
                    str(history_path),
                    "add",
                    "--id",
                    "NEW_RULE",
                    "--source",
                    "rule",
                    "--domain",
                    "code",
                    "--brains",
                    "CODE_BRAIN",
                    "--action",
                    "warn",
                    "--imperative",
                    "New rule.",
                    "--short-meaning",
                    "New meaning.",
                    "--confidence",
                    "95",
                    "--supersede",
                    "OLD_RULE",
                    "--accept-checklist",
                    "--commit",
                ]
            )
            self.assertEqual(rc, 0)

            registry = _load_json_registry(registry_path)
            self.assertEqual(registry["OLD_RULE"].lifecycle.status, "deprecated")
            self.assertEqual(registry["OLD_RULE"].lifecycle.supersededBy, "NEW_RULE")
            self.assertEqual(registry["NEW_RULE"].lifecycle.status, "active")

            # History should have commit + supersede entries.
            lines = history_path.read_text(encoding="utf-8").strip().split("\n")
            self.assertEqual(len(lines), 3)
            actions = [json.loads(line)["action"] for line in lines]
            self.assertEqual(actions, ["commit", "supersede", "commit"])


class TestFreshnessGateAndMatchCap(unittest.TestCase):
    def test_stale_gene_not_applied(self):
        registry = copy.deepcopy(DEFAULT_GENE_REGISTRY)
        gene = registry["BUGPATTERN_COLOR_DRAGON_FRONTEND_FALLBACK"]
        gene.retrieval.freshness = 0.1

        field = create_force_field("color dragon frontend fallback")
        field, decoded, contradictions, signals, _ = apply_scdna_to_force_field(
            field, registry=registry, min_freshness=0.5
        )
        self.assertFalse(decoded)
        self.assertNotIn("CODE_BRAIN", field.routing.activeBrains)

    def test_gene_match_cap(self):
        registry = copy.deepcopy(DEFAULT_GENE_REGISTRY)
        # All three canonical genes should match this broad query, but cap=1.
        field = create_force_field("frontend backend search assume bug code architecture")
        field, decoded, contradictions, signals, _ = apply_scdna_to_force_field(
            field, registry=registry, max_genes_per_request=1
        )
        self.assertEqual(len(decoded), 1)


class TestContradictionDetection(unittest.TestCase):
    def test_conflicting_actions_detected(self):
        from vaelrix_forcefield.scdna import detect_contradictions

        registry = copy.deepcopy(DEFAULT_GENE_REGISTRY)
        block_gene = copy.deepcopy(registry["TOOL_RULE_SEARCH_BEFORE_ASSUME"])
        block_gene.identity.stableId = "TOOL_RULE_BLOCK_ASSUME"
        block_gene.instruction.action = "block"
        registry[block_gene.identity.stableId] = block_gene

        field = create_force_field("search assume memory")
        matches = [registry["TOOL_RULE_SEARCH_BEFORE_ASSUME"], block_gene]
        contradictions = detect_contradictions(field, matches)
        ids = {c.gene.identity.stableId for c in contradictions}
        self.assertIn("TOOL_RULE_SEARCH_BEFORE_ASSUME", ids)
        self.assertIn("TOOL_RULE_BLOCK_ASSUME", ids)

    def test_suppressed_brain_contradiction(self):
        from vaelrix_forcefield.scdna import detect_contradictions

        field = create_force_field("color dragon frontend fallback")
        field.routing.suppressedBrains = {"CODE_BRAIN": " intentionally suppressed for test"}
        gene = DEFAULT_GENE_REGISTRY["BUGPATTERN_COLOR_DRAGON_FRONTEND_FALLBACK"]
        contradictions = detect_contradictions(field, [gene])
        self.assertTrue(any("suppressed brain" in c.reason for c in contradictions))

    def test_task_classification_mismatch(self):
        from vaelrix_forcefield.scdna import detect_contradictions

        field = create_force_field("write a poem", classification="creative")
        gene = DEFAULT_GENE_REGISTRY["BUGPATTERN_COLOR_DRAGON_FRONTEND_FALLBACK"]
        contradictions = detect_contradictions(field, [gene])
        self.assertTrue(
            any("incompatible with task classification" in c.reason for c in contradictions)
        )

    def test_contradiction_degrades_gene(self):
        from vaelrix_forcefield.scdna import resolve_scdna_contradictions

        registry = copy.deepcopy(DEFAULT_GENE_REGISTRY)
        original_confidence = registry["TOOL_RULE_SEARCH_BEFORE_ASSUME"].retrieval.confidence
        block_gene = copy.deepcopy(registry["TOOL_RULE_SEARCH_BEFORE_ASSUME"])
        block_gene.identity.stableId = "TOOL_RULE_BLOCK_ASSUME"
        block_gene.instruction.action = "block"
        block_gene.domain.secondary = ["search", "retrieval"]
        registry[block_gene.identity.stableId] = block_gene

        field = create_force_field("search assume memory")
        matches = [registry["TOOL_RULE_SEARCH_BEFORE_ASSUME"], block_gene]
        resolved, contradictions, signals, updated_registry = resolve_scdna_contradictions(
            field, matches, contradiction_index=1, registry=registry
        )

        self.assertTrue(contradictions)
        self.assertTrue(signals)
        self.assertLess(
            updated_registry["TOOL_RULE_SEARCH_BEFORE_ASSUME"].retrieval.confidence,
            original_confidence,
        )


class TestPixelBrainRouting(unittest.TestCase):
    def test_yellow_signal_converted_to_ok(self):
        from vaelrix_forcefield.scdna import (
            emit_health_signal,
            route_scdna_signals_to_health,
        )
        from vaelrix_forcefield.pixelbrain import verify_health

        signal = emit_health_signal(
            severity="yellow",
            component="GENE_DEGRADED",
            stable_id="X",
            tier="Y1",
            confidence=0.8,
        )
        health = route_scdna_signals_to_health([signal])
        self.assertEqual(len(health), 1)
        self.assertTrue(verify_health(health[0]))
        self.assertTrue(health[0].startswith("PB-OK-v1"))

    def test_red_signal_converted_to_red_distress(self):
        from vaelrix_forcefield.scdna import (
            emit_health_signal,
            route_scdna_signals_to_health,
        )
        from vaelrix_forcefield.pixelbrain import verify_health

        signal = emit_health_signal(
            severity="red",
            component="GENE_DEPRECATED",
            stable_id="X",
            tier="R1",
            confidence=0.4,
        )
        health = route_scdna_signals_to_health([signal])
        self.assertEqual(len(health), 1)
        self.assertTrue(verify_health(health[0]))
        self.assertTrue(health[0].startswith("PB-RED-v1"))


class TestCouncilArbiterGeneFindings(unittest.TestCase):
    def test_gene_results_produced(self):
        from vaelrix_forcefield.scdna import scdna_matches_to_amplifier_results
        from vaelrix_forcefield.scdna.council_integration import _SCDNA_BRAIN_ID

        gene = DEFAULT_GENE_REGISTRY["BUGPATTERN_COLOR_DRAGON_FRONTEND_FALLBACK"]
        decoded = decode_retrieval_gene(encode_gene_from_record(gene))
        results = scdna_matches_to_amplifier_results([decoded])

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].brainId, _SCDNA_BRAIN_ID)
        self.assertTrue(results[0].findings)
        self.assertTrue(results[0].evidence)

    def test_gene_findings_reach_arbiter(self):
        from vaelrix_forcefield.scdna import scdna_matches_to_amplifier_results

        bridge = BrainBridge()
        result = bridge.ask("color dragon frontend fallback bug", persist=False)

        gene_brain_ids = [r.brainId for r in result["raw_results"]]
        self.assertIn("SCDNA_BRAIN", gene_brain_ids)
        self.assertTrue(
            any("SCDNA" in finding for finding in result["findings"])
        )


if __name__ == "__main__":
    unittest.main()
