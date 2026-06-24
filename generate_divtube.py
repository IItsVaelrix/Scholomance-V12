import os

base_dir = "/home/deck/Downloads/Scholomance-V12-main/divtube_downloader"
src_dir = os.path.join(base_dir, "src/main/java/divtube")

files = {
    "build.gradle": """
plugins {
    id 'java'
    id 'application'
}

group = 'com.divtube'
version = '1.0-SNAPSHOT'

repositories {
    mavenCentral()
}

dependencies {
    // Wand/DivWand simulated dependencies (usually Jackson for JSON)
    implementation 'com.fasterxml.jackson.core:jackson-databind:2.15.2'
}

application {
    mainClass = 'divtube.app.DivTubeApp'
}

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

tasks.withType(JavaCompile).configureEach {
    options.encoding = 'UTF-8'
    options.compilerArgs << "-parameters"
}
""",

    "src/main/java/divtube/app/DivTubeApp.java": """package divtube.app;

import divtube.ui.MainViewController;

public class DivTubeApp {
    public static void main(String[] args) {
        System.out.println("Starting DivTube Downloader...");
        MainViewController controller = new MainViewController();
        controller.initialize();
    }
}
""",

    "src/main/java/divtube/app/AppConfig.java": """package divtube.app;

public final class AppConfig {
    public static final String APP_NAME = "DivTube Downloader";
    public static final String VERSION = "1.0.0";
    
    private AppConfig() {}
}
""",

    "src/main/java/divtube/determinism/BytecodeDeterminism.java": """package divtube.determinism;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

public final class BytecodeDeterminism {
    public static final String BUILD_PROFILE = "DIVTUBE_DETERMINISTIC_V1";

    private BytecodeDeterminism() {}

    public static String stableId(String namespace, String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String input = namespace + ":" + value;
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder(2 * hash.length);
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString().substring(0, 16);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Determinism failure", e);
        }
    }
}
""",

    "src/main/java/divtube/download/DownloadProvider.java": """package divtube.download;

public interface DownloadProvider {
    VideoMetadata analyze(String url) throws DownloadException;
    void download(DownloadRequest request, DownloadProgressListener listener) throws DownloadException;
    void cancel();
}
""",

    "src/main/java/divtube/download/DownloadRequest.java": """package divtube.download;

public class DownloadRequest {
    private final String url;
    private final String quality;
    private final String format;
    private final String saveLocation;
    private final boolean userConfirmedRights;

    public DownloadRequest(String url, String quality, String format, String saveLocation, boolean userConfirmedRights) {
        this.url = url;
        this.quality = quality;
        this.format = format;
        this.saveLocation = saveLocation;
        this.userConfirmedRights = userConfirmedRights;
    }

    public String getUrl() { return url; }
    public String getQuality() { return quality; }
    public String getFormat() { return format; }
    public String getSaveLocation() { return saveLocation; }
    public boolean userConfirmedRights() { return userConfirmedRights; }
    
    public boolean urlRequiresLoginKnown() {
        // Implement deterministic static checks for login-required URLs (e.g. member links)
        return false;
    }
}
""",

    "src/main/java/divtube/download/LegalPolicyGuard.java": """package divtube.download;

public final class LegalPolicyGuard {
    public PolicyDecision validate(DownloadRequest request) {
        if (!request.userConfirmedRights()) {
            return PolicyDecision.blocked("Please confirm you have the right to download this content.");
        }

        if (request.urlRequiresLoginKnown()) {
            return PolicyDecision.blocked("This content appears restricted. The app will not bypass access controls.");
        }

        return PolicyDecision.allowed();
    }
}
""",

    "src/main/java/divtube/download/PolicyDecision.java": """package divtube.download;

public class PolicyDecision {
    private final boolean allowed;
    private final String reason;

    private PolicyDecision(boolean allowed, String reason) {
        this.allowed = allowed;
        this.reason = reason;
    }

    public static PolicyDecision allowed() { return new PolicyDecision(true, null); }
    public static PolicyDecision blocked(String reason) { return new PolicyDecision(false, reason); }

    public boolean isAllowed() { return allowed; }
    public String getReason() { return reason; }
}
""",

    "src/main/java/divtube/download/VideoMetadata.java": """package divtube.download;

public class VideoMetadata {
    public final String title;
    public final String channel;
    public final int durationSeconds;
    public final String thumbnailUrl;

    public VideoMetadata(String title, String channel, int durationSeconds, String thumbnailUrl) {
        this.title = title;
        this.channel = channel;
        this.durationSeconds = durationSeconds;
        this.thumbnailUrl = thumbnailUrl;
    }
}
""",

    "src/main/java/divtube/download/DownloadException.java": """package divtube.download;

public class DownloadException extends Exception {
    public DownloadException(String message) { super(message); }
    public DownloadException(String message, Throwable cause) { super(message, cause); }
}
""",

    "src/main/java/divtube/download/DownloadProgressListener.java": """package divtube.download;

public interface DownloadProgressListener {
    void onProgress(double percent, String speed, String eta);
}
""",

    "src/main/java/divtube/download/YtDlpProvider.java": """package divtube.download;

public class YtDlpProvider implements DownloadProvider {
    @Override
    public VideoMetadata analyze(String url) throws DownloadException {
        // Deterministic external process call to yt-dlp -J
        // Stripped of cookies, login args
        return new VideoMetadata("Analyzed Video", "Channel Name", 120, "");
    }

    @Override
    public void download(DownloadRequest request, DownloadProgressListener listener) throws DownloadException {
        // yt-dlp process
        listener.onProgress(100.0, "1MB/s", "0s");
    }

    @Override
    public void cancel() {
        // Clean process destruction
    }
}
""",

    "src/main/java/divtube/ui/MainViewController.java": """package divtube.ui;

import divtube.download.*;
import divtube.validation.YouTubeUrlValidator;

public class MainViewController {
    private final LegalPolicyGuard policyGuard = new LegalPolicyGuard();
    private final DownloadProvider provider = new YtDlpProvider();
    
    public void initialize() {
        System.out.println("Rendering WandUI...");
        String layoutJson = DivWandSchema.getMainLayoutJson();
        WandUiRenderer.render(layoutJson);
    }
    
    public void onAnalyzeClicked(String url) {
        if (!YouTubeUrlValidator.isValid(url)) {
            System.err.println("That does not look like a valid YouTube link.");
            return;
        }
        try {
            VideoMetadata meta = provider.analyze(url);
            System.out.println("Analyzed: " + meta.title + " by " + meta.channel);
        } catch (DownloadException e) {
            System.err.println("Analyze failed: " + e.getMessage());
        }
    }

    public void onDownloadClicked(DownloadRequest request) {
        PolicyDecision decision = policyGuard.validate(request);
        if (!decision.isAllowed()) {
            System.err.println(decision.getReason());
            return;
        }
        try {
            provider.download(request, (percent, speed, eta) -> {
                System.out.println("Progress: " + percent + "% | " + speed + " | " + eta);
            });
        } catch (DownloadException e) {
            System.err.println("Download failed: " + e.getMessage());
        }
    }
}
""",

    "src/main/java/divtube/ui/DivWandSchema.java": """package divtube.ui;

public class DivWandSchema {
    public static String getMainLayoutJson() {
        return "{\\n" +
               "  \\"rationale\\": \\"Create a clean, single-screen downloader interface...\\",\\n" +
               "  \\"confidence\\": 0.92,\\n" +
               "  \\"reviewRequired\\": false,\\n" +
               "  \\"proposedLayout\\": { \\"type\\": \\"screen\\", \\"id\\": \\"divtube.main\\" }\\n" +
               "}";
    }
}
""",

    "src/main/java/divtube/ui/WandUiRenderer.java": """package divtube.ui;

public class WandUiRenderer {
    public static void render(String jsonSchema) {
        // Adapts JSON to JavaFX/Swing deterministically
        System.out.println("UI Rendered from JSON successfully.");
    }
}
""",

    "src/main/java/divtube/validation/YouTubeUrlValidator.java": """package divtube.validation;

public class YouTubeUrlValidator {
    public static boolean isValid(String url) {
        return url != null && (url.contains("youtube.com/watch?v=") || url.contains("youtu.be/"));
    }
}
"""
}

for filepath, content in files.items():
    full_path = os.path.join(base_dir, filepath)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w") as f:
        f.write(content)

print(f"Generated {len(files)} files successfully in {base_dir}")
