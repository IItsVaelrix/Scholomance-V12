# Scholomance Update Ledger Design

**Date:** 2026-07-19  
**Status:** Approved for implementation planning  
**Surface:** Landing page (`/`) — twin-gate composition  

## Purpose

Add a **Scholomance Update Ledger** to the landing chamber so visitors can see curated summaries of what shipped, while the Enter portal remains the primary call to action. The ledger is a public chronicle voice — informed by commit history, never a raw GitHub commit dump.

## Goals

- Twin-gate landing: Enter portal on the left, Update Ledger window on the right, symmetrically aligned.
- Curated entries: date + title + 1–2 sentence summary.
- Show the latest ~30 entries with in-window scroll.
- Construct the ledger chrome/structure with **DivWand** and the title/voice accents with **Wand** (same division of labor as the grimoire landing PDR).
- Maintain entries via a promptable Node script that prepends to a static JSON file (newest first).

## Non-Goals

- Live GitHub API fetch on page load.
- Showing raw SHAs, authors, or commit messages as the primary UI.
- Embedding the full Wand / DivWand authoring studios on `/`.
- Dashboard cards, stats strips, or promo stickers over the storm.
- Melting the ledger with the watercolor dissolve (dissolve stays on the orb only).

## Approach

**Twin-gate Landing + static curated JSON**, rendered through DivWand layout + Wand voice.

| Concern | Owner |
|---|---|
| Chamber scene, storm, moon, dissolve → `/read` | Existing Landing |
| Twin-gate placement (orb left, ledger right) | Landing layout |
| Ledger window structure / glass chrome | DivWand layout proposal + DivWand CSS variants |
| Ledger title glyph / entry emphasis | Wand chrome tokens / role styling |
| Entry content | `src/data/update-ledger.json` |
| Authoring new entries | `scripts/add-update-ledger-entry.mjs` |

## Layout & Composition

The landing scene remains one chamber (storm, moon, vignette). Inside it:

- **Left:** existing Enter scrying-orb / portal gate (click → watercolor dissolve → `/read`), shifted left of center.
- **Right:** Scholomance Update Ledger window, same vertical centerline, mirrored horizontal offset.
- Shared storm / moon / vignette stay full-bleed behind both.
- **Desktop:** clear left/right symmetry.
- **Narrow viewports:** stack portal above ledger (or compact tall ledger) so neither becomes unreadable.
- Ledger chrome reuses portal / DivWand / Wand tokens (amethyst, arc-blue, gold) so it reads as chamber glassware, not a SaaS panel.

## Data Model

**File:** `src/data/update-ledger.json`

```json
[
  {
    "id": "2026-07-19-song-stats-metrics",
    "date": "2026-07-19",
    "title": "CODEx Metrics meet Song Stats",
    "summary": "The Read page Metrics panel now draws from the Song Stats engine so lexical density and flow read as one chronicle."
  }
]
```

| Field | Rule |
|---|---|
| `id` | Stable string; script-generated (`YYYY-MM-DD` + slug from title) |
| `date` | ISO `YYYY-MM-DD` |
| `title` | Short impact line |
| `summary` | 1–2 sentences |
| Order | Newest first |
| Display cap | UI shows latest **30** entries (file may hold more) |

**Empty state:** If zero valid entries, the window still renders with “Chronicle awaiting first entry” so twin-gate symmetry does not break.

**Not shown in UI:** git SHAs, authors, GitHub links. Commits inform the human/agent writing the entry; the ledger is the public voice.

## Curation Script

**File:** `scripts/add-update-ledger-entry.mjs`

Behavior:

1. Prompt for `title` and `summary` (date defaults to today; optional override).
2. Validate non-empty title/summary and reasonable summary length.
3. Generate `id` from date + title slug.
4. Prepend the entry to `src/data/update-ledger.json` with stable formatting.
5. Exit non-zero on validation or I/O failure (fail closed; no partial write).

## DivWand + Wand Construction

### DivWand (structure)

- Author a fixed DivWand layout proposal for the ledger shell:
  - Outer glassmorphic / neon-border frame
  - Header region for the ledger title
  - Obsidian scroll content region
  - Entry rows as text nodes (date, title, summary)
  - Empty-state text node when needed
