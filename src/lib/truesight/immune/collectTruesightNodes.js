/**
 * TrueSight Immune Probe — DOM collector (browser-safe).
 *
 * Reads the live `.word-background-layer` overlay and emits one descriptor per
 * rendered word node. These descriptors are the raw material the Node-side
 * immune probe (truesightImmuneProbe.js) turns into exosomes + QBIT distress
 * seeds. Kept dependency-free so it can run inside `page.evaluate`.
 *
 * Each node captures BOTH the procedural intent (the inline style the React
 * overlay wrote) AND the browser's real layout (getBoundingClientRect),
 * expressed in the layer's own content coordinate space, so the probe can test
 * style↔layout agreement and monotonic non-overlap.
 *
 * @param {Element|null} layerEl - the `.word-background-layer` element
 * @returns {object} { ok, reason?, layer, lineCount, shellCount, nodes }
 */
export function collectTruesightNodes(layerEl) {
  if (!layerEl) {
    return { ok: false, reason: 'no-layer', layer: null, lineCount: 0, shellCount: 0, nodes: [] };
  }

  const layerRect = layerEl.getBoundingClientRect();
  const scrollLeft = layerEl.scrollLeft || 0;
  const scrollTop = layerEl.scrollTop || 0;

  // Stable line index: map each `.truesight-line` to its order in the layer.
  const lineEls = Array.from(layerEl.querySelectorAll('.truesight-line'));
  const lineIndexOf = (el) => {
    const line = el.closest('.truesight-line');
    const idx = line ? lineEls.indexOf(line) : -1;
    return idx;
  };

  const shells = Array.from(layerEl.querySelectorAll('.truesight-word-shell'));

  const nodes = shells.map((shell, index) => {
    const rect = shell.getBoundingClientRect();
    const box = shell.querySelector('.truesight-annotation-box');
    const boxRect = box ? box.getBoundingClientRect() : null;

    const parseStyle = (v) => {
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : null;
    };

    return {
      index,
      charStart: Number(shell.getAttribute('data-char-start')),
      token: shell.getAttribute('aria-label') || '',
      lineIndex: lineIndexOf(shell),
      isWord: true,
      // Procedural intent (what the overlay code wrote)
      styleLeft: parseStyle(shell.style.left),
      styleWidth: parseStyle(shell.style.width),
      styleHeight: parseStyle(shell.style.height),
      // Browser's real layout, in the layer's content coordinate space
      rectLeft: rect.left - layerRect.left + scrollLeft,
      rectTop: rect.top - layerRect.top + scrollTop,
      rectWidth: rect.width,
      rectHeight: rect.height,
      // The annotation box that should fill the shell (inset:0)
      hasBox: !!box,
      boxWidth: boxRect ? boxRect.width : 0,
      boxHeight: boxRect ? boxRect.height : 0,
    };
  });

  return {
    ok: true,
    layer: { width: layerRect.width, height: layerRect.height, scrollLeft, scrollTop },
    lineCount: lineEls.length,
    shellCount: shells.length,
    nodes,
  };
}

export default collectTruesightNodes;
