import { describe, expect, it } from "vitest";

import { resolveVerseIrColor } from "../../../src/lib/truesight/color/pcaChroma.js";
import {
  buildRhymeColorRegistry,
  resolveTokenColor,
} from "../../../src/lib/truesight/color/rhymeColorRegistry.js";

describe("rhymeColorRegistry", () => {
  it("derives rhyme-family colors from terminal rhyme identity instead of full-word phonemes", () => {
    const registry = buildRhymeColorRegistry([
      {
        word: "adore",
        rhymeKey: "AO-R",
        rhymeTailSignature: "AO-R",
        phonemes: ["AH0", "D", "AO1", "R"],
      },
      {
        word: "core",
        rhymeKey: "AO-R",
        rhymeTailSignature: "AO-R",
        phonemes: ["K", "AO1", "R"],
      },
    ]);

    expect(registry.get("AO-R")).toBe(resolveVerseIrColor("AO").hex);
  });

  it("keeps the explicit token color authoritative by default", () => {
    const registry = new Map([["AO-R", "#6ab2fb"]]);

    expect(resolveTokenColor("AO-R", registry, "#ff00ff")).toBe("#ff00ff");
    expect(resolveTokenColor("EY-M", registry, "#ff00ff")).toBe("#ff00ff");
  });

  it("can still opt into registry-first resolution for legacy rhyme surfaces", () => {
    const registry = new Map([["AO-R", "#6ab2fb"]]);

    expect(resolveTokenColor("AO-R", registry, "#ff00ff", { preferRegistry: true })).toBe("#6ab2fb");
  });
});
