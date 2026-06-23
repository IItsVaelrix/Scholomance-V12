# CTR Psychology

## Principle
Click-through rate is driven by pattern interrupt (thumbnail stands out in the feed),
curiosity gap (title opens a question the viewer must click to answer), and identity
resonance (the package signals "this is for me").

## Deterministic Checks
- Pattern interrupt: thumbnail color separation score (distinct from feed neighbors)
- Curiosity gap: title contains curiosity-inducing language patterns
- Identity resonance: title and tags contain audience-identity keywords

## Failure Modes
- Low pattern interrupt: thumbnail color separation below threshold
- Missing curiosity gap: title is purely descriptive without curiosity triggers
- Weak identity signal: no audience-identity keywords in title or tags

## Critique Language
| Flag | Language |
|------|----------|
| LOW_PATTERN_INTERRUPT | The thumbnail's color palette blends into the YouTube feed. It lacks the visual distinctiveness needed to stop the scroll. |
| MISSING_CURIOSITY_GAP | The title is purely descriptive. It does not open a curiosity loop that compels the viewer to click for resolution. |

## Scoring Impact
CTR psychology factors are embedded within the thumbnail and title engine scores.
Pattern interrupt maps to color separation; curiosity gap maps to title curiosity
sub-score; identity resonance maps to tag coverage.
