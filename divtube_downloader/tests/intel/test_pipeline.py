import unittest
import json
import os
import tempfile
from intel.schema import (
    VideoAnalysis, VideoOverview, TagIntelligence, VideoTelemetry,
    ChannelSnapshot, CommentPulse, load_analysis_from_json,
)
from intel.pipeline import run_critique
from intel.references import load_all_references
from tests.intel.fixtures.generator import make_high_contrast_png, make_blank_png


def _make_full_analysis():
    return VideoAnalysis(
        overview=VideoOverview(
            video_id="TEST001",
            title="Why Scholomance Changes Everything About AI",
            channel_title="TestChannel",
            thumbnail="https://example.com/thumb.jpg",
        ),
        tags=TagIntelligence(
            tags=["Scholomance", "AI", "rap", "dark", "remotion", "new", "2026"],
            tag_count=7,
            has_tags=True,
        ),
        telemetry=VideoTelemetry(
            view_count=5000,
            like_count=250,
            comment_count=50,
            engagement_rate=6.0,
            views_per_day=500.0,
            performance_score="STABLE",
        ),
        channel=ChannelSnapshot(title="TestChannel", subscriber_count=1000),
        comments=CommentPulse(general_sentiment="POSITIVE"),
    )


class TestPipeline(unittest.TestCase):
    def test_run_critique_returns_result(self):
        analysis = _make_full_analysis()
        result = run_critique(analysis, make_high_contrast_png())
        self.assertIsNotNone(result)
        self.assertEqual(result.video_id, "TEST001")
        self.assertIsNotNone(result.overall_score)

    def test_scores_present(self):
        analysis = _make_full_analysis()
        result = run_critique(analysis, make_high_contrast_png())
        self.assertIn("thumbnail", result.scores)
        self.assertIn("title", result.scores)
        self.assertIn("tag", result.scores)
        self.assertIn("performance", result.scores)
        self.assertIn("overall", result.scores)
        self.assertIn("replicationValue", result.scores)

    def test_determinism_identical_ledger(self):
        analysis = _make_full_analysis()
        png = make_high_contrast_png()
        result1 = run_critique(analysis, png)
        result2 = run_critique(analysis, png)

        dict1 = result1.to_dict()
        dict2 = result2.to_dict()

        self.assertEqual(dict1["scores"], dict2["scores"])
        self.assertEqual(dict1["overallScore"], dict2["overallScore"])

        flags1 = [(f["severity"], f["code"]) for f in dict1["flags"]]
        flags2 = [(f["severity"], f["code"]) for f in dict2["flags"]]
        self.assertEqual(flags1, flags2)

    def test_determinism_without_thumbnail(self):
        analysis = _make_full_analysis()
        result1 = run_critique(analysis, None)
        result2 = run_critique(analysis, None)
        self.assertEqual(result1.scores, result2.scores)

    def test_no_thumbnail_graceful(self):
        analysis = _make_full_analysis()
        result = run_critique(analysis, None)
        self.assertIsNone(result.scores.get("thumbnail"))
        codes = [f.code for f in result.flags]
        self.assertIn("YTSEO_THUMBNAIL_FETCH_FAILED", codes)

    def test_empty_analysis_graceful(self):
        analysis = VideoAnalysis()
        result = run_critique(analysis, None)
        self.assertIsNotNone(result)
        self.assertIsNotNone(result.overall_score)

    def test_ledger_dict_structure(self):
        analysis = _make_full_analysis()
        result = run_critique(analysis, make_high_contrast_png())
        d = result.to_dict()
        self.assertIn("analysisRunId", d)
        self.assertIn("videoId", d)
        self.assertIn("overallScore", d)
        self.assertIn("scores", d)
        self.assertIn("flags", d)
        self.assertIn("metrics", d)
        self.assertIn("determinism", d)
        self.assertIn("schemaVersion", d["determinism"])
        self.assertIn("scoringVersion", d["determinism"])

    def test_ledger_json_serializable(self):
        analysis = _make_full_analysis()
        result = run_critique(analysis, make_high_contrast_png())
        d = result.to_dict()
        serialized = json.dumps(d)
        self.assertIsInstance(serialized, str)
        reparsed = json.loads(serialized)
        self.assertEqual(d["overallScore"], reparsed["overallScore"])

    def test_load_real_analysis_and_critique(self):
        data = {
            "overview": {
                "videoId": "DQY-tRnHGCU",
                "title": "Scholomance/PixelBrain Presents: Vaelrix - Polarity - Remotion Lyric Visualizer",
                "channelTitle": "Vaelrix",
                "channelId": "UC123",
                "publishDate": "2026-06-16T10:26:17Z",
                "descriptionPreview": "Test",
                "thumbnail": "https://i.ytimg.com/vi/DQY-tRnHGCU/hqdefault.jpg",
                "duration": "PT4M35S",
                "categoryId": "10",
                "defaultLanguage": "en",
            },
            "tags": {
                "tags": ["Polarity", "Vaelrix", "lyrical rap", "dark rap", "cinematic rap"],
                "tagCount": 5,
                "hasTags": True,
            },
            "telemetry": {
                "viewCount": 12, "likeCount": 3, "commentCount": 0,
                "engagementRate": 25.0, "viewsPerDay": 2.0, "performanceScore": "LOW",
            },
            "channel": {"title": "Vaelrix", "subscriberCount": 25, "totalViewCount": 2128, "videoCount": 19},
            "comments": {"topComments": [], "generalSentiment": "NEUTRAL"},
        }

        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            json.dump(data, f)
            f.flush()
            path = f.name

        try:
            analysis = load_analysis_from_json(path)
            result = run_critique(analysis, None)
            self.assertEqual(result.video_id, "DQY-tRnHGCU")
            self.assertIsNotNone(result.overall_score)
            self.assertEqual(result.scores["performance"], result.scores["performance"])
        finally:
            os.unlink(path)


if __name__ == "__main__":
    unittest.main()
