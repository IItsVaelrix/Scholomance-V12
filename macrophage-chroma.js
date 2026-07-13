import { propagate, ATTENUATION_MODELS } from './codex/core/pixelbrain/qbit-field.js';
import { synthesizeVerse } from './codex/core/shared/truesight/compiler/VerseSynthesis.js';
import { decodeChromaBytecode } from './codex/core/shared/truesight/color/chroma.bytecode.js';
import { scanChromaStamps } from './codex/core/diagnostic/chromaticImmuneProbe.js';

const VOLUME_SIZE = 32;

// 1. Define the Chromatic Node representing a colored TrueSight Token
class ChromaNode {
  constructor(tokenId, token, stamp, distress) {
    this.id = `CHROMA_NODE_${tokenId}`;
    this.word = token.text || token.word || '';
    this.stamp = token.precomputed?.chroma?.bytecode || null;
    this.decodedStamp = stamp;
    this.distress = distress;
    
    // Spatial mapping (Z=2 for Chromatic Layer)
    this.x = Math.min(token.tokenIndexInLine ?? token.wordIndex ?? 0, VOLUME_SIZE - 1);
    this.y = Math.min(token.lineIndex ?? token.lineNumber ?? 0, VOLUME_SIZE - 1);
    this.z = 2; 
    
    this.exosome = null;
    this.phagocytized = false;
  }

  triggerDistress(reason) {
    console.log(`[CHROMA NODE ${this.id}] 🌈 Dropping Exosome: ${reason} at (${this.x}, ${this.y}, ${this.z})`);

    // Emitting a spectral fault signal
    return { x: this.x, y: this.y, z: this.z, energy: 0.85, energyType: 'SPECTRAL_FAULT' };
  }
}

// A node is distressed when its OWN stamp says so. We do not invent faults.
function distressOf(token) {
  const stamp = decodeChromaBytecode(token.precomputed?.chroma?.bytecode);
  if (!stamp) return null;
  if (stamp.reason === 'I') return 'CHROMA_BLEED';
  if (stamp.committed && ['G', 'U', 'X'].includes(stamp.authority)) return 'LIE_PAINTED';
  return null;   // LOW_CONFIDENCE is a healthy REFUSAL, not a fault: the gate worked.
}

// 2. Define the Macrophage Agent
class SpectralMacrophage {
  constructor(id, startX, startY, startZ) {
    this.id = id;
    this.x = startX;
    this.y = startY;
    this.z = startZ;
    this.engulfedToxins = 0;
  }

  navigateGradient(field) {
    console.log(`\n[MACROPHAGE ${this.id}] 🦠 Deployed. Sweeping chromatic spectrum from (${this.x}, ${this.y}, ${this.z})...`);
    let steps = 0;
    while (steps < 60) {
      const energy = field.energyAt(this.x, this.y, this.z);
      const { gx, gy, gz } = field.gradientAt(this.x, this.y, this.z);
      
      if (gx > 0.001) this.x++; else if (gx < -0.001) this.x--;
      if (gy > 0.001) this.y++; else if (gy < -0.001) this.y--;
      // Keep Macrophages strictly on the Chromatic layer (Z=2)
      
      this.x = Math.max(0, Math.min(VOLUME_SIZE - 1, this.x));
      this.y = Math.max(0, Math.min(VOLUME_SIZE - 1, this.y));

      // Quick gradient peak fix - when gradient flattens out, we are at the epicenter
      if (Math.abs(gx) < 0.1 && Math.abs(gy) < 0.1) {
         if (energy > 0.01) {
             console.log(`[MACROPHAGE ${this.id}] 🎯 Spectral leak acquired at (${this.x}, ${this.y}, ${this.z}) after ${steps} steps.`);
             return true;
         } else {
             break;
         }
      }
      steps++;
    }
    return false;
  }

