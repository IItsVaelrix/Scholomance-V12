/**
 * backfill_rhyme_corpus_freq.js
 *
 * Populates rhyme_index.corpus_freq in scholomance_dict.sqlite with each word's
 * token frequency across scholomance_corpus.sqlite.
 *
 * Why this exists: rhyme_index is derived from CMUdict, which carries a
 * pronunciation for every surname and abbreviation it knows ("dold", "nold",
 * "vold", "golde"). Those are short, so ordering the rhyme bucket by word length
 * floated them above every real rhyme. Lexical attestation cannot rank them
 * either — "told" is an irregular past tense with no WordNet lemma and no gloss,
 * yet it is one of the best rhymes for "bold". Usage is the only signal that
 * separates the two, so we count how often each word actually appears in the
 * corpus and let the rhyme query order by that.
 *
 * Idempotent: re-running recomputes every count from scratch.
 *
 *   node scripts/backfill_rhyme_corpus_freq.js
 */

import { existsSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const TOKEN_REGEX = /[a-z]+(?:'[a-z]+)*/g;
const UPDATE_CHUNK_SIZE = 5000;

function resolvePath(envVar, fallback) {
  const raw = process.env[envVar];
  const value = typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : fallback;
  return path.resolve(process.cwd(), value);
}

function countCorpusTokens(corpusPath) {
  const corpus = new Database(corpusPath, { readonly: true, fileMustExist: true });
  const frequencies = new Map();
  let sentences = 0;

  // One pass over the corpus is O(tokens); querying FTS once per vocabulary word
  // would be O(vocabulary x corpus) for 123k words.
  for (const row of corpus.prepare('SELECT text FROM sentence').iterate()) {
    sentences += 1;
    const text = typeof row.text === 'string' ? row.text.toLowerCase() : '';
    const tokens = text.match(TOKEN_REGEX);
    if (!tokens) continue;
    for (const token of tokens) {
      frequencies.set(token, (frequencies.get(token) || 0) + 1);
    }
  }

  corpus.close();
  return { frequencies, sentences };
}

function ensureCorpusFreqColumn(dict) {
  const exists = dict
    .prepare("SELECT COUNT(*) AS n FROM pragma_table_info('rhyme_index') WHERE name = 'corpus_freq'")
    .get().n > 0;

  if (!exists) {
    dict.exec('ALTER TABLE rhyme_index ADD COLUMN corpus_freq INTEGER NOT NULL DEFAULT 0');
  }
  // Ordering reads corpus_freq before the LENGTH/alpha tie-breakers, so the
  // rhyme_key lookup wants it in the index rather than a per-row fetch.
  dict.exec('CREATE INDEX IF NOT EXISTS idx_rhyme_key_freq ON rhyme_index(rhyme_key, corpus_freq DESC)');
  return exists;
}

function main() {
  const dictPath = resolvePath('SCHOLOMANCE_DICT_PATH', './scholomance_dict.sqlite');
  const corpusPath = resolvePath('SCHOLOMANCE_CORPUS_PATH', './scholomance_corpus.sqlite');

  for (const [label, target] of [['dict', dictPath], ['corpus', corpusPath]]) {
    if (!existsSync(target)) {
      console.error(`[backfill] ${label} database not found: ${target}`);
      process.exit(1);
    }
  }

  console.log(`[backfill] corpus: ${corpusPath}`);
  const { frequencies, sentences } = countCorpusTokens(corpusPath);
  console.log(`[backfill] scanned ${sentences.toLocaleString()} sentences, ${frequencies.size.toLocaleString()} distinct tokens`);

  console.log(`[backfill] dict:   ${dictPath}`);
  const dict = new Database(dictPath, { fileMustExist: true });
  const columnExisted = ensureCorpusFreqColumn(dict);
  console.log(`[backfill] corpus_freq column ${columnExisted ? 'already present' : 'added'}`);

  const words = dict.prepare('SELECT word_id, word_lower FROM rhyme_index').all();
  const update = dict.prepare('UPDATE rhyme_index SET corpus_freq = ? WHERE word_id = ?');

  let attested = 0;
  const applyChunk = dict.transaction((chunk) => {
    for (const { word_id: wordId, word_lower: wordLower } of chunk) {
      const freq = frequencies.get(wordLower) || 0;
      if (freq > 0) attested += 1;
      update.run(freq, wordId);
    }
  });

  for (let i = 0; i < words.length; i += UPDATE_CHUNK_SIZE) {
    applyChunk(words.slice(i, i + UPDATE_CHUNK_SIZE));
  }

  const zero = words.length - attested;
  console.log(
    `[backfill] ranked ${words.length.toLocaleString()} rhyme_index rows: `
    + `${attested.toLocaleString()} attested, ${zero.toLocaleString()} unattested (${(zero / words.length * 100).toFixed(1)}% demoted)`,
  );

  const sample = dict.prepare(`
    SELECT word_lower, corpus_freq
    FROM rhyme_index
    WHERE rhyme_key = 'OW-LD' AND word_lower != 'bold'
    ORDER BY corpus_freq DESC, LENGTH(word_lower) ASC, word_lower ASC
    LIMIT 8
  `).all();
  console.log(`[backfill] "bold" now rhymes with: ${sample.map((r) => `${r.word_lower}(${r.corpus_freq})`).join(', ')}`);

  dict.close();
}

main();
