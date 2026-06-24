---
name: comb-initialize
description: The Sifting Data as a Comb Initiative — A framework for AI agents to always organize their work after every coding spree. Invoke by typing 'comb_initialize' to run the combing ritual.
---

# The Sifting Data as a Comb Initiative

**Invocation**: Type `comb_initialize` to activate this framework.

## Purpose

After every coding spree—where parallel agents create, modify, delete, and scatter artifacts across the codebase—this ritual ensures the codebase remains organized, coherent, and navigable. Like a comb through tangled hair, it separates the strands of work into clean, parallel lines.

## The Comb Philosophy

Every AI intervention leaves traces:
- **New files** — orphaned or properly named?
- **Modified files** — consistent with conventions?
- **Deleted files** — documented or ghosted?
- **Imports** — resolving or creating new violations?
- **Documentation** — updated or stale?

The comb finds these tangles and either resolves them or flags them for human attention.

---

## The Combing Ritual (7 Teeth)

Execute these steps in order after every coding session:

### Tooth 1: Git Status Audit
```
git status --porcelain
```
Categorize all changes:
- **New untracked** (`??`) — Should these exist? Are they properly placed?
- **Modified** (`M`) — Are changes intentional and functional?
- **Deleted** (`D`) — Is the deletion documented in dead-code.md?
- **Renamed** — Is the rename reflected in all imports?

### Tooth 2: Layer Violation Scan
```
node scripts/immunity-pre-commit.js --all
```
- If CRITICAL violations exist → Fix before proceeding
- If only warnings → Document exceptions
- If clean → Proceed to Tooth 3

### Tooth 3: Dead Code Triage
Check if any deleted files should be documented:
1. Were functional files deleted (not just temp artifacts)?
2. Are they documented in `dead-code.md`?
3. Is there a migration path for consumers?

### Tooth 4: Import Coherence
Verify newly created files:
1. Follow naming conventions (`kebab-case.ts`, `PascalCase.tsx`)
2. Live in the correct layer (`src/lib/` for bridges, `codex/core/` for engines)
3. Have no circular dependencies

### Tooth 5: Documentation Currency
Check if new features need documentation:
1. New routes → `routes.js` exports updated?
2. New API endpoints → `codex/server/routes/` documented?
3. New schema changes → `SCHEMA_CONTRACT.md` updated?

### Tooth 6: Test Coverage Verification
Ensure new logic has test coverage:
1. New `codex/core/` functions → Unit test in `tests/qa/`
2. New UI components → Component test or visual baseline
3. New API endpoints → Integration test

### Tooth 7: Worktree Hygiene
Check git worktree status:
1. Are worktrees being actively developed or abandoned?
2. Merge pending changes before they drift
3. Prune stale worktrees

---

## The Comb Report

After execution, produce this report:

```markdown
## Comb Report — [Timestamp] — [Session Focus]

COMB STATUS: [PASS | CONDITIONAL PASS | FAIL]

### Git Audit
- Files created: [N]
- Files modified: [N]  
- Files deleted: [N]
- Untracked orphans: [N]

### Violations
- Critical: [N]
- Warnings: [N]
- Exceptions: [N]

### Dead Code
- Newly documented: [N]
- Already tracked: [N]
- Needs attention: [N]

### Documentation Currency
- Up-to-date: [Y/N]
- Stale references: [N]

### Test Coverage
- Covered: [N]
- Needs tests: [N]

### Worktree Status
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

---

## The Comb in Practice

### Before the Comb
- Parallel agents have been coding
- Files are scattered across layers
- Some imports are broken
- Documentation is stale
- Dead code is untracked

### After the Comb
- All violations fixed or documented
- Dead code registered
- Documentation current
- Tests passing
- Clean `git status`

---

## The Four Modes

### Quick Comb (`comb_initialize quick`)
Skip Teeth 5-7. Focus on violations and dead code.

### Full Comb (`comb_initialize`)
Execute all 7 teeth. Takes 5-10 minutes.

### Force Comb (`comb_initialize --force`)
Ignores non-critical violations and forces documentation.

### Watch Comb (`comb_initialize --watch`)
Run on every file save (for active development sessions).

---

## Integration Points

### IDE Integration
Add to your agent prompt:
```
After every coding session, run: comb_initialize
```

### CI Integration
Add to `.github/workflows/`:
```yaml
- name: Run Comb
  run: comb_initialize --ci
```

### Pre-commit Hook
The `immunity-pre-commit.js` already runs Tooth 2. Extend it to call comb for full checks.

---

## The Comb Charter

This skill is **mandatory** for all AI agents operating on Scholomance V12+. It ensures:

1. **No orphaned files** — Every file has a purpose
2. **No layer violations** — UI and Codex stay separated
3. **No ghost code** — Deleted code is documented
4. **No stale docs** — Documentation matches implementation
5. **No coverage gaps** — New logic is tested
6. **No worktree drift** — Branches stay in sync
7. **No friction** — The codebase remains navigable

---

## The Comb Oath

When you see `comb_initialize`, you will:

1. Run `git status --porcelain`
2. Scan with `immunity-pre-commit.js`
3. Document dead code
4. Verify import coherence
5. Update documentation
6. Check test coverage
7. Report worktree status
8. Produce the Comb Report

**The comb does not judge. It sifts. It organizes. It reveals.**
