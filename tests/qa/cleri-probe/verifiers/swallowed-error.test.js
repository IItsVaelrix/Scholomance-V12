import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { swallowedErrorVerifier } from "../../../../codex/core/immunity/cleri-probe/verifiers/swallowed-error.verifier.js";
import {
  HOSTILE_SOURCES,
  assertFamilyGate,
  assertStableAndBounded,
  predicateMap,
  verify,
  verifiedLines
} from "./verifier-harness.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.resolve(__dirname, "../../fixtures/cleri-probe/swallowed-error");
const read = name => fs.readFileSync(path.join(fixtures, name), "utf8");

const MODULE = "src/game/combat/resolve.js";

describe("swallowed error verifier", () => {
  it("verifies an empty catch", () => {
    const result = verify(swallowedErrorVerifier, {
      path: MODULE,
      source: `
function resolveTurn() {
  try {
    dangerousCall();
  } catch (e) {
  }
}
`
    });

    expect(result.verdict).toBe("VERIFIED");
    expect(verifiedLines(result)).toEqual([5]);

    const predicates = predicateMap(result.findings[0]);
    expect(predicates.CATCH_INTERCEPTS_ERROR).toBe(true);
    expect(predicates.ERROR_RETHROWN).toBe(false);
    expect(predicates.ERROR_TRANSLATED_TO_BYTECODE_ERROR).toBe(false);
    expect(predicates.APPROVED_RECOVERY_RETURN).toBe(false);
    expect(predicates.RETRY_OR_RECOVERY_ADAPTER_CALLED).toBe(false);
  });

  it("verifies a logging-only catch", () => {
    const result = verify(swallowedErrorVerifier, {
      path: MODULE,
      source: `
async function resolveTurn() {
  try {
    return await fetch('/api/combat/resolve');
  } catch (error) {
    console.log(error);
  }
}
`
    });
    expect(result.verdict).toBe("VERIFIED");
  });

  it("verifies a catch whose binding is used only for telemetry", () => {
    const result = verify(swallowedErrorVerifier, {
      path: MODULE,
      source: `
function resolveTurn() {
  try {
    dangerousCall();
  } catch (error) {
    Sentry.captureException(error);
    metrics.trackError(error);
  }
}
`
    });
    expect(result.verdict).toBe("VERIFIED");
  });

  describe("counterchecks", () => {
    it("returns NO_FINDING when the error is rethrown", () => {
      const result = verify(swallowedErrorVerifier, {
        path: MODULE,
        source: `
function resolveTurn() {
  try {
    dangerousCall();
  } catch (e) {
    reportToSentry(e);
    throw e;
  }
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("returns NO_FINDING when the error is translated into a BytecodeError", () => {
      const result = verify(swallowedErrorVerifier, {
        path: MODULE,
        source: `
function resolveTurn() {
  try {
    dangerousCall();
  } catch (e) {
    throw new BytecodeError(CATEGORY, SEVERITY, MODULE_ID, CODE, { cause: e });
  }
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("returns NO_FINDING for an explicit documented fallback return", () => {
      const result = verify(swallowedErrorVerifier, {
        path: MODULE,
        source: `
async function resolveTurn() {
  try {
    return await fetch('/api/combat/resolve');
  } catch (error) {
    return { ok: false, error: error.message };
  }
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("returns NO_FINDING when a retry or recovery adapter is called", () => {
      const result = verify(swallowedErrorVerifier, {
        path: MODULE,
        source: `
async function resolveTurn() {
  try {
    return await fetch('/api/combat/resolve');
  } catch (error) {
    return retryWithBackoff(() => fetch('/api/combat/resolve'));
  }
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("returns NO_FINDING for an adjacent IMMUNE_ALLOW: swallowed-error annotation", () => {
      const result = verify(swallowedErrorVerifier, {
        path: MODULE,
        source: `
function resolveTurn() {
  try {
    dangerousCall();
  // IMMUNE_ALLOW: swallowed-error — best-effort cache warm, reviewed 2026-07-13
  } catch (e) {
  }
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
    });
  });

  describe("a return is not automatically healthy", () => {
    it("verifies a bare null return that discards the error", () => {
      const result = verify(swallowedErrorVerifier, {
        path: MODULE,
        source: `
function resolveTurn() {
  try {
    return dangerousCall();
  } catch (e) {
    return null;
  }
}
`
      });
      expect(result.verdict).toBe("VERIFIED");
    });

    it("verifies a fallback object that never names the error", () => {
      const result = verify(swallowedErrorVerifier, {
        path: MODULE,
        source: `
function resolveTurn() {
  try {
    return dangerousCall();
  } catch (e) {
    return { hits: 0, misses: 0 };
  }
}
`
      });
      expect(result.verdict).toBe("VERIFIED");
    });
  });

  describe("function boundaries", () => {
    it("does not accept a throw from a function nested inside the catch", () => {
      const result = verify(swallowedErrorVerifier, {
        path: MODULE,
        source: `
function resolveTurn() {
  try {
    dangerousCall();
  } catch (e) {
    queueMicrotask(() => {
      throw e;
    });
  }
}
`
      });
      expect(result.verdict).toBe("VERIFIED");
    });

    it("does not accept a recovery return from a function nested inside the catch", () => {
      const result = verify(swallowedErrorVerifier, {
        path: MODULE,
        source: `
function resolveTurn() {
  try {
    dangerousCall();
  } catch (error) {
    const describe = () => ({ ok: false, error: error.message });
    void describe;
  }
}
`
      });
      expect(result.verdict).toBe("VERIFIED");
    });

    it("still verifies a swallow that carries a finally block", () => {
      const result = verify(swallowedErrorVerifier, {
        path: MODULE,
        source: `
function resolveTurn(lock) {
  try {
    dangerousCall();
  } catch (e) {
    console.error(e);
  } finally {
    lock.release();
  }
}
`
      });
      expect(result.verdict).toBe("VERIFIED");
    });
  });

  describe("corpus fixtures", () => {
    it("verifies every positive in the frozen corpus", () => {
      const result = verify(swallowedErrorVerifier, {
        path: "tests/qa/fixtures/cleri-probe/swallowed-error/verified.js",
        source: read("verified.js")
      });
      expect(result.verdict).toBe("VERIFIED");
      expect(verifiedLines(result)).toEqual([7, 16]);
    });

    it("reports no finding for any hard negative in the frozen corpus", () => {
      const result = verify(swallowedErrorVerifier, {
        path: "tests/qa/fixtures/cleri-probe/swallowed-error/hard-negative.js",
        source: read("hard-negative.js")
      });
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("meets its labeled precision gate", () => {
      const score = assertFamilyGate(swallowedErrorVerifier);
      expect(score.precision).toBe(1);
      expect(score.recall).toBe(1);
    });
  });

  describe("robustness", () => {
    it("survives hostile and unsupported syntax without throwing", () => {
      for (const hostile of HOSTILE_SOURCES) {
        const result = verify(swallowedErrorVerifier, hostile);
        expect(["VERIFIED", "NO_FINDING"]).toContain(result.verdict);
      }
    });

    it("tolerates a candidate with no facts", () => {
      const result = swallowedErrorVerifier.verify(
        { path: MODULE, span: null, facts: null },
        { pathologyClass: "SWALLOWED_ERROR" }
      );
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("is byte-identical across 25 repetitions and within its fixture budget", () => {
      assertStableAndBounded(swallowedErrorVerifier, {
        path: "tests/qa/fixtures/cleri-probe/swallowed-error/verified.js",
        source: read("verified.js")
      });
    });
  });
});
