import fs from 'node:fs';
import path from 'node:path';

// Import Spatial Immune components
import { encodeBytecodeHealth } from './codex/core/diagnostic/BytecodeHealth.js';
import { propagate, ATTENUATION_MODELS } from './codex/core/pixelbrain/qbit-field.js';
import { PhonemeEngine } from './codex/core/phonology/phoneme.engine.js';
import { compileVerseToIR } from './codex/core/shared/truesight/compiler/compileVerseToIR.js';

const VOLUME_SIZE = 32;

// 1. Define the Node that represents a DOM Element mapped to a Token
class TrueSightDOMNode {
  constructor(tokenId, word, lineIndex, tokenIndex, domElementId) {
    this.id = `DOM_NODE_${tokenId}`;
    this.word = word;
    this.domElementId = domElementId;
    
    // Spatial mapping
    this.x = Math.min(tokenIndex, VOLUME_SIZE - 1); 
    this.y = Math.min(lineIndex, VOLUME_SIZE - 1);
    this.z = 1; // Z=1 represents the UI/DOM layer
    
    this.exosome = null;
    this.quarantined = false;
    this.visualBytecode = { color: '#00FF00', intensity: 1.0, active: true }; // Normal render state
  }

  triggerDistress(reason) {
    this.exosome = encodeBytecodeHealth(this.id, 'DOM_ALIGNMENT_FAILURE', {
      word: this.word,
      topology_coord: [this.x, this.y, this.z],
      reason
    });
    this.exosome.code = 'PB-ERR-v1-TRUESIGHT-DOM-MISMATCH';
    
    console.log(`[DOM NODE ${this.id}] 🚨 Shedding distress exosome: ${reason} at (${this.x}, ${this.y}, ${this.z})`);
    
    // Emitting a highly energetic signal specific to structural failure
    return { x: this.x, y: this.y, z: this.z, energy: 1.0, energyType: 'STRUCTURAL_FAULT' };
  }
}

// 2. Define the T-Cell Agent
class TCellAgent {
  constructor(id, startX, startY, startZ) {
    this.id = id;
    this.x = startX;
    this.y = startY;
    this.z = startZ;
  }

  navigateGradient(field) {
    console.log(`\n[T-CELL ${this.id}] 🧬 Deployed. Starting chemotaxis from (${this.x}, ${this.y}, ${this.z})...`);
    let steps = 0;
    while (steps < 50) {
      const energy = field.energyAt(this.x, this.y, this.z);
      const { gx, gy, gz } = field.gradientAt(this.x, this.y, this.z);
      
      if (gx > 0) this.x++; else if (gx < 0) this.x--;
      if (gy > 0) this.y++; else if (gy < 0) this.y--;
      if (gz > 0) this.z++; else if (gz < 0) this.z--;
      
      this.x = Math.max(0, Math.min(VOLUME_SIZE - 1, this.x));
      this.y = Math.max(0, Math.min(VOLUME_SIZE - 1, this.y));
      this.z = Math.max(0, Math.min(VOLUME_SIZE - 1, this.z));

      if (gx === 0 && gy === 0 && gz === 0) {
         if (energy > 0.01) {
             console.log(`[T-CELL ${this.id}] 📍 Target acquired at (${this.x}, ${this.y}, ${this.z}) after ${steps} steps.`);
             return true;
         } else {
             break;
         }
      }
      steps++;
    }
    return false;
  }

  // T-Cells don't just log, they take ACTION (Quarantine)
  quarantineNode(node) {
    console.log(`[T-CELL ${this.id}] ⚔️ Executing Quarantine on "${node.word}" (${node.id})`);
    
    // Sever rendering payloads to prevent Spectral Bleeding / UI crashing
    node.quarantined = true;
    node.visualBytecode = {
      color: 'transparent',
      intensity: 0.0,
      active: false,
      reason: 'QUARANTINED_BY_T_CELL'
    };
    
    console.log(`[T-CELL ${this.id}] 🛡️ Node isolated. Visual bytecode stripped. Rendering neutralized.`);
  }
}

// 3. Execution Engine
function executeTCellInjection() {
  console.log("=== TrueSight T-Cell DOM Diagnostics ===");
  
  const testText = `
The UI renders this fine
But this line has a DOM mismatch
  `.trim();

  console.log("1. Compiling verse to IR...");
  const ir = compileVerseToIR(testText, { mode: 'deep', phonemeEngine: PhonemeEngine });
  
  // Simulate DOM Rendering. We intentionally create a mismatch on line 1 (the second line)
  // Let's say the React component failed to render the word "mismatch" entirely, 
  // so the DOM elements count doesn't match the IR tokens count.
  const domElements = [];
  for (const token of ir.tokens) {
    // Intentional bug: skip rendering the word "mismatch"
    if (token.text.toLowerCase() === 'mismatch') {
      continue; 
    }
    domElements.push({
      domId: `span_tk_${token.id}`,
      lineIndex: token.lineIndex,
      tokenId: token.id
    });
  }

  const distressSeeds = [];
  const nodes = {};

  console.log("\n2. Aligning IR to DOM layer (Z=1)...");
  
  // Group DOM elements by line
  const domByLine = {};
  for (const el of domElements) {
    domByLine[el.lineIndex] = domByLine[el.lineIndex] || [];
    domByLine[el.lineIndex].push(el);
  }

  // Scan for Structural / Alignment Faults
  for (const token of ir.tokens) {
    const node = new TrueSightDOMNode(token.id, token.text, token.lineIndex, token.tokenIndexInLine, `span_tk_${token.id}`);
    nodes[`${node.x},${node.y},${node.z}`] = node;

    const lineElements = domByLine[token.lineIndex] || [];
    const tokensOnLine = ir.tokens.filter(t => t.lineIndex === token.lineIndex);

    // Fault Detection: If the number of DOM spans doesn't match the IR tokens for this line
    if (lineElements.length !== tokensOnLine.length) {
      // The whole line is compromised structurally! 
      distressSeeds.push(node.triggerDistress(`Line ${token.lineIndex} Length Mismatch (IR:${tokensOnLine.length} vs DOM:${lineElements.length})`));
    }
  }

  if (distressSeeds.length === 0) {
    console.log("DOM alignment is perfect. No anomalies detected.");
    return;
  }

  console.log("\n3. Propagating QBIT Energy Field (Structural Sub-Frequency)...");
  const field = propagate(
    distressSeeds,
    VOLUME_SIZE, VOLUME_SIZE, VOLUME_SIZE,
    { decay: 0.20, iterations: 4, attenuationModel: ATTENUATION_MODELS.PHI_ATTENUATION }
  );

  console.log("\n4. Injecting T-Cell into the Substrate...");
  // Inject the T-Cell far away to test chemotaxis
  const agent = new TCellAgent('T-CELL-ALPHA', 0, 0, 1); 
  
  const found = agent.navigateGradient(field);
  if (found) {
    const failingNode = nodes[`${agent.x},${agent.y},${agent.z}`];
    if (failingNode) {
      agent.quarantineNode(failingNode);
    } else {
      console.log(`[T-CELL ${agent.id}] Epicenter reached, but no active node found at (${agent.x}, ${agent.y}, ${agent.z}).`);
    }
  }
}

executeTCellInjection();
