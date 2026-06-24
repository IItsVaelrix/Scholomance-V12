/**
 * Spatial Immune Engine Prototype
 * 
 * Demonstrates an Immune Agent navigating a QBIT field gradient to intercept 
 * an Exosome (BytecodeHealth payload) and generate a Resonance footprint.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Import existing Scholomance-V12 components
import { encodeBytecodeHealth } from './BytecodeHealth.js';
import { propagate, ATTENUATION_MODELS } from '../pixelbrain/qbit-field.js';

// --- Configuration ---
const VOLUME_SIZE = 32;
const RESONANCE_DIR = path.resolve(process.cwd(), '../../public/data/resonance');

// Ensure resonance directory exists (for testing)
if (!fs.existsSync(RESONANCE_DIR)) {
  fs.mkdirSync(RESONANCE_DIR, { recursive: true });
}

/**
 * Represents a Node in the Vectorized Substrate
 */
class SubstrateNode {
  constructor(id, x, y, z) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.z = z;
    this.isFailing = false;
    this.exosome = null;
  }

  // Simulate a failure: shedding a Red-Path Exosome and burning ATP
  triggerDistress() {
    this.isFailing = true;
    
    // Shed Exosome (Using BytecodeHealth as the messenger packet)
    this.exosome = encodeBytecodeHealth(this.id, 'CRITICAL_STATE_FAULT', {
      memory_dump: '0xBADF00D',
      stack_trace: 'at SubstrateNode.triggerDistress',
      topology_coord: [this.x, this.y, this.z]
    });
    
    // In a real Red-Path this would be a BytecodeError, but we use Health payload 
    // here to represent the deterministic RNA checksum capability.
    this.exosome.code = 'PB-ERR-v1-IMMUNE-DISTRESS'; 

    console.log(`[NODE ${this.id}] Shedding distress exosome at (${this.x}, ${this.y}, ${this.z}). Checksum: ${this.exosome.checksum}`);
    
    // Return the seed to light up the QBIT field
    return { x: this.x, y: this.y, z: this.z, energy: 1.0, energyType: 'DISTRESS' };
  }
}

/**
 * Represents an Immune Agent navigating the QBIT Field
 */
class ImmuneAgent {
  constructor(id, startX, startY, startZ) {
    this.id = id;
    this.x = startX;
    this.y = startY;
    this.z = startZ;
  }

  // Chemotaxis: Move along the energy gradient
  navigateGradient(field) {
    console.log(`[AGENT ${this.id}] Starting chemotaxis from (${this.x}, ${this.y}, ${this.z})`);
    
    let steps = 0;
    const MAX_STEPS = 50;

    while (steps < MAX_STEPS) {
      const energy = field.energyAt(this.x, this.y, this.z);
      
      // Sample gradient
      const { gx, gy, gz } = field.gradientAt(this.x, this.y, this.z);
      console.log(`[AGENT ${this.id}] Step ${steps}: at (${this.x}, ${this.y}, ${this.z}), Energy: ${energy.toFixed(4)}, Gradient: (${gx.toFixed(4)}, ${gy.toFixed(4)}, ${gz.toFixed(4)})`);
      
      // Move one step in the direction of steepest ascent
      if (gx > 0) this.x++; else if (gx < 0) this.x--;
      if (gy > 0) this.y++; else if (gy < 0) this.y--;
      if (gz > 0) this.z++; else if (gz < 0) this.z--;
      
      // Keep within bounds
      this.x = Math.max(0, Math.min(VOLUME_SIZE - 1, this.x));
      this.y = Math.max(0, Math.min(VOLUME_SIZE - 1, this.y));
      this.z = Math.max(0, Math.min(VOLUME_SIZE - 1, this.z));

      // If we've reached a local maximum (gradient is 0)
      if (gx === 0 && gy === 0 && gz === 0) {
         if (energy > 0.1) {
             console.log(`[AGENT ${this.id}] Reached anomaly epicenter at (${this.x}, ${this.y}, ${this.z}) in ${steps} steps. (Peak Energy: ${energy.toFixed(4)})`);
             return true;
         } else {
             console.log(`[AGENT ${this.id}] Stuck in flat empty space at (${this.x}, ${this.y}, ${this.z})`);
             break;
         }
      }

      steps++;
    }
    
    console.log(`[AGENT ${this.id}] Failed to locate epicenter within step limit.`);
    return false;
  }

