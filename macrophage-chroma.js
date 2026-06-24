import fs from 'node:fs';
import path from 'node:path';

import { encodeBytecodeHealth } from './codex/core/diagnostic/BytecodeHealth.js';
import { propagate, ATTENUATION_MODELS } from './codex/core/pixelbrain/qbit-field.js';
import { PhonemeEngine } from './codex/core/phonology/phoneme.engine.js';
import { compileVerseToIR } from './codex/core/shared/truesight/compiler/compileVerseToIR.js';

const VOLUME_SIZE = 32;

// 1. Define the Chromatic Node representing a colored TrueSight Token
class ChromaNode {
  constructor(tokenId, word, lineIndex, tokenIndex, expectedColor, renderedColor) {
    this.id = `CHROMA_NODE_${tokenId}`;
    this.word = word;
    
    this.expectedColor = expectedColor;
    this.renderedColor = renderedColor; // Simulate what the DOM actually rendered
    this.bytecodeContext = {
      school: 'VOID',
      glowIntensity: 0.85,
      saturationBoost: 1.0,
      syllableDepth: 3,
      isAnchor: false,
      effectClass: 'HARMONIC',
      biophysical: {
        f0: 120.5,
        formants: [400, 1200, 2400],
        spectralCentroid: NaN // Deliberate injection of NaN to trigger the failure
      }
    };
    
    // Spatial mapping (Z=2 for Chromatic Layer)
    this.x = Math.min(tokenIndex, VOLUME_SIZE - 1); 
    this.y = Math.min(lineIndex, VOLUME_SIZE - 1);
    this.z = 2; 
    
    this.exosome = null;
    this.phagocytized = false;
  }

  triggerDistress(reason, severity = 'COLOR_MISALIGNMENT') {
    this.exosome = encodeBytecodeHealth(this.id, severity, {
      word: this.word,
      topology_coord: [this.x, this.y, this.z],
      reason,
      expected: this.expectedColor,
      rendered: this.renderedColor
    });
    this.exosome.code = 'PB-ERR-v1-TRUESIGHT-CHROMA-BLEED';
    
    console.log(`[CHROMA NODE ${this.id}] 🌈 Dropping Exosome: ${reason} at (${this.x}, ${this.y}, ${this.z})`);
    
    // Emitting a spectral fault signal
    return { x: this.x, y: this.y, z: this.z, energy: 0.85, energyType: 'SPECTRAL_FAULT' };
  }
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

  // Macrophages "eat" the corrupted code and generate deep diagnostics
  phagocytosis(node) {
    console.log(`[MACROPHAGE ${this.id}] 🍽️ Executing Phagocytosis on "${node.word}" (${node.id})`);
    
    // Deep Diagnostic Report Generation
    const diagnosticReport = {
      version: 'v2',
      category: 'SPECTRAL_PIPELINE',
      severity: 'CRITICAL',
      errorCode: 'PB-ERR-v1-TRUESIGHT-CHROMA-BLEED',
      cellId: 'VERSE_IR_RENDERER',
      checkId: 'VISUAL_BYTECODE_FIDELITY',
      context: {
        word: node.word,
        expectedColor: node.expectedColor,
        renderedColor: node.renderedColor,
        bytecodeMetrics: node.bytecodeContext,
        spatialTopology: {
          x: node.x,
          y: node.y,
          z: node.z,
          layer: 'CHROMATIC_DOM'
        },
        rootCauseAnalysis: node.renderedColor === 'undefined' || node.renderedColor === '#NaN' 
          ? 'Failed to resolve Biophysical Metrics during VerseIR Amplification. Viseme Mapping returned NaN.'
          : 'Spectral bleeding from adjacent anchor node overriding DOM span isolation.'
      },
      timestamp: new Date().toISOString()
    };

    console.log(`\n=== 🔬 DEEP SPECTRAL DIAGNOSTIC REPORT ===`);
    console.log(JSON.stringify(diagnosticReport, null, 2));
    console.log(`==========================================\n`);
    
    node.phagocytized = true;
    node.renderedColor = 'hsl(0, 0%, 50%)'; // Neutral Gray Baseline
    this.engulfedToxins++;
    
    console.log(`[MACROPHAGE ${this.id}] 🧼 Color misalignment neutralized. Rendering payload wiped to neutral gray.`);
  }
}

// 3. Execution Engine
function executeChromaScan() {
  console.log("=== TrueSight Spectral Macrophage Diagnostics ===\n");
  
  const testText = `
Colors map cleanly here
Until a corrupted spectral token bleeds out of bounds
  `.trim();

  console.log("1. Compiling verse to IR...");
  const ir = compileVerseToIR(testText, { mode: 'deep', phonemeEngine: PhonemeEngine });
  
  const distressSeeds = [];
  const nodes = {};

  console.log("\n2. Aligning expected colors to Rendered DOM colors (Z=2)...");

  for (const token of ir.tokens) {
    let expectedColor = token.visualBytecode?.color || 'hsl(120, 100%, 50%)';
    let renderedColor = expectedColor;

    // Simulate an aggressive Spectral Bleed Bug:
    // If the word is "corrupted", we simulate a React rendering bug where the color string is malformed
    if (token.text.toLowerCase() === 'corrupted') {
      renderedColor = 'undefined';
    }
    
    // Simulate a Bleed where the neighbor absorbed the corrupted color instead
    if (token.text.toLowerCase() === 'spectral') {
      expectedColor = 'hsl(240, 100%, 50%)';
      renderedColor = '#NaN'; 
    }

    const node = new ChromaNode(token.id, token.text, token.lineIndex, token.tokenIndexInLine, expectedColor, renderedColor);
    nodes[`${node.x},${node.y},${node.z}`] = node;

    // Diagnostic Rules for Spectral Misalignment
    if (renderedColor !== expectedColor) {
      distressSeeds.push(node.triggerDistress('COLOR_MISMATCH_DETECTED'));
    } else if (renderedColor === 'undefined' || renderedColor === 'null' || renderedColor.includes('NaN')) {
      distressSeeds.push(node.triggerDistress('MALFORMED_HSL_STRING'));
    }
  }

  if (distressSeeds.length === 0) {
    console.log("Color alignment is perfect. No spectral leaks detected.");
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
