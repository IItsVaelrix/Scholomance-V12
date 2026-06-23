# PDR-2026-05-22-TOOLING-HARDENING — IDE Tooling Hardening

## Subtitle
Closing Savage-Audit MAJORs and MINORs via Targeted Developer Tooling

**Status:** Draft
**Classification:** Preventative | Quality | Tooling
**Priority:** High
**Primary Goal:** Close all confirmed audit findings that tooling can prevent —
two MAJORs and four MINORs — so they cannot recur on any future merge.

---

# 1. Executive Summary

Two consecutive savage-audit passes of the Scholomance IDE layer yielded:

- **2 MAJOR findings** — both are silent type mismatches invisible to the current
  toolchain (`applyFormat` absent from ref handle; `mirrored` prop passed but never
  destructured). Neither produced a console error. Neither failed a lint check.
  Both shipped to production.

- **4 MINOR findings** — a duplicate HTML ID factory, a manual CSS/JS sync
  constraint with no enforcement, a native `confirm()` call in a styled IDE, and
  dead code that hardcoded `false` over an intended prop value.

This PDR establishes the tooling layer that makes all six findings impossible to
merge silently. It does not change product behavior. It changes what the build is
allowed to accept.

**Reference:** `docs/dev-tools.md` (full per-tool rationale and finding mapping)
**Companion:** `PDR-2026-05-22-TOOLING-HARDENING-SPEC.md` (implementation spec)

---

# 2. Problem Statement

### 2.1 TypeScript is present but does not cover the IDE layer

`tsconfig.json` covers `src/**/*.ts` and `src/**/*.tsx` with `strict: true`.
The entire IDE surface — `ScrollEditor.jsx`, `ReadPage.jsx`, `ToolsSidebar.jsx`,
`SearchPanel.jsx` — is `.jsx` and `checkJs: false`. These files receive no type
checking. The `useImperativeHandle` handle type and the component props type are
both inferred as `any`.

Consequence: a caller can reference `editorRef.current.applyFormat()` on a ref
handle that never exposes that method, and the build succeeds.

### 2.2 The optional chaining operator conceals broken callsites

`editorRef?.current?.applyFormat(type)` at `ToolsSidebar.jsx:27` swallows the
`TypeError: applyFormat is not a function` that would otherwise be visible in the
console. Without types and without a test that clicks the button and asserts the
content changed, the broken toolbar is undetectable by any automated system in the
current pipeline.

### 2.3 Accessibility linting is enabled but not wired to multi-instance scenarios

`jsx-a11y/recommended` is active. The duplicate ID bug in `SearchPanel` (where every
instance generates `id="oracle-query-0"`) is not caught by lint alone because lint
operates on single-file analysis. Multi-instance ID collisions only surface in a
rendered DOM. `jest-axe` is installed but not wired to IDE component tests.

### 2.4 Manual sync constraints are not machine-enforced

`LIST_ROW_HEIGHT = 120` in `ScrollList.jsx` must equal `--scroll-list-row-height: 120px`
in `IDE.css`. This is documented only in a comment. No script, test, or lint rule
enforces it.

### 2.5 `no-restricted-globals` is absent

`confirm()` is not restricted. A native browser dialog is in the delete flow of
a styled IDE.

---

# 3. Product Goal

After this PDR is implemented:

1. Any attempt to call a method not present on a typed ref handle produces a
   `tsc` error. `applyFormat` cannot be missing from the handle without the
   typecheck failing.

2. Any attempt to pass a prop not declared in a component's typed props interface
   produces a `tsc` error. The `mirrored` prop cannot be silently dropped.

3. Two simultaneously-rendered `SearchPanel` instances fail `jest-axe` with a
   duplicate ID violation, blocking the test suite.

4. `LIST_ROW_HEIGHT` diverging from the CSS variable fails `npm run verify:css-tokens`,
   blocking the build.

5. `confirm()` in any `src/` file is a lint error.

6. Dead module-level assignments and unused exports are surfaced by `knip` on demand.

---

# 4. Core Design Principles

- **No behavioral changes.** This PDR adds detection, not modification. Every product
  feature works identically before and after. The only thing that changes is what
  the build rejects.

