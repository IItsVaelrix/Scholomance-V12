# Thumbnail Readability

## Principle
A thumbnail must be readable at 48px width. The silhouette (dominant shape) must be
instantly recognizable. Text must survive extreme downscale. Foreground must separate
from background via contrast, not just color.

## Deterministic Checks
- Silhouette score: 1 - normalized(component_count) after Otsu threshold
- Focal dominance: largest component area as fraction of frame (target: 18-55%)
- Foreground contrast: |fg_mean - bg_mean| / 255 after Otsu split
- Text legibility at 48px: fraction of thin (<=1px) components surviving downscale
- Crop safety: penalty if largest bbox within 5% of any edge
- Color separation: saturation and hue spread of pre-grayscale 48px image

## Failure Modes
- THUMBNAIL_LOW_SILHOUETTE: too many disconnected components (noise, clutter)
- THUMBNAIL_TEXT_COLLAPSE_48PX: text elements collapse to unreadable blobs at 48px
- THUMBNAIL_LOW_FOREGROUND_CONTRAST: foreground and background luminance too similar

## Critique Language
| Flag | Language |
|------|----------|
| THUMBNAIL_LOW_SILHOUETTE | The thumbnail lacks a clear silhouette. Multiple disconnected elements compete for attention, making the image unreadable at mobile scale. |
| THUMBNAIL_TEXT_COLLAPSE_48PX | Text elements in the thumbnail collapse below readable size at 48px. Mobile viewers (70%+ of YouTube traffic) cannot read the text. |
| THUMBNAIL_LOW_FOREGROUND_CONTRAST | Foreground and background share similar luminance values. The subject disappears into the background at thumbnail scale. |

## Scoring Impact
Thumbnail readability contributes 25% to overall score. Weights: silhouette 25, focal
dominance 20, contrast 20, text legibility 15, crop safety 10, color separation 10.
