import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  mergeCandidates,
  retrieveCandidates,
  NOMINATION_SOURCES
} from "../../../codex/core/immunity/cleri-probe/retrieval.js";

const fixtureDir = path.resolve(__dirname, "../fixtures/cleri-probe");

function loadFixture(relPath) {
  const fullPath = path.join(fixtureDir, relPath);
  return {
    path: relPath,
    content: fs.readFileSync(fullPath, "utf8")
  };
}

function loadAllCorpusFiles() {
  const manifest = JSON.parse(fs.readFileSync(path.join(fixtureDir, "manifest.json"), "utf8"));
  const byPath = new Map();
  for (const item of manifest.cases) {
    const file = loadFixture(item.path);
    byPath.set(file.path, file);
  }
  return [...byPath.values()];
}

function loadManifest() {
  return JSON.parse(fs.readFileSync(path.join(fixtureDir, "manifest.json"), "utf8"));
}

describe("mergeCandidates", () => {
  it("deduplicates and deterministically ranks independent nominations", () => {
    const result = mergeCandidates([
      { path: "b.js", factId: "c2", source: "VECTOR", score: 0.99 },
      { path: "a.js", factId: "c1", source: "STRUCTURAL", score: 1 },
      { path: "a.js", factId: "c1", source: "LITERAL", score: 1 }
    ], { limit: 10 });
    expect(result.map(item => item.path)).toEqual(["a.js", "b.js"]);
    expect(result[0].nominators).toEqual(["LITERAL", "STRUCTURAL"]);
    expect(result[0]).not.toHaveProperty("verdict");
  });

  it("keeps separate candidates when factId or pathologyClass differ", () => {
    const result = mergeCandidates([
      { path: "a.js", factId: "c1", pathologyClass: "P1", source: "LITERAL", score: 1 },
      { path: "a.js", factId: "c1", pathologyClass: "P2", source: "LITERAL", score: 1 },
      { path: "a.js", factId: "c2", pathologyClass: "P1", source: "LITERAL", score: 1 }
    ], { limit: 10 });
    expect(result).toHaveLength(3);
  });

  it("sorts by structural, literal, nominators, score, path, line, factId", () => {
    const result = mergeCandidates([
      // Non-structural literal (lowest priority).
      { path: "z.js", factId: "c1", source: "LITERAL", score: 1 },
      // Structural-only candidates with same score tiebreak by start line.
      { path: "a.js", factId: "c5", source: "STRUCTURAL", score: 0.9, span: { path: "a.js", startLine: 5, startColumn: 1, endLine: 5, endColumn: 1 } },
      { path: "a.js", factId: "c3", source: "STRUCTURAL", score: 0.9, span: { path: "a.js", startLine: 3, startColumn: 1, endLine: 3, endColumn: 1 } },
      // Structural + literal beats structural-only even with lower score.
      { path: "b.js", factId: "c1", source: "STRUCTURAL", score: 0.5 },
      { path: "b.js", factId: "c1", source: "LITERAL", score: 0.5 },
      // Lower score structural-only comes after higher score structural-only.
      { path: "a.js", factId: "c1", source: "STRUCTURAL", score: 0.5 }
    ], { limit: 10 });
    expect(result.map(c => `${c.path}:${c.factId}:${c.score.toFixed(1)}:L${c.span.startLine}`)).toEqual([
      "b.js:c1:0.5:L1",
      "a.js:c3:0.9:L3",
      "a.js:c5:0.9:L5",
      "a.js:c1:0.5:L1",
      "z.js:c1:1.0:L1"
    ]);
  });

  it("clamps candidate scores to [0, 1]", () => {
    const result = mergeCandidates([
      { path: "a.js", factId: "c1", source: "LITERAL", score: 1.5 },
      { path: "b.js", factId: "c1", source: "LITERAL", score: -0.2 }
    ], { limit: 10 });
    expect(result[0].score).toBe(1);
    expect(result[1].score).toBe(0);
  });

  it("exposes only retrievalReason, nominators, score, span, and factId", () => {
    const result = mergeCandidates([
      { path: "a.js", factId: "c1", source: "LITERAL", score: 1 }
    ], { limit: 10 });
    expect(result[0]).toHaveProperty("retrievalReason");
    expect(result[0]).toHaveProperty("nominators");
    expect(result[0]).toHaveProperty("score");
    expect(result[0]).toHaveProperty("span");
    expect(result[0]).toHaveProperty("factId");
    expect(result[0]).not.toHaveProperty("verdict");
    expect(result[0]).not.toHaveProperty("confidence");
    expect(result[0]).not.toHaveProperty("remediation");
  });

  it("respects the configured limit", () => {
    const result = mergeCandidates([
      { path: "a.js", factId: "c1", source: "LITERAL", score: 1 },
      { path: "b.js", factId: "c2", source: "LITERAL", score: 0.9 },
      { path: "c.js", factId: "c3", source: "LITERAL", score: 0.8 }
    ], { limit: 2 });
    expect(result).toHaveLength(2);
  });
});

