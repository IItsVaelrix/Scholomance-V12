/**
 * AMP APPLY PANEL
 * System 5: AMP-Aware Editing - the key differentiator.
 * Allows passing current layer or selection through registered AMPs (sharpness, chromatic, intensity, etc.).
 * Non-destructive by default (new layer + provenance).
 */
import React, { useState } from 'react';
import { getRegisteredAMPs } from '../../../lib/pixelbrain.adapter.js';

const AVAILABLE_AMPS = getRegisteredAMPs();

export function AMPApplyPanel({
  grid,
  activeLayerIndex = 0,
  selectionCells = [],
  onApplyAMP,              // (ampId, options, createNewLayer) => void
  onPreviewAMP,            // optional live preview callback
  isPreviewing = false,
  onCommitPreview,
  onDiscardPreview,
  intensityData = {},
} = {}) {
  const [selectedAMP, setSelectedAMP] = useState(AVAILABLE_AMPS[0].id);
  const [createNew, setCreateNew] = useState(true);
  const [lastResult, setLastResult] = useState(null);

  const currentAMP = AVAILABLE_AMPS.find(a => a.id === selectedAMP) || AVAILABLE_AMPS[0];

  const handleApply = () => {
    if (!onApplyAMP) return;
    const options = {
      ampName: currentAMP.ampName,
      intensityData,
      selectionSize: selectionCells.length,
    };
    const res = onApplyAMP(selectedAMP, options, createNew);
    setLastResult(res);
  };

  const handlePreview = () => {
    if (!onPreviewAMP) {
      // fallback
      return handleApply();
    }
    const options = {
      ampName: currentAMP.ampName,
      intensityData,
      selectionSize: selectionCells.length,
    };
    const res = onPreviewAMP(selectedAMP, options, createNew);
    setLastResult(res);
  };

  const targetDesc = selectionCells.length > 0
    ? `${selectionCells.length} selected cells`
    : `layer ${activeLayerIndex}`;

  return (
    <div className="amp-apply-panel" style={{ border: '1px solid #444', padding: 8, background: '#1a1a2e', color: '#ddd', fontSize: 11 }}>
      <strong>AMP-AWARE EDITING</strong> <span style={{ color: '#4a9', fontSize: 9 }}>(System 5)</span>

      <div style={{ margin: '6px 0' }}>
        <select value={selectedAMP} onChange={e => setSelectedAMP(e.target.value)} style={{ width: '100%', background: '#222', color: '#ddd', border: '1px solid #555' }}>
          {AVAILABLE_AMPS.map(amp => (
            <option key={amp.id} value={amp.id}>{amp.label}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <label htmlFor="ampNewLayer" style={{ fontSize: 10 }}>
          <input id="ampNewLayer" type="checkbox" checked={createNew} onChange={e => setCreateNew(e.target.checked)} /> New layer (non-destructive)
        </label>
      </div>

      {!isPreviewing ? (
        <>
          <button
            onClick={handlePreview}
            style={{ width: '100%', padding: '4px 8px', background: '#4a9', color: '#fff', border: 'none', cursor: 'pointer', marginBottom: 4 }}
            title={`Preview ${currentAMP.label} (non-destructive)`}
          >
            PREVIEW {currentAMP.label.toUpperCase()} → {targetDesc}
          </button>
          <button
            onClick={handleApply}
            style={{ width: '100%', padding: '4px 8px', background: '#2a5', color: '#fff', border: 'none', cursor: 'pointer' }}
            title={`Apply ${currentAMP.label} to ${targetDesc}`}
          >
            APPLY (COMMIT) {currentAMP.label.toUpperCase()} → {targetDesc}
          </button>
        </>
      ) : (
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={onCommitPreview}
            style={{ flex: 1, padding: '4px 8px', background: '#2a5', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            COMMIT PREVIEW
          </button>
          <button
            onClick={onDiscardPreview}
            style={{ flex: 1, padding: '4px 8px', background: '#a33', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            DISCARD
          </button>
        </div>
      )}

      {lastResult && (
        <div style={{ fontSize: 9, marginTop: 4, color: lastResult.isPreview ? '#ff8' : '#8a8' }}>
          {lastResult.isPreview ? 'PREVIEWING: ' : 'Last: '}{lastResult.description || 'AMP applied'} (provenance recorded)
        </div>
      )}

      <div style={{ fontSize: 9, marginTop: 6, color: '#888' }}>
        Draw → select/layer → PREVIEW or APPLY AMPs → export packet with full history. Undo (Ctrl+Z) always available.
      </div>
    </div>
  );
}
