import unittest

from video_forge.effects import EFFECTS


class TestEffects(unittest.TestCase):
    def test_all_effects_have_required_fields(self):
        required = {"label", "filter", "params", "description"}
        for name, e in EFFECTS.items():
            for field in required:
                self.assertIn(field, e, f"Effect '{name}' missing field '{field}'")

    def test_grayscale_has_no_params(self):
        self.assertEqual(EFFECTS["grayscale"]["params"], {})

    def test_brightness_has_value_param(self):
        params = EFFECTS["brightness"]["params"]
        self.assertIn("value", params)

    def test_effect_count(self):
        self.assertGreaterEqual(len(EFFECTS), 17)

    def test_all_effects_have_filter_strings(self):
        for name, e in EFFECTS.items():
            self.assertIsInstance(e["filter"], str)
            self.assertTrue(len(e["filter"]) > 0, f"Effect '{name}' has empty filter")


if __name__ == "__main__":
    unittest.main()
