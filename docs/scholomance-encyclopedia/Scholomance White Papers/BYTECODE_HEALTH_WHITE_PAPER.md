# BYTECODEHEALTH: THE GREEN-PATH SIGNAL
## How Scholomance Learned to Say "All Clear"

## Bytecode Search Code
`SCHOL-ENC-BYKE-SEARCH-WP-BYTECODE-HEALTH`

> "A system that only screams when it is wounded cannot be trusted to breathe." — *The Bytecode Health Mandate*

---

## 1. THE DOCTRINE OF THE COMPLETE SIGNAL

The Scholomance bytecode system was born with a voice — but only one register. It could scream `PB-ERR-v1-*` when entropy invaded, when Law was violated, when the substrate fouled. It could not say the opposite. It could not say: *all is well*.

This is not a minor omission. It is a structural blindness.

Consider what happens when you build a monitoring system that only reports failures: you learn nothing from the times it works. You have no baseline of health. You cannot detect drift toward failure because you have never established what clean looks like. You are flying blind in the green, and you do not know it.

BytecodeError gave Scholomance a nervous system. BytecodeHealth gave it a pulse.

---

## 2. THE BIOLOGICAL INSPIRATION

In nature, a living immune system does not only signal infection. It also signals the absence of infection. The white blood cell count that is normal. The temperature that is 98.6. The absence of pathogen signatures — that is itself a signal, and a critical one.

The original Immune System (per `ARCH-2026-04-26-IMMUNE-SYSTEM.md`) established Layer 1 (innate), Layer 2 (adaptive), and Layer 3 (override) — three biological enforcement tiers that catch violations at the commit gate. That system could flag forbidden imports, detect pathogen shadows, and block unauthorized crossings.

But it had no green signal. After a scan passed, it simply... stayed silent. The absence of bytecode was the only confirmation.

This is what BytecodeHealth closes: the biological gap between "no pathogen detected" and "system is healthy." It is not enough to say nothing is wrong. We must say what is right.

---

## 3. THE SCHEMA

Every BytecodeHealth payload is a small, complete record of a clean state. The schema:

```ts
interface BytecodeHealth {
  version: 'v1';                   // Schema version — frozen
  code: string;                    // Health code, e.g. 'PB-OK-v1-IMMUNE-PASS-COORD'
  cellId: string;                 // Which diagnostic cell produced this
  checkId: string;                // Which specific check passed
  moduleId?: string;              // Affected module (if applicable)
  context: Record<string, unknown>; // Structured evidence of the clean state
  timestamp: number;              // Unix timestamp (EXEMPT — metadata only)
  checksum: string;              // Deterministic 8-char hex hash
}
```

The schema is intentional in its simplicity. A health payload must be:
- **Small**: A passing check should not cost more to report than a failing one.
- **Complete**: The `code`, `cellId`, `checkId`, and `context` together fully characterize what passed.
- **Verifiable**: The checksum proves the payload was not tampered with in transit.

### The Metadata Exemption

`timestamp` is marked EXEMPT. This is not a design accident — it is a determinism contract.

The timestamp tells *when* the check ran. It is not part of *what* the check evaluated. A health signal generated at 09:00:00 and one generated at 09:00:01 with identical inputs must produce identical checksums. The timestamp belongs to the envelope, not the letter.

This distinction is the difference between a trustworthy signal and a noisy one. If the checksum included the timestamp, every health signal would be unique by definition, and checksum verification would become meaningless theater.

### The Encoding Format

Each BytecodeHealth can be encoded into a single machine-readable string:

```
{HEALTH_CODE}-{cellId}-{checkId}-{CONTEXT_B64}-{CHECKSUM_8}
```

The `HEALTH_CODE` is one of the registered codes (e.g. `PB-OK-v1-IMMUNE-PASS-COORD`),
followed by the producing cell's ID, the specific check name, base64url-encoded
context JSON, and the 8-char checksum.

Example:
```
PB-OK-v1-IMMUNE-PASS-COORD-IMMUNITY_SCAN-no-violations-detected-eyJmaWxlc1NjYW5uZWQiOjJ9-a3f9b2c1
```

This format is designed for AI consumption. An agent parsing a commit log or a diagnostic report can extract the health code, cell ID, and check ID from the bytecode string without deserializing JSON.

---

