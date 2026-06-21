import fs from 'node:fs';
import path from 'node:path';

// Import Spatial Immune components
import { encodeBytecodeHealth } from './codex/core/diagnostic/BytecodeHealth.js';
import { propagate, ATTENUATION_MODELS } from './codex/core/pixelbrain/qbit-field.js';
import { PhonemeEngine } from './codex/core/phonology/phoneme.engine.js';
import { compileVerseToIR } from './codex/core/shared/truesight/compiler/compileVerseToIR.js';

// Configuration
const VOLUME_SIZE = 32;

class TrueSightNode {
  constructor(tokenId, word, lineIndex, tokenIndex) {
    this.id = `TOKEN_${tokenId}`;
    this.word = word;
    // Map text topology to 3D spatial topology
    this.x = Math.min(tokenIndex, VOLUME_SIZE - 1); 
    this.y = Math.min(lineIndex, VOLUME_SIZE - 1);
    this.z = 0; // Flat text plane for now
    this.exosome = null;
  }

  triggerDistress(diagnostics) {
    this.exosome = encodeBytecodeHealth(this.id, 'UNKNOWN_PHONETICS', {
      word: this.word,
      topology_coord: [this.x, this.y, this.z],
      diagnostics
    });
    this.exosome.code = 'PB-ERR-v1-TRUESIGHT-MISSING-PHONEME';
    
    console.log(`[NODE ${this.id}] Shedding distress exosome for word "${this.word}" at (${this.x}, ${this.y}, ${this.z})`);
    return { x: this.x, y: this.y, z: this.z, energy: 1.0, energyType: 'LINGUISTIC_FAULT' };
  }
}

class ImmuneAgent {
  constructor(id, startX, startY, startZ) {
    this.id = id;
    this.x = startX;
    this.y = startY;
    this.z = startZ;
  }

  navigateGradient(field) {
    console.log(`\n[AGENT ${this.id}] Starting chemotaxis from (${this.x}, ${this.y}, ${this.z})`);
    let steps = 0;
    while (steps < 50) {
      const energy = field.energyAt(this.x, this.y, this.z);
      const { gx, gy, gz } = field.gradientAt(this.x, this.y, this.z);
      
      console.log(`[AGENT ${this.id}] Step ${steps}: at (${this.x}, ${this.y}, ${this.z}), Energy: ${energy.toFixed(4)}, Gradient: (${gx.toFixed(4)}, ${gy.toFixed(4)}, ${gz.toFixed(4)})`);
      
      if (gx > 0) this.x++; else if (gx < 0) this.x--;
      if (gy > 0) this.y++; else if (gy < 0) this.y--;
      if (gz > 0) this.z++; else if (gz < 0) this.z--;
      
      this.x = Math.max(0, Math.min(VOLUME_SIZE - 1, this.x));
      this.y = Math.max(0, Math.min(VOLUME_SIZE - 1, this.y));
      this.z = Math.max(0, Math.min(VOLUME_SIZE - 1, this.z));

      if (gx === 0 && gy === 0 && gz === 0) {
         if (energy > 0.01) {
             console.log(`[AGENT ${this.id}] Reached anomaly epicenter at (${this.x}, ${this.y}, ${this.z}) in ${steps} steps.`);
             return true;
         } else {
             break;
         }
      }
      steps++;
    }
    return false;
  }

  synthesizeResonance(node) {
    console.log(`[AGENT ${this.id}] Synthesizing Resonance for word: "${node.word}"`);
    console.log(` -> Exosome Checksum: ${node.exosome.checksum}`);
    console.log(` -> Diagnostics:`, node.exosome.context.diagnostics);
  }
}

function debugTrueSight() {
  console.log("=== TrueSight Spatial Debugger ===");
  
  // A text containing a known problematic word based on the bug reports (e.g. SKITTLES)
  const testText = `
The quick brown fox
jumps over the lazy dog
but the system fails on SKITTLES
because it lacks phonemes
  `.trim();

  console.log("1. Compiling verse to IR...");
  const ir = compileVerseToIR(testText, { mode: 'deep', phonemeEngine: PhonemeEngine });
  
  const distressSeeds = [];
  const nodes = {};

  // Detect the "Skittles Anomaly": Singleton Vowel Families (noise)
  // 1. Count family frequencies
  const familyCounts = {};
  for (const token of ir.tokens) {
    if (token.flags.isStopWordLike) continue;
    const family = token.primaryStressedVowelFamily || token.terminalVowelFamily;
    if (family) {
      familyCounts[family] = (familyCounts[family] || 0) + 1;
    }
  }

  console.log("\n2. Mapping IR tokens to Spatial Substrate & Detecting Noise...");
  for (const token of ir.tokens) {
    const node = new TrueSightNode(token.id, token.text, token.lineIndex, token.tokenIndexInLine);
    nodes[`${node.x},${node.y},${node.z}`] = node;

    if (token.flags.isStopWordLike) continue;

    const family = token.primaryStressedVowelFamily || token.terminalVowelFamily;
    
    // Anomaly: Singleton Noise (The "Skittles Effect" where a word has no phonetic peers)
    if (family && familyCounts[family] === 1) {
      distressSeeds.push(node.triggerDistress({
        reason: 'SINGLETON_NOISE_DETECTED',
        vowelFamily: family,
        frequency: 1
      }));
    }
  }

  if (distressSeeds.length === 0) {
    console.log("No anomalies detected in TrueSight IR.");
    return;
  }

  console.log("\n3. Propagating QBIT Energy Field...");
  const field = propagate(
    distressSeeds,
    VOLUME_SIZE, VOLUME_SIZE, VOLUME_SIZE,
    { decay: 0.15, iterations: 3, attenuationModel: ATTENUATION_MODELS.PHI_ATTENUATION }
  );

  console.log("4. Deploying Immune Agent...");
  const agent = new ImmuneAgent('TRUESIGHT_DEBUGGER', 0, 0, 0);
  
  const found = agent.navigateGradient(field);
  if (found) {
    const failingNode = nodes[`${agent.x},${agent.y},${agent.z}`];
    if (failingNode) {
      agent.synthesizeResonance(failingNode);
    } else {
      console.log(`[AGENT ${agent.id}] Epicenter reached, but no node found at (${agent.x}, ${agent.y}, ${agent.z}).`);
    }
  }
}

debugTrueSight();
