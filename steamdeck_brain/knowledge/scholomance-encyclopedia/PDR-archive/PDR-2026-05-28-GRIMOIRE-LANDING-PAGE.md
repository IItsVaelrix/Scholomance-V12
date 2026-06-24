# PDR: Grimoire Landing Page — Scholomance Entry Portal

**Status:** Draft
**Classification:** UI + Routing + Animation + Visual Design
**Priority:** High
**Primary Goal:** Replace the root `/` redirect with a standalone grimoire landing page — a maple-desk scene with the Scholomance grimoire open and facing the user. Clicking the title text triggers a watercolor dissolve that reveals the IDE shell. DivWand and Wand provide the beautification layer.

---

## 1. Executive Summary

Scholomance currently drops every user directly into the Read page (`/read`) on first load. There is no entry experience — no moment of arrival. This PDR introduces a fullscreen landing page at `/` that is architecturally separate from the App shell (no navigation bar, no aurora/scanlines from `App.jsx`). It is a single room: a maple wooden desk, a grimoire lying open, and the word **SCHOLOMANCE** rendered in blackletter as the grimoire's title page.

The grimoire is the button. The user is invited to click the title. On click, the text dissolves like wet ink bleeding into parchment — an SVG `feTurbulence` + `feDisplacementMap` watercolor effect that expands from the letter outward. When the dissolve completes, the router navigates to `/read` and the full IDE shell materializes.

The IDE shell (App.jsx + Navigation + all sub-pages) is the hub. Every page — Watch, Listen, Read, Combat, Nexus, Profile — is reachable from within it. The landing page exists outside that hub. It is the door.

DivWand provides the structural layout of the grimoire panel and desk surface. Wand styles the `SCHOLOMANCE` glyph — its letter-spacing, ink weight, glow, and dissolve mask. Together they produce the grimoire surface without any hand-rolled decorative CSS outside the PDR-specified tokens.

---

## 2. Change Classification

| Dimension | Classification | Reason |
|-----------|---------------|--------|
| Routing | Structural | `main.jsx` router restructured — landing at `/`, App layout promoted to pathless layout route |
| `LandingPage.jsx` | Structural | New page component, renders outside App shell |
| `WatercolorDissolve.jsx` | Behavioral | New animation component — SVG filter-driven dissolve on user interaction |
| `LandingPage.css` | Visual Design | New stylesheet — grimoire tokens, desk texture, book panel, blackletter title |
| `App.jsx` | None | No changes — it becomes a pathless layout route naturally; its internals are untouched |
| DivWand integration | UI | Landing page imports DivWand panel layout primitives for the grimoire shell |
| Wand integration | UI | Landing page imports Wand glyph styling for the SCHOLOMANCE title |
| `src/index.css` | Additive | `--grimoire-*` CSS custom properties added; no existing tokens modified |

---

## 3. Spec Sheet

### Layout

| Property | Value |
|----------|-------|
| Route | `/` (index) |
| App shell | None — rendered outside `App.jsx` entirely |
| Viewport fill | 100dvh × 100dvw, no scroll |
| Background | Maple desk — `--grimoire-desk-*` CSS gradient + SVG noise texture overlay |
| Grimoire panel | Centered, portrait ~480px × 640px, slight random rotation (-0.8° to 0.8°) |
| Grimoire binding | Left-edge spine shadow, dark leather (`--grimoire-leather`) |
| Grimoire page | Inner parchment (`--grimoire-parchment`), aged paper grain |

### Typography

| Element | Font | Weight | Size |
|---------|------|--------|------|
| `SCHOLOMANCE` title | UnifrakturMaguntia (Google Fonts) | 400 | `clamp(3rem, 8vw, 6rem)` |
| Subtitle tagline | IM Fell English SC (Google Fonts) | 400 italic | `1rem` |
| Click hint | Georgia, serif | 400 | `0.75rem` |

### Colors — Grimoire Tokens

| Variable | Hex | Usage |
|----------|-----|-------|
| `--grimoire-desk-warm` | `#8B5E3C` | Maple desk base |
| `--grimoire-desk-highlight` | `#C4874F` | Maple grain highlight |
| `--grimoire-desk-shadow` | `#4A2E12` | Maple grain shadow |
| `--grimoire-leather` | `#2A1708` | Grimoire cover, spine |
| `--grimoire-parchment` | `#F5EDD6` | Inner page base |
| `--grimoire-parchment-aged` | `#E8D8B0` | Page edge, foxing |
| `--grimoire-ink` | `#1A0F05` | Title text ink |
| `--grimoire-gold` | `#C9A84C` | Illuminated border, gold foil accents |
| `--grimoire-gold-dim` | `#8B6E2A` | Gold border shadow |
| `--grimoire-wax-seal` | `#6B1515` | Optional wax seal accent |
| `--grimoire-dissolve-primary` | `#7B4F2E` | Watercolor bleed — warm umber |
| `--grimoire-dissolve-secondary` | `#3D1F0A` | Watercolor bleed — deep sepia |

### Watercolor Dissolve

