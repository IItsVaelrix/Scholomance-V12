import unittest

from video_forge.transitions import TRANSITIONS


class TestTransitions(unittest.TestCase):
    def test_all_transitions_have_required_fields(self):
        required = {"label", "ffmpeg", "description"}
        for name, t in TRANSITIONS.items():
            for field in required:
                self.assertIn(field, t, f"Transition '{name}' missing field '{field}'")

    def test_cut_has_null_ffmpeg(self):
        self.assertIsNone(TRANSITIONS["cut"]["ffmpeg"])

    def test_crossfade_has_xfade_filter(self):
        self.assertIn("xfade", TRANSITIONS["crossfade"]["ffmpeg"])

    def test_transition_count(self):
        self.assertGreaterEqual(len(TRANSITIONS), 10)


if __name__ == "__main__":
    unittest.main()
