import os

src_dir = "/home/deck/Downloads/Scholomance-V12-main/divtube_downloader/src/main/java/divtube/youtube/analysis"
model_dir = os.path.join(src_dir, "model")

os.makedirs(src_dir, exist_ok=True)
os.makedirs(model_dir, exist_ok=True)

classes = {
    # MODELS
    f"{model_dir}/VideoOverview.java": """
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
""",

    f"{model_dir}/TagIntelligence.java": """
package divtube.youtube.analysis.model;
import java.util.List;

public class TagIntelligence {
    public final List<String> tags;
    public final int tagCount;
    public final boolean hasTags;

    public TagIntelligence(List<String> tags) {
        this.tags = tags;
        this.tagCount = tags != null ? tags.size() : 0;
        this.hasTags = this.tagCount > 0;
    }
}
""",

    f"{model_dir}/VideoTelemetry.java": """
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
""",

    f"{model_dir}/ChannelSnapshot.java": """
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
""",

    f"{model_dir}/CommentPulse.java": """
package divtube.youtube.analysis.model;
import java.util.List;

public class CommentPulse {
    public final List<Comment> topComments;
    public final String generalSentiment;

    public static class Comment {
        public final String author;
        public final String text;
        public final long likeCount;
        public final String sentiment;

        public Comment(String author, String text, long likeCount, String sentiment) {
            this.author = author;
            this.text = text;
            this.likeCount = likeCount;
            this.sentiment = sentiment;
        }
    }

    public CommentPulse(List<Comment> topComments, String generalSentiment) {
        this.topComments = topComments;
        this.generalSentiment = generalSentiment;
    }
}
""",

    f"{model_dir}/VideoAnalysis.java": """
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
""",

    # SERVICES
    f"{src_dir}/YouTubeAnalysisConfig.java": """
package divtube.youtube.analysis;

public class YouTubeAnalysisConfig {
    public static final String API_BASE_URL = "https://www.googleapis.com/youtube/v3";
    public static final String ENV_API_KEY = "YOUTUBE_API_KEY";

    public static final double SCORE_VIRAL_THRESHOLD = 10000.0;
    public static final double SCORE_STRONG_THRESHOLD = 1000.0;
    public static final double SCORE_STABLE_THRESHOLD = 100.0;
}
""",

    f"{src_dir}/YouTubeUrlParser.java": """
package divtube.youtube.analysis;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class YouTubeUrlParser {
    private static final Pattern YT_REGEX = Pattern.compile("(?<=v=|v\\/|vi=|vi\\/|youtu.be\\/|embed\\/|shorts\\/)([a-zA-Z0-9_-]{11})");

    public static String extractVideoId(String url) {
        if (url == null || url.trim().isEmpty()) return null;
        Matcher m = YT_REGEX.matcher(url);
        if (m.find()) {
            return m.group(1);
        }
        return null;
    }
}
""",

    f"{src_dir}/YouTubeQuotaLedger.java": """
package divtube.youtube.analysis;

public class YouTubeQuotaLedger {
    private int quotaUsedToday = 0;
    private static final int DAILY_LIMIT = 10000;

    public void addCost(int cost) {
        this.quotaUsedToday += cost;
    }

    public int getRemaining() {
        return DAILY_LIMIT - quotaUsedToday;
    }

    public boolean isApproachingLimit() {
        return quotaUsedToday > (DAILY_LIMIT * 0.9);
    }
    
    public int getUsed() {
        return quotaUsedToday;
    }
}
""",

    f"{src_dir}/YouTubeApiClient.java": """
package divtube.youtube.analysis;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

public class YouTubeApiClient {
    private final String apiKey;
    private final HttpClient httpClient;
    private final ObjectMapper mapper;
    private final YouTubeQuotaLedger ledger;

    public YouTubeApiClient(YouTubeQuotaLedger ledger) {
        this.ledger = ledger;
        this.apiKey = System.getenv(YouTubeAnalysisConfig.ENV_API_KEY);
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
        this.mapper = new ObjectMapper();
    }

    public boolean hasApiKey() {
        return apiKey != null && !apiKey.trim().isEmpty();
    }

    public JsonNode get(String endpoint, String params, int quotaCost) throws Exception {
        if (!hasApiKey()) throw new RuntimeException("Missing YOUTUBE_API_KEY in environment variables.");
        
        String url = YouTubeAnalysisConfig.API_BASE_URL + endpoint + "?key=" + apiKey + "&" + params;
        HttpRequest request = HttpRequest.newBuilder().uri(URI.create(url)).GET().build();
        
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        ledger.addCost(quotaCost);
        
        if (response.statusCode() != 200) {
            throw new RuntimeException("YouTube API Error: " + response.statusCode() + " - " + response.body());
        }
        
        return mapper.readTree(response.body());
    }
}
""",

    f"{src_dir}/CommentPulseAnalyzer.java": """
package divtube.youtube.analysis;
import divtube.youtube.analysis.model.CommentPulse;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.List;

public class CommentPulseAnalyzer {
    public static CommentPulse analyze(JsonNode commentThreadResponse) {
        if (commentThreadResponse == null || !commentThreadResponse.has("items")) {
            return new CommentPulse(new ArrayList<>(), "UNAVAILABLE");
        }

        List<CommentPulse.Comment> comments = new ArrayList<>();
        int pos = 0, neg = 0;

        for (JsonNode item : commentThreadResponse.get("items")) {
            JsonNode snippet = item.path("snippet").path("topLevelComment").path("snippet");
            String author = snippet.path("authorDisplayName").asText("Unknown");
            String text = snippet.path("textOriginal").asText("");
            long likes = snippet.path("likeCount").asLong(0);

            String sentiment = calculateSentiment(text);
            if (sentiment.equals("POSITIVE")) pos++;
            if (sentiment.equals("NEGATIVE")) neg++;

            comments.add(new CommentPulse.Comment(author, text.replace("\\n", " ").substring(0, Math.min(text.length(), 100)), likes, sentiment));
        }

        String overall = (pos > neg) ? "POSITIVE" : (neg > pos ? "NEGATIVE" : "NEUTRAL");
        return new CommentPulse(comments, overall);
    }

    private static String calculateSentiment(String text) {
        String lower = text.toLowerCase();
        if (lower.contains("love") || lower.contains("great") || lower.contains("awesome") || lower.contains("good") || lower.contains("thanks")) {
            return "POSITIVE";
        }
        if (lower.contains("hate") || lower.contains("bad") || lower.contains("terrible") || lower.contains("worst") || lower.contains("fake")) {
            return "NEGATIVE";
        }
        return "NEUTRAL";
    }
}
""",

    f"{src_dir}/YouTubeTelemetryMapper.java": """
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
""",

    f"{src_dir}/AnalysisExportService.java": """
package divtube.youtube.analysis;
import divtube.youtube.analysis.model.VideoAnalysis;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.File;
import java.io.FileWriter;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class AnalysisExportService {
    private static final ObjectMapper mapper = new ObjectMapper();

    public static String exportToJson(VideoAnalysis analysis) {
        try {
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss"));
            String filename = "youtube-analysis-" + analysis.overview.videoId + "-" + timestamp + ".json";
            File f = new File(System.getProperty("user.dir"), filename);
            mapper.writerWithDefaultPrettyPrinter().writeValue(f, analysis);
            return f.getAbsolutePath();
        } catch (Exception e) {
            return "Export failed: " + e.getMessage();
        }
    }
}
""",

    f"{src_dir}/YouTubeAnalysisService.java": """
package divtube.youtube.analysis;
import divtube.youtube.analysis.model.*;
import com.fasterxml.jackson.databind.JsonNode;

public class YouTubeAnalysisService {
    private final YouTubeApiClient client;
    private final YouTubeQuotaLedger ledger;

    public YouTubeAnalysisService() {
        this.ledger = new YouTubeQuotaLedger();
        this.client = new YouTubeApiClient(this.ledger);
    }

    public VideoAnalysis analyze(String url) throws Exception {
        String videoId = YouTubeUrlParser.extractVideoId(url);
        if (videoId == null) throw new RuntimeException("Invalid YouTube URL.");
        if (!client.hasApiKey()) throw new RuntimeException("Missing API key. Set YOUTUBE_API_KEY environment variable.");

        // 1. Fetch Video details (Cost 1)
        JsonNode videoRes = client.get("/videos", "part=snippet,contentDetails,statistics&id=" + videoId, 1);
        if (videoRes.path("items").isEmpty()) throw new RuntimeException("Video not found or private.");
        JsonNode videoItem = videoRes.path("items").get(0);

        VideoOverview overview = YouTubeTelemetryMapper.mapOverview(videoItem);
        TagIntelligence tags = YouTubeTelemetryMapper.mapTags(videoItem);
        VideoTelemetry telemetry = YouTubeTelemetryMapper.mapTelemetry(videoItem, overview.publishDate);

        // 2. Fetch Channel details (Cost 1)
        JsonNode channelRes = client.get("/channels", "part=snippet,statistics&id=" + overview.channelId, 1);
        ChannelSnapshot channel = new ChannelSnapshot("Unknown", 0, 0, 0);
        if (!channelRes.path("items").isEmpty()) {
            channel = YouTubeTelemetryMapper.mapChannel(channelRes.path("items").get(0));
        }

        // 3. Fetch Comments (Cost 1)
        CommentPulse comments = new CommentPulse(new java.util.ArrayList<>(), "UNAVAILABLE");
        try {
            JsonNode commentRes = client.get("/commentThreads", "part=snippet&videoId=" + videoId + "&maxResults=5&order=relevance", 1);
            comments = CommentPulseAnalyzer.analyze(commentRes);
        } catch(Exception e) {
            // Comments disabled
        }

        return new VideoAnalysis(overview, tags, telemetry, channel, comments);
    }
    
    public YouTubeQuotaLedger getLedger() {
        return ledger;
    }
}
"""
}

for path, content in classes.items():
    with open(path, "w") as f:
        f.write(content.strip() + "\n")

print("Java Intelligence Lab created.")
