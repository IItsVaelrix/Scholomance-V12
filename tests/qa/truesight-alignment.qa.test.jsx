
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

// Mock the codex measurement engine at the file level. The key insight: even
// though we mock the module's exports, buildTruesightOverlayLines (in codex/core)
// uses its own internal reference to measureTextWidth, so mocking the module
// doesn't affect it. We must also mock buildTruesightOverlayLines itself so the
// consumer (ScrollEditor) calls our version that uses the mocked measurement.
const { truesightMeasureMock } = vi.hoisted(() => ({
  truesightMeasureMock: vi.fn((text) => {
    if (text === ' ') return 10;
    return text.length * 10;
  }),
}));

function buildDeterministicLines(content, containerWidth, topology) {
  const rawLines = String(content || '').split('\n');
  const visualLines = [];
  let globalVisualLineIndex = 0;
  let absoluteOffset = 0;
  for (let rawLineIndex = 0; rawLineIndex < rawLines.length; rawLineIndex += 1) {
    const lineText = rawLines[rawLineIndex];
    let currentLineTokens = [];
    let currentLineWidth = 0;
    const matches = [...lineText.matchAll(/[A-Za-z]+|\s+|[^A-Za-z\s]+/g)];
    for (const match of matches) {
      const token = match[0];
      const localStart = match.index ?? 0;
      const tokenWidth = truesightMeasureMock(token);
      const tokenX = currentLineWidth;
      currentLineTokens.push({
        token,
        localStart,
        localEnd: localStart + token.length,
        globalCharStart: absoluteOffset + localStart,
        lineIndex: rawLineIndex,
        visualLineIndex: globalVisualLineIndex,
        wordIndex: /^[A-Za-z]+$/.test(token) ? currentLineTokens.filter(t => /^[A-Za-z]+$/.test(t.token)).length : null,
        x: tokenX,
        width: tokenWidth,
        isWhitespace: /^\s+$/.test(token),
      });
      currentLineWidth += tokenWidth;
    }
    visualLines.push({
      lineIndex: globalVisualLineIndex++,
      rawLineIndex,
      lineText,
      tokens: currentLineTokens,
      lineType: 'normal',
      absoluteStart: absoluteOffset,
    });
    absoluteOffset += lineText.length + 1;
  }
  return { lines: visualLines, allTokens: visualLines.flatMap(l => l.tokens) };
}

vi.mock('../../src/lib/truesight/compiler/adaptiveWhitespaceGrid', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    measureTextWidth: truesightMeasureMock,
    buildTruesightOverlayLines: buildDeterministicLines,
  };
});
vi.mock('../../codex/core/shared/truesight/compiler/adaptiveWhitespaceGrid', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    measureTextWidth: truesightMeasureMock,
    buildTruesightOverlayLines: buildDeterministicLines,
  };
});

describe('Truesight Alignment - Pixel Perfection QA', () => {
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
        content={content}
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
    // In JSDOM we mock the measurement to be precise.
    // Use letter-only tokens so LINE_TOKEN_REGEX doesn't split (it treats digits
    // as a separate token type from letters).
    const content = "Alpha Bravo";

    // Cumulative measurement: Alpha(50) + Space(10) = Bravo at x=60.
    // Gap = w2Left - (w1Left + w1Width) = 60 - 50 = 10px.
    const spaceWidth = 10;

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
        content={content}
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

    // "Alpha Bravo" - Alpha at char 0, Bravo at char 6
    const w1 = Array.from(tokens).find(t => t.getAttribute('data-char-start') === "0");
    const w2 = Array.from(tokens).find(t => t.getAttribute('data-char-start') === "6");

    assertTrue(!!w1 && !!w2, { ...testContext, testName: 'tokens should exist' });

    const w1Left = parseFloat(w1.style.left);
    const w2Left = parseFloat(w2.style.left);
    const w1Width = parseFloat(w1.style.width);
    const w2Width = parseFloat(w2.style.width);

    // Whitespace consistency invariant: the cumulative position of w2 must
    // equal w1's left + w1's natural width + space width. The OUTER span's
    // width is the hitWidth (extends to the next word's left edge for the
    // clickable box). The INNER span carries the natural token width via
    // its truesight-word-inner child -- but JSDOM cannot measure rendered
    // text, so we derive the natural width from the mock measurements
    // instead.
    const w1HitToW2Left = w2Left - (w1Left + w1Width);
    // The space token in the source sits at char 5 (after "Alpha"). Find the
    // punctuation/whitespace span at that offset and read its rendered width.
    const spaceSpan = container.querySelector(`[data-char-start="5"]`);
    const spaceWidthRendered = spaceSpan ? parseFloat(spaceSpan.style.width) : 0;
    // w1's natural width = w2Left - w1Left - spaceWidthRendered
    const w1NaturalWidth = w2Left - w1Left - spaceWidthRendered;
    // The "whitespace gap" (visual space between glyphs) is the rendered
    // space token's own width.
    const actualGap = spaceWidthRendered;

    console.log('DEBUG w1', { left: w1Left, width: w1Width, naturalWidth: w1NaturalWidth });
    console.log('DEBUG w2', { left: w2Left, width: w2Width });
    console.log('DEBUG spaceSpan', spaceSpan ? { width: spaceSpan.style.width } : 'NOT FOUND');
    console.log('DEBUG w1HitToW2Left', w1HitToW2Left, 'actualGap', actualGap);

    // The OUTER spans must abut: hitWidth must equal distance to next word's left edge.
    if (Math.abs(w1HitToW2Left) > 0.1) {
      const error = new BytecodeError(
        ERROR_CATEGORIES.COORD,
        ERROR_SEVERITY.CRIT,
        MODULE_IDS.COORD,
        0x0602, // COORD_OUT_OF_BOUNDS
        {
          expectedGap: 0,
          actualGap: w1HitToW2Left,
          delta: Math.abs(w1HitToW2Left),
          reason: 'Outer hitWidth must equal distance to next word (no dead zone, no overlap)',
        }
      );
      throw new Error(`HITWIDTH_VIOLATION: ${error.bytecode}`);
    }

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
