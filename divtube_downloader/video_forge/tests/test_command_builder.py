import unittest

from video_forge.ffmpeg_command_builder import FfmpegCommandBuilder
from video_forge.schema import VideoProject, MediaItem, TimelineClip, EffectOp


class TestFfmpegCommandBuilder(unittest.TestCase):
    def setUp(self):
        self.builder = FfmpegCommandBuilder(ffmpeg_path="/usr/bin/ffmpeg")

    def _make_minimal_project(self):
        p = VideoProject(project_id="cb1", project_name="CmdBuilder Test")
        m = MediaItem(media_id="m1", file_path="/tmp/input.mp4", file_type="video",
                      duration_secs=60.0, width=1920, height=1080, fps=30.0,
                      audio_channels=2, file_hash="abc123", label="input.mp4")
        p.media_bin["m1"] = m
        c = TimelineClip(clip_id="c1", media_id="m1", track_index=0, timeline_index=0,
                         start_time=0.0, end_time=30.0, source_start=0.0, source_end=30.0)
        p.timeline.append(c)
        return p

    def test_build_returns_list(self):
        p = self._make_minimal_project()
        cmd = self.builder.build(p, "youtube_1080p_mp4", "/tmp/output.mp4")
        self.assertIsInstance(cmd, list)
        self.assertTrue(len(cmd) > 0)
        self.assertEqual(cmd[0], "/usr/bin/ffmpeg")

    def test_build_contains_input_output(self):
        p = self._make_minimal_project()
        cmd = self.builder.build(p, "youtube_1080p_mp4", "/tmp/out.mp4")
        cmd_str = " ".join(cmd)
        self.assertIn("/tmp/input.mp4", cmd_str)
        self.assertIn("/tmp/out.mp4", cmd_str)

    def test_build_has_filter_complex(self):
        p = self._make_minimal_project()
        cmd = self.builder.build(p, "youtube_1080p_mp4", "/tmp/out.mp4")
        cmd_str = " ".join(cmd)
        self.assertIn("-filter_complex", cmd_str)
        self.assertIn("concat", cmd_str)

    def test_build_with_preset_codecs(self):
        p = self._make_minimal_project()
        cmd = self.builder.build(p, "youtube_1080p_mp4", "/tmp/out.mp4")
        cmd_str = " ".join(cmd)
        self.assertIn("libx264", cmd_str)
        self.assertIn("aac", cmd_str)

    def test_build_audio_only(self):
        p = self._make_minimal_project()
        cmd = self.builder.build(p, "audio_mp3", "/tmp/out.mp3")
        cmd_str = " ".join(cmd)
        self.assertIn("libmp3lame", cmd_str)

    def test_build_unknown_preset_raises(self):
        p = self._make_minimal_project()
        from video_forge.errors import VideoForgeError
        with self.assertRaises(VideoForgeError) as ctx:
            self.builder.build(p, "nonexistent_preset", "/tmp/out.mp4")
        self.assertIn("PRESET_UNKNOWN", ctx.exception.code)

    def test_build_empty_timeline_raises(self):
        p = VideoProject(project_id="empty", project_name="Empty")
        from video_forge.errors import VideoForgeError
        with self.assertRaises(VideoForgeError) as ctx:
            self.builder.build(p, "youtube_1080p_mp4", "/tmp/out.mp4")
        self.assertIn("INVALID_TIMELINE", ctx.exception.code)

    def test_stable_argv_output(self):
        p = self._make_minimal_project()
        cmd1 = self.builder.build(p, "youtube_1080p_mp4", "/tmp/out1.mp4")
        cmd2 = self.builder.build(p, "youtube_1080p_mp4", "/tmp/out1.mp4")
        self.assertEqual(cmd1, cmd2)

    def test_build_includes_y_flag(self):
        p = self._make_minimal_project()
        cmd = self.builder.build(p, "youtube_1080p_mp4", "/tmp/out.mp4")
        self.assertIn("-y", cmd)

    def test_build_trim_respected(self):
        p = self._make_minimal_project()
        c = p.timeline[0]
        c.source_start = 5.0
        c.source_end = 20.0
        cmd = self.builder.build(p, "youtube_1080p_mp4", "/tmp/out.mp4")
        cmd_str = " ".join(cmd)
        self.assertIn("trim=start=5.0", cmd_str)

    def test_build_with_effect(self):
        p = self._make_minimal_project()
        c = p.timeline[0]
        c.effects.append(EffectOp(effect_name="grayscale"))
        cmd = self.builder.build(p, "youtube_1080p_mp4", "/tmp/out.mp4")
        cmd_str = " ".join(cmd)
        self.assertIn("colorchannelmixer", cmd_str)


if __name__ == "__main__":
    unittest.main()
