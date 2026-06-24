---
name: video-script-writer
description: Writes YouTube video scripts, hooks, and storyboards informed by SEO analysis, Golden Curve title data, and niche reference material. Produces hook-first narrative structures optimized for retention.
allowed-tools: "Bash(node turboquant_plugin.js *), Bash(python3 tui/services/*.py)"
---

# Video Script & Storyboard Writer

Writes YouTube scripts with retention-optimized pacing, hook variants, and visual storyboards. Integrates with DivTube's SEO critique engines and Golden Curve title bank to ensure script concepts are algorithmically viable before writing.

## Integration Points

- **Golden Curves**: Scores script title concepts against stored curves via `turboquant_plugin.js` before committing to a script direction.
- **Title Engine** (`intel/engines/title_engine.py`): Validates that working titles score 70+ before script approval.
- **References** (`references/seo/`): Grounds hook construction in retention-hook principles and CTR psychology.

## Workflow

1. **Brief & Niche Identification**: Accept video topic, target niche, reference URLs (or Golden Curve ID).
2. **Title Concept Generation**: Generate 3-5 title variants, score each via the SEO pipeline, pick the top scorer.
3. **Hook Engineering**: Write 3 hook variants (pattern-interrupt, curiosity gap, stark statement) with estimated retention impact.
4. **Narrative Structure**: Outline with timestamps:
   - Hook (0:00-0:30)
   - Stake/Reward setup (0:30-1:30)
   - Body segments with retention triggers every 60-90s
   - Payoff & CTA
5. **Script Drafting**: Full script with visual cues, B-roll suggestions, and timing annotations.
6. **SEO Sanity Check**: Verify title+description+tags coherence against the YouTube Feedback Engine rubric.

## Output Format

```markdown
# Script: [Working Title]
**Golden Curve Score**: [score]/100 | **Title Engine Score**: [score]/100

## Hook Variants
| # | Hook | Style | Est. Retention |
|---|---|---|---|
| 1 | ... | Pattern Interrupt | ~70% at :30 |
| 2 | ... | Curiosity Gap | ~65% at :30 |
| 3 | ... | Stark Statement | ~60% at :30 |

## Narrative Outline
| Timestamp | Segment | Visual Cue | Retention Trigger |
|---|---|---|---|
| 0:00-0:30 | Hook | ... | ... |
| 0:30-1:30 | Stake Setup | ... | ... |
| ... | ... | ... | ... |

## Full Script
[scene-by-scene with timestamps, dialogue, visual notes]

## SEO Metadata
- **Title**: [selected title]
- **Description Hook**: [first 2 lines]
- **Tags**: [primary cluster]
```

## Guidelines

- No fluff: every line must either hook, inform, or advance narrative.
- Design retention triggers every 60-90 seconds (pattern breaks, value drops, questions).
- Always include a visual/staging column — YouTube is an audiovisual medium.
- Ground hook choices in `references/seo/retention-hooks.md` and `references/seo/ctr-psychology.md`.
