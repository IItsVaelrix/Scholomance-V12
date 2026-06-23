package divtube.youtube.analysis.model;

public class VideoAnalysis {
    public final VideoOverview overview;
    public final TagIntelligence tags;
    public final VideoTelemetry telemetry;
    public final ChannelSnapshot channel;
    public final CommentPulse comments;

    public VideoAnalysis(VideoOverview overview, TagIntelligence tags, VideoTelemetry telemetry, ChannelSnapshot channel, CommentPulse comments) {
        this.overview = overview;
        this.tags = tags;
        this.telemetry = telemetry;
        this.channel = channel;
        this.comments = comments;
    }
}
