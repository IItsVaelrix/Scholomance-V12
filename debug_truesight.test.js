
import { buildTruesightOverlayLines } from './src/lib/truesight/compiler/adaptiveWhitespaceGrid.ts';
import { WORD_TOKEN_REGEX } from './src/lib/wordTokenization.js';

const content = "the alpha beta";
const containerWidth = 1000;
const topology = {
  originX: 0,
  originY: 0,
  baseCellWidth: 16,
  baseCellHeight: 24,
  adaptiveScale: 1.0,
  totalCols: 80,
  totalWidth: 1000,
  fontFamily: 'monospace',
  fontSize: '16px',
  fontStyle: 'normal',
  fontWeight: '400',
  letterSpacing: 0,
  wordSpacing: 0,
  tabSize: 2,
};

const result = buildTruesightOverlayLines(content, containerWidth, topology);

console.log("Lines:", result.lines.length);
result.lines.forEach(line => {
  console.log(`Line ${line.lineIndex} (raw ${line.rawLineIndex}):`);
  line.tokens.forEach(token => {
    const isWord = WORD_TOKEN_REGEX.test(token.token) && !token.isWhitespace;
    console.log(`  Token: "${token.token}" isWord: ${isWord} wordIndex: ${token.wordIndex} charStart: ${token.globalCharStart} lineIndex: ${token.lineIndex}`);
  });
});
