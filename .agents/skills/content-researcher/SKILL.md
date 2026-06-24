---
name: content-researcher
description: Mines YouTube trend data, keyword opportunities, content gaps, and competitive analysis to produce data-driven video topic recommendations. Integrates with DivTube's YouTube Analysis pipeline and Golden Curve registry.
allowed-tools: "Bash(gradle run --args='analyze *'), Bash(python3 intel/pipeline.py *)"
---

# Content Research & Trend Ideation

Discovers high-opportunity video topics by analyzing YouTube search trends, competitor channel gaps, and Golden Curve performance data. Turns raw analytics into actionable content calendars.

## Integration Points

- **YouTube Analysis Service** (`src/main/java/divtube/youtube/analysis/`): Fetches competitor channel stats, video telemetry, and comment pulse data.
- **Golden Curve Registry** (`turboquant_registry.json`): Scores topic ideas against known high-performing title vectors.
- **Performance Engine** (`intel/engines/performance_engine.py`): Validates projected engagement rates and confidence bands.
- **Niche Database** (`niche_database.sqlite`): Queries existing niche packs for coverage gaps.

## Workflow

1. **Niche Audit**: Analyze a target niche using YouTube Analysis — top 10 channels, their best/worst performing videos, comment sentiment.
2. **Keyword Discovery**: Extract high-frequency keywords from competitor titles, tags, and descriptions.
3. **Content Gap Analysis**: Use Golden Curve search to find underserved angles within the niche (high volume, low competition).
4. **Topic Scoring**: Score each topic idea (Volume, Competition, Curve Fit, Predicted CTR, Predicted Retention).
5. **Content Calendar**: Produce a ranked list of 5-10 video topics with rationale, estimated effort, and predicted ROI.
6. **Validation**: Cross-reference against the YouTube Data API for real search volume indicators.

## Output Format

```markdown
# Content Research Report: [Niche Name]

## Niche Overview
- **Top Channels**: [3-5 channels with subs/video count]
- **Avg CTR in niche**: [%]
- **Avg Retention**: [%]
- **Content Density**: [High/Medium/Low]

## Keyword Opportunities
| Keyword | Volume Est. | Competition | Title | Golden Curve Score |
|---|---|---|---|---|
| ... | High | Low | "..." | 85/100 |
| ... | Med | Med | "..." | 72/100 |

## Content Gaps
| Gap | Evidence | Opportunity |
|---|---|---|
| [Angle not covered] | No top-10 video on this | First mover advantage |

## Recommended Topics
| Rank | Topic | Est. Views | Est. CTR | Effort | Rationale |
|---|---|---|---|---|---|
| 1 | ... | 50K+ | 12% | Med | High volume, low competition, curve score 88 |
| ... | ... | ... | ... | ... | ... |

## Content Calendar
- **Week 1**: Topic #1 (highest impact)
- **Week 2**: Topic #2 (complementary angle)
- **Week 3**: Topic #3 (follow-up / series continuation)
```

## Guidelines

- Score every topic suggestion against at least one Golden Curve before listing it.
- Label "Data" vs "Inference" — distinguish what comes from YouTube API vs derived projection.
- Flag topics where the top 3 results are >2 years old as "stale niche — high opportunity."
