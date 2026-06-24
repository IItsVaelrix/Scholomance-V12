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
