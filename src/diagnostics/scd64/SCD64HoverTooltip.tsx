import React, { useState } from 'react';
import { decodeSCD64Hover } from '../../core/scd64/decodeSCD64';
import type { SCD64HoverDecodeResponse } from '../../core/scd64/types';

export const SCD64HoverTooltip: React.FC<{ checksum64: string }> = ({ checksum64 }) => {
  const [decoded, setDecoded] = useState<SCD64HoverDecodeResponse | null>(null);

  const handleMouseEnter = () => {
    if (!decoded) {
      setDecoded(decodeSCD64Hover(checksum64));
    }
  };

  return (
    <div className="scd64-tooltip-container" onMouseEnter={handleMouseEnter} style={{ position: 'relative', display: 'inline-block' }}>
      <span className="scd64-checksum" style={{ fontFamily: 'monospace', borderBottom: '1px dotted #888', cursor: 'help' }}>
        {checksum64}
      </span>
      {decoded && (
        <div className="scd64-tooltip-popup" style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          backgroundColor: '#1e1e1e',
          color: '#d4d4d4',
          padding: '10px',
          borderRadius: '4px',
          border: '1px solid #333',
          zIndex: 1000,
          width: '400px',
          fontFamily: 'monospace',
          fontSize: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
        }}>
          {!decoded.valid ? (
            <div style={{ color: '#f44336' }}>Invalid SCD64 Format</div>
          ) : (
            <>
              <div style={{ fontWeight: 'bold', color: '#4caf50', marginBottom: '8px' }}>
                [v{parseInt(decoded.versionByte, 16) || 1}] {decoded.bugFamily}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {decoded.slots.map(slot => (
                  <div key={slot.index} style={{ display: 'grid', gridTemplateColumns: '80px 1fr' }}>
                    <span style={{ color: '#569cd6' }}>{slot.name}:</span>
                    <span>{slot.meaning}</span>
                  </div>
                ))}
              </div>
              {decoded.remediationHints && decoded.remediationHints.length > 0 && (
                <div style={{ marginTop: '12px', borderTop: '1px solid #444', paddingTop: '8px' }}>
                  <div style={{ color: '#ce9178', marginBottom: '4px' }}>Remediation Hints:</div>
                  <ul style={{ margin: 0, paddingLeft: '16px' }}>
                    {decoded.remediationHints.map((hint, i) => (
                      <li key={i}>{typeof hint === 'string' ? hint : hint.message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
