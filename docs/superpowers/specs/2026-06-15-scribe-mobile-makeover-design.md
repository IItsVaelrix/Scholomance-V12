# Scribe Page — Universal Mobile Makeover

**Date:** 2026-06-15  
**Status:** Approved  
**Scope:** `src/pages/Read/ReadPage.jsx` mobile render branch (`< 640px`)

---

## Goal

Rework the Scribe page mobile layout from its current "desktop-shrunk-to-phone" state into a true **phone-native IDE experience**: editor occupies full attention, all tools are one tap away, every surface touched feels tactile via haptic feedback.

---

## Section 1 — Layout Architecture

### Shell zones

```
┌─────────────────────────────┐
│  TopBar (48px)              │  title · edit btn · settings
├─────────────────────────────┤
│                             │
│  Content Area (flex: 1)     │  Editor -or- active panel
│                             │  fills 100% of this space
│                             │
├─────────────────────────────┤
│  Bottom Nav (52px + safe)   │  5 tabs, fixed
└─────────────────────────────┘
```

### What is removed

| Removed element | Reason |
|----------------|--------|
| `ide-mobile-hero` (eyebrow, title, description, meta-grid) | Consumes ~30% of screen before user reaches editor |
| `ide-mobile-stage` wrapper + stage-header per tab | Verbose chrome; each tab switch re-narrates itself |
| `ide-mobile-status-strip` at bottom | Data folds into Editor tab subtitle in bottom nav |

### What stays unchanged

- `TopBar` — title, edit button, new scroll, settings icon, aurora level toggle
- `ScrollEditor` — renders directly into content area, full-bleed, no wrapper chrome
- Non-editor panels (`ScrollList`, `SearchPanel`, `ToolsSidebar`, `HeuristicScorePanel`) — render full-bleed into content area when their tab is active

### Breakpoints (unchanged)

- `< 640px` → this new mobile shell
- `640–959px` → existing narrow desktop layout (out of scope)
- `≥ 960px` → existing full desktop layout (out of scope)

---

## Section 2 — Bottom Navigation Bar

### Structure

Fixed to the bottom of the viewport, above safe area inset.

```
┌──────┬──────┬──────┬──────┬──────┐
│  [Q] │  [S] │  [O] │  [H] │  [P] │
│EDITOR│SCROLLS│ORACLE│  HEX │POWER │
└──────┴──────┴──────┴──────┴──────┘
        52px + env(safe-area-inset-bottom)
```

### PixelBrain sigil icons

Custom 24×24 SVG sigils authored via `svg-path-builder.js` conventions. Single-color paths, no fills — `currentColor` tinted so they inherit school accent + CSS `filter: drop-shadow` glow.

Stored at `src/pages/Read/assets/nav-sigils/`:

| Tab | File | Sigil concept |
|-----|------|--------------|
| Editor | `sigil-editor.svg` | Quill nib with single descending stroke |
| Scrolls | `sigil-scrolls.svg` | Furled scroll with two roller ends |
| Oracle | `sigil-oracle.svg` | Eye with vertical slit pupil |
| Hex | `sigil-hex.svg` | Hexagon with inner spark |
| Power | `sigil-power.svg` | Upward lightning bolt in circle |

### Active state

- Icon + label glow in `--read-accent` (current school color)
- Thin accent line (`2px`, `scaleX 0→1` spring animation) above the active button
- Inactive: muted gold, no glow

### Editor tab special behavior

When Editor tab is active, a subtitle below the label shows:
- Cursor position: `Ln 4 · Col 12`
- If scroll has a Power score: `82 Power` (replaces cursor pos)

This replaces the `ide-mobile-status-strip` entirely.

### Accessibility

- `<nav role="tablist">`, each button `role="tab"` + `aria-selected`
- `padding-bottom: max(12px, env(safe-area-inset-bottom))` for notch-safe spacing
- No hover states (touch-only surface); `:focus-visible` ring for keyboard a11y

### Haptics

- Any tab press → `haptic('tap')` — 8ms pulse
- Switching to Editor tab → `haptic('select')` — 12ms (feels like landing)
- Tapping already-active tab → no haptic

---

## Section 3 — Bottom Sheets

Two surfaces replace existing overlays with bottom sheets: **Hex controls** and **Word lookup**.

### Shared sheet anatomy

- Spring entrance: `transform: translateY(100%) → translateY(0)`, `stiffness: 400, damping: 40`
- Backdrop: `rgba(0,0,0,0.55)` blur — tap to dismiss
- Drag handle pill: `36×4px`, rounded, centered at top
- Two snap heights: **half-screen** (default open) and **full-screen** (drag up)
- Dismisses on drag-down past 40% sheet height, or backdrop tap
- Fast downward flick always dismisses regardless of position (velocity threshold)

### Hex Sheet

Triggered by tapping the Hex tab in the bottom nav.

```
┌──────────────────────────────┐
│           ▬▬▬               │  drag handle
│  OPTICS                      │
│  Truesight          [ ON ]   │
│  Symmetrical        [ OFF ]  │
│  Lattice Grid       [ OFF ]  │
│  ANALYSIS                    │
│  ○ None  ○ Astrology ○ Rhyme │
│  SCHOOL                      │
│  [♩ Sonic] [◬ Psychic] ...   │
│  FEEL                        │
│  Haptic Feedback    [ OFF ]  │
└──────────────────────────────┘
```

