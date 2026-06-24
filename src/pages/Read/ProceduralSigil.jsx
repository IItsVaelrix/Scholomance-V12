import { memo, useMemo } from 'react';
import { buildSigil, SIGIL_VIEWBOX } from './proceduralSigil.js';
import './ProceduralSigil.css';

/**
 * Procedural sigil - a single composite glyph generated from a word's phoneme
 * texture. Deterministic: the same phonemes always render the same mark, while
 * different phoneme textures diverge. Replaces the static per-school glyph in
 * the Oracle word title with a symbol unique to the resolved word.
 */
export const ProceduralSigil = memo(function ProceduralSigil({
  phonemes,
  word = '',
  animate = true,
  className = '',
}) {
  // Stable memo key from the phoneme texture so the sigil only rebuilds when
  // the texture actually changes (phonemes is a fresh array each render).
  const textureKey = useMemo(
    () =>
      `${(Array.isArray(phonemes) ? phonemes : [])
        .map((p) => `${p?.manner || ''}:${p?.token || ''}`)
        .join('|')}::${String(word || '').toLowerCase()}`,
    [phonemes, word],
  );

  const sigil = useMemo(
    () => buildSigil(phonemes, word),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [textureKey],
  );

  if (sigil.strokes.length === 0) return null;

  return (
    <svg
      className={`oracle-sigil ${className}`.trim()}
      viewBox={`0 0 ${SIGIL_VIEWBOX} ${SIGIL_VIEWBOX}`}
      role="img"
      aria-label={word ? `Sigil for ${word}` : 'word sigil'}
      data-animate={animate ? 'true' : 'false'}
      data-stroke-total={sigil.strokes.length}
    >
      {sigil.strokes.map((stroke, index) => (
        <path
          key={index}
          className="oracle-sigil-stroke"
          d={stroke.d}
          data-kind={stroke.kind}
          pathLength="100"
          vectorEffect="non-scaling-stroke"
          style={{ '--sigil-stroke-index': index }}
        />
      ))}
    </svg>
  );
});
