import { useId, memo } from 'react';
import { GLYPH_ATLAS, FALLBACK_STROKES, GLYPH_CELL } from './glyphAtlas.js';
import './ProceduralWordmark.css';

/**
 * Single SVG glyph rendered as procedural strokes.
 * viewBox is the canonical ASCII cell (12 × 16); the SVG itself sizes
 * via --grim-glyph-cell (em-relative), so the glyph scales with the
 * parent's font-size while stroke-width stays in a legible band via clamp().
 */
const ProceduralGlyph = memo(function ProceduralGlyph({
  char,
  index,
  total,
  animate,
}) {
  const lookup = char.toLowerCase();
  const strokes = GLYPH_ATLAS[lookup] || FALLBACK_STROKES;
  const titleId = useId();

  return (
    <svg
      className="grim-glyph"
      viewBox={`0 0 ${GLYPH_CELL.w} ${GLYPH_CELL.h}`}
      role="presentation"
      data-glyph={lookup}
      style={{
        '--glyph-index': index,
        '--glyph-total': total,
      }}
      aria-labelledby={titleId}
    >
      <title id={titleId}>{char}</title>
      {strokes.map((d, strokeIndex) => (
        <path
          key={strokeIndex}
          className="grim-glyph-stroke"
          d={d}
          pathLength="100"
          vectorEffect="non-scaling-stroke"
          data-stroke-index={strokeIndex}
          data-animate={animate ? 'true' : 'false'}
          style={{ '--stroke-index': strokeIndex }}
        />
      ))}
    </svg>
  );
});

/**
 * Wordmark — converts a string into a row of procedural glyphs.
 * Aria-label preserves screen-reader semantics; the SVG row is
 * marked aria-hidden because the strokes themselves are decorative
 * once the label is provided at the wordmark level.
 */
export function ProceduralWordmark({ word, animateOnReveal = true, className = '' }) {
  const display = String(word || '').trim();
  if (!display) return null;
  const letters = Array.from(display);

  return (
    <span
      className={`grim-wordmark ${className}`.trim()}
      aria-label={display}
      data-letter-count={letters.length}
      data-animate={animateOnReveal ? 'true' : 'false'}
    >
      {letters.map((char, index) => (
        <ProceduralGlyph
          key={`${char}-${index}`}
          char={char}
          index={index}
          total={letters.length}
          animate={animateOnReveal}
        />
      ))}
    </span>
  );
}

export default ProceduralWordmark;
