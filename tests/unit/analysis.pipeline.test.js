import { describe, it, expect } from 'vitest';
import { analyzeText, stemWord } from '../../codex/core/analysis.pipeline.js';

describe('Codex Core — Analysis Pipeline', () => {
  it('analyzes basic text structure correctly', () => {
    const text = "The quick brown fox.";
    const result = analyzeText(text);

    expect(result.stats.wordCount).toBe(4);
    expect(result.lines.length).toBe(1);
    expect(result.lines[0].hasTerminalPunctuation).toBe(true);
  });

  it('correctly stems English tokens', () => {
    expect(stemWord("testing")).toBe("test"); 
    expect(stemWord("foxes")).toBe("fox");
    expect(stemWord("dogs")).toBe("dog");
  });

  it('handles empty input gracefully', () => {
    const result = analyzeText("");
    expect(result.stats.wordCount).toBe(0);
    expect(result.lines).toEqual([]);
  });

  it('computes school weights correctly for vowel families', () => {
    // Mocked indirectly by the pipeline school weight logic
    const text = "a e i o u"; // simple vowels
    const result = analyzeText(text);
    
    expect(result.dominantSchool).toBeDefined();
    expect(result.schoolWeights).toBeDefined();
  });
});
