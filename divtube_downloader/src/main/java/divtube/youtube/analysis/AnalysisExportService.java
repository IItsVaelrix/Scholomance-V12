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
