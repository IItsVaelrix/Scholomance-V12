/**
 * Scholomance Graph Editor (Rete.js backed)
 *
 * Entry point for the visual node authoring surface.
 *
 * Follows the PDR strictly:
 * - Rete.js = interactive canvas
 * - ScholomanceGraphPacket-v1 = canonical truth
 * - Determinism and existing compilers are preserved
 */

export * from './graphPacketSchema';
export * from './nodeRegistry';
export * from './reteGraphAdapter';
export * from './graphPacketCompiler';
export * from './reteSocketRegistry';
export { ScholomanceGraphEditor } from './ScholomanceGraphEditor';
export { createReteEditor } from './createReteEditor';

/**
 * Quick helper to create a minimal Wand + Math graph packet
 * (useful for testing the recent procedural vector pipeline improvements)
 */
export function createExampleWandMathPacket(seed = '424242'): any {
  return {
    schemaVersion: 'scholomance.graph.v1',
    graphId: 'example-wand-math-' + seed,
    title: 'Wand Math → Character Vector (example)',
    determinism: {
      seed,
      canonicalJsonVersion: 'canonical-json.v1',
      createdBy: 'hybrid',
      compilationMode: 'shadow',
    },
    nodes: [
      {
        id: 'n1',
        kind: 'math.expression',
        label: 'Organic Hair Noise',
        inputs: {},
        outputs: { value: { type: 'math.scalar' } },
        params: {
          expression: {
            op: 'add',
            left: { op: 'sin', arg: { op: 'mul', left: { value: 3.2 }, right: { op: 'x' } } },
            right: { op: 'noise', arg: { op: 'y' } },
          },
          seed: parseInt(seed),
          precision: 3,
        },
        compiler: { resolverId: 'math.expression.v1', version: 'v1', pure: true, deterministic: true, allowAsync: false },
      },
      {
        id: 'n2',
        kind: 'wand.mathematicalStroke',
        label: 'Hair Stroke',
        inputs: { basePath: { type: 'formula.curve' } },
        outputs: { stroke: { type: 'formula.stroke' } },
        params: { baseWidth: 2.5, bleed: 0.4 },
        compiler: { resolverId: 'wand.stroke.v1', version: 'v1', pure: true, deterministic: true, allowAsync: false },
      },
    ],
    connections: [],
    uiLayout: { renderer: 'rete', version: 'rete-layout.v1', positions: {} },
    metadata: { tags: ['example', 'vector', 'character'], domain: 'wand', authoringSurface: 'ScholomanceReteGraphEditor' },
    diagnostics: [],
  };
}
