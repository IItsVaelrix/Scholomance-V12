import unittest

from video_forge.schema import (
    VideoProject, MediaItem, TimelineClip, EffectOp, TransitionOp,
    AudioTrackOp, TextOverlayOp, RenderLedger,
    compute_project_recipe_hash, validate_timeline, to_dict, from_dict,
    project_to_json, project_from_json,
)


class TestSchema(unittest.TestCase):
    def test_create_project(self):
        p = VideoProject(project_id="test123", project_name="Test Project")
        self.assertEqual(p.project_id, "test123")
        self.assertEqual(p.project_name, "Test Project")
        self.assertEqual(len(p.timeline), 0)
        self.assertEqual(len(p.media_bin), 0)

    def test_add_media_item(self):
        p = VideoProject(project_id="p1", project_name="P1")
        m = MediaItem(
            media_id="m1", file_path="/tmp/test.mp4", file_type="video",
            duration_secs=60.0, width=1920, height=1080, fps=30.0,
            audio_channels=2, file_hash="abc123", label="test.mp4",
        )
        p.media_bin["m1"] = m
        self.assertEqual(len(p.media_bin), 1)
        self.assertEqual(p.media_bin["m1"].width, 1920)

    def test_add_timeline_clip(self):
        p = VideoProject(project_id="p1", project_name="P1")
        c = TimelineClip(
            clip_id="c1", media_id="m1", track_index=0, timeline_index=0,
            start_time=0.0, end_time=30.0, source_start=0.0, source_end=30.0,
        )
        p.timeline.append(c)
        self.assertEqual(len(p.timeline), 1)
        self.assertEqual(p.timeline[0].clip_id, "c1")

    def test_validate_timeline_empty(self):
        errors = validate_timeline([])
        self.assertTrue(len(errors) > 0)
        self.assertIn("empty", errors[0].lower())

    def test_validate_timeline_duplicate_id(self):
        c1 = TimelineClip(clip_id="c1", media_id="m1", track_index=0, timeline_index=0,
                          start_time=0, end_time=10, source_start=0, source_end=10)
        c2 = TimelineClip(clip_id="c1", media_id="m2", track_index=0, timeline_index=1,
                          start_time=0, end_time=10, source_start=0, source_end=10)
        errors = validate_timeline([c1, c2])
        self.assertTrue(any("duplicate" in e.lower() for e in errors))

    def test_validate_timeline_invalid_range(self):
        c = TimelineClip(clip_id="c1", media_id="m1", track_index=0, timeline_index=0,
                         start_time=10, end_time=5, source_start=0, source_end=10)
        errors = validate_timeline([c])
        self.assertTrue(any("start_time" in e.lower() for e in errors))

    def test_validate_timeline_ok(self):
        c = TimelineClip(clip_id="c1", media_id="m1", track_index=0, timeline_index=0,
                         start_time=0, end_time=10, source_start=0, source_end=10)
        errors = validate_timeline([c])
        self.assertEqual(len(errors), 0)

    def test_recipe_hash_deterministic(self):
        p1 = VideoProject(project_id="p1", project_name="Test")
        p2 = VideoProject(project_id="p2", project_name="Test")
        m = MediaItem(media_id="m1", file_path="/x.mp4", file_type="video",
                      duration_secs=60, width=1920, height=1080, fps=30,
                      audio_channels=2, file_hash="abc", label="x.mp4")
        p1.media_bin["m1"] = m
        p2.media_bin["m1"] = m
        c = TimelineClip(clip_id="c1", media_id="m1", track_index=0, timeline_index=0,
                         start_time=0, end_time=30, source_start=0, source_end=30)
        p1.timeline.append(c)
        p2.timeline.append(c)
        h1 = compute_project_recipe_hash(p1)
        h2 = compute_project_recipe_hash(p2)
        self.assertEqual(h1, h2)

    def test_to_dict_roundtrip(self):
        p = VideoProject(project_id="rt", project_name="RoundTrip")
        m = MediaItem(media_id="m1", file_path="/v.mp4", file_type="video",
                      duration_secs=60, width=1920, height=1080, fps=30,
                      audio_channels=2, file_hash="def", label="v.mp4")
        p.media_bin["m1"] = m
        c = TimelineClip(clip_id="c1", media_id="m1", track_index=0, timeline_index=0,
                         start_time=0, end_time=30, source_start=0, source_end=30)
        p.timeline.append(c)
        t = TransitionOp(from_clip_id="c0", to_clip_id="c1", transition_type="crossfade", duration_secs=1.0)
        p.transitions.append(t)
        tx = TextOverlayOp(clip_id="c1", text="Hello", style_preset="void_crystal",
                           duration_secs=5.0, position="center", overlay_type="title")
        p.text_overlays.append(tx)
        a = AudioTrackOp(track_id="t1", file_path="/m.wav", volume=0.5,
                         track_type="music", fade_in_secs=1.0, fade_out_secs=2.0)
        p.audio_tracks.append(a)
        p.last_render_ledger = RenderLedger(
            render_id="r1", preset="youtube_1080p_mp4",
            ffmpeg_command=["ffmpeg", "-y", "-i", "in.mp4", "out.mp4"],
            ffmpeg_version="6.0", output_path="/out.mp4", status="completed",
        )
        d = to_dict(p)
        p2 = from_dict(d)
        self.assertEqual(p2.project_id, "rt")
        self.assertEqual(p2.project_name, "RoundTrip")
        self.assertEqual(len(p2.media_bin), 1)
        self.assertEqual(len(p2.timeline), 1)
        self.assertEqual(len(p2.transitions), 1)
        self.assertEqual(len(p2.text_overlays), 1)
        self.assertEqual(len(p2.audio_tracks), 1)
        self.assertIsNotNone(p2.last_render_ledger)
        self.assertEqual(p2.last_render_ledger.status, "completed")

    def test_json_roundtrip(self):
        p = VideoProject(project_id="j1", project_name="JSON Test")
        m = MediaItem(media_id="m1", file_path="/v.mp4", file_type="video",
                      duration_secs=60, width=1920, height=1080, fps=30,
                      audio_channels=2, file_hash="xyz", label="v.mp4")
        p.media_bin["m1"] = m
        c = TimelineClip(clip_id="c1", media_id="m1", track_index=0, timeline_index=0,
                         start_time=0, end_time=15, source_start=0, source_end=15)
        p.timeline.append(c)
        text = project_to_json(p)
        p2 = project_from_json(text)
        self.assertEqual(p2.project_id, "j1")
        self.assertEqual(len(p2.media_bin), 1)
        self.assertEqual(len(p2.timeline), 1)

    def test_timeline_duration(self):
        from video_forge.schema import timeline_duration
        c1 = TimelineClip(clip_id="c1", media_id="m1", track_index=0, timeline_index=0,
                          start_time=0, end_time=10, source_start=0, source_end=10)
        c2 = TimelineClip(clip_id="c2", media_id="m2", track_index=0, timeline_index=1,
                          start_time=0, end_time=20, source_start=0, source_end=20)
        self.assertEqual(timeline_duration([c1, c2]), 20.0)
        self.assertEqual(timeline_duration([]), 0.0)

    def test_clip_with_effects(self):
        c = TimelineClip(clip_id="c1", media_id="m1", track_index=0, timeline_index=0,
                         start_time=0, end_time=10, source_start=0, source_end=10)
        c.effects.append(EffectOp(effect_name="grayscale"))
        c.effects.append(EffectOp(effect_name="brightness", params={"value": 0.2}))
        self.assertEqual(len(c.effects), 2)
        self.assertEqual(c.effects[0].effect_name, "grayscale")
        self.assertEqual(c.effects[1].params["value"], 0.2)


if __name__ == "__main__":
    unittest.main()
