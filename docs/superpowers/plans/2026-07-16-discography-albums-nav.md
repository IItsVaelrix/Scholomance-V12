# Discography Albums Nav Symmetry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the cramped Visualiser discography header so `Discography` and `Albums` sit in a left title cluster with clear separation, while Upload/collapse remain a right actions cluster.

**Architecture:** Markup-only regrouping in `DiscographyNav.tsx` plus missing CSS for `.bcv-disco-header-title` and `.bcv-disco-albums-link`. No route, data, or collapse-behavior changes.

**Tech Stack:** React 18, TypeScript, React Router `Link`, Vitest, @testing-library/react.

## Global Constraints

- CSS prefix remains `bcv-disco-*` (existing discography nav convention)
- Albums stays a quiet secondary text link — not a bordered button like Upload
- Header stays one row: left cluster vs right cluster via `space-between`
- Route for Albums remains `/visualiser/albums`
- No changes to sidebar width, collapse/expand, edge handle, Upload modal, or track list
- Test runner: `npx vitest run tests/visualiser/DiscographyNav.test.tsx --reporter=verbose`

---

## File Structure

| File | Responsibility |
|---|---|
| `src/pages/Visualiser/DiscographyNav.tsx` | Wrap title + Albums link in left cluster |
| `src/pages/Visualiser/DiscographyNav.css` | Left-cluster layout + Albums link styles |
| `tests/visualiser/DiscographyNav.test.tsx` | Structure + link + actions regression tests |

---

### Task 1: Header cluster markup + Albums link styles

**Files:**
- Create: `tests/visualiser/DiscographyNav.test.tsx`
- Modify: `src/pages/Visualiser/DiscographyNav.tsx` (expanded header block ~lines 55–73)
- Modify: `src/pages/Visualiser/DiscographyNav.css` (after `.bcv-disco-header h2`)

**Interfaces:**
- Consumes: existing `DiscographyNavProps` (`activeTrackId`, `onSelectTrack`)
- Produces: DOM structure with `.bcv-disco-header-title` containing `h2` + `.bcv-disco-albums-link`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/visualiser/DiscographyNav.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DiscographyNav } from '../../src/pages/Visualiser/DiscographyNav';

function renderNav() {
  return render(
    <MemoryRouter>
      <DiscographyNav activeTrackId="petrichor" onSelectTrack={vi.fn()} />
    </MemoryRouter>
  );
}

describe('DiscographyNav header', () => {
  it('groups Discography title and Albums link in a left title cluster', () => {
    const { container } = renderNav();
    const titleCluster = container.querySelector('.bcv-disco-header-title');
    expect(titleCluster).toBeTruthy();
    expect(titleCluster?.querySelector('h2')?.textContent).toMatch(/discography/i);
    const albumsLink = titleCluster?.querySelector('a.bcv-disco-albums-link');
    expect(albumsLink).toBeTruthy();
    expect(albumsLink).toHaveAttribute('href', '/visualiser/albums');
    expect(albumsLink?.textContent).toMatch(/albums/i);
  });

  it('keeps Upload and collapse in the right actions cluster', () => {
    const { container } = renderNav();
    const actions = container.querySelector('.bcv-disco-header-actions');
    expect(actions).toBeTruthy();
    expect(actions?.querySelector('.bcv-upload-btn')).toBeTruthy();
    expect(actions?.querySelector('.bcv-disco-collapse-btn')).toBeTruthy();
    expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /collapse discography/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/visualiser/DiscographyNav.test.tsx --reporter=verbose`

Expected: FAIL — `.bcv-disco-header-title` not found (Albums link exists but is not wrapped).

- [ ] **Step 3: Wrap title + Albums in left cluster**

In `src/pages/Visualiser/DiscographyNav.tsx`, replace the expanded header block:

```tsx
<div className="bcv-disco-header">
  <div className="bcv-disco-header-title">
    <h2>Discography</h2>
    <Link to="/visualiser/albums" className="bcv-disco-albums-link">Albums</Link>
  </div>
  <div className="bcv-disco-header-actions">
    <button className="bcv-upload-btn" onClick={() => setIsUploadOpen(true)}>
      + Upload
    </button>
    <button
      className="bcv-disco-collapse-btn"
      onClick={handleCollapse}
      aria-label="Collapse discography"
      type="button"
    >
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m15 18-6-6 6-6" />
      </svg>
    </button>
  </div>
</div>
```

- [ ] **Step 4: Add left-cluster and Albums link CSS**

In `src/pages/Visualiser/DiscographyNav.css`, insert after `.bcv-disco-header h2 { ... }`:

```css
.bcv-disco-header-title {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  min-width: 0;
  flex: 1 1 auto;
}

.bcv-disco-header-title h2 {
  flex-shrink: 0;
}

.bcv-disco-albums-link {
  flex-shrink: 0;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-decoration: none;
  color: hsl(0, 0%, 55%);
  transition: color 0.15s ease;
}

.bcv-disco-albums-link:hover {
  color: hsl(0, 0%, 90%);
}

.bcv-disco-albums-link:focus-visible {
  outline: 1px solid hsl(0, 0%, 70%);
  outline-offset: 3px;
  border-radius: 2px;
}
```

Also update `.bcv-disco-header` to add a small gap so clusters never collide on narrow widths:

```css
.bcv-disco-header {
  padding: 1rem;
  border-bottom: 1px solid hsl(0, 0%, 15%);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/visualiser/DiscographyNav.test.tsx --reporter=verbose`

Expected: PASS (both tests).

- [ ] **Step 6: Commit**

```bash
git add \
  tests/visualiser/DiscographyNav.test.tsx \
  src/pages/Visualiser/DiscographyNav.tsx \
  src/pages/Visualiser/DiscographyNav.css \
  docs/superpowers/plans/2026-07-16-discography-albums-nav.md
git commit -m "$(cat <<'EOF'
fix(visualiser): separate Discography title and Albums link

EOF
)"
```

---

## Spec Coverage Self-Review

| Spec requirement | Task |
|---|---|
| Two clusters (title+Albums left, Upload/collapse right) | Task 1 Steps 3–4 |
| Quiet secondary Albums link (not bordered button) | Task 1 Step 4 |
| Define missing `.bcv-disco-albums-link` styles | Task 1 Step 4 |
| Gap so labels never read as one word | Task 1 Step 4 (`gap: 0.75rem`) |
| Route `/visualiser/albums` unchanged | Task 1 Step 3 + test |
| No collapse/Upload/sidebar width changes | Out of scope; actions cluster unchanged |
| Acceptance: working link + prior actions | Task 1 tests |

No placeholders. Class names consistent across test, TSX, and CSS.
