import unittest
from intel.schema import VideoAnalysis, VideoOverview
from intel.engines.thumbnail_engine import run
from tests.intel.fixtures.generator import (
    make_high_contrast_png, make_noisy_png, make_text_heavy_png, make_blank_png,
)


class TestThumbnailEngine(unittest.TestCase):
    def test_none_bytes_returns_null_score(self):
        analysis = VideoAnalysis()
        result = run(analysis, None)
        self.assertIsNone(result.score)
        codes = [f.code for f in result.flags]
        self.assertIn("YTSEO_THUMBNAIL_FETCH_FAILED", codes)

    def test_invalid_bytes_returns_null_score(self):
        analysis = VideoAnalysis()
        result = run(analysis, b"not an image")
        self.assertIsNone(result.score)

    def test_high_contrast_scores_above_50(self):
        analysis = VideoAnalysis()
        png = make_high_contrast_png()
        result = run(analysis, png)
        self.assertIsNotNone(result.score)
        self.assertGreater(result.score, 50)

    def test_noisy_scores_lower_than_high_contrast(self):
        analysis = VideoAnalysis()
        hc_result = run(analysis, make_high_contrast_png())
        noisy_result = run(analysis, make_noisy_png())
        self.assertGreater(hc_result.score, noisy_result.score)

    def test_blank_stable_failure(self):
        analysis = VideoAnalysis()
        png = make_blank_png()
        result1 = run(analysis, png)
        result2 = run(analysis, png)
        self.assertEqual(result1.score, result2.score)
        self.assertEqual(result1.metrics, result2.metrics)

    def test_same_fixture_same_score_determinism(self):
        analysis = VideoAnalysis()
        png = make_high_contrast_png()
        result1 = run(analysis, png)
        result2 = run(analysis, png)
        self.assertEqual(result1.score, result2.score)
        self.assertEqual(result1.flags[0].code if result1.flags else None,
                         result2.flags[0].code if result2.flags else None)

    def test_text_heavy_flags(self):
        analysis = VideoAnalysis()
        png = make_text_heavy_png()
        result = run(analysis, png)
        self.assertIsNotNone(result.score)

    def test_score_range(self):
        analysis = VideoAnalysis()
        png = make_high_contrast_png()
        result = run(analysis, png)
        self.assertGreaterEqual(result.score, 0)
        self.assertLessEqual(result.score, 100)

    def test_metrics_structure(self):
        analysis = VideoAnalysis()
        png = make_high_contrast_png()
        result = run(analysis, png)
        self.assertIn("componentCount", result.metrics)
        self.assertIn("silhouette", result.metrics)
        self.assertIn("focalDominance", result.metrics)
        self.assertIn("contrast", result.metrics)
        self.assertIn("cropSafety", result.metrics)
        self.assertIn("colorSeparation", result.metrics)
        self.assertIn("otsuThreshold", result.metrics)


if __name__ == "__main__":
    unittest.main()