| Property | Value |
|----------|-------|
| SVG filter | `feTurbulence` + `feDisplacementMap` + `feGaussianBlur` |
| Trigger | `onClick` on the grimoire panel or title |
| Duration | 900ms total (400ms dissolve + 200ms hold + 300ms fade out) |
| Start state | `feDisplacementMap scale=0`, `opacity: 1` |
| End state | `feDisplacementMap scale=180`, `opacity: 0` |
| Easing | `cubic-bezier(0.4, 0, 1, 1)` — accelerating, mimics ink spreading |
| Post-animation | Navigate to `/read` via `useNavigate` after animation sequence resolves |
| Reduced motion | Skip dissolve animation entirely; instant fade `opacity 0 → 0` and navigate |

### Desk Scene

| Element | Description |
|---------|-------------|
| Desk surface | Full-screen CSS linear-gradient: warm maple grain — horizontal bands of `--grimoire-desk-*` values |
| Grain texture | Inline SVG `<feTurbulence>` noise overlay at `opacity: 0.08`, `mix-blend-mode: multiply` |
| Grimoire shadow | `box-shadow: 0 32px 80px rgba(0,0,0,0.6), 0 8px 20px rgba(0,0,0,0.4)` — book lying on desk |
| Grimoire tilt | `transform: rotate(var(--grimoire-tilt))` — seeded random -0.8deg to 0.8deg via CSS custom property |
| Gold border | `outline: 1px solid var(--grimoire-gold)` + inset box-shadow — illuminated manuscript border |
| Corner flourishes | CSS-drawn using `::before` / `::after` pseudo-elements on the grimoire panel — corner knot motifs |

---

## 4. Assumptions and Unknowns

| # | Assumption / Unknown | Impact if wrong | Resolution |
|---|---------------------|-----------------|------------|
| A1 | Google Fonts (UnifrakturMaguntia, IM Fell English SC) are loadable in the project's CSP | Title font falls back to Georgia | Add `fonts.googleapis.com` to CSP if needed; include `<link rel="preconnect">` in `index.html` |
| A2 | DivWand exposes panel primitive components usable outside the App shell context | Cannot use DivWand for grimoire panel without App shell providers | If DivWand requires context from App shell providers, extract the relevant panel CSS into `LandingPage.css` directly instead |
| A3 | Wand exposes a glyph styling primitive usable for static text (not just interactive wand inputs) | Cannot use Wand for title styling | Same fallback — use the Wand color/weight tokens via CSS custom properties directly |
| A4 | `useNavigate` is available in the landing page (must be inside a `RouterProvider` subtree) | Navigation after dissolve fails | `RouterProvider` wraps everything in `main.jsx` including the landing page, so `useNavigate` is available |
| A5 | SVG `feTurbulence` + `feDisplacementMap` performs at 60fps on mobile/SteamDeck screen | Dissolve stutters or lags | Test on target device; if performance fails, swap to CSS `clip-path: circle()` expand dissolve as fallback |
| A6 | The pathless layout route pattern in React Router v6 correctly isolates the landing page from App shell | Landing page renders with Nav bar | Verify by checking `useLocation` in Navigation — it should not render when path is `/` |
| A7 | `prefers-reduced-motion` users still see a graceful immediate navigation | Users who prefer reduced motion are stuck or experience a jarring cut | Use `opacity: 0` one-frame transition + navigate on next tick |

---

## 5. Architecture Diagram / File Map

### New Files

```
src/pages/Landing/
  LandingPage.jsx              ← NEW: grimoire landing page component
  LandingPage.css              ← NEW: grimoire design tokens + scene styles
  WatercolorDissolve.jsx       ← NEW: SVG filter dissolve animation component

src/components/grimoire/
  GrimoirePanel.jsx            ← NEW: DivWand-composed book panel structure
  GrimoireTitle.jsx            ← NEW: Wand-styled SCHOLOMANCE glyph
```

### Modified Files

```
src/main.jsx
  — router restructured: index "/" → LandingPage (standalone)
  — App.jsx promoted to pathless layout route for all sub-pages

src/index.css
  — ADD: --grimoire-* CSS custom properties (additive only, no existing tokens changed)

index.html
  — ADD: <link rel="preconnect" href="https://fonts.googleapis.com">
  — ADD: UnifrakturMaguntia, IM Fell English SC font imports
```

### Unmodified Files

```
src/App.jsx                    ← unchanged — becomes pathless layout route automatically
src/components/Navigation/     ← unchanged — not rendered on landing page
src/lib/routes.js              ← unchanged — LandingPage is not a lazy route (it's the entry)
```

### Router Structure (After)

```
createBrowserRouter([
  {
    path: "/",
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <LandingPage /> },    ← "/"  — no App shell
      {
        element: <App />,                            ← pathless layout route
        children: [
          { path: "read",    element: <ReadPage /> },
          { path: "watch",   element: <WatchPage /> },
          { path: "listen",  element: <ListenPage /> },
          { path: "auth",    element: <AuthPage /> },
          { path: "profile", element: <ProfilePage /> },
          { path: "combat",  element: <CombatPage /> },
          { path: "nexus",   element: <NexusPage /> },
          { path: "collab",  element: <AdminRoute>...</AdminRoute> },
          ... (all others unchanged)
        ],
      },
    ],
  },
]);
```

