/**
 * scripts/build_vector_artifacts.js
 * 
 * Phase 2: Vector Artifact Injection (JavaScript Fallback)
 * 
 * This script generates and injects 2.5-bit TurboQuant embeddings into 
 * rhyme_lexicon.sqlite across both /data and /dict_data targets.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'node:fs';
import { fileURLToPath } from 'url';
import { quantizeVectorJS } from '../src/lib/math/quantization/turboquant.js';
import { generatePhonosemanticVector } from '../codex/core/semantic/vector.utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATHS = [
    path.resolve(__dirname, '../data/rhyme-astrology/rhyme_lexicon.sqlite'),
    path.resolve(__dirname, '../dict_data/rhyme-astrology/rhyme_lexicon.sqlite'),
];
const SEED = 42;
const TARGET_DIM = 256; // Must be power of 2

async function processDb(dbPath) {
    if (!fs.existsSync(dbPath)) {
        console.log(`[RITUAL] Substrate not found at ${dbPath}, skipping.`);
        return;
    }
    
    console.log(`[RITUAL] Opening Rhyme Lexicon: ${dbPath}`);
    const db = new Database(dbPath);

    // 1. Add column if missing
    try {
        db.exec('ALTER TABLE lexicon_node ADD COLUMN embeddings_tq BLOB');
        console.log('[RITUAL] Added column: lexicon_node.embeddings_tq');
    } catch (e) {
        if (e.message.includes('duplicate column name')) {
            console.log('[RITUAL] Column embeddings_tq already exists.');
        } else {
            throw e;
        }
    }

    // 2. Fetch all entries
    const entries = db.prepare('SELECT id, normalized FROM lexicon_node').all();
    console.log(`[RITUAL] Generating Phonosemantic Embeddings for ${entries.length} nodes...`);

    const updateStmt = db.prepare('UPDATE lexicon_node SET embeddings_tq = ? WHERE id = ?');

    // 3. Batch process
    const transaction = db.transaction((rows) => {
        let count = 0;
        for (const row of rows) {
            const vector = generatePhonosemanticVector(row.normalized, TARGET_DIM);
            const { data, norm } = quantizeVectorJS(vector, SEED);

            // Pack: [4-byte norm][data...]
            const dataBuffer = Buffer.from(data);
            const tqPayload = Buffer.alloc(4 + dataBuffer.length);
            tqPayload.writeFloatLE(norm, 0); 
            dataBuffer.copy(tqPayload, 4);

            updateStmt.run(tqPayload, row.id);
            count++;
            if (count % 10000 === 0) console.log(`  - Ascended ${count}...`);
        }
    });

    transaction(entries);
    console.log(`[RITUAL] Ascension Complete for ${dbPath}.`);
    db.close();
}

async function main() {
    for (const dbPath of DB_PATHS) {
        await processDb(dbPath);
    }
}

main().catch(err => {
    console.error('[RITUAL] Critical Build Failure:', err.message);
    process.exit(1);
});
