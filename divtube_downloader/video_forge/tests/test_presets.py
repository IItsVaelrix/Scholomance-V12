import unittest

from video_forge.presets import PRESETS


class TestPresets(unittest.TestCase):
    def test_all_presets_have_required_fields(self):
        required = {"label", "extension"}
        for name, p in PRESETS.items():
            for field in required:
                self.assertIn(field, p, f"Preset '{name}' missing field '{field}'")

    def test_video_presets_have_codecs(self):
        for name, p in PRESETS.items():
            audio_only = p.get("audio_only", False)
            if not audio_only:
                self.assertIn("video_codec", p, f"Preset '{name}' missing video_codec")
            self.assertIn("audio_codec", p, f"Preset '{name}' missing audio_codec")

    def test_youtube_1080p_has_correct_resolution(self):
        p = PRESETS["youtube_1080p_mp4"]
        self.assertEqual(p["width"], 1920)
        self.assertEqual(p["height"], 1080)

    def test_shorts_preset_is_portrait(self):
        p = PRESETS["shorts_1080x1920"]
        self.assertEqual(p["width"], 1080)
        self.assertEqual(p["height"], 1920)

    def test_audio_only_presets(self):
        for name in ["audio_wav", "audio_mp3"]:
            p = PRESETS[name]
            self.assertTrue(p.get("audio_only", False))
            self.assertIsNone(p.get("video_codec"))

    def test_preset_count(self):
        self.assertGreaterEqual(len(PRESETS), 10)


if __name__ == "__main__":
    unittest.main()
