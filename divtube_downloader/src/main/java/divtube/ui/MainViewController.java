package divtube.ui;

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
