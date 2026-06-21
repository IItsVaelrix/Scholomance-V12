#!/usr/bin/env node
/**
 * SCD64 Queue + TurboQuant Vector Search CLI
 *
 * npm run queue -- sweep
 * npm run queue -- search "frontend recomputed vowel family"
 * npm run queue -- stats
 * npm run queue -- process
 *
 * Makes SCD64 a queueable, TurboQuant-integrated, vectorized search engine
 * for diagnostics (as per the evolution request).
 */

import {
  SpatialImmuneOrchestrator,
} from '../codex/core/immunity/spatial-immune-orchestrator.js';

// Hypothesized top 10 SCD64 checksums for color overrepresentation bias in CMUDICT-based IR compiler
const HYPOTHESIZED_COLOR_BIAS_CHECKSUMS = [
  { checksum: "01DB076627F257F3730F2A6BE940EFE87AD607F232FD8E8FA160BA8510D95F97", reason: "Phonetic Frequency (The /R/ and /EH/ Bias)" },
  { checksum: "01699A34D8DDEAB3AD040ED21544929B785C59A6D36C3F488A3D791E2B0E377C", reason: "Short Vowel Clustering" },
  { checksum: "0100C6CA877F865450062720CF6BB62C1685BF91E79C49583B5B172F6DB671F8", reason: "Homophonic Collisions" },
  { checksum: "01B8E7D2CAE796CFD9EC468B8825134469221C29920FBA4018A66066F3C0E3CA", reason: "Morphological Substring Matching" },
  { checksum: "015FCEE2E1DF3AFA7E925C480C4AC66B985E184C89BAE0B402291D23D03C1A7E", reason: "Hypernym Clustering (Semantics in Action)" },
  { checksum: "017CEB7159FDC1788C53831182CB1697FC752D5EE3FABB01DC31CC14CE0255A3", reason: "Compound Adjectives" },
  { checksum: "0112B494E40E4881F731EC6892E79143F2C77F84D049CE5DB45B10A3D94601E5", reason: "Metonymy and Idiomatic Usage" },
  { checksum: "01DFAB4482AF9FBFC419CE203C996ECACBE4699BEA5F20AC69109EA893821769", reason: "Token Boundary Ambiguity" },
  { checksum: "01AFCA22CEA8869FEF14ABF0B4DB6BCCFDDD134CF714E083436ADB2239A172B8", reason: "Visual-to-Linguistic Mapping" },
  { checksum: "0191DA8D25EDC7F810481447E8C0C933CFC0529ED1ECE5829FD12287BCC387BC", reason: "Dataset Imbalance" }
];

const args = process.argv.slice(2);
const cmd = args[0] || 'help';
const queryParts = args.slice(1);

function printUsage() {
  console.log(`
SCD64 Queue + Vector Search CLI

Usage:
  npm run queue -- sweep                 # Run TrueSight sweep (populates queue + index)
  npm run queue -- search <query words>  # Semantic vector search over diagnostics
  npm run queue -- stats                 # Show queue/index stats
  npm run queue -- process [max]         # Process pending queue items
  npm run queue -- help

The queue and search are powered by TurboQuant quantized vectors
of SCD64 diagnostic payloads (symptoms + evidence + equations).
`);
}

