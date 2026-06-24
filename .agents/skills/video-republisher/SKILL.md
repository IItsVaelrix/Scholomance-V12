---
name: video-republisher
description: Transcribes videos, extracts Shorts-worthy clips, generates social media posts, blog articles, and newsletter content from video source material. Turns one long-form video into a multi-platform content drop.
allowed-tools: "Bash(gradle run --args='download *'), Bash(python3 intel/pipeline.py *)"
---

# Video Repurposing & Multi-Format Publisher

Extracts maximum value from each video by repurposing it across platforms — YouTube Shorts, Instagram/TikTok clips, blog posts, tweets, and newsletters. Uses the DivTube pipeline foundation for transcription and analysis.

## Integration Points

- **Download Provider** (`src/main/java/divtube/download/`): Fetches video/audio for processing.
- **YouTube Analysis Service** (`src/main/java/divtube/youtube/analysis/`): Identifies high-retention segments from comment pulse and telemetry.
- **Performance Engine** (`intel/engines/performance_engine.py`): Validates clip timing against retention drop-off points.
- **References** (`references/seo/`): Grounds clip pacing and hook decisions.

## Workflow

1. **Ingest**: Accept video URL or local file. Produce transcript (via yt-dlp subtitles or external STT).
2. **High-Value Segment Extraction**: Identify 3-5 clips (30-60s) from transcript where:
   - A key insight is delivered.
   - Engagement spikes (from telemetry data).
   - A hookable question is asked or answered.
3. **Shorts/Reels Scripts**: For each clip, write a hook-first script with caption overlay suggestions.
4. **Blog Post Conversion**: Rewrite transcript as a 800-1200 word blog article with heading structure, key takeaways, and embedded video.
5. **Social Media Snippet Generation**: 3-5 tweet/x threads, 2-3 LinkedIn posts, 1 newsletter blurb.
6. **Cross-Platform Optimization**: Adjust tone/length per platform (Short form vs Long form vs Text).

## Output Format

```markdown
# Repurpose Package: [Video Title]

## Transcript Highlights
| Timestamp | Segment | Type | Hook Potential |
|---|---|---|---|
| 1:15-1:45 | [key insight] | Shorts | High |
| 4:00-4:30 | [engagement spike] | Clip | High |
| ... | ... | ... | ... |

## YouTube Shorts (3 variants)
| Short | Hook | Caption Overlay | Target Duration |
|---|---|---|---|
| 1 | "[question]?" | "[answer]" | :45 |
| 2 | "[statement]." | "[visual highlight]" | :30 |
| 3 | "[challenge]" | "[call to action]" | :60 |

## Blog Post
**Title**: [SEO-optimized blog title]
**Structure**: H1 → H2 sections → Bullet takeaways → CTA
**Word Count**: ~1000
**Key Excerpt**: [2-3 quotable paragraphs]

## Social Posts
### X/Twitter Thread (5-8 posts)
1/8: [hook tweet]
2/8: [insight]
...

### LinkedIn (1 post)
[Professional tone, 200-300 words, value-first]

## Newsletter Blurb
[1 paragraph teaser + link to full video]
```

## Guidelines

- Every repurposed asset must stand alone — no "watch the full video" as a crutch.
- Shorts need a hook in the first 2 seconds (text overlay + visual shift).
- Blog posts must add value beyond the transcript — reorganize, add headings, link to sources.
- Platform-native formatting: thread numbering for X, line breaks for LinkedIn, short paragraphs for newsletter.