  // Macrophages report corrupted code and generate deep diagnostics.
  phagocytosis(node) {
    // A cell that eats healthy tissue is a disease, not a cure. The previous
    // version deployed at (0,0,2), moved zero steps, and devoured the healthy
    // token "Colors" — expected === rendered — stamping it CRITICAL and
    // fabricating a root cause for a fault that did not exist.
    if (!node.distress) {
      console.log(`[MACROPHAGE ${this.id}] Healthy cell "${node.word}" — standing down.`);
      return false;
    }

    console.log(`[MACROPHAGE ${this.id}] Phagocytosis on "${node.word}" (${node.id})`);
    console.log(JSON.stringify({
      version: 'v3',
      category: 'SPECTRAL_PIPELINE',
      severity: 'CRITICAL',
      errorCode: 'PB-ERR-v1-TRUESIGHT-CHROMA-BLEED',
      cellId: 'VERSE_IR_RENDERER',
      checkId: 'VISUAL_BYTECODE_FIDELITY',
      context: {
        word: node.word,
        stamp: node.stamp,          // the PB-CHROMA v2 bytecode — the evidence
        distress: node.distress,    // CHROMA_BLEED | LIE_PAINTED — never invented
        spatialTopology: { x: node.x, y: node.y, z: node.z, layer: 'CHROMATIC_DOM' },
      },
    }, null, 2));

    // NO REPAIR. The old version set renderedColor = 'hsl(0, 0%, 50%)', which
    // wiped the evidence to neutral grey and called that a cure. The macrophage
    // reports; a human fixes.
    node.phagocytized = true;
    this.engulfedToxins++;
    return true;
  }
}

// 3. Execution Engine
function executeChromaScan() {
  console.log("=== TrueSight Spectral Macrophage Diagnostics ===\n");
  
  const testText = `
Colors map cleanly here
Until a corrupted spectral token bleeds out of bounds
  `.trim();

  console.log("1. Synthesizing verse and reading chroma stamps...");
  const artifact = synthesizeVerse(testText, { mode: 'deep' });
  const tokens = artifact.verseIR?.tokens || [];
  const stampReport = scanChromaStamps(tokens.map(token => token.precomputed?.chroma?.bytecode));
  console.log(`[MACROPHAGE] Stamp report: ${JSON.stringify({
    decoded: stampReport.decoded,
    authorityHistogram: stampReport.authorityHistogram,
    findings: stampReport.findings.map(finding => finding.code),
  })}`);
  
  const distressSeeds = [];
  const nodes = {};

  console.log("\n2. Reading stamp-backed distress only (Z=2)...");

  for (const [index, token] of tokens.entries()) {
    const stamp = decodeChromaBytecode(token.precomputed?.chroma?.bytecode);
    const distress = distressOf(token);
    const node = new ChromaNode(token.id ?? index, token, stamp, distress);
    nodes[`${node.x},${node.y},${node.z}`] = node;

    if (distress) {
      distressSeeds.push(node.triggerDistress(distress));
    } else {
      console.log(`[CHROMA NODE ${node.id}] Healthy stamp for "${node.word}" — no distress.`);
    }
  }

  if (distressSeeds.length === 0) {
    console.log("No stamp-backed spectral faults detected. Macrophage stands down.");
    return;
  }

  console.log("\n3. Propagating QBIT Energy Field (Spectral Sub-Frequency)...");
  const field = propagate(
    distressSeeds,
    VOLUME_SIZE, VOLUME_SIZE, VOLUME_SIZE,
    { decay: 0.15, iterations: 3, attenuationModel: ATTENUATION_MODELS.GAUSSIAN_ATTENUATION }
  );

  console.log("\n4. Injecting Spectral Macrophages into the Substrate...");
  
  // We can launch multiple Macrophages to clean up multiple leaks
  const agents = [
    new SpectralMacrophage('MACROPHAGE-RED', 0, 0, 2),
    new SpectralMacrophage('MACROPHAGE-BLUE', VOLUME_SIZE-1, VOLUME_SIZE-1, 2)
  ];

  for (const agent of agents) {
    const found = agent.navigateGradient(field);
    if (found) {
      const failingNode = nodes[`${agent.x},${agent.y},${agent.z}`];
      if (failingNode) {
        agent.phagocytosis(failingNode);
        // Reduce the field energy locally since the macrophage ate the exosome!
        // (In a continuous loop, this prevents other macrophages from targeting the same spot)
      } else {
        console.log(`[MACROPHAGE ${agent.id}] Epicenter reached, but no node found.`);
      }
    }
  }
}

executeChromaScan();
