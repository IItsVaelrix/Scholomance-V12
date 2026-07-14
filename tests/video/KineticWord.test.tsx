import React from "react";
import { render } from "@testing-library/react";
import { KineticWord } from "../../src/video/KineticWord";
import { SCHOOLS } from "../../codex/core/constants/schools.js";
import type { WordTiming } from "../../src/video/types";
import type { BeatClockState } from "../../src/video/useBeatClock";

// useBeatClock reads from Remotion context - not needed here since KineticWord
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

// KineticWord types a word out character by character and parks the unrevealed
// tail in a visibility:hidden span so the line never reflows mid-reveal. "care"
// therefore renders as "car" + <span hidden>e</span>, which getByText cannot
// match — it only sees one text node at a time. Query the wrapper span instead:
// it carries the whole word and the school colour.
function renderWord(wordTiming: WordTiming, timeMs: number): HTMLElement {
  const { container } = render(
    <KineticWord wordTiming={wordTiming} clock={makeClock(timeMs)} beatDurationMs={beatDurationMs} />
  );
  return container.firstChild as HTMLElement;
}

// The glyph ghost is decorative and aria-hidden; it is not part of the word.
function wordTextOf(el: HTMLElement): string {
  return Array.from(el.childNodes)
    .filter((node) => !(node instanceof HTMLElement && node.getAttribute("aria-hidden") === "true"))
    .map((node) => node.textContent ?? "")
    .join("");
}

describe("KineticWord", () => {
  it("renders word text when clock is within active window", () => {
    const el = renderWord(activeWord, 1100);
    expect(wordTextOf(el)).toBe("care");
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
    const el = renderWord(activeWord, 1100);
    // jsdom normalizes hex to rgb. WILL is #ef4444 = rgb(239, 68, 68).
    expect(el.style.color).toMatch(/rgb\(239,\s*68,\s*68\)/);
  });

  it("falls back to VOID color for unknown school", () => {
    const voidWord: WordTiming = { ...activeWord, word: "unknown", school: "UNKNOWN" };
    const el = renderWord(voidWord, 1100);
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
