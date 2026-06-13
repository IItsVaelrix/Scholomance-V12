/**
 * REFERENCE / ANNOTATION PANEL
 * System 8: Drop image → quantize → Reference layer + per-cell annotations + generate editable layers.
 * Leverages existing image-to-pixel-art + semantic bridge (via adapter).
 */
import React, { useState } from 'react';
import {
  createReferenceLayer,
} from '../../../lib/pixelbrain.adapter.js';

export function ReferencePanel({
  onCreateReferenceLayer,     // (layer) => void
  onGenerateEditableLayers,   // (referenceLayer) => void  (creates Structure/Energy/etc.)
  onUploadImage,              // (file) => Promise<analysis + quantizedCells>
} = {}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastRefInfo, setLastRefInfo] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadImage) return;

    setIsProcessing(true);
    try {
      const result = await onUploadImage(file); // { analysis, quantizedCells }
      const refLayer = createReferenceLayer('00_Reference', result.analysis, result.quantizedCells || []);

      if (onCreateReferenceLayer) onCreateReferenceLayer(refLayer);
      setLastRefInfo({ name: refLayer.name, cells: result.quantizedCells?.length || 0 });
    } catch (err) {
      console.error('Reference layer creation failed', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="reference-panel" style={{ border: '1px solid #444', padding: 8, background: '#1a1a2e', color: '#ddd', fontSize: 11 }}>
      <strong>REFERENCE / ANNOTATION (System 8)</strong>

      <div style={{ margin: '8px 0' }}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 10 }}>Drop image for reference layer + annotations</label>
        <input type="file" accept="image/*" onChange={handleFile} disabled={isProcessing} />
      </div>

      {lastRefInfo && (
        <div style={{ fontSize: 10, color: '#8a8' }}>
          Created: {lastRefInfo.name} ({lastRefInfo.cells} cells) — locked, low opacity.
        </div>
      )}

      <button
        onClick={() => {
          if (lastRefInfo && onGenerateEditableLayers) {
            // In real impl the parent would pass the actual layer object
            onGenerateEditableLayers({ name: lastRefInfo.name });
          }
        }}
        disabled={!lastRefInfo}
        style={{ marginTop: 4, width: '100%', fontSize: 11 }}
      >
        Generate Editable Layers (Structure / Energy / Focal...)
      </button>

      <div style={{ fontSize: 9, marginTop: 6, color: '#888' }}>
        Hover cells on Reference for annotations (semantic + image region).
      </div>
    </div>
  );
}
