/**
 * Datamuse OOV enrichment — the "reading" step (eye + adapter).
 *
 * ONLINE, run at build time only. For every out-of-vocabulary term in the local
 * corpus it asks the bespoke DatamuseAdapter for meaning-neighbours (`ml=`,
 * falling back to synonyms), keeps the ones GloVe already knows, and — crucially
 * — only accepts them if they form a COHERENT cluster in embedding space (the
 * eye validates the adapter's answer). This rejects the proper-noun failure mode
 * where Datamuse returns spelling-neighbour noise (e.g. "ozuna" → random
 * surnames). Results are cached to disk so scoring stays 100% offline forever.
 *
 * Usage:  node build_oov_lexicon.mjs
 * Output: embeddings/turbovec1.datamuse.json  { term: [in-vocab meaning words] }
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as glove from './embeddings.js';
import { createDatamuseAdapter } from '../codex/services/adapters/datamuse.adapter.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EMB_DIR = path.join(HERE, 'embeddings');
const CACHE = path.join(EMB_DIR, 'turbovec1.datamuse.json');

const STOP = new Set(['the', 'and', 'of', 'to', 'in', 'is', 'it', 'for', 'on', 'with',
    'as', 'an', 'at', 'by', 'or', 'ft', 'feat', 'official', 'video', 'music', 'audio',
    'lyric', 'lyrics', 'mv', 'hd', 'remastered', 'version']);

const MIN_RELATIONS = 3;       // need at least this many in-vocab meaning words
const COHERENCE_MIN = 0.12;    // mean pairwise cosine must clear this (reject noise)
const MAX_KEEP = 20;
const CONCURRENCY = 4;

if (!glove.loaded) {
    console.error('GloVe base not loaded — build embeddings/glove50.* first.');
    process.exit(1);
}

function tokenize(s) {
    return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((t) => t.length > 2);
}

// Levenshtein distance, capped — used to spot spelling-neighbour noise.
function editDistance(a, b) {
    const m = a.length, n = b.length;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
        const cur = [i];
        for (let j = 1; j <= n; j++) {
            cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        }
        prev = cur;
    }
    return prev[n];
}

// Datamuse returns spelling-neighbours for unknown proper nouns (fonsi→fonda,
// puth→pugh). A true meaning-neighbour is not a near-spelling of the query.
function spellingNoise(term, word) {
    if (term.slice(0, 3) === word.slice(0, 3)) return true;
    return editDistance(term, word) <= 2;
}

// ── gather OOV terms from local corpus ───────────────────────────────
const docs = [];
for (const f of fs.readdirSync(HERE)) {
    const full = path.join(HERE, f);
    if (f.endsWith('.goldenpack') || f === 'turboquant_registry.json') {
        try {
            const reg = JSON.parse(fs.readFileSync(full, 'utf8'));
            for (const c of Object.values(reg)) if (c?.originalText) docs.push(c.originalText);
        } catch { /* ignore */ }
    } else if (f.endsWith('.nichepack')) {
        try {
            const packs = JSON.parse(fs.readFileSync(full, 'utf8'));
            for (const n of Object.values(packs)) for (const pw of (n?.power_words || [])) docs.push(pw);
        } catch { /* ignore */ }
    }
}

const oov = new Set();
for (const d of docs) {
    for (const t of tokenize(d)) {
        if (!STOP.has(t) && !glove.wordVector(t)) oov.add(t);
    }
}

// resume from cache
let cache = {};
if (fs.existsSync(CACHE)) {
    try { cache = JSON.parse(fs.readFileSync(CACHE, 'utf8')); } catch { /* ignore */ }
}

const adapter = createDatamuseAdapter();
const terms = [...oov].filter((t) => !(t in cache));
console.log(`OOV terms: ${oov.size} total · ${terms.length} to query · ${oov.size - terms.length} cached`);

// mean pairwise cosine of the relation words' GloVe vectors
function coherence(words) {
    const vecs = words.map((w) => glove.wordVector(w)).filter(Boolean);
    if (vecs.length < 2) return 0;
    let sum = 0, n = 0;
    for (let i = 0; i < vecs.length; i++) {
        for (let j = i + 1; j < vecs.length; j++) { sum += glove.cosine(vecs[i], vecs[j]); n++; }
    }
    return n ? sum / n : 0;
}

let kept = 0, rejected = 0, empty = 0, done = 0;

async function enrich(term) {
    let words = [];
    try {
        words = await adapter.meansLike(term);
        if (words.length === 0) words = await adapter.synonyms(term);
    } catch { /* ignore */ }

    const inVocab = [...new Set(words.map((w) => w.toLowerCase()))]
        .filter((w) => w.length > 2 && !STOP.has(w) && glove.wordVector(w) && !spellingNoise(term, w))
        .slice(0, MAX_KEEP);

    if (inVocab.length < MIN_RELATIONS) {
        cache[term] = [];                       // remembered as "nothing usable"
        empty++;
    } else if (coherence(inVocab) < COHERENCE_MIN) {
        cache[term] = [];                       // incoherent → likely proper-noun noise
        rejected++;
    } else {
        cache[term] = inVocab;
        kept++;
    }

    if (++done % 25 === 0) {
        console.log(`  ${done}/${terms.length}  (read ${kept} · rejected ${rejected} · empty ${empty})`);
        fs.writeFileSync(CACHE, JSON.stringify(cache));
    }
}

let i = 0;
async function worker() { while (i < terms.length) await enrich(terms[i++]); }
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
fs.writeFileSync(CACHE, JSON.stringify(cache));

console.log(`\nDone. read ${kept} · rejected-as-noise ${rejected} · no-relations ${empty}`);
console.log(`Cache: ${CACHE}`);
