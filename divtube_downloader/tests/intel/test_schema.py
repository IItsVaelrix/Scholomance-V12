import unittest
from intel.schema import (
    load_analysis_from_json, SeoCritiqueResult, Flag, DeterminismInfo,
    SCHEMA_VERSION, SCORING_VERSION, RULESET_VERSION,
)
import json
import os
import tempfile


class TestSchema(unittest.TestCase):
    def test_version_constants(self):
        self.assertEqual(SCHEMA_VERSION, "YT-SEO-CRITIQUE-v1")
        self.assertEqual(SCORING_VERSION, "2026.06.22")
        self.assertEqual(RULESET_VERSION, "seo-library-v1")

    def test_flag_to_dict(self):
        f = Flag("WARN", "TEST_CODE", "test message")
        d = f.to_dict()
        self.assertEqual(d["severity"], "WARN")
        self.assertEqual(d["code"], "TEST_CODE")
        self.assertEqual(d["message"], "test message")

    def test_determinism_info_to_dict(self):
        d = DeterminismInfo("v1", "lib-v1", "2026.06.22")
        result = d.to_dict()
        self.assertEqual(result["schemaVersion"], "v1")
        self.assertEqual(result["rulesetVersion"], "lib-v1")
        self.assertEqual(result["scoringVersion"], "2026.06.22")

    def test_seo_critique_result_to_dict(self):
        result = SeoCritiqueResult(
            analysis_run_id="YT-INTEL-TEST",
            video_id="TEST123",
            overall_score=65,
            scores={"thumbnail": 70, "title": 60, "tag": 55, "performance": 75},
            flags=[Flag("WARN", "TEST", "msg")],
            metrics={"thumbnail": {"silhouette": 0.8}},
            determinism=DeterminismInfo(SCHEMA_VERSION, RULESET_VERSION, SCORING_VERSION),
        )
        d = result.to_dict()
        self.assertEqual(d["analysisRunId"], "YT-INTEL-TEST")
        self.assertEqual(d["videoId"], "TEST123")
        self.assertEqual(d["overallScore"], 65)
        self.assertEqual(len(d["flags"]), 1)
        self.assertEqual(d["determinism"]["schemaVersion"], SCHEMA_VERSION)

    def test_load_analysis_from_json(self):
        data = {
            "overview": {
                "videoId": "test123",
                "title": "Test Title",
                "channelTitle": "TestChannel",
                "channelId": "UC123",
                "publishDate": "2026-01-01T00:00:00Z",
                "descriptionPreview": "A test",
                "thumbnail": "https://example.com/thumb.jpg",
                "duration": "PT5M",
                "categoryId": "10",
                "defaultLanguage": "en",
            },
            "tags": {"tags": ["test", "video"], "tagCount": 2, "hasTags": True},
            "telemetry": {
                "viewCount": 1000, "likeCount": 50, "commentCount": 10,
                "engagementRate": 6.0, "viewsPerDay": 100.0, "performanceScore": "STABLE",
            },
            "channel": {
                "title": "TestChannel", "subscriberCount": 500,
                "totalViewCount": 50000, "videoCount": 20,
            },
            "comments": {"topComments": [], "generalSentiment": "NEUTRAL"},
        }

        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            json.dump(data, f)
            f.flush()
            path = f.name

        try:
            analysis = load_analysis_from_json(path)
            self.assertEqual(analysis.overview.video_id, "test123")
            self.assertEqual(analysis.overview.title, "Test Title")
            self.assertEqual(analysis.tags.tag_count, 2)
            self.assertTrue(analysis.tags.has_tags)
            self.assertEqual(analysis.telemetry.view_count, 1000)
            self.assertEqual(analysis.telemetry.engagement_rate, 6.0)
            self.assertEqual(analysis.channel.subscriber_count, 500)
            self.assertEqual(analysis.comments.general_sentiment, "NEUTRAL")
        finally:
            os.unlink(path)

    def test_load_analysis_missing_fields(self):
        data = {"overview": {"videoId": "x"}, "tags": {}, "telemetry": {}, "channel": {}, "comments": {}}
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            json.dump(data, f)
            f.flush()
            path = f.name

        try:
            analysis = load_analysis_from_json(path)
            self.assertEqual(analysis.overview.video_id, "x")
            self.assertEqual(analysis.overview.title, "")
            self.assertEqual(analysis.telemetry.view_count, 0)
        finally:
            os.unlink(path)


if __name__ == "__main__":
    unittest.main()
