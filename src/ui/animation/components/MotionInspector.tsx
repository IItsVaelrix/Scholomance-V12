import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  ChevronRight,
  ChevronDown,
  X,
  Search,
  Clock,
  Cpu,
  AlertTriangle,
  Info,
  Terminal,
  Trash2,
  Copy,
  Layers
} from 'lucide-react';
import {
  getAllActiveAnimations,
  getAmpStatus,
  clearActiveAnimation,
  buildOutputTrace,
  getStageSummary,
  formatTraceJson,
  formatTraceMarkdown,
  debugPrintTrace,
  debugPrintPerformance
} from '../../../lib/amp-client.js';
import { useResolvedMotion } from '../hooks/useResolvedMotion';
import type { ResolvedMotionOutput } from '../../../types/animation';
import './MotionInspector.css';

interface TraceEntry {
  timestamp: number;
  processorId: string;
  stage: string;
  changed: string[];
}

type StageSummary = Record<string, { count: number; processors: string[]; totalTimeMs: number }>;

/**
 * MotionInspector Component
 * 
 * A developer tool for inspecting active animations, traces, and performance data.
 * Features:
 * - List of all active animations
 * - Detailed processor traces per animation
 * - Performance metrics (processing time, processor count)
 * - Diagnostic messages and warnings
 * - Bytecode preview
 */
