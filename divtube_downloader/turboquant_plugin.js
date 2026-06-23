import * as readline from 'readline';
import { quantizeVectorJS, similarity } from '../codex/core/quantization/turboquant.js';
import * as glove from './embeddings.js';
import * as turbovec from './turbovec.js';

const HASH_DIMS = 512;

// Active embedder, best first: bespoke domain-adapted Turbovec → generic GloVe
// → lexical hashing fallback. Vectors from different embedders are NOT
// comparable, so every curve records which one produced it (see resolveCurve).
const EMB = turbovec.loaded ? turbovec : glove;
const ACTIVE_EMBEDDER = EMB.loaded ? EMB.EMBEDDER_ID : 'hash512';
const DIMENSIONS = EMB.loaded ? EMB.DIMENSIONS : HASH_DIMS;

/**
 * Hashing-trick vectorizer (lexical fallback). Bag-of-words → ±1 in HASH_DIMS.
 */
function vectorizeHash(text) {
    const vec = new Float32Array(HASH_DIMS);
    const words = text.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/);
    for (const word of words) {
        if (!word) continue;
        let hash = 0;
        for (let j = 0; j < word.length; j++) {
            hash = ((hash << 5) - hash) + word.charCodeAt(j);
            hash = hash & hash;
        }
        const index = Math.abs(hash) % HASH_DIMS;
        vec[index] += (hash > 0) ? 1 : -1;
    }
    return vec;
}

