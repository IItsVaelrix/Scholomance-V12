/**
 * ReteGraphAdapter
 *
 * Bidirectional bridge between Rete.js editor state and the canonical
 * ScholomanceGraphPacket-v1.
 *
 * Rete is the viewport. The packet is the truth.
 */

import { NodeEditor } from 'rete';
import { ScholomanceGraphPacketV1, ScholomanceGraphNodeV1, ScholomanceGraphConnectionV1 } from './graphPacketSchema';
import { getNodeDefinition } from './nodeRegistry';

export interface ReteLayoutSnapshot {
  positions: Record<string, { x: number; y: number }>;
  sizes?: Record<string, { width: number; height: number }>;
  viewport?: { x: number; y: number; zoom: number };
}

export async function exportReteToGraphPacket(
  editor: NodeEditor<any>,
  layout: ReteLayoutSnapshot,
  options: {
    graphId: string;
    title: string;
    seed: string;
    createdBy?: 'human' | 'ai' | 'hybrid';
    domain?: string;
  }
): Promise<ScholomanceGraphPacketV1> {
  const reteNodes = editor.getNodes();
  const reteConnections = editor.getConnections();

  const nodes: ScholomanceGraphNodeV1[] = reteNodes.map((reteNode: any) => {
    const def = getNodeDefinition(reteNode.label || reteNode.name);
    return {
      id: reteNode.id,
      kind: reteNode.label || reteNode.name || 'unknown',
      label: reteNode.label || reteNode.name || 'Unnamed Node',
      inputs: {}, // populated from sockets in real impl
      outputs: {},
      params: reteNode.data || {},
      compiler: {
        resolverId: def?.resolverId || 'unknown',
        version: 'v1',
        pure: def?.pure ?? true,
        deterministic: def?.deterministic ?? true,
        allowAsync: false,
      },
      provenance: {
        source: 'manual',
      },
    } as ScholomanceGraphNodeV1;
  });

  const connections: ScholomanceGraphConnectionV1[] = reteConnections.map((conn: any) => ({
    id: conn.id,
    source: {
      nodeId: conn.source,
      socket: conn.sourceOutput,
    },
    target: {
      nodeId: conn.target,
      socket: conn.targetInput,
    },
    type: 'pixelbrain.packet' as any, // resolve properly in full impl
  }));

  const packet: ScholomanceGraphPacketV1 = {
    schemaVersion: 'scholomance.graph.v1',
    graphId: options.graphId,
    title: options.title,
    determinism: {
      seed: options.seed,
      canonicalJsonVersion: 'canonical-json.v1',
      createdBy: options.createdBy || 'human',
      compilationMode: 'shadow',
    },
    nodes,
    connections,
    uiLayout: {
      renderer: 'rete',
      version: 'rete-layout.v1',
      positions: layout.positions,
      sizes: layout.sizes,
      viewport: layout.viewport,
    },
    metadata: {
      tags: [],
      domain: (options.domain as any) || 'mixed',
      authoringSurface: 'ScholomanceReteGraphEditor',
    },
    diagnostics: [],
  };

  return packet;
}

export function importGraphPacketToRete(
  packet: ScholomanceGraphPacketV1,
  editor: NodeEditor<any>
) {
  // Clear existing
  editor.clear();

  // Re-create nodes (simplified - real version uses node factory)
  packet.nodes.forEach(node => {
    // In real code: const reteNode = createReteNodeFromPacket(node);
    // editor.addNode(reteNode);
    console.log('[adapter] Would add node', node.kind, node.id);
  });

  // Re-create connections
  packet.connections.forEach(conn => {
    // editor.addConnection(...)
    console.log('[adapter] Would connect', conn.source, '->', conn.target);
  });

  // Apply layout from uiLayout
  if (packet.uiLayout?.positions) {
    // apply positions to nodes
  }
}