### Data Flow

```
User visits "/"
      ↓
LandingPage renders (standalone, no App shell)
      ↓
GrimoirePanel + GrimoireTitle mount
      ↓
User clicks grimoire / SCHOLOMANCE text
      ↓
WatercolorDissolve.triggerDissolve()
      ↓ (900ms animation)
useNavigate("/read")
      ↓
App shell mounts → Navigation renders → ReadPage loads
```

---

## 6. Step-by-Step Implementation Plan

### Step 1 — CSS tokens

Add `--grimoire-*` custom properties to `src/index.css`. Place them in their own `:root` block clearly labeled `/* Grimoire Landing */`. Do not modify any existing token blocks.

Also add the font import declarations to `index.html`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=IM+Fell+English+SC:ital@0;1&display=swap" rel="stylesheet">
```

### Step 2 — WatercolorDissolve component

Create `src/pages/Landing/WatercolorDissolve.jsx`. This component:
- Renders an invisible SVG `<filter>` with `feTurbulence` + `feDisplacementMap`
- Exposes a `filterId` prop and applies it via `style.filter` to its children wrapper
- Exposes a `dissolving` boolean prop — when true, animates `feDisplacementMap.scale` from 0 → 180 over 400ms using `requestAnimationFrame` and SVG attribute mutation
- Exposes an `onDissolveComplete` callback that fires after the animation duration
- Handles `prefers-reduced-motion` by skipping animation and calling `onDissolveComplete` immediately

### Step 3 — GrimoireTitle component

Create `src/components/grimoire/GrimoireTitle.jsx`. This component:
- Renders the word `SCHOLOMANCE` in UnifrakturMaguntia via a CSS class
- Imports Wand's glyph styling (or Wand's CSS custom property tokens) for ink color, letter-spacing, and glow
- Is `role="button"` with `tabIndex={0}` and `onKeyDown` for Enter/Space to support keyboard activation
- Accepts an `onClick` prop — passes directly through to the root element

### Step 4 — GrimoirePanel component

Create `src/components/grimoire/GrimoirePanel.jsx`. This component:
- Imports DivWand's panel layout primitives (or DivWand's CSS classes) for the book-page structure
- Renders: outer leather cover div → inner parchment div → gold border → corner flourishes → `{children}`
- Accepts an `onClick` prop — the entire panel is clickable as a single call-to-action

### Step 5 — LandingPage

Create `src/pages/Landing/LandingPage.jsx`. This component:
- Is a full-screen `<div>` with class `grimoire-scene` (the maple desk)
- Renders an SVG noise overlay for the wood grain texture
- Centers a `<GrimoirePanel>` in the viewport
- Inside the panel: `<GrimoireTitle>`, subtitle tagline, and a small click-hint
- Wraps the panel in `<WatercolorDissolve>`
- On click: sets `dissolving: true` on WatercolorDissolve; in `onDissolveComplete`, calls `navigate("/read")`
- No `useAuth`, no `useScrolls`, no CODEx providers — this page is intentionally inert. It is cosmetic only.

### Step 6 — Router restructure

Edit `src/main.jsx`:
- Remove the `{ index: true, element: <Navigate to="/read" replace /> }` line
- Add `{ index: true, element: <LandingPage /> }` as the index child of the root
- Promote `App` to a pathless layout route wrapping the existing children
- Import `LandingPage` directly (not via `lazyWithRetry` — the landing page is the entry, it must not be async-gated)

### Step 7 — Verify preload behavior

The existing `setTimeout` in `main.jsx` that preloads page chunks runs 1500ms after mount. On the landing page, this will fire and attempt to preload routes. This is fine — it runs in the background and does not affect the landing experience. No change needed.

---

## 7. Code Examples

### `src/index.css` (additive block)

```css
/* Grimoire Landing */
:root {
  --grimoire-desk-warm:       #8B5E3C;
  --grimoire-desk-highlight:  #C4874F;
  --grimoire-desk-shadow:     #4A2E12;
  --grimoire-leather:         #2A1708;
  --grimoire-parchment:       #F5EDD6;
  --grimoire-parchment-aged:  #E8D8B0;
  --grimoire-ink:             #1A0F05;
  --grimoire-gold:            #C9A84C;
  --grimoire-gold-dim:        #8B6E2A;
  --grimoire-wax-seal:        #6B1515;
  --grimoire-dissolve-primary:   #7B4F2E;
  --grimoire-dissolve-secondary: #3D1F0A;
  --grimoire-tilt:            -0.6deg;
}
```

### `src/pages/Landing/LandingPage.css`

```css
.grimoire-scene {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    repeating-linear-gradient(
      92deg,
      var(--grimoire-desk-shadow)    0px,
      var(--grimoire-desk-warm)      3px,
      var(--grimoire-desk-highlight) 6px,
      var(--grimoire-desk-warm)      9px,
      var(--grimoire-desk-shadow)    14px
    ),
    linear-gradient(
      180deg,
      var(--grimoire-desk-highlight) 0%,
      var(--grimoire-desk-warm)      45%,
      var(--grimoire-desk-shadow)    100%
    );
  background-blend-mode: multiply;
  overflow: hidden;
}