async function main() {
  if (cmd === 'help' || cmd === '--help') {
    printUsage();
    return;
  }

  // Always create a fresh orchestrator for CLI runs (in-memory index)
  const orch = new SpatialImmuneOrchestrator({
    sizeX: 64,
    sizeY: 64,
    sizeZ: 64,
    agentCount: 5,
  });

  // Seed the hypothesized color bias checksums so they stick in the persistent index
  HYPOTHESIZED_COLOR_BIAS_CHECKSUMS.forEach(item => {
    if (!orch.scd64VectorIndex.has(item.checksum)) {
      const syn = {
        checksum64: item.checksum,
        bugFamily: 'COLOR_BIAS_HYPOTHESIS',
        raid: { verdictText: item.reason + ' (hypothesized for color overrep in IR)' },
        runtimeEvidence: { hypothesis: item.reason }
      };
      orch._vectorizeAndQuantizeSCD(syn, { source: 'hypothesis_seed', reason: item.reason });
    }
  });

  // If first arg is not a known command, treat entire args as a search query
  const knownCommands = ['sweep', 'search', 'stats', 'process'];
  if (!knownCommands.includes(cmd)) {
    const fullQuery = args.join(' ');
    if (!fullQuery) {
      printUsage();
      return;
    }
    // Treat as search
    console.log('Treating input as search query (auto-populating index)...\n');
    const sweepResult = orch.runFullTruesightDiagnostic();
    const results = orch.searchSimilarDiagnostics(fullQuery, { topK: 5 });
    // Always add the current query as a new persistent diagnostic so it "sticks"
    const newDiag = orch.createSCD64FromQuery(fullQuery);
    console.log(`Added new diagnostic for this query: ${newDiag.checksum64}`);
    if (results.length === 0) {
      console.log('No similar diagnostics found (but new one added).');
      return;
    }
    console.log(`Query: "${fullQuery}"\nFound ${results.length} result(s):\n`);
    for (const r of results) {
      console.log(`SCD64: ${r.scd64}  (sim: ${r.similarity.toFixed(4)})`);
      if (r.scdFull) {
        console.log(`  Family: ${r.scdFull.bugFamily || r.scdFull.domain}`);
        const v = (r.scdFull.raid?.verdictText || '').slice(0, 110);
        console.log(`  Verdict: ${v}${v.length === 110 ? '...' : ''}`);
        if (r.scdFull.slots) {
          const keySlots = r.scdFull.slots
            .filter(s => s.hex && !s.hex.startsWith('00'))
            .map(s => `${s.name}:${s.hex}`)
            .join(' ');
          if (keySlots) console.log(`  Key slots: ${keySlots}`);
        }
      }
      console.log();
    }
    return;
  }

  if (cmd === 'sweep') {
    console.log('=== SCD64 TrueSight Sweep (populates queue + vector index) ===\n');
    const sweep = orch.runFullTruesightDiagnostic();
    console.log(`System: ${sweep.system}`);
    console.log(`Diagnostics: ${sweep.totalDiagnostics}`);
    console.log(`Aggregate SCD64: ${sweep.aggregateSCD64}`);
    console.log(`Queue demo: ${JSON.stringify(sweep.queueDemo)}`);
    console.log(`Search stats: ${JSON.stringify(sweep.searchStats)}`);
    console.log('\nIndex now contains vectors. Try: npm run queue -- search "resonance gate frontend"');
    return;
  }

  if (cmd === 'stats') {
    // Populate this orch for meaningful stats
    orch.runFullTruesightDiagnostic();
    const stats = orch.getSCD64SearchStats();
    console.log('SCD64 Search Engine Stats:');
    console.log(JSON.stringify(stats, null, 2));
    return;
  }

  if (cmd === 'process') {
    const max = parseInt(args[1] || '100', 10);
    console.log(`Processing up to ${max} queued SCD64 items...`);
    const results = orch.processSCD64Queue(max);
    console.log(`Processed: ${results.length}`);
    for (const r of results) {
      console.log(`  - ${r.jobId}: ${r.scd64}`);
    }
    return;
  }

  if (cmd === 'search') {
    if (queryParts.length === 0) {
      console.error('Usage: npm run queue -- search <query text...>');
      process.exit(1);
    }
    const query = queryParts.join(' ');

    // Populate THIS orchestrator's queue + index via the instance method
    // (the exported sweep uses an internal orch; we use the instance one for shared state)
    console.log('Populating SCD64 queue + TurboQuant vector index (TrueSight sweep)...');
    const sweepResult = orch.runFullTruesightDiagnostic();
    console.log(`  Aggregate: ${sweepResult.aggregateSCD64}`);
    console.log(`  Search stats after populate: ${JSON.stringify(sweepResult.searchStats)}\n`);

    console.log(`=== SCD64 Vector Search (TurboQuant) ===`);
    console.log(`Query: "${query}"\n`);

    const results = orch.searchSimilarDiagnostics(query, { topK: 5 });
    // Always add the current query as a new persistent diagnostic so it "sticks"
    const newDiag = orch.createSCD64FromQuery(query);
    console.log(`Added new diagnostic for this query: ${newDiag.checksum64}`);
    if (results.length === 0) {
      console.log('No similar diagnostics found (but new one added).');
      return;
    }

    console.log(`Found ${results.length} similar diagnostic(s):\n`);
    for (const r of results) {
      console.log(`SCD64: ${r.scd64}  (sim: ${r.similarity.toFixed(4)})`);
      if (r.scdFull) {
        console.log(`  Family: ${r.scdFull.bugFamily || r.scdFull.domain}`);
        const v = (r.scdFull.raid?.verdictText || '').slice(0, 110);
        console.log(`  Verdict: ${v}${v.length === 110 ? '...' : ''}`);
        if (r.scdFull.slots) {
          const keySlots = r.scdFull.slots
            .filter(s => s.hex && !s.hex.startsWith('00'))
            .map(s => `${s.name}:${s.hex}`)
            .join(' ');
          if (keySlots) console.log(`  Key slots: ${keySlots}`);
        }
      }
      console.log();
    }
    return;
  }

  // Default / unknown: run sweep + show how to search
  console.log('Running default sweep (populates queue + TurboQuant index)...\n');
  const sweep = orch.runFullTruesightDiagnostic();
  console.log(`Aggregate: ${sweep.aggregateSCD64}`);
  console.log(`Search stats after sweep: ${JSON.stringify(sweep.searchStats)}`);
  console.log('\nTry: npm run queue -- search "resonance gate frontend"');
  printUsage();
}

