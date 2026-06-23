# PDR: Bytecode-Driven Diagnostic Reporting
## Enhancing Diagnostic Clarity and Actionability

**Status:** In Progress
**Classification:** Architectural | QA Infrastructure | AI Observability
**Priority:** High
**Primary Goal:** To evolve the diagnostic reporting system from a shallow, human-readable summary to a deep, machine-parseable, bytecode-driven format that provides actionable intelligence for both human developers and AI agents.

---

# 1. Executive Summary

The current diagnostic reporting system provides a shallow, human-readable summary of the diagnostic scan. This is insufficient for the needs of a system as complex as Scholomance. We need a new, bytecode-driven reporting format that provides deep, actionable intelligence for both human developers and AI agents. This PDR outlines the plan to implement this new reporting format.

# 2. Problem Statement

The current diagnostic reporting system has the following problems:

*   **Shallow:** The report only provides a high-level summary of the violations. It does not provide the detailed, machine-parseable data that is needed to automatically triage and fix the violations.
*   **Not Actionable:** The report is not actionable. It does not provide the information that is needed to quickly and easily fix the violations.
*   **Not Extensible:** The report is not extensible. It is difficult to add new diagnostic cells and new types of violations to the report.

# 3. Product Goal

The goal of this PDR is to create a new, bytecode-driven diagnostic reporting system that is:

*   **Deep:** The report will provide a deep, detailed view of the violations, including the full bytecode of each violation.
*   **Actionable:** The report will be actionable. It will provide the information that is needed to quickly and easily fix the violations.
*   **Extensible:** The report will be extensible. It will be easy to add new diagnostic cells and new types of violations to the report.

# 4. Non-Goals

*   This PDR does not cover the implementation of new diagnostic cells.
*   This PDR does not cover the implementation of a UI for viewing the diagnostic reports.

# 5. Core Design Principles

*   **Bytecode-First:** The report will be designed around the bytecode of the violations.
*   **Machine-Parseable:** The report will be designed to be easily parsed by machines.
*   **Human-Readable:** The report will also be human-readable, but the machine-parseable format will take precedence.

# 6. Feature Overview

The new diagnostic reporting system will have the following features:

*   **Bytecode-Driven Output:** The diagnostic scan will have a new `--format=bytecode` option that will produce a bytecode-driven output.
*   **Detailed Violation Information:** The report will include detailed information about each violation, including the full bytecode of the violation, the file and line number where the violation occurred, and a description of the violation.
*   **Triage Information:** The report will include triage information, such as the severity of the violation and the priority of the fix.

# 7. Architecture

The new diagnostic reporting system will be implemented by modifying the following components:

*   **`codex/core/diagnostic/run-diagnostic.cli.js`:** The `printSummary` function will be replaced with a new function that produces the bytecode-driven output.
*   **`codex/core/diagnostic/DiagnosticReport.js`:** The `generateReportId` function will be modified to be deterministic.
*   **`package.json`:** The `diagnostic:scan` script will be updated to include the new `--format=bytecode` option.

# 8. Module Breakdown

*   **`run-diagnostic.cli.js`:** This module will be responsible for parsing the command-line arguments, running the diagnostic scan, and printing the summary report.
*   **`DiagnosticReport.js`:** This module will be responsible for generating the diagnostic report.
*   **`package.json`:** This file will be responsible for defining the `diagnostic:scan` script.

# 9. ByteCode IR Design (if applicable)

The bytecode IR design is already defined in the `BytecodeHealth.js` and `BytecodeError.js` files.

# 10. Implementation Phases

1.  **Phase 1: Implement the bytecode-driven output.** This phase will involve implementing the new `printSummary` function and the `--format=bytecode` option.
2.  **Phase 2: Update the diagnostic cells.** This phase will involve updating the `TEST_COVERAGE` and `FIXTURE_SHAPE` cells to filter for high-value paths and categorize violations properly.

# 11. QA Requirements

*   The new bytecode-driven output must be validated to ensure that it is correct and complete.
*   The `TEST_COVERAGE` and `FIXTURE_SHAPE` cells must be tested to ensure that they are working correctly.

# 12. Success Criteria

*   The diagnostic scan produces a bytecode-driven output when the `--format=bytecode` option is used.
*   The `TEST_COVERAGE` and `FIXTURE_SHAPE` cells are working correctly.
