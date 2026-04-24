
import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';
import ScrollEditor from '../../src/pages/Read/ScrollEditor';
import { BytecodeError, ERROR_CATEGORIES, ERROR_SEVERITY, MODULE_IDS } from '../../codex/core/pixelbrain/bytecode-error.js';
import { assertTrue } from './tools/bytecode-assertions.js';

// Mock dependencies
vi.mock('../../hooks/useTheme.jsx', () => ({
  useTheme: () => ({ theme: 'dark' })
}));

vi.mock('../../hooks/usePrefersReducedMotion.js', () => ({
  usePrefersReducedMotion: () => false
}));

describe('Truesight Color — Pixel Perfection QA', () => {
  const testContext = {
    testFile: 'truesight-color.qa.test.jsx',
    testSuite: 'Truesight Color QA'
  };

  it('mathematically verifies color and viseme style consistency for vowel families', async () => {
    // 1. Define Ground Truth for a specific vowel family
    const targetFamily = 'IY';
    const groundTruth = {
      hex: '#00FFCC',
      viseme: {
        '--vb-viseme-radius': '2px',
        '--vb-viseme-tracking': '-0.05em',
        '--vb-viseme-weight': '700'
      }
    };

    // 2. Mock the color resolution engine
    vi.mock('../../src/lib/truesight/color/pcaChroma', async (importOriginal) => {
      const actual = await importOriginal();
      return {
        ...actual,
        resolveVerseIrColor: vi.fn().mockImplementation((family) => {
          if (family === targetFamily) {
            return {
              hex: groundTruth.hex,
              viseme: groundTruth.viseme,
              family: targetFamily
            };
          }
          return actual.resolveVerseIrColor(family);
        })
      };
    });

    // 3. Mock school palette to provide our ground truth
    vi.mock('../../src/data/schoolPalettes', async (importOriginal) => {
      const actual = await importOriginal();
      return {
        ...actual,
        buildUniversalVowelPalette: vi.fn().mockImplementation(() => ({
          [targetFamily]: {
            color: groundTruth.hex,
            viseme: groundTruth.viseme
          }
        }))
      };
    });

    // Content where "see" is 'IY' family
    const content = "see"; 
    const analyzedWordsByIdentity = new Map([
      [
        "0:0:0",
        {
          word: "see",
          normalizedWord: "SEE",
          lineIndex: 0,
          wordIndex: 0,
          charStart: 0,
          charEnd: 3,
          vowelFamily: targetFamily,
          terminalVowelFamily: targetFamily,
        },
      ],
    ]);
    
    // 4. Render in Vowel Analysis mode
    const { container } = render(
      <ScrollEditor 
        initialContent={content}
        isTruesight={true}
        isEditable={true}
        analysisMode="vowel"
        analyzedWordsByIdentity={analyzedWordsByIdentity}
        vowelColors={{
          [targetFamily]: {
            color: groundTruth.hex,
            viseme: groundTruth.viseme
          }
        }}
      />
    );

    // Give time for layout/analysis effects
    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    // 5. Find the token
    const word = container.querySelector('.truesight-word');
    assertTrue(!!word, { ...testContext, testName: 'token should be rendered' });

    // 6. Verify Color Invariant
    // Convert RGB to HEX for comparison if needed, or check against expected RGB
    // JSDOM usually returns rgb()
    const computedColor = window.getComputedStyle(word).color;
    expect(computedColor).toBe('rgb(0, 255, 204)');
    
    // Verify Viseme Invariants
    const computedStyles = window.getComputedStyle(word);
    
    for (const [prop, expectedValue] of Object.entries(groundTruth.viseme)) {
      const actualValue = computedStyles.getPropertyValue(prop);
      
      if (actualValue !== expectedValue) {
        const error = new BytecodeError(
          ERROR_CATEGORIES.COLOR,
          ERROR_SEVERITY.CRIT,
          'COLBYT',
          0x0703, // COLOR_BYTE_MISMATCH
          {
            field: prop,
            expected: expectedValue,
            actual: actualValue,
            family: targetFamily,
            reason: 'Viseme biophysical property drift detected'
          }
        );
        throw new Error(`COLOR_PERFECTION_VIOLATION: ${error.bytecode}`);
      }
    }

    console.log('✅ Color and Viseme invariants verified for family:', targetFamily);
  });
});
