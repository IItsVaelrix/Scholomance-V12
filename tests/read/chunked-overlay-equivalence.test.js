import { describe, it, expect } from 'vitest';
import { buildTruesightOverlayLines } from '../../codex/core/shared/truesight/compiler/adaptiveWhitespaceGrid.ts';

// The ScrollEditor overlay was refactored to build per-raw-line (cached) and
// stitch absolute offsets, instead of building the whole document at once. This
// test proves the chunked stitch yields the SAME overlay the monolithic build
// did — i.e. the word boxes instantiate identically.

const topology = {
  originX: 0, originY: 0, baseCellWidth: 16, baseCellHeight: 24, adaptiveScale: 1,
  totalCols: 80, totalWidth: 800, fontFamily: 'monospace', fontSize: '16px',
  fontStyle: 'normal', fontWeight: '400', letterSpacing: 0, wordSpacing: 0, tabSize: 2,
};
const containerWidth = 800;

// Mirror of the ScrollEditor chunked memo (per-line build + stitch).
function chunkedBuild(content) {
  const cache = new Map();
  const rawLines = String(content || '').split('\n');
  const lines = [];
  let absoluteOffset = 0;
  let globalVisualLineIndex = 0;
  for (let rawLineIndex = 0; rawLineIndex < rawLines.length; rawLineIndex += 1) {
    const lineText = rawLines[rawLineIndex];
    let lineVisuals = cache.get(lineText);
    if (!lineVisuals) {
      lineVisuals = buildTruesightOverlayLines(lineText, containerWidth, topology).lines;
      cache.set(lineText, lineVisuals);
    }
    for (const vl of lineVisuals) {
      const offset = absoluteOffset;
      lines.push({
        ...vl,
        lineIndex: globalVisualLineIndex,
        rawLineIndex,
        absoluteStart: offset,
        tokens: vl.tokens.map((tok) => ({ ...tok, globalCharStart: offset + tok.localStart, lineIndex: rawLineIndex })),
      });
      globalVisualLineIndex += 1;
    }
    absoluteOffset += lineText.length + 1;
  }
  return lines;
}

// visualLineIndex is unused by the renderer and differs by construction; ignore it.
function normalize(lines) {
  return lines.map((l) => ({
    lineIndex: l.lineIndex,
    rawLineIndex: l.rawLineIndex,
    lineText: l.lineText,
    lineType: l.lineType,
    absoluteStart: l.absoluteStart,
    tokens: l.tokens.map(({ visualLineIndex, ...t }) => t),
  }));
}

describe('chunked overlay equivalence', () => {
  const cases = [
    'hello world',
    'the quick brown fox\njumps over\nthe lazy dog',
    '# heading line\n- a list item\nplain text here',
    'lives bloat lattice\n\ntrailing empty line above',
    'dup line\ndup line\nunique',
    '   leading spaces and  double  spaces',
    '',
  ];
  for (const content of cases) {
    it(`matches the monolithic build: ${JSON.stringify(content).slice(0, 30)}`, () => {
      const full = buildTruesightOverlayLines(content, containerWidth, topology).lines;
      const chunked = chunkedBuild(content);
      expect(normalize(chunked)).toEqual(normalize(full));
    });
  }
});
