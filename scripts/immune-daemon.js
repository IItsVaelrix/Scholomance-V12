#!/usr/bin/env node
/**
 * SPATIAL IMMUNE SYSTEM DAEMON
 * Production runner for the SpatialImmuneOrchestrator
 */

import { SpatialImmuneOrchestrator } from '../codex/core/immunity/spatial-immune-orchestrator.js';

async function main() {
  console.log("=================================================");
  console.log("   SCHOLOMANCE SPATIAL IMMUNE SYSTEM DAEMON      ");
  console.log("=================================================");
  
  const orchestrator = new SpatialImmuneOrchestrator({ 
    sizeX: 32, sizeY: 32, sizeZ: 32, 
    agentCount: 3 
  });
  
  console.log(`[Daemon] Orchestrator initialized. Library Size: ${orchestrator.raid.patterns.length} patterns.`);
  
  // Register critical nodes
  orchestrator.registerNode('CORE_DB_ROUTER', 16, 5, 16);
  orchestrator.registerNode('UI_RENDER_PIPELINE', 16, 25, 16);
  orchestrator.registerNode('src/combat/damage-calc.js', 5, 16, 5);

  console.log(`[Daemon] Nodes registered to topological map.`);
  
  // 1. Simulate an INNATE (Proactive) response from cleri-probe
  console.log(`\n[Daemon] Event: Antigen Probe detected dormant structural flaw.`);
  orchestrator.injectPrionResonance(
    'src/combat/damage-calc.js', 
    'floating-point-equality', 
    0.85, 
    { description: 'Direct floating-point equality without epsilon comparison' }
  );

  // 2. Simulate an ADAPTIVE (Reactive) response from runtime exosome
  console.log(`[Daemon] Event: Runtime verification failure in UI_RENDER_PIPELINE.`);
  orchestrator.injectRuntimeExosome({
    checksum: 'a4aa8b44',
    code: 'PB-ERR-v1-RENDER-CRIT-0901',
    cellId: 'UI_RENDER_PIPELINE',
    context: {
      errorMessage: 'WebGL context lost during intensive vector render',
      symptoms: ['black screen', 'context lost', 'webgl crash']
    },
    timestamp: Date.now()
  });

  console.log(`\n[Daemon] Starting Chemotaxis Patrol Tick Loop...`);
  
  orchestrator.agents[0].x = 16; orchestrator.agents[0].y = 20; orchestrator.agents[0].z = 16;
  orchestrator.agents[1].x = 5; orchestrator.agents[1].y = 12; orchestrator.agents[1].z = 5;
  
  let ticks = 0;
  const maxTicks = 50;

  const tickInterval = setInterval(() => {
    ticks++;
    const diagnostics = orchestrator.tick();
    
    // Log agent positions every 10 ticks to show activity
    if (ticks % 10 === 0) {
      console.log(`[Tick ${ticks}] Patrol Activity: ${orchestrator.agents.map(a => `${a.id}(${a.x},${a.y},${a.z})`).join(' ')}`);
    }
    
    if (diagnostics.length > 0) {
      console.log(`\n[Tick ${ticks}] ⚡ AGENT INTERCEPTION ⚡`);
      for (const res of diagnostics) {
        console.log(`  Agent: ${res.agentId} at (${res.coordinate.x}, ${res.coordinate.y}, ${res.coordinate.z})`);
        console.log(`  Pathogen: ${res.payload.errorMessages[0] || res.payload.symptoms[0]}`);
        console.log(`  Verdict: ${res.diagnosis.verdict} (${(res.diagnosis.confidence * 100).toFixed(1)}%)`);
        
        if (res.diagnosis.verdict === 'CONFIRMED' || res.diagnosis.verdict === 'NEEDS_MERLIN') {
          console.log(`  Antibody: ${res.diagnosis.matchedPattern.name}`);
          console.log(`  Fix Applied: ${res.diagnosis.fixPath}`);
        } else {
          console.log(`  Antibody: NOVEL PATHOGEN -> Escalating to LLM Synthesis...`);
        }
      }
    }

    if (ticks >= maxTicks || orchestrator.seeds.size === 0) {
      clearInterval(tickInterval);
      console.log(`\n[Daemon] Substrate clean. All anomalies neutralized. Shutting down.`);
    }
  }, 100); // 100ms per tick for fast simulation
}

main().catch(console.error);
