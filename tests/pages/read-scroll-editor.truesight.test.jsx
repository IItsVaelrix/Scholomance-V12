import { render } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("../../src/hooks/usePhonemeEngine.jsx", () => ({
  usePhonemeEngine: () => ({ engine: null }),
}));

import ScrollEditor from "../../src/pages/Read/ScrollEditor.jsx";
import { ThemeProvider } from "../../src/hooks/useTheme.jsx";

function hexToRgbString(hex) {
  const normalized = hex.replace("#", "");
  const expanded = normalized.length === 3
    ? normalized.split("").map((char) => `${char}${char}`).join("")
    : normalized;
  const channels = expanded.match(/.{1,2}/g) || [];
  const [r, g, b] = channels.map((channel) => Number.parseInt(channel, 16));
  return `rgb(${r}, ${g}, ${b})`;
}

function createVisualBytecode({
  effectClass = "HARMONIC",
  glowIntensity = 0.8,
  syllableDepth = 2,
  color = "#66ccff",
} = {}) {
  return {
    effectClass,
    color,
    glowIntensity,
    saturationBoost: 0.3,
    syllableDepth,
    isAnchor: false,
    school: "SONIC",
  };
}

function buildAnalyzedWordsByIdentity(entries) {
  return new Map(
    entries.map((entry) => [
      `${entry.lineIndex}:${entry.wordIndex}:${entry.charStart}`,
      {
        visualBytecode: createVisualBytecode({
          effectClass: entry.effectClass,
          glowIntensity: entry.glowIntensity,
          syllableDepth: entry.syllableDepth,
          color: entry.color,
        }),
        ...entry,
      },
    ])
  );
}

