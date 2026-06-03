import React, { useState, useMemo, useEffect } from 'react';
import { analyzePhotonicQuantizationBridge, PHOTONIC_BRIDGE_MODES, getAvailableBackends, simulateHardwareBackend } from '../../../lib/engine.adapter.js';
import './photonicBridgeLab.css';

const PRESETS = {
  perfectPhotonic: {
    label: 'Perfect Photonic',
    packet: {
      packetId: 'preset_perfect',
      sourceKind: 'kv-cache',
      dimension: 4096,
      bitWidth: 3,
      storageKind: 'packed',
      rotationKind: 'random-rotation',
      quantizationKind: 'polar',
      residualKind: 'qjl',
      targetOperation: 'inner-product',
    }
  },
  heavyElectronic: {
    label: 'Heavy Electronic',
    packet: {
      packetId: 'preset_heavy',
      sourceKind: 'manual',
      dimension: 32,
      bitWidth: 32,
      storageKind: 'float32',
      rotationKind: 'none',
      quantizationKind: 'none',
      residualKind: 'none',
      targetOperation: 'diagnostic',
    }
  }
};

export default function PhotonicBridgeLab() {
  const [packetConfig, setPacketConfig] = useState({ ...PRESETS.perfectPhotonic.packet });
  const [mode, setMode] = useState(PHOTONIC_BRIDGE_MODES.SHADOW);
  const [backends, setBackends] = useState([]);
  const [selectedBackendId, setSelectedBackendId] = useState('');

  useEffect(() => {
    const available = getAvailableBackends();
    setBackends(available);
    if (available.length > 0) {
      setSelectedBackendId(available[0].id);
    }
  }, []);

  const report = useMemo(() => {
    return analyzePhotonicQuantizationBridge(packetConfig, { mode });
  }, [packetConfig, mode]);

  const hwReport = useMemo(() => {
    if (!report.operationGraph || !selectedBackendId) return null;
    return simulateHardwareBackend(packetConfig, report.operationGraph, selectedBackendId);
  }, [packetConfig, report.operationGraph, selectedBackendId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPacketConfig(prev => ({
      ...prev,
      [name]: name === 'dimension' || name === 'bitWidth' ? parseInt(value) || 1 : value
    }));
  };

  return (
    <div className="photonic-bridge-lab">
      <h1>Photonic Bridge Lab</h1>
      <p className="subtitle">
        Internal diagnostic UI for Phase 1 of the Photonic Quantization Bridge (Software Simulator).
      </p>

      <div className="presets">
        {Object.values(PRESETS).map(preset => (
          <button 
            key={preset.label}
            className="preset-btn"
            onClick={() => setPacketConfig({ ...preset.packet })}
          >
            Load {preset.label}
          </button>
        ))}
      </div>

      <div className="lab-container">
        <div className="panel configuration-panel">
          <h2>Packet Configuration</h2>
          
          <div className="control-group">
            <label>Mode</label>
            <select value={mode} onChange={e => setMode(e.target.value)}>
              {Object.values(PHOTONIC_BRIDGE_MODES).map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="control-group" style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(167, 139, 250, 0.1)', border: '1px solid rgba(167, 139, 250, 0.2)', borderRadius: '4px' }}>
            <label style={{ color: '#a78bfa' }}>Target Hardware Backend (Phase 5 Simulator)</label>
            <select value={selectedBackendId} onChange={e => setSelectedBackendId(e.target.value)}>
              {backends.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.type})</option>
              ))}
            </select>
          </div>

          <hr style={{ margin: '2rem 0', borderColor: 'rgba(255,255,255,0.1)' }} />

          <div className="control-group">
            <label>Packet ID</label>
            <input type="text" name="packetId" value={packetConfig.packetId} onChange={handleChange} />
          </div>

          <div className="control-group">
            <label>Source Kind</label>
            <select name="sourceKind" value={packetConfig.sourceKind} onChange={handleChange}>
              <option value="kv-cache">kv-cache</option>
              <option value="embedding">embedding</option>
              <option value="attention-probe">attention-probe</option>
              <option value="manual">manual</option>
            </select>
          </div>

          <div className="control-group">
            <label>Dimension</label>
            <input type="number" name="dimension" value={packetConfig.dimension} onChange={handleChange} />
          </div>

          <div className="control-group">
            <label>Bit Width</label>
            <select name="bitWidth" value={packetConfig.bitWidth} onChange={handleChange}>
              {[1, 2, 3, 4, 8, 16, 32].map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label>Storage Kind</label>
            <select name="storageKind" value={packetConfig.storageKind} onChange={handleChange}>
              <option value="float32">float32</option>
              <option value="int8">int8</option>
              <option value="int4">int4</option>
              <option value="int2">int2</option>
              <option value="binary">binary</option>
              <option value="packed">packed</option>
            </select>
          </div>

          <div className="control-group">
            <label>Rotation Kind</label>
            <select name="rotationKind" value={packetConfig.rotationKind} onChange={handleChange}>
              <option value="none">none</option>
              <option value="random-rotation">random-rotation</option>
              <option value="hadamard">hadamard</option>
              <option value="polar">polar</option>
              <option value="custom">custom</option>
            </select>
          </div>

          <div className="control-group">
            <label>Quantization Kind</label>
            <select name="quantizationKind" value={packetConfig.quantizationKind} onChange={handleChange}>
              <option value="none">none</option>
              <option value="scalar">scalar</option>
              <option value="polar">polar</option>
              <option value="qjl-residual">qjl-residual</option>
              <option value="custom">custom</option>
            </select>
          </div>

          <div className="control-group">
            <label>Residual Kind</label>
            <select name="residualKind" value={packetConfig.residualKind} onChange={handleChange}>
              <option value="none">none</option>
              <option value="qjl">qjl</option>
              <option value="sign-bit">sign-bit</option>
              <option value="residual-codebook">residual-codebook</option>
              <option value="custom">custom</option>
            </select>
          </div>

          <div className="control-group">
            <label>Target Operation</label>
            <select name="targetOperation" value={packetConfig.targetOperation} onChange={handleChange}>
              <option value="inner-product">inner-product</option>
              <option value="matrix-vector">matrix-vector</option>
              <option value="matrix-matrix">matrix-matrix</option>
              <option value="similarity-search">similarity-search</option>
              <option value="diagnostic">diagnostic</option>
            </select>
          </div>

        </div>

        <div className="panel report-panel">
          <h2>Simulation Report</h2>

          <div className="report-section">
            <div className="score-display">
              <div className={`score-grade grade-${report.compatibilityGrade.toLowerCase()}`}>
                {report.compatibilityGrade}
              </div>
              <div className="score-value">
                Score: {report.compatibilityScore.toFixed(4)}
              </div>
            </div>
          </div>

          {report.diagnostics && report.diagnostics.length > 0 && (
            <div className="report-section">
              <h3>Diagnostics</h3>
              <div className="diagnostics-list">
                {report.diagnostics.map((diag, i) => (
                  <div key={i} className={`diagnostic-item severity-${diag.severity}`}>
                    <strong>{diag.code}</strong>
                    {diag.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.operationGraph && (
            <div className="report-section">
              <h3>Operation Graph</h3>
              <div className="op-graph">
                {report.operationGraph.operations.map((op, i) => (
                  <div key={i} className={`op-node class-${op.executionClass}`}>
                    <div>
                      <div className="op-kind">{op.kind}</div>
                      <div className="op-id">{op.id}</div>
                    </div>
                    <div className="op-class">{op.executionClass}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {hwReport && (
            <div className="hw-report">
              <h3>Calibrated Execution Report</h3>
              <div className="hw-metrics">
                <div className="hw-metric">
                  <span className="hw-metric-label">Latency</span>
                  <span className="hw-metric-value">{hwReport.estimatedLatencyNs.toFixed(2)} ns</span>
                </div>
                <div className="hw-metric">
                  <span className="hw-metric-label">Power</span>
                  <span className="hw-metric-value">{hwReport.estimatedPowerPj.toFixed(2)} pJ</span>
                </div>
                <div className="hw-metric">
                  <span className="hw-metric-label">Photonic Ops</span>
                  <span className="hw-metric-value">{hwReport.photonicOpCount}</span>
                </div>
                <div className="hw-metric">
                  <span className="hw-metric-label">Electronic Ops</span>
                  <span className="hw-metric-value">{hwReport.electronicOpCount}</span>
                </div>
              </div>
              
              {hwReport.bottlenecks.length > 0 && (
                <div className="bottleneck-list">
                  <h4>Execution Bottlenecks</h4>
                  <ul>
                    {hwReport.bottlenecks.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
