# Scholomance Dev Tools — Implemented Tooling Gates

> **Status: IMPLEMENTED** — All six phases of `PDR-2026-05-22-TOOLING-HARDENING` are live.
> Spec: `docs/scholomance-encyclopedia/PDR-archive/PDR-2026-05-22-TOOLING-HARDENING-SPEC.md`
> PDR: `docs/scholomance-encyclopedia/PDR-archive/PDR-2026-05-22-TOOLING-HARDENING.md`

---

## Audit findings these tools close

| Finding | Severity | Closed by |
|---|---|---|
| `applyFormat` not on ref handle — toolbar silent no-op | MAJOR | TypeScript `// @ts-check` on ToolsSidebar |
| `mirrored` prop passed but never destructured | MINOR | `ScrollEditorProps` typedef (fixed, now destructured) |
| `const mirrored = false` hardcoded | MINOR | `no-shadow` ESLint rule |
| `confirm()` in ScrollList delete flow | NITPICK | `no-restricted-globals` ESLint rule + fix applied |
| Duplicate `id="oracle-query-0"` across SearchPanel instances | MINOR | jest-axe test + `_searchPanelIdCounter` fix |
| `LIST_ROW_HEIGHT` / CSS variable manual sync | MINOR | `verify:css-tokens` build pre-flight |
| Dead exports and unused bindings | Ongoing | `knip` on demand |

---

## Tool 1 — TypeScript coverage on IDE JSX files

**Mechanism:** `tsconfig.ide-targets.json` + per-file `// @ts-check`

`tsconfig.ide-targets.json` scopes to the four IDE target files with `allowJs: true` and `checkJs: false`. Per-file `// @ts-check` directives opt individual files into type checking without cascading into all imported modules.

**Currently opted in:**
- `src/pages/Read/ToolsSidebar.jsx` — `// @ts-check` at line 1

**Type contracts in place:**
- `ScrollEditorHandle` `@typedef` in `ScrollEditor.jsx:370` — lists every method exposed by `useImperativeHandle`. Any caller of a method NOT in this typedef gets a compile error.
- `ScrollEditorProps` `@typedef` in `ScrollEditor.jsx:322` — lists every accepted prop. Passing an undeclared prop is a type warning at the callsite.
- `editorRef` in `ReadPage.jsx:129` — annotated as `RefObject<ScrollEditorHandle>`.

**What typecheck catches today:**

```
ToolsSidebar.jsx(50,25): error TS2339: Property 'applyFormat' does not exist on type 'ScrollEditorHandle'.
```

This is an intentional failing error — `applyFormat` is not implemented. The error blocks merge until the method is either added to `useImperativeHandle` (and the typedef) or the call is removed.

**Run:**

```bash
npm run typecheck
# Runs: tsc -p tsconfig.json && tsc -p tsconfig.checkjs.json && tsc -p tsconfig.ide-targets.json
```

**Adding a new method to the handle (any agent):**

When `applyFormat` is implemented, add it to BOTH places atomically:

1. `ScrollEditor.jsx` `ScrollEditorHandle` typedef:
   ```js
   * @typedef {{
   *   save: () => void,
   *   ...
   *   applyFormat: (type: string) => void,   // ← add here
   * }} ScrollEditorHandle
   ```

2. `useImperativeHandle` in `ScrollEditor.jsx:769`:
   ```js
   useImperativeHandle(ref, () => ({
     save,
     ...
     applyFormat: (type) => { /* impl */ },   // ← add here
   }));
   ```

If you add to one and not the other, `npm run typecheck` fails.

**Adding `// @ts-check` to a new target file:**

Only do this for files that have complete JSDoc `@typedef` coverage of their props and refs. Adding it to a file without typedefs generates noise. The four target files are the minimum scope for this PDR.

---

## Tool 2 — ESLint rule additions

**Status:** Live in `.eslintrc.json` top-level `rules`.

### `no-restricted-globals`

Bans `confirm()`, `alert()`, and `prompt()` in all `src/` files.

```
confirm("Delete...") → error: Use a custom confirmation modal.
```

**The fix pattern** (already applied to `ScrollList.jsx`):

```jsx
const [pendingDelete, setPendingDelete] = useState(false);

// Delete button:
onClick={(e) => { e.stopPropagation(); setPendingDelete(true); }}

// Inline confirmation:
{pendingDelete && (
  <div className="scroll-delete-confirm" role="group" aria-label="Confirm deletion">
    <span>Delete?</span>
    <button onClick={() => { onDelete(id); setPendingDelete(false); }}>Yes</button>
    <button onClick={() => setPendingDelete(false)}>No</button>
  </div>
)}
```

CSS for `.scroll-delete-confirm` is in `IDE.css:2944`.

### `no-shadow`

Warns when an inner `const` name shadows an outer-scope name. Catches accidental `const mirrored = false` patterns where the intent was to destructure a prop.

### `jsx-a11y/label-has-associated-control`

Promoted from `warn` to `error` with `assert: "htmlFor"`. All `<label>` elements must have a valid `htmlFor` targeting an existing element.

**Run:**

```bash
npm run lint
```

---

## Tool 3 — jest-axe IDE component tests

**Status:** Live. Tests: `tests/qa/features/search-panel-a11y.test.jsx`

Two tests:
1. Single `SearchPanel` instance — no axe violations
2. Two simultaneous `SearchPanel` instances — no duplicate IDs

