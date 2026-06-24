# Title Construction Lines

## Principle
A YouTube title must be concise (under 50 chars for mobile), front-load a hook within
the first 3 words, place the primary keyword within the first 32 characters, and create
a curiosity gap without sacrificing clarity.

## Deterministic Checks
- Length: maxRecommended=50, hardWarn=60 characters
- Hook frontload: first 3 words checked against curiosity/emotional trigger patterns
- Keyword placement: longest non-stopword token must appear within first 32 characters
- Curiosity gap: presence of curiosity-inducing language patterns
- Clarity: title must not be empty or pure symbols
- Uniqueness: ratio of unique words to total words

## Failure Modes
- TITLE_MOBILE_TRUNCATION: title exceeds 60 characters, truncated on mobile displays
- TITLE_HOOK_AFTER_WORD_3: hook/emotional trigger appears after the first 3 words
- TITLE_KEYWORD_AFTER_CHAR_32: primary keyword appears after character 32

## Critique Language
| Flag | Language |
|------|----------|
| TITLE_MOBILE_TRUNCATION | The title exceeds 60 characters and will be truncated on mobile search results and suggested video panels. The critical information may be cut. |
| TITLE_HOOK_AFTER_WORD_3 | The emotional or curiosity hook appears after the third word. Mobile viewers see approximately 3-4 words before truncation; the opening must arrest attention immediately. |
| TITLE_KEYWORD_AFTER_CHAR_32 | The primary keyword appears after character 32. Search snippets and mobile displays may cut the keyword, reducing discoverability. |

## Scoring Impact
Title construction contributes 30% to overall score. Weights: length 20, hook
frontload 25, keyword placement 20, curiosity gap 15, clarity 15, uniqueness 5.
