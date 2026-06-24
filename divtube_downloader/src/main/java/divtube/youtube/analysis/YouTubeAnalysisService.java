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