Both pass. The duplicate ID bug was fixed by moving `idCounter` to module scope as `_searchPanelIdCounter` in `SearchPanel.jsx:154`.

**Run:**

```bash
npm run test:qa
# Or targeted:
npx vitest run tests/qa/features/search-panel-a11y.test.jsx
```

**Adding axe tests for a new component:**

```jsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { MemoryRouter } from 'react-router-dom';
import MyComponent from '../../../src/pages/Read/MyComponent.jsx';

expect.extend(toHaveNoViolations);

test('MyComponent: no axe violations', async () => {
  const { container } = render(<MemoryRouter><MyComponent /></MemoryRouter>);
  expect(await axe(container)).toHaveNoViolations();
});
```

Place new tests in `tests/qa/features/`.

---

## Tool 4 — CSS token verification script

**Status:** Live. Script: `scripts/verify-css-tokens.js`

Verifies that JS constants stay in sync with their CSS variable counterparts. Exits non-zero on mismatch. Runs before every build.

**Current token map:**

| JS constant | File | CSS variable | File |
|---|---|---|---|
| `LIST_ROW_HEIGHT = 120` | `ScrollList.jsx:5` | `--scroll-list-row-height: 120px` | `IDE.css:2772` |

**Run:**

```bash
npm run verify:css-tokens
# Output: OK   [LIST_ROW_HEIGHT] = 120px
```

**Adding a new synced token:**

Open `scripts/verify-css-tokens.js` and add an entry to `TOKEN_MAP`:

```js
{
  label: 'MY_CONSTANT',
  cssFile: 'src/pages/Read/IDE.css',
  cssPattern: /--my-css-var:\s*(\d+(?:\.\d+)?)px/,
  jsFile: 'src/pages/Read/MyComponent.jsx',
  jsPattern: /MY_CONSTANT\s*=\s*(\d+(?:\.\d+)?)/,
},
```

The script fails the build if the values don't match. This is the contract: if you change one, you must change both, and `npm run build` enforces it.

---

## Tool 5 — knip dead code detection

**Status:** Live. Config: `knip.json`. Version: 6.14.2.

Scans for unused exports, dead bindings, and undeclared dependencies. Does **not** block CI — run manually during audits and triage.

**Run:**

```bash
npm run dead:scan          # Full report
npm run dead:scan:ci       # Compact format, no exit code (for CI reporting)
```

**Scope:**

- Entry: `src/main.jsx`, `src/main.tsx`, `vite.config.js`, `codex/server/index.js`
- Project: all `src/` and `codex/` JS/TS files
- Ignored deps: `phaser`, `@fontsource/press-start-2p` (bundled but not imported directly)
- `ignoreExportsUsedInFile: true` — suppresses false positives from module-internal re-use

**When to run:** Before a savage-audit pass, when triaging dead code findings, or when a refactor removes a feature and you want to surface orphaned exports.

---

## Tool 6 — Playwright axe integration

**Status:** Live. Spec: `tests/visual/ide-a11y.spec.js`. Package: `@axe-core/playwright`.

Two specs:
1. IDE initial load — no axe violations across `.ide-layout`, `.ide-topbar`, `.ide-statusbar`, `.tools-sidebar`
2. SearchPanel sidebar open — no duplicate IDs or label violations

**Run:**

```bash
npx playwright test tests/visual/ide-a11y.spec.js --project=chromium
# Or as part of the full visual suite:
npm run test:visual
```

Requires a running dev server (`npm run dev:server` in a separate terminal, or the Playwright `webServer` config handles it).

---

## CI gate summary

| Script | Gate | Blocks on |
|---|---|---|
| `npm run typecheck` | Yes | `applyFormat` missing from handle; prop mismatches in `// @ts-check` files |
| `npm run lint` | Yes | `confirm()` / `alert()` / `prompt()` calls; shadow declarations; unlabelled inputs |
| `npm run test:qa` | Yes | jest-axe violations; duplicate IDs; unit regressions |
| `npm run build` | Yes | `verify:css-tokens` mismatch; school style gen failure; corpus gen failure |
| `npm run dead:scan` | No | Dead code (advisory only — too many dynamic-import false positives for hard blocking) |
| `npm run test:visual` | Yes | Playwright axe violations; visual regression diffs |

---

## Adding a new IDE file to the type-checked set

1. Add a complete `@typedef` for the component's props at the top of the file.
2. Add `// @ts-check` as the first line of the file.
3. Add the file path to `tsconfig.ide-targets.json` `include` array.
4. Run `npm run typecheck` and resolve any real errors (suppress false positives with `// @ts-ignore` inline, not `// @ts-nocheck`).
5. Do NOT add `@ts-check` to files without prop typedefs — the noise defeats the purpose.

---

## Source of truth for each tool

| Tool | Config | Docs |
|---|---|---|
| TypeScript (IDE) | `tsconfig.ide-targets.json` | This file §Tool 1 |
| ESLint | `.eslintrc.json` | This file §Tool 2 |
| jest-axe | `tests/qa/features/search-panel-a11y.test.jsx` | This file §Tool 3 |
| CSS tokens | `scripts/verify-css-tokens.js` | This file §Tool 4 |
| knip | `knip.json` | This file §Tool 5 |
| Playwright axe | `tests/visual/ide-a11y.spec.js` | This file §Tool 6 |
