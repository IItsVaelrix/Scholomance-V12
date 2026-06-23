# Comb References: File Categories

## Orphan File Patterns

These patterns indicate a file may be orphaned or misplaced:

### UI Layer Files
```
src/ui/**/*.tsx ✓
src/ui/**/*.css ✓
src/ui/**/*.test.tsx ✓
src/ui/hooks/*.js ✓
src/ui/components/ PascalCase ✓
src/ui/pages/ kebab-case.tsx ✓
```

### Codex Layer Files
```
codex/core/**/*.js ✓
codex/core/**/*.ts ✓
codex/runtime/*.js ✓
codex/services/*.service.js ✓
codex/server/routes/*.routes.js ✓
```

### Bridge Files (src/lib/)
```
src/lib/**/*-bridge.js ✓
src/lib/**/*-adapter.js ✓
src/lib/**/*-client.js ✓
src/lib/**/*.service.js ✓
src/lib/**/*.engine.js ✓
```

### Forbidden Patterns
```
src/codex/ — Should not exist (use codex/ or src/lib/)
src/components/ — Use src/ui/components/
*.jsx in codex/ — Use .js or .ts
```

## Naming Conventions

### TypeScript/JSX Files
- Components: `PascalCase.tsx`
- Hooks: `camelCase.ts` or `use*Name*.js`
- Types: `*.types.ts`
- Contracts: `*.contracts.ts`
- Schemas: `*.schemas.ts`

### JavaScript Files
- Modules: `kebab-case.js`
- Services: `*.service.js`
- Engines: `*.engine.js`
- Bridges: `*-bridge.js`
- Adapters: `*-adapter.js`

### Test Files
- Unit tests: `*.test.js` or `*.test.ts`
- Integration: `*.integration.test.js`
- Visual: `*.qa.test.jsx`

## Layer Assignment Guide

| File Type | Primary Location | Bridge Location |
|-----------|-----------------|-----------------|
| Animation types | `codex/core/animation/contracts/` | `src/ui/animation/types.js` |
| AMP logic | `codex/core/animation/amp/` | `src/lib/amp-client.js` |
| Scoring heuristics | `codex/core/heuristics/` | N/A (Codex only) |
| UI components | `src/ui/` | N/A (UI only) |
| Runtime pipelines | `codex/runtime/` | N/A (Codex only) |
| Bridge adapters | `src/lib/` | N/A (re-export layer) |

## Common Tangles

### Tangled Import: UI → Codex
```
❌ import { foo } from '../../../../codex/core/...'
✓ import { foo } from '../../../lib/foo-bridge.js'
```

### Tangled Import: UI → Codex Types
```
❌ import type { Foo } from '../../../../codex/...'
✓ import type { Foo } from '../types.js'
```

### Missing Dead Code Entry
When deleting a file, always add to `dead-code.md`:
```markdown
## [Date]
- **File**: `path/to/deleted/file.js`
- **Reason**: [Why it was removed]
- **Consumers**: [Any files that referenced it]
- **Incident**: [Bug or PR that triggered deletion]
```

## Git Status Meanings

| Status | Meaning | Action |
|--------|---------|--------|
| `M` | Modified tracked file | Review changes |
| `D` | Deleted tracked file | Check dead-code.md |
| `R` | Renamed file | Update imports |
| `??` | Untracked new file | Verify placement |
| `A` | Added to index | Verify correct |
| `AM` | Added then modified | Investigate |
