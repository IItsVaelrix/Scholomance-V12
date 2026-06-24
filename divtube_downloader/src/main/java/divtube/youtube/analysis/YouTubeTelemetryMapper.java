package divtube.youtube.analysis;
import divtube.youtube.analysis.model.*;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

public class YouTubeTelemetryMapper {
    public static VideoOverview mapOverview(JsonNode videoItem) {
        JsonNode snippet = videoItem.path("snippet");
        JsonNode contentDetails = videoItem.path("contentDetails");
        
        return new VideoOverview(
            videoItem.path("id").asText(),
            snippet.path("title").asText(),
            snippet.path("channelTitle").asText(),
            snippet.path("channelId").asText(),
            snippet.path("publishedAt").asText(),
            snippet.path("description").asText().substring(0, Math.min(snippet.path("description").asText().length(), 150)) + "...",
            snippet.path("thumbnails").path("high").path("url").asText(),
            contentDetails.path("duration").asText(),
            snippet.path("categoryId").asText(),
            snippet.path("defaultLanguage").asText("en")
        );
    }

    public static TagIntelligence mapTags(JsonNode videoItem) {
        List<String> tags = new ArrayList<>();
        JsonNode tagsNode = videoItem.path("snippet").path("tags");
        if (tagsNode.isArray()) {
            for (JsonNode t : tagsNode) tags.add(t.asText());
        }
        return new TagIntelligence(tags);
    }

    public static VideoTelemetry mapTelemetry(JsonNode videoItem, String publishedAtStr) {
        JsonNode stats = videoItem.path("statistics");
        long views = stats.path("viewCount").asLong(0);
        long likes = stats.path("likeCount").asLong(0);
        long comments = stats.path("commentCount").asLong(0);

        long daysSincePublished = 1;
        try {
            Instant publishedAt = Instant.parse(publishedAtStr);
            daysSincePublished = Math.max(1, ChronoUnit.DAYS.between(publishedAt, Instant.now()));
        } catch(Exception ignored) {}

        double engagementRate = views > 0 ? ((double)(likes + comments) / views) * 100 : 0.0;
        double viewsPerDay = (double) views / daysSincePublished;

        String score = "LOW";
        if (viewsPerDay >= YouTubeAnalysisConfig.SCORE_VIRAL_THRESHOLD) score = "VIRAL CANDIDATE";
        else if (viewsPerDay >= YouTubeAnalysisConfig.SCORE_STRONG_THRESHOLD) score = "STRONG";
        else if (viewsPerDay >= YouTubeAnalysisConfig.SCORE_STABLE_THRESHOLD) score = "STABLE";

        return new VideoTelemetry(views, likes, comments, engagementRate, viewsPerDay, score);
    }

    public static ChannelSnapshot mapChannel(JsonNode channelItem) {
        JsonNode snippet = channelItem.path("snippet");
        JsonNode stats = channelItem.path("statistics");
        return new ChannelSnapshot(
            snippet.path("title").asText(),
            stats.path("subscriberCount").asLong(0),
            stats.path("viewCount").asLong(0),
            stats.path("videoCount").asLong(0)
        );
    }
}
