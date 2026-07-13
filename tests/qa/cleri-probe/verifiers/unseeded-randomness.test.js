import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { unseededRandomnessVerifier } from "../../../../codex/core/immunity/cleri-probe/verifiers/unseeded-randomness.verifier.js";
import {
  HOSTILE_SOURCES,
  assertFamilyGate,
  assertStableAndBounded,
  predicateMap,
  verify,
  verifiedLines
} from "./verifier-harness.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.resolve(__dirname, "../../fixtures/cleri-probe/unseeded-randomness");
const read = name => fs.readFileSync(path.join(fixtures, name), "utf8");

const DETERMINISTIC_PATH = "src/game/combat/damage.js";

const VERIFIED_SOURCE = `
function calculateDamage(attacker) {
  const roll = Math.random();
  return attacker.strength * roll;
}
`;

describe("unseeded randomness verifier", () => {
  it("verifies Math.random inside a deterministic authority symbol", () => {
    const result = verify(unseededRandomnessVerifier, {
      path: DETERMINISTIC_PATH,
      source: VERIFIED_SOURCE
    });

    expect(result.verdict).toBe("VERIFIED");
    expect(verifiedLines(result)).toEqual([3]);

    const predicates = predicateMap(result.findings[0]);
    expect(predicates.CALL_IS_MATH_RANDOM).toBe(true);
    expect(predicates.SYMBOL_IS_DETERMINISTIC_AUTHORITY).toBe(true);
    expect(predicates.NOT_TEST_OR_DOCUMENTATION).toBe(false);
    expect(predicates.NOT_UI_ATMOSPHERE).toBe(false);
    expect(predicates.NO_APPROVED_IMMUNE_ALLOW).toBe(false);
    expect(predicates.NO_SEEDED_RNG_ADAPTER).toBe(false);
  });

  it("names the verified call span, not the enclosing file", () => {
    const result = verify(unseededRandomnessVerifier, {
      path: DETERMINISTIC_PATH,
      source: VERIFIED_SOURCE
    });
    const span = result.findings[0].span;
    expect(span.path).toBe(DETERMINISTIC_PATH);
    expect(span.startLine).toBe(3);
    expect(span.symbol).toBe("calculateDamage");
  });

  describe("counterchecks", () => {
    it("returns NO_FINDING in test paths", () => {
      const result = verify(unseededRandomnessVerifier, {
        path: "tests/game/combat/damage.test.js",
        source: VERIFIED_SOURCE,
        context: { includeTests: false }
      });
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("returns NO_FINDING in documentation paths", () => {
      const result = verify(unseededRandomnessVerifier, {
        path: "docs/examples/combat/damage.js",
        source: VERIFIED_SOURCE,
        context: { includeTests: false }
      });
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("returns NO_FINDING for UI atmosphere symbols", () => {
      const result = verify(unseededRandomnessVerifier, {
        path: DETERMINISTIC_PATH,
        source: `
function playHitSpark() {
  const jitter = Math.random() * 4;
  return { x: jitter, y: jitter };
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("returns NO_FINDING for UI atmosphere paths", () => {
      const result = verify(unseededRandomnessVerifier, {
        path: "src/ui/effects/bloom.js",
        source: `
function calculateDamage() {
  return Math.random();
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("returns NO_FINDING for an adjacent IMMUNE_ALLOW: math-random annotation", () => {
      const result = verify(unseededRandomnessVerifier, {
        path: DETERMINISTIC_PATH,
        source: `
function calculateDamage(attacker) {
  // IMMUNE_ALLOW: math-random — cosmetic tiebreak, reviewed 2026-07-13
  const roll = Math.random();
  return attacker.strength * roll;
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("does not honour an IMMUNE_ALLOW annotation for a different pathology", () => {
      const result = verify(unseededRandomnessVerifier, {
        path: DETERMINISTIC_PATH,
        source: `
function calculateDamage(attacker) {
  // IMMUNE_ALLOW: swallowed-error
  const roll = Math.random();
  return attacker.strength * roll;
}
`
      });
      expect(result.verdict).toBe("VERIFIED");
    });

    it("does not honour a distant IMMUNE_ALLOW annotation", () => {
      const result = verify(unseededRandomnessVerifier, {
        path: DETERMINISTIC_PATH,
        source: `
// IMMUNE_ALLOW: math-random
function calculateDamage(attacker) {
  const strength = attacker.strength;
  const bonus = attacker.bonus;
  const roll = Math.random();
  return strength * roll + bonus;
}
`
      });
      expect(result.verdict).toBe("VERIFIED");
    });

    it("returns NO_FINDING when a seeded RNG adapter is imported", () => {
      const result = verify(unseededRandomnessVerifier, {
        path: DETERMINISTIC_PATH,
        source: `
import { seededRNG } from './rng-seed';

function calculateDamage(attacker) {
  const roll = Math.random();
  return attacker.strength * roll * seededRNG(1).next();
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
    });
  });

  describe("supporting predicates", () => {
    it("returns NO_FINDING without a Math.random call", () => {
      const result = verify(unseededRandomnessVerifier, {
        path: DETERMINISTIC_PATH,
        source: `
import { seededRNG } from './rng-seed';

function calculateDamageSeeded(attacker, defender) {
  const roll = seededRNG(defender.encounterSeed).next();
  return attacker.strength * roll;
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("returns NO_FINDING when the symbol carries no deterministic authority", () => {
      const result = verify(unseededRandomnessVerifier, {
        path: "src/util/misc.js",
        source: `
function pickGreeting(greetings) {
  return greetings[Math.floor(Math.random() * greetings.length)];
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("does not read Math.random out of comments or string literals", () => {
      const result = verify(unseededRandomnessVerifier, {
        path: DETERMINISTIC_PATH,
        source: `
function calculateDamage(attacker) {
  // never use Math.random() here
  const formula = 'Math.random()';
  return attacker.strength * formula.length;
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
    });
  });

  describe("corpus fixtures", () => {
    it("verifies every positive in the frozen corpus", () => {
      const result = verify(unseededRandomnessVerifier, {
        path: "tests/qa/fixtures/cleri-probe/unseeded-randomness/verified.js",
        source: read("verified.js")
      });
      expect(result.verdict).toBe("VERIFIED");
      expect(verifiedLines(result)).toEqual([5, 11]);
    });

    it("reports no finding for any hard negative in the frozen corpus", () => {
      const result = verify(unseededRandomnessVerifier, {
        path: "tests/qa/fixtures/cleri-probe/unseeded-randomness/hard-negative.js",
        source: read("hard-negative.js")
      });
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("meets its labeled precision gate", () => {
      const score = assertFamilyGate(unseededRandomnessVerifier);
      expect(score.precision).toBe(1);
      expect(score.recall).toBe(1);
    });
  });

  describe("robustness", () => {
    it("survives hostile and unsupported syntax without throwing", () => {
      for (const hostile of HOSTILE_SOURCES) {
        const result = verify(unseededRandomnessVerifier, hostile);
        expect(["VERIFIED", "NO_FINDING"]).toContain(result.verdict);
      }
    });

    it("tolerates a candidate with no facts", () => {
      const result = unseededRandomnessVerifier.verify(
        { path: "src/game/combat/damage.js", span: null, facts: null },
        { pathologyClass: "UNSEEDED_RANDOMNESS" }
      );
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("is byte-identical across 25 repetitions and within its fixture budget", () => {
      assertStableAndBounded(unseededRandomnessVerifier, {
        path: "tests/qa/fixtures/cleri-probe/unseeded-randomness/verified.js",
        source: read("verified.js")
      });
    });
  });
});
