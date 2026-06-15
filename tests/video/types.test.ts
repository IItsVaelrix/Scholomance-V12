import { validateWordTiming, validateAlignmentSidecar } from "../../src/video/types";

const validTiming = {
  word: "care",
  startMs: 9450,
  endMs: 9750,
  beat: { index: 0, phase: 0.922, bar: 0, barPhase: 0.230 },
  school: "WILL",
};

const validSidecar = {
  schemaVersion: "scholomance.align.v1" as const,
  trackId: "petrichor",
  bpm: 123,
  offsetMs: 9000,
  lyricsHash: "abc123",
  generatedAt: "2026-06-15T00:00:00Z",
  wordTimings: [validTiming],
};

describe("validateWordTiming", () => {
  it("accepts a valid WordTiming", () => {
    expect(validateWordTiming(validTiming)).toBe(true);
  });

  it("accepts WordTiming with optional fields", () => {
    expect(validateWordTiming({ ...validTiming, confidence: 0.95, manualOffsetMs: 50 })).toBe(true);
  });

  it("rejects null", () => {
    expect(validateWordTiming(null)).toBe(false);
  });

  it("rejects missing beat.bar", () => {
    expect(validateWordTiming({
      ...validTiming,
      beat: { index: 0, phase: 0 },
    })).toBe(false);
  });

  it("rejects missing school", () => {
    const { school: _, ...noSchool } = validTiming;
    expect(validateWordTiming(noSchool)).toBe(false);
  });

  it("rejects non-number startMs", () => {
    expect(validateWordTiming({ ...validTiming, startMs: "9450" })).toBe(false);
  });
});

describe("validateAlignmentSidecar", () => {
  it("accepts a valid sidecar", () => {
    expect(validateAlignmentSidecar(validSidecar)).toBe(true);
  });

  it("rejects wrong schemaVersion", () => {
    expect(validateAlignmentSidecar({ ...validSidecar, schemaVersion: "v0" })).toBe(false);
  });

  it("rejects missing trackId", () => {
    const { trackId: _, ...noId } = validSidecar;
    expect(validateAlignmentSidecar(noId)).toBe(false);
  });

  it("rejects missing bpm", () => {
    const { bpm: _, ...noBpm } = validSidecar;
    expect(validateAlignmentSidecar(noBpm)).toBe(false);
  });

  it("rejects sidecar where one word entry is invalid", () => {
    expect(validateAlignmentSidecar({
      ...validSidecar,
      wordTimings: [validTiming, { word: "bad" }],
    })).toBe(false);
  });

  it("rejects empty object", () => {
    expect(validateAlignmentSidecar({})).toBe(false);
  });
});
