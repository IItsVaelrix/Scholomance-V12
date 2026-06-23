package divtube.validation;

public class YouTubeUrlValidator {
    public static boolean isValid(String url) {
        return url != null && (url.contains("youtube.com/watch?v=") || url.contains("youtu.be/"));
    }
}
