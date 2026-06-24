---
name: thumbnail-designer
description: Designs YouTube thumbnails with AI-driven composition guidance, visual hierarchy analysis, and A/B test variants. Integrates with DivTube's thumbnail analysis engine to validate designs before production.
allowed-tools: "Bash(python3 intel/engines/thumbnail_engine.py *)"
---

# Thumbnail Designer & Composer

Designs YouTube thumbnails optimized for CTR and retention. Uses the existing thumbnail analysis engine to validate contrast, silhouette separation, and readability before recommending final designs.

## Integration Points

- **Thumbnail Engine** (`intel/engines/thumbnail_engine.py`): Runs Otsu threshold, silhouette contrast, and text readability checks on proposed designs.
- **References** (`references/seo/thumbnail-readability.md`): Grounds text placement, font sizing, and visual hierarchy decisions.
- **YouTube Feedback Engine** (`tui/skills/youtube_feedback.md`): Cross-references thumbnail concepts against Mode A (CTR potential).

## Workflow

1. **Content Analysis**: Extract key visual elements from script/topic (subject, emotion, setting).
2. **Concept Generation**: Produce 3-5 thumbnail concepts with:
   - Subject placement (rule of thirds, gaze direction)
   - Text overlay (max 3 words, font, color contrast)
   - Color palette (complementary/high-energy)
   - Emotion signal (face expression, arrow/circle annotations)
3. **Validation**: For each concept, generate a mock description and run through the thumbnail engine's readability and contrast checks.
4. **A/B Testing Plan**: Propose 2 variants to test (different focal length, text placement, color scheme).
5. **Final Specification**: Detailed spec that a human designer or AI image generator can execute.

## Output Format

```markdown
# Thumbnail: [Video Title]
**Thumbnail Engine Score**: [score]/100

## Concept Matrix
| Concept | Subject | Text | Palette | Emotion | Est. CTR |
|---|---|---|---|---|---|
| A | ... | "BIG REVEAL" | Red/Black | Shock | ~8% |
| B | ... | "WORTH IT?" | Blue/Yellow | Curiosity | ~10% |

## Top Pick: Concept [A/B/C]
- **Composition**: [description with framing]
- **Text**: [exact text, font, size, position]
- **Color Palette**: [hex codes]
- **Readability Check**: Pass/Fail per thumbnail engine

## A/B Test Plan
- **Variant A**: [description]
- **Variant B**: [description]
- **Success Metric**: CTR after 48h or 10K impressions

## Generation Prompt
[prompt suitable for Midjourney / DALL-E / Stable Diffusion]
```

## Guidelines

- Thumbnails must pass the thumbnail engine's Otsu contrast and silhouette tests.
- Text is a last resort — if the image tells the story, skip text.
- Faces with clear emotion beat objects/text every time.
- Reference `references/seo/thumbnail-readability.md` for font sizing rules.
