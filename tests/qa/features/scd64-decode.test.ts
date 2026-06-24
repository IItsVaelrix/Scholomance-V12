import { describe, it, expect } from "vitest";
import { decodeSCD64Hover } from "../../../src/core/scd64/decodeSCD64";

describe("decodeSCD64Hover", () => {
  it("decodes a known COLOR_DRAGON SCD64 signature and provides remediation hints", () => {
    const checksum64 = "01861DF4C31AC92C24D4754DD1043D244908E4B3317B90735048A13A0AB2B33C";
    const result = decodeSCD64Hover(checksum64);

    expect(result.valid).toBe(true);
    expect(result.versionByte).toBe("01");
    expect(result.bugFamily).toBe("COLOR_DRAGON");
    expect(result.slots.length).toBe(8);

    // Verify slots contain human meanings from the real glossary
    expect(result.slots[0].meaning).toContain("Color bug caused by coordinate drift");
    
    // Verify remediation hints are wired
    expect(result.remediationHints).toBeDefined();
    expect(result.remediationHints?.length).toBeGreaterThan(0);
    expect(result.remediationHints?.[0].kind).toBe("BREAKPOINT");
  });

  it("returns invalid for malformed SCD64", () => {
    const result = decodeSCD64Hover("short");
    expect(result.valid).toBe(false);
    expect(result.slots.length).toBe(0);
  });
});
