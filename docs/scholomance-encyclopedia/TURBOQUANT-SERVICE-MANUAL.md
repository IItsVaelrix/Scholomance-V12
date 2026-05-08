# TurboQuant Service Manual

## Bytecode Search Code
`SCHOL-ENC-BYKE-SEARCH-TURBOQUANT-MANUAL`

## Overview

TurboQuant is Scholomance's vector quantization service that provides semantic search capabilities while adhering to the **Sovereign Editor** and **Zero-Cost Infrastructure** mandates. It compresses dense vector embeddings by ~6x (down to 2.5-bit precision) with near-zero recall loss, enabling high-density reranking within a 64MB heap limit.

> **Note:** This manual covers the TurboQuant service as implemented in V12. The system currently uses a deterministic phonosemantic mock-vector generator. Transitioning to real semantic embeddings (GTE-Small) is designated as Phase 5 work.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [API Reference](#api-reference)
4. [Configuration](#configuration)
5. [Integration Patterns](#integration-patterns)
6. [Verification & QA](#verification--qa)
7. [Bytecode Error Reference](#bytecode-error-reference)
8. [Performance Benchmarks](#performance-benchmarks)

---

## Quick Start

### Initialization

```javascript
import { initializeTurboQuant, quantizeVector, similarity, isWasmActive } from '../lib/math/quantization/index.js';

// Initialize once at application startup
await initializeTurboQuant();

console.log('TurboQuant Mode:', isWasmActive() ? 'WASM' : 'JavaScript (Fallback)');
```

### Basic Usage

```javascript
// Query vector (must be power of 2 dimension for WASM)
const queryVector = new Float32Array(256);
// ... populate with semantic coordinates

// Corpus vectors (pre-quantized, stored in SQLite as BLOBs)
const corpusVector = loadCorpusVector(entryId);

// Compress vectors
const compressedQuery = await quantizeVector(queryVector);
const compressedCorpus = await quantizeVector(corpusVector);

// Estimate similarity
const score = similarity(compressedQuery, compressedCorpus);
```

---

## Architecture Overview

### Two-Pass Reranking Model

```
[ RitualPredictionEngine ]
        │
        ├──> [ Pass 1: Graph Traversal ] ──> [ Candidate Frontier (Top 200) ]
        │                                             │
        └──> [ Pass 2: TurboQuant Bridge (WASM/JS) ] <───┘
                    │
                    ├──> [ Random Hadamard Transform (RHT) ]
                    ├──> [ Coordinate Quantization ]
                    └──> [ Inner Product Estimation ]
                                │
                                ▼
                    [ Final Suggestions (Top 5) ]
```

### Kernel Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| **WASM** | Compiled Rust kernel via WebAssembly | Production (when `wasm-pack` available) |
| **JavaScript** | Pure-JS high-fidelity fallback | Development, Steam Deck, low-end devices |

The system automatically detects WASM availability and falls back gracefully:

```javascript
// From: src/lib/math/quantization/index.js
export async function initializeTurboQuant() {
    try {
        const { default: init, ...wasm } = await import('./rust-kernel/pkg/turboquant_bridge.js');
        await init();
        wasmModule = wasm;
        useWasm = true;
    } catch (e) {
        // Falls back to JavaScript kernel automatically
        useWasm = false;
    }
}
```

---

## API Reference

### `initializeTurboQuant()`

**Signature:** `async initializeTurboQuant(): Promise<void>`

Initializes the TurboQuant engine. Loads WASM artifact if available; otherwise enables JS fallback.

**Returns:** `Promise<void>`

**Example:**
```javascript
await initializeTurboQuant();
// Console: "[TurboQuant] WASM Kernel initialized." OR
// Console: "[TurboQuant] WASM failed to load. Falling back to JavaScript kernel."
```

---

### `quantizeVector(vector, seed?)`

**Signature:** `async quantizeVector(vector: Float32Array, seed?: number): Promise<TQPayload>`

Compresses a floating-point vector to TurboQuant 2.5-bit format.

**Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| `vector` | `Float32Array` | — | Input vector (256, 512, or 1024 dimensions) |
| `seed` | `number` | `42` | Random seed for Hadamard rotation (ensures determinism) |

**Returns:** `TQPayload` containing compressed data and norm factor

**Example:**
```javascript
const vector = new Float32Array(512);
vector.fill(0.5);

const compressed = await quantizeVector(vector, 42);
// compressed = { data: Uint8Array([...]), norm: number }
```

---

### `similarity(p1, p2)`

**Signature:** `similarity(p1: TQPayload, p2: TQPayload): number`

Estimates inner product (cosine similarity proxy) between two compressed vectors.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `p1` | `TQPayload` | First compressed vector payload |
| `p2` | `TQPayload` | Second compressed vector payload |

**Returns:** Similarity score (higher = more similar)

**Example:**
```javascript
const score = similarity(compressedQuery, candidateVector);
// score range: approximately [-1, 1]
```

---

### `isWasmActive()`

**Signature:** `isWasmActive(): boolean`

Returns the current kernel mode.

**Returns:** `true` if WASM kernel is active, `false` if JavaScript fallback is active.

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_TURBOQUANT` | `true` | Toggle TurboQuant reranking on/off |

### Feature Flag in Prediction Engine

The two-pass reranking is controlled via the `ENABLE_TURBOQUANT` flag in `codex/core/ritual-prediction/run.js`:

```javascript
// Enabled by default for production
const enableTurboQuant = process.env.ENABLE_TURBOQUANT !== 'false';
```

### Memory Configuration

The WASM linear memory is fixed at allocation time (non-dynamic growth):

```javascript
// Fixed 32-page allocation (2MB) — per Sovereign Gate spec
const memory = new WebAssembly.Memory({ initial: 32, maximum: 32 });
```

---

## Integration Patterns

### Pattern 1: Direct Vector Service

```javascript
import { initializeTurboQuant, quantizeVector, similarity } from '../lib/math/quantization/index.js';

class TurboQuantService {
    constructor() {
        this.ready = false;
    }

    async init() {
        await initializeTurboQuant();
        this.ready = true;
    }

    async search(queryVector, corpusVectors, topK = 5) {
        if (!this.ready) throw new Error('TurboQuant not initialized');
        
        const compressedQuery = await quantizeVector(queryVector);
        const scored = corpusVectors.map(corpus => ({
            id: corpus.id,
            score: similarity(compressedQuery, corpus.payload)
        }));
        
        return scored
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    }
}
```

### Pattern 2: Reranker Integration (Two-Pass)

```javascript
// From: codex/core/ritual-prediction/run.js
import { rerankCandidates } from './reranker.js';
import { enforceTurboQAGates } from './turboqa.js';

function runRitualPrediction(context, dependencies, options) {
    // Pass 1: Graph traversal
    const graphRankedCandidates = judiciary.rankGraphCandidates(scoredCandidates);
    
    // Pass 2: Vector reranking
    if (options.enableTurboQuant) {
        const candidates = rerankCandidates(graphRankedCandidates, context, dependencies, options);
        enforceTurboQAGates(graphRankedCandidates, candidates, options.topK);
        return candidates;
    }
    
    return graphRankedCandidates.slice(0, options.topK);
}
```

### Pattern 3: SQLite Vector Lookup

```javascript
import Database from 'better-sqlite3';

const db = new Database('./data/scholomance_dict.sqlite');

function getCorpusVector(entryId) {
    const row = db.prepare(`
        SELECT embeddings_tq 
        FROM lexicon 
        WHERE id = ?
    `).get(entryId);
    
    if (!row || !row.embeddings_tq) return null;
    
    // BLOBs are stored as { data: Uint8Array, norm: number }
    return JSON.parse(row.embeddings_tq);
}
```

---

## Verification & QA

### TurboQA Validation Layer

The `turboqa.js` module enforces two hard gates:

1. **Vector Fidelity Gate:** Reject if overlap < 0.85 (85%)
2. **World-Law Legality Gate:** Reject if any candidate is marked illegal

```javascript
// From: codex/core/ritual-prediction/turboqa.js
export function enforceTurboQAGates(baseline, reranked, topK) {
    const baselineSet = new Set(baseline.slice(0, topK).map(c => c.id));
    const rerankedSet = new Set(reranked.slice(0, topK).map(c => c.id));
    
    const overlap = [...baselineSet].filter(id => rerankedSet.has(id)).length / topK;
    
    if (overlap < 0.85) {
        throw createBytecodeError('QUANT_PRECISION_LOSS', {
            overlapScore: overlap,
            threshold: 0.85
        });
    }
    
    const illegalCandidates = reranked.slice(0, topK).filter(c => c.isIllegal);
    if (illegalCandidates.length > 0) {
        throw createBytecodeError('LEGALITY_VIOLATION', {
            illegalCandidates
        });
    }
}
```

### Verification Scripts

#### Script 1: TurboQA Gate Verification

```bash
node scripts/verify_turboqa.js
```

**Expected Output:**
```
Valid Reranking (100% overlap): PASS
Minor Drift (80% overlap): PASS, expected PB-ERR-v1-VALUE-CRIT-QUANT-0105
Significant Precision Loss: PASS, expected PB-ERR-v1-VALUE-CRIT-QUANT-0105
Legality Violation: PASS, expected PB-ERR-v1-LINGUISTIC-CRIT-LINGUA-0C06
TurboQA Verification passed.
```

#### Script 2: Sovereign Memory Verification

```bash
node scripts/verify_turboquant_sovereign.js
```

**Expected Output:**
```
Engine Ready. Mode: JavaScript (Fallback)
Init Time: 1.40ms
300-word analysis simulation duration: 12.31ms
Throughput: 24372 words/sec
Memory Delta: 0.41 MB
PASS: Memory increase is under the 32MB Sovereign Gate.
```

---

## Bytecode Error Reference

| Code | Name | Description | Recovery |
|------|------|-------------|----------|
| `PB-ERR-v1-VALUE-CRIT-QUANT-0105` | `QUANT_PRECISION_LOSS` | Reranked top-K diverges >15% from baseline | Revert to graph-only ranking |
| `PB-ERR-v1-LINGUISTIC-CRIT-LINGUA-0C06` | `LEGALITY_VIOLATION` | Vector rerank promoted illegal candidate | Filter illegal candidates, retry |

---

## Performance Benchmarks

### Memory Usage (Steam Deck Class CPU)

| Metric | Value | Sovereign Gate |
|--------|-------|---------------|
| Heap Delta (300-word load) | 0.41 MB | 32 MB |
| Initialization Latency | 1.40 ms | — |
| Throughput | 24,372 words/sec | — |

### Compression Ratios

| Format | 50k Lexicon Memory | Compression |
|--------|--------------------|-------------|
| FP16 | ~400 MB | 1x |
| TurboQuant 2.5-bit | ~64 MB | 6.25x |

### Latency Targets

| Operation | Target | Measured |
|-----------|--------|----------|
| Reranking (200 candidates) | < 12 ms | ~10 ms |
| Full prediction loop (async) | < 20 ms | ~17 ms |

---

## Related Documents

- [TurboQuant Integration Bridge PDR](./PDR-archive/turboquant_integration_bridge_pdr.md)
- [TurboQuant Ascension PIR](../post-implementation-reports/PIR-2026-04-26-TURBOQUANT-ASCENSION.md)
- [TurboQuant Vector Bridge Architecture](../ARCH-2026-04-26-TURBOQUANT-VECTOR-BRIDGE.md)
- [TurboQuant White Paper](./TURBOQUANT_WHITE_PAPER.md)

---

*Document Version: 1.0 | Last Updated: 2026-05-08*
