import unittest
from intel.schema import VideoAnalysis, TagIntelligence, VideoOverview
from intel.engines.tag_engine import run, STUFFING_THRESHOLD


class TestTagEngine(unittest.TestCase):
    def _make_analysis(self, tags, title="Test Video"):
        return VideoAnalysis(
            overview=VideoOverview(title=title),
            tags=TagIntelligence(tags=tags, tag_count=len(tags), has_tags=bool(tags)),
        )

    def test_empty_tags(self):
        result = run(self._make_analysis([]))
        self.assertEqual(result.score, 0)
        codes = [f.code for f in result.flags]
        self.assertIn("TAG_CLUSTER_TOO_BROAD", codes)

    def test_duplicate_collapse(self):
        tags = ["rap", "Rap", "RAP", "hip hop"]
        result = run(self._make_analysis(tags))
        self.assertEqual(result.metrics["uniqueTags"], 2)

    def test_tight_tags_score_higher_than_random(self):
        tight = ["rap", "hip hop", "lyrical rap", "dark rap", "cinematic rap",
                 "Vaelrix", "Scholomance", "music video", "lyric visualizer"]
        random_tags = ["apple", "banana", "car", "dog", "elephant",
                       "frog", "guitar", "house", "igloo", "jacket"]
        tight_result = run(self._make_analysis(tight, "Vaelrix Rap Video"))
        random_result = run(self._make_analysis(random_tags, "Random Video"))
        self.assertGreater(tight_result.score, random_result.score)

    def test_stuffing_risk_over_threshold(self):
        tags = [f"tag{i}" for i in range(STUFFING_THRESHOLD + 10)]
        result = run(self._make_analysis(tags))
        codes = [f.code for f in result.flags]
        self.assertIn("TAG_STUFFING_RISK", codes)

    def test_identity_only_cluster_too_broad(self):
        tags = ["Vaelrix", "Scholomance", "PixelBrain"]
        result = run(self._make_analysis(tags))
        codes = [f.code for f in result.flags]
        self.assertIn("TAG_CLUSTER_TOO_BROAD", codes)

    def test_good_coverage_no_broad_flag(self):
        tags = [
            "Vaelrix", "Scholomance",
            "rap", "hip hop",
            "music video", "lyric video",
            "dark", "emotional",
            "remotion", "javascript",
            "new", "2026",
        ]
        result = run(self._make_analysis(tags, "Vaelrix Scholomance New Video"))
        codes = [f.code for f in result.flags]
        self.assertNotIn("TAG_CLUSTER_TOO_BROAD", codes)

    def test_score_range(self):
        result = run(self._make_analysis(["rap", "Vaelrix", "dark"]))
        self.assertGreaterEqual(result.score, 0)
        self.assertLessEqual(result.score, 100)

    def test_metrics_structure(self):
        result = run(self._make_analysis(["rap", "Vaelrix"]))
        self.assertIn("tagCount", result.metrics)
        self.assertIn("clusters", result.metrics)
        self.assertIn("coverage", result.metrics)
        self.assertIn("titleTagAlignment", result.metrics)


if __name__ == "__main__":
    unittest.main()