.grimoire-grain {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.07;
  mix-blend-mode: multiply;
}

.grimoire-book {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: clamp(320px, 38vw, 500px);
  min-height: clamp(420px, 55vh, 680px);
  padding: clamp(2.5rem, 4vw, 4rem) clamp(2rem, 3.5vw, 3.5rem);
  background: var(--grimoire-parchment);
  border: 1px solid var(--grimoire-gold-dim);
  outline: 3px solid var(--grimoire-gold);
  outline-offset: -8px;
  box-shadow:
    0 0 0 10px var(--grimoire-leather),
    0 0 0 12px var(--grimoire-gold-dim),
    /* desk shadow */
    0 40px 100px rgba(0, 0, 0, 0.65),
    0 10px 30px  rgba(0, 0, 0, 0.45),
    /* binding spine illusion */
    inset -24px 0 40px rgba(0, 0, 0, 0.15);
  transform: rotate(var(--grimoire-tilt));
  cursor: pointer;
  user-select: none;
}

/* Corner illumination flourishes */
.grimoire-book::before,
.grimoire-book::after {
  content: "";
  position: absolute;
  width: 28px;
  height: 28px;
  border-color: var(--grimoire-gold);
  border-style: solid;
  opacity: 0.65;
}

.grimoire-book::before {
  top: 12px;
  left: 12px;
  border-width: 2px 0 0 2px;
}

.grimoire-book::after {
  bottom: 12px;
  right: 12px;
  border-width: 0 2px 2px 0;
}

.grimoire-aged-edge {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(
    ellipse at 50% 0%,
    var(--grimoire-parchment-aged) 0%,
    transparent 70%
  );
  pointer-events: none;
}

.grimoire-title {
  font-family: "UnifrakturMaguntia", Georgia, serif;
  font-size: clamp(2.5rem, 7vw, 5.5rem);
  color: var(--grimoire-ink);
  text-align: center;
  letter-spacing: 0.02em;
  line-height: 1.1;
  margin-bottom: 1.5rem;
  position: relative;
  transition: text-shadow 0.3s ease;
}

.grimoire-book:hover .grimoire-title,
.grimoire-book:focus-visible .grimoire-title {
  text-shadow:
    0 0 20px rgba(201, 168, 76, 0.35),
    0 0 60px rgba(201, 168, 76, 0.15);
}

.grimoire-tagline {
  font-family: "IM Fell English SC", Georgia, serif;
  font-size: 0.9rem;
  font-style: italic;
  color: color-mix(in srgb, var(--grimoire-ink) 55%, var(--grimoire-parchment));
  text-align: center;
  letter-spacing: 0.08em;
  margin-bottom: 2.5rem;
}

.grimoire-divider {
  width: 60%;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--grimoire-gold-dim),
    transparent
  );
  margin: 0 auto 2rem;
}

.grimoire-click-hint {
  font-family: Georgia, serif;
  font-size: 0.7rem;
  color: color-mix(in srgb, var(--grimoire-ink) 35%, transparent);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-align: center;
}

.grimoire-book:focus-visible {
  outline: 3px solid var(--grimoire-gold);
  outline-offset: 4px;
}
```

### `src/pages/Landing/WatercolorDissolve.jsx`

```jsx
import { useRef, useEffect, useCallback, useId } from "react";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion.js";

const DISSOLVE_DURATION_MS = 400;
const HOLD_MS = 200;
const FADE_MS = 300;