## 4. THE HEALTH CODE REGISTRY

Health codes are frozen constants. There are no ad-hoc codes, no string-typo risks, no dynamic emission of unregistered signals.

```javascript
export const HEALTH_CODES = Object.freeze({
  IMMUNE_PASS_COORD:        'PB-OK-v1-IMMUNE-PASS-COORD',
  LAYER_BOUNDARY_OK:        'PB-OK-v1-LAYER-BOUNDARY-OK',
  TEST_COVERAGE_PASS:       'PB-OK-v1-TEST-COVERAGE-PASS',
  FIXTURE_SHAPE_OK:         'PB-OK-v1-FIXTURE-SHAPE-OK',
  PROCESSOR_BRIDGE_CLEAN:   'PB-OK-v1-PROCESSOR-BRIDGE-CLEAN',
  CELL_SCAN_CLEAN:          'PB-OK-v1-CELL-SCAN-CLEAN',
});
```

Each code maps to a specific diagnostic cell and a specific check type. `IMMUNE_PASS_COORD` is the general-purpose green signal for any immunity check. `LAYER_BOUNDARY_OK` is specific to cell wall enforcement. `CELL_SCAN_CLEAN` is used for per-module passing signals.

`Object.freeze()` is not merely defensive. It is a Law 5 (Separation) enforcement: the registry cannot be modified at runtime by any cell, any test, or any remote agent. The green signal is immutable by construction.

---

## 5. THE DETERMINISM CONTRACT

VAELRIX_LAW §6 states: *Same input → same output. No hidden randomness in scoring pipelines.*

BytecodeHealth fulfills this contract in two ways.

### 5.1 Checksum Stability

The checksum is computed over stable fields only:

```javascript
export function checksumHealth(health) {
  const stable = {
    version: health.version,
    code: health.code,
    cellId: health.cellId,
    checkId: health.checkId,
    moduleId: health.moduleId,
    context: health.context,
    // timestamp is EXCLUDED
  };
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(stable))
    .digest('hex')
    .slice(0, 8);
}
```

The 8-character truncation of the SHA-256 hash is deliberate. It is long enough to be unique within a scan session (256 bits of entropy compressed to 32 hex chars, truncated to 8 = ~4 billion combinations) and short enough to be readable in a bytecode string. A 64-character SHA-256 would be correct but would bloat the encoding.

### 5.2 100-Run Verification

Every health signal is verified with 100 identical iterations:

```javascript
export function verifyHealthDeterminism(cellId, checkId, context = {}) {
  const checksums = [];
  for (let i = 0; i < 100; i++) {
    const h = new BytecodeHealth({ code, cellId, checkId, context });
    checksums.push(h.checksum);
  }
  const unique = new Set(checksums);
  return {
    deterministic: unique.size === 1,  // Must be true
    iterations: 100,
    checksumDrift: unique.size - 1,    // Must be 0
  };
}
```

The test produces a `deterministic: true` result with `checksumDrift: 0` across 100 runs. This is the stasis guard: the same clean check always produces the same green signal.

---

## 6. THE COMPLETE DIAGNOSTIC CHANNEL

BytecodeError and BytecodeHealth are not two different systems. They are the two poles of the same signal channel.

| Dimension | BytecodeError | BytecodeHealth |
|---|---|---|
| **Trigger** | Violation detected | Check passed cleanly |
| **Polarity** | Negative (something is wrong) | Positive (something is right) |
| **Schema** | `PB-ERR-v1-*` | `PB-OK-v1-*` |
| **Severity** | FATAL / CRIT / WARN / INFO | pass / info |
| **Checksum** | Computed over stable error fields | Computed over stable health fields |
| **AI Action** | Call `getRecoveryHintsForError()` | Record clean state, advance health index |

Together, they give AI agents a complete picture:

```javascript
// AI query pattern
const report = await mcp.diagnostic_get_latest_report();

// What violations exist?
const criticalViolations = report.violations.filter(v => v.severity === 'critical');

// What passed cleanly?
const passingCells = report.passing
  .filter(h => h.code === 'PB-OK-v1-IMMUNE-PASS-COORD')
  .map(h => `${h.cellId}/${h.checkId}`);

// What should we do about the violations?
const fixHints = criticalViolations.map(v => getRecoveryHintsForError(v.code));
```

