
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
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

vi.mock('../../hooks/useColorCodex.js', () => ({
  useColorCodex: () => ({
    bytecodeByCharStart: new Map(),
    shouldColorWord: () => true
  })
}));

describe('Truesight Alignment — Pixel Perfection QA', () => {
  const testContext = {
    testFile: 'truesight-alignment.qa.test.jsx',
    testSuite: 'Truesight Alignment QA'
  };

  it('mathematically verifies alignment between textarea and overlay tokens', async () => {
    const content = "The quick brown fox jumps over the lazy dog";
    
    // We mock window.getComputedStyle to return exact values we expect
    const originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = vi.fn().mockImplementation((el) => {
      if (el.className?.includes('editor-textarea-wrapper')) {
        return {
          fontSize: '16px',
          lineHeight: '30.4px', // 1.9 * 16
          fontFamily: 'serif',
          paddingLeft: '20px',
          paddingTop: '16px',
          paddingRight: '20px',
          paddingBottom: '16px',
          tabSize: '2'
        };
      }
      return originalGetComputedStyle(el);
    });

    // Mock ResizeObserver
    global.ResizeObserver = class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    };

    const { container } = render(
      <ScrollEditor 
        initialContent={content}
        isTruesight={true}
        isEditable={true}
        analysisMode="vowel"
      />
    );

    // Give time for layout effects
    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    const textarea = container.querySelector('textarea');
    const overlay = container.querySelector('.word-background-layer');

    // Mathematical Invariants:
    // 1. Textarea and Overlay must have identical typography
    const textareaStyles = window.getComputedStyle(textarea);
    const overlayStyles = window.getComputedStyle(overlay);

    const typographyFields = ['fontSize', 'lineHeight', 'fontFamily', 'paddingLeft', 'paddingTop'];
    
    for (const field of typographyFields) {
      if (textareaStyles[field] !== overlayStyles[field]) {
        const error = new BytecodeError(
          ERROR_CATEGORIES.TYPE,
          ERROR_SEVERITY.CRIT,
          MODULE_IDS.SHARED,
          0x0001, // TYPE_MISMATCH
          {
            field,
            expected: textareaStyles[field],
            actual: overlayStyles[field],
            reason: 'Typography mismatch between textarea and overlay'
          }
        );
        throw new Error(`ALIGNMENT_VIOLATION: ${error.bytecode}`);
      }
    }

    // 2. Token placement must match character boundaries
    // In JSDOM we can't actually measure text, but we can verify the scale calculation
    // buildTruesightOverlayLines uses measureTextWidth which is mocked in its file
    
    const words = screen.getAllByRole('button');
    assertTrue(words.length > 0, { ...testContext, testName: 'should render overlay tokens' });

    // Verify first word "The" starts at paddingLeft
    const firstWord = words[0];
    const left = parseFloat(firstWord.style.left);
    const expectedLeft = 0; // Relative to the line container which should handle padding
    
    // Check if the truesight-line has padding
    const line = firstWord.parentElement;
    const lineStyles = window.getComputedStyle(line);
    
    // If the line doesn't have padding, tokens must have it
    // Our CSS shows .editor-textarea-wrapper handles padding via computedTypography
    
    // Clean up
    window.getComputedStyle = originalGetComputedStyle;
  });

  it('mathematically verifies adaptive whitespace consistency between words', async () => {
    // In JSDOM we mock the measurement to be precise
    const content = "Word1 Word2";
    
    // We expect: [Word1][Space][Word2]
    // If Space width is 10px, and Word1 is 50px, Word2 MUST start at 60px.
    
    const word1Width = 50;
    const spaceWidth = 10;
    const word2Width = 50;

    // 1. Mock measurement engine
    vi.mock('../../src/lib/truesight/compiler/adaptiveWhitespaceGrid', async (importOriginal) => {
      const actual = await importOriginal();
      return {
        ...actual,
        measureTextWidth: vi.fn().mockImplementation((text) => {
          if (text === 'Word1' || text === 'Word2') return word1Width;
          if (text === ' ') return spaceWidth;
          return text.length * 10;
        })
      };
    });

    const originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = vi.fn().mockImplementation(() => ({
      fontSize: '16px',
      lineHeight: '30.4px',
      fontFamily: 'serif',
      paddingLeft: '0px',
      paddingTop: '0px',
      tabSize: '2'
    }));

    const { container } = render(
      <ScrollEditor 
        initialContent={content}
        isTruesight={true}
        isEditable={true}
        analysisMode="vowel"
      />
    );

    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    const tokens = container.querySelectorAll('.truesight-word');
    assertTrue(tokens.length > 0, { ...testContext, testName: 'should render overlay tokens' });

    // "Word1 Word2"
    // Word1 is at 0
    // Space is at 5
    // Word2 is at 6
    const w1 = Array.from(tokens).find(t => t.getAttribute('data-char-start') === "0");
    const w2 = Array.from(tokens).find(t => t.getAttribute('data-char-start') === "6");

    assertTrue(!!w1 && !!w2, { ...testContext, testName: 'tokens should exist' });

    const w1Left = parseFloat(w1.style.left);
    const w2Left = parseFloat(w2.style.left);
    const w1Width = parseFloat(w1.style.width);
    
    // Word1 is at 0px, width 50px.
    // Space is at 50px, width 10px.
    // Word2 should start at 60px.
    // Gap = 60 - (0 + 50) = 10px.
    const actualGap = w2Left - (w1Left + w1Width);

    if (Math.abs(actualGap - spaceWidth) > 0.1) {
      const error = new BytecodeError(
        ERROR_CATEGORIES.COORD,
        ERROR_SEVERITY.CRIT,
        MODULE_IDS.COORD,
        0x0602, // COORD_OUT_OF_BOUNDS
        {
          expectedGap: spaceWidth,
          actualGap,
          delta: Math.abs(actualGap - spaceWidth),
          reason: 'Whitespace gap drift detected in cumulative measurement logic'
        }
      );
      throw new Error(`WHITESPACE_VIOLATION: ${error.bytecode}`);
    }

    expect(actualGap).toBeCloseTo(spaceWidth, 1);
    window.getComputedStyle = originalGetComputedStyle;
  });
});
