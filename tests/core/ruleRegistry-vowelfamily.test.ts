import { describe, it, expect } from "vitest";
import { Project } from "ts-morph";
import { RuleRegistry } from "../../src/core/scd64/RuleRegistry";

function scan(code: string) {
  const project = new Project({ useInMemoryFileSystem: true });
  const sf = project.createSourceFile("frag.ts", code);
  return RuleRegistry.evaluateAll(sf);
}

const isVowelFamilyRule = (m: { ruleId: string }) =>
  m.ruleId === "SCD64.COLOR_DRAGON.VOWELFAMILY_SOURCE";

describe("RuleRegistry COLOR_DRAGON vowelFamily-source divergence", () => {
  it("flags vowelFamily assigned from a raw stripped nucleus without the fold", () => {
    // The syllabifyDeep fossil: emits the raw ARPABET vowel as the color key,
    // bypassing VOWEL_TO_BASE_FAMILY + normalizeVowelFamily.
    const code = `
      const baseV = stripStress(vowel);
      return { index: idx, nucleus: vowel, vowelFamily: baseV };
    `;
    const hits = scan(code).filter(isVowelFamilyRule);
    expect(hits).toHaveLength(1);
    expect(hits[0].family).toBe("COLOR_DRAGON");
    expect(hits[0].predictedSCD64.slice(0, 2)).toBe("E1"); // predicted COLOR_DRAGON
  });

  it("flags an inline stripStress assignment to vowelFamily", () => {
    const code = `return { vowelFamily: stripStress(vowel) };`;
    expect(scan(code).filter(isVowelFamilyRule)).toHaveLength(1);
  });

  it("does NOT flag the authoritative folded assignment", () => {
    // The engine pattern: fold through VOWEL_TO_BASE_FAMILY + normalizeVowelFamily.
    const code = `
      const baseV = stripStress(vowel);
      const vowelFamily = normalizeVowelFamily(VOWEL_TO_BASE_FAMILY[baseV] || 'A');
      return { vowelFamily };
    `;
    expect(scan(code).filter(isVowelFamilyRule)).toHaveLength(0);
  });
});