- Render with DivWand’s layout-node model and `DivWandPage.css` variants (same consumption pattern Combat already uses for HUD chrome).
- Landing does **not** mount the DivWand sandbox, inspector, presets bar, or proposal editor.
- Validate the shell proposal once (same spirit as `validateDivProposal`) before mount; invalid shell → empty-state chrome, never a white screen.

### Wand (voice)

- Title treatment for **Scholomance Update Ledger** uses Wand chrome tokens / glyph emphasis (not ad-hoc marketing CSS).
- Entry hierarchy: quiet date line, stronger title, softer summary.
- Motion stays consistent with Wand/DivWand (`framer-motion` where already used) and honors `prefers-reduced-motion`.

### Landing ownership

- Twin-gate flex/grid row only.
- `WatercolorDissolve` wraps the orb (left gate) only — not the ledger.
- Focus order: orb first, then ledger region.

## Chrome & Motion

**Chrome**

- Tall glass panel: dark crystal frame, thin amethyst/arc-blue edge light, soft gold corner accents.
- Header: Scholomance Update Ledger.
- Inner scroll: parchment-dark / obsidian list — not a white card stack.
- Clear typographic hierarchy; no chips, stats, or floating stickers on the storm.

**Motion (2–3 intentional effects)**

1. **Ignition** — on load, frame edge-light breathes in once.
2. **Living rim** — slow, low-amplitude shimmer along the glass edge while idle.
3. **Entry reveal** — newest entries fade/rise slightly as they enter the scroll viewport.

**Restraint**

- `prefers-reduced-motion: reduce` → static chrome; no shimmer/stagger.
- Motion never blocks Enter or reading.
- No detached promo badges over hero media.

## Interaction & Accessibility

- Orb click / Enter / Space still enters the app (unchanged).
- Ledger is read-only: pointer scroll + keyboard scroll when focused.
- Clicking ledger text does not navigate to `/read`.
- Ledger is a named region (`Scholomance Update Ledger`); entries are list items.
- Contrast remains readable on glass; summary text must not vanish into glow.

## Error Handling

| Failure | Behavior |
|---|---|
| Missing / unreadable JSON | Empty-state chronicle copy; Landing remains usable |
| Malformed entry objects | Skip invalid rows; show valid ones up to 30 |
| Invalid DivWand shell proposal | Empty-state chrome; no crash |
| Script validation failure | No file write; non-zero exit |

## Components / Files

| Path | Role |
|---|---|
| `src/pages/Landing/LandingPage.jsx` | Twin-gate composition; wire orb + ledger |
| `src/pages/Landing/LandingPage.css` | Twin-gate placement / responsive stack |
| `src/pages/Landing/UpdateLedgerWindow.jsx` (or equivalent) | Consumes DivWand layout + Wand voice; binds curated data |
| `src/data/update-ledger.json` | Curated entries |
| `src/pages/DivWand/...` + `DivWandPage.css` | Layout primitives / variants reused (extract shared renderer if needed; do not fork styles blindly) |
| `src/pages/Wand/...` + `WandPage.css` tokens | Title / emphasis voice |
| `scripts/add-update-ledger-entry.mjs` | Prompt + prepend helper |
| Tests under `tests/` | Script + Landing smoke / a11y |

Exact extract-vs-import boundaries for `LayoutNode` may be refined in the implementation plan; the contract is: Landing consumes DivWand rendering, it does not reimplement glass variants from scratch.

## Verification

- Script unit/smoke: prepends a valid entry; rejects empty fields.
- Landing smoke: orb + named ledger region render; fixture entries appear.
- Responsive smoke: twin-gate on desktop width; usable stack on narrow.
- Reduced-motion path does not throw; shimmer/stagger disabled.
- Enter path still dissolves to `/read`.

## Success Criteria

1. A visitor on `/` sees the portal on the left and a powerful, elegant ledger window on the right.
2. The ledger shows curated date/title/summary entries (up to 30), not raw commits.
3. New entries are added via the prompt script into static JSON.
4. The window is visibly built from DivWand structure + Wand voice.
5. Entering Scholomance still works exactly as today.