/** Deterministic, zero-GPU text → semantic vector via the active embedder. */
function vectorizeText(text) {
    return EMB.loaded ? EMB.vectorize(text) : vectorizeHash(text);
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

import fs from 'fs';

const REGISTRY_FILE = 'turboquant_registry.json';
let registry = {};

if (fs.existsSync(REGISTRY_FILE)) {
    try {
        registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
    } catch (e) {
        process.stderr.write(`Failed to load registry: ${e.message}\\n`);
    }
}

// Atomic write: serialize to a temp file then rename, so a crash or power loss
// (important on a handheld) never leaves a half-written registry behind.
function saveRegistry() {
    const tmp = `${REGISTRY_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(registry));
    fs.renameSync(tmp, REGISTRY_FILE);
}

// ── Score calibration ────────────────────────────────────────────────
// Raw cosine on short text clusters in a narrow positive band, so the naive
// (cos+1)/2 mapping reads "85%" for almost everything. Instead we calibrate
// against the registry's OWN pairwise-similarity distribution: a match is
// scored by how many standard deviations more similar it is than a typical
// random pairing. 50% == average pair; ~100% == far above the corpus norm.
// Self-adjusts per embedder, no magic constants. Cached; invalidated on writes.
const CALIB_MIN_CURVES = 8;   // below this, distribution is too thin to trust
const CALIB_SAMPLE = 200;     // cap pairwise cost on large registries
let _calib = null;

function invalidateCalibration() { _calib = null; }

function getCalibration() {
    if (_calib) return _calib;
    let names = Object.keys(registry);
    if (names.length > CALIB_SAMPLE) {
        // deterministic-enough sample: every k-th name
        const step = Math.ceil(names.length / CALIB_SAMPLE);
        names = names.filter((_, i) => i % step === 0).slice(0, CALIB_SAMPLE);
    }
    const bytes = [];
    for (const n of names) {
        const r = resolveCurve(n);
        if (!r.error) bytes.push(r.bytes);
    }
    if (bytes.length < CALIB_MIN_CURVES) {
        _calib = { ready: false };
        return _calib;
    }
    let sum = 0, sum2 = 0, cnt = 0;
    for (let i = 0; i < bytes.length; i++) {
        for (let j = i + 1; j < bytes.length; j++) {
            const c = similarity(bytes[i], bytes[j], 1, 1);
            sum += c; sum2 += c * c; cnt += 1;
        }
    }
    const mu = sum / cnt;
    const sigma = Math.sqrt(Math.max(1e-6, sum2 / cnt - mu * mu));
    _calib = { ready: true, mu, sigma, curves: bytes.length, pairs: cnt };
    return _calib;
}

/** Map a raw cosine to a calibrated 0-100 score. */
function scorePercent(cos) {
    const c = getCalibration();
    if (!c.ready) return Math.max(0, Math.round(((cos + 1) / 2) * 100)); // fallback
    const z = (cos - c.mu) / c.sigma;
    return Math.round(100 / (1 + Math.exp(-1.702 * z)));  // logistic ≈ normal CDF
}

/**
 * Return a curve's bytes in the ACTIVE embedder space, re-indexing it on the
 * fly from its saved originalText if it was stored under an older embedder
 * (e.g. legacy hash512 curves after the embedding upgrade). Returns
 * { bytes } on success or { error } if it can't be resolved.
 */
function resolveCurve(name) {
    const c = registry[name];
    if (!c || !c.data) return { error: `Curve ${name} not found` };

    const curveEmbedder = c.embedder || 'hash512';
    if (curveEmbedder === ACTIVE_EMBEDDER && c.dims === DIMENSIONS) {
        return { bytes: new Uint8Array(c.data) };
    }
    if (!c.originalText) {
        return { error: `Curve ${name} was built with embedder '${curveEmbedder}' and has no original text to re-index — re-register it.` };
    }
    // Auto-migrate: re-vectorize under the active embedder and persist.
    const { data, norm } = quantizeVectorJS(vectorizeText(c.originalText));
    c.data = Array.from(data);
    c.norm = norm;
    c.embedder = ACTIVE_EMBEDDER;
    c.dims = DIMENSIONS;
    saveRegistry();
    return { bytes: new Uint8Array(c.data), migrated: true };
}

rl.on('line', (line) => {
    if (!line.trim()) return;
    
    try {
        const req = JSON.parse(line);
        const action = req.action;
        const startTime = process.hrtime.bigint();
        
        if (action === 'ping' || action === 'health') {
            sendResponse(req.id, {
                status: 'ok',
                message: 'TurboQuant IPC Ready',
                curves: Object.keys(registry).length,
                dims: DIMENSIONS,
                embedder: ACTIVE_EMBEDDER,
                semantic: EMB.loaded
            }, startTime);
        }
        else if (action === 'list') {
            sendResponse(req.id, { status: 'ok', curves: Object.keys(registry) }, startTime);
        }
        else if (action === 'delete') {
            if (registry[req.name]) {
                delete registry[req.name];
                saveRegistry();
                invalidateCalibration();
                sendResponse(req.id, { status: 'ok', message: `Deleted golden curve: ${req.name}` }, startTime);
            } else {
                sendResponse(req.id, { status: 'error', error: `Curve ${req.name} not found` }, startTime);
            }
        }
        else if (action === 'search') {
            // k-NN over the full registry: vectorize the query once, then score
            // it against every stored curve and return the top-k by similarity.
            const { data } = quantizeVectorJS(vectorizeText(req.text));
            const b1 = new Uint8Array(data);

            const results = [];
            for (const name of Object.keys(registry)) {
                const resolved = resolveCurve(name);
                if (resolved.error) continue;
                const cosineSim = similarity(b1, resolved.bytes, 1, 1);
                results.push({
                    name,
                    score: cosineSim,
                    match_percentage: scorePercent(cosineSim)
                });
            }
            results.sort((a, b) => b.score - a.score);

            const k = Math.max(1, req.k || 5);
            sendResponse(req.id, { status: 'ok', results: results.slice(0, k), searched: results.length }, startTime);
        }
        else if (action === 'register') {
            // vectorize -> quantize -> store (tagged with the active embedder)
            const floatVec = vectorizeText(req.text);
            const { data, norm } = quantizeVectorJS(floatVec);

            registry[req.name] = {
                data: Array.from(data),
                norm: norm,
                originalText: req.text,
                embedder: ACTIVE_EMBEDDER,
                dims: DIMENSIONS
            };
            saveRegistry();
            invalidateCalibration();

            sendResponse(req.id, {
                status: 'ok',
                message: `Registered golden curve: ${req.name}`,
                dims: floatVec.length,
                embedder: ACTIVE_EMBEDDER,
                packed_bytes: data.length
            }, startTime);
        }
        else if (action === 'score') {
            const resolved = resolveCurve(req.curve);
            if (resolved.error) {
                sendResponse(req.id, { status: 'error', error: resolved.error }, startTime);
                return;
            }
            const { data } = quantizeVectorJS(vectorizeText(req.text));
            const b1 = new Uint8Array(data);

            // norms 1,1 → raw cosine similarity bounded [-1, 1]
            const cosineSim = similarity(b1, resolved.bytes, 1, 1);
            sendResponse(req.id, {
                status: 'ok',
                score: cosineSim,
                match_percentage: scorePercent(cosineSim)
            }, startTime);
        }
        else if (action === 'analyze-gaps') {
            const target = registry[req.curve];
            if (!target) {
                sendResponse(req.id, { status: 'error', error: `Curve ${req.curve} not found` }, startTime);
                return;
            }
            if (!target.originalText) {
                sendResponse(req.id, { status: 'error', error: `Curve ${req.curve} does not have original text saved.` }, startTime);
                return;
            }

            const STOPWORDS = new Set(['the', 'a', 'to', 'of', 'and', 'in', 'is', 'it',
                'for', 'on', 'with', 'my', 'i', 'only', 'you', 'your', 'this', 'that', 'how']);
            const clean = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/)
                .filter((w) => w.length > 2 && !STOPWORDS.has(w));

            const targetWords = [...new Set(clean(target.originalText))];
            const userWords = clean(req.text);

            let gaps;
            if (EMB.loaded) {
                // Semantic gap: a target concept is "missing" only if NO user
                // token sits near it in embedding space — so "fastest run"
                // covers "speedrun" and won't be falsely flagged.
                const userVecs = userWords.map((w) => EMB.wordVector(w)).filter(Boolean);
                const SIM_THRESHOLD = 0.5;
                const scored = [];
                for (const w of targetWords) {
                    const wv = EMB.wordVector(w);
                    if (!wv) {
                        if (!userWords.includes(w)) scored.push([w, -1]); // OOV → literal check
                        continue;
                    }
                    let best = -1;
                    for (const uv of userVecs) {
                        const s = EMB.cosine(wv, uv);
                        if (s > best) best = s;
                    }
                    if (best < SIM_THRESHOLD) scored.push([w, best]);
                }
                scored.sort((a, b) => a[1] - b[1]); // most-missing first
                gaps = scored.map((x) => x[0]);
            } else {
                // Lexical fallback: content words literally absent from user text.
                const userSet = new Set(userWords);
                gaps = targetWords.filter((w) => !userSet.has(w));
            }

            sendResponse(req.id, {
                status: 'ok',
                missing_clusters: gaps.slice(0, 8),
                semantic: EMB.loaded
            }, startTime);
        }
        else if (action === 'export-pack') {
            try {
                const packData = JSON.stringify(registry);
                fs.writeFileSync(req.filename, packData);
                sendResponse(req.id, { status: 'ok', size: Object.keys(registry).length }, startTime);
            } catch (e) {
                sendResponse(req.id, { status: 'error', error: e.message }, startTime);
            }
        }
        else if (action === 'import-pack') {
            try {
                if (fs.existsSync(req.filename)) {
                    const packData = JSON.parse(fs.readFileSync(req.filename, 'utf8'));
                    let imported = 0;
                    for (const [key, value] of Object.entries(packData)) {
                        registry[key] = value;
                        imported++;
                    }
                    saveRegistry();
                    invalidateCalibration();
                    sendResponse(req.id, { status: 'ok', imported: imported }, startTime);
                } else {
                    sendResponse(req.id, { status: 'error', error: 'File not found' }, startTime);
                }
            } catch (e) {
                sendResponse(req.id, { status: 'error', error: e.message }, startTime);
            }
        }
        else {
            sendResponse(req.id, { status: 'error', error: 'Unknown action' }, startTime);
        }
    } catch (e) {
        process.stdout.write(JSON.stringify({ error: e.message }) + '\n');
    }
});

function sendResponse(id, payload, startTime) {
    const endTime = process.hrtime.bigint();
    const latencyMs = Number(endTime - startTime) / 1e6;
    payload.id = id;
    payload.latency_ms = latencyMs;
    process.stdout.write(JSON.stringify(payload) + '\n');
}

// Log startup (to stderr so it doesn't pollute stdout IPC)
process.stderr.write('TurboQuant Plugin Engine Started.\n');
