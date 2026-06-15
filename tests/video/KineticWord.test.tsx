import React from "react";
import { render } from "@testing-library/react";
import { KineticWord } from "../../src/video/KineticWord";
import { SCHOOLS } from "../../codex/core/constants/schools.js";
import type { WordTiming } from "../../src/video/types";
import type { BeatClockState } from "../../src/video/useBeatClock";

// useBeatClock reads from Remotion context — not needed here since KineticWord
// now receives clock as a prop directly.

const makeClock = (timeMs: number): BeatClockState => ({
  timeMs,
  beat: { index: 0, phase: 0, exactBeat: 0, durationMs: 487.8 },
  bar: { index: 0, phase: 0, exactBar: 0, beatsPerBar: 4 },
});

const activeWord: WordTiming = {
  word: "care",
  startMs: 1000,
  endMs: 1500,
  beat: { index: 0, phase: 0, bar: 0, barPhase: 0 },
  school: "WILL",
};

const futureWord: WordTiming = {
  word: "future",
  startMs: 5000,
  endMs: 5500,
  beat: { index: 10, phase: 0, bar: 2, barPhase: 0.5 },
  school: "SONIC",
};

const beatDurationMs = 487.8;

describe("KineticWord", () => {
  it("renders word text when clock is within active window", () => {
    const { getByText } = render(
      <KineticWord
        wordTiming={activeWord}
        clock={makeClock(1100)}
        beatDurationMs={beatDurationMs}
      />
    );
    expect(getByText("care")).toBeTruthy();
  });

  it("renders nothing when clock is before active window", () => {
    const { queryByText } = render(
      <KineticWord
        wordTiming={futureWord}
        clock={makeClock(1000)}
        beatDurationMs={beatDurationMs}
      />
    );
    expect(queryByText("future")).toBeNull();
  });

  it("renders nothing when clock is past active window + linger", () => {
    // word ends at 1500ms, linger is 25% of duration (125ms), so gone by 1625ms
    const { queryByText } = render(
      <KineticWord
        wordTiming={activeWord}
        clock={makeClock(2000)}
        beatDurationMs={beatDurationMs}
      />
    );
    expect(queryByText("care")).toBeNull();
  });

  it("applies WILL school color", () => {
    const { getByText } = render(
      <KineticWord
        wordTiming={activeWord}
        clock={makeClock(1100)}
        beatDurationMs={beatDurationMs}
      />
    );
    const el = getByText("care");
    // jsdom normalizes hex to rgb — check the parent span which carries the color
    expect(el.style.color).toBeTruthy(); // color is set
    expect(el.style.color).not.toBe(""); // not empty
    // Verify it's the WILL color (#ef4444 = rgb(239, 68, 68))
    expect(el.style.color).toMatch(/rgb\(239,\s*68,\s*68\)/);
  });

  it("falls back to VOID color for unknown school", () => {
    const voidWord: WordTiming = { ...activeWord, word: "unknown", school: "UNKNOWN" };
    const { getByText } = render(
      <KineticWord
        wordTiming={voidWord}
        clock={makeClock(1100)}
        beatDurationMs={beatDurationMs}
      />
    );
    const el = getByText("unknown");
    // VOID color is #94a3b8 = rgb(148, 163, 184)
    expect(el.style.color).toMatch(/rgb\(148,\s*163,\s*184\)/);
  });

  it("renders school glyph for WILL word", () => {
    const { container } = render(
      <KineticWord
        wordTiming={activeWord}
        clock={makeClock(1100)}
        beatDurationMs={beatDurationMs}
      />
    );
    expect(container.textContent).toContain("⚡");
  });

  it("renders VOID glyph for unknown school", () => {
    const voidWord: WordTiming = { ...activeWord, word: "x", school: "UNKNOWN" };
    const { container } = render(
      <KineticWord
        wordTiming={voidWord}
        clock={makeClock(1100)}
        beatDurationMs={beatDurationMs}
      />
    );
    expect(container.textContent).toContain("∅");
  });
});
