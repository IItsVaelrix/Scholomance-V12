# Tag Clustering

## Principle
Tags must form a coherent semantic cluster map covering the video's identity, genre,
format, mood, technology, and audience-intent dimensions. Stuffing (near-duplicate
variants) degrades trust signals.

## Deterministic Checks
- Semantic tightness: average cluster density (tags per occupied cluster)
- Coverage completeness: fraction of expected clusters present
- Stuffing penalty: near-duplicate tag variants or excessive tag count
- Long-tail specificity: average tag word count (multi-word tags score higher)
- Title-tag alignment: overlap between title tokens and tag tokens

## Failure Modes
- TAG_STUFFING_RISK: near-duplicate tag variants detected or count exceeds threshold
- TAG_CLUSTER_TOO_BROAD: 2 or more expected clusters are missing from tag set

## Critique Language
| Flag | Language |
|------|----------|
| TAG_STUFFING_RISK | Tag set contains near-duplicate variants that signal keyword stuffing rather than semantic coverage. YouTube's algorithm penalizes tag manipulation. |
| TAG_CLUSTER_TOO_BROAD | Tags fail to cover expected semantic clusters. The metadata does not signal the video's full topical range to the recommendation engine. |

## Scoring Impact
Tag clustering contributes 20% to overall score. Weights: semantic tightness 35,
coverage 25, stuffing penalty inverse 20, long-tail specificity 10, title-tag
alignment 10.
