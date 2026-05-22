import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { resolveVerseIrColor } from '../../lib/truesight/color/pcaChroma.js';
import { deltaE } from '../../lib/truesight/color/oklch.js';
import { getVowelSimilarity } from '../../lib/phonology.adapter.js';
import './TruesightDebugColorPanel.css';

const PHONEMEGRAM_FAMILIES = [
  'IY', 'IH', 'EY', 'EH', 'AE',
  'AA', 'AH', 'AO', 'OW', 'UH',
  'UW', 'ER', 'AY', 'AW', 'OY',
];

function pearson(xs, ys) {
  const n = xs.length;
  if (!n) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom > 0 ? num / denom : 0;
}

/**
 * TruesightDebugColorPanel
 *
 * World-law: Exposes phoneme→school color mappings in a NECROMANCY/SONIC-blended
 * surface (hsl 102, RESONANT effectClass). Used in the IDE sidebar when Truesight
 * is active to inspect word→school classifications at runtime without opening devtools.
 *
 * Data consumed: analyzedWords — array of { text: string, school: string } derived
 * from committedAnalysis.analyzedWords Map at the ReadPage call site.
 * activeSchool: string | null — the currently selected school ID.
 */
export function TruesightDebugColorPanel({ analyzedWords = [], activeSchool = null, showPhonemegram = false }) {
  const reducedMotion = usePrefersReducedMotion();

  const schoolGroups = useMemo(() => {
    const groups = {};
    for (const word of analyzedWords) {
      const school = word.school ?? 'UNCLASSIFIED';
      if (!groups[school]) groups[school] = [];
      groups[school].push(word);
    }
    return groups;
  }, [analyzedWords]);

  const phonemegram = useMemo(() => {
    if (!showPhonemegram) return null;
    const schoolKey = activeSchool || 'SONIC';
    const families = PHONEMEGRAM_FAMILIES.map((family) => {
      const result = resolveVerseIrColor(family, schoolKey);
      return { family, hex: result.hex, oklch: result.oklch, projection: result.projection };
    });

    const colors = Object.fromEntries(families.map((f) => [f.family, f.oklch]));
    const xs = [], ys = [];
    let maxDE = 0;
    const pairs = [];
    for (let i = 0; i < PHONEMEGRAM_FAMILIES.length; i++) {
      for (let j = i + 1; j < PHONEMEGRAM_FAMILIES.length; j++) {
        const a = PHONEMEGRAM_FAMILIES[i];
        const b = PHONEMEGRAM_FAMILIES[j];
        const sim = getVowelSimilarity(a, b);
        const dE = deltaE(colors[a], colors[b]);
        pairs.push({ sim, dE });
        if (dE > maxDE) maxDE = dE;
      }
    }
    for (const { sim, dE } of pairs) {
      xs.push(sim);
      ys.push(maxDE > 0 ? 1 - (dE / maxDE) : 0);
    }
    const r = pearson(xs, ys);
    return { families, pearsonR: r, schoolKey };
  }, [showPhonemegram, activeSchool]);

  const totalWords = analyzedWords.length;

  return (
    <motion.aside
      className={`truesight-debug-panel${reducedMotion ? ' truesight-debug-panel--no-anim' : ''}`}
      aria-label="TrueSight phoneme color debug panel"
      role="complementary"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
    >
      {/* HEADER */}
      <header className="truesight-debug-panel__header">
        <span className="truesight-debug-panel__glyph" aria-hidden="true">◈</span>
        <h2 className="truesight-debug-panel__title">TrueSight Debug</h2>
        {activeSchool && (
          <span
            className="truesight-debug-panel__active-school"
            aria-label={`Active school: ${activeSchool}`}
          >
            {activeSchool}
          </span>
        )}
      </header>

      {/* BODY — school color swatches + word chips */}
      <div className="truesight-debug-panel__body" role="list">
        {Object.entries(schoolGroups).map(([school, words]) => (
          <div
            key={school}
            className="truesight-debug-panel__school-row"
            role="listitem"
            aria-label={`${school}: ${words.length} word${words.length !== 1 ? 's' : ''}`}
          >
            <span
              className="truesight-debug-panel__swatch"
              data-school={school.toLowerCase()}
              aria-hidden="true"
            />
            <span className="truesight-debug-panel__school-name">{school}</span>
            <ul
              className="truesight-debug-panel__word-chips"
              aria-label={`Words classified as ${school}`}
            >
              {words.map((w, i) => (
                <li
                  key={i}
                  className="truesight-debug-panel__chip"
                  data-school={school.toLowerCase()}
                >
                  {w.text}
                </li>
              ))}
            </ul>
          </div>
        ))}

        {totalWords === 0 && (
          <p className="truesight-debug-panel__empty" role="status">
            No glyphs analyzed — enter text in the scroll editor.
          </p>
        )}
      </div>

      {/* PHONEMEGRAM — Study1 §Phonemegram applied to color */}
      {phonemegram && (
        <section
          className="truesight-debug-panel__phonemegram"
          aria-label="Color Phonemegram"
        >
          <header className="truesight-debug-panel__phonemegram-header">
            <span className="truesight-debug-panel__glyph" aria-hidden="true">⟁</span>
            <h3 className="truesight-debug-panel__phonemegram-title">Phonemegram</h3>
            <span
              className="truesight-debug-panel__pearson"
              data-quality={phonemegram.pearsonR > 0.5 ? 'good' : phonemegram.pearsonR > 0.3 ? 'ok' : 'poor'}
              aria-label={`Pearson correlation r = ${phonemegram.pearsonR.toFixed(3)}`}
            >
              r = {phonemegram.pearsonR.toFixed(3)}
            </span>
          </header>
          <ul className="truesight-debug-panel__family-grid">
            {phonemegram.families.map(({ family, hex, oklch, projection }) => (
              <li
                key={family}
                className="truesight-debug-panel__family-cell"
                title={`${family} — OKLCh(${oklch.l.toFixed(2)}, ${oklch.c.toFixed(2)}, ${oklch.h.toFixed(0)}°) — PC1=${projection?.pc1?.toFixed(2) ?? '?'}, PC2=${projection?.pc2?.toFixed(2) ?? '?'}`}
              >
                <span
                  className="truesight-debug-panel__family-swatch"
                  style={{ background: hex }}
                  aria-hidden="true"
                />
                <span className="truesight-debug-panel__family-label">{family}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* FOOTER / META ROW */}
      <footer className="truesight-debug-panel__footer">
        <span className="truesight-debug-panel__meta">
          {totalWords} glyph{totalWords !== 1 ? 's' : ''} parsed
        </span>
        <span className="truesight-debug-panel__signal" aria-label="Signal class: RESONANT">
          ⟡ RESONANT
        </span>
      </footer>
    </motion.aside>
  );
}
