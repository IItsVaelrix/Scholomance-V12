/**
 * graphPacketCompiler.ts
 *
 * Canonical compiler for ScholomanceGraphPacket-v1.
 *
 * This is the authority. Rete is only the UI.
 * In shadow mode this still produces diagnostics and a preview projection.
 */

import { ScholomanceGraphPacketV1 } from './graphPacketSchema';
import { evaluateFormula } from '../../../codex/core/pixelbrain/formula-to-coordinates.js'; // tie-in to existing Wand math
import { forgeCharacterFromWandVector } from '../../../codex/core/pixelbrain/character-foundry.js';

export type GraphCompileResult = {
  ok: boolean;
  diagnostics: any[];
  artifacts: any[];
  checksum: string;
};

export function compileScholomanceGraphPacket(
  packet: ScholomanceGraphPacketV1,
  context: { seed?: string } = {}
): GraphCompileResult {
  const diagnostics: any[] = [];

  // Basic packet validation
  if (!packet.nodes || packet.nodes.length === 0) {
    diagnostics.push({ code: 'GRAPH-000 EMPTY_GRAPH', severity: 'warn', message: 'Graph has no nodes' });
  }

  // Example: find Wand / math nodes and run existing evaluators (shadow / preview only)
  const artifacts: any[] = [];

  for (const node of packet.nodes) {
    if (node.kind === 'wand.formula' || node.kind === 'math.expression') {
      try {
        // Reuse existing evaluate path for determinism
        const coords = evaluateFormula(
          { coordinateFormula: node.params?.formula || node.params?.expression },
          { width: 128, height: 128 },
          0
        );

        artifacts.push({
          nodeId: node.id,
          type: node.kind,
          vectorPaths: coords.length,
          sample: coords.slice(0, 3),
        });
      } catch (e: any) {
        diagnostics.push({
          code: 'GRAPH-013 MATH_EVAL_FAILED',
          severity: 'error',
          nodeId: node.id,
          message: e.message,
        });
      }
    }

    if (node.kind === 'pixelbrain.compile') {
      // Could call forgeCharacterFromWandVector in future when full vectorWand support lands
      artifacts.push({ nodeId: node.id, type: 'pixelbrain', note: 'shadow preview only' });
    }
  }

  const checksum = JSON.stringify({ nodes: packet.nodes.length, seed: packet.determinism.seed }).length.toString(16);

  return {
    ok: diagnostics.filter(d => d.severity === 'fatal' || d.severity === 'error').length === 0,
    diagnostics,
    artifacts,
    checksum,
  };
}
