# Comb Report Templates & Examples

## Quick Comb Report Template

```markdown
## Comb Report — [TIMESTAMP]

COMB STATUS: PASS | CONDITIONAL PASS | FAIL

### Git Audit (Tooth 1)
- Files created: [N]
- Files modified: [N]  
- Files deleted: [N]
- Untracked orphans: [N]

### Violations (Tooth 2)
- Critical: [N] — [FIXED / PENDING]
- Warnings: [N]
- Exceptions: [N]

### Dead Code (Tooth 3)
- Newly documented: [N]
- Already tracked: [N]
- Needs attention: [N]

### Sign-off
- [x] Ready for commit
- [ ] Blocked by: [issue]
```

## Full Comb Report Template

```markdown
## Comb Report — [TIMESTAMP] — [Session Focus]

COMB STATUS: PASS | CONDITIONAL PASS | FAIL

### Git Audit (Tooth 1)
- Files created: [N]
  - New files list...
- Files modified: [N]
  - Key changes...
- Files deleted: [N]
  - All documented in dead-code.md
- Untracked orphans: [N]
  - Orphaned files list...

### Violations (Tooth 2)
- Critical: [N] — [FIXED / PENDING]
- Warnings: [N]
- Exceptions: [N]
- Violation details...

### Dead Code (Tooth 3)
- Newly documented: [N]
- Already tracked: [N]
- Needs attention: [N]

### Import Coherence (Tooth 4)
- Naming violations: [N]
- Layer violations: [N]
- Circular deps: [N]

### Documentation Currency (Tooth 5)
- Up-to-date: [Y/N]
- Stale references: [N]
- Missing docs: [N]

### Test Coverage (Tooth 6)
- Covered: [N]
- Needs tests: [N]
- Coverage gaps: [N]

### Worktree Status (Tooth 7)
- Active: [N]
- Pending merge: [N]
- Stale: [N]

### Recommendations
1. [Action item]
2. [Action item]

### Sign-off
- [x] Ready for commit
- [ ] Blocked by: [issue]
```

## Example Comb Report

### Example 1: PASS

```markdown
## Comb Report — 2026-05-09 14:30 — Animation AMP Fix

COMB STATUS: PASS

### Git Audit (Tooth 1)
- Files created: 3
  - `codex/runtime/amp.pipeline.js` — AMP eventBus pipeline
  - `src/lib/amp-client.js` — UI bridge
  - `src/ui/animation/types.js` — Type re-exports
- Files modified: 6
  - `src/ui/animation/adapters/motionToFramerProps.ts`
  - `src/ui/animation/components/MotionDebugBadge.tsx`
  - `src/ui/animation/components/MotionInspector.tsx`
  - `src/ui/animation/hooks/useAnimationIntent.ts`
  - `src/ui/animation/hooks/useAnimationSubmitter.ts`
  - `src/ui/animation/hooks/useResolvedMotion.ts`
- Files deleted: 0
- Untracked orphans: 0

### Violations (Tooth 2)
- Critical: 0 — All 6 LING-0F03 violations FIXED
- Warnings: 0
- Exceptions: 0

### Dead Code (Tooth 3)
- Newly documented: 0
- Already tracked: 0
- Needs attention: 0

### Import Coherence (Tooth 4)
- Naming violations: 0
- Layer violations: 0 (bridge pattern applied)
- Circular deps: 0

### Documentation Currency (Tooth 5)
- Up-to-date: YES
- Stale references: 0
- Missing docs: 0

### Test Coverage (Tooth 6)
- Covered: 6 (all modified files have existing tests)
- Needs tests: 0
- Coverage gaps: 0

### Worktree Status (Tooth 7)
- Active: 11 (current worktree active)
- Pending merge: 0
- Stale: 0

### Recommendations
1. Consider creating integration test for bridge pattern

### Sign-off
- [x] Ready for commit
```

### Example 2: CONDITIONAL PASS

```markdown
## Comb Report — 2026-05-09 15:00 — New Feature Implementation

COMB STATUS: CONDITIONAL PASS

### Git Audit (Tooth 1)
- Files created: 8
  - New files list...
- Files modified: 12
- Files deleted: 2
  - `old-feature.js` — documented in dead-code.md
  - `deprecated-util.js` — documented in dead-code.md
- Untracked orphans: 1
  - `temp-debug-output.txt` — should be removed

### Violations (Tooth 2)
- Critical: 0
- Warnings: 3
  - QUANT-0101: Math.random() in atmosphere effects (allowed)
  - INFRA-0G01: Legacy port 3000 in comments (expected)
  - STATE-0307: CSRF fetch in non-auth hook (exception documented)
- Exceptions: 3 (all documented)

### Dead Code (Tooth 3)
- Newly documented: 2
- Already tracked: 0
- Needs attention: 0

### Import Coherence (Tooth 4)
- Naming violations: 0
- Layer violations: 0
- Circular deps: 0

### Documentation Currency (Tooth 5)
- Up-to-date: YES
- Stale references: 0
- Missing docs: 0

### Test Coverage (Tooth 6)
- Covered: 15
- Needs tests: 3
  - `new-feature.ts` — unit test needed
  - `another-feature.ts` — integration test needed
  - `api-route.ts` — endpoint test needed

### Worktree Status (Tooth 7)
- Active: 11
- Pending merge: 2
  - `busy-shannon` — animation fixes
  - `elegant-greider` — UI polish
- Stale: 0

### Recommendations
1. Write 3 missing tests before merge
2. Merge pending worktrees soon to avoid drift

### Sign-off
- [ ] Blocked by: Missing test coverage
- [ ] Ready after: Tests written
```

## Violation Exception Template

When documenting exceptions to violations:

```markdown
### Exceptions Documented

| Rule ID | Location | Reason | Authorized By |
|---------|----------|--------|---------------|
| QUANT-0101 | `effects/particle.ts` | Atmospheric jitter requires true randomness | Angel |
| LING-0F03 | `tests/` | Test files are exempt from layer rules | SCHOLOMANCE LAW |
| INFRA-0G01 | `README.md` | Documentation references production config | N/A |
```

## Dead Code Entry Template

```markdown
## [YYYY-MM-DD]

### Files Deleted
- **File**: `path/to/file.js`
- **Reason**: [Bug fix / Feature removal / Refactor]
- **Consumers**: [List of files that referenced this]
- **Incident**: [PR or Bug number]
- **Migration**: [How to find this functionality now]
```
