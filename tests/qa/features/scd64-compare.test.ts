import { describe, it, expect } from "vitest";
import { compareSCD64ByBlocks } from "../../../src/core/scd64/compareSCD64";
import { SCD64_SLOT_NAMES } from "../../../src/core/scd64/constants";

describe("compareSCD64ByBlocks", () => {
  it("detects IDENTICAL signatures", () => {
    const a = "01861DF4C31AC92C24D4754DD1043D244908E4B3317B90735048A13A0AB2B33C";
    const res = compareSCD64ByBlocks(a, a);
    expect(res.matchingBlocks).toBe(8);
    expect(res.differentBlocks).toHaveLength(0);
    expect(res.relationship).toBe("IDENTICAL");
    expect(res.similarity).toBe(1);
  });

  it("detects MUTATION (>= 6 matching)", () => {
    // 6 matching, 2 different
    const a = "AAAAAAAA" + "BBBBBBBB" + "CCCCCCCC" + "DDDDDDDD" + "EEEEEEEE" + "FFFFFFFF" + "11111111" + "22222222";
    const b = "AAAAAAAA" + "BBBBBBBB" + "CCCCCCCC" + "DDDDDDDD" + "EEEEEEEE" + "FFFFFFFF" + "33333333" + "44444444";
    const res = compareSCD64ByBlocks(a, b);
    expect(res.matchingBlocks).toBe(6);
    expect(res.differentBlocks).toEqual([SCD64_SLOT_NAMES[6], SCD64_SLOT_NAMES[7]]);
    expect(res.relationship).toBe("MUTATION");
    expect(res.similarity).toBe(0.75);
  });

  it("detects RELATED_FAMILY (>= 4 matching)", () => {
    // 4 matching, 4 different
    const a = "11111111" + "22222222" + "33333333" + "44444444" + "55555555" + "66666666" + "77777777" + "88888888";
    const b = "11111111" + "22222222" + "33333333" + "44444444" + "AAAAAAAA" + "BBBBBBBB" + "CCCCCCCC" + "DDDDDDDD";
    const res = compareSCD64ByBlocks(a, b);
    expect(res.matchingBlocks).toBe(4);
    expect(res.relationship).toBe("RELATED_FAMILY");
    expect(res.similarity).toBe(0.5);
  });

  it("detects WEAK_NEIGHBOR (>= 2 matching)", () => {
    // 2 matching, 6 different
    const a = "11111111" + "22222222" + "33333333" + "44444444" + "55555555" + "66666666" + "77777777" + "88888888";
    const b = "11111111" + "22222222" + "AAAAAAAA" + "BBBBBBBB" + "CCCCCCCC" + "DDDDDDDD" + "EEEEEEEE" + "FFFFFFFF";
    const res = compareSCD64ByBlocks(a, b);
    expect(res.matchingBlocks).toBe(2);
    expect(res.relationship).toBe("WEAK_NEIGHBOR");
    expect(res.similarity).toBe(0.25);
  });

  it("detects UNRELATED (< 2 matching)", () => {
    // 0 matching
    const a = "11111111" + "22222222" + "33333333" + "44444444" + "55555555" + "66666666" + "77777777" + "88888888";
    const b = "AAAAAAAA" + "BBBBBBBB" + "CCCCCCCC" + "DDDDDDDD" + "EEEEEEEE" + "FFFFFFFF" + "00000000" + "99999999";
    const res = compareSCD64ByBlocks(a, b);
    expect(res.matchingBlocks).toBe(0);
    expect(res.relationship).toBe("UNRELATED");
    expect(res.similarity).toBe(0);
  });

  it("throws error for malformed lengths", () => {
    const a = "short";
    const b = "01861DF4C31AC92C24D4754DD1043D244908E4B3317B90735048A13A0AB2B33C";
    expect(() => compareSCD64ByBlocks(a, b)).toThrow("SCD64 checksums must be exactly 64 characters long.");
  });
});
