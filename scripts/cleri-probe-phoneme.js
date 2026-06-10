#!/usr/bin/env node
/**
 * CLERI PROBE — Phoneme Prion Edition
 * 
 * Uses the actual lab equipment: PhonemeEngine (G2P Jury) + PHONOLOGICAL_FEATURES_V1 + TurboQuant
 * Scans for misfolded phoneme proteins (prions) in the codebase.
 * 
 * Usage:
 *   node scripts/cleri-probe-phoneme.js --mode=prion
 *   node scripts/cleri-probe-phoneme.js --mode=prion --min-resonance=0.75
 *   node scripts/cleri-probe-phoneme.js "your buggy code snippet"
 */

import fs from 'node:fs';
import path from 'node:path';
import { 
  scanSubstrateForPrions, 
  codeToPhonemeSignature,
  initializePrionLibrary,
  PRION_SIGNATURES 
} from '../codex/core/immunity/phoneme-prion.engine.js';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.codex', 'Archive', 'ARCHIVE REFERENCE DOCS', 'vst']);

async function walk(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const res = path.join(dir, entry.name);
    const relPath = path.relative(process.cwd(), res);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) await walk(res, files);
    } else if (/\.(js|jsx|ts|tsx|json|md)$/.test(entry.name)) {
      files.push({
        path: relPath,
        content: fs.readFileSync(res, 'utf8')
      });
    }
  }
  return files;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    mode: 'prion',
    hypothesis: '',
    minResonance: 0.7,
    limit: 20,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--mode=')) {
      result.mode = arg.split('=')[1] || 'prion';
    } else if (arg.startsWith('--min-resonance=')) {
      result.minResonance = parseFloat(arg.split('=')[1]) || 0.7;
    } else if (arg.startsWith('--limit=')) {
      result.limit = parseInt(arg.split('=')[1], 10) || 20;
    } else if (arg === '--mode' || arg === '-m') {
      result.mode = args[++i] || 'prion';
    } else if (arg === '--min-resonance' || arg === '-r') {
      result.minResonance = parseFloat(args[++i]) || 0.7;
    } else if (arg === '--limit' || arg === '-l') {
      result.limit = parseInt(args[++i], 10) || 20;
    } else if (!arg.startsWith('-')) {
      result.hypothesis += (result.hypothesis ? ' ' : '') + arg;
    }
  }

  return result;
}

async function runHypothesisMode(hypothesis, minResonance, limit) {
  console.log('[probe] vectorizing hypothesis through phoneme engine...');
  const signature = await codeToPhonemeSignature(hypothesis);
  console.log(`[probe] signature: ${signature.data?.length || 0} bytes, norm: ${signature.norm?.toFixed(4) || 0}`);
  
  console.log('[probe] walking substrate...');
  const substrate = await walk(process.cwd());
  console.log(`[probe] substrate: ${substrate.length} files`);
  
  console.log('[probe] scanning for resonance...');
  const library = await initializePrionLibrary();
  
  const allHits = [];
  for (const file of substrate) {
    if (!file.content || file.content.length < 50) continue;
    const fileSig = await codeToPhonemeSignature(file.content);
    if (!fileSig.data || fileSig.data.length === 0) continue;
    
    const resonance = estimateInnerProduct(fileSig.data, signature.data, fileSig.norm, signature.norm);
    const normalized = Math.max(0, Math.min(1, (resonance + 1) / 2));
    
    if (normalized >= minResonance) {
      allHits.push({ path: file.path, resonance: normalized });
    }
  }
  
  allHits.sort((a, b) => b.resonance - a.resonance);
  
  console.log('\n[probe] PHONEME HEATMAP');
  console.log('=====================');
  
  if (allHits.length === 0) {
    console.log('Zero resonance detected.');
  } else {
    allHits.slice(0, limit).forEach(hit => {
      const bar = '█'.repeat(Math.floor(hit.resonance * 20));
      const percentage = (hit.resonance * 100).toFixed(1);
      console.log(`${percentage.padStart(5)}% ${bar.padEnd(20)} ${hit.path}`);
    });
  }
  
  return allHits;
}

async function runPrionMode(minResonance, limit) {
  console.log('[probe] PHONEME PRION SCAN — loading prion library...');
  console.log(`[probe] ${Object.keys(PRION_SIGNATURES).length} prion archetypes loaded.`);
  
  console.log('[probe] walking substrate...');
  const substrate = await walk(process.cwd());
  console.log(`[probe] substrate: ${substrate.length} files`);
  
  const allHits = await scanSubstrateForPrions(substrate, minResonance);
  
  console.log('\n[probe] PRION HEATMAP — "Misfolded phoneme proteins lighting up..."');
  console.log('=====================================================================');
  
  if (allHits.length === 0) {
    console.log('Zero prion resonance detected. The substrate is clean.');
  } else {
    // Group by prion
    const byPrion = {};
    for (const hit of allHits) {
      if (!byPrion[hit.prion]) byPrion[hit.prion] = [];
      byPrion[hit.prion].push(hit);
    }
    
    for (const [prionName, hits] of Object.entries(byPrion)) {
      const topHit = hits[0];
      const bar = '█'.repeat(Math.floor(topHit.resonance * 20));
      const percentage = (topHit.resonance * 100).toFixed(1);
      console.log(`\n  ${prionName} (${hits.length} files)`);
      console.log(`  ${percentage.padStart(5)}% ${bar.padEnd(20)} ${topHit.path}`);
      console.log(`  → ${topHit.description}`);
      
      hits.slice(1, 3).forEach(h => {
        const b = '█'.repeat(Math.floor(h.resonance * 20));
        const p = (h.resonance * 100).toFixed(1);
        console.log(`  ${p.padStart(5)}% ${b.padEnd(20)} ${h.path}`);
      });
      if (hits.length > 3) {
        console.log(`  ... and ${hits.length - 3} more files for this prion`);
      }
    }
    
    console.log('\n[probe] TOP PRION HITS (all archetypes)');
    console.log('--------------------------------------------------');
    allHits.slice(0, limit).forEach(hit => {
      const bar = '█'.repeat(Math.floor(hit.resonance * 20));
      const percentage = (hit.resonance * 100).toFixed(1);
      console.log(`${percentage.padStart(5)}% ${bar.padEnd(20)} [${hit.prion}] ${hit.path}`);
    });
  }
  
  if (allHits.length > limit) {
    console.log(`\n... and ${allHits.length - limit} more total hits.`);
  }
  
  return allHits;
}

// Need to import estimateInnerProduct
import { estimateInnerProduct } from '../codex/core/quantization/turboquant.js';

async function main() {
  const args = parseArgs();
  
  console.log('[probe] CLERI PROBE — Phoneme Prion Edition');
  console.log('[probe] Lab: PhonemeEngine(G2P Jury) + PHONOLOGICAL_FEATURES_V1 + TurboQuant');
  console.log('');
  
  let heatmap;
  if (args.mode === 'prion') {
    heatmap = await runPrionMode(args.minResonance, args.limit);
  } else {
    heatmap = await runHypothesisMode(args.hypothesis, args.minResonance, args.limit);
  }
  
  console.log('\n[probe] ritual complete.');
  return heatmap;
}

main().catch(console.error);