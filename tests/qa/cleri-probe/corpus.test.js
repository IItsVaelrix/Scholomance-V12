import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const manifest = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, "../fixtures/cleri-probe/manifest.json"),
  "utf8"
));

describe("Cleri Probe accuracy corpus", () => {
  it("has a verified and hard-negative case for every initial verifier", () => {
    const families = new Set(manifest.cases.map(item => item.pathologyClass));
    expect([...families].sort()).toEqual([
      "CONCURRENT_SHARED_STATE_MUTATION",
      "LEAKED_LISTENER_SUBSCRIPTION",
      "SWALLOWED_ERROR",
      "UNSAFE_EXTERNAL_RESPONSE_ACCESS",
      "UNSEEDED_RANDOMNESS"
    ]);
    for (const family of families) {
      const cases = manifest.cases.filter(item => item.pathologyClass === family);
      expect(cases.some(item => item.expected === "VERIFIED")).toBe(true);
      expect(cases.some(item => item.expected === "NO_FINDING")).toBe(true);
    }
  });

  it("labels every case with exactly one of the four required subtypes", () => {
    const validSubtypes = new Set([
      "CLEAR_POSITIVE",
      "REAL_WORLD_POSITIVE",
      "DIRECT_HARD_NEGATIVE",
      "ADVERSARIAL_HARD_NEGATIVE"
    ]);
    for (const item of manifest.cases) {
      expect(validSubtypes.has(item.subtype)).toBe(true);
    }
    const families = new Set(manifest.cases.map(item => item.pathologyClass));
    for (const family of families) {
      const subtypes = manifest.cases
        .filter(item => item.pathologyClass === family)
        .map(item => item.subtype);
      expect([...new Set(subtypes)].sort()).toEqual([...validSubtypes].sort());
    }
  });
});
