# Discography Header — Albums Link Symmetry

**Date:** 2026-07-16  
**Status:** Approved  
**Scope:** Visualiser left sidebar (`DiscographyNav`) header only

## Problem

On `/visualiser`, the sidebar header reads as **DISCOGRAPHYALBUMS**. The Albums navigation link sits as a bare middle flex child between the title and the Upload/collapse actions. Class `bcv-disco-albums-link` is present in markup but has **no CSS**, so there is no gap, hierarchy, or click-affordance styling. The row lacks left/right symmetry.

## Goal

Keep Albums on the same header row, but as a clearly separate quiet secondary control with breathing room. Title identity on the left; tools on the right.

## Approach

**Title cluster + actions cluster** (Approach 1).

### Layout

```
[ Discography    Albums ]          [ + Upload ] [ ⌃ ]
        left cluster                    right cluster
```

- Outer `.bcv-disco-header` remains one row: `display: flex`, `justify-content: space-between`, `align-items: center`.
- New left wrapper (e.g. `.bcv-disco-header-title`) groups `<h2>Discography</h2>` and the Albums `Link`.
- Existing `.bcv-disco-header-actions` stays the right cluster (Upload + collapse). Unchanged behavior.

### Albums link

- Route: `/visualiser/albums` (unchanged).
- Quiet secondary text control — muted uppercase, slightly smaller than the title, letter-spacing consistent with nearby chrome.
- Clear hover and focus styles; not a bordered button (Upload keeps that role).
- Enough horizontal gap from `Discography` that the two labels never read as one word.

### CSS

- Define missing `.bcv-disco-albums-link` styles.
- Style the left-cluster wrapper (flex row, small gap, `min-width: 0` / truncation safety if needed).
- No change to sidebar width, collapse/expand, edge handle, or track list.

## Files

| File | Change |
|------|--------|
| `src/pages/Visualiser/DiscographyNav.tsx` | Wrap title + Albums in left cluster |
| `src/pages/Visualiser/DiscographyNav.css` | Left cluster + Albums link styles |

## Out of scope

- Album index page (`AlbumIndexPage`) layout
- Upload modal
- Collapse/expand behavior
- Track list grouping / album data model
- Visualiser kit components

## Acceptance

1. Header shows two balanced clusters: identity/nav left, tools right.
2. “Discography” and “Albums” are visually distinct (gap + typography hierarchy).
3. Albums remains a working link to `/visualiser/albums`.
4. Upload and collapse look and behave as before.
5. Collapsed sidebar state unchanged.
