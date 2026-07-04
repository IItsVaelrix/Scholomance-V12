/**
 * ScholomanceGraphEditor
 *
 * React shell for the Rete.js powered visual node editor.
 *
 * This is the interactive canvas. The canonical packet is always the source of truth.
 *
 * Phase 0 (Shadow): Visual authoring only. No live compiler emission.
 */

import React, { useEffect, useRef } from 'react';
import { NodeEditor } from 'rete';
import { createReteEditor } from './createReteEditor';
import { exportReteToGraphPacket, importGraphPacketToRete } from './reteGraphAdapter';
import { ScholomanceGraphPacketV1 } from './graphPacketSchema';
import { listNodeKinds, getNodeDefinition } from './nodeRegistry';

interface Props {
  initialPacket?: ScholomanceGraphPacketV1;
  onPacketChange?: (packet: ScholomanceGraphPacketV1) => void;
  seed?: string;
}

export function ScholomanceGraphEditor({ initialPacket, onPacketChange, seed = '42' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<NodeEditor<any> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const editor = createReteEditor(containerRef.current);

    editorRef.current = editor;

    // Load initial packet if provided
    if (initialPacket) {
      importGraphPacketToRete(initialPacket, editor);
    }

    // Example: register a change listener that exports to canonical packet
    const handleChange = async () => {
      if (!editorRef.current) return;

      const packet = await exportReteToGraphPacket(editorRef.current, {
        positions: {}, // in real impl collect from editor
        viewport: undefined,
      }, {
        graphId: initialPacket?.graphId || `graph-${Date.now()}`,
        title: initialPacket?.title || 'Untitled Graph',
        seed,
        domain: 'mixed',
      });

      onPacketChange?.(packet);
    };

    // Attach listeners (simplified)
    editor.addPipe((context: any) => {
      if (['nodecreate', 'connectioncreate', 'noderemove'].includes(context.type)) {
        // debounce in real code
        setTimeout(handleChange, 100);
      }
      return context;
    });

    return () => {
      // cleanup editor
      editor.destroy?.();
    };
  }, []);

  const addNode = (kind: string) => {
    if (!editorRef.current) return;
    const def = getNodeDefinition(kind);
    if (!def) {
      alert(`Unknown node kind: ${kind}`);
      return;
    }
    // In full impl: create Rete node from def and add
    console.log('[editor] Adding node', kind);
    // editor.addNode(...)
  };

  return (
    <div className="scholomance-graph-editor" style={{ display: 'flex', height: '600px' }}>
      <div style={{ width: 220, borderRight: '1px solid #333', padding: 8, overflow: 'auto' }}>
        <h4>Node Palette</h4>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
          Phase 0 — Shadow mode. Graphs are visual only.
        </div>
        {listNodeKinds().map(kind => {
          const def = getNodeDefinition(kind)!;
          return (
            <button
              key={kind}
              onClick={() => addNode(kind)}
              style={{
                display: 'block',
                width: '100%',
                marginBottom: 4,
                padding: '6px 8px',
                textAlign: 'left',
                background: '#222',
                border: '1px solid #444',
                color: '#ddd',
                cursor: 'pointer',
              }}
            >
              {def.ui.icon} {def.label}
            </button>
          );
        })}
        <div style={{ marginTop: 16, fontSize: 11 }}>
          <strong>Canonical Packet</strong> is the truth.<br />
          This editor is just the canvas.
        </div>
      </div>

      <div ref={containerRef} style={{ flex: 1, background: '#111', position: 'relative' }} />

      <div style={{ width: 260, borderLeft: '1px solid #333', padding: 8, fontSize: 12 }}>
        <h4>Inspector</h4>
        <div style={{ opacity: 0.6 }}>Select a node to edit params.</div>
        <div style={{ marginTop: 12, fontSize: 10 }}>
          Seed: {seed} (determinism preserved)
        </div>
      </div>
    </div>
  );
}
