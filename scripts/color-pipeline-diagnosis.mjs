#!/usr/bin/env node
/**
 * SPATIAL IMMUNE DIAGNOSIS DRIVER — Color Pipeline
 *
 * Injects 3 structural prions into the QBIT field, then drives chemotaxis
 * until each is absorbed and routed through Clerical RAID for verdict.
 *
 * Patterned after scripts/immune-daemon.js but synchronous + targeted.
 */

import { SpatialImmuneOrchestrator } from '../codex/core/immunity/spatial-immune-orchestrator.js';

function pct(n) { return (n * 100).toFixed(1) + '%'; }

async function main() {
  console.log("=================================================");
  console.log("   COLOR PIPELINE — SPATIAL IMMUNE DIAGNOSIS     ");
  console.log("=================================================");

  const orchestrator = new SpatialImmuneOrchestrator({
    sizeX: 64, sizeY: 64, sizeZ: 64,
    agentCount: 5
  });

  console.log(`[Diag] RAID library loaded: ${orchestrator.raid.patterns.length} seed patterns.`);

  // Register the three target nodes (color pipeline files)
  const NODES = {
    plugin: { file: 'src/lib/lexical/TruesightPlugin.jsx', x: 32, y: 32, z: 32, label: 'TRUESIGHT_PLUGIN' },
    page:   { file: 'src/pages/Read/ReadPage.jsx',         x: 30, y: 34, z: 32, label: 'READ_PAGE' },
    color:  { file: 'src/pages/Visualiser/truesightColor.ts', x: 28, y: 36, z: 32, label: 'TRUESIGHT_COLOR' },
  };
  for (const n of Object.values(NODES)) {
    orchestrator.registerNode(n.file, n.x, n.y, n.z);
  }
  console.log(`[Diag] Registered ${Object.keys(NODES).length} topological nodes.`);

  // ============================================================
  // PRION 1: resonance-gate-charStart-mismatch
  // ============================================================
  console.log(`\n[Diag] === INJECTING PRION 1: resonance-gate-charStart-mismatch ===`);
  orchestrator.injectPrionResonance(
    NODES.plugin.file,
    'resonance-gate-charStart-mismatch',
    1.0,
    {
      description: 'The resonantCharStarts Set in ReadPage.jsx is built from deepAnalysis.syntaxLayer.allConnections[*].charStart, but TruesightPlugin.jsx:45-58 computes globalCharStart by walking Lexical sibling paragraphs. The two coordinate systems disagree on the newline convention, so the gate never matches and either every word is colored or none are.',
      symptoms: [
        'resonantCharStarts.has(globalCharStart) returns false on every word',
        'set is built from compileVerseToIR.js charStart convention (UTF-16 source offset)',
        'globalCharStart is computed from Lexical paragraph siblings +1 per boundary',
        'if upstream compilation uses one newline convention and Lexical uses another, every offset is off by N characters per line',
        'returning null disables gate and colors every word; returning empty Set gates every word out (grey)',
        'rendering not propagating scoring correctly',
        'type invariant drift between upstream analysis and live editor'
      ],
      errorMessages: [
        'resonantCharStarts membership overlap with live charStarts: near zero',
        'all words stay grey (gate too strict) or all words colored (gate disabled)'
      ]
    }
  );

  // ============================================================
  // PRION 2: hierarchy-fallback-text-match
  // ============================================================
  console.log(`[Diag] === INJECTING PRION 2: hierarchy-fallback-text-match ===`);
  orchestrator.injectPrionResonance(
    NODES.plugin.file,
    'hierarchy-fallback-text-match',
    0.95,
    {
      description: 'The lookup hierarchy in TruesightPlugin.jsx:87,158 is charStart → identity → analysisMap.get(text.toLowerCase()). The last fallback is keyed by lowercased text only, with later entries overwriting earlier ones in Map.set. Repeated words silently share the last-inserted analysis.',
      symptoms: [
        'analysisMap built from analyzedDocument.syntaxSummary.tokens with m.set(t.token.toLowerCase(), t)',
        'Map.set overwrites on collision: only the last occurrence per word wins',
        'two words spelled the same in different contexts get the same analysis',
        'position-based lookups mask upstream charStart failures',
        'silently masks the charStart mismatch as if everything were correct',
        'rendering not propagating scoring correctly'
      ],
      errorMessages: [
        'repeated words share one analysis across positions',
        'analysisMap size < token count when words repeat'
      ]
    }
  );

  // ============================================================
  // PRION 3: g2p-accuracy-controls-hue-not-gate
  // ============================================================
  console.log(`[Diag] === INJECTING PRION 3: g2p-accuracy-controls-hue-not-gate ===`);
  orchestrator.injectPrionResonance(
    NODES.color.file,
    'g2p-accuracy-controls-hue-not-gate',
    0.6,
    {
      description: 'Hypothesis that G2P is not accurately judging whether color should exist. Confirmed scope: wordTruesight/tokenTruesight decide WHAT color (school hue via vowelFamily), not WHETHER. shouldColor is gated by (a) VISUALISER_FUNCTION_WORDS hardcoded set, and (b) resonantCharStarts Set. G2P accuracy affects hue, not gate membership.',
      symptoms: [
        'wordTruesight returns null for VISUALISER_FUNCTION_WORDS',
        'tokenTruesight bypasses function-word check (comment: backend gate decides)',
        'shouldColor = Boolean(wordInfo) when no Set, or Set.has(cs) when Set present',
        'vowelFamily mis-prediction changes hue but not whether color is applied',
        'hypothesis mis-scoped: this is not the should-color gate'
      ],
      errorMessages: [
        'wrong hue on resonant words, not wrong shouldColor',
        'g2p mis-predicts vowel family for edge-case tokens'
      ]
    }
  );

  console.log(`\n[Diag] ${orchestrator.seeds.size} prion seeds injected into QBIT field.`);
  console.log(`[Diag] Starting chemotaxis absorption loop...\n`);

  // ============================================================
  // CHEMOTAXIS: reposition one agent per seed, run tick() until absorbed
  // ============================================================
  const verdicts = [];
  let ticks = 0;
  const maxTicks = 200;

  while (orchestrator.seeds.size > 0 && ticks < maxTicks) {
    ticks++;

    // Reposition a free agent adjacent to each remaining seed
    let agentIdx = 0;
    for (const [seedId, seed] of orchestrator.seeds.entries()) {
      if (agentIdx >= orchestrator.agents.length) break;
      const agent = orchestrator.agents[agentIdx];
      if (agent.status === 'SYNTHESIZING') { agentIdx++; continue; }
      agent.x = Math.max(0, Math.min(orchestrator.sizeX - 1, seed.x + 1));
      agent.y = Math.max(0, Math.min(orchestrator.sizeY - 1, seed.y));
      agent.z = Math.max(0, Math.min(orchestrator.sizeZ - 1, seed.z));
      agentIdx++;
    }

    const diagnostics = orchestrator.tick();
    for (const d of diagnostics) {
      verdicts.push({
        prion: d.payload.symptoms[0]?.substring(0, 80) || 'unknown',
        file: d.payload.filePaths[0],
        agent: d.agentId,
        coord: `(${d.coordinate.x},${d.coordinate.y},${d.coordinate.z})`,
        verdict: d.diagnosis.verdict,
        confidence: d.diagnosis.confidence,
        matchedPattern: d.diagnosis.matchedPattern?.name || null,
        matchedPatternId: d.diagnosis.matchedPattern?.id || null,
        fixPath: d.diagnosis.fixPath || null,
        owner: d.diagnosis.owner,
        escalationRequired: d.diagnosis.escalationRequired,
        topNeighbors: d.diagnosis.neighbors?.slice(0, 3).map(n => ({
          id: n.patternId ?? null,
          name: n.pattern ?? null,
          sim: n.similarity ?? null
        })) || []
      });
    }
  }

  // ============================================================
  // REPORT
  // ============================================================
  console.log("=================================================");
  console.log("   RAID VERDICTS — COLOR PIPELINE PRIONS          ");
  console.log("=================================================\n");

  if (verdicts.length === 0) {
    console.log("[Diag] No prions absorbed. Chemotaxis failed to converge.");
  } else {
    for (let i = 0; i < verdicts.length; i++) {
      const v = verdicts[i];
      console.log(`--- VERDICT ${i + 1} ---`);
      console.log(`  Prion context: ${v.prion}${v.prion.length >= 80 ? '...' : ''}`);
      console.log(`  File:          ${v.file}`);
      console.log(`  Absorbed by:   ${v.agent} at ${v.coord}`);
      console.log(`  Verdict:       ${v.verdict} (${pct(v.confidence)})`);
      if (v.matchedPattern) {
        console.log(`  Match:         ${v.matchedPattern} [${v.matchedPatternId}]`);
        console.log(`  Fix path:      ${v.fixPath || '(none)'}`);
      }
      console.log(`  Owner:         ${v.owner}`);
      console.log(`  Escalation:    ${v.escalationRequired ? 'YES' : 'no'}`);
      if (v.topNeighbors.length > 0) {
        console.log(`  Top neighbors:`);
        for (const n of v.topNeighbors) {
          const sim = Number.isFinite(n.sim) ? n.sim.toFixed(3) : String(n.sim);
          console.log(`    - [${n.id}] ${n.name}  sim=${sim}`);
        }
      }
      console.log();
    }
  }

  // Library stats
  const stats = orchestrator.raid.getStats();
  console.log("--- RAID LIBRARY STATS ---");
  console.log(`  Patterns:      ${stats.patternCount}`);
  console.log(`  Queries:       ${stats.queries}`);
  console.log(`  Confirmed:     ${stats.confirmed}`);
  console.log(`  Denied:        ${stats.denied}`);
  console.log(`  Needs Merlin:  ${stats.needsMerlin}`);
  console.log(`  Novel:         ${stats.novel}`);
  console.log(`  Library bytes: ${stats.memoryBytes}`);

  console.log(`\n[Diag] Chemotaxis complete in ${ticks} ticks. ${orchestrator.seeds.size} seeds remain.`);
  console.log("=================================================");
}

main().catch((e) => {
  console.error("[Diag] FATAL:", e);
  process.exit(1);
});
