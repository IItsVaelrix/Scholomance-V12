/**
 * GrimDesignPanel — In-IDE design signal panel.
 *
 * Developer tool for the ToolsSidebar. Type a design intent description and
 * receive live CODEx phonemic signals: dominant school, effectClass, blended
 * HSL swatch, and provenance trace. Copy the full spec to clipboard.
 *
 * World-law connection: the color swatch is not chosen — it is measured from
 * the phonemic physics of the intent text, using the same pipeline that governs
 * spell scoring.
 *
 * UI SPEC:
 * - Component: GrimDesignPanel / src/pages/Read/GrimDesignPanel.jsx
 * - World-law connection: Phonemic analysis of intent text drives all visual decisions
 * - Data consumed: POST /api/grimdesign/analyze via useGrimDesign hook
 * - State: intent string (local), collapsed (local), copyFeedback (local)
 * - Accessibility: ARIA labels on intent textarea and copy button; reduced motion respected
 * - School theming: color swatch reflects computed blendedHsl — not a school CSS variable
 * - Animation: effectClass badge pulse is CSS-only, respects prefers-reduced-motion
 */

import { useState, useCallback, useRef } from 'react';
import { useGrimDesign } from '../../hooks/useGrimDesign.js';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion.js';
import './GrimDesignPanel.css';

// ─── Effect class metadata ────────────────────────────────────────────────────

const EFFECT_META = {
  INERT:        { label: 'INERT',        rank: 0 },
  RESONANT:     { label: 'RESONANT',     rank: 1 },
  HARMONIC:     { label: 'HARMONIC',     rank: 2 },
  TRANSCENDENT: { label: 'TRANSCENDENT', rank: 3 },
};

// ─── Spec formatter (mirrors .claude/commands/grimdesign.md output) ───────────

