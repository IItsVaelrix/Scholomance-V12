import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, FileAudio, Pause, Radio, Siren, Snowflake, Upload } from 'lucide-react';
import { compileManifoldDsl, getFactoryManifoldPresets } from '../../lib/manifold.adapter.js';
import './ManifoldPage.css';

const MACRO_LABELS = [
  ['size', 'Size'],
  ['reactivity', 'Reactivity'],
  ['stability', 'Stability'],
  ['material', 'Material'],
  ['scatter', 'Scatter'],
  ['fracture', 'Fracture'],
  ['gravity', 'Gravity'],
  ['bloom', 'Bloom'],
  ['wetDry', 'Wet/Dry'],
];

export default function ManifoldPage() {
  const presets = useMemo(() => getFactoryManifoldPresets(), []);
  const [selectedPresetName, setSelectedPresetName] = useState(presets[0]?.name ?? '');
  const [dslSource, setDslSource] = useState(presets[0]?.dslSource ?? '');
  const [macros, setMacros] = useState(presets[0]?.macros ?? {});
  const [freeze, setFreeze] = useState(false);
  const [engineStatus, setEngineStatus] = useState('idle');
  const [eventBatch, setEventBatch] = useState([]);
  const [audioFile, setAudioFile] = useState(null);
  const engineRef = useRef(null);
  const micStreamRef = useRef(null);

  const compileResult = useMemo(() => compileManifoldDsl(dslSource), [dslSource]);
  const activePreset = presets.find((preset) => preset.name === selectedPresetName) ?? presets[0];
  const visualZones = compileResult.ok
    ? compileResult.program.graph.zones.map((zone) => {
      const positioned = activePreset?.visualLayout?.zones?.find((item) => item.id === zone.id);
      return { ...zone, positioned: Boolean(positioned) };
    })
    : [];

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      stopMicStream();
    };
  }, []);

  async function ensureEngine() {
    if (engineRef.current) return engineRef.current;
    const { createCochlearManifold } = await import('../../audio/manifold/cochlear-manifold.browser.js');
    const engine = createCochlearManifold();
    engine.onMessage((message) => {
      if (message?.type === 'MANIFOLD_STATUS') {
        setEngineStatus(message.payload?.status ?? 'status');
      }
      if (message?.type === 'MANIFOLD_EVENT_BATCH') {
        setEventBatch(message.payload?.events ?? []);
      }
    });
    engineRef.current = engine;
    await engine.prepare();
    engine.connect(engine.context.destination);
    return engine;
  }

  function stopMicStream() {
    for (const track of micStreamRef.current?.getTracks?.() ?? []) {
      track.stop();
    }
    micStreamRef.current = null;
  }

  function loadPreset(preset) {
    setSelectedPresetName(preset.name);
    setDslSource(preset.dslSource);
    setMacros(preset.macros);
    setEventBatch([]);
  }

  function updateMacro(id, value) {
    const next = { ...macros, [id]: Number(value) };
    setMacros(next);
    engineRef.current?.setMacros(next);
  }

  async function loadProgram() {
    if (!compileResult.ok) return;
    const engine = await ensureEngine();
    await engine.loadProgram(compileResult.program);
    await engine.setMacros(macros);
    setEngineStatus('program_loaded');
  }

  async function toggleFreeze() {
    const next = !freeze;
    setFreeze(next);
    const engine = await ensureEngine();
    await engine.setFreeze(next);
  }

  async function panic() {
    const engine = await ensureEngine();
    engine.panic();
    setFreeze(false);
    setEngineStatus('panic');
  }

  async function armMic() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setEngineStatus('mic_unavailable');
      return;
    }
    const engine = await ensureEngine();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      stopMicStream();
      micStreamRef.current = stream;
      const source = engine.context.createMediaStreamSource(stream);
      source.connect(engine.input);
      setEngineStatus('mic_armed');
    } catch {
      setEngineStatus('mic_denied');
    }
  }

  function handleFileDrop(event) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) setAudioFile({ name: file.name, size: file.size, type: file.type || 'audio' });
  }

  function handleFilePick(event) {
    const file = event.target.files?.[0];
    if (file) setAudioFile({ name: file.name, size: file.size, type: file.type || 'audio' });
  }

  return (
    <main className="manifold-page" aria-labelledby="manifold-title">
      <header className="manifold-header">
        <div>
          <h1 id="manifold-title">Cochlear Manifold</h1>
          <p>Compiled Adaptive DSP Manifold</p>
        </div>
        <div className="manifold-transport" aria-label="Manifold transport">
          <button type="button" onClick={loadProgram} disabled={!compileResult.ok} aria-label="Load compiled manifold program">
            <Activity size={18} /> Load
          </button>
          <button type="button" onClick={toggleFreeze} aria-pressed={freeze} aria-label="Freeze manifold tail">
            {freeze ? <Pause size={18} /> : <Snowflake size={18} />} Freeze
          </button>
          <button type="button" className="panic" onClick={panic} aria-label="Panic reset manifold energy">
            <Siren size={18} /> Panic
          </button>
        </div>
      </header>

      <section className="manifold-grid">
        <aside className="manifold-panel preset-panel" aria-label="Factory presets">
          <h2>Presets</h2>
          <div className="manifold-preset-list">
            {presets.map((preset) => (
              <button
                type="button"
                key={preset.name}
                className={preset.name === selectedPresetName ? 'active' : ''}
                onClick={() => loadPreset(preset)}
                aria-pressed={preset.name === selectedPresetName}
              >
                {preset.name}
              </button>
            ))}
          </div>

          <div className="drop-zone" onDrop={handleFileDrop} onDragOver={(event) => event.preventDefault()}>
            <FileAudio size={22} />
            <label htmlFor="manifold-audio-file">Audio File</label>
            <input id="manifold-audio-file" type="file" accept="audio/*" onChange={handleFilePick} />
            {audioFile && (
              <output aria-live="polite">
                {audioFile.name}
              </output>
            )}
          </div>

          <button type="button" className="mic-button" onClick={armMic} aria-label="Arm microphone input">
            <Radio size={18} /> Mic
          </button>
        </aside>

        <section className="manifold-panel macro-panel" aria-label="Simple mode macros">
          <h2>Simple</h2>
          <div className="macro-list">
            {MACRO_LABELS.map(([id, label]) => (
              <label key={id} className="macro-control" htmlFor={`macro-${id}`}>
                <span>{label}</span>
                <input
                  id={`macro-${id}`}
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={macros[id] ?? 0}
                  onChange={(event) => updateMacro(id, event.target.value)}
                />
                <output>{Math.round((macros[id] ?? 0) * 100)}</output>
              </label>
            ))}
          </div>
        </section>

        <section className="manifold-panel zone-panel" aria-label="Visual manifold zones">
          <h2>Zones</h2>
          <div className="zone-map">
            {visualZones.map((zone) => (
              <button
                type="button"
                key={zone.id}
                className={`zone-node zone-${zone.id}`}
                aria-label={`${zone.id} listens to ${zone.listensTo}`}
              >
                <span>{zone.id.replace('_', ' ')}</span>
              </button>
            ))}
          </div>
          <div className="event-strip" aria-live="polite">
            {eventBatch.length === 0 ? (
              <span>Status: {engineStatus}</span>
            ) : eventBatch.map((event) => (
              <span key={`${event.event}-${event.confidence}`}>{event.event} {Math.round(event.confidence * 100)}</span>
            ))}
          </div>
        </section>

        <section className="manifold-panel dsl-panel" aria-label="Advanced manifold DSL editor">
          <div className="panel-heading">
            <h2>Advanced</h2>
            <span className={compileResult.ok ? 'compile-ok' : 'compile-error'} aria-live="polite">
              {compileResult.ok ? `${compileResult.program.instructions.length} ops` : `${compileResult.errors.length} errors`}
            </span>
          </div>
          <label className="dsl-label" htmlFor="manifold-dsl">DSL</label>
          <textarea
            id="manifold-dsl"
            value={dslSource}
            onChange={(event) => setDslSource(event.target.value)}
            spellCheck="false"
          />
        </section>

        <section className="manifold-panel report-panel" aria-label="Compile report">
          <h2>Report</h2>
          {compileResult.ok ? (
            <>
              <dl className="report-list">
                <div><dt>Program</dt><dd>{compileResult.program.id}</dd></div>
                <div><dt>Schema</dt><dd>{compileResult.program.schemaVersion}</dd></div>
                <div><dt>Kernel</dt><dd>{compileResult.program.kernelSemver}</dd></div>
                <div><dt>CPU</dt><dd>{compileResult.program.safety.cpuBudgetClass}</dd></div>
                <div><dt>Feedback</dt><dd>{compileResult.program.safety.maxFeedback}</dd></div>
                <div><dt>Spray</dt><dd>{compileResult.program.safety.maxSprayDensity}</dd></div>
              </dl>
              <ol className="instruction-list">
                {compileResult.program.instructions.map((instruction, index) => (
                  <li key={`${instruction.op}-${index}`}>
                    <code>{instruction.op}</code>
                    <span>{instruction.event ?? instruction.target ?? instruction.node ?? instruction.division ?? instruction.amount}</span>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <ul className="error-list" aria-live="polite">
              {compileResult.errors.map((error) => (
                <li key={error.bytecode}>
                  <strong>{error.code}</strong>
                  <code>{error.bytecode}</code>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </main>
  );
}
