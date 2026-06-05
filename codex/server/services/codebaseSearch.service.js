/**
 * codex/server/services/codebaseSearch.service.js
 * 
 * Vector-accelerated codebase search engine.
 * Uses TurboQuant for "INSTANT" similarity search without large context.
 */

import { execSync } from 'node:child_process';
import { createRequire } from 'module';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { collabPersistence } from '../collab/collab.persistence.js';
import { runVectorAmp, compareSignatures } from '../../core/semantic/amp/runVectorAmp.js';

const require = createRequire(import.meta.url);
const { CMUDict } = require('cmudict');
const dict = new CMUDict();

const SEARCH_LIMIT = 10;
const PROBE_MIN_RESONANCE = 0.18; // resonance floor for the hypothesis probe

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.cache', 'coverage']);

function* walkFiles(dir, rootDir = dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkFiles(fullPath, rootDir);
    } else {
      yield fullPath;
    }
  }
}

function matchLine(line, query, isRegex, caseSensitive) {
  if (isRegex) {
    try {
      const flags = caseSensitive ? '' : 'i';
      return new RegExp(query, flags).test(line);
    } catch {
      return false;
    }
  }
  if (caseSensitive) return line.includes(query);
  return line.toLowerCase().includes(query.toLowerCase());
}

function matchPattern(filePath, pattern) {
  if (!pattern) return true;
  const parts = pattern.split('/');
  return parts.every(p => filePath.includes(p));
}

function forensicFallback(query, options = {}) {
  const {
    isRegex = false,
    caseSensitive = false,
    includePattern = '',
    excludePattern = '',
    limit = 20
  } = options;

  const results = [];
  const root = resolve('.');
  const projectRoot = resolve(root);

  for (const filePath of walkFiles(projectRoot)) {
    if (includePattern && !matchPattern(filePath, includePattern)) continue;
    if (excludePattern && matchPattern(filePath, excludePattern)) continue;

    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (matchLine(lines[i], query, isRegex, caseSensitive)) {
          results.push({
            file_path: relative(projectRoot, filePath),
            line_number: i + 1,
            preview: lines[i].trim()
          });
          if (results.length >= limit) break;
        }
      }
    } catch {
      // skip binary/unreadable
    }
    if (results.length >= limit) break;
  }

  return results;
}

/**
 * Perform a deep, literal string or regex search using ripgrep.
 * Law 17 Exception: Allowed for low-level diagnostics and precise forensic audits.
 */
