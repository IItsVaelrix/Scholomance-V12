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
