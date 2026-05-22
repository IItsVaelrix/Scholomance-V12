# QA Specification: Diagnostic Stasis & Hallucination Mitigation

> **World-Law Connection:** If a spell is unfinished, it is not broken—it is in **Stasis**. But if an agent reintroduces a forbidden sigil from the Archive, it is a **Hallucination** that must be purged.

---

## 1. Stasis Field Invariants (Archived Health)

These laws govern the "Archived" state of diagnostic signals.

| Law | Invariant | Violation Bytecode |
|:---|:---|:---|
| **Law of Explicit Intent** | No error may be archived without a top-level `// ARCHIVED:` annotation referencing a specific `RuleID`. | `PB-ERR-v1-LINGUISTIC-CRIT-IMMUNE-0F03` |
| **Law of Localized Silence** | Archiving Rule A in File X must NOT silence Rule B in File X or Rule A in File Y. | `PB-ERR-v1-STATE-CRIT-COORD-0303` |
| **Law of Reporting Integrity** | The `totalArchived` metric in a Diagnostic Report must exactly equal the count of valid archived signals. | `PB-ERR-v1-VALUE-CRIT-COORD-0105` |

---

## 2. Antigen Test Matrix (Hallucination Detection)

The `PAT-051` pathogen specifically targets AI hallucinations where legacy prototypes are used as templates for new production code.

### 2.1 Hallucination Scenarios

| Scenario | Symptom | Expected PAT-051 Verdict |
|:---|:---|:---|
| **Legacy Path Reintroduction** | Agent imports from `codex/core/rhyme/` | **NEEDS_MERLIN / CRIT** |
| **Prototype Resurrection** | Agent re-creates `nexus.registry.js` from `Archive/` | **NEEDS_MERLIN / CRIT** |
| **Stale Context Leak** | Agent cites `PORT=3000` in a new `.env` file | **WARN (Innate)** |
| **Ghost Test Suite** | Test file exists but points to hallucinated engine path | **CRIT (Coverage)** |

---

## 3. Linguistic Forensics (PAT-051)

Every hallucination detection must carry a forensic payload for AI correction.

**Forensic Signature:**
```
PB-OK-v1-LOGIC-INCOMPLETE-IMMUNITY_SCAN-hallucination-PAT-051-{CONTEXT_B64}
```

**Required Context:**
- `path`: The file where the hallucination originated.
- `hallucinatedSource`: The legacy path or symbol reintroduced.
- `canonicalTarget`: The actual production path the agent *should* have used (e.g., `codex/core/rhyme-astrology`).
- `baseDraft`: The suspected `Archive/` file used as a template.

---

## 4. Verification Procedures

### 4.1 Stasis Signal Verification
1.  **Trigger**: Identify an active `PB-ERR-v1` in a Diagnostic Report.
2.  **Act**: Add `// ARCHIVED: <RuleID>` as a top-level comment to the file.
3.  **Validate**: Run `npm run diagnostic:scan`.
4.  **Success**: `Errors` count drops by 1, `Archived` count increases by 1.

### 4.2 Hallucination Purge Verification
1.  **Trigger**: Manually re-introduce `import { buildPairs } from '../codex/core/rhyme/training.js'` into a script.
2.  **Act**: Run `npm run cleri scan "import from codex/core/rhyme"`.
3.  **Validate**: Verify that `matchedPattern` is `PAT-051`.
4.  **Success**: The `fixPath` explicitly prescribes re-routing to `codex/core/rhyme-astrology`.

### 4.3 Diagnostic Summary Verification
1.  **Act**: Inspect the JSON report at `.codex/diagnostic-reports/PB-DIAG-v1-*.json`.
2.  **Validate**: Ensure `summary.totalArchived` correctly reflects the number of stasis signals.
3.  **Success**: Checksum is valid and summary is accurate.

---

## 5. Success Criteria for QA Agents

- [ ] All 5 Diagnostic Cells support the `// ARCHIVED:` silencer.
- [ ] `PAT-051` is present in the `SEED_PATTERNS` of `clerical-raid.patterns.js`.
- [ ] The Diagnostic CLI output displays an "Archived by layer" breakdown.
- [ ] `npm run cleri` correctly fixes broken bridge imports before running antigen tests.

---

*Last Updated: 2026-05-10 — Rendered by gemini-backend (Debug Inquisitor)*
