import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getOracleSchoolTheme } from './OracleSchoolTheme.jsx';

const VOWEL_GLYPH_PATTERN = /[aeiouyɑæʌəɚɝɜɛɪʊɔɒɐøœ]/i;
const DIGRAPHS = ['sch', 'thr', 'ch', 'sh', 'th', 'ph', 'wh', 'qu', 'ng', 'ck'];

function normalizeCastWord(word) {
  return String(word || '').trim().slice(0, 24);
}

function splitLetters(word) {
  return Array.from(normalizeCastWord(word)).filter((glyph) => glyph.trim());
}

function splitPhonemeGlyphs(word) {
  const source = normalizeCastWord(word).toLowerCase();
  const glyphs = [];
  let index = 0;

  while (index < source.length) {
    const match = DIGRAPHS.find((digraph) => source.startsWith(digraph, index));
    if (match) {
      glyphs.push(match);
      index += match.length;
      continue;
    }

    const glyph = source[index];
    if (glyph.trim()) glyphs.push(glyph);
    index += 1;
  }

  return glyphs.length > 0 ? glyphs : splitLetters(word);
}

function scatterVector(index, total) {
  const angle = ((index * 137.5) + (total * 19)) * (Math.PI / 180);
  const radius = 34 + ((index % 5) * 9);

  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
    rotate: ((index % 2 === 0 ? 1 : -1) * (26 + index * 7)),
  };
}

export default function OracleSubmitAnimation({
  active,
  animationKey,
  word,
  selectedSchool,
  prefersReducedMotion = false,
}) {
  const theme = useMemo(() => getOracleSchoolTheme(selectedSchool), [selectedSchool]);
  const letters = useMemo(() => splitLetters(word), [word]);
  const phonemes = useMemo(() => splitPhonemeGlyphs(word), [word]);
  const displayWord = normalizeCastWord(word) || 'oracle';

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key={`${animationKey}-${displayWord}`}
          className={`oracle-cast${prefersReducedMotion ? ' oracle-cast--reduced' : ''}`}
          data-school={theme.id}
          data-scanline={theme.scanline}
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0.18 : 0.22 }}
        >
          <motion.div
            className="oracle-cast-ring"
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.88 }}
            animate={prefersReducedMotion ? { opacity: 0.55 } : { opacity: [0, 0.75, 0.18], scale: [0.88, 1.08, 1.2] }}
            transition={prefersReducedMotion ? { duration: 0.25 } : { duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          />

          <div className="oracle-cast-word" aria-hidden="true">
            {letters.map((letter, index) => (
              <motion.span
                key={`${letter}-${index}`}
                className="oracle-cast-letter"
                initial={prefersReducedMotion ? false : { opacity: 1, y: 0, filter: 'blur(0px)' }}
                animate={prefersReducedMotion ? { opacity: 0 } : { opacity: [1, 1, 0], y: [0, -10 - (index % 3) * 4], filter: ['blur(0px)', 'blur(1px)', 'blur(5px)'] }}
                transition={prefersReducedMotion ? { duration: 0.2 } : { duration: 0.48, delay: index * 0.018, ease: 'easeInOut' }}
              >
                {letter}
              </motion.span>
            ))}
          </div>

          <div className="oracle-cast-particles" aria-hidden="true">
            {phonemes.map((phoneme, index) => {
              const vector = scatterVector(index, phonemes.length);
              const kind = VOWEL_GLYPH_PATTERN.test(phoneme) ? 'vowel' : 'consonant';

              return (
                <motion.span
                  key={`${phoneme}-${index}`}
                  className="oracle-cast-phoneme"
                  data-kind={kind}
                  initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.5, x: 0, y: 0, rotate: 0 }}
                  animate={prefersReducedMotion ? { opacity: 0 } : {
                    opacity: [0, 1, 0.82, 0],
                    scale: [0.45, 1, 0.86, 0.2],
                    x: [0, vector.x, vector.x * 0.42, 0],
                    y: [0, vector.y, vector.y * 0.42, 0],
                    rotate: [0, vector.rotate, vector.rotate * 0.5, 0],
                  }}
                  transition={prefersReducedMotion ? { duration: 0.2 } : {
                    duration: 1.12,
                    delay: 0.2 + (index * 0.028),
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  /{phoneme}/
                </motion.span>
              );
            })}
          </div>

          <motion.div
            className="oracle-cast-incantation"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={prefersReducedMotion ? { opacity: 0.72 } : { opacity: [0, 0.84, 0], y: [8, 0, -4] }}
            transition={prefersReducedMotion ? { duration: 0.24 } : { duration: 0.8, delay: 0.52 }}
          >
            {theme.glyph} resolving phonemic matter
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
