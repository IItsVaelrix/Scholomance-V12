import { getDominantSchoolFromWindow } from "../../src/video/logic/resolveDominantSchool";
import type { WordTiming } from "../../src/video/types";

const makeWord = (school: string, startMs: number): WordTiming => ({
  word: "x",
  startMs,
  endMs: startMs + 300,
  beat: { index: 0, phase: 0, bar: 0, barPhase: 0 },
  school,
});

describe("getDominantSchoolFromWindow", () => {
  it("returns dominant school from words in trailing 2s window", () => {
    const words = [
      makeWord("VOID", 0),
      makeWord("VOID", 300),
      makeWord("WILL", 600),
      makeWord("VOID", 900),
    ];
    expect(getDominantSchoolFromWindow(words, 1100)).toBe("VOID");
  });

  it("returns VOID when no words are in the window", () => {
    expect(getDominantSchoolFromWindow([], 5000)).toBe("VOID");
  });

  it("ignores words outside the trailing 2s window", () => {
    const words = [
      makeWord("ALCHEMY", 0),   // 10s ago — outside window
      makeWord("WILL", 9700),  // recent
      makeWord("WILL", 9850),
    ];
    expect(getDominantSchoolFromWindow(words, 10000)).toBe("WILL");
  });

  it("breaks ties by SCHOOL_PRIORITY (VOID beats WILL on tie)", () => {
    const words = [
      makeWord("VOID", 9000),
      makeWord("WILL", 9300),
    ];
    // 1 each — VOID has higher priority (index 0 vs index 2)
    expect(getDominantSchoolFromWindow(words, 9500)).toBe("VOID");
  });

  it("breaks ties by SCHOOL_PRIORITY (NECROMANCY beats ALCHEMY on tie)", () => {
    const words = [
      makeWord("NECROMANCY", 9000),
      makeWord("ALCHEMY", 9300),
    ];
    expect(getDominantSchoolFromWindow(words, 9500)).toBe("NECROMANCY");
  });

  it("returns the school with the most words when there is a clear winner", () => {
    const words = [
      makeWord("PSYCHIC", 8000),
      makeWord("PSYCHIC", 8300),
      makeWord("PSYCHIC", 8600),
      makeWord("VOID", 8900),
    ];
    expect(getDominantSchoolFromWindow(words, 9000)).toBe("PSYCHIC");
  });

  it("excludes future words (startMs > currentMs)", () => {
    const words = [
      makeWord("WILL", 9000),
      makeWord("ALCHEMY", 12000), // in the future
    ];
    expect(getDominantSchoolFromWindow(words, 9100)).toBe("WILL");
  });
});
