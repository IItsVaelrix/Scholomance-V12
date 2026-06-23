from dataclasses import dataclass, field
from typing import Optional, Any
import json

SCHEMA_VERSION = "YT-SEO-CRITIQUE-v1"
SCORING_VERSION = "2026.06.22"
RULESET_VERSION = "seo-library-v1"


@dataclass
class Flag:
    severity: str
    code: str
    message: str

    def to_dict(self):
        return {"severity": self.severity, "code": self.code, "message": self.message}


@dataclass
class EngineResult:
    score: Optional[int]
    metrics: dict
    flags: list


@dataclass
class DeterminismInfo:
    schema_version: str
    ruleset_version: str
    scoring_version: str

    def to_dict(self):
        return {
            "schemaVersion": self.schema_version,
            "rulesetVersion": self.ruleset_version,
            "scoringVersion": self.scoring_version,
        }


@dataclass
class SeoCritiqueResult:
    analysis_run_id: str
    video_id: str
    overall_score: int
    scores: dict
    flags: list
    metrics: dict
    determinism: DeterminismInfo

    def to_dict(self):
        return {
            "analysisRunId": self.analysis_run_id,
            "videoId": self.video_id,
            "overallScore": self.overall_score,
            "scores": self.scores,
            "flags": [f.to_dict() if hasattr(f, "to_dict") else f for f in self.flags],
            "metrics": self.metrics,
            "determinism": self.determinism.to_dict(),
        }


@dataclass
class VideoOverview:
    video_id: str = ""
    title: str = ""
    channel_title: str = ""
    channel_id: str = ""
    publish_date: str = ""
    description_preview: str = ""
    thumbnail: str = ""
    duration: str = ""
    category_id: str = ""
    default_language: str = ""


@dataclass
class TagIntelligence:
    tags: list = field(default_factory=list)
    tag_count: int = 0
    has_tags: bool = False


@dataclass
class VideoTelemetry:
    view_count: int = 0
    like_count: int = 0
    comment_count: int = 0
    engagement_rate: float = 0.0
    views_per_day: float = 0.0
    performance_score: str = ""


@dataclass
class ChannelSnapshot:
    title: str = ""
    subscriber_count: int = 0
    total_view_count: int = 0
    video_count: int = 0


@dataclass
class Comment:
    author: str = ""
    text: str = ""
    like_count: int = 0
    sentiment: str = ""


@dataclass
class CommentPulse:
    top_comments: list = field(default_factory=list)
    general_sentiment: str = ""


@dataclass
class VideoAnalysis:
    overview: VideoOverview = field(default_factory=VideoOverview)
    tags: TagIntelligence = field(default_factory=TagIntelligence)
    telemetry: VideoTelemetry = field(default_factory=VideoTelemetry)
    channel: ChannelSnapshot = field(default_factory=ChannelSnapshot)
    comments: CommentPulse = field(default_factory=CommentPulse)


def load_analysis_from_json(filepath: str) -> VideoAnalysis:
    with open(filepath, "r") as f:
        data = json.load(f)

    overview_data = data.get("overview", {})
    overview = VideoOverview(
        video_id=overview_data.get("videoId", ""),
        title=overview_data.get("title", ""),
        channel_title=overview_data.get("channelTitle", ""),
        channel_id=overview_data.get("channelId", ""),
        publish_date=overview_data.get("publishDate", ""),
        description_preview=overview_data.get("descriptionPreview", ""),
        thumbnail=overview_data.get("thumbnail", ""),
        duration=overview_data.get("duration", ""),
        category_id=overview_data.get("categoryId", ""),
        default_language=overview_data.get("defaultLanguage", ""),
    )

    tags_data = data.get("tags", {})
    tags = TagIntelligence(
        tags=tags_data.get("tags", []),
        tag_count=tags_data.get("tagCount", 0),
        has_tags=tags_data.get("hasTags", False),
    )

    telemetry_data = data.get("telemetry", {})
    telemetry = VideoTelemetry(
        view_count=telemetry_data.get("viewCount", 0),
        like_count=telemetry_data.get("likeCount", 0),
        comment_count=telemetry_data.get("commentCount", 0),
        engagement_rate=telemetry_data.get("engagementRate", 0.0),
        views_per_day=telemetry_data.get("viewsPerDay", 0.0),
        performance_score=telemetry_data.get("performanceScore", ""),
    )

    channel_data = data.get("channel", {})
    channel = ChannelSnapshot(
        title=channel_data.get("title", ""),
        subscriber_count=channel_data.get("subscriberCount", 0),
        total_view_count=channel_data.get("totalViewCount", 0),
        video_count=channel_data.get("videoCount", 0),
    )

    comments_data = data.get("comments", {})
    comments = CommentPulse(
        top_comments=[
            Comment(
                author=c.get("author", ""),
                text=c.get("text", ""),
                like_count=c.get("likeCount", 0),
                sentiment=c.get("sentiment", ""),
            )
            for c in comments_data.get("topComments", [])
        ],
        general_sentiment=comments_data.get("generalSentiment", ""),
    )

    return VideoAnalysis(
        overview=overview,
        tags=tags,
        telemetry=telemetry,
        channel=channel,
        comments=comments,
    )
