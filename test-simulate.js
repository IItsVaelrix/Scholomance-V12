import { LINE_TOKEN_REGEX, WORD_TOKEN_REGEX } from './codex/core/constants/regex.js';

const lineText = "Bonkers detest jokers";
const matches = [...lineText.matchAll(LINE_TOKEN_REGEX)];

let currentLineWidth = 0;
const currentLineTokens = [];

for (const match of matches) {
  const token = match[0];
  const localStart = match.index ?? 0;
  const isWord = WORD_TOKEN_REGEX.test(token);
  const isWhitespace = /^\s+$/.test(token);
  
  // mock width
  const tokenWidth = token.length * 10;
  
  const tokenX = currentLineWidth;
  currentLineTokens.push({
    token,
    localStart,
    x: tokenX,
    width: tokenWidth,
    isWhitespace
  });
  currentLineWidth += tokenWidth;
}

currentLineTokens.forEach((t, tokIdx, tokArr) => {
  const isWord = WORD_TOKEN_REGEX.test(t.token) && !t.isWhitespace;
  
  const nextGlyph = tokArr.slice(tokIdx + 1).find((nt) => !nt.isWhitespace);
  const hitWidth = nextGlyph ? nextGlyph.x - t.x : t.width;
  
  console.log(`Token: "${t.token}"`);
  console.log(`  isWord: ${isWord}`);
  console.log(`  x: ${t.x}`);
  console.log(`  width: ${t.width}`);
  console.log(`  hitWidth: ${hitWidth}`);
  if (isWord) {
    console.log(`  => Rendered as word shell with left: ${t.x}, width: ${hitWidth}`);
  }
});
