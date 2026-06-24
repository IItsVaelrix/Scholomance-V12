# DivTube JSON Structure White-Paper
**Version:** 1.0
**Target Subsystem:** DivTube Content Critic Service (`/critique`)

## 1. Executive Summary
The DivTube Content Critic (`/critique`) relies on structured JSON payloads to evaluate YouTube concepts, scripts, and editing timelines. To generate highly actionable feedback across the AI's four core evaluation lenses (Audience Retention, Algorithmic Viability, Narrative Arc, and Call to Action), the JSON files must adhere to a standardized schema.

This document outlines the canonical JSON structure required to maximize the analytical capabilities of the OpenCode AI integration.

---

## 2. Canonical JSON Schema

All video project JSONs located in the `divtube_downloader/` directory should follow this root structure:

```json
{
  "metadata": {
    "title": "String - Proposed video title",
    "thumbnail_concept": "String - Brief visual description of the thumbnail",
    "niche": "String - The target YouTube community (e.g., 'gaming', 'finance')",
    "target_duration_minutes": "Number - Expected runtime in minutes"
  },
  "narrative": {
    "hook_script": "String - The exact script for the first 15-30 seconds",
    "core_conflict": "String - The primary question or stakes of the video",
    "call_to_action": "String - The specific CTA and its timestamp/trigger"
  },
  "segments": [
    {
      "time_percent": "String - Timeline range (e.g., '0-10%')",
      "action": "String - What happens on screen / narrative beat",
      "pacing": "String - 'Fast', 'Medium', or 'Slow'",
      "b_roll": "String (Optional) - Expected visual overlays"
    }
  ]
}
```

---

## 3. Component Breakdown & AI Integration

The `ContentCriticService` evaluates your JSON through specific "Feedback Modes." Structuring your data cleanly allows the AI to trigger the correct mode automatically.

### A. The `metadata` Object (Mode A: Concept/Metadata)
- **Why it matters:** The AI uses `title`, `thumbnail_concept`, and `niche` to calculate **Algorithmic Viability** (CTR potential and Browse viability).
- **Best Practice:** Keep the thumbnail concept brief but visually distinct so the AI can judge if it compliments the title.

### B. The `narrative` Object (Mode B: Script/Narrative)
- **Why it matters:** The `hook_script` is aggressively analyzed for **Audience Retention**. The AI looks for immediate stakes and payoff promises within the first 15 seconds.
- **Best Practice:** Provide the *verbatim* script for the hook, rather than a summary. 

### C. The `segments` Array (Mode C: Audio/Visual)
- **Why it matters:** By breaking the video into percentage-based chunks (`0-10%`, `10-80%`), the AI can plot the **Narrative Arc** and identify mid-roll retention drop-offs.
- **Best Practice:** Always include a `pacing` key. The AI specifically looks for pacing variations to ensure the viewer doesn't experience "timeline fatigue" during the middle 60% of the video.

---

## 4. Minimal Example (`test_content.json`)
If you are rapidly prototyping an idea, a flattened, minimal structure is also natively supported by the parser:

```json
{
  "niche": "gaming",
  "target_duration_minutes": 10,
  "hook_script": "I survived 100 days in hardcore, and on day 99, everything went wrong...",
  "segments": [
    {"time_percent": "0-10%", "action": "Establish the stakes", "pacing": "Fast"},
    {"time_percent": "10-80%", "action": "Grinding and setbacks", "pacing": "Medium"},
    {"time_percent": "80-100%", "action": "The final showdown", "pacing": "Fast"}
  ],
  "call_to_action": "Subscribe at the very end after the boss fight."
}
```

*Note: While the flattened structure works, upgrading to the nested structure (Section 2) will yield deeper, more accurate VAELRIX_LAW grades from the AI.*
