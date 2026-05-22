/**
 * Pillar 2 — Off-thread dictionary parser (Node worker_threads).
 *
 * Reads and JSON.parses the phoneme dictionary, rhyme rules, and corpus on a
 * dedicated thread so the ~350ms parse of the ~15MB dictionary never blocks the
 * server event loop. The parsed payload is posted back to the main thread once.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parentPort, workerData } from 'node:worker_threads';

async function readAndParse(filePath) {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function loadDictionaries(publicPath) {
  const [dict, rules, corpus] = await Promise.allSettled([
    readAndParse(path.join(publicPath, 'phoneme_dictionary_v2.json')),
    readAndParse(path.join(publicPath, 'rhyme_matching_rules_v2.json')),
    readAndParse(path.join(publicPath, 'corpus.json')),
  ]);

  return {
    ok: true,
    dict: dict.status === 'fulfilled' ? dict.value : null,
    rules: rules.status === 'fulfilled' ? rules.value : null,
    corpus: corpus.status === 'fulfilled' ? corpus.value : null,
    errors: {
      dict: dict.status === 'rejected' ? String(dict.reason) : null,
      rules: rules.status === 'rejected' ? String(rules.reason) : null,
      corpus: corpus.status === 'rejected' ? String(corpus.reason) : null,
    },
  };
}

const publicPath = workerData?.publicPath;

loadDictionaries(publicPath)
  .then((payload) => parentPort.postMessage(payload))
  .catch((err) => parentPort.postMessage({ ok: false, error: String(err) }));
