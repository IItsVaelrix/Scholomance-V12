import { LINE_TOKEN_REGEX, WORD_TOKEN_REGEX } from './codex/core/constants/regex.js';

const lineText = "Hello beautiful world!";
const matches = [...lineText.matchAll(LINE_TOKEN_REGEX)];
console.log("Matches:", matches.map(m => m[0]));
