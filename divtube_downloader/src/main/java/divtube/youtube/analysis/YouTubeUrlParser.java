package divtube.youtube.analysis;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class YouTubeUrlParser {
    private static final Pattern YT_REGEX = Pattern.compile("(?<=v=|v/|vi=|vi/|youtu.be/|embed/|shorts/)([a-zA-Z0-9_-]{11})");

    public static String extractVideoId(String url) {
        if (url == null || url.trim().isEmpty()) return null;
        Matcher m = YT_REGEX.matcher(url);
        if (m.find()) {
            return m.group(1);
        }
        return null;
    }
}