export const MotionInspector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [activeAnimations, setActiveAnimations] = useState<Map<string, ResolvedMotionOutput>>(new Map());
  const [status, setStatus] = useState<{ isRunning: boolean; activeCount: number; config: { debug: boolean } }>({ isRunning: false, activeCount: 0, config: { debug: false } });
  const [filter, setFilter] = useState('');

  // Poll for updates
  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      const [animations, s] = await Promise.all([
        getAllActiveAnimations(),
        getAmpStatus()
      ]);
      setActiveAnimations(new Map(animations));
      setStatus(s as { isRunning: boolean; activeCount: number; config: { debug: boolean } });
    };

    fetchData();
    const interval = setInterval(fetchData, 500);

    return () => clearInterval(interval);
  }, [isOpen]);

  const filteredAnimations = Array.from(activeAnimations.entries()).filter(
    ([id, output]) =>
      id.toLowerCase().includes(filter.toLowerCase()) ||
      output.renderer.toLowerCase().includes(filter.toLowerCase())
  );

  // Live per-target read straight from the AMP registry (fresher than the 500ms
  // list poll). Falls back to the list snapshot if the live read is empty.
  const liveSelected = useResolvedMotion(selectedTargetId);
  const selectedAnimation = liveSelected
    ?? (selectedTargetId ? activeAnimations.get(selectedTargetId) ?? null : null);

  // Prune a stale target from the registry (clearActiveAnimation is otherwise
  // never called, so the Map only grows).
  const handleClear = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await clearActiveAnimation(id);
    if (selectedTargetId === id) setSelectedTargetId(null);
    setActiveAnimations((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  if (!isOpen) {
    return (
      <button 
        className="motion-inspector-toggle"
        onClick={() => setIsOpen(true)}
        title="Open Motion Inspector"
      >
        <Activity size={20} />
        {activeAnimations.size > 0 && (
          <span className="motion-badge-count">{activeAnimations.size}</span>
        )}
      </button>
    );
  }

  return (
    <div className="motion-inspector-overlay">
      <motion.div 
        className="motion-inspector-panel"
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 300, opacity: 0 }}
      >
        <header className="motion-inspector-header">
          <div className="motion-inspector-title">
            <Activity size={18} className="motion-icon-active" />
            <span>Motion Inspector</span>
          </div>
          <div className="motion-inspector-actions">
            <button onClick={() => setIsOpen(false)} className="motion-close-btn">
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="motion-inspector-status">
          <div className="status-item">
            <span className="status-label">Status:</span>
            <span className={`status-value ${status.isRunning ? 'running' : 'stopped'}`}>
              {status.isRunning ? 'Running' : 'Stopped'}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Active:</span>
            <span className="status-value">{status.activeCount}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Debug:</span>
            <span className={`status-value ${status.config.debug ? 'enabled' : 'disabled'}`}>
              {status.config.debug ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>

        <div className="motion-inspector-search">
          <Search size={14} className="search-icon" />
          <input 
            type="text" 
            placeholder="Filter targetId..." 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        <div className="motion-inspector-content">
          <div className="motion-target-list">
            {filteredAnimations.length === 0 ? (
              <div className="empty-state">No active animations</div>
            ) : (
              filteredAnimations.map(([id, output]) => (
                <div 
                  key={id} 
                  className={`motion-target-item ${selectedTargetId === id ? 'selected' : ''}`}
                  onClick={() => setSelectedTargetId(id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedTargetId(id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="target-info">
                    <span className="target-id">{id}</span>
                    <span className="target-renderer">{output.renderer}</span>
                  </div>
                  <button
                    className="motion-clear-btn"
                    onClick={(e) => handleClear(id, e)}
                    title="Clear from registry"
                  >
                    <Trash2 size={12} />
                  </button>
                  <ChevronRight size={14} />
                </div>
              ))
            )}
          </div>

          <div className="motion-details-pane">
            {selectedAnimation ? (
              <AnimationDetails output={selectedAnimation} />
            ) : (
              <div className="details-placeholder">
                <Info size={32} />
                <span>Select an animation to inspect</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const AnimationDetails: React.FC<{ output: ResolvedMotionOutput }> = ({ output }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>('trace');
  const [trace, setTrace] = useState<TraceEntry[]>([]);
  const [stageSummary, setStageSummary] = useState<StageSummary>({});

  // Build the diagnostic trace + stage rollup through the motion-trace module.
  useEffect(() => {
    let active = true;
    (async () => {
      const built = (await buildOutputTrace(output)) as TraceEntry[];
      if (!active) return;
      setTrace(built);
      setStageSummary((await getStageSummary(built)) as StageSummary);
    })();
    return () => { active = false; };
  }, [output]);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const copyTraceJson = async () => {
    const json = await formatTraceJson(trace);
    navigator.clipboard?.writeText(json);
  };
  const copyTraceMarkdown = async () => {
    const md = await formatTraceMarkdown(trace);
    navigator.clipboard?.writeText(md);
  };

  return (
    <div className="animation-details">
      <div className="details-header">
        <h3>{output.targetId}</h3>
        <div className="trace-actions">
          <button className="trace-action-btn" onClick={copyTraceJson} title="Copy trace as JSON">
            <Copy size={12} /> JSON
          </button>
          <button className="trace-action-btn" onClick={copyTraceMarkdown} title="Copy trace as Markdown">
            <Copy size={12} /> MD
          </button>
          <button className="trace-action-btn" onClick={() => debugPrintTrace(trace)} title="Print trace to console">
            <Terminal size={12} /> Trace
          </button>
          <button className="trace-action-btn" onClick={() => debugPrintPerformance(trace)} title="Print performance analysis to console">
            <Terminal size={12} /> Perf
          </button>
        </div>
        <div className="performance-chips">
          {output.performance && (
            <>
              <span className="chip perf">
                <Clock size={12} /> {output.performance.processingTimeMs.toFixed(2)}ms
              </span>
              <span className="chip cpu">
                <Cpu size={12} /> {output.performance.processorCount} procs
              </span>
              {output.performance.reducedMotion && (
                <span className="chip warn">Reduced</span>
              )}
            </>
          )}
        </div>
      </div>

      <Section 
        title="Resolved Values" 
        id="values" 
        isOpen={expandedSection === 'values'} 
        onToggle={() => toggleSection('values')}
      >
        <div className="values-grid">
          {Object.entries(output.values).map(([key, value]) => (
            <div key={key} className="value-item">
              <span className="value-key">{key}:</span>
              <span className="value-val">
                {typeof value === 'number' ? value.toFixed(2) : String(value)}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title={`Trace (${trace.length} steps)`}
        id="trace"
        isOpen={expandedSection === 'trace'}
        onToggle={() => toggleSection('trace')}
      >
        <div className="trace-list">
          {trace.map((step, idx) => (
            <div key={`${step.processorId}-${idx}`} className="trace-step">
              <div className="step-header">
                <span className={`stage-tag ${step.stage}`}>{step.stage}</span>
                <span className="processor-name">{step.processorId}</span>
              </div>
              <div className="step-changes">
                {step.changed.map(c => (
                  <span key={c} className="change-tag">{c}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title={`Stage Summary (${Object.keys(stageSummary).length})`}
        id="stages"
        isOpen={expandedSection === 'stages'}
        onToggle={() => toggleSection('stages')}
        icon={<Layers size={14} />}
      >
        <div className="stage-summary-list">
          {Object.entries(stageSummary).map(([stage, info]) => (
            <div key={stage} className="stage-summary-item">
              <span className={`stage-tag ${stage}`}>{stage}</span>
              <span className="stage-meta">
                {info.count} proc · {info.totalTimeMs.toFixed(1)}ms
              </span>
            </div>
          ))}
        </div>
      </Section>

      {output.diagnostics.length > 0 && (
        <Section 
          title={`Diagnostics (${output.diagnostics.length})`} 
          id="diagnostics" 
          isOpen={expandedSection === 'diagnostics'} 
          onToggle={() => toggleSection('diagnostics')}
          icon={<AlertTriangle size={14} className="text-warn" />}
        >
          <div className="diagnostics-list">
            {output.diagnostics.map((msg, idx) => (
              <div key={idx} className="diagnostic-item">
                <AlertTriangle size={12} />
                <span>{msg}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {output.photonicRoute && (
        <Section
          title="Photonic Route"
          id="photonic"
          isOpen={expandedSection === 'photonic'}
          onToggle={() => toggleSection('photonic')}
          icon={<Cpu size={14} />}
        >
          <div className="photonic-route-grid">
            <div className="photonic-route-cell">
              <span>Retina</span>
              <strong>{output.photonicRoute.preview?.values?.length ?? 0}B</strong>
            </div>
            <div className="photonic-route-cell">
              <span>Bridge</span>
              <strong>{String((output.photonicRoute.bridgeReport as any)?.compatibilityGrade ?? 'N/A')}</strong>
            </div>
            <div className="photonic-route-cell">
              <span>Optical</span>
              <strong>{Math.round((Number(output.photonicRoute.opticalSimulation?.opticalFit) || 0) * 100)}%</strong>
            </div>
            <div className="photonic-route-cell">
              <span>Delta</span>
              <strong>{output.photonicRoute.delta?.changedCount ?? 0}</strong>
            </div>
          </div>
          <div className="photonic-route-strip" aria-label="Animation AMP photonic preview bytes">
            {(output.photonicRoute.preview?.values ?? []).slice(0, 24).map((value, index) => (
              <span
                key={`${index}-${value}`}
                className={`photonic-route-byte ${value < 0 ? 'negative' : value > 0 ? 'positive' : 'zero'}`}
                title={`Byte ${index}: ${value}`}
              />
            ))}
          </div>
        </Section>
      )}

      {output.bytecode && output.bytecode.length > 0 && (
        <Section 
          title="Bytecode" 
          id="bytecode" 
          isOpen={expandedSection === 'bytecode'} 
          onToggle={() => toggleSection('bytecode')}
          icon={<Terminal size={14} />}
        >
          <div className="bytecode-container">
            <pre>{output.bytecode.join('\n')}</pre>
          </div>
        </Section>
      )}
    </div>
  );
};

const Section: React.FC<{ 
  title: string; 
  id: string; 
  isOpen: boolean; 
  onToggle: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, isOpen, onToggle, icon, children }) => {
  return (
    <div className={`details-section ${isOpen ? 'open' : ''}`}>
      <button className="section-header" onClick={onToggle}>
        <div className="section-title">
          {icon}
          <span>{title}</span>
        </div>
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="section-content"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