- Toggle buttons use existing `settings-toggle` pattern
- School chips: school glyph + name, active one glows in school color
- New **FEEL** section exposes the `hapticEnabled` user setting

### Word Sheet

Replaces the floating `WordTooltip` on mobile entirely.

- Opens on Truesight word tap as a half-screen sheet from the bottom
- Same content as existing `WordTooltip`: phonemes, definitions, rhyme suggestions, session navigation arrows
- Suggestion tap → `haptic('select')` + `haptic('success')` with 40ms gap

### Sheet haptics

| Event | Pattern |
|-------|---------|
| Sheet opens | `haptic('open')` — `[6, 2]` double pulse |
| Sheet dismisses | `haptic('dismiss')` — `[4]` single |
| Snap half↔full | `haptic('snap')` — `[8]` |
| Toggle fired | `haptic('toggle')` — `[10]` |
| Suggestion applied | `haptic('select')` + `haptic('success')` |

---

## Section 4 — Haptic Feedback System

### Hook: `useHaptic`

**File:** `src/hooks/useHaptic.ts`

Wraps `navigator.vibrate()` with named patterns. Fails silently where unsupported (iOS Safari).

```ts
const { haptic } = useHaptic();
haptic('tap');
haptic('success');
```

### Pattern vocabulary

| Name | Pattern (ms) | Semantic |
|------|-------------|----------|
| `tap` | `[8]` | Tab press, generic button, word tap |
| `select` | `[12]` | Landing on Editor tab, picking a suggestion |
| `toggle` | `[10]` | Settings toggle on/off |
| `open` | `[6, 2]` | Bottom sheet opens |
| `dismiss` | `[4]` | Bottom sheet dismisses |
| `snap` | `[8]` | Sheet snaps between heights |
| `success` | `[8, 40, 16]` | Scroll saved, XP awarded |
| `error` | `[20, 10, 20]` | Save failed, analysis offline |

### Rules

- Support check (`navigator.vibrate`) runs once on mount via `useRef` — no repeated checks
- Does **not** gate on `prefers-reduced-motion` (haptics are a separate sensory channel)
- Gates on `hapticEnabled` user setting (stored in `useUserSettings`, **off by default, opt-in**)
- User discovers and toggles it via the FEEL section in the Hex sheet

---

## Section 5 — Transitions & Animation

### Tab switching

- Content area cross-fade only: `opacity 0→1, 120ms, ease-out`
- No slide animation — avoids conflict with editor scroll momentum
- Exit is instant; only entrance fades in (no `AnimatePresence` exit)
- Bottom nav active indicator: accent line `scaleX 0→1`, spring `stiffness 300 damping 30`

### Bottom sheet open/close

- Open: `translateY(100%) → translateY(0)`, Framer Motion spring `stiffness 400 damping 40`
- Close: `translateY(0) → translateY(100%)`, `200ms ease-in`
- Backdrop: `opacity 0→1` over `150ms` on open, instant on close

### Sheet drag

- `useDragControls` on handle pill + sheet body
- `dragConstraints` clamped between full-screen top and viewport bottom
- On release: snap to nearest anchor or dismiss if below threshold
- Drag velocity factored into snap — fast flick down always dismisses

### School color transitions

```css
@property --read-accent {
  syntax: '<color>';
  inherits: true;
  initial-value: #6548b8;
}

.ide-layout-wrapper {
  transition: --read-accent 300ms ease;
}
```

Progressive enhancement — falls back to instant switch on unsupported browsers.

### Reduced motion

All springs → `duration: 0`. Cross-fades → instant swap. Sheet open/close → instant. Respect `prefers-reduced-motion: reduce`.

---

## Files Changed

| File | Change |
|------|--------|
| `src/pages/Read/ReadPage.jsx` | Replace mobile render branch with new shell |
| `src/pages/Read/IDE.css` | Replace `.ide-mobile-*` classes with new layout + nav + sheet styles |
| `src/hooks/useHaptic.ts` | New hook |
| `src/pages/Read/MobileBottomNav.jsx` | New component |
| `src/pages/Read/MobileBottomSheet.jsx` | New shared sheet component |
| `src/pages/Read/MobileHexSheet.jsx` | Hex controls sheet |
| `src/pages/Read/MobileWordSheet.jsx` | Word lookup sheet (replaces WordTooltip on mobile) |
| `src/pages/Read/assets/nav-sigils/*.svg` | 5 new PixelBrain sigil SVGs |
| `src/hooks/useUserSettings.js` | Add `hapticEnabled` setting |

---

## Constraints

- **Sovereign Editor Principle**: no changes to scroll save/autosave behavior. Only rendering layer changes.
- **Layer law**: all changes live in `src/pages/Read/` (UI domain — Claude's jurisdiction). No `codex/` changes.
- **Law 9**: no module-scoped mutable state in new components. All instance caches in `useRef`.
- **Law 10**: no hardcoded z-indexes > 1. Sheet uses `Z_OVERLAY` (100), backdrop uses `Z_OVERLAY - 1`.
