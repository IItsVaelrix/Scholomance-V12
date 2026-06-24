#!/usr/bin/env node
/**
 * STALENESS PRION DIAGNOSIS — Annotation Layer Regression
 *
 * Injects a single targeted prion for the hypothesis that the refactored
 * lookupTokenData in TruesightPlugin.jsx uses closure-captured (stale) values
 * for analyzedWordsByCharStart/analyzedWordsByIdentity instead of reading from
 * inputsRef.current on every transform call.
 */

import { SpatialImmuneOrchestrator } from '../codex/core/immunity/spatial-immune-orchestrator.js';

function pct(n) { return (n * 100).toFixed(1) + '%'; }

async function main() {
  console.log("=================================================");
  console.log("   ANNOTATION LAYER — STALENESS PRION DIAGNOSIS  ");
  console.log("=================================================");

  const orchestrator = new SpatialImmuneOrchestrator({
    sizeX: 64, sizeY: 64, sizeZ: 64,
    agentCount: 3
  });

  console.log(`[Diag] RAID library loaded: ${orchestrator.raid.patterns.length} seed patterns.`);

  orchestrator.registerNode('src/lib/lexical/TruesightPlugin.jsx', 32, 32, 32, 'TRUESIGHT_PLUGIN');

  console.log(`\n[Diag] === INJECTING PRION: lookupTokenData-uses-closure-not-inputsRef ===`);
  orchestrator.injectPrionResonance(
    'src/lib/lexical/TruesightPlugin.jsx',
    'lookupTokenData-uses-closure-not-inputsRef',
    1.0,
    {
      description: 'After the refactor, lookupTokenData(node, text) inside the registered transform reads `analyzedWordsByCharStart` and `analyzedWordsByIdentity` from the useEffect closure. The useEffect deps are [editor, isTruesight], so the closure values are the INITIAL props and never update. The transform sees frozen analysis, so annotation never reflects upstream updates.',
      symptoms: [
        'lookupTokenData closure captures analyzedWordsByCharStart at effect registration time',
        'useEffect deps are [editor, isTruesight] — prop changes do not re-register the effect',
        'inputsRef.current is updated each render with the live values, but lookupTokenData does NOT read from it',
        'transform uses frozen analysis — annotation layer cannot track upstream updates',
        'every other variable in the transform IS read from inputsRef.current, so the staleness is asymmetric',
        'annotation appears to work on initial mount but never updates after',
        'tokenization unchanged but tokenization result uses stale color/state decisions',
        'rendering not propagating scoring correctly'
      ],
      errorMessages: [
        'closure-captured value never updates on prop change',
        'transform reads stale analysis token data',
        'tokenInfo.bytecode and tokenData.precomputed.decoded are frozen at first mount'
      ]
    }
  );

  console.log(`[Diag] Starting chemotaxis absorption...\n`);

  const verdicts = [];
  let ticks = 0;
  const maxTicks = 50;

  while (orchestrator.seeds.size > 0 && ticks < maxTicks) {
    ticks++;
    for (const [seedId, seed] of orchestrator.seeds.entries()) {
      const agent = orchestrator.agents[0];
      if (agent.status === 'SYNTHESIZING') continue;
      agent.x = Math.max(0, Math.min(orchestrator.sizeX - 1, seed.x + 1));
      agent.y = Math.max(0, Math.min(orchestrator.sizeY - 1, seed.y));
      agent.z = Math.max(0, Math.min(orchestrator.sizeZ - 1, seed.z));
      break;
    }
    const diagnostics = orchestrator.tick();
    for (const d of diagnostics) {
      verdicts.push({
        prion: d.payload.symptoms[0]?.substring(0, 100) || 'unknown',
        file: d.payload.filePaths[0],
        agent: d.agentId,
        verdict: d.diagnosis.verdict,
        confidence: d.diagnosis.confidence,
        matchedPattern: d.diagnosis.matchedPattern?.name || null,
        matchedPatternId: d.diagnosis.matchedPattern?.id || null,
        fixPath: d.diagnosis.fixPath || null,
        owner: d.diagnosis.owner,
        topNeighbors: d.diagnosis.neighbors?.slice(0, 3).map(n => ({
          id: n.patternId ?? null,
          name: n.pattern ?? null,
          sim: n.similarity ?? null
        })) || []
      });
    }
  }

  console.log("=================================================");
  console.log("   STALENESS PRION — RAID VERDICT                 ");
  console.log("=================================================\n");

  if (verdicts.length === 0) {
    console.log("[Diag] No prion absorbed. Chemotaxis failed to converge.");
  } else {
    for (let i = 0; i < verdicts.length; i++) {
      const v = verdicts[i];
      console.log(`--- VERDICT ${i + 1} ---`);
      console.log(`  Prion:       ${v.prion}${v.prion.length >= 100 ? '...' : ''}`);
      console.log(`  File:        ${v.file}`);
      console.log(`  Absorbed by: ${v.agent}`);
      console.log(`  Verdict:     ${v.verdict} (${pct(v.confidence)})`);
      if (v.matchedPattern) {
        console.log(`  Match:       ${v.matchedPattern} [${v.matchedPatternId}]`);
        console.log(`  Fix path:    ${v.fixPath || '(none)'}`);
      }
      console.log(`  Owner:       ${v.owner}`);
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

  const stats = orchestrator.raid.getStats();
  console.log("--- RAID LIBRARY STATS ---");
  console.log(`  Patterns:      ${stats.patternCount}`);
  console.log(`  Queries:       ${stats.queries}`);
  console.log(`  Confirmed:     ${stats.confirmed}`);
  console.log(`  Denied:        ${stats.denied}`);
  console.log(`  Needs Merlin:  ${stats.needsMerlin}`);
  console.log(`  Novel:         ${stats.novel}`);

  console.log(`\n[Diag] Chemotaxis complete in ${ticks} ticks.`);
  console.log("=================================================");
}

main().catch((e) => {
  console.error("[Diag] FATAL:", e);
  process.exit(1);
});
