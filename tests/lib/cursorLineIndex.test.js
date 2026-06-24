import { describe, it, expect } from 'vitest';
import { buildTextBeforeCursor } from '../../src/lib/lexical/CursorAndIntelliSensePlugin.jsx';

// Minimal fake Lexical node implementing only the read API the walk uses.
function makeNode({ key = 'k', type, text = '', parent = null, prev = null }) {
  return {
    getKey: () => key,
    getType: () => type,
    getTextContent: () => text,
    getPreviousSibling: () => prev,
    getParent: () => parent,
  };
}

// Build a root with `paragraphTexts` paragraphs; place a text-node anchor inside
// the paragraph at `cursorParaIdx` carrying `localText` before the cursor.
function buildTree(paragraphTexts, cursorParaIdx, localText) {
  const root = makeNode({ key: 'root', type: 'root' });
  const paras = [];
  for (let i = 0; i < paragraphTexts.length; i++) {
    paras.push(makeNode({
      key: `p${i}`,
      type: 'paragraph',
      text: i === cursorParaIdx ? localText : paragraphTexts[i],
      parent: root,
      prev: i > 0 ? paras[i - 1] : null,
    }));
  }
  // Anchor is a text node inside the cursor's paragraph (no prev text siblings).
  const anchor = makeNode({
    key: 't',
    type: 'text',
    text: localText,
    parent: paras[cursorParaIdx],
    prev: null,
  });
  return anchor;
}

const lineIndexOf = (anchor, local) =>
  buildTextBeforeCursor(anchor, local).split('\n').length - 1;

describe('buildTextBeforeCursor — cursor line index', () => {
  it('line 1 → index 0', () => {
    const anchor = buildTree(['alpha', 'beta', 'gamma'], 0, 'al');
    expect(lineIndexOf(anchor, 'al')).toBe(0);
  });

  it('line 2 → index 1 (not 2 — the off-by-one that highlighted the wrong gutter row)', () => {
    const anchor = buildTree(['alpha', 'beta', 'gamma'], 1, 'be');
    expect(lineIndexOf(anchor, 'be')).toBe(1);
  });

  it('line 3 → index 2', () => {
    const anchor = buildTree(['alpha', 'beta', 'gamma'], 2, 'ga');
    expect(lineIndexOf(anchor, 'ga')).toBe(2);
  });
});