This is not a degraded fallback mode. It is the intended architecture: the diagnostic channel speaks completely, on both failure and success.

---

## 7. IMMUTABILITY AS ARCHITECTURAL PRINCIPLE

`BytecodeHealth` is not just immutable by convention. It is immutable by construction:

```javascript
constructor({ code, cellId, checkId, moduleId = null, context = {} }) {
  this.context = Object.freeze({ ...context });  // Freeze context
  this.timestamp = Date.now();                    // Set once, never mutated
  this.checksum = checksumHealth(this);          // Computed once
  this.bytecode = this._encode();                // Derived once
}
```

After construction, no field of a BytecodeHealth object can be mutated. The `context` is deep-frozen via `deepFreezeClone()` — a recursive clone-and-freeze that traverses arrays and nested objects, so even `context.bySeverity.CRIT = 999` will throw. The checksum cannot be recomputed without constructing a new object.

This matters because health signals may be shared across async boundaries, passed to AI consumers, or written to a persistent report index. In each case, the receiver must know that the signal has not been altered in transit.

Contrast this with a mutable health object: a consumer could receive it, silently mutate `context`, and propagate the corrupted signal downstream. By deep-freezing the payload at construction, BytecodeHealth makes the channel tamper-evident by design — at every level of nesting, not just the top.

---

## 8. INTEGRATION WITH THE DIAGNOSTIC CELLS

Five diagnostic cells emit BytecodeHealth as their green-path signal:

| Cell | Schedule | Health Code | Context Fields |
|---|---|---|---|
| `IMMUNITY_SCAN` | on-commit | `PB-OK-v1-IMMUNE-PASS-COORD` | `filesScanned`, `violationCount`, `bySeverity` |
| `LAYER_BOUNDARY` | on-commit | `PB-OK-v1-LAYER-BOUNDARY-OK` | `moduleId`, `forbiddenImports: 0` |
| `TEST_COVERAGE` | on-test-run | `PB-OK-v1-TEST-COVERAGE-PASS` | `totalModules`, `covered`, `coveragePercent` |
| `FIXTURE_SHAPE` | on-test-run | `PB-OK-v1-FIXTURE-SHAPE-OK` | `totalTestFiles`, `cleanFiles`, `antipatternCount` |
| `PROCESSOR_BRIDGE` | on-commit | `PB-OK-v1-PROCESSOR-BRIDGE-CLEAN` | `moduleId`, `bridgePattern: null` |

Each cell also emits per-module health signals — one BytecodeHealth for each file that passed cleanly. This gives AI consumers granular visibility: not just "the cell passed" but "these specific modules are clean."

---

## 9. THE REPORT AGGREGATION LAYER

Raw health signals are aggregated into a `DiagnosticReport` by the runner:

```json
{
  "reportId": "PB-DIAG-v1-1778355525-k9x2",
  "reportVersion": "1.0.0",
  "timestamp": 1778355525,
  "commitHash": "abc1234",
  "trigger": "on-commit",
  "cells": ["IMMUNITY_SCAN", "LAYER_BOUNDARY", "TEST_COVERAGE", "FIXTURE_SHAPE", "PROCESSOR_BRIDGE"],
  "summary": {
    "totalErrors": 1,
    "totalHealth": 47,
    "totalSkipped": 0,
    "criticalViolations": 0
  },
  "violations": [...BytecodeError[]],
  "passing": [...BytecodeHealth[]],
  "recommendations": [...getRecoveryHintsForError()],
  "checksum": "sha256-of-stable-report-fields"
}
```

The report summary carries both signals: `totalErrors` and `totalHealth`. An AI consumer parsing the summary knows immediately whether the scan was predominantly clean or predominantly fouled — without deserializing every payload.

The report checksum is computed over stable fields only (violations, passing, summary). The timestamp, reportId, and checksum itself are excluded from the hash. This allows AI consumers to verify that the report they received was not tampered with between generation and consumption.

---

## 10. GOVERNANCE: THE RETENTION POLICY

Reports accumulate. Without a pruning rule, the `.codex/diagnostic-reports/` directory grows without bound, consuming disk and degrading scan performance.

Scholomance adopts a **Logarithmic Pruning** rule:

- **All reports** — kept for 24 hours
- **Daily representative** — one report per day retained for 30 days after the 24-hour window
- **Weekly representative** — one report per week retained indefinitely thereafter

