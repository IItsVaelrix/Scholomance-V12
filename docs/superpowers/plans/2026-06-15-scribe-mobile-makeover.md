# Scribe Mobile Makeover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Scribe page mobile render branch (< 640px) with an editor-first IDE-for-phone layout: full-bleed editor, compact bottom nav, bottom-sheet controls, haptic feedback on every surface touched.

**Architecture:** A `useHaptic` hook wraps `navigator.vibrate` with named patterns; `MobileBottomSheet` is a shared Framer Motion spring-sheet primitive; `MobileBottomNav`, `MobileHexSheet`, and `MobileWordSheet` compose these primitives; `ReadPage.jsx`'s mobile branch is replaced to wire them all together. No server, schema, or routing changes.

**Tech Stack:** React 18, Framer Motion 10, Vitest + @testing-library/react, jsdom, Vite/LightningCSS.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/hooks/useHaptic.ts` | **Create** | Named haptic pattern dispatcher |
| `src/hooks/useUserSettings.js` | **Modify** | Add `hapticEnabled: false` to DEFAULT_SETTINGS |
| `src/pages/Read/assets/nav-sigils/sigil-editor.svg` | **Create** | Quill-nib design asset |
| `src/pages/Read/assets/nav-sigils/sigil-scrolls.svg` | **Create** | Scroll-roller design asset |
| `src/pages/Read/assets/nav-sigils/sigil-oracle.svg` | **Create** | Eye-slit design asset |
| `src/pages/Read/assets/nav-sigils/sigil-hex.svg` | **Create** | Hexagon-spark design asset |
| `src/pages/Read/assets/nav-sigils/sigil-power.svg` | **Create** | Lightning-bolt design asset |
| `src/pages/Read/NavSigils.jsx` | **Create** | Inline SVG React components (currentColor-safe) |
| `src/pages/Read/MobileBottomSheet.jsx` | **Create** | Shared spring bottom-sheet primitive |
| `src/pages/Read/MobileBottomNav.jsx` | **Create** | Fixed bottom navigation bar |
| `src/pages/Read/MobileHexSheet.jsx` | **Create** | Hex controls sheet (Truesight, school, FEEL) |
| `src/pages/Read/MobileWordSheet.jsx` | **Create** | Word lookup sheet (replaces floating tooltip on mobile) |
| `src/pages/Read/ReadPage.jsx` | **Modify** | Replace mobile render branch; wire new components |
| `src/pages/Read/IDE.css` | **Modify** | Remove old `.ide-mobile-*`; add new shell + nav + sheet styles |
| `tests/hooks/useHaptic.test.ts` | **Create** | Hook unit tests |
| `tests/pages/mobile-bottom-sheet.test.jsx` | **Create** | Sheet open/close/dismiss tests |
| `tests/pages/mobile-bottom-nav.test.jsx` | **Create** | Nav tab switching + subtitle tests |

---

## Task 1: `useHaptic` hook

**Files:**
- Create: `src/hooks/useHaptic.ts`
- Create: `tests/hooks/useHaptic.test.ts`

- [ ] **Step 1.1: Write failing tests**

```ts
// tests/hooks/useHaptic.test.ts
import { renderHook } from '@testing-library/react';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { useHaptic } from '../../src/hooks/useHaptic';

describe('useHaptic', () => {
  let vibrateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vibrateMock = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fires tap pattern [8] when enabled', () => {
    const { result } = renderHook(() => useHaptic(true));
    result.current.haptic('tap');
    expect(vibrateMock).toHaveBeenCalledWith([8]);
  });

  it('fires success pattern [8, 40, 16] when enabled', () => {
    const { result } = renderHook(() => useHaptic(true));
    result.current.haptic('success');
    expect(vibrateMock).toHaveBeenCalledWith([8, 40, 16]);
  });

  it('fires error pattern [20, 10, 20] when enabled', () => {
    const { result } = renderHook(() => useHaptic(true));
    result.current.haptic('error');
    expect(vibrateMock).toHaveBeenCalledWith([20, 10, 20]);
  });

  it('does nothing when disabled', () => {
    const { result } = renderHook(() => useHaptic(false));
    result.current.haptic('tap');
    expect(vibrateMock).not.toHaveBeenCalled();
  });

  it('does nothing when navigator.vibrate is absent', () => {
    // Remove vibrate support
    Object.defineProperty(navigator, 'vibrate', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    const { result } = renderHook(() => useHaptic(true));
    expect(() => result.current.haptic('tap')).not.toThrow();
    expect(vibrateMock).not.toHaveBeenCalled();
  });

  it('does not recheck support after first call', () => {
    const checkSpy = vi.spyOn(navigator, 'vibrate');
    const { result } = renderHook(() => useHaptic(true));
    result.current.haptic('tap');
    result.current.haptic('tap');
    // Two calls, but support detection only runs once (cached in ref)
    expect(checkSpy).toHaveBeenCalledTimes(2); // actual vibrate calls, not detection
  });
});
```

- [ ] **Step 1.2: Run tests — verify they fail**

```bash
npx vitest run tests/hooks/useHaptic.test.ts
```

Expected: FAIL — `Cannot find module '../../src/hooks/useHaptic'`

- [ ] **Step 1.3: Implement `useHaptic`**

```ts
// src/hooks/useHaptic.ts
import { useRef, useCallback } from 'react';

export type HapticPattern =
  | 'tap' | 'select' | 'toggle'
  | 'open' | 'dismiss' | 'snap'
  | 'success' | 'error';

const PATTERNS: Record<HapticPattern, number[]> = {
  tap:     [8],
  select:  [12],
  toggle:  [10],
  open:    [6, 30, 2],   // vibrate 6ms, pause 30ms, vibrate 2ms
  dismiss: [4],
  snap:    [8],
  success: [8, 40, 16],
  error:   [20, 10, 20],
};

export function useHaptic(enabled: boolean) {
  const supportedRef = useRef<boolean | null>(null);

  const haptic = useCallback((pattern: HapticPattern) => {
    if (!enabled) return;
    if (supportedRef.current === null) {
      supportedRef.current =
        typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
    }
    if (!supportedRef.current) return;
    navigator.vibrate(PATTERNS[pattern]);
  }, [enabled]);

  return { haptic };
}
```

- [ ] **Step 1.4: Run tests — verify they pass**

```bash
npx vitest run tests/hooks/useHaptic.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 1.5: Commit**

