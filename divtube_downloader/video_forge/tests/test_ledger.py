import unittest
import tempfile
import os
import json

from video_forge.project_store import ProjectStore
from video_forge.ledger import LedgerViewer
from video_forge.schema import VideoProject, MediaItem, TimelineClip, RenderLedger


class TestLedger(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.store = ProjectStore(base_dir=self.tmpdir)
        self.viewer = LedgerViewer(self.store)

    def _create_project_with_render_ledger(self):
        p = VideoProject(project_id="ledger1", project_name="Ledger Test")
        m = MediaItem(media_id="m1", file_path="/tmp/in.mp4", file_type="video",
                      duration_secs=60, width=1920, height=1080, fps=30,
                      audio_channels=2, file_hash="abc", label="in.mp4")
        p.media_bin["m1"] = m
        c = TimelineClip(clip_id="c1", media_id="m1", track_index=0, timeline_index=0,
                         start_time=0, end_time=30, source_start=0, source_end=30)
        p.timeline.append(c)
        p.last_render_ledger = RenderLedger(
            render_id="r1", preset="youtube_1080p_mp4",
            ffmpeg_command=["ffmpeg", "-i", "in.mp4", "out.mp4"],
            ffmpeg_version="6.0", output_path="/tmp/out.mp4", status="completed",
        )
        return p

    def test_list_renders_empty(self):
        p = VideoProject(project_id="norender", project_name="No Renders")
        self.store.save(p)
        self.assertEqual(self.viewer.list_renders("norender"), [])

    def test_list_renders_with_manual_ledger(self):
        p = self._create_project_with_render_ledger()
        self.store.save(p)
        renders_dir = os.path.join(self.tmpdir, "ledger1", "renders", "r1")
        os.makedirs(renders_dir, exist_ok=True)
        with open(os.path.join(renders_dir, "render-ledger.json"), "w") as f:
            json.dump({"renderId": "r1", "status": "completed"}, f)
        renders = self.viewer.list_renders("ledger1")
        self.assertEqual(len(renders), 1)

    def test_get_render_missing_raises(self):
        p = VideoProject(project_id="missingr", project_name="Missing Render")
        self.store.save(p)
        with self.assertRaises(FileNotFoundError):
            self.viewer.get_render("missingr", "does_not_exist")

    def test_format_ledger_summary_empty(self):
        p = VideoProject(project_id="empty", project_name="Empty")
        self.store.save(p)
        summary = self.viewer.format_ledger_summary("empty")
        self.assertIn("No renders yet", summary)

    def test_ledger_contains_expected_fields(self):
        p = self._create_project_with_render_ledger()
        self.store.save(p)
        # Manually write a render ledger file
        renders_dir = os.path.join(self.tmpdir, "ledger1", "renders", "r1")
        os.makedirs(renders_dir, exist_ok=True)
        ledger_data = {
            "renderId": "r1", "preset": "youtube_1080p_mp4",
            "ffmpegCommand": ["ffmpeg", "-i", "in.mp4", "out.mp4"],
            "ffmpegVersion": "6.0", "outputPath": "/tmp/out.mp4",
            "status": "completed", "errors": [], "warnings": [],
        }
        with open(os.path.join(renders_dir, "render-ledger.json"), "w") as f:
            json.dump(ledger_data, f)
        renders = self.viewer.list_renders("ledger1")
        self.assertEqual(len(renders), 1)
        self.assertEqual(renders[0]["status"], "completed")


if __name__ == "__main__":
    unittest.main()