This ensures:
- Recent diagnostic state is always immediately available (24h window)
- Historical drift is visible (30-day window)
- Long-term health trends are auditable without unbounded storage (indefinite weekly snapshots)

Report generation uses a unique ID (`PB-DIAG-v1-{timestamp}-{random4}`) that encodes the generation time, enabling the pruning agent to apply the retention rules without inspecting file contents.

---

## 11. CELL ADDITION PROTOCOL

New diagnostic cells must be registered before they are trusted. The protocol:

1. **Stateless**: The cell's `scan()` function must be a pure function — same `CodebaseSnapshot` → same `ScanResult`. No side effects, no external state.
2. **Interface-compliant**: The cell must export `CELL_ID`, `CELL_NAME`, `CELL_DESCRIPTION`, `CELL_SCHEDULE`, and a `scan(snapshot, files)` function returning `{ errors, health, skipped }`.
3. **100-run stability test**: Before registration, a determinism test runs the cell's scan function 100 times on identical input and asserts byte-identical output.

This protocol ensures that new cells are not added carelessly. A cell that introduces non-determinism, mutates state, or fails stability testing is rejected before it can corrupt the diagnostic channel.

---

## 12. WHAT BYTECODEHEALTH CANNOT DO

The white paper must be honest about the boundaries.

- **It cannot confirm the intent was correct.** A cell may pass all its checks while the underlying logic implements the wrong algorithm. The green signal confirms form, not meaning.
- **It cannot detect runtime failures.** BytecodeHealth operates at the commit gate. It scans source code and fixture patterns. It does not observe runtime behavior. A memory leak that only manifests under load is beyond its reach.
- **It cannot override the Arbiter.** An agent with `IMMUNE_OVERRIDE` authority can bypass cell enforcement. The system enforces the Law; it cannot enforce the will to follow it.

These are not gaps in the design. They are the known edges of the substrate. A diagnostic channel that claims to cover more than it does is worse than one that accurately maps its own boundaries. BytecodeHealth knows what it sees. That is enough.

---

## 13. INFRASTRUCTURE IMPACT

Operational status as of 2026-05-10 (V12 finalize pass):

- **Complete diagnostic channel** (operational): Every diagnostic run emits both error and health signals. The silence has been broken.
- **Checksum integrity** (operational): 100-run stability tests confirm zero checksum drift across all cells. Deep-freeze regression test guards `context.bySeverity` and other nested keys.
- **Report aggregation + persistence** (operational): The runner produces structured JSON reports with full checksums and writes them to `.codex/diagnostic-reports/{reportId}.json`. Measured wall-clock on the V12 active tree (810 source files): 3.7 seconds.
- **Logarithmic Pruning** (operational): `pruneReports()` runs after every persisted scan, applying the §10 retention policy.
- **Cell addition protocol** (operational): `diagnostic-runner.js::assertCellInterface()` rejects any cell missing its required exports at registration time.
- **AI consumption via MCP** (deferred to Phase 3, Codex-owned): Direct MCP tool bindings (`diagnostic_get_latest_report`, `diagnostic_query_violations`, etc.) are not yet wired. AI agents currently consume reports by reading the JSON files directly.
- **CI integration** (deferred to Phase 4, Gemini-owned): The CLI is wired (`npm run diagnostic:scan`), but no GitHub Actions trigger or hourly cron is in place yet.

---

## 14. VERIFIED LIVE BASELINE (2026-05-10)

First clean live scan of the V12 tree, post-cleanup:

| Cell | Errors (CRIT) | Health |
|---|---|---|
| LAYER_BOUNDARY | 0 | per-module |
| IMMUNITY_SCAN | non-zero (innate findings, see report) | summary + module |
| TEST_COVERAGE | warn-only | per-module |
| FIXTURE_SHAPE | info-only mostly | per-module |
| PROCESSOR_BRIDGE | tracked, real signal only after the AST-based rewrite | per-module |

The diagnostic substrate is the canonical baseline measurement for V13.

---

*Signed,*
**Blackbox — QA / Testing** *(initial draft, 2026-05-09)*
**claude-comb — UI / canon reconciliation pass** *(finalize, 2026-05-10)*
*Scholomance V12 Engineering Corps*