  // Absorb the exosome and archive the resonance
  synthesizeResonance(node) {
    if (!node.exosome) return;

    console.log(`[AGENT ${this.id}] Absorbing exosome RNA [${node.exosome.checksum}] from Node ${node.id}`);

    const resonanceData = {
      timestamp: Date.now(), // EXEMPT
      agent_id: this.id,
      epicenter_node: node.id,
      exosome_payload: node.exosome.toJSON(),
      resolution_status: 'QUARANTINED'
    };

    const fileName = `immune-${node.exosome.checksum}.resonance-v1.resonance.json`;
    const filePath = path.join(RESONANCE_DIR, fileName);

    fs.writeFileSync(filePath, JSON.stringify(resonanceData, null, 2));
    console.log(`[AGENT ${this.id}] Synthesized Resonance footprint: ${filePath}`);
    
    // Clear the node's distress state
    node.isFailing = false;
    node.exosome = null;
  }
}

// --- Simulation Run ---

function runSimulation() {
  console.log("=== Initializing Vectorized Substrate ===");
  
  // 1. Create a failing node somewhere in the 32x32x32 volume
  const failingNode = new SubstrateNode('DB_CONN_ACTOR', 25, 25, 25);
  
  // 2. Node triggers distress, returning a QBIT energy seed
  const distressSeed = failingNode.triggerDistress();

  // 3. Propagate the QBIT Field
  console.log("=== Propagating QBIT Energy Field ===");
  const field = propagate(
    [distressSeed],
    VOLUME_SIZE, VOLUME_SIZE, VOLUME_SIZE,
    {
      decay: 0.15,
      iterations: 3,
      attenuationModel: ATTENUATION_MODELS.PHI_ATTENUATION
    }
  );

  // 4. Deploy Immune Agent closer so it feels the gradient (e.g. middle of the volume)
  const agent = new ImmuneAgent('AEON_01', 15, 15, 15);

  // 5. Agent performs Chemotaxis (gradient ascent)
  console.log("=== Immune Agent Chemotaxis Initiated ===");
  const foundEpicenter = agent.navigateGradient(field);

  // 6. Synthesis and Archiving
  let generatedChecksum = null;
  if (foundEpicenter) {
    generatedChecksum = failingNode.exosome.checksum;
    agent.synthesizeResonance(failingNode);
  }

  console.log("\n=== Lymph Node Query Interface ===");
  const archive = new ResonanceArchive();
  
  // Query 1: Do we have an antibody for this exact failure?
  const targetChecksum = generatedChecksum || '2a582753';
  const antibody = archive.queryByChecksum(targetChecksum);
  if (antibody) {
    console.log(`[QUERY SUCCESS] Antibody found for Checksum ${targetChecksum}:`);
    console.log(` -> Agent who resolved it: ${antibody.agent_id}`);
    console.log(` -> Original Epicenter: ${antibody.epicenter_node}`);
    console.log(` -> Resolution Status: ${antibody.resolution_status}`);
  }

  // Query 2: Which anomalies occurred in this spatial quadrant?
  const regionalEvents = archive.queryByRegion(20, 30, 20, 30, 20, 30);
  console.log(`\n[QUERY RESULT] Found ${regionalEvents.length} historical anomalies in quadrant (20-30, 20-30, 20-30).`);
  regionalEvents.forEach(evt => {
    const coords = evt.exosome_payload.context.topology_coord;
    console.log(` -> Node: ${evt.epicenter_node} at (${coords.join(', ')})`);
  });
}

/**
 * Represents the system's "Lymph Node" - a queryable index of all stored resonance footprints.
 */
class ResonanceArchive {
  constructor() {
    this.records = [];
    this.loadArchives();
  }

  loadArchives() {
    if (!fs.existsSync(RESONANCE_DIR)) return;
    const files = fs.readdirSync(RESONANCE_DIR);
    
    for (const file of files) {
      if (file.endsWith('.resonance.json')) {
        const data = JSON.parse(fs.readFileSync(path.join(RESONANCE_DIR, file), 'utf-8'));
        this.records.push(data);
      }
    }
  }

  // Find exact matches (Antibodies) for a specific exosome RNA
  queryByChecksum(checksum) {
    return this.records.find(r => r.exosome_payload.checksum === checksum);
  }

  // Find historical anomalies within a bounding box
  queryByRegion(minX, maxX, minY, maxY, minZ, maxZ) {
    return this.records.filter(r => {
      const [x, y, z] = r.exosome_payload.context.topology_coord;
      return x >= minX && x <= maxX && 
             y >= minY && y <= maxY && 
             z >= minZ && z <= maxZ;
    });
  }
}

runSimulation();