export async function forensicSearch(query, options = {}) {
  const start = performance.now();
  const { 
    isRegex = false, 
    caseSensitive = false,
    includePattern = '',
    excludePattern = '',
    limit = 20
  } = options;

  try {
    let command = `rg --json --max-count ${limit}`;
    if (!caseSensitive) command += ' -i';
    if (!isRegex) command += ' -F';
    if (includePattern) command += ` -g "${includePattern}"`;
    if (excludePattern) command += ` -g "!${excludePattern}"`;
    
    const escapedQuery = query.replace(/"/g, '\\"');
    command += ` "${escapedQuery}" .`;

    const output = execSync(command, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    const lines = output.split('\n').filter(Boolean);
    
    const results = lines.map(line => {
      const parsed = JSON.parse(line);
      if (parsed.type !== 'match') return null;
      
      const data = parsed.data;
      return {
        file_path: data.path.text,
        line_number: data.line_number,
        preview: data.lines.text.trim(),
        submatches: data.submatches
      };
    }).filter(Boolean);

    return {
      query,
      results,
      metadata: {
        duration_ms: performance.now() - start,
        engine: 'ripgrep-forensic',
        options
      }
    };
  } catch (error) {
    // rg returns 1 if no matches found
    if (error.status === 1) {
      return {
        query,
        results: [],
        metadata: {
          duration_ms: performance.now() - start,
          engine: 'ripgrep-forensic',
          options
        }
      };
    }
    // rg not available — use Node.js fallback
    const results = forensicFallback(query, options);
    return {
      query,
      results,
      metadata: {
        duration_ms: performance.now() - start,
        engine: 'node-fallback',
        options
      }
    };
  }
}

/**
 * Perform an instant semantic search over the indexed codebase.
 * Query and index share one lens/seed via the Vector AMP.
 */
export async function searchCodebase(query) {
    const start = performance.now();

    // 1. Vectorize + grade the query through the AMP.
    const amp = runVectorAmp(query);

    // 2. Load all embeddings from persistence.
    const index = await collabPersistence.codebase.getAll();

    // 3. Compare similarity in the shared signature space.
    const results = scoreEmbeddings(index, amp.signature);

    // 4. Sort and return top candidates.
    const topResults = results
        .sort((a, b) => b.score - a.score)
        .slice(0, SEARCH_LIMIT);

    const duration = performance.now() - start;

    return {
        query,
        results: topResults,
        metadata: {
            duration_ms: duration,
            index_size: index.length,
            engine: 'VectorAMP-code-aware-v1',
            fidelity: amp.fidelity,            // the eye's trust grade for this query
            fidelity_bytecode: amp.health?.bytecode || null
        }
    };
}

function scoreEmbeddings(index, querySignature) {
    return index.map(entry => ({
        file_path: entry.file_path,
        chunk_index: entry.chunk_index,
        preview: entry.content_preview,
        score: compareSignatures(querySignature, { data: new Uint8Array(entry.vector_tq) })
    }));
}

/**
 * Proactive antigen probe over the SHARED INDEX (no full re-scan).
 * Vectorizes a bug hypothesis through the AMP and scores it against every
 * indexed chunk — the fast, index-backed replacement for protein-probe's
 * live substrate walk.
 */
export async function probeSubstrate(hypothesis, options = {}) {
    const start = performance.now();
    const minResonance = options.minResonance ?? PROBE_MIN_RESONANCE;

    const amp = runVectorAmp(hypothesis);
    const index = await collabPersistence.codebase.getAll();

    // Best-resonating chunk per file (the genetic heatmap).
    const byFile = new Map();
    for (const entry of index) {
        const resonance = compareSignatures(amp.signature, { data: new Uint8Array(entry.vector_tq) });
        const current = byFile.get(entry.file_path);
        if (!current || resonance > current.resonance) {
            byFile.set(entry.file_path, {
                file_path: entry.file_path,
                chunk_index: entry.chunk_index,
                preview: entry.content_preview,
                resonance
            });
        }
    }

    const heatmap = [...byFile.values()]
        .filter(h => h.resonance >= minResonance)
        .sort((a, b) => b.resonance - a.resonance);

    return {
        hypothesis,
        heatmap,
        metadata: {
            duration_ms: performance.now() - start,
            index_size: index.length,
            fidelity: amp.fidelity,
            fidelity_bytecode: amp.health?.bytecode || null
        }
    };
}

/**
 * Returns a list of all files that have been indexed.
 */
export async function listIndexedFiles() {
    return await collabPersistence.codebase.getAllPaths();
}

/**
 * Find semantic and phonetic neighbors for a specific file.
 */
export async function getFileNeighbors(filePath) {
    const start = performance.now();
    
    // 1. Get embeddings for this file
    const fileEmbeddings = await collabPersistence.codebase.getByPath(filePath);
    if (fileEmbeddings.length === 0) {
        return { error: 'File not indexed', filePath };
    }

    // 2. Get all other embeddings
    const allEmbeddings = await collabPersistence.codebase.getAll();
    const otherEmbeddings = allEmbeddings.filter(e => e.file_path !== filePath);

    // 3. For each chunk of our file, find best neighbors in others
    const representative = fileEmbeddings[0];
    const querySignature = { data: new Uint8Array(representative.vector_tq) };

    const semanticResults = scoreEmbeddings(otherEmbeddings, querySignature)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

    // 4. Phonetic Neighbors
    const fileName = filePath.split('/').pop().replace(/\..*$/, '');
    const phoneticResults = await findPhoneticMatches(fileName);

    // 5. Linked Docs
    const linkedDocs = await findLinkedDocs(filePath);

    return {
        filePath,
        semantic: semanticResults,
        phonetic: phoneticResults.slice(0, 5),
        linkedDocs,
        metadata: {
            duration_ms: performance.now() - start
        }
    };
}

/**
 * Hybrid search combining Literal, Semantic, and Phonetic.
 */
export async function searchHybrid(query) {
    const start = performance.now();

    const [literal, semantic, phonetic] = await Promise.all([
        forensicSearch(query, { limit: 10 }),
        searchCodebase(query),
        findPhoneticMatches(query)
    ]);

    const linkedDocs = await findLinkedDocs(query);

    return {
        query,
        literal: literal.results,
        semantic: semantic.results,
        phonetic: phonetic.slice(0, 10),
        linkedDocs,
        metadata: {
            duration_ms: performance.now() - start
        }
    };
}

async function findPhoneticMatches(query) {
    const queryPhonemes = dict.get(query.toLowerCase());
    if (!queryPhonemes) return [];

    const allPaths = await collabPersistence.codebase.getAllPaths();
    const matches = [];

    for (const path of allPaths) {
        const name = path.split('/').pop().replace(/\..*$/, '').toLowerCase();
        const namePhonemes = dict.get(name);
        if (namePhonemes) {
            const querySet = new Set(queryPhonemes.split(' '));
            const nameSet = new Set(namePhonemes.split(' '));
            let overlap = 0;
            for (const p of querySet) {
                if (nameSet.has(p)) overlap++;
            }
            if (overlap > 0) {
                matches.push({ file_path: path, score: overlap / Math.max(querySet.size, nameSet.size) });
            }
        }
    }

    return matches.sort((a, b) => b.score - a.score);
}

async function findLinkedDocs(context) {
    // Search for PDRs, Verdicts, etc. in docs/ that match the context string
    try {
        const docs = await forensicSearch(context, { includePattern: 'docs/**', limit: 5 });
        return docs.results.map(r => ({
            file_path: r.file_path,
            title: r.file_path.split('/').pop(),
            preview: r.preview
        }));
    } catch (e) {
        return [];
    }
}