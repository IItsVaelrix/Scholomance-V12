import React, { useEffect, useState } from 'react';
import { useAmbientPlayer } from '../../../hooks/useAmbientPlayer';
import { AMBIENT_PLAYER_EVENTS } from '../ambientPlayer.service';
import './ResonanceDebugPanel.css';

export default function ResonanceDebugPanel() {
  const { player } = useAmbientPlayer();
  const [tick, setTick] = useState(null);
  const [status, setStatus] = useState('Idle');

  useEffect(() => {
    if (!player || typeof player.on !== 'function') return;

    const unsubTick = player.on(AMBIENT_PLAYER_EVENTS.RESONANCE_TICK, (t) => {
      setTick(t);
    });
    
    const unsubLoading = player.on(AMBIENT_PLAYER_EVENTS.RESONANCE_LOADING, (payload) => {
      setStatus(`Loading sidecar for ${payload.fingerprintId}...`);
    });

    const unsubReady = player.on(AMBIENT_PLAYER_EVENTS.RESONANCE_READY, () => {
      setStatus('Ready (Compiled Sidecar)');
    });

    const unsubUnavailable = player.on(AMBIENT_PLAYER_EVENTS.RESONANCE_UNAVAILABLE, () => {
      setStatus('Unavailable (No Sidecar / Live Analyser Only)');
      setTick(null);
    });

    const unsubError = player.on(AMBIENT_PLAYER_EVENTS.RESONANCE_ERROR, (payload) => {
      setStatus(`Error: ${payload.error}`);
      setTick(null);
    });

    return () => {
      unsubTick();
      unsubLoading();
      unsubReady();
      unsubUnavailable();
      unsubError();
    };
  }, [player]);

  if (!player) return null;

  return (
    <div className="resonance-debug-panel">
      <h4>Resonance Bytecode Pipeline</h4>
      <div className="status-indicator">
        Status: <span className="status-value">{status}</span>
      </div>
      
      {tick && (
        <div className="tick-data">
          <div className="tick-header">
            <div>Track: {tick.trackId}</div>
            <div>Time: {(tick.playbackTimeMs / 1000).toFixed(3)}s</div>
          </div>
          
          <div className="layer-section">
            <h5>Spectral Layer</h5>
            <div className="data-grid">
              {Object.entries(tick.spectral || {}).map(([k, v]) => (
                <div key={k} className="data-row">
                  <span className="key">{k}</span>
                  <span className="value">{typeof v === 'number' ? v.toFixed(3) : String(v)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="layer-section">
            <h5>Resonance Layer</h5>
            <div className="data-grid">
              {Object.entries(tick.resonance || {}).map(([k, v]) => (
                <div key={k} className="data-row">
                  <span className="key">{k}</span>
                  <span className="value">{typeof v === 'number' ? v.toFixed(3) : String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
