/**
 * Node Registry for Scholomance Graph Editor (Rete.js backed)
 *
 * Every node kind must be registered here.
 * Unknown nodes are rejected at packet import and creation time.
 * This enforces the "no mystery meat" rule.
 */

import { ScholomanceGraphNodeDefinition } from './graphPacketSchema';

export const NODE_REGISTRY: Record<string, ScholomanceGraphNodeDefinition> = {
  'wand.formula': {
    kind: 'wand.formula',
    label: 'Wand Formula',
    category: 'Wand',
    inputs: {
      intent: { type: 'intent.text', optional: true },
    },
    outputs: {
      formula: { type: 'formula.curve' },
    },
    paramsSchema: {
      type: 'object',
      properties: {
        rationale: { type: 'string' },
        confidence: { type: 'number' },
        formula: { type: 'object' }, // the actual Wand proposal
      },
    },
    resolverId: 'wand.formula.v1',
    deterministic: true,
    pure: true,
    ui: {
      defaultWidth: 220,
      defaultHeight: 120,
      icon: '🪄',
      colorToken: '--color-wand',
    },
  },

  'wand.mathematicalStroke': {
    kind: 'wand.mathematicalStroke',
    label: 'Mathematical Stroke',
    category: 'Wand',
    inputs: {
      basePath: { type: 'formula.curve', optional: true },
    },
    outputs: {
      stroke: { type: 'formula.stroke' },
    },
    paramsSchema: {
      type: 'object',
      properties: {
        cx: { type: 'number' },
        cy: { type: 'number' },
        length: { type: 'number' },
        angle: { type: 'number' },
        baseWidth: { type: 'number' },
        widthVariation: { type: 'number' },
        frequency: { type: 'number' },
        density: { type: 'number' },
        bleed: { type: 'number' },
        n: { type: 'number' },
      },
    },
    resolverId: 'wand.stroke.v1',
    deterministic: true,
    pure: true,
    ui: {
      defaultWidth: 260,
      defaultHeight: 180,
      icon: '🖌️',
      colorToken: '--color-wand',
    },
  },

  'math.expression': {
    kind: 'math.expression',
    label: 'Math Expression (AST)',
    category: 'PixelBrain',
    inputs: {
      x: { type: 'math.scalar', optional: true },
      y: { type: 'math.scalar', optional: true },
      t: { type: 'math.scalar', optional: true },
    },
    outputs: {
      value: { type: 'math.scalar' },
      vector: { type: 'math.vector2', optional: true },
    },
    paramsSchema: {
      type: 'object',
      properties: {
        expression: { type: 'object' }, // the AST from previous pipeline work
        seed: { type: 'number' },
        precision: { type: 'number' },
        modifiers: { type: 'array' },
      },
    },
    resolverId: 'math.expression.v1',
    deterministic: true,
    pure: true,
    ui: {
      defaultWidth: 240,
      defaultHeight: 140,
      icon: '∑',
      colorToken: '--color-pixelbrain',
    },
  },

  'pixelbrain.compile': {
    kind: 'pixelbrain.compile',
    label: 'PixelBrain Compile',
    category: 'PixelBrain',
    inputs: {
      vector: { type: 'formula.stroke' },
      palette: { type: 'pixelbrain.palette', optional: true },
    },
    outputs: {
      packet: { type: 'pixelbrain.packet' },
    },
    paramsSchema: {
      type: 'object',
      properties: {
        targetResolution: { type: 'number' },
        useSymmetry: { type: 'boolean' },
      },
    },
    resolverId: 'pixelbrain.compile.v1',
    deterministic: true,
    pure: true,
    ui: {
      defaultWidth: 200,
      defaultHeight: 100,
      icon: '🧬',
      colorToken: '--color-pixelbrain',
    },
  },

  'diagnostics.gate': {
    kind: 'diagnostics.gate',
    label: 'Diagnostics Gate',
    category: 'Diagnostics',
    inputs: {
      packet: { type: 'pixelbrain.packet' },
    },
    outputs: {
      validated: { type: 'pixelbrain.packet' },
    },
    paramsSchema: {
      type: 'object',
      properties: {
        failOn: { type: 'string', enum: ['error', 'warn'] },
      },
    },
    resolverId: 'diagnostics.gate.v1',
    deterministic: true,
    pure: true,
    ui: {
      defaultWidth: 180,
      defaultHeight: 90,
      icon: '🛡️',
      colorToken: '--color-diagnostics',
    },
  },

  'export.svg': {
    kind: 'export.svg',
    label: 'Export SVG',
    category: 'Export',
    inputs: {
      packet: { type: 'pixelbrain.packet' },
    },
    outputs: {
      artifact: { type: 'export.artifact' },
    },
    paramsSchema: {
      type: 'object',
      properties: {
        filename: { type: 'string' },
      },
    },
    resolverId: 'export.svg.v1',
    deterministic: true,
    pure: true,
    ui: {
      defaultWidth: 160,
      defaultHeight: 80,
      icon: '📄',
      colorToken: '--color-export',
    },
  },
};

export function getNodeDefinition(kind: string): ScholomanceGraphNodeDefinition | undefined {
  return NODE_REGISTRY[kind];
}

export function listNodeKinds(): string[] {
  return Object.keys(NODE_REGISTRY);
}
