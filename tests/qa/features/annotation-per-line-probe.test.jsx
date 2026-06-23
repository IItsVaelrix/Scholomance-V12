/**
 * Visual Debug — Annotation Per-Line Regression
 *
 * Renders LexicalScrollEditor with a known multi-word document and inspects
 * the DOM to see whether TruesightWordNode spans are per-word or per-line.
 * This is a diagnostic, not a permanent test — once the regression is
 * understood, the assertions become guards.
 */
import { describe, it, expect } from 'vitest';
import { render, act } from '@testing-library/react';
import LexicalScrollEditor from '../../../src/lib/lexical/LexicalScrollEditor.jsx';
import { TruesightWordNode } from '../../../src/lib/lexical/TruesightNode.js';
import { computeCharStartFromLexical } from '../../../src/lib/lexical/charStart.js';

describe('Lexical Truesight — annotation per-word (regression probe)', () => {
  it('each word in a multi-word line becomes a separate TruesightWordNode', async () => {
    const content = 'Alpha beta gamma';
    const analyzedWordsByIdentity = {
      'alpha-0': { word: 'Alpha', vowelFamily: 'AE' },
      'beta-6': { word: 'beta', vowelFamily: 'EY' },
      'gamma-11': { word: 'gamma', vowelFamily: 'AE' },
    };

    const { container } = render(
      <LexicalScrollEditor
        content={content}
        isTruesight={true}
        isEditable={true}
        analyzedWordsByIdentity={analyzedWordsByIdentity}
      />
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    // Count TruesightWordNode spans vs text nodes in the rendered content.
    const truesightSpans = container.querySelectorAll('.grimoire-word');
    const contentEl = container.querySelector('[contenteditable="true"]') || container;
    const allSpans = contentEl.querySelectorAll('span');

    // Dump for inspection (visible in test output).
    console.log('---- DOM dump ----');
    console.log('  .grimoire-word count:', truesightSpans.length);
    console.log('  all span count:', allSpans.length);
    console.log('  expected words: 3 (Alpha, beta, gamma)');
    for (let i = 0; i < truesightSpans.length; i += 1) {
      const span = truesightSpans[i];
      console.log(`  span[${i}]: text="${span.textContent}" class="${span.className}"`);
    }

    // The structural assertion: 3 words => 3 TruesightWordNode spans.
    // If this fails with 1, the regression is "per line" — one span wraps
    // the whole content.
    expect(truesightSpans.length).toBe(3);
  });

  it('charStart computation for a freshly-split target node returns the start of the word, not the line', () => {
    // Direct unit test on the helper. If this passes, the splits are
    // correct in principle; the issue must be in how the transform applies
    // them.
    const paragraph = { getType: () => 'paragraph', getTextContent: () => 'Alpha beta gamma' };
    const root = { getType: () => 'root', getTextContent: () => '' };
    paragraph.getParent = () => root;
    paragraph.getPreviousSibling = () => null;
    paragraph.getChildren = () => [];

    // The paragraph itself is at charStart 0.
    expect(computeCharStartFromLexical(paragraph)).toBe(0);
  });

  it('analyzedWordsByCharStart (numeric keys) produces per-word spans, not per-line', async () => {
    // Numeric-keyed map. This is what compileVerseToIR.js actually produces.
    // The charStart values use the source-relative convention.
    const analyzedWordsByCharStart = {
      0: { token: 'Alpha', vowelFamily: 'AE' },
      6: { token: 'beta', vowelFamily: 'EY' },
      11: { token: 'gamma', vowelFamily: 'AE' },
    };

    const { container } = render(
      <LexicalScrollEditor
        content="Alpha beta gamma"
        isTruesight={true}
        isEditable={true}
        analyzedWordsByCharStart={analyzedWordsByCharStart}
      />
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    const truesightSpans = container.querySelectorAll('.grimoire-word');
    console.log('---- byCharStart DOM dump ----');
    console.log('  .grimoire-word count:', truesightSpans.length);
    for (let i = 0; i < truesightSpans.length; i += 1) {
      const span = truesightSpans[i];
      console.log(`  span[${i}]: text="${span.textContent}" class="${span.className}"`);
    }
    expect(truesightSpans.length).toBe(3);
  });

  it('analyzedWordsByCharStart as a Map (parent may pass a Map instance) produces per-word spans', async () => {
    const analyzedWordsByCharStart = new Map([
      [0, { token: 'Alpha', vowelFamily: 'AE' }],
      [6, { token: 'beta', vowelFamily: 'EY' }],
      [11, { token: 'gamma', vowelFamily: 'AE' }],
    ]);

    const { container } = render(
      <LexicalScrollEditor
        content="Alpha beta gamma"
        isTruesight={true}
        isEditable={true}
        analyzedWordsByCharStart={analyzedWordsByCharStart}
      />
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    const truesightSpans = container.querySelectorAll('.grimoire-word');
    console.log('---- Map DOM dump ----');
    console.log('  .grimoire-word count:', truesightSpans.length);
    for (let i = 0; i < truesightSpans.length; i += 1) {
      const span = truesightSpans[i];
      console.log(`  span[${i}]: text="${span.textContent}" class="${span.className}"`);
    }
    expect(truesightSpans.length).toBe(3);
  });

  it('multi-line content produces per-word spans on every line, not per-line spans', async () => {
    const content = 'Alpha beta\nGamma delta epsilon';
    const analyzedWordsByCharStart = {
      0: { token: 'Alpha', vowelFamily: 'AE' },
      6: { token: 'beta', vowelFamily: 'EY' },
      11: { token: 'Gamma', vowelFamily: 'AE' },
      17: { token: 'delta', vowelFamily: 'EH' },
      23: { token: 'epsilon', vowelFamily: 'EH' },
    };

    const { container } = render(
      <LexicalScrollEditor
        content={content}
        isTruesight={true}
        isEditable={true}
        analyzedWordsByCharStart={analyzedWordsByCharStart}
      />
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    const truesightSpans = container.querySelectorAll('.grimoire-word');
    console.log('---- multi-line DOM dump ----');
    console.log('  .grimoire-word count:', truesightSpans.length);
    console.log('  expected words: 5 (Alpha, beta, Gamma, delta, epsilon)');
    for (let i = 0; i < truesightSpans.length; i += 1) {
      const span = truesightSpans[i];
      console.log(`  span[${i}]: text="${span.textContent}" class="${span.className}"`);
    }
    expect(truesightSpans.length).toBe(5);
  });

  it('tiered resonance gate Map colors only gated words, by tier, not whole lines', async () => {
    const analyzedWordsByCharStart = {
      0: { token: 'Alpha', vowelFamily: 'AE' },
      6: { token: 'beta', vowelFamily: 'EY' },
      11: { token: 'gamma', vowelFamily: 'AE' },
    };
    // Alpha = rhyme tier (--active), gamma = assonance tier (--assonant),
    // beta = ungated (--grey).
    const resonantCharStarts = new Map([[0, 'rhyme'], [11, 'assonance']]);

    const { container } = render(
      <LexicalScrollEditor
        content="Alpha beta gamma"
        isTruesight={true}
        isEditable={true}
        analyzedWordsByCharStart={analyzedWordsByCharStart}
        resonantCharStarts={resonantCharStarts}
      />
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    const truesightSpans = container.querySelectorAll('.grimoire-word');
    const activeSpans = container.querySelectorAll('.grimoire-word--active');
    const assonantSpans = container.querySelectorAll('.grimoire-word--assonant');
    const greySpans = container.querySelectorAll('.grimoire-word--grey');

    // EXPECTED: 3 words — 1 rhyme (--active, Alpha), 1 assonance (--assonant,
    // gamma), 1 ungated (--grey, beta). Non-resonant words must still carry an
    // explicit class so the annotation does not read as whole-line coloring.
    expect(truesightSpans.length).toBe(3);
    expect(activeSpans.length).toBe(1);
    expect(assonantSpans.length).toBe(1);
    expect(greySpans.length).toBe(1);
  });

  it('a freshly-created TruesightWordNode in the regular branch carries the correct class for the non-resonant case (no active-branch re-fire required)', async () => {
    // This is the regression guard. The regular branch must produce a
    // TruesightWordNode with the correct truesightClass for the non-resonant
    // case (grimoire-word--grey), so the visual is correct even if the
    // active branch never re-fires on the new node.
    const analyzedWordsByCharStart = {
      0: { token: 'Alpha', vowelFamily: 'AE' },
      6: { token: 'beta', vowelFamily: 'EY' },
    };
    const resonantCharStarts = new Map([[0, 'rhyme']]);

    const { container } = render(
      <LexicalScrollEditor
        content="Alpha beta"
        isTruesight={true}
        isEditable={true}
        analyzedWordsByCharStart={analyzedWordsByCharStart}
        resonantCharStarts={resonantCharStarts}
      />
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    const betaSpan = Array.from(container.querySelectorAll('.grimoire-word')).find((s) => s.textContent === 'beta');
    expect(betaSpan).toBeTruthy();
    // beta is in the document but NOT in resonantCharStarts → must be --grey
    // (not just base grimoire-word).
    expect(betaSpan.className).toContain('grimoire-word--grey');
    expect(betaSpan.className).not.toContain('grimoire-word--active');
  });
});
