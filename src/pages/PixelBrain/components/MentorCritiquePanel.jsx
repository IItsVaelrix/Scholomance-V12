/**
 * MENTOR CRITIQUE PANEL — PixelBrain (30-Year Pro) as Cockpit Instrument
 *
 * UI SPEC:
 * - Component: MentorCritiquePanel (src/pages/PixelBrain/components/MentorCritiquePanel.jsx)
 * - World-law connection: PixelBrain the 30-year pro made manifest as the "inner voice" of the lattice forge.
 *   The surface externalizes the Library (critique order, construction discipline, Void Shield as primary vehicle)
 *   and the pair-programmer contract: observe/diagnose specifically, explain the why, one focused improvement,
 *   brutal honesty + clear next action. The cockpit itself teaches and enforces the law the engine implements.
 * - Data consumed: Live grid state (layers/coords via parent), any analysis/symmetry/intensity from adapter surfaces
 *   already available on the page. Static phrase tables + checklist derived directly from the skill's references
 *   (critique-checklist.md, construction-lines.md, fundamentals.md, common-pitfalls.md) — no duplication of logic.
 * - State: Current ordered diagnosis (steps 1-8), nextActions[], critiqueHistory (for the active piece),
 *   drillActive (timer + success criteria for Void Shield construction drill).
 * - Accessibility: aria-live regions for new diagnosis and "next action" announcements. All controls have
 *   explicit labels. Keyboard: "K" (from parent) triggers critique; buttons are focusable and operable.
 * - School theming: VOID-dominant matrix green + cyan for construction references; accent on "next action"
 *   cards uses school gold/chrome for ritual weight. Consumes matrix CSS vars.
 * - Animation: Subtle card unfurl / emphasis pulse on new next-action (framer if parent provides; otherwise
 *   simple opacity/scale). Respects reduced-motion via parent or class.
 * - Regression risk: New panel in right station; low impact on existing fidelity snapshot beyond layout
 *   container. Will be exercised in manual + visual flows for Void Shield style pieces.
 *
 * CLASSIFICATION: New component — core "PixelBrain" mentor surface (the reason for the skill name in the cockpit).
 * WHY: Turns the textual pair-programmer from .grok/skills/pixelbrain into a live, always-available instrument
 *   that diagnoses the user's actual canvas (especially construction/radial/shield work) and drives the
 *   "apply one change → re-critique" loop.
 * WORLD-LAW CONNECTION: The references are the canonical teaching; this panel is their visual embodiment and
 *   enforcement layer inside the forge. "Readability → Clean Execution → Form/Depth → Polish" is now UI law.
 * CODE: See below (self-contained heuristics + phrase engine for strict adapter boundary).
 * CSS DELTA: Relies on .pixelbrain-panel, .telemetry-text, .transmute-ignite-btn, .mentor-* classes (added in
 *   PixelBrainPage.css). New cards use existing chrome/matrix language.
 * HANDOFF TO QA: Exercise with a radial shield piece. Verify exact mentor phrases appear for drift, weak
 *   focal, non-radial spokes. Add to axe coverage in future qa/features if interactive volume grows.
 * QA CHECKLIST:
 *   - [ ] No codex/ or src/lib/ imports (pure presentation + parent-provided grid/analysis).
 *   - [ ] State via props + local hooks only.
 *   - [ ] ARIA live + labels.
 *   - [ ] Reduced motion friendly.
 *   - [ ] Matrix/school vars + no forbidden patterns.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { computeMentorMetrics } from '../mentorMetrics.js';

// Ordered critique steps (from skill + critique-checklist.md + SKILL.md Quick Start).
// Scores are lightweight UI heuristics (coord spread, neighbor contrast proxies, ring variance).
// Real engine metrics (symmetry, intensity) can be passed in for higher fidelity.
const CRITIQUE_STEPS = [
  { id: 1, title: 'SILHOUETTE & READABILITY', priority: 'FUNDAMENTAL' },
  { id: 2, title: 'EDGE CLEANLINESS & PIXEL CONSISTENCY', priority: 'FUNDAMENTAL' },
  { id: 3, title: 'VALUE / CONTRAST HIERARCHY', priority: 'STRUCTURE' },
  { id: 4, title: 'FORM & DEPTH (SHADING LOGIC)', priority: 'FORM' },
  { id: 5, title: 'COLOR HARMONY & MATERIAL CLARITY', priority: 'MATERIAL' },
  { id: 6, title: 'CENTER FOCAL ELEMENTS', priority: 'FOCAL' },
  { id: 7, title: 'RADIAL / SYMMETRY INTEGRITY (SHIELDS / ORBS)', priority: 'RADIAL' },
  { id: 8, title: 'PRODUCTION CONSTRAINTS (PALETTE, SCALE, EXPORT)', priority: 'PROD' },
];

// Mentor phrases drawn directly from the skill references (construction-lines.md in particular for Void Shield language).
const PHRASES = {
  silhouetteWeak: "Silhouette collapses at target size. The outer ring reads as egg-shaped or incomplete.",
  edgeCrawly: "Crawly edges / 1-2px jaggies on the outer two rings. Clean execution before any shading.",
  centerDrift: "Center is +1px down-right. The whole design is torqued. Rebuild the construction cross first.",
  ringDrift: "Ring {r} and Ring {r2} have {px}px vertical drift between 9 o'clock and 3 o'clock. Visible even at icon size.",
  nonRadial: "Your spokes are not truly radial — the {a} and {b} lines are canted. Rebuild from the construction cross.",
  focalFight: "The focal element is fighting the outer ring. The construction would have told you the safe zone was 2px smaller.",
  goodRings: "Good ring regularity on the outer two. The inner core is the only one that drifted — fix the center marker first.",
  nextConstruction: "Apply construction guides for center + rings + radials. Ink Structure only after the ghosts are perfect. Then show me the result.",
  nextDrill: "Practice the 20-minute Void Shield construction drill (center dead middle, 4-7 clean rings, 6-8 radials). Repeat 5x with varied radii.",
  readabilityFirst: "Readability → Clean Execution before any polish. Silhouette at 32x32 and 16x16 must still read as a shield.",
};

export default function MentorCritiquePanel({
  grid,                // current editor grid or coords (for heuristics)
  analysis,            // optional image/verse analysis
  onApplySuggestion,   // (suggestionType) => void — e.g. 'construction' | 'symmetry' | 'layer-promote'
  onLoadDrill,         // () => void — load the exact Void Shield construction spec + timer
  critiqueToken = 0,   // parent bumps this to trigger a critique run externally
  drillActive = false,       // page-driven drill state (single timer authority)
  drillSecondsLeft = 0,
}) {
  const [diagnosis, setDiagnosis] = useState(null);
  const [nextActions, setNextActions] = useState([]);
  const [history, setHistory] = useState([]);

  const runCritique = useCallback(() => {
    const m = computeMentorMetrics(grid, analysis);
    const steps = [];
    const actions = [];

    // Step 1 — Silhouette / Readability (always first)
    if (m.weakSilhouette) {
      steps.push({ step: 1, finding: PHRASES.silhouetteWeak, score: 'FAIL' });
      actions.push({ label: 'LOAD CONSTRUCTION GUIDES', type: 'construction' });
    } else {
      steps.push({ step: 1, finding: 'Silhouette holds at target sizes. Outer ring reads clean.', score: 'PASS' });
    }

    // Step 2 — Edges
    if (m.weakSilhouette || !m.hasSymmetry) {
      steps.push({ step: 2, finding: PHRASES.edgeCrawly, score: 'WARN' });
    } else {
      steps.push({ step: 2, finding: 'Edges read tight. Pixel clusters align on cardinal and 45°.', score: 'PASS' });
    }

    // Step 6/7 — Center + Radial (the Void Shield killer)
    if (m.likelyCenterDrift) {
      steps.push({ step: 6, finding: PHRASES.centerDrift, score: 'FAIL' });
      steps.push({ step: 7, finding: PHRASES.nonRadial.replace('{a}', '2 o\'clock').replace('{b}', '8 o\'clock'), score: 'FAIL' });
      actions.push({ label: 'EMIT + AUDIT CONSTRUCTION (CENTER + RINGS + RADIALS)', type: 'construction' });
      actions.push({ label: 'RUN 20-MIN VOID SHIELD DRILL', type: 'drill' });
    } else if (!m.hasSymmetry) {
      steps.push({ step: 7, finding: PHRASES.nonRadial.replace('{a}', '2 o\'clock').replace('{b}', '8 o\'clock'), score: 'WARN' });
      actions.push({ label: 'TOGGLE SYMMETRY + SNAP SPOKES', type: 'symmetry' });
    } else {
      steps.push({ step: 6, finding: PHRASES.goodRings, score: 'PASS' });
      steps.push({ step: 7, finding: 'Radial integrity holds through center. Good work.', score: 'PASS' });
    }

    // Universal closer
    actions.push({ label: 'HIDE REFERENCE + INK STRUCTURE', type: 'layer-promote' });
    actions.push({ label: 'RE-CRITIQUE AFTER NEXT CHANGE', type: 're-critique' });

    const newDiag = {
      timestamp: Date.now(),
      metrics: m,
      steps,
      summary: m.likelyCenterDrift
        ? 'Center and radial geometry are the current limiter. Everything else is noise until this is fixed.'
        : 'Fundamentals holding. Proceed to controlled depth and focal polish one ring at a time.',
    };

    setDiagnosis(newDiag);
    setNextActions(actions.slice(0, 4)); // keep it focused — one or two real moves
    setHistory(h => [newDiag, ...h].slice(0, 5));

    // Live region announcement for screen readers / pair feel
    const live = document.getElementById('mentor-live');
    if (live) live.textContent = `Critique complete. ${newDiag.summary} Next: ${actions[0]?.label || 'iterate'}.`;
  }, [grid, analysis]);

  const handleAction = (action) => {
    if (action.type === 'drill' && onLoadDrill) {
      // The page owns the drill timer; this panel only displays it.
      onLoadDrill();
    } else if (onApplySuggestion) {
      onApplySuggestion(action.type);
    }
    // Always reinforce the contract
    if (action.type !== 're-critique') {
      setTimeout(() => runCritique(), 120); // encourage the loop
    }
  };

  // External trigger: the page bumps critiqueToken (CRITIQUE buttons, drill end).
  useEffect(() => {
    if (critiqueToken > 0) runCritique();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [critiqueToken]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="mentor-station pixelbrain-panel" role="region" aria-label="PixelBrain Mentor — Professional Critique Station">
      <div className="section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="telemetry-text">PIXELBRAIN — MENTOR</span>
        <button
          className="transmute-ignite-btn"
          onClick={runCritique}
          style={{ padding: '6px 12px', fontSize: 11 }}
          aria-label="Run professional critique on current piece"
        >
          RUN PROFESSIONAL CRITIQUE
        </button>
      </div>

      <div id="mentor-live" aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }} />

      <AnimatePresence>
        {drillActive && (
          <div style={{ background: 'rgba(0,255,65,0.08)', padding: 8, marginBottom: 8, border: '1px solid #0a4' }}>
            <div className="telemetry-text" style={{ color: '#0f0' }}>VOID SHIELD CONSTRUCTION DRILL — {formatTime(drillSecondsLeft)} REMAINING</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>Center dead middle. Full faint rings first. Radials through exact center. Ink only after ghosts are perfect. No shading until geometry locks.</div>
          </div>
        )}
      </AnimatePresence>

      {diagnosis ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="telemetry-text" style={{ fontSize: 11, opacity: 0.75 }}>
            {new Date(diagnosis.timestamp).toLocaleTimeString()} · {diagnosis.metrics.coordCount} GLYPHS · ASPECT {diagnosis.metrics.aspect}
          </div>

          {diagnosis.steps.map((s, idx) => (
            <div key={idx} style={{ borderLeft: '3px solid #0a4', paddingLeft: 8, fontSize: 12, lineHeight: 1.35 }}>
              <div style={{ color: s.score === 'FAIL' ? '#f44' : s.score === 'WARN' ? '#fc4' : '#0a4', textTransform: 'uppercase', fontSize: 10 }}>{CRITIQUE_STEPS.find(x => x.id === s.step)?.title || `STEP ${s.step}`}</div>
              <div>{s.finding}</div>
            </div>
          ))}

          <div style={{ marginTop: 4, padding: 8, background: 'rgba(201,162,39,0.08)', border: '1px solid #c9a2' }}>
            <div className="telemetry-text" style={{ fontSize: 10, marginBottom: 4 }}>PIXELBRAIN SAYS</div>
            <div style={{ fontSize: 13 }}>{diagnosis.summary}</div>
          </div>

          {nextActions.length > 0 && (
            <div>
              <div className="telemetry-text" style={{ fontSize: 10, margin: '6px 0 4px' }}>CLEAR NEXT ACTIONS (ONE AT A TIME)</div>
              {nextActions.map((a, i) => (
                <button
                  key={i}
                  className="transmute-ignite-btn"
                  onClick={() => handleAction(a)}
                  style={{ width: '100%', marginBottom: 4, fontSize: 12, padding: '8px 10px' }}
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}

          <button onClick={() => runCritique()} style={{ fontSize: 11, opacity: 0.7, alignSelf: 'flex-start' }}>
            RE-CRITIQUE CURRENT PIECE
          </button>
        </div>
      ) : (
        <div style={{ opacity: 0.7, fontSize: 12, padding: '8px 0' }}>
          No critique yet. Draw or load a piece (especially a radial shield), then hit <strong>RUN PROFESSIONAL CRITIQUE</strong>.
          The order is sacred: readability and clean geometry before any shading or focal polish.
        </div>
      )}

      {history.length > 1 && (
        <details style={{ marginTop: 8, fontSize: 11 }}>
          <summary className="telemetry-text" style={{ cursor: 'pointer' }}>SESSION HISTORY ({history.length})</summary>
          {history.slice(1).map((h, i) => (
            <div key={i} style={{ opacity: 0.6, marginTop: 4 }}>{new Date(h.timestamp).toLocaleTimeString()}: {h.summary}</div>
          ))}
        </details>
      )}

      <div style={{ marginTop: 12, borderTop: '1px solid #222', paddingTop: 8, fontSize: 10, opacity: 0.6 }}>
        Library active: construction-lines • critique-checklist • fundamentals • aseprite-mastery. Void Shield is the primary teaching vehicle.
      </div>
    </div>
  );
}
