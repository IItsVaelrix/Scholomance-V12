# PDR-2026-05-22-TOOLING-HARDENING-SPEC — Implementation Spec

> **PDR:** `PDR-2026-05-22-TOOLING-HARDENING.md`
> **Author / Implementer:** Claude (Sonnet 4.6)
> **Date:** 2026-05-22
> **Read order:** PDR §1–3 (problem + goal) → this file (concrete changes)

Each phase is independently mergeable. Implement in order; verify each phase
before starting the next.

---

## Phase 1 — TypeScript JSX coverage

**Closes:** MAJOR (`applyFormat` absent from ref handle), MINOR (`mirrored` prop drop)

### 1.1 — Extend `tsconfig.json` to include `.jsx` files

**File:** `tsconfig.json`

Change `include` from:

```json
"include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.d.ts"]
```

To:

```json
"include": [
  "src/**/*.ts",
  "src/**/*.tsx",
  "src/**/*.js",
  "src/**/*.jsx",
  "src/**/*.d.ts"
]
```

Add `checkJs: true` to `compilerOptions`:

```json
"compilerOptions": {
  "checkJs": true,
  ...existing options...
}
```

**Verification:** `npm run typecheck` — expect a flood of initial errors from
untyped `.jsx` files. These are catalogued in §1.3, not fixed wholesale.

### 1.2 — Add `ScrollEditorHandle` JSDoc typedef

This is the single most important type in the codebase for catching the MAJOR.
`editorRef.current.applyFormat` is the broken call. Typing the handle makes it
a compile error until `applyFormat` is either added to the handle or removed
from the caller.

**File:** `src/pages/Read/ScrollEditor.jsx`

Add directly above the `ScrollEditor = forwardRef(...)` declaration (around line 314):

```js
/**
 * @typedef {{
 *   save: () => void,
 *   jumpToLine: (lineNumber: number) => void,
 *   scrollTo: (y: number) => void,
 *   scrollToTopSmooth: () => void,
 *   replaceContent: (newContent: string) => void,
 *   readonly clientHeight: number,
 *   readonly scrollHeight: number,
 * }} ScrollEditorHandle
 */
```

Note: `applyFormat` is intentionally absent. It is not exposed by
`useImperativeHandle` at `ScrollEditor.jsx:769`. Adding it here before the
feature is implemented would be a lie. Omitting it makes `ToolsSidebar.jsx:27`
a type error.

### 1.3 — Add `@type` annotation to `editorRef` in ReadPage

**File:** `src/pages/Read/ReadPage.jsx`

Locate `const editorRef = useRef(null)` and annotate:

```js
/** @type {import('react').RefObject<import('./ScrollEditor.jsx').ScrollEditorHandle>} */
const editorRef = useRef(null);
```

This makes every callsite of `editorRef.current.*` checked against
`ScrollEditorHandle`. `editorRef.current.applyFormat` will now fail `tsc`
immediately.

### 1.4 — Add `ScrollEditorProps` JSDoc typedef

**File:** `src/pages/Read/ScrollEditor.jsx`

Add directly above the `ScrollEditorHandle` typedef:

```js
/**
 * @typedef {{
 *   content?: string,
 *   title?: string,
 *   isEditable?: boolean,
 *   isTruesight?: boolean,
 *   isPredictive?: boolean,
 *   disabled?: boolean,
 *   onContentChange?: (content: string) => void,
 *   onTitleChange?: (title: string) => void,
 *   onSave?: () => void,
 *   onCancel?: () => void,
 *   onCursorChange?: (pos: { line: number, col: number }) => void,
 *   onWordActivate?: (token: object) => void,
 *   onScrollChange?: (top: number) => void,
 *   analyzedDocument?: object | null,
 *   lineSyllableCounts?: number[] | null,
 *   analyzedWords?: Map<any, any>,
 *   analyzedWordsByCharStart?: Map<number, any>,
 *   analyzedWordsByIdentity?: Map<string, any>,
 *   analysisMode?: string,
 *   activeConnections?: any[],
 *   highlightedLines?: number[],
 *   pinnedLines?: number[],
 *   vowelColors?: object | null,
 *   vowelColorResolver?: ((word: string) => string) | null,
 *   predict?: ((text: string) => Promise<string[]>) | null,
 *   getCompletions?: ((prefix: string) => Promise<string[]>) | null,
 *   checkSpelling?: ((word: string) => Promise<boolean>) | null,
 *   getSpellingSuggestions?: ((word: string) => Promise<string[]>) | null,
 *   predictorReady?: boolean,
 *   plsPhoneticFeatures?: object | null,
 *   theme?: object | null,
 *   selectedSchool?: string,
 *   forceTopology?: object | null,
 *   initialContainerWidth?: number | null,
 *   ideMode?: 'EDIT' | 'TRUESIGHT' | 'NEUTRAL',
 *   onFocus?: () => void,
 *   onBlur?: () => void,
 * }} ScrollEditorProps
 */
```