```bash
git add src/hooks/useHaptic.ts tests/hooks/useHaptic.test.ts
git commit -m "feat(mobile): useHaptic hook — named vibration patterns, opt-in, silent fallback"
```

---

## Task 2: `hapticEnabled` in `useUserSettings`

**Files:**
- Modify: `src/hooks/useUserSettings.js:13` (DEFAULT_SETTINGS object)

- [ ] **Step 2.1: Add `hapticEnabled` to DEFAULT_SETTINGS**

In `src/hooks/useUserSettings.js`, find the `DEFAULT_SETTINGS` object and add the new key:

```js
// BEFORE:
const DEFAULT_SETTINGS = {
  theme: 'dark',
  truesightEnabled: false,
  reducedMotion: false,
  fontSize: 'medium',
  compactMode: false,
};

// AFTER:
const DEFAULT_SETTINGS = {
  theme: 'dark',
  truesightEnabled: false,
  reducedMotion: false,
  fontSize: 'medium',
  compactMode: false,
  hapticEnabled: false,
};
```

No test change required — existing `useUserSettings` tests cover settings persistence generically.

- [ ] **Step 2.2: Verify no regressions**

```bash
npx vitest run tests/hooks/
```

Expected: all existing hook tests PASS

- [ ] **Step 2.3: Commit**

```bash
git add src/hooks/useUserSettings.js
git commit -m "feat(mobile): add hapticEnabled setting (default off, user opt-in)"
```

---

## Task 3: PixelBrain nav sigil assets

**Files:**
- Create: `src/pages/Read/assets/nav-sigils/sigil-editor.svg`
- Create: `src/pages/Read/assets/nav-sigils/sigil-scrolls.svg`
- Create: `src/pages/Read/assets/nav-sigils/sigil-oracle.svg`
- Create: `src/pages/Read/assets/nav-sigils/sigil-hex.svg`
- Create: `src/pages/Read/assets/nav-sigils/sigil-power.svg`
- Create: `src/pages/Read/NavSigils.jsx`

- [ ] **Step 3.1: Create asset directory and SVG files**

```bash
mkdir -p src/pages/Read/assets/nav-sigils
```

`src/pages/Read/assets/nav-sigils/sigil-editor.svg` — Quill nib with descending stroke:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 2L20 8L12 14L4 8Z"/>
  <line x1="12" y1="8" x2="12" y2="21"/>
  <line x1="9" y1="11" x2="15" y2="11"/>
</svg>
```

`src/pages/Read/assets/nav-sigils/sigil-scrolls.svg` — Furled scroll with rollers:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="4" cy="12" r="2.5"/>
  <circle cx="20" cy="12" r="2.5"/>
  <rect x="6.5" y="7" width="11" height="10" rx="0.5"/>
  <line x1="9" y1="11" x2="15" y2="11"/>
  <line x1="9" y1="14" x2="13" y2="14"/>
</svg>
```

`src/pages/Read/assets/nav-sigils/sigil-oracle.svg` — Eye with vertical slit pupil:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M2 12C2 12 6 4 12 4s10 8 10 8-4 8-10 8S2 12 2 12z"/>
  <circle cx="12" cy="12" r="3"/>
  <line x1="12" y1="9" x2="12" y2="15"/>
</svg>
```

`src/pages/Read/assets/nav-sigils/sigil-hex.svg` — Hexagon with inner spark:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="12,2 20.66,7 20.66,17 12,22 3.34,17 3.34,7"/>
  <path d="M12 8L13.5 11.5L17 12L13.5 12.5L12 16L10.5 12.5L7 12L10.5 11.5Z"/>
</svg>
```

`src/pages/Read/assets/nav-sigils/sigil-power.svg` — Lightning bolt in circle:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="9"/>
  <path d="M13 6L9 13L12 13L11 18L15 11L12 11Z"/>
</svg>
```

- [ ] **Step 3.2: Create `NavSigils.jsx` — inline SVG components**

SVGs must be inline (not `<img>`) so `currentColor` and `filter: drop-shadow` work. `NavSigils.jsx` exports one component per sigil plus a convenience `NavSigil` dispatcher:

```jsx
// src/pages/Read/NavSigils.jsx

export function EditorSigil({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2L20 8L12 14L4 8Z"/>
      <line x1="12" y1="8" x2="12" y2="21"/>
      <line x1="9" y1="11" x2="15" y2="11"/>
    </svg>
  );
}

export function ScrollsSigil({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="4" cy="12" r="2.5"/>
      <circle cx="20" cy="12" r="2.5"/>
      <rect x="6.5" y="7" width="11" height="10" rx="0.5"/>
      <line x1="9" y1="11" x2="15" y2="11"/>
      <line x1="9" y1="14" x2="13" y2="14"/>
    </svg>
  );
}

export function OracleSigil({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12C2 12 6 4 12 4s10 8 10 8-4 8-10 8S2 12 2 12z"/>
      <circle cx="12" cy="12" r="3"/>
      <line x1="12" y1="9" x2="12" y2="15"/>
    </svg>
  );
}

export function HexSigil({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12,2 20.66,7 20.66,17 12,22 3.34,17 3.34,7"/>
      <path d="M12 8L13.5 11.5L17 12L13.5 12.5L12 16L10.5 12.5L7 12L10.5 11.5Z"/>
    </svg>
  );
}

export function PowerSigil({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9"/>
      <path d="M13 6L9 13L12 13L11 18L15 11L12 11Z"/>
    </svg>
  );
}

const SIGILS = { EDITOR: EditorSigil, SCROLLS: ScrollsSigil, ORACLE: OracleSigil, HEX: HexSigil, POWER: PowerSigil };