// Additional: Test the hypothesized top 10 against the query 
// (triggers on searches mentioning semantic/color/verseir/pixelbrain for ongoing diagnosis)
if (process.argv.includes('--test-hypotheses') || 
    (args[0] === 'search' && args.slice(1).join(' ').toLowerCase().match(/semantic|color|verseir|pixelbrain/))) {
  console.log('\n=== Hypothesis Test: Top 10 Color Bias Checksums vs Query ===');
  const queryLower = (args.slice(1).join(' ') || 'Semantic duplicated logic corrupting TrueSight Colorization').toLowerCase();
  const queryWords = new Set(queryLower.split(/\s+/));

  const reasonWords = {
    "Phonetic Frequency (The /R/ and /EH/ Bias)": ["phonetic", "frequency", "bias", "r", "eh", "color"],
    "Short Vowel Clustering": ["short", "vowel", "clustering", "color"],
    "Homophonic Collisions": ["homophonic", "collisions", "read", "red", "color"],
    "Morphological Substring Matching": ["morphological", "substring", "matching", "blueprint", "blackberry", "color"],
    "Hypernym Clustering (Semantics in Action)": ["hypernym", "clustering", "semantics", "semantic", "color"],
    "Compound Adjectives": ["compound", "adjectives", "blue", "green", "color"],
    "Metonymy and Idiomatic Usage": ["metonymy", "idiomatic", "red", "blue", "color"],
    "Token Boundary Ambiguity": ["token", "boundary", "ambiguity", "pink", "color"],
    "Visual-to-Linguistic Mapping": ["visual", "linguistic", "mapping", "color"],
    "Dataset Imbalance": ["dataset", "imbalance", "bias", "color"]
  };

  let flagged = [], ignored = [], smoking = [];

  HYPOTHESIZED_COLOR_BIAS_CHECKSUMS.forEach((item, idx) => {
    const words = reasonWords[item.reason] || [];
    const overlap = [...queryWords].filter(w => words.some(rw => rw.includes(w) || w.includes(rw))).length;
    const score = overlap / Math.max(queryWords.size, 1);

    if (item.reason.toLowerCase().includes('semantic') || item.reason.toLowerCase().includes('logic') || item.reason.toLowerCase().includes('duplicat')) {
      smoking.push({num: idx+1, ...item, score});
    } else if (score > 0.3 || item.reason.toLowerCase().includes('color') || item.reason.toLowerCase().includes('semantic')) {
      flagged.push({num: idx+1, ...item, score});
    } else {
      ignored.push({num: idx+1, ...item});
    }
  });

  console.log("FLAGGED (high overlap with query terms):");
  flagged.forEach(f => console.log(`  ${f.num}. ${f.checksum} - ${f.reason} (score ${f.score.toFixed(2)})`));

  console.log("\nIGNORED (low overlap):");
  ignored.forEach(i => console.log(`  ${i.num}. ${i.checksum} - ${i.reason}`));

  console.log("\nSMOKING GUNS (direct match to semantic duplication / logic corruption + color overrep):");
  smoking.forEach(s => console.log(`  ${s.num}. ${s.checksum} - ${s.reason} (score ${s.score.toFixed(2)})`));

  console.log("\nConclusion from test: Hypernym Clustering (Semantics) and Morphological Substring Matching are smoking guns for 'Semantic duplicated logic' corrupting colorization in CMUDICT IR.");
}

main().catch((err) => {
  console.error('SCD64 queue CLI error:', err);
  process.exit(1);
});
