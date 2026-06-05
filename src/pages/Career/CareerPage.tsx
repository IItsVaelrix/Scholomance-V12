import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerHapticPulse, UI_HAPTICS } from '../../lib/platform/haptics';
import { generateSigilFile, SIGIL_VERSION } from '../../lib/career/transmuter';
import { buildSigilDataArchive } from '../../lib/career/sigil-pipeline';
import DataArchiveDrawer, { type DataArchive } from './DataArchiveDrawer';
import './CareerPage.css';

/**
 * CareerPage — The Career Ignition Chamber.
 *
 * Wires the Resonance Alignment Engine (src/lib/career/keyword-gap.js) into the UI:
 * the user supplies their experience AND a target job description, and the page reports
 * a deterministic 0–100 alignment score, the missing JD keywords, and which terms were
 * preserved literally so the transmuter does not delete the very keywords it measured.
 *
 * The score bar reflects the REAL computed score (no longer a cosmetic timer), and the
 * Sigil download is user-initiated (no silent auto-download).
 */

interface KeywordHit {
  term: string;
  kind: 'unigram' | 'bigram';
  weight: number;
  matched: boolean;
  inSkillsLexicon: boolean;
}

interface TorqueConflict {
  jobTerm: string;
  torqueKey: string;
  wouldReplaceWith: string;
}

interface KeywordGapReport {
  score: number;
  rawScore: number;
  matched: KeywordHit[];
  missing: KeywordHit[];
  jobKeywords: KeywordHit[];
  torqueConflicts: TorqueConflict[];
  diagnostics: string[];
}

interface SigilResult {
  sigil: string;
  report: KeywordGapReport;
  archive: DataArchive;
}

const MAX_MISSING_CHIPS = 14;