Note `mirrored` is absent — it is not a declared prop. The callsites in ReadPage
that pass `mirrored={mirrored}` will produce a type warning, surfacing the issue.

### 1.5 — Suppress unavoidable errors with `@ts-ignore` comments

After adding the typedefs, `tsc` will report errors in unrelated parts of `.jsx`
files that were never typed. These are acceptable debt — the goal of Phase 1 is to
catch the two specific MAJOR/MINOR findings, not to achieve full JSX type coverage.

For unrelated errors in `.jsx` files not targeted by this PDR, add:

```js
// @ts-nocheck
```

at the top of the file to defer them. Files where this is acceptable:

- `src/pages/Read/AnalysisPanel.jsx` — display-only, no ref or prop issues
- `src/pages/Read/IDEAmbientCanvas.jsx` — clean per audit
- `src/pages/Read/Gutter.jsx` — clean per audit
- `src/pages/Read/IDEChrome.jsx` — display-only

Files that must NOT use `@ts-nocheck` (they contain the findings):

- `src/pages/Read/ScrollEditor.jsx`
- `src/pages/Read/ReadPage.jsx`
- `src/pages/Read/ToolsSidebar.jsx`
- `src/pages/Read/SearchPanel.jsx`

**Verification:** `npm run typecheck` produces errors in the target files pointing
at `applyFormat` (ToolsSidebar.jsx:27) and the undeclared `mirrored` prop usage.
All other errors are in `@ts-nocheck` suppressed files or are pre-existing `.ts` issues.

---

## Phase 2 — ESLint rule additions

**Closes:** `confirm()` NITPICK, dead-constant MINOR

**File:** `.eslintrc.json`

### 2.1 — `no-restricted-globals`

Add to the top-level `"rules"` object:

```json
"no-restricted-globals": [
  "error",
  {
    "name": "confirm",
    "message": "Use a custom confirmation modal. See FloatingPanel or addToast for patterns."
  },
  {
    "name": "alert",
    "message": "Use addToast() instead of alert()."
  },
  {
    "name": "prompt",
    "message": "Use a controlled React input instead of prompt()."
  }
]
```

This flags `confirm("Delete this scroll permanently?")` at `ScrollList.jsx:137`
as an error. Fix required: replace with a custom inline confirmation state.

**Pattern for the fix in ScrollList.jsx:**

```jsx
// Replace confirm() with local state
const [pendingDeleteId, setPendingDeleteId] = useState(null);

// In the delete button onClick:
onClick={(e) => { e.stopPropagation(); setPendingDeleteId(scroll.id); }}

// Render a small inline confirmation when pendingDeleteId === scroll.id:
{pendingDeleteId === scroll.id && (
  <div className="scroll-delete-confirm">
    <span>Delete?</span>
    <button onClick={() => { onDelete(scroll.id); setPendingDeleteId(null); }}>Yes</button>
    <button onClick={() => setPendingDeleteId(null)}>No</button>
  </div>
)}
```

### 2.2 — `no-shadow`

Add to the top-level `"rules"` object:

```json
"no-shadow": ["warn", { "hoist": "all", "allow": ["_"] }]
```

This warns on `const mirrored = false` at `ScrollEditor.jsx:533` if `mirrored`
is ever correctly destructured from props (which it should be). In the current
state where the prop is absent from destructuring, the warning is present but
harmless — it surfaces the issue for triage.

### 2.3 — `jsx-a11y/label-has-associated-control` (error mode)

The existing `jsx-a11y/recommended` sets this to `warn`. Promote to `error`:

```json
"jsx-a11y/label-has-associated-control": [
  "error",
  { "assert": "htmlFor", "depth": 3 }
]
```

**Verification:** `npm run lint` — must flag `ScrollList.jsx:137` for `confirm`.
The `no-shadow` and label rule warnings surface in the appropriate files.

---

## Phase 3 — jest-axe IDE component tests

**Closes:** Duplicate ID MINOR (`oracle-query-0` collision)

### 3.1 — Create the test file

**File:** `tests/qa/features/search-panel-a11y.test.jsx` (create new)

```jsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { MemoryRouter } from 'react-router-dom';
import SearchPanel from '../../../src/pages/Read/SearchPanel.jsx';

expect.extend(toHaveNoViolations);

function renderPanel(props = {}) {
  return render(
    <MemoryRouter>
      <SearchPanel seedWord="" selectedSchool="DEFAULT" {...props} />
    </MemoryRouter>
  );
}

describe('SearchPanel accessibility', () => {
  test('single instance: no axe violations', async () => {
    const { container } = renderPanel();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('two simultaneous instances: no duplicate IDs', async () => {
    const { container } = render(
      <MemoryRouter>
        <SearchPanel seedWord="fire"  selectedSchool="DEFAULT" />
        <SearchPanel seedWord="water" selectedSchool="DEFAULT" />
      </MemoryRouter>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

The second test **will fail** until the `idCounter` bug is fixed. That is the point —
it is a failing regression test that blocks merge until the fix lands.

### 3.2 — Fix the idCounter bug (unblocks Phase 3 tests)

**File:** `src/pages/Read/SearchPanel.jsx`

Move `idCounter` to module scope:

```js
// Module scope — outside SearchPanelInner
let _searchPanelIdCounter = 0;

function SearchPanelInner({ ... }) {
  // Replace:
  // let idCounter = 0;
  // const inputIdRef = useRef(`oracle-query-${idCounter++}`);

  // With:
  const inputIdRef = useRef(`oracle-query-${_searchPanelIdCounter++}`);
  ...
}
```

Each `SearchPanelInner` instance now gets a unique monotonically increasing ID:
`oracle-query-0`, `oracle-query-1`, etc. No duplicates across simultaneous mounts.

**Verification:** `npm run test:qa` — both axe tests pass. Run
`npm run test:qa features/search-panel-a11y` to target just this file.

---

## Phase 4 — CSS token verification script

**Closes:** `LIST_ROW_HEIGHT` / CSS variable sync MINOR

### 4.1 — Create the script

**File:** `scripts/verify-css-tokens.js` (create new)

```js
#!/usr/bin/env node
/**
 * Verifies that JS constants stay in sync with their CSS variable counterparts.
 * Exits non-zero on mismatch. Wire into build or pre-commit.
 *
 * TOKEN MAP: add entries here whenever a new manual-sync constraint is introduced.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const TOKEN_MAP = [
  {
    label: 'LIST_ROW_HEIGHT',
    cssFile: 'src/pages/Read/IDE.css',
    cssPattern: /--scroll-list-row-height:\s*(\d+(?:\.\d+)?)px/,
    jsFile: 'src/pages/Read/ScrollList.jsx',
    jsPattern: /LIST_ROW_HEIGHT\s*=\s*(\d+(?:\.\d+)?)/,
  },
];

let failed = false;

for (const token of TOKEN_MAP) {
  const css = readFileSync(join(root, token.cssFile), 'utf8');
  const js  = readFileSync(join(root, token.jsFile), 'utf8');

  const cssMatch = css.match(token.cssPattern);
  const jsMatch  = js.match(token.jsPattern);

  if (!cssMatch) {
    console.error(`FAIL [${token.label}]: pattern not found in ${token.cssFile}`);
    failed = true;
    continue;
  }
  if (!jsMatch) {
    console.error(`FAIL [${token.label}]: pattern not found in ${token.jsFile}`);
    failed = true;
    continue;
  }
  if (cssMatch[1] !== jsMatch[1]) {
    console.error(
      `FAIL [${token.label}]: JS=${jsMatch[1]} !== CSS=${cssMatch[1]}\n` +
      `  JS:  ${token.jsFile}\n` +
      `  CSS: ${token.cssFile}`
    );
    failed = true;
    continue;
  }

  console.log(`OK   [${token.label}] = ${jsMatch[1]}px`);
}

process.exit(failed ? 1 : 0);
```

### 4.2 — Wire into package.json

Add to `scripts`:

```json
"verify:css-tokens": "node scripts/verify-css-tokens.js"
```

Prepend to the `build` script:

```json
"build": "node scripts/verify-css-tokens.js && node scripts/generate-school-styles.js && npm run build:corpus && vite build"
```

**Verification:** `node scripts/verify-css-tokens.js` exits 0. Manually change
`LIST_ROW_HEIGHT` to 999 in `ScrollList.jsx` and confirm it exits 1 with the
mismatch message. Revert.

---

## Phase 5 — knip dead code detection

**Surfaces:** Dead exports, unused bindings, undeclared dependencies

### 5.1 — Install

```bash
pnpm add -D knip
```

### 5.2 — Create config

**File:** `knip.json` (project root)

```json
{
  "$schema": "https://unpkg.com/knip@latest/schema.json",
  "entry": [
    "src/main.jsx",
    "src/main.tsx",
    "vite.config.js",
    "codex/server/index.js"
  ],
  "project": [
    "src/**/*.{js,jsx,ts,tsx}",
    "codex/**/*.{js,ts}"
  ],
  "ignore": [
    "dist/**",
    "src/types/**",
    "**/*.d.ts"
  ],
  "ignoreDependencies": [
    "phaser",
    "@fontsource/press-start-2p"
  ],
  "ignoreExportsUsedInFile": true
}
```

### 5.3 — Add scripts

```json
"dead:scan": "knip",
"dead:scan:ci": "knip --reporter compact --no-exit-code"
```

`--no-exit-code` on the CI variant means knip findings are reported but do not
block the build. This is intentional — knip has a meaningful false-positive rate
on dynamic import patterns. Run `dead:scan` manually when triaging audit findings.

**Verification:** `npm run dead:scan` — review output. Expect to see
`const mirrored = false` at `ScrollEditor.jsx:533` flagged as an unused binding
once Phase 1 types are in place and the correct `mirrored` prop is either
destructured or confirmed intentionally absent.

---

## Phase 6 — Playwright axe integration

**Closes:** Duplicate ID + broader a11y regression guard on rendered IDE

### 6.1 — Install

```bash
pnpm add -D @axe-core/playwright
```

### 6.2 — Create the spec

**File:** `tests/visual/ide-a11y.spec.js` (create new)

```js
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('IDE accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/read');
    // Wait for the IDE chrome to be present
    await page.waitForSelector('.ide-topbar', { timeout: 10000 });
  });

  test('IDE: no axe violations on initial load', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .include('.ide-layout, .ide-topbar, .ide-statusbar, .tools-sidebar')
      .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('SearchPanel: no duplicate IDs when sidebar open', async ({ page }) => {
    // Open the search sidebar if not visible
    await page.click('[aria-label="Open Oracle Search"]');
    await page.waitForSelector('.search-panel', { timeout: 5000 });

    const results = await new AxeBuilder({ page })
      .include('.search-panel')
      .withRules(['duplicate-id', 'label'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
```

### 6.3 — Wire into test:visual script (optional)

The existing `test:visual` script covers `tests/visual/`. The new spec is
automatically included. To run just the a11y spec:

```bash
npx playwright test tests/visual/ide-a11y.spec.js --project=chromium
```

**Verification:** `npm run test:visual` — the two new specs pass. The
`SearchPanel` duplicate ID spec fails until Phase 3 fix (§3.2) is in place.

---

## Implementation checklist

```
[ ] Phase 1: tsconfig.json updated (checkJs: true, include .jsx)
[ ] Phase 1: ScrollEditorHandle @typedef added to ScrollEditor.jsx
[ ] Phase 1: editorRef annotated in ReadPage.jsx
[ ] Phase 1: ScrollEditorProps @typedef added to ScrollEditor.jsx
[ ] Phase 1: @ts-nocheck added to exempt files
[ ] Phase 1: npm run typecheck shows applyFormat and mirrored errors
[ ] Phase 2: no-restricted-globals added to .eslintrc.json
[ ] Phase 2: no-shadow added to .eslintrc.json
[ ] Phase 2: label-has-associated-control promoted to error
[ ] Phase 2: npm run lint clean (or failing on confirm() — expected)
[ ] Phase 2: confirm() replaced in ScrollList.jsx
[ ] Phase 3: tests/qa/features/search-panel-a11y.test.jsx created
[ ] Phase 3: _searchPanelIdCounter fix applied to SearchPanel.jsx
[ ] Phase 3: npm run test:qa passes (both axe tests green)
[ ] Phase 4: scripts/verify-css-tokens.js created
[ ] Phase 4: verify:css-tokens added to package.json scripts
[ ] Phase 4: verify:css-tokens prepended to build script
[ ] Phase 4: node scripts/verify-css-tokens.js exits 0
[ ] Phase 5: knip installed
[ ] Phase 5: knip.json created
[ ] Phase 5: dead:scan scripts added to package.json
[ ] Phase 5: npm run dead:scan runs without crash
[ ] Phase 6: @axe-core/playwright installed
[ ] Phase 6: tests/visual/ide-a11y.spec.js created
[ ] Phase 6: Playwright axe specs pass (after Phase 3 fix)
```

---

## What this does NOT fix

The following confirmed findings require product changes, not tooling changes.
They are documented here so they are not confused with tooling work:

| Finding | Required fix | Separate PR? |
|---|---|---|
| `applyFormat` not implemented | Implement the feature in ScrollEditor + expose on handle | Yes |
| `mirrored` prop not destructured | Destructure prop, remove hardcoded `false` | Yes |
| Tooltip scroll offset (`position: fixed` + raw coords) | Switch to `getBoundingClientRect()` coords + `scrollY` offset | Yes |
| Spellcheck Promise.all fan-out | Debounce the spellcheck validation effect | Yes |
| `caretMeasurement` module singleton | Move into `useRef`, extend signature with font metrics | Yes |

These are tracked separately. This PDR only closes what tooling can prevent;
it does not implement the features themselves.
