/**
 * DEV-ONLY harness for the TrueSight Immune Probe.
 *
 * Mounts the real ScrollEditor overlay in read-only TrueSight mode with fixed
 * content, in a fixed-size container, so the annotation lattice renders against
 * real fonts/layout WITHOUT the auth wall. The Playwright immune spec navigates
 * here, reads the live DOM via collectTruesightNodes, and runs the Node-side
 * probe. Never registered in production (gated by import.meta.env.DEV in main).
 */

import React, { useEffect } from 'react';
import ScrollEditor from '../Read/ScrollEditor.jsx';

const SHORT_CONTENT = [
  'Alpha beta gamma delta epsilon',
  'The quick brown fox jumps over the lazy dog',
  'Crimson resonance echoes through the lattice',
].join('\n');

// Long, wrapping content closer to a real scroll — exercises wrap-point logic.
const LONG_CONTENT = Array.from({ length: 12 }, (_, i) =>
  `Line ${i} the lantern keeper wanders through the crimson archive counting silent vowels`
).join('\n');

export default function ImmuneHarness() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode') || 'read'; // read | edit
  const widthPx = Number(params.get('width')) || 820;
  const content = params.get('content') === 'long' ? LONG_CONTENT : SHORT_CONTENT;
  const isEditable = mode === 'edit';

  useEffect(() => {
    window.__IMMUNE_CONTENT__ = content;
    document.body.removeAttribute('data-immune-ready');
    // Two frames: one for mount, one for the topology ResizeObserver to settle.
    let id2;
    const id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => {
        document.body.setAttribute('data-immune-ready', 'true');
      });
    });
    return () => { cancelAnimationFrame(id1); cancelAnimationFrame(id2); };
  }, [content]);

  return (
    <div className="ide-layout-wrapper" data-immune-harness="true" data-mode={mode} style={{ background: '#040409', minHeight: '100vh' }}>
      <div
        className={`editor-body${isEditable ? '' : ' read-only'}`}
        style={{ width: widthPx, height: 640, position: 'relative', margin: '0 auto' }}
      >
        <div
          className="editor-textarea-wrapper"
          style={{ width: '100%', height: '100%', position: 'relative' }}
        >
          <ScrollEditor
            title="Immune Harness"
            content={content}
            isEditable={isEditable}
            isTruesight={true}
            isLatticeGrid={true}
            analysisMode="rhyme"
            analyzedWords={new Map()}
            activeConnections={[]}
            highlightedLines={[]}
            ideMode={isEditable ? 'EDIT' : 'TRUESIGHT'}
            onContentChange={() => {}}
            onWordActivate={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
