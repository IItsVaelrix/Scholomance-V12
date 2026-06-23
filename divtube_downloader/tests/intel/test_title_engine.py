import unittest
from intel.schema import VideoAnalysis, VideoOverview
from intel.engines.title_engine import run, MAX_RECOMMENDED, HARD_WARN, HOOK_WINDOW, KEYWORD_FRONTLOAD


class TestTitleEngine(unittest.TestCase):
    def _make_analysis(self, title):
        return VideoAnalysis(overview=VideoOverview(title=title))

    def test_short_title_no_length_warn(self):
        result = run(self._make_analysis("Short Title Here"))
        self.assertGreater(result.score, 0)
        codes = [f.code for f in result.flags]
        self.assertNotIn("TITLE_MOBILE_TRUNCATION", codes)

    def test_mobile_truncation_over_60(self):
        long_title = "A" * 65
        result = run(self._make_analysis(long_title))
        codes = [f.code for f in result.flags]
        self.assertIn("TITLE_MOBILE_TRUNCATION", codes)

    def test_no_truncation_under_50(self):
        result = run(self._make_analysis("Good Title Under Fifty Chars"))
        codes = [f.code for f in result.flags]
        self.assertNotIn("TITLE_MOBILE_TRUNCATION", codes)

    def test_hook_after_word_3(self):
        result = run(self._make_analysis("Boring plain title with no hook"))
        codes = [f.code for f in result.flags]
        self.assertIn("TITLE_HOOK_AFTER_WORD_3", codes)

    def test_hook_present_in_first_3_words(self):
        result = run(self._make_analysis("Why You Should Watch This"))
        codes = [f.code for f in result.flags]
        self.assertNotIn("TITLE_HOOK_AFTER_WORD_3", codes)

    def test_keyword_after_char_32(self):
        title = "a " * 20 + "Keyword"
        result = run(self._make_analysis(title))
        codes = [f.code for f in result.flags]
        self.assertIn("TITLE_KEYWORD_AFTER_CHAR_32", codes)

    def test_keyword_frontloaded(self):
        result = run(self._make_analysis("Scholomance Presents New Video"))
        self.assertEqual(result.metrics["keyword"], "Scholomance")
        self.assertLess(result.metrics["keywordPosition"], KEYWORD_FRONTLOAD)

    def test_empty_title_schema_warn(self):
        result = run(self._make_analysis(""))
        self.assertEqual(result.score, 0)
        codes = [f.code for f in result.flags]
        self.assertIn("YTSEO_INVALID_VIDEO_ANALYSIS_SCHEMA", codes)

    def test_curiosity_gap_detected(self):
        result = run(self._make_analysis("Why This Changes Everything"))
        self.assertTrue(result.metrics["hasCuriosity"])

    def test_no_curiosity_gap(self):
        result = run(self._make_analysis("Video Title Description"))
        self.assertFalse(result.metrics["hasCuriosity"])

    def test_score_range(self):
        result = run(self._make_analysis("Why Scholomance Changes Everything?"))
        self.assertGreaterEqual(result.score, 0)
        self.assertLessEqual(result.score, 100)


if __name__ == "__main__":
    unittest.main()
