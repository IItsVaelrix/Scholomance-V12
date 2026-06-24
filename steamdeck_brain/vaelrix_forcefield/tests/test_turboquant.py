"""Tests for TurboQuant chunk dispatch and brain lenses."""

import unittest

from vaelrix_forcefield import apply_routing, create_force_field, get_registry
from vaelrix_forcefield.turboquant import (
    BRAIN_LENS_OVERRIDES,
    TurboQuantClient,
    dispatch_chunks_to_brains,
)
from vaelrix_forcefield.turboquant.lenses import DEFAULT_LENS, get_lens


class TestTurboQuantClient(unittest.TestCase):
    def setUp(self):
        self.client = TurboQuantClient()

    def tearDown(self):
        self.client.close()

    def test_store_and_retrieve(self):
        self.client.store("Search governor blocks repeated queries", {"source": "test"})
        results = self.client.retrieve("repeated search")
        self.assertTrue(results)
        self.assertIn("Search governor", results[0]["text"])

    def test_ingest_text_creates_chunks(self):
        text = "\n\n".join([f"Paragraph {i} about code and tests." for i in range(10)])
        ids = self.client.ingest_text(text, chunk_size=80)
        self.assertGreater(len(ids), 1)
        self.assertEqual(self.client.count(), len(ids))

    def test_retrieve_filters_by_metadata(self):
        self.client.store("code chunk", {"source": "code", "lens": "code"})
        self.client.store("lore chunk", {"source": "lore", "lens": "lore"})
        results = self.client.retrieve("chunk", metadata_filter={"lens": "code"})
        self.assertTrue(all(r["metadata"]["lens"] == "code" for r in results))


class TestBrainLenses(unittest.TestCase):
    def test_default_lens_passes_query_through(self):
        lens = DEFAULT_LENS
        self.assertEqual(lens.transform_query("hello"), "hello")

    def test_code_lens_adds_code_keywords(self):
        lens = get_lens("CODE_BRAIN")
        transformed = lens.transform_query("governor")
        self.assertIn("governor", transformed)
        self.assertIn("code", transformed)

    def test_lore_lens_adds_lore_keywords(self):
        lens = get_lens("LORE_BRAIN")
        transformed = lens.transform_query("soulfire")
        self.assertIn("soulfire", transformed)
        self.assertIn("lore", transformed)

    def test_unknown_brain_uses_default_lens(self):
        lens = get_lens("UNKNOWN_BRAIN")
        self.assertEqual(lens.brain_id, "DEFAULT")


class TestChunkDispatch(unittest.TestCase):
    def setUp(self):
        self.client = TurboQuantClient()
        self.client.store("CODE_BRAIN sees function signatures and imports.", {"source": "code_docs"})
        self.client.store("RISK_BRAIN sees regression patterns and blast radius.", {"source": "risk_docs"})
        self.client.store("LORE_BRAIN sees Mirrorborne canon and symbolism.", {"source": "lore_docs"})

    def tearDown(self):
        self.client.close()

    def test_dispatch_populates_retrieved_chunks(self):
        field = create_force_field("Fix the search bug")
        field = apply_routing(field, get_registry())
        field = dispatch_chunks_to_brains(field, self.client)

        self.assertTrue(field.memory.retrievedChunks)
        self.assertTrue(field.memory.turboQuantRefs)
        self.assertTrue(field.memory.chunkUseHistory)

    def test_dispatch_only_runs_for_active_brains(self):
        field = create_force_field("Break down this Vaelrix verse")
        field = apply_routing(field, get_registry())
        active = set(field.routing.activeBrains)
        self.assertNotIn("CODE_BRAIN", active)

        field = dispatch_chunks_to_brains(field, self.client)
        used_brains = set()
        for chunk in field.memory.retrievedChunks:
            used_brains.update(chunk.usedByBrains)
        self.assertNotIn("CODE_BRAIN", used_brains)

    def test_dispatch_merges_duplicate_chunks(self):
        # Both CODE_BRAIN and TEST_BRAIN will retrieve the code chunk.
        field = create_force_field("Fix the bug and add tests")
        field = apply_routing(field, get_registry())
        field = dispatch_chunks_to_brains(field, self.client)

        chunk_ids = [c.id for c in field.memory.retrievedChunks]
        self.assertEqual(len(chunk_ids), len(set(chunk_ids)))


if __name__ == "__main__":
    unittest.main()
