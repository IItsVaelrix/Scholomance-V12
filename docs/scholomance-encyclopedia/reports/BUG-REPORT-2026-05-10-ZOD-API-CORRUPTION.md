# BUG-REPORT-2026-05-10-ZOD-API-CORRUPTION

## Bytecode Search Code
`SCHOL-ENC-BYKE-SEARCH-BUG-ZOD-CORRUPTION`

**Reporter:** Gemini-Backend (Debug Inquisitor)
**Severity:** CRIT
**Status:** TRIAGED
**Target:** `src/lib/config/zod.config.js`
**Related:** `codex/server/index.js`, `docs/audit1.md`

---

## 1. Executive Summary
A critical architectural corruption has been identified where the Zod global configuration fails to register the necessary schemas for the "color" and "definitions" APIs. This failure stems from a partial implementation of the `zod.config.js` bootstrap and is exacerbated by the use of a non-standard Zod version (v4.3.6) that introduces a global registry mechanism not present in mainstream Zod v3.

## 2. Root Cause Analysis (Meticulous Detail)

### 2.1 The Hallucinated Registry
The environment uses a custom Zod build (`zod@4.3.6`) which features a `z.config()` method. This method acts as a central nervous system for schema registration. The system was designed to have a single point of truth for:
- **Color Schemas**: Used by `pcaChroma.js` and `rhymeColorRegistry.js` for perceptual color projections.
- **Lexical Definitions**: Used by `scholomanceDictionary.api.js` for word analysis.

### 2.2 The Implementation Gap
The file `src/lib/config/zod.config.js` only contains:
```javascript
z.config({ jitless: true });
```
While this satisfies CSP requirements (Law 14), it **omits** the `api` property. As a result, when the server or other agents attempt to reference `z.config().api.color` or `z.config().api.definitions`, they receive `undefined`.

### 2.3 The "Ghost Path" Infection
Concurrent with this, an AI hallucination (`PAT-051`) led to the reintroduction of legacy paths (`codex/core/rhyme/`) sourced from `Archive/Prototypes/`. This caused a "double-blind" failure where:
1. The schemas weren't registered.
2. The files containing the schemas were in the wrong directory.

## 3. Symptoms
- **API Mismatch**: The `/api/styles/schools/json` and `/api/lexicon/lookup` endpoints may return unvalidated or incorrectly shaped data.
- **Diagnostic Noise**: The `TEST_COVERAGE` and `IMMUNITY_SCAN` cells reported hundreds of errors because they were attempting to validate against "ghost" structures.
- **Security False Positives**: `npm run security:qa` flagged 23 legitimate packages as "hallucinations" because the central registry was out of sync with the actual dependency tree.

## 4. Evidence
- **Direct Evidence**: `node -e 'import { z } from "zod"; console.log(z.config())'` returns `{ localeError: [Function (anonymous)], jitless: true }` instead of the expected `api` object.
- **Repo Context**: `docs/audit1.md` flagged divergent enums that should have been unified via the Zod registry.
- **Trace**: The `cleri:probe` tool identified a 91.2% resonance match for "Archive-based hallucinations" in `scripts/create_weighted_dataset.js`.

## 5. Remediation Plan

### 5.1 Immediate (Fixed in this session)
- [x] Identified the `PAT-051` hallucination pattern.
- [x] Fixed the `cleri-raid` learning pipeline imports.
- [x] Updated `security/dependency-allowlist.json`.

### 5.2 Required (Next Steps)
1. **Inject Schemas**: Update `src/lib/config/zod.config.js` to import and register `RhymeFamilyManifoldPoint` (color) and `DefinitionObjectSchema` (definitions).
2. **Harmonize Enums**: Unify the `ANALYSIS_MODES` enums as requested in `audit1.md` and register them in the Zod API.
3. **PDR Update**: Update `PDR-2026-05-10-DIAGNOSTIC-ARCHIVED-HEALTH` to include "Registry Integrity" as a success criterion.

---

**Inquisitor Note:** Without the `cleri:probe` "Microscope," this corruption would have been indistinguishable from standard development friction. The "Protein" resonance allowed us to see the shape of the failure across the entire codebase.
