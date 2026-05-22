import { describe, expect, it } from "vitest";

import {
  buildResonancePalette,
  resolveResonanceColor,
} from "../../../src/lib/truesight/color/rhymeColorRegistry.js";

describe("rhymeColorRegistry", () => {
  it("generates deterministic colors for rhymeKeys within a school gamut", () => {
    const color1 = resolveResonanceColor("AY-T", "SONIC");
    const color2 = resolveResonanceColor("AY-T", "SONIC");
    const color3 = resolveResonanceColor("EY-M", "SONIC");

    expect(color1).toBe(color2);
    expect(color1).not.toBe(color3);
    
    // SONIC is purple-ish (#651fff / 258°). 
    // Gamut variance is +/- 30°.
    // We expect the result to be a valid hex color.
    expect(color1).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("produces different colors for the same rhymeKey in different schools", () => {
    const sonicColor = resolveResonanceColor("AY-T", "SONIC");
    const psychicColor = resolveResonanceColor("AY-T", "PSYCHIC");

    expect(sonicColor).not.toBe(psychicColor);
  });

  it("builds a bulk palette for word profiles", () => {
    const profiles = [
      { identity: "0:0:0", rhymeKey: "AE-T" },
      { identity: "0:1:4", rhymeKey: "AE-T" },
      { identity: "0:2:8", rhymeKey: "IY-P" }
    ];
    
    const palette = buildResonancePalette(profiles, "WILL");
    
    expect(palette.size).toBe(3);
    expect(palette.get("0:0:0")).toBe(palette.get("0:1:4"));
    expect(palette.get("0:0:0")).not.toBe(palette.get("0:2:8"));
  });

  it("falls back to PCA color if rhymeKey is missing", () => {
    const pcaColor = "#123456";
    const profile = { identity: "0:0:0", rhymeKey: null, visualBytecode: { color: pcaColor } };
    
    const palette = buildResonancePalette([profile], "DEFAULT");
    expect(palette.get("0:0:0")).toBe(pcaColor);
  });
});
