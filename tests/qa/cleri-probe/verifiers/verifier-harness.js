/**
 * Shared harness for Cleri Probe structural verifier suites.
 *
 * Verifiers are pure: they read normalized facts and return VERIFIED or
 * NO_FINDING. The harness parses a source string into facts, shapes the
 * candidate exactly as the investigation runtime does, and exposes the
 * determinism and budget assertions every verifier must pass before it is
 * allowed into the default registry.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "vitest";
import { parseSourceFacts } from "../../../../codex/services/cleri-probe/babel-facts.adapter.js";
import { stableStringify } from "../../../../codex/core/immunity/cleri-probe/canonical-report.js";
import { validateVerifierResult } from "../../../../codex/core/immunity/cleri-probe/verifier-registry.js";

export const REPETITIONS = 25;
export const FIXTURE_BUDGET_MS = 100;

export const FAMILY_PRECISION_GATE = 0.95;
export const AGGREGATE_PRECISION_GATE = 0.98;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const CORPUS_ROOT = path.resolve(__dirname, "../../fixtures/cleri-probe");
export const CORPUS_PREFIX = "tests/qa/fixtures/cleri-probe";

export const MANIFEST = JSON.parse(
  fs.readFileSync(path.join(CORPUS_ROOT, "manifest.json"), "utf8")
);

/** Every labeled case for one pathology class, sorted by id. */
export function corpusCases(pathologyClass) {
  return MANIFEST.cases
    .filter(item => item.pathologyClass === pathologyClass)
    .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Scores a verifier against its frozen corpus.
 *
 * A finding is attributed to the labeled case it lands nearest to in the same
 * file, so a verified span that drifts a line or two from the label still scores
 * against the case a human meant, while a finding in a hard-negative region
 * scores as the false positive it is.
 */
export function scoreFamily(verifier) {
  const cases = corpusCases(verifier.pathologyClass);
  const byFile = new Map();
  for (const item of cases) {
    if (!byFile.has(item.path)) byFile.set(item.path, []);
    byFile.get(item.path).push(item);
  }

  const hits = new Map(cases.map(item => [item.id, 0]));
  const unattributed = [];

  for (const [file, fileCases] of byFile) {
    const source = fs.readFileSync(path.join(CORPUS_ROOT, file), "utf8");
    const result = verify(verifier, { path: `${CORPUS_PREFIX}/${file}`, source });

    for (const finding of result.findings || []) {
      const line = finding.span.startLine;
      const nearest = fileCases.reduce((best, item) => {
        if (!best) return item;
        return Math.abs(item.expectedLine - line) < Math.abs(best.expectedLine - line) ? item : best;
      }, null);
      if (!nearest) {
        unattributed.push(`${file}:${line}`);
        continue;
      }
      hits.set(nearest.id, hits.get(nearest.id) + 1);
    }
  }

  const truePositives = [];
  const falsePositives = [];
  const falseNegatives = [];
  const trueNegatives = [];

  for (const item of cases) {
    const found = hits.get(item.id) > 0;
    if (item.expected === "VERIFIED") {
      (found ? truePositives : falseNegatives).push(item.id);
    } else {
      (found ? falsePositives : trueNegatives).push(item.id);
    }
  }

  const positives = truePositives.length + falsePositives.length + unattributed.length;
  return {
    pathologyClass: verifier.pathologyClass,
    truePositives,
    falsePositives: [...falsePositives, ...unattributed],
    falseNegatives,
    trueNegatives,
    precision: positives === 0 ? null : truePositives.length / positives,
    recall:
      truePositives.length + falseNegatives.length === 0
        ? null
        : truePositives.length / (truePositives.length + falseNegatives.length)
  };
}

/** Fails with the exact mislabeled case ids when a family misses its gate. */
export function assertFamilyGate(verifier) {
  const score = scoreFamily(verifier);

  expect(
    score.precision,
    `${score.pathologyClass} produced no findings at all; a family with a zero denominator is untested, not precise`
  ).not.toBeNull();

  expect(
    score.falsePositives,
    `${score.pathologyClass} verified these hard negatives: ${score.falsePositives.join(", ")}`
  ).toEqual([]);

  expect(
    score.falseNegatives,
    `${score.pathologyClass} missed these labeled positives: ${score.falseNegatives.join(", ")}`
  ).toEqual([]);

  expect(score.precision).toBeGreaterThanOrEqual(FAMILY_PRECISION_GATE);
  return score;
}

/** Builds the candidate the runtime would hand a verifier for `path`. */
export function makeCandidate(verifier, { path, source }) {
  const facts = parseSourceFacts({ path, content: source });
  return {
    path: facts.path,
    factId: null,
    pathologyClass: verifier.pathologyClass,
    retrievalReason: "Candidate nominated by STRUCTURAL",
    nominators: ["STRUCTURAL"],
    score: 1,
    span: {
      path: facts.path,
      startLine: 1,
      startColumn: 1,
      endLine: 1,
      endColumn: 1,
      symbol: null,
      excerptDigest: null
    },
    facts
  };
}

/**
 * Runs a verifier once and asserts the registry-level result contract.
 * `context.includeTests` defaults to true so fixtures under tests/ are analyzed
 * as product code, exactly as `--include-tests` does.
 */
export function verify(verifier, { path, source, context = {} }) {
  const candidate = makeCandidate(verifier, { path, source });
  const result = verifier.verify(candidate, {
    pathologyClass: verifier.pathologyClass,
    repositoryRoot: ".",
    counterchecks: verifier.counterchecks || [],
    includeTests: true,
    ...context
  });
  validateVerifierResult(result);
  return result;
}

/** Lines (one-based) of every VERIFIED finding, sorted. */
export function verifiedLines(result) {
  if (!result || result.verdict !== "VERIFIED") return [];
  return (result.findings || [])
    .map(finding => finding.span.startLine)
    .sort((a, b) => a - b);
}

/** Every predicate id the verifier reported, mapped to whether it was observed. */
export function predicateMap(finding) {
  const map = {};
  for (const evidence of [...finding.supportingEvidence, ...finding.counterEvidenceChecked]) {
    map[evidence.predicateId] = evidence.observed;
  }
  return map;
}

/** Asserts byte-identical output across repeated runs and a bounded runtime. */
export function assertStableAndBounded(verifier, input) {
  const first = stableStringify(verify(verifier, input));
  const startedAt = Date.now();
  for (let i = 1; i < REPETITIONS; i += 1) {
    expect(stableStringify(verify(verifier, input))).toBe(first);
  }
  const perRun = (Date.now() - startedAt) / (REPETITIONS - 1);
  expect(perRun).toBeLessThanOrEqual(FIXTURE_BUDGET_MS);
}

/** Sources that must never crash a verifier. */
export const HOSTILE_SOURCES = Object.freeze([
  { path: "src/game/combat/broken.js", source: "function calculateDamage( {" },
  { path: "src/game/combat/empty.js", source: "" },
  { path: "src/game/combat/exotic.ts", source: "enum E { A = 1 }\ndeclare module 'x' {}\n" },
  { path: "src/game/combat/decorators.ts", source: "@dec class Damage { @dec calculate() { return 1; } }\n" },
  { path: "src/game/combat/unicode.js", source: "const 𝕩 = 1; // ‮ rtl\nfunction calculateDamage() { return 𝕩; }\n" }
]);
