#!/usr/bin/env node
/**
 * IMMUNE SANITIZER — Auto-fix stray characters flagged by SYNTAX-0F0C.
 *
 * Replacements:
 *   \u2014 (—) EM DASH         → " - "
 *   \u2013 (–) EN DASH         → "-"
 *   \u00A0 (NBSP)              → " "
 *   \u2026 (…) HORIZONTAL ELLIPSIS → "..."
 *   \u201C (") LEFT DOUBLE QUOTE → "\""
 *   \u201D (") RIGHT DOUBLE QUOTE → "\""
 *   \u2018 (') LEFT SINGLE QUOTE → "'"
 *   \u2019 (') RIGHT SINGLE QUOTE → "'"
 *   Invisible characters (\u200B-\u200F, \uFEFF, \u2060-\u2064, \u00AD, \u2028, \u2029) → ""
 *
 * Usage: node scripts/immune-sanitize.js <file1> [file2 ...]
 */
import { readFileSync, writeFileSync, statSync } from 'node:fs';

const REPLACEMENTS = [
  // Invisible characters first
  [/[\u200B-\u200F\uFEFF\u2060-\u2064\u00AD\u2028\u2029]/g, ''],
  // Stray typographic
  [/\u2014/g, ' - '],
  [/\u2013/g, '-'],
  [/\u00A0/g, ' '],
  [/\u2026/g, '...'],
  [/\u201C/g, '"'],
  [/\u201D/g, '"'],
  [/\u2018/g, "'"],
  [/\u2019/g, "'"],
];

let totalChanged = 0;
for (const file of process.argv.slice(2)) {
  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch (err) {
    console.error(`SKIP ${file}: ${err.message}`);
    continue;
  }
  let before = content;
  for (const [re, repl] of REPLACEMENTS) {
    content = content.replace(re, repl);
  }
  if (content === before) continue;
  // Collapse runs of 3+ spaces introduced by " - " replacement (preserve indentation)
  content = content.replace(/([^\n ]) {2,}- {2,}([^\n ])/g, '$1 - $2');
  writeFileSync(file, content, 'utf8');
  const beforeSize = Buffer.byteLength(before, 'utf8');
  const afterSize = Buffer.byteLength(content, 'utf8');
  console.log(`FIXED ${file} (${beforeSize} → ${afterSize} bytes)`);
  totalChanged++;
}
console.log(`\n${totalChanged} file(s) sanitized.`);
