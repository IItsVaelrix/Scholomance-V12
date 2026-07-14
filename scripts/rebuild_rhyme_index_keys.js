/**
 * rebuild_rhyme_index_keys.js
 *
 * Recomputes rhyme_index.rhyme_key from the real CMU phonemes in entry.ipa,
 * using the canonical rhyme domain (codex/core/phonology/rhymeDomain.js).
 *
 * The column was originally built by scripts/refine_rhyme_dict.py from what its
 * own header calls a "Basic IPA to ARPAbet mapping (Simplified for core
 * families)". That map collapses AH/UH/UW into a single family "U" and keys a
 * word as <firstStressedFamily>-<finalCoda> — two different syllables stitched
 * together. The result was right for monosyllables by accident and wrong for
 * everything else:
 *
 *   love / move            both U-V     (AH vs UW — not a rhyme)
 *   blood / food / good    both U-D     (AH vs UW vs UH — not a rhyme)
 *   love / repulsive       both AH-V    (final syllable of repulsive is IH0 V)
 *   song / morning         both AO-NG   (morning's tail is AO R N IH NG)
 *
 * The rhyme domain is the phoneme tail from the last STRESSED vowel to the end,
 * which is the definition of a perfect rhyme. Equality of the key IS the rhyme
 * predicate, so grouping by it gives exact perfect rhymes.
 *
 * Idempotent: recomputes every row from entry.ipa each run.
 *
 *   node scripts/rebuild_rhyme_index_keys.js
 */

import { existsSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { buildRhymeKey } from '../codex/core/phonology/rhymeDomain.js';

const UPDATE_CHUNK_SIZE = 5000;

function resolvePath(envVar, fallback) {
  const raw = process.env[envVar];
  const value = typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : fallback;
  return path.resolve(process.cwd(), value);
}

function main() {
  const dictPath = resolvePath('SCHOLOMANCE_DICT_PATH', './scholomance_dict.sqlite');
  if (!existsSync(dictPath)) {
    console.error(`[rebuild] dict database not found: ${dictPath}`);
    process.exit(1);
  }
  console.log(`[rebuild] dict: ${dictPath}`);

  const db = new Database(dictPath, { fileMustExist: true });

  // entry.ipa holds the CMU ARPAbet string ("B OW1 L D"). rhyme_index.word_id
  // references entry.id, so the phonemes are already joinable.
  const rows = db.prepare(`
    SELECT r.word_id AS wordId, r.word_lower AS word, r.rhyme_key AS oldKey, e.ipa AS ipa
    FROM rhyme_index r
    JOIN entry e ON e.id = r.word_id
  `).all();

  console.log(`[rebuild] ${rows.length.toLocaleString()} rhyme_index rows joined to a pronunciation`);

  const update = db.prepare('UPDATE rhyme_index SET rhyme_key = ? WHERE word_id = ?');
  let changed = 0;
  let skipped = 0;
  const pending = [];

  for (const row of rows) {
    const phones = typeof row.ipa === 'string' ? row.ipa.trim().split(/\s+/).filter(Boolean) : [];
    const key = phones.length > 0 ? buildRhymeKey(phones) : null;
    if (!key) { skipped += 1; continue; }
    if (key === row.oldKey) continue;
    pending.push({ key, wordId: row.wordId });
    changed += 1;
  }

  const applyChunk = db.transaction((chunk) => {
    for (const { key, wordId } of chunk) update.run(key, wordId);
  });
  for (let i = 0; i < pending.length; i += UPDATE_CHUNK_SIZE) {
    applyChunk(pending.slice(i, i + UPDATE_CHUNK_SIZE));
  }

  console.log(`[rebuild] rewrote ${changed.toLocaleString()} keys; ${skipped.toLocaleString()} rows had no usable pronunciation`);

  // The lookup index is (rhyme_key, corpus_freq) — see backfill_rhyme_corpus_freq.js.
  db.exec('REINDEX idx_rhyme_key');

  const sample = (word) => {
    const k = db.prepare('SELECT rhyme_key FROM rhyme_index WHERE word_lower = ?').get(word);
    if (!k) return `${word}: (absent)`;
    const mates = db.prepare(`
      SELECT word_lower FROM rhyme_index
      WHERE rhyme_key = ? AND word_lower != ?
      ORDER BY corpus_freq DESC, LENGTH(word_lower) ASC, word_lower ASC
      LIMIT 6
    `).all(k.rhyme_key, word).map((r) => r.word_lower);
    return `${word.padEnd(8)} ${String(k.rhyme_key).padEnd(11)} -> ${mates.join(', ')}`;
  };

  console.log('');
  for (const w of ['bold', 'love', 'blood', 'song', 'fire', 'command', 'mind']) {
    console.log('  ' + sample(w));
  }

  db.close();
}

main();
