import { forwardRef, useRef, useImperativeHandle } from 'react';
import { Z_BASE } from '../../data/stacking_tiers';
import './IDE.css';

const Gutter = forwardRef(function Gutter({
  overlayLines = [],
  lineCounts = [],
  contentLineCount = 0,
  topOffset = 0,
  viewportHeight,
  lineHeightPx,
}, ref) {
  const safeLineHeight = Number.isFinite(lineHeightPx) && lineHeightPx > 0 ? lineHeightPx : 24;
  const safeTopOffset = Number.isFinite(topOffset) && topOffset > 0 ? topOffset : 0;

  const trackRef = useRef(null);

  useImperativeHandle(ref, () => ({
    syncScroll(top) {
      if (trackRef.current) {
        trackRef.current.style.transform = `translateY(-${top}px)`;
      }
    },
  }), []);

  const rowStyle = {
    minHeight: `${safeLineHeight}px`,
    height: `${safeLineHeight}px`,
  };

  const shownRawLines = new Set();

  return (
    <div
      className="editor-gutter"
      style={{ height: viewportHeight, zIndex: Z_BASE }}
      aria-hidden="true"
    >
      <div
        ref={trackRef}
        className="gutter-track"
        style={safeTopOffset > 0 ? { paddingTop: `${safeTopOffset}px` } : undefined}
      >
        {overlayLines.length > 0
          ? overlayLines.map((line, i) => {
              const rawIdx = line.rawLineIndex;
              const isFirstVisualLine = !shownRawLines.has(rawIdx);
              if (isFirstVisualLine) shownRawLines.add(rawIdx);
              const syllableCount = isFirstVisualLine ? (Number(lineCounts[rawIdx]) || 0) : 0;
              return (
                <div key={i} className="gutter-row" style={rowStyle}>
                  <div className="gutter-icons"></div>
                  <span className="line-number">{isFirstVisualLine ? rawIdx + 1 : ''}</span>
                  <span className="syllable-count-mini">{syllableCount > 0 ? syllableCount : ''}</span>
                </div>
              );
            })
          : Array.from({ length: contentLineCount }, (_, i) => {
              const syllableCount = Number(lineCounts[i]) || 0;
              return (
                <div key={i} className="gutter-row" style={rowStyle}>
                  <div className="gutter-icons"></div>
                  <span className="line-number">{i + 1}</span>
                  <span className="syllable-count-mini">{syllableCount > 0 ? syllableCount : ''}</span>
                </div>
              );
            })
        }
      </div>
    </div>
  );
});

export default Gutter;
