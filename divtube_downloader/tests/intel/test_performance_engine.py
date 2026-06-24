import unittest
from intel.schema import VideoAnalysis, VideoTelemetry
from intel.engines.performance_engine import run


class TestPerformanceEngine(unittest.TestCase):
    def _make_analysis(self, view_count=1000, like_count=50, comment_count=10,
                       engagement_rate=6.0, views_per_day=100.0, performance_score="STABLE"):
        return VideoAnalysis(
            telemetry=VideoTelemetry(
                view_count=view_count,
                like_count=like_count,
                comment_count=comment_count,
                engagement_rate=engagement_rate,
                views_per_day=views_per_day,
                performance_score=performance_score,
            )
        )

    def test_weak_band_under_2_percent(self):
        result = run(self._make_analysis(engagement_rate=1.5))
        self.assertEqual(result.metrics["band"], "weak")
        codes = [f.code for f in result.flags]
        self.assertIn("PERFORMANCE_LOW_ENGAGEMENT", codes)

    def test_low_band_2_to_4(self):
        result = run(self._make_analysis(engagement_rate=3.0))
        self.assertEqual(result.metrics["band"], "low")

    def test_healthy_band_4_to_8(self):
        result = run(self._make_analysis(engagement_rate=6.0))
        self.assertEqual(result.metrics["band"], "healthy")

    def test_strong_band_8_to_15(self):
        result = run(self._make_analysis(engagement_rate=10.0))
        self.assertEqual(result.metrics["band"], "strong")

    def test_suspicious_band_over_15(self):
        result = run(self._make_analysis(engagement_rate=25.0, view_count=12))
        self.assertEqual(result.metrics["band"], "suspicious")
        codes = [f.code for f in result.flags]
        self.assertIn("PERFORMANCE_SUSPICIOUS_ENGAGEMENT", codes)

    def test_low_confidence_under_100_views(self):
        result = run(self._make_analysis(view_count=50))
        self.assertEqual(result.metrics["confidence"], "LOW")
        codes = [f.code for f in result.flags]
        self.assertIn("PERFORMANCE_LOW_SAMPLE_CONFIDENCE", codes)

    def test_med_confidence_100_to_1000(self):
        result = run(self._make_analysis(view_count=500))
        self.assertEqual(result.metrics["confidence"], "MED")

    def test_high_confidence_over_1000(self):
        result = run(self._make_analysis(view_count=5000))
        self.assertEqual(result.metrics["confidence"], "HIGH")

    def test_low_confidence_penalizes_score(self):
        high_conf = run(self._make_analysis(view_count=5000, engagement_rate=6.0))
        low_conf = run(self._make_analysis(view_count=50, engagement_rate=6.0))
        self.assertGreater(high_conf.score, low_conf.score)

    def test_views_per_day_guard(self):
        result = run(self._make_analysis(view_count=100, views_per_day=200.0))
        self.assertGreaterEqual(result.metrics["estimatedDays"], 1.0)

    def test_missing_counts_degrade_gracefully(self):
        result = run(self._make_analysis(view_count=0, like_count=0,
                                         comment_count=0, engagement_rate=0.0,
                                         views_per_day=0.0))
        self.assertIsNotNone(result.score)
        self.assertEqual(result.metrics["band"], "weak")

    def test_score_range(self):
        result = run(self._make_analysis())
        self.assertGreaterEqual(result.score, 0)
        self.assertLessEqual(result.score, 100)

    def test_vaelrix_reference_case(self):
        result = run(self._make_analysis(
            view_count=12, like_count=3, comment_count=0,
            engagement_rate=25.0, views_per_day=2.0, performance_score="LOW"
        ))
        self.assertEqual(result.metrics["band"], "suspicious")
        self.assertEqual(result.metrics["confidence"], "LOW")


if __name__ == "__main__":
    unittest.main()
