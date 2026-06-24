#!/usr/bin/env node
/**
 * Spatial Immune Diagnostics Prototype
 * 
 * Demonstrates the fusion of:
 * 1. Spatial QBIT Field Propagation (Chemotaxis / Energy gradients)
 * 2. BytecodeHealth / BytecodeError Exosomes (Deterministic error payloads)
 * 3. Clerical RAID (Semantic pattern matching and immune memory)
 */

import { propagateWithOctree, ATTENUATION_MODELS } from '../codex/core/pixelbrain/qbit-field.js';
import { BytecodeHealth, HEALTH_CODES, CELL_IDS } from '../codex/core/diagnostic/BytecodeHealth.js';
import { ClericalRAID, Pattern } from '../codex/core/immunity/clerical-raid.core.js';

async function run() {
  console.log("=== Initializing Spatial Immune Engine ===");
  
  // 1. Initialize the Adaptive Immune Memory
  const raid = new ClericalRAID({ capacity: 10 });
  
  // Let's explicitly train a specific pattern for our simulation
  const dummyBugPattern = new Pattern(
    "PAT-SIM-001",
    "Database Node Desynchronization",
    ["database module out of sync", "verifyHealthDeterminism failed", "tx lock timeout"],
    ["src/db/core.js", "src/db/sync.js"],
    ["Error: TX lock timeout", "Fatal: Desync detected"],
    2, // GEMINI
    "src/db/sync.js (add retry jitter)",
    0.95
  );
  raid.train(dummyBugPattern);
  console.log(`[Immune System] Clerical RAID online. Library size: ${raid.patterns.length} patterns.`);

  // 2. Setup the Spatial Substrate (32x32x32 volume)
  const SIZE = 32;
  console.log(`[Spatial Engine] Initialized ${SIZE}x${SIZE}x${SIZE} QBIT Field.`);

  // 3. Simulate an infection/error
  // A module at (16, 28, 16) fails and sheds a Red Exosome
  const errorCoordinate = { x: 16, y: 28, z: 16 };
  
  // In reality, this would be a BytecodeError, but we'll use BytecodeHealth structure
  // to represent the deterministic exosome payload containing the state.
  const exosome = new BytecodeHealth({
    code: HEALTH_CODES.CELL_SCAN_CLEAN, // Normally an error code
    cellId: CELL_IDS.LOGIC_VERIFIER,
    checkId: "DB_SYNC_CHECK",
    moduleId: "DATABASE_CORE",
    context: {
      errorMessage: "Error: TX lock timeout",
      symptoms: ["database module out of sync", "verifyHealthDeterminism failed"]
    }
  });

  console.log(`\n[Infection] Node failed at (${errorCoordinate.x}, ${errorCoordinate.y}, ${errorCoordinate.z}).`);
  console.log(`[Infection] Shedding Exosome (Checksum: ${exosome.checksum})`);

  // 4. Burn ATP / Propagate Distress Signal
  const seeds = [
    { ...errorCoordinate, energy: 1.0 }
  ];
  
  const qbitField = propagateWithOctree(seeds, SIZE, SIZE, SIZE, {
    decay: 0.05,
    iterations: 3,
    attenuationModel: ATTENUATION_MODELS.INVERSE_SQUARE,
    maxRadius: null // infinite radius so it always reaches the agent
  });
  console.log(`[Spatial Engine] Distress signal propagated.`);

  // 5. Chemotaxis Loop
  console.log(`\n=== Chemotaxis Loop ===`);
  // Spawn an Immune Agent at (0, 0, 0)
  let agentPos = { x: 0, y: 0, z: 0 };
  console.log(`[Immune Agent] Spawned at (${agentPos.x}, ${agentPos.y}, ${agentPos.z}).`);

  let steps = 0;
  const MAX_STEPS = 100;
  let found = false;

  while (steps < MAX_STEPS) {
    const { gx, gy, gz } = qbitField.gradientAt(agentPos.x, agentPos.y, agentPos.z);
    
    // Gradient ascent (moving towards higher energy)
    // We add a tiny epsilon to prevent getting stuck if gradient is extremely flat but non-zero
    const EPSILON = 1e-9;
    if (Math.abs(gx) < EPSILON && Math.abs(gy) < EPSILON && Math.abs(gz) < EPSILON) {
      // Local maximum reached
      found = true;
      break;
    }

    // Move 1 voxel in the direction of the gradient on each axis
    if (Math.abs(gx) >= EPSILON) agentPos.x += Math.sign(gx);
    if (Math.abs(gy) >= EPSILON) agentPos.y += Math.sign(gy);
    if (Math.abs(gz) >= EPSILON) agentPos.z += Math.sign(gz);

    // Clamp to volume bounds
    agentPos.x = Math.max(0, Math.min(SIZE - 1, agentPos.x));
    agentPos.y = Math.max(0, Math.min(SIZE - 1, agentPos.y));
    agentPos.z = Math.max(0, Math.min(SIZE - 1, agentPos.z));

    steps++;
  }

  // Check if we reached the coordinate (gradient might oscillate near peak)
  if (found || (agentPos.x === errorCoordinate.x && agentPos.y === errorCoordinate.y && agentPos.z === errorCoordinate.z)) {
    console.log(`[Immune Agent] Reached distress source at (${agentPos.x}, ${agentPos.y}, ${agentPos.z}) in ${steps} steps.`);
  } else {
    console.log(`[Immune Agent] Local max found at (${agentPos.x}, ${agentPos.y}, ${agentPos.z}).`);
  }

  // 6. Antibody Generation / Diagnosis
  console.log(`\n=== Semantic Diagnosis ===`);
  console.log(`[Immune Agent] Absorbing Exosome...`);
  
  // Format the exosome for Clerical RAID query
  const bugReport = {
    symptoms: exosome.context.symptoms,
    filePaths: ["src/db/core.js"],
    errorMessages: [exosome.context.errorMessage],
    timestamp: Date.now()
  };

  const diagnosis = raid.query(bugReport);
  
  console.log(`[Clerical RAID] Verdict: ${diagnosis.verdict}`);
  console.log(`[Clerical RAID] Confidence: ${(diagnosis.confidence * 100).toFixed(1)}%`);
  
  if (diagnosis.verdict === 'CONFIRMED' || diagnosis.verdict === 'NEEDS_MERLIN') {
    console.log(`[Clerical RAID] Matched Pattern: ${diagnosis.matchedPattern.id} - ${diagnosis.matchedPattern.name}`);
    console.log(`[Clerical RAID] Known Fix: ${diagnosis.fixPath}`);
    console.log(`[Immune Agent] Applying antibody... Resolution complete.`);
  } else {
    console.log(`[Clerical RAID] Pathogen is novel. Triggering Merling/LLM ingestion to synthesize new antibody.`);
    // Here we would call agentHookQuery or merlin-ingest
  }
}

run().catch(console.error);