function buildSpecText(intent, signal, decisions) {
  if (!signal || !decisions) return '';

  const {
    color, glowRadius, glowColor, borderAlpha, animationClass,
    animationDurationMs, atmosphereLevel, scanlines,
    componentComplexity, transitionMs, worldLawReason, provenance,
  } = decisions;

  const { h, s, l } = signal.blendedHsl;

  const complexityDesc = ['', 'single surface, no sub-layers', 'header + body',
    'header + body + footer/meta row', 'full card with multiple sections'][componentComplexity] || '';

  const glow = glowRadius > 0 ? `0 0 ${glowRadius}px ${glowColor}` : 'none';
  const border = `1px solid hsla(${h}, ${s}%, ${Math.min(75, l + 15)}%, ${borderAlpha})`;
  const animation = animationClass
    ? `${animationClass} ${animationDurationMs}ms ease-in-out`
    : 'none';
  const atmosphere = scanlines
    ? `${atmosphereLevel} + scanlines`
    : atmosphereLevel;

  const provenanceBlock = (provenance || []).map((line) => `  ${line}`).join('\n');

  return `## GrimDesign Output — "${intent}"

SIGNAL PROVENANCE:
${provenanceBlock}

DESIGN DECISIONS:
  color:        ${color}
  glow:         ${glow}
  border:       ${border}
  animation:    ${animation}
  atmosphere:   ${atmosphere}
  complexity:   ${componentComplexity} (${complexityDesc})
  transition:   ${transitionMs}ms

WHY: ${worldLawReason}
`.trimEnd();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ColorSwatch({ blendedHsl, effectClass }) {
  if (!blendedHsl) return <div className="grim-swatch grim-swatch--empty" aria-hidden="true" />;
  const { h, s, l } = blendedHsl;
  const glow = effectClass !== 'INERT'
    ? `0 0 12px hsla(${h}, ${s}%, ${Math.min(75, l + 20)}%, 0.6)`
    : 'none';
  return (
    <div
      className={`grim-swatch grim-swatch--${effectClass.toLowerCase()}`}
      style={{
        background: `hsl(${h}, ${s}%, ${l}%)`,
        boxShadow: glow,
      }}
      aria-label={`Computed color: hsl(${h}, ${s}%, ${l}%)`}
      title={`hsl(${h}, ${s}%, ${l}%)`}
    />
  );
}

function EffectBadge({ effectClass }) {
  const rank = EFFECT_META[effectClass]?.rank ?? 0;
  return (
    <span
      className={`grim-effect-badge grim-effect-badge--rank-${rank}`}
      aria-label={`Effect class: ${effectClass}`}
    >
      {effectClass || 'INERT'}
    </span>
  );
}

function ProvenanceList({ provenance }) {
  if (!Array.isArray(provenance) || provenance.length === 0) return null;
  return (
    <ul className="grim-provenance" aria-label="Signal provenance">
      {provenance.map((line, i) => (
        <li key={i} className="grim-provenance-line">{line}</li>
      ))}
    </ul>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function GrimDesignPanel() {
  const [intent, setIntent]           = useState('');
  const [collapsed, setCollapsed]     = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const copyTimeoutRef = useRef(null);

  const { signal, decisions, isLoading, error } = useGrimDesign(intent);

  const handleCopy = useCallback(async () => {
    const spec = buildSpecText(intent, signal, decisions);
    if (!spec) return;
    try {
      await navigator.clipboard.writeText(spec);
      setCopyFeedback(true);
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopyFeedback(false), 1800);
    } catch {
      // clipboard API may be blocked in some contexts — fail silently
    }
  }, [intent, signal, decisions]);

  const handleIntentChange = useCallback((e) => {
    setIntent(e.target.value);
  }, []);

  const hasResult = signal && decisions;
  const effectClass = signal?.effectClass || 'INERT';

  return (
    <div className="grim-panel" data-reduced-motion={reducedMotion ? 'true' : undefined}>
      {/* ── Header ── */}
      <button
        type="button"
        className="grim-panel-header"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
        aria-controls="grim-panel-body"
      >
        <span className="grim-panel-glyph" aria-hidden="true">◈</span>
        <span className="grim-panel-title">GrimDesign</span>
        <span className="grim-panel-chevron" aria-hidden="true">
          {collapsed ? '▸' : '▾'}
        </span>
      </button>

      {/* ── Body ── */}
      {!collapsed && (
        <div id="grim-panel-body" className="grim-panel-body">
          {/* Intent input */}
          <label className="grim-intent-label" htmlFor="grim-intent-input">
            Design intent
          </label>
          <textarea
            id="grim-intent-input"
            className="grim-intent-input"
            value={intent}
            onChange={handleIntentChange}
            placeholder="cooldown indicator for a VOID-school agent…"
            rows={3}
            maxLength={500}
            aria-describedby="grim-intent-hint"
            spellCheck={false}
          />
          <span id="grim-intent-hint" className="grim-intent-hint">
            Phonemic analysis drives all decisions
          </span>

          {/* Loading indicator */}
          {isLoading && (
            <div className="grim-loading" aria-live="polite" aria-label="Analyzing…">
              <span className="grim-loading-bar" aria-hidden="true" />
              <span className="grim-loading-text">Analyzing…</span>
            </div>
          )}

          {/* Error */}
          {error && !isLoading && (
            <div className="grim-error" role="alert">
              {error}
            </div>
          )}

          {/* Results */}
          {hasResult && !isLoading && (
            <div className="grim-results">
              {/* Swatch + effectClass row */}
              <div className="grim-signal-row">
                <ColorSwatch blendedHsl={signal.blendedHsl} effectClass={effectClass} />
                <div className="grim-signal-meta">
                  <EffectBadge effectClass={effectClass} />
                  <span className="grim-school-label">
                    {signal.dominantSchool}
                  </span>
                </div>
                <span className="grim-hsl-label" aria-label="Computed HSL">
                  {signal.blendedHsl
                    ? `hsl(${signal.blendedHsl.h}, ${signal.blendedHsl.s}%, ${signal.blendedHsl.l}%)`
                    : '—'}
                </span>
              </div>

              {/* Provenance */}
              <ProvenanceList provenance={signal.provenance} />

              {/* Copy button */}
              <button
                type="button"
                className={`grim-copy-btn${copyFeedback ? ' grim-copy-btn--copied' : ''}`}
                onClick={handleCopy}
                disabled={!hasResult}
                aria-label={copyFeedback ? 'Spec copied to clipboard' : 'Copy full spec to clipboard'}
              >
                {copyFeedback ? '✓ Copied' : 'Copy spec'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
