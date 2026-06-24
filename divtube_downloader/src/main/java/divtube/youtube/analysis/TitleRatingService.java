package divtube.youtube.analysis;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;

public class TitleRatingService {
    private final YouTubeApiClient client;

    public TitleRatingService() {
        this.client = new YouTubeApiClient(new YouTubeQuotaLedger());
    }

    public String rateTitle(String title, String niche, String configJson) throws Exception {
        StringBuilder report = new StringBuilder();
        report.append("\n[Intelligence] === TITLE RATING REPORT ===\n");
        report.append("[Intelligence] Title: ").append(title).append("\n");
        report.append("[Intelligence] Niche: ").append(niche).append("\n\n");

        ObjectMapper mapper = new ObjectMapper();
        JsonNode config = mapper.readTree(configJson.isEmpty() ? "{}" : configJson);
        
        int optMin = config.path("optimal_length_min").asInt(30);
        int optMax = config.path("optimal_length_max").asInt(60);
        double targetUpper = config.path("target_uppercase_ratio").asDouble(0.20);
        
        List<String> powerWords = new ArrayList<>();
        if (config.has("power_words")) {
            for (JsonNode pw : config.get("power_words")) powerWords.add(pw.asText().toLowerCase());
        }
        
        List<String> baselineTerms = new ArrayList<>();
        if (config.has("baseline_search_terms")) {
            for (JsonNode bt : config.get("baseline_search_terms")) baselineTerms.add(bt.asText());
        }

        List<String> tier1 = new ArrayList<>(); // Actionable
        List<String> tier2 = new ArrayList<>(); // Recommended
        List<String> tier3 = new ArrayList<>(); // Potentially good but unclear

        // 1. Length & Truncation
        int len = title.length();
        if (len > optMax) {
            tier1.add("Your title is " + len + " characters. For this niche, keep it under " + optMax + " chars. Remove " + (len - optMax) + " characters.");
        } else if (len < optMin) {
            tier2.add("Your title is only " + len + " characters. This niche prefers " + optMin + "+ chars. Consider adding descriptive words.");
        } else {
            tier3.add("Length is mathematically optimal (" + len + " chars).");
        }

        // 2. Uppercase Entropy
        long upperCount = title.chars().filter(Character::isUpperCase).count();
        long alphaCount = title.chars().filter(Character::isLetter).count();
        double upperRatio = alphaCount == 0 ? 0 : (double) upperCount / alphaCount;
        
        if (upperRatio > targetUpper + 0.20) {
            tier1.add("Uppercase ratio is too high (" + String.format("%.0f%%", upperRatio*100) + "). Target for this niche is ~" + String.format("%.0f%%", targetUpper*100) + ". Reduce capitalization.");
        } else if (upperRatio < targetUpper - 0.10 && targetUpper > 0.10) {
            tier2.add("Uppercase ratio is low (" + String.format("%.0f%%", upperRatio*100) + "). Capitalizing 'power words' could reach the niche target of " + String.format("%.0f%%", targetUpper*100) + ".");
        } else {
            tier3.add("Uppercase entropy matches the niche meta at " + String.format("%.0f%%", upperRatio*100) + ".");
        }

        // 3. Power Words & Keyword Match
        boolean hasPowerWord = false;
        String lowerTitle = title.toLowerCase();
        for (String pw : powerWords) {
            if (lowerTitle.contains(pw)) {
                hasPowerWord = true;
                break;
            }
        }
        if (!hasPowerWord && !powerWords.isEmpty()) {
            tier2.add("Missing niche 'power words'. Consider adding: " + String.join(", ", powerWords));
        }

        if (!lowerTitle.contains(niche.toLowerCase()) && baselineTerms.isEmpty()) {
            tier1.add("The exact niche keyword '" + niche + "' is missing from the title. Adding it guarantees search relevance.");
        } else if (!baselineTerms.isEmpty()) {
            boolean hasBaseline = false;
            for (String bt : baselineTerms) {
                if (lowerTitle.contains(bt.toLowerCase())) hasBaseline = true;
            }
            if (!hasBaseline) {
                tier2.add("Title doesn't contain expected niche search terms (e.g. " + baselineTerms.get(0) + ").");
            }
        }

        // 4. Competitor Baseline
        try {
            String searchQuery = niche;
            if (!baselineTerms.isEmpty()) {
                searchQuery = baselineTerms.get(0);
            }
            String encodedNiche = java.net.URLEncoder.encode(searchQuery, "UTF-8");
            JsonNode searchRes = client.get("/search", "part=snippet&q=" + encodedNiche + "&type=video&maxResults=10", 1);
            
            double avgCompetitorLength = 0;
            int count = 0;
            
            if (searchRes.has("items")) {
                for (JsonNode item : searchRes.get("items")) {
                    String compTitle = item.path("snippet").path("title").asText();
                    avgCompetitorLength += compTitle.length();
                    count++;
                }
            }
            
            if (count > 0) {
                avgCompetitorLength /= count;
                double diff = Math.abs(len - avgCompetitorLength);
                if (diff > 20) {
                    tier3.add("Your title differs significantly from top live competitors (Avg: " + String.format("%.0f", avgCompetitorLength) + "). This could stand out, or miss the format.");
                } else {
                    tier2.add("Matches the current live competitor length meta (Avg: " + String.format("%.0f", avgCompetitorLength) + " chars).");
                }
            }
        } catch (Exception e) {
            tier3.add("Could not fetch live competitor data: " + e.getMessage());
        }

        // Format the output
        report.append("[Intelligence] [TIER 1] ACTIONABLE (Do this now):\n");
        if (tier1.isEmpty()) report.append("[Intelligence]   - None! Perfect baseline.\n");
        for (String s : tier1) report.append("[Intelligence]   - ").append(s).append("\n");

        report.append("\n[Intelligence] [TIER 2] RECOMMENDED (Best practice):\n");
        if (tier2.isEmpty()) report.append("[Intelligence]   - None.\n");
        for (String s : tier2) report.append("[Intelligence]   - ").append(s).append("\n");

        report.append("\n[Intelligence] [TIER 3] EXPERIMENTAL (Potentially good):\n");
        if (tier3.isEmpty()) report.append("[Intelligence]   - None.\n");
        for (String s : tier3) report.append("[Intelligence]   - ").append(s).append("\n");

        return report.toString();
    }
}
