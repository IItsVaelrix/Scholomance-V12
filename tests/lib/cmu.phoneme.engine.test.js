// @vitest-environment node

import { beforeAll, describe, expect, it } from "vitest";
import { CmuPhonemeEngine } from "../../codex/core/phonology/cmu.phoneme.engine.js";
import { PhonemeEngine } from "../../codex/core/phonology/phoneme.engine.js";

describe("CMUDICT integration", () => {
  beforeAll(async () => {
    await CmuPhonemeEngine.init();
    await PhonemeEngine.init();
  });

  it("loads CMUDICT in node runtime", () => {
    expect(CmuPhonemeEngine.isAvailable()).toBe(true);
  });

  it("returns authoritative CMU pronunciations for irregular words", () => {
    const result = CmuPhonemeEngine.analyzeWord("colonel");

    expect(result).toBeTruthy();
    expect(result.phonemes).toEqual(["K", "ER1", "N", "AH0", "L"]);
    expect(result.vowelFamily).toBe("ER");
  });

  it('uses CMU output through the main phoneme engine', () => {
    const result = PhonemeEngine.analyzeWord('kernel');
    expect(result).toBeTruthy();
    expect(result.phonemes).toEqual(["K", "ER1", "N", "AH0", "L"]);

    // Was "ER-L": the family came from the stressed syllable and the coda from
    // the LAST syllable, so "kernel" (K ER1 N AH0 L) keyed identically to "girl"
    // (G ER1 L) — which is not a rhyme; kernel is two syllables. The key is now
    // the rhyme domain (last stressed vowel to the end), so it is ER-NAHL and
    // rhymes with "colonel", which is what actually rhymes with it.
    expect(result.rhymeKey).toBe("ER-NAHL");
    expect(PhonemeEngine.analyzeWord('colonel').rhymeKey).toBe("ER-NAHL");
    expect(PhonemeEngine.analyzeWord('girl').rhymeKey).not.toBe(result.rhymeKey);
  });
});
