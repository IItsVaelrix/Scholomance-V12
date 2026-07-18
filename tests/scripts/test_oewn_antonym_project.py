import os
import sqlite3
import sys
import unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "scripts"))

from oewn_antonym_project import (  # noqa: E402
    apply_oewn_antonyms,
    parse_oewn_antonyms,
    project_antonyms,
)

FIXTURE = os.path.join(ROOT, "tests", "fixtures", "oewn-antonym-mini.xml")


def _make_db():
    conn = sqlite3.connect(":memory:")
    conn.executescript("""
    CREATE TABLE wordnet_synset(id TEXT PRIMARY KEY, pos TEXT, lexname TEXT, definition TEXT, examples_json TEXT, source TEXT, source_url TEXT);
    CREATE TABLE wordnet_rel(synset_id TEXT NOT NULL, rel TEXT NOT NULL, target_synset_id TEXT NOT NULL, source TEXT NOT NULL, source_url TEXT);
    CREATE TABLE meta(key TEXT PRIMARY KEY, value TEXT);
    INSERT INTO wordnet_synset(id, pos, lexname, definition, examples_json, source, source_url)
      VALUES ('oewn-syn-hot','a',NULL,'hot','[]','oewn','https://en-word.net/'),
             ('oewn-syn-cold','a',NULL,'cold','[]','oewn','https://en-word.net/'),
             ('oewn-syn-good','a',NULL,'good','[]','oewn','https://en-word.net/');
    INSERT INTO wordnet_rel VALUES ('oewn-syn-hot','antonym','oewn-syn-cold','oewn','https://en-word.net/');
    INSERT INTO wordnet_rel VALUES ('oewn-syn-hot','antonym','oewn-syn-cold','manual','manual');
    INSERT INTO wordnet_rel VALUES ('oewn-syn-hot','similar','oewn-syn-good','oewn','https://en-word.net/');
    """)
    return conn


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


class TestApply(unittest.TestCase):
    def test_scoped_delete_preserves_manual_and_similar(self):
        conn = _make_db()
        parsed = parse_oewn_antonyms(FIXTURE)
        existing = {r[0] for r in conn.execute("SELECT id FROM wordnet_synset")}
        proj = project_antonyms(parsed, existing)

        result = apply_oewn_antonyms(
            conn, proj,
            release="2024",
            source_url="file://fixture",
            source_sha256="abc",
            timestamp="2026-07-18T09:00:00Z",
            max_unresolved_ratio=0.5,
        )

        manuals = list(conn.execute(
            "SELECT * FROM wordnet_rel WHERE rel='antonym' AND source='manual'"))
        self.assertEqual(len(manuals), 1)
        similars = list(conn.execute(
            "SELECT * FROM wordnet_rel WHERE rel='similar' AND source='oewn'"))
        self.assertEqual(len(similars), 1)
        oewn_hot_cold = list(conn.execute(
            """SELECT * FROM wordnet_rel WHERE rel='antonym' AND source='oewn'
               AND synset_id='oewn-syn-hot' AND target_synset_id='oewn-syn-cold'"""))
        self.assertEqual(len(oewn_hot_cold), 0)
        self.assertGreaterEqual(result.skipped_existing_count, 1)
        self.assertGreaterEqual(result.inserted_count, 1)
        meta = dict(conn.execute("SELECT key,value FROM meta"))
        self.assertEqual(meta["oewn_antonym_ingested_at"], "2026-07-18T09:00:00Z")
        self.assertGreaterEqual(int(meta["oewn_antonym_skipped_existing_count"]), 1)

    def test_unresolved_gate_aborts_before_writes(self):
        conn = _make_db()
        before = list(conn.execute("SELECT * FROM wordnet_rel ORDER BY rowid"))
        parsed = parse_oewn_antonyms(FIXTURE)
        existing = {r[0] for r in conn.execute("SELECT id FROM wordnet_synset")}
        proj = project_antonyms(parsed, existing)

        with self.assertRaises(ValueError):
            apply_oewn_antonyms(
                conn, proj,
                release="2024", source_url="x", source_sha256="y",
                timestamp="2026-07-18T09:00:00Z",
                max_unresolved_ratio=0.0,
            )

        after = list(conn.execute("SELECT * FROM wordnet_rel ORDER BY rowid"))
        self.assertEqual(before, after)


if __name__ == "__main__":
    unittest.main()
