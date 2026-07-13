/**
 * Cleri Probe human-readable report renderer.
 *
 * Produces a visible, deterministic plan and finding summary. Sanitizes ANSI
 * and control sequences and redacts secrets and high-entropy tokens.
 */

import { ALWAYS_EXCLUDED, TEST_EXCLUDED } from "../../codex/runtime/cleri-probe/investigation.runtime.js";

// ─── Sanitization and redaction ──────────────────────────────────────────────

// eslint-disable-next-line no-control-regex
const ANSI_ESCAPE_RE = /\u001b\[[0-9;?]*[A-Za-z]/g;
// eslint-disable-next-line no-control-regex
const CONTROL_CHAR_RE = /[\u0000-\u0008\u000b-\u000c\u000e-\u001f\u007f]/g;

const SECRET_PATTERNS = [
  { re: /\b(bearer\s+)[a-zA-Z0-9_~+/\-=.]+/gi, replacement: "$1[REDACTED]" },
  { re: /((?:api[_-]?key|password|secret|token|private[_-]?key)\s*[:=]\s*['"`])[^'"`]*(['"`])/gi, replacement: "$1[REDACTED]$2" },
  { re: /(=\s*['"`])[A-Za-z0-9+/=_-]{32,}(['"`])/g, replacement: "$1[REDACTED]$2" },
  { re: /-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+ PRIVATE KEY-----/gi, replacement: "[REDACTED PRIVATE KEY]" }
];

function redact(value) {
  let text = String(value ?? "");
  for (const { re, replacement } of SECRET_PATTERNS) {
    text = text.replace(re, replacement);
  }
  return text;
}

export function sanitize(value) {
  return redact(String(value ?? "").replace(ANSI_ESCAPE_RE, "").replace(CONTROL_CHAR_RE, ""));
}

// ─── Formatting helpers ──────────────────────────────────────────────────────

function bullet(items, indent = "  ") {
  if (!items || items.length === 0) return `${indent}(none)`;
  return items.map(item => `${indent}- ${sanitize(item)}`).join("\n");
}

function label(key, value) {
  return `${key}: ${sanitize(value)}`;
}

function header(text, options) {
  if (options.noColor) return sanitize(text);
  return `\u001b[1m${sanitize(text)}\u001b[0m`;
}

function defaultExclusions(configuration = {}) {
  const set = new Set(ALWAYS_EXCLUDED);
  if (!configuration.includeTests) {
    for (const name of TEST_EXCLUDED) set.add(name);
  }
  return Array.from(set).sort();
}

// ─── Public renderer ─────────────────────────────────────────────────────────

export function renderHuman(report, options = {}) {
  const lines = [];
  const plan = report.plan || {};

  lines.push(header("Cleri Probe Investigation Plan", options));
  lines.push("");
  lines.push(label("Original hypothesis", report.hypothesis));
  lines.push(label("Normalized hypothesis", report.normalizedHypothesis));
  lines.push("");

  lines.push(header("Scope", options));
  const requestedPaths =
    report.coverage?.requestedPaths || report.plan?.paths || report.scope || [];
  lines.push(bullet(requestedPaths.length ? requestedPaths : ["."]));
  lines.push("");

  lines.push(header("Selected pathology classes", options));
  lines.push(bullet(plan.pathologyClasses || []));
  lines.push("");

  lines.push(header("Required supporting predicates", options));
  const predicates = (plan.requiredEvidence || []).length
    ? plan.requiredEvidence
    : (plan.pathologyClasses || []).map(c => `Structural evidence for ${c}`);
  lines.push(bullet(predicates));
  lines.push("");

  lines.push(header("Verifier ids and versions", options));
  const verifiers = (plan.selectedVerifiers || []).map(
    v => `${v.id} (${v.version})${v.pathologyClass ? ` [${v.pathologyClass}]` : ""}`
  );
  lines.push(bullet(verifiers));
  lines.push("");

  lines.push(header("Counterchecks", options));
  lines.push(bullet(plan.counterchecks || []));
  lines.push("");

  lines.push(header("Unsupported clauses", options));
  lines.push(bullet(plan.reasonCode ? [plan.reasonCode] : []));
  lines.push("");

  lines.push(header("Default exclusions", options));
  lines.push(bullet(defaultExclusions(report.configuration)));
  lines.push("");

  lines.push(header("Explicit inclusions", options));
  const inclusions = [];
  if (report.configuration?.includeTests) inclusions.push("tests and fixtures");
  if (report.configuration?.includeGenerated) inclusions.push("generated assets");
  lines.push(bullet(inclusions.length ? inclusions : ["none"]));
  lines.push("");

  lines.push(header("Expected coverage limitations", options));
  const coverage = report.coverage || {};
  const limitations = [];
  if (!coverage.complete) limitations.push("Coverage is partial");
  if ((coverage.skipped || []).length) limitations.push(`${coverage.skipped.length} skipped region(s)`);
  if ((coverage.parserFailures || []).length) limitations.push(`${coverage.parserFailures.length} parser failure(s)`);
  if (!coverage.complete && limitations.length === 0) limitations.push("Investigation terminated before completion");
  lines.push(bullet(limitations.length ? limitations : ["Full coverage expected"]));
  lines.push("");

  const findings = report.findings || [];
  if (findings.length > 0) {
    lines.push(header(`Verified findings (${findings.length})`, options));
    for (const finding of findings) {
      lines.push(renderFindingCard(finding, options));
    }
  } else if (report.status === "INCONCLUSIVE") {
    lines.push(header("INCONCLUSIVE", options));
  } else if (coverage.complete) {
    lines.push(header("NO VERIFIED FINDINGS", options));
  } else {
    lines.push(header("INCONCLUSIVE", options));
  }

  return lines.join("\n") + "\n";
}

function renderFindingCard(finding, options) {
  const lines = [];
  const span = finding.span || {};
  lines.push(`  ${header("Finding", options)} ${sanitize(finding.findingId)}`);
  lines.push(`    Pathology: ${sanitize(finding.pathologyClass)}`);
  lines.push(`    Location:  ${sanitize(span.path)}:${span.startLine || "?"}:${span.startColumn || "?"}`);
  if (finding.symbol) {
    lines.push(`    Symbol:    ${sanitize(finding.symbol)}`);
  }
  if (finding.summary) {
    lines.push(`    Summary:   ${sanitize(finding.summary)}`);
  }

  const supporting = finding.supportingEvidence || [];
  if (supporting.length) {
    lines.push("    Supporting evidence:");
    for (const ev of supporting) {
      lines.push(`      - ${sanitize(ev.predicateId)} (${ev.observed ? "observed" : "not observed"})`);
      if (ev.explanation) lines.push(`        ${sanitize(ev.explanation)}`);
    }
  }

  const counter = finding.counterEvidenceChecked || [];
  if (counter.length) {
    lines.push("    Counterchecks:");
    for (const ev of counter) {
      lines.push(`      - ${sanitize(ev.predicateId)} (${ev.observed ? "present" : "absent"})`);
      if (ev.explanation) lines.push(`        ${sanitize(ev.explanation)}`);
    }
  }

  if (finding.verifier) {
    lines.push(`    Verifier:  ${sanitize(finding.verifier.id)}@${sanitize(finding.verifier.version)}`);
  }

  const remediation = finding.remediation || {};
  if (remediation.summary) {
    lines.push(`    Remediation: ${sanitize(remediation.summary)}`);
  }

  if (finding.limitations && finding.limitations.length) {
    lines.push("    Limitations:");
    for (const lim of finding.limitations) {
      lines.push(`      - ${sanitize(lim)}`);
    }
  }

  return lines.join("\n");
}
