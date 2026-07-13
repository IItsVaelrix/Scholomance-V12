import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { concurrentMutationVerifier } from "../../../../codex/core/immunity/cleri-probe/verifiers/concurrent-mutation.verifier.js";
import {
  HOSTILE_SOURCES,
  assertFamilyGate,
  assertStableAndBounded,
  predicateMap,
  verify,
  verifiedLines
} from "./verifier-harness.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.resolve(__dirname, "../../fixtures/cleri-probe/concurrent-mutation");
const read = name => fs.readFileSync(path.join(fixtures, name), "utf8");

const MODULE = "src/game/combat/tally.js";

describe("concurrent mutation verifier", () => {
  it("verifies a shared counter mutated from a Promise.all map callback", () => {
    const result = verify(concurrentMutationVerifier, {
      path: MODULE,
      source: `
async function tallyCombatOutcomes(rolls) {
  const results = { hits: 0, misses: 0 };
  await Promise.all(rolls.map(async roll => {
    const hit = await resolveAttack(roll);
    if (hit) results.hits++;
  }));
  return results;
}
`
    });

    expect(result.verdict).toBe("VERIFIED");
    expect(verifiedLines(result)).toEqual([6]);

    const predicates = predicateMap(result.findings[0]);
    expect(predicates.CALLBACK_EXECUTES_UNDER_CONCURRENT_PRIMITIVE).toBe(true);
    expect(predicates.WRITE_TARGET_DECLARED_OUTSIDE_CALLBACK).toBe(true);
    expect(predicates.WRITE_CAN_OCCUR_MORE_THAN_ONCE).toBe(true);
    expect(predicates.TARGET_IS_CALLBACK_LOCAL).toBe(false);
    expect(predicates.CALLBACK_RETURNS_IMMUTABLE_RESULT).toBe(false);
    expect(predicates.APPROVED_SYNCHRONIZATION_ADAPTER_GUARDS_WRITE).toBe(false);
  });

  it("verifies a shared object keyed from a Promise.all map callback", () => {
    const result = verify(concurrentMutationVerifier, {
      path: MODULE,
      source: `
async function buildCacheInParallel(keys) {
  const cache = {};
  await Promise.all(keys.map(async key => {
    cache[key] = await expensiveCompute(key);
  }));
  return cache;
}
`
    });
    expect(result.verdict).toBe("VERIFIED");
    expect(verifiedLines(result)).toEqual([5]);
  });

  it("verifies a shared array pushed from a Promise.allSettled callback", () => {
    const result = verify(concurrentMutationVerifier, {
      path: MODULE,
      source: `
async function collectOutcomes(rolls) {
  const outcomes = [];
  await Promise.allSettled(rolls.map(async roll => {
    outcomes.push(await resolveAttack(roll));
  }));
  return outcomes;
}
`
    });
    expect(result.verdict).toBe("VERIFIED");
  });

  describe("counterchecks", () => {
    it("returns NO_FINDING when the target is callback-local", () => {
      const result = verify(concurrentMutationVerifier, {
        path: MODULE,
        source: `
async function tallyCombatOutcomes(rolls) {
  return Promise.all(rolls.map(async roll => {
    const local = { hits: 0 };
    if (await resolveAttack(roll)) local.hits++;
    return local;
  }));
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("returns NO_FINDING when the callback returns an immutable result", () => {
      const result = verify(concurrentMutationVerifier, {
        path: MODULE,
        source: `
async function buildCacheInParallel(keys) {
  const entries = await Promise.all(
    keys.map(async key => [key, await expensiveCompute(key)])
  );
  return Object.fromEntries(entries);
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("returns NO_FINDING when an approved synchronization adapter guards the write", () => {
      const result = verify(concurrentMutationVerifier, {
        path: MODULE,
        source: `
async function tallyCombatOutcomes(rolls, mutex) {
  const results = { hits: 0 };
  await Promise.all(rolls.map(async roll => {
    await mutex.withLock(() => {
      results.hits++;
    });
  }));
  return results;
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("returns NO_FINDING for an adjacent IMMUNE_ALLOW: concurrent-mutation annotation", () => {
      const result = verify(concurrentMutationVerifier, {
        path: MODULE,
        source: `
async function tallyCombatOutcomes(rolls) {
  const results = { hits: 0 };
  await Promise.all(rolls.map(async roll => {
    // IMMUNE_ALLOW: concurrent-mutation — single-threaded increment, reviewed 2026-07-13
    results.hits += await resolveAttack(roll);
  }));
  return results;
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
    });
  });

  describe("concurrency discipline", () => {
    it("does not flag a sequential for...of loop", () => {
      const result = verify(concurrentMutationVerifier, {
        path: MODULE,
        source: `
async function tallyCombatOutcomes(rolls) {
  const results = { hits: 0 };
  for (const roll of rolls) {
    if (await resolveAttack(roll)) results.hits++;
  }
  return results;
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("does not flag mutation performed after aggregation", () => {
      const result = verify(concurrentMutationVerifier, {
        path: MODULE,
        source: `
async function tallyCombatOutcomes(rolls) {
  const outcomes = await Promise.all(rolls.map(resolveAttack));
  return outcomes.reduce((acc, hit) => {
    if (hit) acc.hits++;
    return acc;
  }, { hits: 0 });
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("does not flag a Promise.all over an array literal that runs each callback once", () => {
      const result = verify(concurrentMutationVerifier, {
        path: MODULE,
        source: `
async function warmCaches(state) {
  await Promise.all([
    (async () => { state.profile = await loadProfile(); })(),
    (async () => { state.config = await loadConfig(); })()
  ]);
  return state;
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("verifies a write from a function nested inside the concurrent callback", () => {
      const result = verify(concurrentMutationVerifier, {
        path: MODULE,
        source: `
async function tallyCombatOutcomes(rolls) {
  const results = { hits: 0 };
  await Promise.all(rolls.map(async roll => {
    const record = () => { results.hits++; };
    record();
  }));
  return results;
}
`
      });
      expect(result.verdict).toBe("VERIFIED");
    });

    it("does not confuse a shadowed binding with the shared one", () => {
      const result = verify(concurrentMutationVerifier, {
        path: MODULE,
        source: `
async function tallyCombatOutcomes(rolls) {
  const results = { hits: 0 };
  await Promise.all(rolls.map(async roll => {
    const results = { hits: 0 };
    results.hits++;
    return results;
  }));
  return results;
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
    });
  });

  describe("corpus fixtures", () => {
    it("verifies every positive in the frozen corpus", () => {
      const result = verify(concurrentMutationVerifier, {
        path: "tests/qa/fixtures/cleri-probe/concurrent-mutation/verified.js",
        source: read("verified.js")
      });
      expect(result.verdict).toBe("VERIFIED");
      expect(verifiedLines(result)).toEqual([8, 9, 18]);
    });

    it("reports no finding for any hard negative in the frozen corpus", () => {
      const result = verify(concurrentMutationVerifier, {
        path: "tests/qa/fixtures/cleri-probe/concurrent-mutation/hard-negative.js",
        source: read("hard-negative.js")
      });
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("meets its labeled precision gate", () => {
      const score = assertFamilyGate(concurrentMutationVerifier);
      expect(score.precision).toBe(1);
      expect(score.recall).toBe(1);
    });
  });

  describe("robustness", () => {
    it("survives hostile and unsupported syntax without throwing", () => {
      for (const hostile of HOSTILE_SOURCES) {
        const result = verify(concurrentMutationVerifier, hostile);
        expect(["VERIFIED", "NO_FINDING"]).toContain(result.verdict);
      }
    });

    it("tolerates a candidate with no facts", () => {
      const result = concurrentMutationVerifier.verify(
        { path: MODULE, span: null, facts: null },
        { pathologyClass: "CONCURRENT_SHARED_STATE_MUTATION" }
      );
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("is byte-identical across 25 repetitions and within its fixture budget", () => {
      assertStableAndBounded(concurrentMutationVerifier, {
        path: "tests/qa/fixtures/cleri-probe/concurrent-mutation/verified.js",
        source: read("verified.js")
      });
    });
  });
});
