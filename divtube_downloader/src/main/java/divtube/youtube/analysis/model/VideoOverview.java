package divtube.youtube.analysis.model;

public class VideoOverview {
    public final String videoId;
    public final String title;
    public final String channelTitle;
    public final String channelId;
    public final String publishDate;
    public final String descriptionPreview;
    public final String thumbnail;
    public final String duration;
    public final String categoryId;
    public final String defaultLanguage;

    public VideoOverview(String videoId, String title, String channelTitle, String channelId, String publishDate,
                         String descriptionPreview, String thumbnail, String duration, String categoryId, String defaultLanguage) {
        this.videoId = videoId;
        this.title = title;
        this.channelTitle = channelTitle;
        this.channelId = channelId;
        this.publishDate = publishDate;
        this.descriptionPreview = descriptionPreview;
        this.thumbnail = thumbnail;
        this.duration = duration;
        this.categoryId = categoryId;
        this.defaultLanguage = defaultLanguage;
    }
}
