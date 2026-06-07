/**
 * SHADER FORGE PANEL
 *
 * The primary editor interface for custom shaders.
 * Integrates a live code editor (fragment shader body), real-time compile status
 * diagnostics mapping GLSL log faults to BytecodeError payloads, a WebGL preview
 * viewport, a live uniform parameter inspector, and export download triggers.
 */

import { useState, useMemo, useTransition } from 'react';
import { ShaderSandbox } from './ShaderSandbox.jsx';
import {
  createShaderPacket,
  hashShaderPacket,
  exportToGodotShader,
  exportToPhaserPipeline,
  DEFAULT_FRAGMENT_SOURCE,
  resolveShaderUniforms,
} from '../../../lib/pixelbrain.adapter.js';
import './ShaderForgePanel.css';

export default function ShaderForgePanel({ runtimeState, onDiagnosticEmit }) {
  const [shaderCode, setShaderCode] = useState(DEFAULT_FRAGMENT_SOURCE);
  const [isPlaying, setIsPlaying] = useState(true);
  const [compileError, setCompileError] = useState(null);
  const [, startTransition] = useTransition();

  // Create local packet metadata
  const packet = useMemo(() => {
    return createShaderPacket({
      id: 'custom-sigil-effect',
      label: 'Custom Sigil Effect',
      fragmentSource: shaderCode,
    });
  }, [shaderCode]);

  // Generate unique FNV-1a checksum hash
  const packetHash = useMemo(() => {
    try {
      return hashShaderPacket(packet);
    } catch {
      return 'fnv1a_00000000';
    }
  }, [packet]);

  // Resolve active uniform bindings in real-time
  const resolvedUniforms = useMemo(() => {
    try {
      return resolveShaderUniforms(packet, runtimeState);
    } catch {
      return {};
    }
  }, [packet, runtimeState]);

  // Handles compile errors reported by WebGL
  const handleCompileError = (err) => {
    setCompileError(err);
    if (err && onDiagnosticEmit) {
      onDiagnosticEmit(err);
    }
  };

  const handleCodeChange = (e) => {
    const nextVal = e.target.value;
    startTransition(() => {
      setShaderCode(nextVal);
    });
  };

  const handleReset = () => {
    if (window.confirm('Reset shader code back to default void ripple?')) {
      setShaderCode(DEFAULT_FRAGMENT_SOURCE);
      setCompileError(null);
    }
  };

  const handleExportGodot = () => {
    try {
      const gdCode = exportToGodotShader(packet);
      const blob = new Blob([gdCode], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pixelbrain_${packet.id}.gdshader`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[ShaderForge] Godot export failed:', err);
      handleCompileError(err);
    }
  };

  const handleExportPhaser = () => {
    try {
      const phaserCode = exportToPhaserPipeline(packet);
      const blob = new Blob([phaserCode], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pixelbrain_${packet.id}_pipeline.js`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[ShaderForge] Phaser export failed:', err);
      handleCompileError(err);
    }
  };

  const formatUniformValue = (val) => {
    if (Array.isArray(val)) {
      return `[${val.map(n => n.toFixed(2)).join(', ')}]`;
    }
    if (typeof val === 'number') {
      return val.toFixed(3);
    }
    return String(val);
  };

  return (
    <div className="shader-forge-panel">
      {/* GLSL Code Editor Column */}
      <section className="editor-section">
        <header className="editor-header">
          <span>FRAGMENT SHADER CONTRACT (pbMain)</span>
          <button className="control-btn" onClick={handleReset} type="button">
            RESET_DEFAULT
          </button>
        </header>
        <textarea
          className="glsl-editor-textarea"
          value={shaderCode}
          onChange={handleCodeChange}
          spellCheck="false"
          aria-label="GLSL Shader Code Editor"
        />

        {/* Compile Status Telemetry Box */}
        <div className={`compile-status-box ${compileError ? 'fault' : 'stable'}`}>
          {compileError ? (
            <>
              <div className="status-label fault">STATUS: FAULT (COMPILE_ERROR)</div>
              <div className="fault-details">
                {compileError.context?.message || compileError.message}
              </div>
              {compileError.context?.line && (
                <div className="fault-line">
                  Fault detected at Line {compileError.context.line - 15} (relative to pbMain)
                </div>
              )}
              {compileError.bytecode && (
                <div className="bytecode-display">
                  {compileError.bytecode}
                </div>
              )}
            </>
          ) : (
            <div className="status-label stable">STATUS: STABLE (COMPILED_CLEANLY)</div>
          )}
        </div>
      </section>

      {/* WebGL Preview and Variable Inspector Column */}
      <section className="sidebar-section">
        <div className="preview-container">
          <ShaderSandbox
            shaderCode={shaderCode}
            runtimeState={runtimeState}
            isPlaying={isPlaying}
            onCompileError={handleCompileError}
            canvasSize={{ width: 160, height: 144 }}
          />
        </div>
        
        <div className="preview-controls">
          <button 
            className="control-btn" 
            onClick={() => setIsPlaying(!isPlaying)}
            type="button"
          >
            {isPlaying ? 'PAUSE_SIMULATION' : 'RUN_SIMULATION'}
          </button>
        </div>

        {/* Packet Hash Telemetry */}
        <div className="info-panel">
          <div className="info-title">PACKET HASH (FNV-1a)</div>
          <div className="hash-value">{packetHash}</div>
        </div>

        {/* Live Variable Uniforms Inspector */}
        <div className="uniforms-section">
          <div className="info-title">UNIFORMS INSPECTOR</div>
          <div className="uniforms-list">
            {Object.entries(resolvedUniforms).map(([name, spec]) => (
              <div key={name} className="uniform-item">
                <span className="uniform-name">{name}</span>
                <span className="uniform-value">{formatUniformValue(spec.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Exporter Action Triggers */}
        <div className="actions-section">
          <button 
            className="export-btn" 
            onClick={handleExportGodot}
            disabled={Boolean(compileError)}
            type="button"
          >
            EXPORT_GODOT
          </button>
          <button 
            className="export-btn" 
            onClick={handleExportPhaser}
            disabled={Boolean(compileError)}
            type="button"
          >
            EXPORT_PHASER
          </button>
        </div>
      </section>
    </div>
  );
}