describe("ScrollEditor Truesight overlay", () => {
  const renderWithProviders = (ui) => {
    return render(
      <ThemeProvider>
        {ui}
      </ThemeProvider>
    );
  };

  it("renders one overlay row per document line, including blank lines", () => {
    const content = [
      "The freedom of Defiance",
      "is freedom of a God",
      "",
      "Liberation...",
      "We really need it now",
    ].join("\n");

    const { container } = renderWithProviders(
      <ScrollEditor
        initialTitle="Line mapping"
        initialContent={content}
        isEditable={false}
        isTruesight={true}
        analysisMode="rhyme"
        analyzedWords={new Map()}
        activeConnections={[]}
        highlightedLines={[]}
      />
    );

    const overlayLines = container.querySelectorAll(".truesight-line");
    expect(overlayLines.length).toBe(content.split("\n").length);
  });

  it("resets the parchment when a new document identity is issued", () => {
    const view = renderWithProviders(
      <ScrollEditor
        documentIdentity="scroll-1:1"
        initialTitle="Old Scroll"
        initialContent="old verse"
        isEditable={true}
      />
    );

    fireEvent.change(view.getByLabelText("Scroll Title"), {
      target: { value: "Mutated Title" },
    });
    fireEvent.change(view.getByLabelText("Scroll content: Mutated Title"), {
      target: { value: "mutated verse" },
    });

    view.rerender(
      <ThemeProvider>
        <ScrollEditor
          documentIdentity="new:2"
          initialTitle=""
          initialContent=""
          isEditable={true}
        />
      </ThemeProvider>
    );

    expect(view.getByLabelText("Scroll Title").value).toBe("");
    expect(view.getByLabelText("Scroll content: Untitled").value).toBe("");
  });

  it("does not color words when no rhyme connections are active", () => {
    const content = "Alpha beta";
    const analyzedWords = new Map([
      ["ALPHA", { vowelFamily: "AE", syllables: [{}, {}] }],
      ["BETA", { vowelFamily: "EY", syllables: [{}, {}] }],
    ]);

    const { container } = renderWithProviders(
      <ScrollEditor
        initialTitle="No connections"
        initialContent={content}
        isEditable={false}
        isTruesight={true}
        analysisMode="rhyme"
        analyzedWords={analyzedWords}
        activeConnections={[]}
        highlightedLines={[]}
      />
    );

    const coloredWords = container.querySelectorAll(".grimoire-word");
    expect(coloredWords.length).toBe(0);
  });

  it("colors only words participating in rhyme connections", () => {
    const content = "Alpha beta gamma";
    const analyzedWordsByIdentity = buildAnalyzedWordsByIdentity([
      { word: "Alpha", normalizedWord: "ALPHA", lineIndex: 0, wordIndex: 0, charStart: 0, charEnd: 5, vowelFamily: "AE" },
      { word: "beta", normalizedWord: "BETA", lineIndex: 0, wordIndex: 1, charStart: 6, charEnd: 10, vowelFamily: "EY" },
      { word: "gamma", normalizedWord: "GAMMA", lineIndex: 0, wordIndex: 2, charStart: 11, charEnd: 16, vowelFamily: "AE" },
    ]);
    const activeConnections = [
      {
        syllablesMatched: 1,
        wordA: { charStart: 0, lineIndex: 0, word: "Alpha", normalizedWord: "ALPHA", vowelFamily: "AE" },
        wordB: { charStart: 11, lineIndex: 0, word: "gamma", normalizedWord: "GAMMA", vowelFamily: "AE" },
      },
    ];

    const { container } = renderWithProviders(
      <ScrollEditor
        initialTitle="With connections"
        initialContent={content}
        isEditable={false}
        isTruesight={true}
        analysisMode="rhyme"
        analyzedWordsByIdentity={analyzedWordsByIdentity}
        activeConnections={activeConnections}
        highlightedLines={[]}
      />
    );

    const coloredWords = container.querySelectorAll(".grimoire-word");
    expect(coloredWords.length).toBe(2);
    expect(coloredWords[0]?.textContent).toBe("Alpha");
    expect(coloredWords[1]?.textContent).toBe("gamma");
  });

  it("substitutes excluded awkward words through active vowel families", () => {
    const content = "the tone meta";
    const analyzedWordsByIdentity = buildAnalyzedWordsByIdentity([
      {
        word: "the",
        normalizedWord: "THE",
        lineIndex: 0,
        wordIndex: 0,
        charStart: 0,
        charEnd: 3,
        vowelFamily: "EY",
        effectClass: "INERT",
        glowIntensity: 0,
      },
      { word: "tone", normalizedWord: "TONE", lineIndex: 0, wordIndex: 1, charStart: 4, charEnd: 8, vowelFamily: "OW" },
      { word: "meta", normalizedWord: "META", lineIndex: 0, wordIndex: 2, charStart: 9, charEnd: 13, vowelFamily: "EY" },
    ]);
    const activeConnections = [
      {
        syllablesMatched: 1,
        wordA: { charStart: 0, lineIndex: 0, word: "the", normalizedWord: "THE", vowelFamily: "EY" },
        wordB: { charStart: 4, lineIndex: 0, word: "tone", normalizedWord: "TONE", vowelFamily: "OW" },
      },
    ];

    const { container } = renderWithProviders(
      <ScrollEditor
        initialTitle="Vowel substitution"
        initialContent={content}
        isEditable={false}
        isTruesight={true}
        analysisMode="rhyme"
        analyzedWordsByIdentity={analyzedWordsByIdentity}
        activeConnections={activeConnections}
        highlightedLines={[]}
      />
    );

    const coloredWords = Array.from(container.querySelectorAll(".grimoire-word")).map((node) => node.textContent);
    expect(coloredWords).toEqual(["tone", "meta"]);
  });

  it("does not broaden to all family peers when a non-stop connected word already represents that family", () => {
    const content = "the echo mellow";
    const analyzedWordsByIdentity = buildAnalyzedWordsByIdentity([
      {
        word: "the",
        normalizedWord: "THE",
        lineIndex: 0,
        wordIndex: 0,
        charStart: 0,
        charEnd: 3,
        vowelFamily: "EH",
        effectClass: "INERT",
        glowIntensity: 0,
      },
      { word: "echo", normalizedWord: "ECHO", lineIndex: 0, wordIndex: 1, charStart: 4, charEnd: 8, vowelFamily: "EH" },
      { word: "mellow", normalizedWord: "MELLOW", lineIndex: 0, wordIndex: 2, charStart: 9, charEnd: 15, vowelFamily: "EH" },
    ]);
    const activeConnections = [
      {
        syllablesMatched: 1,
        wordA: { charStart: 0, lineIndex: 0, word: "the", normalizedWord: "THE", vowelFamily: "EH" },
        wordB: { charStart: 4, lineIndex: 0, word: "echo", normalizedWord: "ECHO", vowelFamily: "EH" },
      },
    ];

    const { container } = renderWithProviders(
      <ScrollEditor
        initialTitle="No broad family spill"
        initialContent={content}
        isEditable={false}
        isTruesight={true}
        analysisMode="rhyme"
        analyzedWordsByIdentity={analyzedWordsByIdentity}
        activeConnections={activeConnections}
        highlightedLines={[]}
      />
    );

    const coloredWords = Array.from(container.querySelectorAll(".grimoire-word")).map((node) => node.textContent);
    expect(coloredWords).toEqual(["echo"]);
  });

  it("emits stable token identity when a Truesight word is activated", () => {
    const content = "Alpha beta gamma";
    const analyzedWordsByIdentity = buildAnalyzedWordsByIdentity([
      { word: "Alpha", normalizedWord: "ALPHA", lineIndex: 0, wordIndex: 0, charStart: 0, charEnd: 5, vowelFamily: "AE" },
      { word: "beta", normalizedWord: "BETA", lineIndex: 0, wordIndex: 1, charStart: 6, charEnd: 10, vowelFamily: "EY" },
      { word: "gamma", normalizedWord: "GAMMA", lineIndex: 0, wordIndex: 2, charStart: 11, charEnd: 16, vowelFamily: "AE" },
    ]);
    const activeConnections = [
      {
        syllablesMatched: 1,
        wordA: { charStart: 0, lineIndex: 0, word: "Alpha", normalizedWord: "ALPHA", vowelFamily: "AE" },
        wordB: { charStart: 11, lineIndex: 0, word: "gamma", normalizedWord: "GAMMA", vowelFamily: "AE" },
      },
    ];
    const onWordActivate = vi.fn();

    const { container } = renderWithProviders(
      <ScrollEditor
        initialTitle="Activation"
        initialContent={content}
        isEditable={false}
        isTruesight={true}
        analysisMode="rhyme"
        analyzedWordsByIdentity={analyzedWordsByIdentity}
        activeConnections={activeConnections}
        highlightedLines={[]}
        onWordActivate={onWordActivate}
      />
    );

    const clickableWord = container.querySelector(".grimoire-word");
    expect(clickableWord).toBeTruthy();

    fireEvent.click(clickableWord);

    expect(onWordActivate).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: "truesight_tap",
        word: "Alpha",
        normalizedWord: "ALPHA",
        charStart: 0,
      })
    );
  });

  it("keeps the explicit token bytecode color authoritative for multisyllabic rhymes", () => {
    const content = "adore core";
    const magenta = hexToRgbString("#ff00ff");
    const analyzedWordsByIdentity = new Map([
      [
        "0:0:0",
        {
          word: "adore",
          normalizedWord: "ADORE",
          lineIndex: 0,
          wordIndex: 0,
          charStart: 0,
          charEnd: 5,
          vowelFamily: "AH",
          terminalVowelFamily: "AO",
          rhymeKey: "AO-R",
          rhymeTailSignature: "AO-R",
          phonemes: ["AH0", "D", "AO1", "R"],
          visualBytecode: {
            effectClass: "HARMONIC",
            color: "#ff00ff",
            glowIntensity: 0.8,
            saturationBoost: 0.3,
            syllableDepth: 2,
            isAnchor: false,
            school: "SONIC",
          },
        },
      ],
      [
        "0:1:6",
        {
          word: "core",
          normalizedWord: "CORE",
          lineIndex: 0,
          wordIndex: 1,
          charStart: 6,
          charEnd: 10,
          vowelFamily: "AO",
          terminalVowelFamily: "AO",
          rhymeKey: "AO-R",
          rhymeTailSignature: "AO-R",
          phonemes: ["K", "AO1", "R"],
          visualBytecode: {
            effectClass: "HARMONIC",
            color: "#ff00ff",
            glowIntensity: 0.8,
            saturationBoost: 0.3,
            syllableDepth: 1,
            isAnchor: false,
            school: "SONIC",
          },
        },
      ],
    ]);

    const { container } = renderWithProviders(
      <ScrollEditor
        initialTitle="Rhyme tail colors"
        initialContent={content}
        isEditable={false}
        isTruesight={true}
        analysisMode="rhyme"
        analyzedWordsByIdentity={analyzedWordsByIdentity}
        activeConnections={[
          {
            syllablesMatched: 1,
            wordA: { charStart: 0, lineIndex: 0, word: "adore", normalizedWord: "ADORE", vowelFamily: "AO" },
            wordB: { charStart: 6, lineIndex: 0, word: "core", normalizedWord: "CORE", vowelFamily: "AO" },
          },
        ]}
        highlightedLines={[]}
      />
    );

    const renderedWords = Array.from(container.querySelectorAll(".truesight-word"));
    expect(renderedWords).toHaveLength(2);
    expect(renderedWords.map((node) => node.textContent)).toEqual(["adore", "core"]);
    expect(window.getComputedStyle(renderedWords[0]).color).toBe(magenta);
    expect(window.getComputedStyle(renderedWords[1]).color).toBe(magenta);
  });
});