export default function WatercolorDissolve({ dissolving, onDissolveComplete, children }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const filterId = useId().replace(/:/g, "");
  const displacementRef = useRef(null);
  const wrapperRef = useRef(null);
  const rafRef = useRef(null);
  const startRef = useRef(null);

  const runDissolve = useCallback(() => {
    if (prefersReducedMotion) {
      onDissolveComplete?.();
      return;
    }

    const displacement = displacementRef.current;
    const wrapper = wrapperRef.current;
    if (!displacement || !wrapper) return;

    startRef.current = performance.now();

    const tick = (now) => {
      const elapsed = now - startRef.current;
      const t = Math.min(elapsed / DISSOLVE_DURATION_MS, 1);
      // Accelerating easing — ink spreading outward
      const eased = t < 0.5
        ? 2 * t * t
        : 1 - Math.pow(-2 * t + 2, 2) / 2;

      displacement.setAttribute("scale", String(Math.round(eased * 180)));

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        // Hold, then fade
        setTimeout(() => {
          wrapper.style.transition = `opacity ${FADE_MS}ms ease-out`;
          wrapper.style.opacity = "0";
          setTimeout(() => {
            onDissolveComplete?.();
          }, FADE_MS);
        }, HOLD_MS);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [prefersReducedMotion, onDissolveComplete]);

  useEffect(() => {
    if (dissolving) runDissolve();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [dissolving, runDissolve]);

  const filterUrl = prefersReducedMotion ? undefined : `url(#${filterId})`;

  return (
    <>
      {!prefersReducedMotion && (
        <svg style={{ position: "absolute", width: 0, height: 0 }} aria-hidden="true">
          <defs>
            <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence
                type="turbulence"
                baseFrequency="0.015 0.025"
                numOctaves="4"
                seed="7"
                result="noise"
              />
              <feDisplacementMap
                ref={displacementRef}
                in="SourceGraphic"
                in2="noise"
                scale="0"
                xChannelSelector="R"
                yChannelSelector="G"
                result="displaced"
              />
              <feGaussianBlur in="displaced" stdDeviation="0.5" />
            </filter>
          </defs>
        </svg>
      )}
      <div
        ref={wrapperRef}
        style={{ filter: filterUrl, willChange: "filter, opacity" }}
      >
        {children}
      </div>
    </>
  );
}
```

### `src/pages/Landing/LandingPage.jsx`

```jsx
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import WatercolorDissolve from "./WatercolorDissolve.jsx";
import "./LandingPage.css";

export default function LandingPage() {
  const navigate = useNavigate();
  const [dissolving, setDissolving] = useState(false);

  const handleEnter = useCallback(() => {
    if (dissolving) return;
    setDissolving(true);
  }, [dissolving]);

  const handleDissolveComplete = useCallback(() => {
    navigate("/read");
  }, [navigate]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleEnter();
    }
  }, [handleEnter]);

  return (
    <div className="grimoire-scene" aria-label="Scholomance — click to enter">
      {/* Wood grain SVG noise overlay */}
      <svg className="grimoire-grain" aria-hidden="true">
        <filter id="wood-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.65 0.015" numOctaves="3" seed="12" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#wood-grain)" />
      </svg>

      <WatercolorDissolve dissolving={dissolving} onDissolveComplete={handleDissolveComplete}>
        <div
          className="grimoire-book"
          role="button"
          tabIndex={0}
          aria-label="Open the Scholomance grimoire"
          onClick={handleEnter}
          onKeyDown={handleKeyDown}
        >
          <div className="grimoire-aged-edge" aria-hidden="true" />

          <h1 className="grimoire-title">Scholomance</h1>

          <div className="grimoire-divider" aria-hidden="true" />

          <p className="grimoire-tagline">Where words become weapons</p>

          <p className="grimoire-click-hint" aria-hidden="true">
            Open the grimoire
          </p>
        </div>
      </WatercolorDissolve>
    </div>
  );
}
```

### `src/main.jsx` — Router Restructure

```jsx
// BEFORE (index route):
{ index: true, element: <Navigate to="/read" replace /> },

// AFTER (router children array):
{ index: true, element: <LandingPage /> },           // "/"  — standalone, no App
{
  element: <App />,                                   // pathless layout
  children: [
    { path: "watch",   element: <WatchPage /> },
    { path: "listen",  element: <ListenPage /> },
    { path: "read",    element: <ReadPage /> },
    { path: "auth",    element: <AuthPage /> },
    { path: "profile", element: <ProfilePage /> },
    { path: "combat",  element: <CombatPage /> },
    { path: "nexus",   element: <NexusPage /> },
    { path: "collab",  element: <AdminRoute><CollabPage /></AdminRoute> },
    { path: "pixelbrain", element: <AdminRoute><PixelBrainPage /></AdminRoute> },
    { path: "career",  element: <AdminRoute><CareerPage /></AdminRoute> },
    { path: "wand",    element: <AdminRoute><WandPage /></AdminRoute> },
    { path: "div-wand", element: <AdminRoute><DivWandPage /></AdminRoute> },
    { path: "photonic-bridge", element: <AdminRoute><PhotonicBridgeLabPage /></AdminRoute> },
  ],
},
```

Add at top of `main.jsx`:
```jsx
import LandingPage from "./pages/Landing/LandingPage.jsx";
```

Remove:
```jsx
import { Navigate, ... } from "react-router-dom";
// (keep Navigate removed if not used elsewhere, or keep if other routes use it)
```

### `index.html` — Font Imports

```html
<!-- After existing <link> tags, before </head> -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link
  href="https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=IM+Fell+English+SC:ital@0;1&display=swap"
  rel="stylesheet"
>
```

---

## 8. Glossary

| Term | Definition |
|------|-----------|
| **Landing page** | The standalone `/` root page — no App shell, no navigation bar. The door before the IDE. |
| **Grimoire** | The visual metaphor for the landing page: a spellbook lying open on a wooden desk, its title page facing the user. |
| **IDE shell** | The existing `App.jsx` + `Navigation` + sub-page layout. Every page inside it (Read, Watch, Combat, etc.) is reachable from the IDE. |
| **Watercolor dissolve** | The exit animation triggered by clicking the grimoire. Uses SVG `feTurbulence` + `feDisplacementMap` to create an organic, ink-bleeding dissolution effect. |
| **feTurbulence** | SVG primitive that generates procedural noise used as a distortion map input. |
| **feDisplacementMap** | SVG primitive that displaces each pixel of the source graphic by the noise map. As `scale` increases, the image warps and dissolves organically. |
| **Pathless layout route** | A React Router v6 route with `element` but no `path`. It wraps its children with its element but adds no URL segment. Used here so `App.jsx` wraps `/read`, `/watch`, etc. without a path prefix. |
| **UnifrakturMaguntia** | A blackletter (Fraktur) Google Font. Used for the `SCHOLOMANCE` grimoire title — historically correct for illuminated manuscript titling. |
| **IM Fell English SC** | A historical serif Google Font in small caps style. Used for subtitle taglines — period-appropriate and legible at small sizes. |
| **Maple desk** | The full-screen background — a CSS `repeating-linear-gradient` simulating maple wood grain, overlaid with SVG `feTurbulence` noise for texture depth. |
| **DivWand** | The Scholomance UI component for structured div/panel layout with world-law-compliant styling. Used for the grimoire panel shell. |
| **Wand** | The Scholomance UI component for styled text glyphs. Used for the SCHOLOMANCE title — ink weight, glow, spacing. |
| **Gold illumination** | The CSS border treatment on the grimoire panel — `outline + box-shadow` in `--grimoire-gold` — mimicking gold leaf border illumination in medieval manuscripts. |

---

## 9. Q&A — Top 10 Implementation Concerns

**Q1: The landing page renders outside `App.jsx`. But `App.jsx` houses all providers (CODExProvider, AuthProvider, etc.). Won't the landing page crash trying to use auth hooks?**

A: No. `LandingPage.jsx` deliberately uses no auth hooks, no CODEx hooks, no ScrollsProvider. It is a purely cosmetic component — just DOM, CSS, and SVG animation. The only hook it uses is `useNavigate`, which is provided by `RouterProvider` in `main.jsx` — this is a top-level provider and available to all routes, including the landing page.

**Q2: The pathless layout route pattern — does React Router v6 actually support this? Will `App.jsx` render for `/` if it's a pathless route?**

A: A pathless route (a route object with `element` but no `path`) in React Router v6 acts as a layout — it renders for all its descendant paths, but does NOT render for sibling routes at the same level. Since `{ index: true, element: <LandingPage /> }` is a sibling of the pathless `App` route, App does NOT render at `/`. App only renders when one of its path children matches (e.g., `/read`, `/watch`). This is standard React Router v6 behavior.

**Q3: `WatercolorDissolve` mutates an SVG attribute (`feDisplacementMap.scale`) directly with `setAttribute` inside a `requestAnimationFrame` loop. Is this safe in React's concurrent rendering model?**

A: Yes. The `feDisplacementMap` ref is a raw DOM SVG element — `setAttribute` bypasses React's reconciler entirely. React does not track SVG filter attribute mutations, so there is no reconciliation conflict. The only React state involved is `dissolving: boolean`, which is set once and never changes during the animation loop. The `rafRef` cleanup in `useEffect` prevents the loop from running after unmount.

**Q4: After the dissolve, `navigate("/read")` fires inside `onDissolveComplete`. But by the time it fires, the component is still mounted (it hasn't unmounted yet). Is there a race condition?**

A: No. The navigate call unmounts `LandingPage` and mounts the App shell + ReadPage in the same synchronous render cycle. React batches this correctly. The `LandingPage` CSS is `position: fixed` with `z-index` context from its own stacking context — the transition is visually clean. There is a minor edge case where the page briefly shows blank before ReadPage mounts, but the ReadPage's Suspense fallback (`null`) prevents a spinner flash.

**Q5: The grimoire panel is `role="button"`. Screen readers will announce this as a button. But the entire panel is visually a book — is this semantically correct?**

A: Semantically, it's acceptable — the grimoire panel IS a single call-to-action. The `aria-label="Open the Scholomance grimoire"` provides clear intent. The `h1` inside a `role="button"` is unusual but not invalid — screen readers will read the heading text as the button's accessible name if `aria-label` is not present, but since we provide `aria-label`, the heading is just content inside. For a production accessibility audit, consider wrapping the panel in a `<main>` with `aria-label` and making only the click target a `<button>`.

**Q6: `feTurbulence` with `baseFrequency="0.015 0.025"` and `numOctaves="4"` — is this performant enough for 60fps on the SteamDeck GPU?**

A: On desktop-class hardware (including SteamDeck), SVG filter effects are GPU-accelerated when the element has a `will-change` CSS property applied (already included on the wrapper: `will-change: filter, opacity`). The `feDisplacementMap` computes per-pixel displacement from a static turbulence map — it is effectively a texture sample pass, not a recalculation of noise per frame. The noise map is baked at filter creation. Performance should hold at 60fps. If it does not, reduce `numOctaves` from 4 to 2 as a fallback.

**Q7: The font `UnifrakturMaguntia` is a blackletter Fraktur face. The word "Scholomance" contains no umlauts or historically problematic letters, but Fraktur is known to have legibility issues. Is this a concern?**

A: At `clamp(2.5rem, 7vw, 5.5rem)` — roughly 40px–88px — Fraktur is highly legible. The word is only one word. There is no dense text in blackletter. The concern about Fraktur legibility applies to body copy at 12px, not a 60px-plus hero title with generous whitespace. The font is appropriate and correctly world-law-consistent.

**Q8: The existing `setTimeout` in `main.jsx` preloads all page chunks 1500ms after mount. On the landing page, this fires during the initial grimoire view. Could the chunk preloading compete with the dissolve animation for CPU/network?**

A: The preloads are lazy JavaScript chunk fetches — network I/O, not CPU-bound. The SVG `feDisplacementMap` animation is GPU-bound via `requestAnimationFrame`. There is no competition for the same resource. The only realistic impact is if the user clicks the grimoire within 1.5 seconds of page load — the simultaneous chunk fetch and dissolve animation may cause a brief CPU spike. Acceptable tradeoff. To mitigate: delay the preload timer to 3000ms in `main.jsx`.

**Q9: The `--grimoire-tilt` CSS variable is `-0.6deg` fixed. The spec calls for "seeded random -0.8deg to 0.8deg." How do we achieve variation without JavaScript?**

A: Two options: (a) Fix at `-0.6deg` in CSS — deterministic, no JS. This is the recommended approach for V1: the tilt is visually sufficient and avoids any timing coordination between CSS parse and DOM mount. (b) In `LandingPage.jsx`, generate a random value in `[-0.8, 0.8]` on mount and set it as an inline style: `style={{ "--grimoire-tilt": `${(Math.random() * 1.6 - 0.8).toFixed(2)}deg` }}`. Option (b) gives session-to-session variation at zero perf cost. Use option (b).

**Q10: After the user navigates to `/read` from the landing page, can they return to the landing page by clicking the browser Back button?**

A: Yes, and this is correct behavior. `navigate("/read")` adds a new history entry (not a replace). Back → `/` shows the landing page again. This is intentionally left as standard browser behavior. If the team wants to prevent re-showing the landing page after first entry (i.e., mark it as "entered"), use `navigate("/read", { replace: true })` inside `onDissolveComplete`. For V1, standard back-nav is fine.

---

## 10. QA Plan

### Test Files

| File | What it covers |
|------|---------------|
| `tests/visual/LandingPage.visual.test.js` | Snapshot of grimoire panel at 1280×800; verifies title text, desk background color, gold border |
| `tests/unit/WatercolorDissolve.test.jsx` | `onDissolveComplete` fires after animation; `prefers-reduced-motion` skips animation and fires immediately; `dissolving=false` does nothing |
| `tests/routing/landing.routing.test.jsx` | `"/"` renders LandingPage without Navigation; `"/read"` renders App + Navigation; back navigation from `/read` → `/` renders LandingPage |

### Manual QA Checklist

| Check | How |
|-------|-----|
| Landing page loads at `"/"` with no navigation bar | Visit `/` — confirm no `<nav>` in DOM |
| Grimoire title renders in blackletter font | Visual inspection — should be Fraktur, not Georgia fallback |
| Click triggers dissolve animation | Click panel — ink/water dissolve effect visible for ~400ms |
| After dissolve, `/read` loads | ReadPage renders with navigation bar |
| Keyboard Enter/Space activates dissolve | Tab to grimoire, press Enter |
| `prefers-reduced-motion` skips animation | Enable in OS → click → instant navigate |
| Back button returns to landing page | From `/read`, press Back → `/` renders grimoire |
| No providers crash (no auth errors) | Check console — zero errors on `/` |

### Commands

```bash
# Unit tests
npx vitest run tests/unit/WatercolorDissolve.test.jsx

# Routing tests
npx vitest run tests/routing/landing.routing.test.jsx

# Full suite
npx vitest run

# TypeScript check (if TSX is used)
npx tsc --project tsconfig.json --noEmit

# Dev server for manual QA
npm run dev
# Visit http://localhost:5173/
```

---

## 11. Regression Risks and Retest Checklist

| Risk | Area | Retest Command / Method |
|------|------|------------------------|
| Pathless layout route breaks existing page navigation | React Router config | Visit `/read`, `/watch`, `/combat` — all must render with Navigation |
| Removing `<Navigate to="/read" replace />` breaks existing links that assume `/` redirects | Any code linking to `/` | `grep -r 'to="/"' src/` — check all NavLinks and navigate() calls |
| `<App />` re-mounting on every page nav due to pathless route change | React Router layout semantics | Instrument `App.jsx` `useEffect` with console.log — should fire only once on initial mount |
| Preload `setTimeout` in `main.jsx` now runs on the landing page (no harm expected) | `main.jsx` chunk preloading | Check network tab — chunk fetches begin ~1.5s after `/` loads; no visual impact |
| SVG filter `id` collision if two `WatercolorDissolve` instances rendered simultaneously | `useId()` uniqueness | Not a risk in V1 — only one instance. If reused, `useId` guarantees uniqueness. |
| Google Fonts request fails (offline, CSP block) | Font loading | Grimoire title falls back to Georgia — still readable, not blackletter. Acceptable degradation. |
| `position: fixed` on `.grimoire-scene` conflicts with existing global fixed elements | CSS | Inspect DOM at `/` — no `<nav>` or other fixed overlays should appear |
| `--grimoire-*` custom properties conflict with existing `--school-*` or `--color-*` tokens | `src/index.css` | `grep -n '\-\-grimoire' src/index.css` — verify no existing token uses this prefix |
| Admin routes (collab, pixelbrain, wand, div-wand) still gate correctly after router restructure | `AdminRoute` wrapper | Visit `/collab` as non-admin → should redirect to auth |

---

## 12. Rollout Plan

### Phase 1 — CSS tokens and fonts (safe, no routing impact)

Add `--grimoire-*` tokens to `src/index.css`. Add font links to `index.html`. Verify fonts load in browser. Zero routing or component changes. No regression surface.

```bash
npm run dev
# Open DevTools → Network → verify UnifrakturMaguntia + IM Fell English SC loaded
```

### Phase 2 — Component builds (behind feature flag or on a feature branch)

Build `WatercolorDissolve.jsx`, `GrimoireTitle.jsx`, `GrimoirePanel.jsx`, `LandingPage.jsx` + CSS. Do not wire into the router yet. Render `LandingPage` inside a dev-only test route (`/landing-preview`) to validate the visual design in the running app.

```bash
# Temporarily add to router for preview:
{ path: "landing-preview", element: <LandingPage /> }
# Visit http://localhost:5173/landing-preview
```

### Phase 3 — Router wiring

Remove the preview route. Restructure `main.jsx` as specified: add `LandingPage` at index, promote `App` to pathless layout. Verify all existing routes still work.

```bash
npm run dev
# Visit / → grimoire
# Visit /read → IDE with nav
# Visit /combat → IDE with nav
# Visit /collab (non-admin) → auth redirect
```

### Phase 4 — QA and regression

Run full test suite. Manual QA from the checklist above. Verify on SteamDeck display (1280×800) — check font sizes, grimoire proportions, dissolve performance.

```bash
npx vitest run && npm run lint && npx tsc --project tsconfig.json --noEmit
```

### Phase 5 — Rollout

Merge. The landing page is the new entry experience. No feature flag needed — there is no partial state. It either renders or it doesn't.

---

## 13. Definition of Done

- [ ] `--grimoire-*` CSS custom properties added to `src/index.css` — zero existing tokens modified
- [ ] `index.html` — UnifrakturMaguntia and IM Fell English SC fonts linked and loading
- [ ] `src/pages/Landing/LandingPage.jsx` — renders at `/` with grimoire visual design
- [ ] `src/pages/Landing/LandingPage.css` — maple desk background, grimoire panel, gold border, aged parchment, corner flourishes
- [ ] `src/pages/Landing/WatercolorDissolve.jsx` — SVG feTurbulence dissolve on click, `onDissolveComplete` fires reliably, reduced-motion respected
- [ ] `src/components/grimoire/GrimoirePanel.jsx` — DivWand-composed panel shell
- [ ] `src/components/grimoire/GrimoireTitle.jsx` — Wand-styled blackletter SCHOLOMANCE glyph
- [ ] `src/main.jsx` — router restructured: landing at index `/`, App as pathless layout route, all existing routes preserved
- [ ] No Navigation bar visible at `/`
- [ ] Click grimoire → dissolve plays → navigate to `/read` → IDE renders with Navigation
- [ ] Keyboard accessible: Tab to grimoire, Enter activates dissolve
- [ ] `prefers-reduced-motion`: click → instant navigate, no animation
- [ ] All existing routes (`/read`, `/watch`, `/listen`, `/combat`, `/nexus`, `/profile`, `/auth`) render correctly inside App shell
- [ ] Admin gate routes (`/collab`, `/pixelbrain`, `/wand`, `/div-wand`) still require admin
- [ ] Zero TypeScript errors: `npx tsc --project tsconfig.json --noEmit`
- [ ] Zero lint warnings: `npm run lint`
- [ ] Full vitest suite passes
- [ ] PDR registered in `docs/scholomance-encyclopedia/PDR-archive/README.md`

---

## 14. Final Architectural Verdict

The landing page is architecturally trivial to add but visually non-trivial to execute. The hardest decision in this PDR is the routing restructure — promoting `App.jsx` from a path-matched parent to a pathless layout route. This is a React Router v6 pattern that is well-supported and semantically correct: `App.jsx` is a layout, not a page. The `Navigate` redirect at index was always a stopgap. Replacing it with `LandingPage` is the correct endpoint.

The dissolve animation uses SVG primitives that are available in every modern browser with no dependencies. The `feTurbulence` noise is computed once at filter creation. The animation is a single attribute mutation loop at 60fps — GPU-bound, not CPU-bound. The `will-change: filter` hint on the wrapper ensures the GPU rasterizes the layer independently. Performance risk on SteamDeck is low.

The grimoire aesthetic is achieved with two custom Google Fonts and CSS custom properties. It does not require canvas, WebGL, or third-party animation libraries. The maple desk is two CSS gradients. The gold border is `outline` + `box-shadow`. The corner flourishes are pseudo-element borders. The aged parchment is a radial-gradient. Zero decorative elements that cannot be explained in world-law terms: the desk grounds the grimoire in physical space; the grimoire is the spellbook; the blackletter title is the grimoire's title page; the click is the act of opening the book; the watercolor dissolve is the ink parting as the page turns.

The waiting list strategy (see conversation context) that eventually will live at `/join` or behind a registration flow is orthogonal to this PDR. The landing page dissolves directly into the app. Future iterations may add a waiting list modal or a split-entry path. This PDR does not attempt to address that — it establishes the entry experience for the app proper.

**Verdict: Approved for implementation. Begin at Phase 1 (CSS tokens + fonts). The grimoire scene will be visible in dev by end of Phase 2.**
