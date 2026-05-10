# BUG-2026-04-27 — RECURSIVE SHADOW (SERVICE LOOP)

## Anomaly Name
Recursive Shadow Anomaly

## Entropy Classification
**Logic-Fracture / Recursion**

## Reproduction Ritual
1.  Import a function from a service (e.g., `searchHybrid`).
2.  Assign that exact same name to a method within a service object.
3.  Call the method: `await collabService.searchHybrid(q)`.
4.  Observe the 500 error `0x0301: STATE` as the recursion depth limit (8 levels) is exceeded.

## Forensic Diagnosis
The JavaScript execution context shadows the outer scope import when a property of the same name exists within the object's method scope, or when the object method is called without an explicit alias. In our case, the service method `searchHybrid` was resolving to itself instead of the imported `searchHybrid` from `codebaseSearch.service.js`, creating an infinite loop.

## The Failing Test
Verified via `tests/qa/backend/archive_dominance.test.js` which previously triggered the 500 error until the imports were aliased.

## The Stasis Fix
1.  **Aliased Imports:** All internal search functions are now imported with an `Internal` suffix (e.g., `searchHybridInternal`).
2.  **Pathogen Marker:** Added `// PATHOGEN_MARKER: RECURSIVE_SHADOW` to the affected site.
3.  **Immune System Integration:** Registered `pathogen.recursive-shadow` in the `PathogenRegistry` to enable adaptive detection of similar name-clash patterns.

## Encyclopedia Entry
`SCHOL-ENC-BUG-RECURSIVE-SHADOW-V1`
"The shadow of a name must not become a mirror for its own voice."
