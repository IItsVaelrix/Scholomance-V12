package divtube.youtube.analysis;

public class YouTubeAnalysisConfig {
    public static final String API_BASE_URL = "https://www.googleapis.com/youtube/v3";
    public static final String ENV_API_KEY = "YOUTUBE_API_KEY";

    public static final double SCORE_VIRAL_THRESHOLD = 10000.0;
    public static final double SCORE_STRONG_THRESHOLD = 1000.0;
    public static final double SCORE_STABLE_THRESHOLD = 100.0;
}
