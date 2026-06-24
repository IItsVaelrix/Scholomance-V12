---
name: metadata-generator
description: Generates SEO-optimized YouTube descriptions, timestamp chapters, tag clusters, card/endscreen layouts, and community post drafts. Integrates with DivTube's tag and title engines for validation.
allowed-tools: "Bash(python3 intel/engines/tag_engine.py *), Bash(python3 intel/engines/title_engine.py *)"
---

# Description, Chapters & Metadata Generator

Produces complete YouTube metadata packages — descriptions, chapters, tags, cards, endscreens, and community posts — optimized for search discovery and browse session time.

## Integration Points

- **Tag Engine** (`intel/engines/tag_engine.py`): Validates tag clusters for coverage, tightness, and stuffing detection.
- **Title Engine** (`intel/engines/title_engine.py`): Ensures description-opening keyword alignment with the chosen title.
- **Performance Engine** (`intel/engines/performance_engine.py`): Suggests optimal publish time/day based on engagement patterns.
- **YouTube Feedback Engine** (`tui/skills/youtube_feedback.md`): Cross-references metadata against Mode D (Analytics) rubric.

## Workflow

1. **Title Intake**: Accept the finalized video title and script outline.
2. **Description Writing**:
   - Hook-first opening (first 2 lines visible in search / suggested video).
   - 2-3 paragraph body expanding on the video's value.
   - Link section (channel, socials, related videos, affiliate).
   - Timestamp chapters with compelling labels (not just "Intro" / "Outro").
3. **Tag Cluster Generation**: 3-5 clusters (broad niche, specific topic, long-tail, competitor, trending).
4. **Card & Endscreen Layout**: Time-based card placements (poll, video, channel, link) and endscreen element positions.
5. **Community Post Draft**: Pre-write 3 community post variants (teaser, post-publish, poll).
6. **SEO Validation**: Run tag cluster through tag engine (must pass stuffing check) and verify title/description keyword alignment.

## Output Format

```markdown
# Metadata Package: [Video Title]

## Description
[hook-first description with line breaks for mobile]

### Chapters
| Timestamp | Label | Keyword |
|---|---|---|
| 0:00 | [Hook-driven label, not "Intro"] | keyword |
| 1:30 | [Segment label] | keyword |
| ... | ... | ... |

## Tag Clusters
| Cluster | Tags | Size | Coverage |
|---|---|---|---|
| Broad Niche | tag1, tag2, tag3 | 8 | 80% |
| Specific Topic | tag4, tag5 | 5 | 90% |
| Long-Tail | tag6, tag7, tag8 | 4 | 70% |
| Competitor | tag9, tag10 | 3 | 60% |
| **Tag Engine Grade** | [Pass/Warn/Fail] | — | — |

## Cards & Endscreen
| Time | Card Type | Target | Rationale |
|---|---|---|---|
| 2:30 | Video | related video | Natural transition point |
| 5:00 | Poll | engagement | High-retention moment |
| End | Endscreen | channel + video | Standard best practice |

## Community Post Drafts
1. **Teaser**: "[hook question]? Full video [time] — [link]"
2. **Post-Publish**: "[key takeaway] — what's your take? [link]"
3. **Poll**: "Which angle should we cover next? A) ... B) ..."
```

## Guidelines

- First 2 description lines must work as standalone search results — no filler.
- Chapter labels must include primary keywords and promise value (not "Intro").
- Tag clusters must pass the tag engine's stuffing check — max 20% overlap between clusters.
- Cards should be placed at natural retention valleys (60-90s intervals).
