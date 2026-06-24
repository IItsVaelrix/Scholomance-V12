# Retention Hooks

## Principle
Retention is driven by promise delivery. The title and thumbnail set an expectation;
the first 30 seconds must visibly deliver on that expectation. Mismatched promises
create click-bait penalties via early drop-off.

## Deterministic Checks
- Promise specificity: title contains specific claims (numbers, names, outcomes)
- Thumbnail-text coherence: thumbnail visual and title topic align semantically

## Failure Modes
- Vague promise: title lacks specific claims (no numbers, names, or outcomes)
- Promise-content mismatch: thumbnail and title suggest different topics

## Critique Language
| Flag | Language |
|------|----------|
| VAGUE_PROMISE | The title makes no specific promise. Without a concrete claim, viewers have no reason to stay past the first 10 seconds. |
| PROMISE_MISMATCH | The thumbnail and title suggest different topics. Viewers who click for one thing and get another leave within seconds, destroying retention. |

## Scoring Impact
Retention hooks are assessed through the title curiosity sub-score and the
title-tag alignment metric. Strong alignment between thumbnail, title, and tags
signals coherent promise delivery.
