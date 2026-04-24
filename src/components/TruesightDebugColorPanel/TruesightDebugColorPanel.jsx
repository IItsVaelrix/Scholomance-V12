import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import './TruesightDebugColorPanel.css';

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
export function TruesightDebugColorPanel({ analyzedWords = [], activeSchool = null }) {
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
