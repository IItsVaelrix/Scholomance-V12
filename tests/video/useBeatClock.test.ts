import {
  frameIndexToTimeMs,
  resolveBeatState,
  resolveBarState,
} from "../../codex/core/scholotime/scholotime.math.js";

describe("frameIndexToTimeMs — golden", () => {
  it("frame 0 = 0ms", () => {
    expect(frameIndexToTimeMs(0, 30)).toBe(0);
  });

  it("frame 30 at 30fps = 1000ms", () => {
    expect(frameIndexToTimeMs(30, 30)).toBe(1000);
  });

  it("frame 1 at 30fps ≈ 33.33ms", () => {
    expect(frameIndexToTimeMs(1, 30)).toBeCloseTo(33.333, 2);
  });

  it("frame 270 at 30fps = 9000ms (Petrichor leadIn)", () => {
    expect(frameIndexToTimeMs(270, 30)).toBe(9000);
  });
});

describe("resolveBeatState — golden (Petrichor BPM 123, leadInMs 9000)", () => {
  const bpm = 123;
  const offsetMs = 9000;
  const beatDuration = 60000 / 123;

  it("at leadIn offset exactly: beat index 0, phase 0", () => {
    const state = resolveBeatState(9000, { bpm, offsetMs });
    expect(state.index).toBe(0);
    expect(state.phase).toBeCloseTo(0, 5);
  });

  it("half a beat after leadIn: phase ≈ 0.5", () => {
    const state = resolveBeatState(9000 + beatDuration * 0.5, { bpm, offsetMs });
    expect(state.phase).toBeCloseTo(0.5, 2);
  });

  it("one full beat after leadIn: index 1, phase ≈ 0", () => {
    const state = resolveBeatState(9000 + beatDuration, { bpm, offsetMs });
    expect(state.index).toBe(1);
    expect(state.phase).toBeCloseTo(0, 2);
  });

  it("before leadIn: clamps to beat 0, phase 0", () => {
    const state = resolveBeatState(0, { bpm, offsetMs });
    expect(state.index).toBe(0);
    expect(state.phase).toBeCloseTo(0, 5);
  });

  it("durationMs matches beat duration", () => {
    const state = resolveBeatState(9000, { bpm, offsetMs });
    expect(state.durationMs).toBeCloseTo(beatDuration, 1);
  });
});

describe("resolveBarState — golden (4/4 time)", () => {
  const bpm = 123;
  const offsetMs = 9000;
  const beatDuration = 60000 / 123;

  it("first downbeat: bar 0, barPhase 0", () => {
    const beat = resolveBeatState(9000, { bpm, offsetMs });
    const bar = resolveBarState(beat);
    expect(bar.index).toBe(0);
    expect(bar.phase).toBeCloseTo(0, 5);
  });

  it("after 4 beats: bar 1, barPhase ≈ 0", () => {
    const beat = resolveBeatState(9000 + beatDuration * 4, { bpm, offsetMs });
    const bar = resolveBarState(beat);
    expect(bar.index).toBe(1);
    expect(bar.phase).toBeCloseTo(0, 2);
  });

  it("halfway through first bar: barPhase ≈ 0.5", () => {
    const beat = resolveBeatState(9000 + beatDuration * 2, { bpm, offsetMs });
    const bar = resolveBarState(beat);
    expect(bar.phase).toBeCloseTo(0.5, 2);
  });
});
