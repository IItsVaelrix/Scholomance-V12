package divtube.download;

public class VideoMetadata {
    public final String title;
    public final String channel;
    public final int durationSeconds;
    public final String thumbnailUrl;

    public VideoMetadata(String title, String channel, int durationSeconds, String thumbnailUrl) {
        this.title = title;
        this.channel = channel;
        this.durationSeconds = durationSeconds;
        this.thumbnailUrl = thumbnailUrl;
    }
}
