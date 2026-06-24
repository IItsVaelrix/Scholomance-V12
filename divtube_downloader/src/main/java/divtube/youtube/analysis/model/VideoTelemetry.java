package divtube.youtube.analysis.model;

public class VideoTelemetry {
    public final long viewCount;
    public final long likeCount;
    public final long commentCount;
    public final double engagementRate;
    public final double viewsPerDay;
    public final String performanceScore;

    public VideoTelemetry(long viewCount, long likeCount, long commentCount, double engagementRate, double viewsPerDay, String performanceScore) {
        this.viewCount = viewCount;
        this.likeCount = likeCount;
        this.commentCount = commentCount;
        this.engagementRate = engagementRate;
        this.viewsPerDay = viewsPerDay;
        this.performanceScore = performanceScore;
    }
}
