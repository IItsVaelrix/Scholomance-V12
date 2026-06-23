---
name: production-polish
description: Pre-commit production validation — Ensures code is production-grade before commit/push. Run before any commit to prevent CI/CD failures and error emails.
---

# Production Polish Initiative

**Invocation**: Type `production_polish` before every commit and push.

## Purpose

Before committing and pushing, this ritual validates that the code is production-grade:
- No TypeScript errors
- No linting failures
- No import breaks
- No test failures
- No build errors
- No secrets committed
- No large file commits
- CI/CD will pass

**This prevents the dreaded "Build Failed" email.**

---

## The Polish Ritual (9 Steps)

### Step 1: Type Safety Check
```bash
npx tsc --noEmit
```

### Step 2: Lint Check
```bash
npm run lint
```

### Step 3: Import Coherence (Immunity Scan)
```bash
node scripts/immunity-pre-commit.js --all
```

### Step 4: Test Gate
```bash
npm test
```

### Step 5: Build Verification
```bash
npm run build
```

### Step 6: Secret Scan
Heuristic scan of **all git-tracked** `*.js, *.jsx, *.ts, *.tsx, *.mjs, *.cjs` (excludes `node_modules`, `dist`, `.env*`, minified bundles). Flags high-confidence credential patterns (GitHub PATs, Slack tokens, AWS keys, PEM blocks, live Stripe keys, long `sk-…` tokens). Lines referencing `process.env` / `import.meta.env` or `POLISH_ALLOW_SECRET` are skipped.

```bash
# Run steps 6–9 together with the full ritual:
npm run polish
```

Or run **only** the gates script after other steps (it always runs steps 6–9 internally in full mode).

### Step 7: Large File Check
Lists **tracked** source files ≥ **500KB** and any tracked blob ≥ **5MB** (excluding `node_modules`, `dist`, `coverage`, `*.sqlite`, generated `corpus.json`). Informational only — does not fail the polish (per warning tolerances below).

### Step 8: Dependency Audit
```bash
npm audit --audit-level=high
```

### Step 9: Environment Validation
- Requires **`.env.example`** at repo root.
- Ensures **no duplicate** `KEY=` entries in `.env.example`.
- If **`package.json`** declares **`engines.node`**, verifies the running Node major satisfies it.

---

## One-command full ritual (all 9 steps)

```bash
npm run polish
```

Modes:
```bash
npm run polish:quick   # Steps 1–3 only
npm run polish:ci      # Full ritual, quieter error snippets
node scripts/production-polish.js force   # Emergency: same checks, non-zero exit only for hard blockers ignored (not recommended)
```

---

## The Polish Modes

| Mode | Description |
|------|-------------|
| `quick` | TypeScript and immunity only (~30s) |
| `full` | All 9 steps (~3-5 min) |
| `force` | Ignore non-critical issues (emergency only) |

---

## Critical Failures (Must Fix Before Commit)

1. TypeScript errors
2. ESLint errors (Step 2)
3. Critical immunity violations
4. Build failures
5. Test failures
6. Secret scan hits (Step 6 — high-confidence patterns)
7. Critical `npm audit` findings (Step 8)
8. Missing or invalid `.env.example` / duplicate keys / `engines.node` mismatch (Step 9)

## Warning Tolerances (Do Not Block)

1. ESLint warnings (if any are enabled outside `--quiet`)
2. Large tracked files (Step 7 — reported only)
3. Medium/low vulnerabilities

---

## The Polish Oath

When you see `production_polish`, you will validate ALL 9 steps before commit.

**Production-grade code only. No error emails.**
