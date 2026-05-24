import { describe, it, expect } from 'vitest';
import * as assertions from './truesight.assertions.js';

describe('truesight.assertions helpers', () => {
  it('exports getColoredWordTexts as a function', () => {
    expect(typeof assertions.getColoredWordTexts).toBe('function');
  });

  it('exports expectColoredWords as a function', () => {
    expect(typeof assertions.expectColoredWords).toBe('function');
  });

  it('exports expectWordsShareColor as a function', () => {
    expect(typeof assertions.expectWordsShareColor).toBe('function');
  });

  it('getColoredWordTexts returns empty array for empty container', () => {
    const container = document.createElement('div');
    expect(assertions.getColoredWordTexts(container)).toEqual([]);
  });

  it('getColoredWordTexts returns text content of .grimoire-word nodes', () => {
    const container = document.createElement('div');
    const word = document.createElement('span');
    word.className = 'grimoire-word';
    word.textContent = 'magic';
    container.appendChild(word);
    expect(assertions.getColoredWordTexts(container)).toEqual(['magic']);
  });
});
