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

            comments.add(new CommentPulse.Comment(author, text.replace("\n", " ").substring(0, Math.min(text.length(), 100)), likes, sentiment));
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