export default function CareerPage() {
  const [content, setContent] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'TRANSMUTING' | 'COMPLETE'>('IDLE');
  const [scoreFill, setScoreFill] = useState(0);
  const [result, setResult] = useState<SigilResult | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fillTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // -- Ripple Follower ---------------------------------------------
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      containerRef.current.style.setProperty('--mouse-x', `${x}%`);
      containerRef.current.style.setProperty('--mouse-y', `${y}%`);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, []);

  // Clear any in-flight fill animation on unmount.
  useEffect(() => () => {
    if (fillTimer.current) clearInterval(fillTimer.current);
  }, []);

  // High score = green (good), low score = red. Inverse of a depleting health bar:
  // 0 -> #ef4444, 100 -> #22c55e.
  const getScoreColor = (p: number) => {
    const r = Math.round(239 - (239 - 34) * (p / 100));
    const g = Math.round(68 + (197 - 68) * (p / 100));
    const b = Math.round(68 + (94 - 68) * (p / 100));
    return `rgb(${r}, ${g}, ${b})`;
  };

  // Editing either field after a run invalidates the stale report.
  const resetToIdle = () => {
    if (status === 'COMPLETE') {
      setStatus('IDLE');
      setResult(null);
      setScoreFill(0);
      setArchiveOpen(false);
    }
  };

  // -- Ignition Ritual ---------------------------------------------
  const finalizeRitual = useCallback(() => {
    setStatus('COMPLETE');
    triggerHapticPulse(UI_HAPTICS.SUCCESS);
  }, []);

  const handleIgnite = () => {
    if (!content.trim() || status !== 'IDLE') return;

    // The analysis is synchronous and deterministic. We run it up front, then animate
    // the score bar filling to the REAL value — the bar measures the result, it does
    // not fabricate progress.
    const ignite = buildSigilDataArchive(content, jobDescription) as SigilResult;

    setStatus('TRANSMUTING');
    setScoreFill(0);
    setResult(ignite);
    triggerHapticPulse(UI_HAPTICS.HEAVY);

    const target = ignite.report.score;
    const duration = 900;
    const interval = 20;
    const step = Math.max(1, target / (duration / interval));

    if (fillTimer.current) clearInterval(fillTimer.current);
    fillTimer.current = setInterval(() => {
      setScoreFill((prev) => {
        const next = prev + step;
        if (next >= target) {
          if (fillTimer.current) clearInterval(fillTimer.current);
          finalizeRitual();
          return target;
        }
        return next;
      });
    }, interval);
  };

  const handleDownload = () => {
    if (!result) return;
    generateSigilFile(result.sigil);
    triggerHapticPulse(UI_HAPTICS.MEDIUM);
  };

  const hasJd = jobDescription.trim().length > 0;
  const report = result?.report;

  return (
    <div className="career-ignition-chamber">
      <div className="career-bg-noise" />

      {/* -- Page Header ---------------------------------------------- */}
      <motion.header
        className="career-hud-header"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="hud-logo">
          <span className="logo-eyebrow">Linguistic Particle Accelerator</span>
          <span className="logo-text arcade-glow">PROFESSIONAL SCRIBE MATRIX</span>
          <span className="logo-ver">{`${SIGIL_VERSION.toUpperCase()} // CAREER_IGNITION_PROTOCOL`}</span>
        </div>
      </motion.header>

      <motion.div
        className="void-parchment-container"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        ref={containerRef}
      >
        <header className="parchment-header">
          <span className="parchment-title">Career Ignition Matrix</span>
          <div className="parchment-status">
            {status === 'TRANSMUTING' ? '◈ CALIBRATING...' : '◈ READY'}
          </div>
        </header>

        <div className="parchment-body">
          <div className="parchment-field parchment-field--resume">
            <label className="field-label" htmlFor="resume-input">
              Your Experience
            </label>
            <textarea
              id="resume-input"
              className="void-textarea"
              placeholder="Paste your experience or résumé bullets here..."
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                resetToIdle();
              }}
              disabled={status === 'TRANSMUTING'}
            />
          </div>

          <div className="parchment-field parchment-field--jd">
            <label className="field-label" htmlFor="jd-input">
              Target Job Description <span className="field-hint">— measured against your experience</span>
            </label>
            <textarea
              id="jd-input"
              className="void-textarea void-textarea--jd"
              placeholder="Paste the job description you're targeting to measure alignment..."
              value={jobDescription}
              onChange={(e) => {
                setJobDescription(e.target.value);
                resetToIdle();
              }}
              disabled={status === 'TRANSMUTING'}
            />
          </div>
        </div>
        <div className="parchment-ripples" />
      </motion.div>

      <div className="ritual-ignitor-container">
        {status !== 'IDLE' && (
          <div className="score-strip">
            <div className="score-readout">
              <span className="score-value" style={{ color: getScoreColor(scoreFill) }}>
                {Math.round(scoreFill)}
              </span>
              <span className="score-label">Resonance Alignment</span>
            </div>
            <div className="pixel-health-bar">
              <div
                className="health-fill"
                style={{
                  width: `${scoreFill}%`,
                  backgroundColor: getScoreColor(scoreFill),
                  boxShadow: `0 0 10px ${getScoreColor(scoreFill)}`,
                }}
              />
            </div>
          </div>
        )}

        <button
          className="ignite-btn"
          onClick={handleIgnite}
          disabled={!content.trim() || status !== 'IDLE'}
        >
          {status === 'TRANSMUTING' ? 'Fusing Syntax...' : 'Ignite Transmutation'}
        </button>
      </div>

      <AnimatePresence>
        {status === 'COMPLETE' && report && (
          <motion.div
            className="alignment-report"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            {!hasJd && (
              <p className="report-note report-note--warn">
                No job description supplied — score reflects nothing measurable. Paste a
                target JD to see real alignment.
              </p>
            )}

            {hasJd && (
              <>
                <div className="report-section">
                  <h3 className="report-heading">
                    Missing Keywords{' '}
                    <span className="report-count">({report.missing.length})</span>
                  </h3>
                  {report.missing.length === 0 ? (
                    <p className="report-note report-note--good">
                      No gaps detected — your experience covers every scored JD keyword.
                    </p>
                  ) : (
                    <div className="kw-chips">
                      {report.missing.slice(0, MAX_MISSING_CHIPS).map((hit) => (
                        <span
                          key={hit.term}
                          className={`kw-chip${hit.inSkillsLexicon ? ' kw-chip--skill' : ''}`}
                          title={hit.kind === 'bigram' ? 'multi-word skill' : undefined}
                        >
                          {hit.term}
                        </span>
                      ))}
                      {report.missing.length > MAX_MISSING_CHIPS && (
                        <span className="kw-chip kw-chip--more">
                          +{report.missing.length - MAX_MISSING_CHIPS} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {report.torqueConflicts.length > 0 && (
                  <div className="report-section">
                    <h3 className="report-heading">
                      Preserved Literally{' '}
                      <span className="report-count">({report.torqueConflicts.length})</span>
                    </h3>
                    <p className="report-note">
                      These JD terms were kept verbatim instead of being upgraded, so the
                      transmuter doesn&apos;t delete keywords the role asks for:
                    </p>
                    <div className="kw-chips">
                      {report.torqueConflicts.map((c) => (
                        <span key={c.torqueKey} className="kw-chip kw-chip--preserved">
                          {c.jobTerm}
                          <span className="kw-chip-strike"> ⇏ {c.wouldReplaceWith}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="report-section">
              <div className="report-heading-row">
                <h3 className="report-heading">Optimized Sigil</h3>
                <div className="report-heading-actions">
                  {result?.archive && (
                    <button
                      className="archive-link"
                      onClick={() => {
                        setArchiveOpen(true);
                        triggerHapticPulse(UI_HAPTICS.TICK);
                      }}
                    >
                      ⌬ Data Archive
                    </button>
                  )}
                  <button className="download-btn" onClick={handleDownload}>
                    ↓ Download .txt
                  </button>
                </div>
              </div>
              <textarea className="sigil-output" value={result?.sigil ?? ''} readOnly />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DataArchiveDrawer
        open={archiveOpen}
        archive={result?.archive ?? null}
        onClose={() => setArchiveOpen(false)}
      />
    </div>
  );
}
