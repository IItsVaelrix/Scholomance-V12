package divtube.youtube.analysis.model;

public class ChannelSnapshot {
    public final String title;
    public final long subscriberCount;
    public final long totalViewCount;
    public final long videoCount;

    public ChannelSnapshot(String title, long subscriberCount, long totalViewCount, long videoCount) {
        this.title = title;
        this.subscriberCount = subscriberCount;
        this.totalViewCount = totalViewCount;
        this.videoCount = videoCount;
    }
}