- **Tooling must map to confirmed findings.** Nothing is added speculatively. Each
  tool has a specific finding in the audit record it closes.

- **Incremental, independently mergeable.** Each phase is a self-contained change.
  Phase 1 (TypeScript) can ship without Phase 4 (CSS token script). Phases do not
  depend on each other except where noted.

- **TypeScript first, lint second.** Where both TypeScript and a lint rule could
  catch the same thing, TypeScript is preferred. It is harder to suppress, more
  precise, and visible to IDE tooling without a lint pass.

---

# 5. Scope

### In scope

| Item | Rationale |
|---|---|
| TypeScript coverage for `src/**/*.jsx` | Closes two MAJORs |
| JSDoc `@typedef` for `ScrollEditorHandle` | Prerequisite for TypeScript ref typing |
| `no-restricted-globals` ESLint addition | Closes `confirm()` NITPICK |
| `no-shadow` ESLint addition | Closes dead-constant MINOR |
| `jsx-a11y/label-has-associated-control` (error mode) | Strengthens existing a11y posture |
| `jest-axe` wired to `SearchPanel` component test | Closes duplicate ID MINOR |
| `verify:css-tokens` script | Closes LIST_ROW_HEIGHT sync MINOR |
| `knip` installation + `dead:scan` script | Surfaces dead code on demand |

### Out of scope

- Migrating `.jsx` files to `.tsx` (follow-up PDR if desired)
- Adding types to `codex/` (separate concern, covered by `tsconfig.checkjs.json`)
- Fixing the actual product bugs found (separate PRs: `applyFormat` impl, `mirrored`
  prop wiring, SearchPanel ID factory, tooltip scroll offset)

---

# 6. Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CI / Pre-Commit Gate                         │
│                                                                     │
│  npm run typecheck  →  tsc (covers .jsx via checkJs)               │
│  npm run lint       →  ESLint (no-restricted-globals, no-shadow)   │
│  npm run test:qa    →  Vitest (jest-axe on SearchPanel)            │
│  npm run build      →  includes verify:css-tokens pre-flight       │
│  npm run dead:scan  →  knip (on demand, not blocking CI)           │
└─────────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
  Type errors           Lint errors          Test failures
  (ref handle,          (confirm(),          (duplicate IDs,
   prop mismatch)        no-shadow)           axe violations)
```

---

# 7. Implementation Phases

| Phase | Name | Blocking CI? | Effort |
|---|---|---|---|
| 1 | TypeScript JSX coverage | Yes (typecheck script) | Medium |
| 2 | ESLint rule additions | Yes (lint script) | Low |
| 3 | jest-axe IDE component tests | Yes (test:qa) | Low |
| 4 | CSS token verification script | Yes (build script) | Low |
| 5 | knip installation | No (dead:scan only) | Low |
| 6 | Playwright axe integration | Yes (test:visual) | Low |

---

# 8. QA Requirements

- `npm run typecheck` passes with zero errors after Phase 1
- `npm run lint` passes with zero new errors after Phase 2
- The two new jest-axe tests pass in isolation after Phase 3
- `npm run verify:css-tokens` exits 0 after Phase 4
- `npm run dead:scan` runs without error after Phase 5
- The new Playwright axe spec passes against a running dev server after Phase 6

---

# 9. Success Criteria

On the next savage-audit pass of the IDE layer:

1. The `applyFormat` gap is either caught by `tsc` before reaching audit, or is
   documented in `useImperativeHandle` and surfaced in the handle type — either way
   it cannot be a silent MAJOR.

2. The `mirrored` prop drop is either a compile error (prop typed, caller gets error)
   or the prop is correctly wired — either way it cannot be a silent MINOR.

3. `oracle-query-0` duplicate IDs are caught by the `jest-axe` test before merge.

4. `confirm()` does not appear in any audited file.

5. The `LIST_ROW_HEIGHT` sync constraint is machine-enforced; the build fails if
   it drifts.

---

**Status:** Draft
**Author:** Claude (Sonnet 4.6)
**Date:** 2026-05-22
**Companion spec:** `PDR-2026-05-22-TOOLING-HARDENING-SPEC.md`
**Source audit:** `docs/dev-tools.md`
