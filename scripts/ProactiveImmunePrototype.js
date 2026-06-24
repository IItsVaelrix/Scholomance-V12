#!/usr/bin/env node
/**
 * Proactive Immune Diagnostics Prototype
 * 
 * Demonstrates wiring `cleri-probe.js` (static antigen probe) into the 
 * Spatial Diagnostic Engine (`QBITField`) to achieve proactive self-healing.
 * 
 * 1. cleri-probe.js scans the codebase for structural "prions" (misfolded code).
 * 2. High-resonance files are mapped to 3D spatial coordinates.
 * 3. Prion resonance becomes QBIT energy seeds.
 * 4. Immune Agents walk the gradient to find dormant bugs *before* runtime errors occur.
 * 5. Clerical RAID synthesizes the antibody based on the discovered prion.
 */

import { propagateWithOctree, ATTENUATION_MODELS } from '../codex/core/pixelbrain/qbit-field.js';
import { ClericalRAID, Pattern } from '../codex/core/immunity/clerical-raid.core.js';

async function run() {
  console.log("=== Initializing Proactive Spatial Immune Engine ===");
  
  // 1. Initialize Clerical RAID with a known Prion Antibody
  const raid = new ClericalRAID({ capacity: 10 });
  const arrayGuardPrion = new Pattern(
    "PRION-ARR-001",
    "Missing Array Bounds Guard",
    ["array index access without preceding bounds check"],
    ["src/ui/infected.js"],
    [],
    2, // GEMINI
    "src/ui/infected.js (inject if (arr.length > 0) guard)",
    0.99
  );
  raid.train(arrayGuardPrion);
  
  const SIZE = 32;
  console.log(`[Spatial Engine] Initialized ${SIZE}x${SIZE}x${SIZE} QBIT Field.`);

  // 2. Spatial Mapping (Topological Architecture)
  const fileCoordinates = {
    'src/db/core.js': { x: 16, y: 0, z: 16 },       // DB Layer (bottom)
    'src/api/router.js': { x: 16, y: 16, z: 16 },   // API Layer (middle)
    'src/ui/infected.js': { x: 24, y: 30, z: 24 }   // UI Layer (top)
  };

  // 3. Simulated output from `cleri-probe.js --mode=prion`
  console.log(`\n[Probe] Scanning codebase for dormant misfolded proteins (prions)...`);
  const probeHeatmap = [
    { path: 'src/db/core.js', resonance: 0.12, description: 'Direct array index access without preceding bounds check' },
    { path: 'src/api/router.js', resonance: 0.34, description: 'Direct array index access without preceding bounds check' },
    { path: 'src/ui/infected.js', resonance: 0.88, description: 'Direct array index access without preceding bounds check' }
  ];

  console.log(`[Probe] Heatmap generated. Mapping to QBIT Spatial Coordinates...`);

  // 4. Inject Heatmap into QBIT Field
  const seeds = probeHeatmap
    .filter(hit => hit.resonance > 0.7) // Only high-resonance hits become active distress seeds
    .map(hit => {
      const coord = fileCoordinates[hit.path];
      console.log(`[Probe] Mapped ${hit.path} (Resonance: ${(hit.resonance * 100).toFixed(1)}%) -> QBIT Coordinate (${coord.x}, ${coord.y}, ${coord.z})`);
      return { x: coord.x, y: coord.y, z: coord.z, energy: hit.resonance };
    });

  const qbitField = propagateWithOctree(seeds, SIZE, SIZE, SIZE, {
    decay: 0.05,
    iterations: 3,
    attenuationModel: ATTENUATION_MODELS.INVERSE_SQUARE,
    maxRadius: null
  });
  console.log(`[Spatial Engine] Prion resonance propagated as spatial gradient.`);

  // 5. Chemotaxis Loop
  console.log(`\n=== Proactive Chemotaxis Loop ===`);
  let agentPos = { x: 16, y: 16, z: 16 }; // Spawn agent in the middle of the stack
  console.log(`[Immune Agent] Patrol started at (${agentPos.x}, ${agentPos.y}, ${agentPos.z}).`);

  let steps = 0;
  const MAX_STEPS = 100;
  let found = false;
  const EPSILON = 1e-9;
  const targetCoord = seeds[0]; // the single seed in this example

  while (steps < MAX_STEPS) {
    const { gx, gy, gz } = qbitField.gradientAt(agentPos.x, agentPos.y, agentPos.z);
    
    if (Math.abs(gx) < EPSILON && Math.abs(gy) < EPSILON && Math.abs(gz) < EPSILON) {
      found = true;
      break;
    }

    if (Math.abs(gx) >= EPSILON) agentPos.x += Math.sign(gx);
    if (Math.abs(gy) >= EPSILON) agentPos.y += Math.sign(gy);
    if (Math.abs(gz) >= EPSILON) agentPos.z += Math.sign(gz);

    agentPos.x = Math.max(0, Math.min(SIZE - 1, agentPos.x));
    agentPos.y = Math.max(0, Math.min(SIZE - 1, agentPos.y));
    agentPos.z = Math.max(0, Math.min(SIZE - 1, agentPos.z));

    steps++;
  }

  if (found || (agentPos.x === targetCoord.x && agentPos.y === targetCoord.y && agentPos.z === targetCoord.z)) {
    console.log(`[Immune Agent] Found dormant prion at (${agentPos.x}, ${agentPos.y}, ${agentPos.z}) in ${steps} steps.`);
    
    // Reverse map coordinate to file
    const infectedFile = Object.keys(fileCoordinates).find(
      key => fileCoordinates[key].x === agentPos.x && 
             fileCoordinates[key].y === agentPos.y && 
             fileCoordinates[key].z === agentPos.z
    );
    console.log(`[Immune Agent] Mapped coordinate to file: ${infectedFile}`);

    // 6. Antibody Synthesis
    console.log(`\n=== Semantic Antibody Synthesis ===`);
    const hitInfo = probeHeatmap.find(h => h.path === infectedFile);
    
    // Query Clerical RAID with the Prion's description
    const diagnosis = raid.query({
      symptoms: [hitInfo.description],
      filePaths: [infectedFile],
      errorMessages: []
    });

    console.log(`[Clerical RAID] Verdict: ${diagnosis.verdict} (Confidence: ${(diagnosis.confidence * 100).toFixed(1)}%)`);
    console.log(`[Clerical RAID] Matched Antibody: ${diagnosis.matchedPattern.id} - ${diagnosis.matchedPattern.name}`);
    console.log(`[Clerical RAID] Proactive Fix Applied: ${diagnosis.fixPath}`);

  } else {
    console.log(`[Immune Agent] Local max found at (${agentPos.x}, ${agentPos.y}, ${agentPos.z}), but not the infected node.`);
  }
}

run().catch(console.error);
