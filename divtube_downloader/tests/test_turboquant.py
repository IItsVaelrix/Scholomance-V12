"""TurboQuant plugin round-trip harness (spec v1.0, phases 0-3).

Spawns turboquant_plugin.js in an isolated temp working directory so the
real registry is never touched, then exercises the stdio JSON-lines IPC
end to end. Skipped automatically when Node is unavailable.
"""
import json
import os
import shutil
import subprocess
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # divtube_downloader/
PLUGIN = os.path.join(ROOT, "turboquant_plugin.js")


def _node_bin():
    cand = "/home/deck/.nvm/versions/node/v20.20.2/bin/node"
    if os.path.exists(cand):
        return cand
    return shutil.which("node")


@unittest.skipUnless(_node_bin() and os.path.exists(PLUGIN), "node or plugin unavailable")
class TestTurboQuantRoundTrip(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.proc = subprocess.Popen(
            [_node_bin(), PLUGIN],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, cwd=self.tmp,
        )

    def tearDown(self):
        try:
            self.proc.terminate()
            self.proc.wait(timeout=5)
        except Exception:
            self.proc.kill()
        for stream in (self.proc.stdin, self.proc.stdout, self.proc.stderr):
            try:
                stream.close()
            except Exception:
                pass
        shutil.rmtree(self.tmp, ignore_errors=True)

    def rpc(self, payload):
        self.proc.stdin.write(json.dumps(payload) + "\n")
        self.proc.stdin.flush()
        return json.loads(self.proc.stdout.readline())

    # ── Phase 0: foundation / health round-trip ──────────────────────
    def test_phase0_ping(self):
        r = self.rpc({"action": "ping", "id": 1})
        self.assertEqual(r["status"], "ok")
        self.assertIn("latency_ms", r)
        self.assertGreater(r["dims"], 0)
        self.assertIn("embedder", r)

    # ── Phase 1: Golden Curve CRUD + scoring ─────────────────────────
    def test_phase1_register_score_list_delete(self):
        text = "insane speedrun world record glitchless any percent mario"
        r = self.rpc({"action": "register", "name": "speedrun-god", "text": text, "id": 2})
        self.assertEqual(r["status"], "ok")

        r = self.rpc({"action": "list", "id": 3})
        self.assertIn("speedrun-god", r["curves"])

        same = self.rpc({"action": "score", "curve": "speedrun-god", "text": text, "id": 4})
        self.assertEqual(same["status"], "ok")
        self.assertGreater(same["match_percentage"], 90)

        diff = self.rpc({"action": "score", "curve": "speedrun-god",
                         "text": "relaxing slow cooking pasta recipe tutorial", "id": 5})
        self.assertGreater(same["match_percentage"], diff["match_percentage"])

        r = self.rpc({"action": "delete", "name": "speedrun-god", "id": 6})
        self.assertEqual(r["status"], "ok")
        r = self.rpc({"action": "list", "id": 7})
        self.assertNotIn("speedrun-god", r["curves"])

    # ── Phase 2: gap analysis ────────────────────────────────────────
    def test_phase2_gaps(self):
        self.rpc({"action": "register", "name": "fps",
                  "text": "competitive fps aim training tips beginner friendly", "id": 10})
        r = self.rpc({"action": "analyze-gaps", "curve": "fps", "text": "aim training", "id": 11})
        self.assertEqual(r["status"], "ok")
        self.assertTrue(
            any(w in r["missing_clusters"] for w in ["competitive", "beginner", "friendly", "tips"]),
            f"expected gap concepts, got {r['missing_clusters']}",
        )

    # ── Phase 3: k-NN search + pack import/export ────────────────────
    def test_phase3_search_and_pack(self):
        self.rpc({"action": "register", "name": "mc",
                  "text": "minecraft survival hardcore base build", "id": 20})
        self.rpc({"action": "register", "name": "val",
                  "text": "valorant ranked grind radiant aim", "id": 21})

        r = self.rpc({"action": "search", "text": "minecraft hardcore base build", "k": 2, "id": 22})
        self.assertEqual(r["status"], "ok")
        self.assertEqual(r["results"][0]["name"], "mc")

        pack = os.path.join(self.tmp, "test.goldenpack")
        r = self.rpc({"action": "export-pack", "filename": pack, "id": 23})
        self.assertEqual(r["status"], "ok")
        self.assertTrue(os.path.exists(pack))

        self.rpc({"action": "delete", "name": "mc", "id": 24})
        self.rpc({"action": "delete", "name": "val", "id": 25})
        r = self.rpc({"action": "import-pack", "filename": pack, "id": 26})
        self.assertEqual(r["status"], "ok")
        r = self.rpc({"action": "list", "id": 27})
        self.assertIn("mc", r["curves"])


if __name__ == "__main__":
    unittest.main()
