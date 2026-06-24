import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import ScrollEditor from '../../src/pages/Read/ScrollEditor';
import { VOWEL_FAMILY_TO_SCHOOL, generateSchoolColor } from '../../src/data/schools.js';
import { FAMILY_IDENTITY } from '../../codex/core/phonology/vowelWheel.js';
import { wordTruesight } from '../../src/pages/Visualiser/truesightColor';
import { assertTrue } from './tools/bytecode-assertions.js';

// Mock dependencies
vi.mock('../../hooks/useTheme.jsx', () => ({
  useTheme: () => ({ theme: 'dark' })
}));

vi.mock('../../hooks/usePrefersReducedMotion.js', () => ({
  usePrefersReducedMotion: () => false
}));

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

describe('Truesight Color - Pixel Perfection QA', () => {
  const testContext = {
    testFile: 'truesight-color.qa.test.jsx',
    testSuite: 'Truesight Color QA'
  };

  // The single colour authority is wordTruesight (word -> analyzeDeep ->
  // vowel family -> school -> school colour). This test feeds ScrollEditor
  // production-shaped props - no palette objects, no viseme styles - and
  // asserts the rendered colour against the real school constants. The old
  // version of this test mocked an object-shaped vowelColors palette that
  // production never passes (LING-0F07 shadow palette); do not reintroduce it.
  it('renders a content word in its phoneme-school colour with production-shaped props', async () => {
    // "see" -> IY family -> PSYCHIC school, straight from the constants.
    const expectedSchool = VOWEL_FAMILY_TO_SCHOOL.IY;
    const expectedColor = hexToRgb(generateSchoolColor(expectedSchool));

    const content = 'see';
    const analyzedWordsByIdentity = new Map([
      [
        '0:0:0',
        {
          word: 'see',
          normalizedWord: 'SEE',
          lineIndex: 0,
          wordIndex: 0,
          charStart: 0,
          charEnd: 3,
          vowelFamily: 'IY',
          terminalVowelFamily: 'IY',
        },
      ],
    ]);

    const { container } = render(
      <ScrollEditor
        content={content}
        isTruesight={true}
        isEditable={true}
        analyzedWordsByIdentity={analyzedWordsByIdentity}
      />
    );

    // Give time for layout/analysis effects
    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    const word = container.querySelector('.truesight-word');
    assertTrue(!!word, { ...testContext, testName: 'token should be rendered' });

    expect(window.getComputedStyle(word).color).toBe(expectedColor);
  });

  it('agrees with the engine resolver: wordTruesight school matches the canonical map', () => {
    const ts = wordTruesight('see');
    expect(ts).not.toBeNull();
    expect(ts.school).toBe(VOWEL_FAMILY_TO_SCHOOL.IY);
    expect(ts.color).toBe(generateSchoolColor(VOWEL_FAMILY_TO_SCHOOL.IY));
  });

  it('keeps every alias row consistent with its FAMILY_IDENTITY fold target', () => {
    // A raw map lookup and a normalize-then-lookup must never disagree about
    // a family's school (the OO -> ABJURATION vs UH -> VOID contradiction).
    for (const [alias, canonical] of Object.entries(FAMILY_IDENTITY)) {
      if (alias === canonical) continue;
      expect(
        VOWEL_FAMILY_TO_SCHOOL[alias],
        `alias ${alias} must map to the same school as its fold target ${canonical}`,
      ).toBe(VOWEL_FAMILY_TO_SCHOOL[canonical]);
    }
  });
});
