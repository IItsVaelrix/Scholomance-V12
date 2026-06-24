import unittest

from video_forge.text_cards import PIXELBRAIN_PRESETS, resolve_preset


class TestTextCards(unittest.TestCase):
    def test_all_presets_have_required_fields(self):
        required = {"label", "font_size", "font_color", "shadow", "outline", "bg_color"}
        for name, p in PIXELBRAIN_PRESETS.items():
            for field in required:
                self.assertIn(field, p, f"Preset '{name}' missing field '{field}'")

    def test_resolve_preset_known(self):
        card = resolve_preset("void_crystal", "Hello World", 5.0)
        self.assertEqual(card.text, "Hello World")
        self.assertEqual(card.style, "void_crystal")
        self.assertEqual(card.duration_secs, 5.0)

    def test_resolve_preset_unknown_falls_back(self):
        card = resolve_preset("nonexistent_preset", "Test", 3.0)
        self.assertEqual(card.style, "nonexistent_preset")

    def test_preset_count(self):
        self.assertGreaterEqual(len(PIXELBRAIN_PRESETS), 6)


if __name__ == "__main__":
    unittest.main()