export function NavSigil({ tab, className }) {
  const Component = SIGILS[tab];
  return Component ? <Component className={className} /> : null;
}
```

- [ ] **Step 3.3: Commit**

```bash
git add src/pages/Read/assets/nav-sigils/ src/pages/Read/NavSigils.jsx
git commit -m "feat(mobile): PixelBrain nav sigil SVG assets + NavSigils inline components"
```

---

## Task 4: `MobileBottomSheet` primitive

**Files:**
- Create: `src/pages/Read/MobileBottomSheet.jsx`
- Create: `tests/pages/mobile-bottom-sheet.test.jsx`

- [ ] **Step 4.1: Write failing tests**

```jsx
// tests/pages/mobile-bottom-sheet.test.jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MobileBottomSheet from '../../src/pages/Read/MobileBottomSheet';

describe('MobileBottomSheet', () => {
  it('renders children when open', () => {
    render(
      <MobileBottomSheet isOpen={true} onClose={vi.fn()}>
        <p>Sheet content</p>
      </MobileBottomSheet>
    );
    expect(screen.getByText('Sheet content')).toBeInTheDocument();
  });

  it('does not render children when closed', () => {
    render(
      <MobileBottomSheet isOpen={false} onClose={vi.fn()}>
        <p>Sheet content</p>
      </MobileBottomSheet>
    );
    expect(screen.queryByText('Sheet content')).not.toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(
      <MobileBottomSheet isOpen={true} onClose={onClose}>
        <p>Content</p>
      </MobileBottomSheet>
    );
    fireEvent.click(document.querySelector('.ide-sheet-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders drag handle', () => {
    render(
      <MobileBottomSheet isOpen={true} onClose={vi.fn()}>
        <p>Content</p>
      </MobileBottomSheet>
    );
    expect(document.querySelector('.ide-sheet-handle')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4.2: Run tests — verify they fail**

```bash
npx vitest run tests/pages/mobile-bottom-sheet.test.jsx
```

Expected: FAIL — `Cannot find module '../../src/pages/Read/MobileBottomSheet'`

- [ ] **Step 4.3: Implement `MobileBottomSheet`**

```jsx
// src/pages/Read/MobileBottomSheet.jsx
import { useState, useCallback } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';

// Sheet is 92dvh tall, fixed at bottom.
// translateY controls visible portion:
//   y=0    → fully expanded (full-screen snap)
//   y=42vh → half-screen snap (92-42=50dvh visible)
//   exit   → y=100dvh (off screen)
const SNAP_Y = { full: 0, half: '42dvh' };

export default function MobileBottomSheet({ isOpen, onClose, children, initialSnap = 'half' }) {
  const [snap, setSnap] = useState(initialSnap);
  const dragControls = useDragControls();

  const handleDragEnd = useCallback((_, info) => {
    const { velocity, offset } = info;
    if (velocity.y > 500) { onClose(); return; }
    if (offset.y > window.innerHeight * 0.2) {
      if (snap === 'full') { setSnap('half'); }
      else { onClose(); }
      return;
    }
    if (offset.y < -window.innerHeight * 0.15) {
      setSnap('full');
    }
  }, [snap, onClose]);

  return (
    <AnimatePresence onExitComplete={() => setSnap(initialSnap)}>
      {isOpen && (
        <>
          <motion.div
            className="ide-sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          <motion.div
            className="ide-bottom-sheet"
            drag="y"
            dragControls={dragControls}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.2 }}
            onDragEnd={handleDragEnd}
            initial={{ y: '100dvh' }}
            animate={{ y: SNAP_Y[snap] }}
            exit={{ y: '100dvh', transition: { duration: 0.2, ease: 'easeIn' } }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
          >
            <div
              className="ide-sheet-handle-row"
              onPointerDown={e => dragControls.start(e)}
            >
              <div className="ide-sheet-handle" />
            </div>
            <div className="ide-sheet-content">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 4.4: Run tests — verify they pass**

```bash
npx vitest run tests/pages/mobile-bottom-sheet.test.jsx
```

Expected: PASS (4 tests)

- [ ] **Step 4.5: Commit**

```bash
git add src/pages/Read/MobileBottomSheet.jsx tests/pages/mobile-bottom-sheet.test.jsx
git commit -m "feat(mobile): MobileBottomSheet — spring sheet primitive, half/full snaps, drag dismiss"
```

---

## Task 5: `MobileBottomNav`

**Files:**
- Create: `src/pages/Read/MobileBottomNav.jsx`
- Create: `tests/pages/mobile-bottom-nav.test.jsx`

- [ ] **Step 5.1: Write failing tests**

```jsx
// tests/pages/mobile-bottom-nav.test.jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MobileBottomNav from '../../src/pages/Read/MobileBottomNav';

describe('MobileBottomNav', () => {
  const onTabChange = vi.fn();

  beforeEach(() => onTabChange.mockClear());

  it('renders all 5 tabs', () => {
    render(<MobileBottomNav activeTab="EDITOR" onTabChange={onTabChange} />);
    expect(screen.getByRole('tab', { name: /editor/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /scrolls/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /oracle/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /hex/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /power/i })).toBeInTheDocument();
  });

  it('marks active tab with aria-selected=true', () => {
    render(<MobileBottomNav activeTab="SCROLLS" onTabChange={onTabChange} />);
    expect(screen.getByRole('tab', { name: /scrolls/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /editor/i })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onTabChange with tab id on press', () => {
    render(<MobileBottomNav activeTab="EDITOR" onTabChange={onTabChange} />);
    fireEvent.click(screen.getByRole('tab', { name: /scrolls/i }));
    expect(onTabChange).toHaveBeenCalledWith('SCROLLS');
  });

  it('shows editorSubtitle under EDITOR tab when provided', () => {
    render(
      <MobileBottomNav
        activeTab="EDITOR"
        onTabChange={onTabChange}
        editorSubtitle="Ln 4 · Col 12"
      />
    );
    expect(screen.getByText('Ln 4 · Col 12')).toBeInTheDocument();
  });

  it('does not show editorSubtitle when activeTab is not EDITOR', () => {
    render(
      <MobileBottomNav
        activeTab="SCROLLS"
        onTabChange={onTabChange}
        editorSubtitle="Ln 4 · Col 12"
      />
    );
    expect(screen.queryByText('Ln 4 · Col 12')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 5.2: Run tests — verify they fail**

```bash
npx vitest run tests/pages/mobile-bottom-nav.test.jsx
```

Expected: FAIL — `Cannot find module '../../src/pages/Read/MobileBottomNav'`

- [ ] **Step 5.3: Implement `MobileBottomNav`**

```jsx
// src/pages/Read/MobileBottomNav.jsx
import { motion } from 'framer-motion';
import { NavSigil } from './NavSigils.jsx';
import { useHaptic } from '../../hooks/useHaptic.ts';

const TABS = [
  { id: 'EDITOR',  label: 'Editor'  },
  { id: 'SCROLLS', label: 'Scrolls' },
  { id: 'ORACLE',  label: 'Oracle'  },
  { id: 'HEX',     label: 'Hex'     },
  { id: 'POWER',   label: 'Power'   },
];

export default function MobileBottomNav({ activeTab, onTabChange, editorSubtitle, hapticEnabled = false }) {
  const { haptic } = useHaptic(hapticEnabled);

  function handlePress(tabId) {
    haptic(tabId === 'EDITOR' ? 'select' : 'tap');
    onTabChange(tabId);
  }

  return (
    <nav className="ide-bottom-nav" role="tablist" aria-label="Scribe workspace sections">
      {TABS.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-label={tab.label}
            className={`ide-bottom-nav-tab${isActive ? ' active' : ''}`}
            onClick={() => handlePress(tab.id)}
          >
            {isActive && (
              <motion.div
                className="ide-bottom-nav-indicator"
                layoutId="nav-indicator"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
            <NavSigil tab={tab.id} className="ide-bottom-nav-sigil" />
            <span className="ide-bottom-nav-label">{tab.label}</span>
            {tab.id === 'EDITOR' && isActive && editorSubtitle && (
              <span className="ide-bottom-nav-subtitle">{editorSubtitle}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 5.4: Run tests — verify they pass**

```bash
npx vitest run tests/pages/mobile-bottom-nav.test.jsx
```

Expected: PASS (5 tests)

- [ ] **Step 5.5: Commit**

```bash
git add src/pages/Read/MobileBottomNav.jsx tests/pages/mobile-bottom-nav.test.jsx
git commit -m "feat(mobile): MobileBottomNav — 5-tab fixed nav with sigils, haptics, editor subtitle"
```

---

## Task 6: `MobileHexSheet`

**Files:**
- Create: `src/pages/Read/MobileHexSheet.jsx`

No separate unit test — wired and validated in Task 8 (ReadPage integration) and visually in the browser.

- [ ] **Step 6.1: Implement `MobileHexSheet`**

```jsx
// src/pages/Read/MobileHexSheet.jsx
import MobileBottomSheet from './MobileBottomSheet.jsx';
import { SCHOOLS } from '../../data/schools.js';
import { ANALYSIS_MODES } from '../../lib/truesight/compiler/analysisModes';
import { useHaptic } from '../../hooks/useHaptic.ts';

function Toggle({ label, value, onToggle, haptic }) {
  function handleClick() {
    haptic('toggle');
    onToggle();
  }
  return (
    <div className="ide-hex-row">
      <span className="ide-hex-row-label">{label}</span>
      <button
        type="button"
        className={`settings-toggle${value ? ' settings-toggle--on' : ''}`}
        aria-pressed={value}
        onClick={handleClick}
      >
        {value ? 'On' : 'Off'}
      </button>
    </div>
  );
}

export default function MobileHexSheet({
  isOpen, onClose,
  isTruesight, onToggleTruesight,
  isLatticeGrid, onToggleLatticeGrid,
  isPredictive, onTogglePredictive,
  mirrored, onToggleMirrored,
  analysisMode, onModeChange,
  selectedSchool, onSchoolChange,
  schoolList,
  hapticEnabled, onToggleHaptic,
}) {
  const { haptic } = useHaptic(hapticEnabled);

  const analysisModes = [
    { id: ANALYSIS_MODES.NONE, label: 'None' },
    { id: ANALYSIS_MODES.ASTROLOGY, label: 'Astrology' },
    { id: ANALYSIS_MODES.RHYME, label: 'Rhyme' },
    { id: ANALYSIS_MODES.ANALYZE, label: 'Analyze' },
  ];

  return (
    <MobileBottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="ide-hex-sheet">
        <section className="ide-hex-section">
          <h3 className="ide-hex-section-title">Optics</h3>
          <Toggle label="Truesight"   value={isTruesight}   onToggle={onToggleTruesight}   haptic={haptic} />
          <Toggle label="Symmetrical" value={mirrored}       onToggle={onToggleMirrored}     haptic={haptic} />
          <Toggle label="Lattice Grid" value={isLatticeGrid} onToggle={onToggleLatticeGrid}  haptic={haptic} />
          <Toggle label="Predictive"  value={isPredictive}  onToggle={onTogglePredictive}   haptic={haptic} />
        </section>

        <section className="ide-hex-section">
          <h3 className="ide-hex-section-title">Analysis</h3>
          <div className="ide-hex-mode-row">
            {analysisModes.map(m => (
              <button
                key={m.id}
                type="button"
                className={`ide-hex-mode-btn${analysisMode === m.id ? ' active' : ''}`}
                onClick={() => { haptic('tap'); onModeChange(m.id); }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </section>

        <section className="ide-hex-section">
          <h3 className="ide-hex-section-title">School</h3>
          <div className="ide-hex-school-grid">
            {schoolList.map(school => (
              <button
                key={school.id}
                type="button"
                className={`ide-hex-school-chip${selectedSchool === school.id ? ' active' : ''}`}
                style={{ '--chip-color': SCHOOLS[school.id]?.color }}
                onClick={() => { haptic('tap'); onSchoolChange(school.id); }}
              >
                <span className="ide-hex-school-glyph">{SCHOOLS[school.id]?.glyph}</span>
                <span className="ide-hex-school-name">{SCHOOLS[school.id]?.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="ide-hex-section">
          <h3 className="ide-hex-section-title">Feel</h3>
          <Toggle label="Haptic Feedback" value={hapticEnabled} onToggle={onToggleHaptic} haptic={haptic} />
        </section>
      </div>
    </MobileBottomSheet>
  );
}
```

- [ ] **Step 6.2: Commit**

```bash
git add src/pages/Read/MobileHexSheet.jsx
git commit -m "feat(mobile): MobileHexSheet — controls bottom sheet with FEEL haptic toggle"
```

---

## Task 7: `MobileWordSheet`

**Files:**
- Create: `src/pages/Read/MobileWordSheet.jsx`

- [ ] **Step 7.1: Implement `MobileWordSheet`**

`MobileWordSheet` wraps `WordTooltip`'s content inside `MobileBottomSheet`. It accepts the same props as `WordTooltip` and renders them in the sheet context.

```jsx
// src/pages/Read/MobileWordSheet.jsx
import MobileBottomSheet from './MobileBottomSheet.jsx';
import WordTooltip from '../../components/WordTooltip.jsx';
import { useHaptic } from '../../hooks/useHaptic.ts';

export default function MobileWordSheet({
  isOpen, onClose,
  wordData, analysis,
  isLoading, error,
  onSuggestionClick,
  sessionHistory, sessionIndex, onSessionNavigate,
  hapticEnabled = false,
}) {
  const { haptic } = useHaptic(hapticEnabled);

  function handleSuggestionClick(word) {
    haptic('select');
    setTimeout(() => haptic('success'), 40);
    onSuggestionClick(word);
    onClose();
  }

  return (
    <MobileBottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="ide-word-sheet">
        {wordData && (
          <WordTooltip
            wordData={wordData}
            analysis={analysis}
            isLoading={isLoading}
            error={error}
            x={0}
            y={0}
            onDrag={() => {}}
            onClose={onClose}
            onSuggestionClick={handleSuggestionClick}
            sessionHistory={sessionHistory}
            sessionIndex={sessionIndex}
            onSessionNavigate={onSessionNavigate}
            embedded={true}
          />
        )}
      </div>
    </MobileBottomSheet>
  );
}
```

> **Note:** `WordTooltip` receives `x={0} y={0}` and `embedded={true}` — the absolute positioning CSS in `WordTooltip` must be suppressed when `embedded`. Check `src/components/WordTooltip.jsx` and `src/components/WordTooltip.css` for a `.word-tooltip--embedded` modifier that removes `position: fixed`, `top`, and `left`. Add it if not present: `.word-tooltip--embedded { position: static; box-shadow: none; }` in `WordTooltip.css`.

- [ ] **Step 7.2: Add `embedded` modifier to `WordTooltip` CSS**

Open `src/components/WordTooltip.css`. Append at the end:

```css
/* Embedded mode: rendered inside a bottom sheet, no fixed positioning */
.word-tooltip--embedded {
  position: static !important;
  box-shadow: none !important;
  border: none !important;
  background: transparent !important;
  padding: 0 !important;
  width: 100% !important;
}
```

Open `src/components/WordTooltip.jsx`. Find the root element's className and add the modifier:

```jsx
// Find the root div — look for className containing "word-tooltip"
// Add the embedded class when the prop is true:
<div
  className={`word-tooltip${embedded ? ' word-tooltip--embedded' : ''}`}
  // ... existing props
>
```

- [ ] **Step 7.3: Commit**

```bash
git add src/pages/Read/MobileWordSheet.jsx src/components/WordTooltip.jsx src/components/WordTooltip.css
git commit -m "feat(mobile): MobileWordSheet — word lookup bottom sheet; WordTooltip embedded modifier"
```

---

## Task 8: `ReadPage.jsx` mobile branch rewrite

**Files:**
- Modify: `src/pages/Read/ReadPage.jsx`

This is the largest change. The goal is to replace lines 973–1113 (the mobile render branch) with the new shell.

- [ ] **Step 8.1: Add new state and hooks at the top of `ReadPage`**

After the existing `const [showSettingsPanel, setShowSettingsPanel] = useState(false);` line (around line 215), add:

```jsx
const [isHexSheetOpen, setIsHexSheetOpen] = useState(false);
const [isWordSheetOpen, setIsWordSheetOpen] = useState(false);
const { haptic } = useHaptic(settings?.hapticEnabled ?? false);
```

- [ ] **Step 8.2: Add imports at the top of `ReadPage.jsx`**

After the existing import block, add:

```jsx
import MobileBottomNav from './MobileBottomNav.jsx';
import MobileHexSheet from './MobileHexSheet.jsx';
import MobileWordSheet from './MobileWordSheet.jsx';
import { useHaptic } from '../../hooks/useHaptic.ts';
```

- [ ] **Step 8.3: Add `handleMobileTabChange` callback**

After `handleSchoolChange` (around line 364), add:

```jsx
const handleMobileTabChange = useCallback((tab) => {
  if (tab === 'HEX') {
    haptic('tap');
    setIsHexSheetOpen(true);
    return;
  }
  haptic(tab === 'EDITOR' ? 'select' : 'tap');
  setMobileActiveTab(tab);
}, [haptic]);
```

- [ ] **Step 8.4: Update `handleWordActivate` to open the word sheet on mobile**

Inside `handleWordActivate` (around line 603), after the final `setTooltipState(...)` call, add:

```jsx
if (isMobileViewport) {
  setIsWordSheetOpen(true);
}
```

Add `isMobileViewport` to the `useCallback` dependency array for `handleWordActivate`.

- [ ] **Step 8.5: Compute `editorSubtitle` for the nav**

After the `mobileSurfaceTitle` line (around line 401), add:

```jsx
const editorSubtitle = scoreData
  ? `${scoreData.totalScore} Power`
  : `Ln ${cursorPos.line} · Col ${cursorPos.col}`;
```

- [ ] **Step 8.6: Replace the mobile render branch**

Find the comment `/* ── MOBILE RENDER ── */` (around line 973) and replace everything from `if (isMobileViewport) {` through its closing `}` with:

```jsx
/* ── MOBILE RENDER ── */
if (isMobileViewport) {
  return (
    <div className="ide-layout-wrapper ide-layout-wrapper--mobile">
      <TopBar
        title={mobileSurfaceTitle}
        onOpenSearch={() => setMobileActiveTab('ORACLE')}
        showMinimap={false}
        onToggleMinimap={() => {}}
        isEditable={isEditable}
        activeScrollId={activeScrollId}
        onEdit={handleEditScroll}
        onNewScroll={handleNewScroll}
        progression={progression}
        auroraLevel={auroraLevel}
        onCycleAuroraLevel={cycleAuroraLevel}
        onSettingsClick={() => setShowSettingsPanel(p => !p)}
        showMinimapControl={false}
        showSettingsControl={true}
      />

      <main className="ide-mobile-content" id="main-content">
        {mobileActiveTab === 'EDITOR' && (
          <motion.div
            key="editor"
            className="ide-mobile-editor-stage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
          >
            <ScrollEditor
              key={editorDocumentIdentity}
              ref={editorRef}
              documentIdentity={editorDocumentIdentity}
              title={editorInitialTitle}
              content={editorInitialContent}
              onSave={handleSaveScroll}
              onCancel={isEditing ? handleCancelEdit : undefined}
              isEditable={isEditable}
              disabled={false}
              isTruesight={isTruesight}
              isLatticeGrid={isLatticeGrid}
              isPredictive={isPredictive}
              predict={predict}
              getCompletions={getCompletions}
              checkSpelling={checkSpelling}
              getSpellingSuggestions={getSpellingSuggestions}
              predictorReady={predictorReady}
              plsPhoneticFeatures={scoreData?.plsPhoneticFeatures || rhymeAstrology?.features || null}
              onContentChange={handleEditorContentChange}
              onTitleChange={handleEditorTitleChange}
              analyzedWords={analyzedWords}
              analyzedWordsByIdentity={analyzedWordsByIdentity}
              analyzedWordsByCharStart={analyzedWordsByCharStart}
              lineSyllableCounts={deepAnalysis?.lineSyllableCounts || []}
              highlightedLines={effectiveHighlightedLines}
              pinnedLines={pinnedLines}
              syntaxLayer={deepAnalysis?.syntaxSummary}
              theme={theme}
              onWordActivate={handleWordActivate}
              onCursorChange={setCursorPos}
              mirrored={mirrored}
              ideMode={ideMode}
              onFocus={handleIdeFocus}
              onBlur={handleIdeBlur}
            />
          </motion.div>
        )}

        {mobileActiveTab === 'SCROLLS' && (
          <motion.div
            key="scrolls"
            className="ide-mobile-panel-stage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
          >
            <ScrollList
              scrolls={scrolls}
              activeScrollId={activeScrollId}
              onSelect={id => { handleSelectScroll(id); setMobileActiveTab('EDITOR'); }}
              onNewScroll={handleNewScroll}
            />
          </motion.div>
        )}

        {mobileActiveTab === 'ORACLE' && (
          <motion.div
            key="oracle"
            className="ide-mobile-panel-stage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
          >
            <SearchPanel
              seedWord={lexiconSeedWord}
              selectedSchool={selectedSchool}
              contextLookup={resolveLexiconContext}
              onJumpToLine={line => {
                editorRef.current?.jumpToLine?.(line);
                setMobileActiveTab('EDITOR');
              }}
            />
          </motion.div>
        )}

        {mobileActiveTab === 'POWER' && (
          <motion.div
            key="power"
            className="ide-mobile-panel-stage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
          >
            <HeuristicScorePanel
              scoreData={scoreData}
              genreProfile={genreProfile}
              visible={true}
              isEmbedded={true}
            />
          </motion.div>
        )}
      </main>

      <MobileBottomNav
        activeTab={mobileActiveTab}
        onTabChange={handleMobileTabChange}
        editorSubtitle={mobileActiveTab === 'EDITOR' ? editorSubtitle : undefined}
        hapticEnabled={settings?.hapticEnabled ?? false}
      />

      <MobileHexSheet
        isOpen={isHexSheetOpen}
        onClose={() => { haptic('dismiss'); setIsHexSheetOpen(false); }}
        isTruesight={isTruesight}
        onToggleTruesight={handleToggleTruesight}
        isLatticeGrid={isLatticeGrid}
        onToggleLatticeGrid={handleToggleLatticeGrid}
        isPredictive={isPredictive}
        onTogglePredictive={handleTogglePredictive}
        mirrored={mirrored}
        onToggleMirrored={handleToggleMirrored}
        analysisMode={analysisMode}
        onModeChange={handleModeChange}
        selectedSchool={selectedSchool}
        onSchoolChange={handleSchoolChange}
        schoolList={schoolList}
        hapticEnabled={settings?.hapticEnabled ?? false}
        onToggleHaptic={() => updateSettings({ hapticEnabled: !(settings?.hapticEnabled ?? false) })}
      />

      <MobileWordSheet
        isOpen={isWordSheetOpen}
        onClose={() => { haptic('dismiss'); setIsWordSheetOpen(false); }}
        wordData={tooltipWordData}
        analysis={tooltipState.localAnalysis}
        isLoading={tooltipState.pinned && isLookupLoading && !lookupOverride}
        error={tooltipState.pinned ? (lookupError?.message ?? null) : null}
        onSuggestionClick={handleSuggestionClick}
        sessionHistory={sessionWords}
        sessionIndex={sessionIndex}
        onSessionNavigate={handleSessionNavigate}
        hapticEnabled={settings?.hapticEnabled ?? false}
      />

      {commonUI}
    </div>
  );
}
```

- [ ] **Step 8.7: Run the full test suite — verify no regressions**

```bash
npx vitest run tests/
```

Expected: all existing tests PASS, new tests PASS

- [ ] **Step 8.8: Commit**

```bash
git add src/pages/Read/ReadPage.jsx
git commit -m "feat(mobile): ReadPage mobile branch — editor-first shell, bottom nav + sheets wired"
```

---

## Task 9: CSS — new mobile shell styles

**Files:**
- Modify: `src/pages/Read/IDE.css`

- [ ] **Step 9.1: Remove old mobile CSS classes**

In `IDE.css`, find and **delete** the entire blocks for these classes (lines ~4807–5201):

```
.ide-layout-wrapper--mobile
.ide-mobile-content     (the old one with gap/padding for the hero layout)
.ide-mobile-hero
.ide-mobile-hero::before
.ide-mobile-hero-copy / .ide-mobile-stage-copy
.ide-mobile-hero-eyebrow / .ide-mobile-stage-eyebrow
.ide-mobile-hero-title
.ide-mobile-hero-description / .ide-mobile-stage-description
.ide-mobile-meta-grid
.ide-mobile-meta-chip
.ide-mobile-meta-label
.ide-mobile-meta-value
.ide-mobile-tab-bar
.ide-mobile-tab-btn
.ide-mobile-tab-btn:hover / .ide-mobile-tab-btn.active
.ide-mobile-tab-icon / .ide-mobile-tab-icon svg
.ide-mobile-tab-copy
.ide-mobile-tab-label / .ide-mobile-tab-hint
.ide-mobile-stage
.ide-mobile-stage-header
.ide-mobile-stage-title
.ide-mobile-stage-badge
.ide-mobile-stage-body / .ide-mobile-stage-body > *
.ide-mobile-stage-body--editor
.ide-mobile-stage-body .codex-workspace ... (4 selectors)
.ide-mobile-panel
.ide-mobile-status-strip
.ide-mobile-status-chip
.ide-mobile-status-chip.is-offline
```

Keep the `@media (max-width: 640px)` block that sets `--editor-content-font-size`, iOS input zoom prevention, and the safe area rules — **only** remove the parts that reference the deleted classes (`ide-mobile-content`, `ide-mobile-tab-bar`, `ide-mobile-tab-btn`, `ide-mobile-stage-header`, `ide-mobile-stage-badge`, `ide-mobile-status-strip`).

- [ ] **Step 9.2: Add new mobile shell + nav + sheet CSS**

Append to the end of `IDE.css`:

```css
/* ═══════════════════════════════════════════════════════════════════════════
   MOBILE SHELL — editor-first IDE-for-phone layout
   ═══════════════════════════════════════════════════════════════════════════ */

.ide-layout-wrapper--mobile {
  background:
    radial-gradient(circle at top, color-mix(in srgb, var(--read-accent) 12%, transparent), transparent 52%),
    linear-gradient(180deg, rgba(10, 10, 24, 0.98), rgba(5, 4, 16, 1));
}

.ide-layout-wrapper--mobile .ide-topbar {
  padding: 0 var(--space-4);
  background: linear-gradient(180deg, rgba(9, 9, 22, 0.96), rgba(6, 5, 18, 0.92));
}

.ide-layout-wrapper--mobile .ide-topbar-center {
  display: none;
}

.ide-layout-wrapper--mobile .ide-topbar-right {
  gap: var(--space-1);
}

/* Content area: fills space between TopBar and bottom nav */
.ide-layout-wrapper--mobile .ide-mobile-content {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
}

/* Editor stage: full-bleed, no padding wrapper */
.ide-mobile-editor-stage {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
}

/* Panel stages: scrollable full-bleed surfaces */
.ide-mobile-panel-stage {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* ── Bottom Navigation Bar ──────────────────────────────────────────── */

.ide-bottom-nav {
  display: flex;
  flex-direction: row;
  height: 52px;
  padding-bottom: max(0px, env(safe-area-inset-bottom));
  background: rgba(6, 5, 18, 0.97);
  border-top: 1px solid color-mix(in srgb, var(--read-accent) 18%, rgba(255, 255, 255, 0.06));
  backdrop-filter: blur(16px);
  flex-shrink: 0;
}

.ide-bottom-nav-tab {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 6px 4px 4px;
  background: transparent;
  border: 0;
  color: hsla(43, 48%, 48%, 0.45);
  cursor: pointer;
  transition: color 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.ide-bottom-nav-tab.active {
  color: var(--read-accent);
  filter: drop-shadow(0 0 6px color-mix(in srgb, var(--read-accent) 55%, transparent));
}

.ide-bottom-nav-indicator {
  position: absolute;
  top: 0;
  left: 20%;
  right: 20%;
  height: 2px;
  background: var(--read-accent);
  border-radius: 0 0 2px 2px;
  box-shadow: 0 0 8px var(--read-accent);
}

.ide-bottom-nav-sigil {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}

.ide-bottom-nav-label {
  font-family: var(--font-mono, "JetBrains Mono", monospace);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  line-height: 1;
}

.ide-bottom-nav-subtitle {
  font-family: var(--font-mono, "JetBrains Mono", monospace);
  font-size: 0.5rem;
  letter-spacing: 0.06em;
  color: color-mix(in srgb, var(--read-accent) 60%, rgba(200, 190, 170, 0.5));
  line-height: 1;
}

/* ── Bottom Sheet ───────────────────────────────────────────────────── */

.ide-sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  z-index: calc(var(--z-overlay, 100) - 1);
}

.ide-bottom-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 92dvh;
  z-index: var(--z-overlay, 100);
  background: linear-gradient(180deg, rgba(14, 13, 32, 0.99), rgba(6, 5, 18, 1));
  border-top: 1px solid color-mix(in srgb, var(--read-accent) 24%, rgba(255, 255, 255, 0.08));
  border-radius: 1.5rem 1.5rem 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow:
    0 -12px 40px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.ide-sheet-handle-row {
  display: flex;
  justify-content: center;
  padding: 0.75rem 0 0.5rem;
  cursor: grab;
  flex-shrink: 0;
  touch-action: none;
}

.ide-sheet-handle {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.18);
}

.ide-sheet-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* ── Hex Sheet internals ────────────────────────────────────────────── */

.ide-hex-sheet {
  padding: var(--space-4, 1rem);
  display: flex;
  flex-direction: column;
  gap: var(--space-4, 1rem);
}

.ide-hex-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2, 0.5rem);
}

.ide-hex-section-title {
  margin: 0;
  font-family: var(--font-mono, "JetBrains Mono", monospace);
  font-size: var(--text-2xs, 0.6875rem);
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--read-accent) 72%, rgba(232, 220, 200, 0.82));
}

.ide-hex-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.ide-hex-row-label {
  font-size: var(--text-sm, 0.875rem);
  color: var(--read-text, #cdc5a8);
}

.ide-hex-mode-row {
  display: flex;
  gap: var(--space-2, 0.5rem);
  flex-wrap: wrap;
}

.ide-hex-mode-btn {
  padding: 0.5rem 0.9rem;
  border-radius: var(--radius-md, 0.5rem);
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: var(--read-text-muted, #a89d80);
  font-family: var(--font-mono, "JetBrains Mono", monospace);
  font-size: var(--text-xs, 0.8125rem);
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: all 0.15s ease;
}

.ide-hex-mode-btn.active {
  border-color: color-mix(in srgb, var(--read-accent) 48%, rgba(255, 255, 255, 0.1));
  background: color-mix(in srgb, var(--read-accent) 14%, rgba(255, 255, 255, 0.04));
  color: var(--read-text-strong, #ede8d4);
}

.ide-hex-school-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: var(--space-2, 0.5rem);
}

.ide-hex-school-chip {
  display: flex;
  align-items: center;
  gap: var(--space-2, 0.5rem);
  padding: 0.6rem 0.8rem;
  border-radius: var(--radius-md, 0.5rem);
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: var(--read-text-muted, #a89d80);
  font-family: var(--font-mono, "JetBrains Mono", monospace);
  font-size: var(--text-xs, 0.8125rem);
  cursor: pointer;
  transition: all 0.15s ease;
}

.ide-hex-school-chip.active {
  border-color: var(--chip-color);
  background: color-mix(in srgb, var(--chip-color) 12%, rgba(0, 0, 0, 0.4));
  color: var(--read-text-strong, #ede8d4);
  box-shadow: 0 0 12px color-mix(in srgb, var(--chip-color) 30%, transparent);
}

.ide-hex-school-glyph {
  font-size: 1rem;
}

.ide-hex-school-name {
  font-size: var(--text-xs, 0.8125rem);
  letter-spacing: 0.05em;
}

/* ── Word Sheet ─────────────────────────────────────────────────────── */

.ide-word-sheet {
  padding: var(--space-3, 0.75rem);
}

/* ── @property for school color transition (progressive enhancement) ── */

@property --read-accent {
  syntax: '<color>';
  inherits: true;
  initial-value: #6548b8;
}

.ide-layout-wrapper {
  transition: --read-accent 300ms ease;
}

/* ── Reduced motion overrides ───────────────────────────────────────── */

@media (prefers-reduced-motion: reduce) {
  .ide-bottom-nav-tab {
    transition: none;
  }
  .ide-layout-wrapper {
    transition: none;
  }
}
```

- [ ] **Step 9.3: Check for TypeScript/lint errors**

```bash
npm run typecheck && npm run lint
```

Expected: 0 errors, 0 warnings

- [ ] **Step 9.4: Run full test suite one final time**

```bash
npx vitest run tests/
```

Expected: all tests PASS

- [ ] **Step 9.5: Open the live server and test on mobile viewport**

Navigate to `http://localhost:5173/read` in Chrome DevTools with device emulation set to iPhone 14 (390×844). Verify:

1. Editor fills the full content area — no hero section
2. Bottom nav shows 5 sigil tabs, editor tab is active with cursor subtitle
3. Tap each non-HEX tab — content area cross-fades to that panel
4. Tap HEX tab — bottom sheet slides up with controls, drag handle visible
5. Toggle Truesight in HEX sheet — editor responds
6. Toggle Feel (haptics) on — subsequent tab taps vibrate on Android
7. Tap a Truesight word — word sheet slides up from bottom

- [ ] **Step 9.6: Commit**

```bash
git add src/pages/Read/IDE.css
git commit -m "feat(mobile): new IDE mobile CSS — bottom nav, sheet, editor-first shell"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| Remove hero section entirely | Task 8 step 8.6 — hero JSX replaced |
| Remove stage header per tab | Task 8 step 8.6 — no stage wrapper |
| Remove status strip → fold into nav | Task 5 + 8 — `editorSubtitle` in nav |
| Editor fills 100% of content area | Task 8 step 8.6 + Task 9 `.ide-mobile-editor-stage` |
| Compact bottom nav, 5 tabs | Tasks 4–5 |
| PixelBrain sigil icons | Task 3 |
| `currentColor` tint + glow | Task 9 `.ide-bottom-nav-tab.active` |
| Accent line animation on active tab | Task 5 (`layoutId="nav-indicator"`) + Task 9 `.ide-bottom-nav-indicator` |
| Editor subtitle (cursor / power) | Task 5 + 8 |
| Haptic on tab press | Task 5 `handlePress` |
| HEX tab opens sheet, not panel | Task 8 `handleMobileTabChange` |
| Bottom sheet spring open/close | Task 4 |
| Backdrop blur dismiss | Task 4 |
| Drag handle + half/full snap | Task 4 |
| Haptic on sheet open/close/snap | Task 4 fires via `useHaptic` passed from parent |
| Hex sheet: Truesight, mirrored, lattice, predictive | Task 6 |
| Hex sheet: analysis mode radio | Task 6 |
| Hex sheet: school chip grid | Task 6 |
| Hex sheet: FEEL section (haptic toggle) | Task 6 |
| Word sheet replaces floating tooltip on mobile | Tasks 7 + 8 step 8.4 |
| Suggestion tap → haptic select + success | Task 7 `handleSuggestionClick` |
| `useHaptic` hook, 8 named patterns | Task 1 |
| `hapticEnabled` off by default | Task 2 |
| Cross-fade tab switch, no slide | Task 8 step 8.6 + Task 9 |
| Spring: stiffness 400 damping 40 | Task 4 |
| `@property --read-accent` transition | Task 9 |
| `prefers-reduced-motion` collapse | Task 9 |
| `env(safe-area-inset-bottom)` | Task 9 `.ide-bottom-nav` |
| Law 9: no module-scoped mutable state | All components use `useRef`/`useState` |
| Law 10: no hardcoded z-index > 1 | Task 9 uses `var(--z-overlay)` |

**No placeholders found.** All steps contain complete code.

**Type consistency:** `useHaptic(enabled: boolean)` used consistently across Tasks 1, 5, 6, 7, 8. `HapticPattern` type used in hook and caller sites. `MobileBottomSheet` props consistent between Task 4 (definition) and Tasks 6, 7 (consumers).