describe("retrieveCandidates regression", () => {
  it("controlled listener hard negative may rank highly but cannot be verified by retrieval alone", () => {
    const files = [
      loadFixture("listener-lifecycle/verified.jsx"),
      loadFixture("listener-lifecycle/hard-negative.jsx")
    ];
    const result = retrieveCandidates(files, {
      hypothesis: "leaked event listener subscription missing cleanup",
      pathologyClass: "LEAKED_LISTENER_SUBSCRIPTION"
    }, { limit: 10, includeVector: true });

    // The hard-negative contains addEventListener/removeEventListener and can be
    // nominated by literal/structural/token/vector sources. Retrieval must not
    // treat rank as proof.
    const hardNegative = result.find(c => c.path === "listener-lifecycle/hard-negative.jsx");
    expect(hardNegative).toBeDefined();
    expect(hardNegative).not.toHaveProperty("verdict");
    expect(hardNegative).not.toHaveProperty("remediation");

    for (const candidate of result) {
      expect(candidate).not.toHaveProperty("verdict");
      expect(candidate).not.toHaveProperty("confidence");
      expect(candidate).not.toHaveProperty("remediation");
      expect(candidate.nominators.every(s => NOMINATION_SOURCES.includes(s))).toBe(true);
    }
  });
});

describe("known-positive recall gate", () => {
  it("recalls at least 90% of known positives in the top configured candidate set", () => {
    const manifest = loadManifest();
    const files = loadAllCorpusFiles();
    const positiveCases = manifest.cases.filter(c => c.expected === "VERIFIED");

    const casesByClass = new Map();
    for (const item of positiveCases) {
      if (!casesByClass.has(item.pathologyClass)) {
        casesByClass.set(item.pathologyClass, []);
      }
      casesByClass.get(item.pathologyClass).push(item);
    }

    const limit = 50;
    let recalled = 0;
    const perClassRecall = [];

    for (const [pathologyClass, cases] of casesByClass) {
      const candidates = retrieveCandidates(files, {
        hypothesis: `detect ${pathologyClass.toLowerCase().replace(/_/g, " ")}`,
        pathologyClass
      }, { limit, includeVector: false });

      const topPaths = new Set(candidates.map(c => c.path));
      const classRecalled = cases.filter(c => topPaths.has(c.path)).length;
      recalled += classRecalled;
      perClassRecall.push({
        pathologyClass,
        total: cases.length,
        recalled: classRecalled,
        recall: classRecalled / cases.length
      });
    }

    const overallRecall = recalled / positiveCases.length;
    // Record recall separately from verifier precision.
    expect(overallRecall).toBeGreaterThanOrEqual(0.9);
    expect(perClassRecall.every(r => r.recall >= 0.9)).toBe(true);
  });
});
