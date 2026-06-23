# Archived components (legacy)

Files here use the `.archive` suffix so they are excluded from the Vite build
and from Vitest. They are kept for reference only.

## WordTooltip (`WordTooltip.jsx.archive`, `WordTooltip.css.archive`)

Superseded on 2026-06-22 by [`RitualPredictionTooltip`](../RitualPredictionTooltip.jsx),
which is the more mature overlay pattern (shared `resolveOverlayPlacement`,
`ResizableBox`, self-fetched lexicon via `useWordLookup`, structured prediction
data). The unified tooltip absorbed WordTooltip's still-useful behaviour:

- clickable suggestion runes (synonyms / antonyms / rhymes / slant): primary
  click **transmutes** the word in the poem one-click (as the old card did); a
  secondary ⌕ icon **explores** that word in the card, with a breadcrumb trail;
- multiple definitions + pronunciation + part-of-speech;
- session prev/next navigation.

Dropped on purpose during the slim-down: the `SigilChamber` Phaser ritual-circle
visual, rhyme-astrology insight panel, and school/vowel colour theming. Word
re-navigation now happens inside the tooltip, so `ReadPage` no longer threads
`wordData` / lookup state into it. The companion drag test moved to
`tests/components/Archive/WordTooltip.drag.test.jsx.archive`.

`SigilChamber.jsx` is now unreferenced and left in place pending a separate
decision on its fate.
