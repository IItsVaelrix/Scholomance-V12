import unittest

from video_forge.errors import get_error, VideoForgeError, ERRORS


class TestErrors(unittest.TestCase):
    def test_known_error_returns_correct_code(self):
        err = get_error("VIDEOFORGE_FFMPEG_NOT_FOUND")
        self.assertEqual(err.code, "VIDEOFORGE_FFMPEG_NOT_FOUND")

    def test_known_error_has_friendly_message(self):
        err = get_error("VIDEOFORGE_FFMPEG_NOT_FOUND")
        self.assertTrue(len(err.user_message) > 0)

    def test_known_error_has_severity(self):
        err = get_error("VIDEOFORGE_RENDER_FAILED")
        self.assertIn(err.severity, ["FATAL", "ERROR", "WARN", "INFO"])

    def test_unknown_error_returns_default(self):
        err = get_error("VIDEOFORGE_NONEXISTENT_ERROR")
        self.assertEqual(err.code, "VIDEOFORGE_NONEXISTENT_ERROR")
        self.assertIn("unknown", err.developer_diagnostic.lower())

    def test_error_is_exception(self):
        err = get_error("VIDEOFORGE_MISSING_SOURCE_FILE")
        self.assertIsInstance(err, Exception)
        self.assertIsInstance(err, VideoForgeError)

    def test_error_count(self):
        self.assertGreaterEqual(len(ERRORS), 12)


if __name__ == "__main__":
    unittest.main()
