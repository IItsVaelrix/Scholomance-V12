/**
 * Resolves the positioning of a floating overlay/tooltip relative to an anchor,
 * ensuring it stays within viewport bounds.
 *
 * @param {DOMRect|Object} anchorRect - The bounding rect of the anchor element { top, left, width, height, bottom, right }
 * @param {Object} overlayRect - The dimensions of the overlay { width, height }
 * @param {DOMRect|Object} viewportRect - The bounding rect of the viewport/container { top, left, width, height }
 * @param {Object} options - Placement options
 * @param {string} options.placement - Preferred placement: 'top' | 'bottom' | 'left' | 'right' (default 'bottom')
 * @param {boolean} options.flip - Whether to flip to the opposite side if it overflows (default true)
 * @param {boolean} options.clamp - Whether to clamp within viewport bounds (default true)
 * @param {boolean} options.pixelSnap - Snap coordinates to integer pixel boundary (default true)
 * @param {number} options.margin - Gap between anchor and overlay (default 8)
 * @returns {Object} Calculated coordinates { x, y, placement, flipped }
 */
export function resolveOverlayPlacement(anchorRect, overlayRect, viewportRect, options = {}) {
  const {
    placement = 'bottom',
    flip = true,
    clamp = true,
    pixelSnap = true,
    margin = 8,
  } = options;

  let x = 0;
  let y = 0;
  let currentPlacement = placement;
  let flipped = false;

  const getPosition = (side) => {
    let targetX = 0;
    let targetY = 0;

    switch (side) {
      case 'top':
        targetX = anchorRect.left + (anchorRect.width - overlayRect.width) / 2;
        targetY = anchorRect.top - overlayRect.height - margin;
        break;
      case 'bottom':
        targetX = anchorRect.left + (anchorRect.width - overlayRect.width) / 2;
        targetY = anchorRect.bottom + margin;
        break;
      case 'left':
        targetX = anchorRect.left - overlayRect.width - margin;
        targetY = anchorRect.top + (anchorRect.height - overlayRect.height) / 2;
        break;
      case 'right':
        targetX = anchorRect.right + margin;
        targetY = anchorRect.top + (anchorRect.height - overlayRect.height) / 2;
        break;
    }
    return { x: targetX, y: targetY };
  };

  // Check initial placement
  let pos = getPosition(currentPlacement);
  
  // Collision detection and flipping
  if (flip) {
    const overflowLeft = pos.x < viewportRect.left;
    const overflowRight = pos.x + overlayRect.width > viewportRect.left + viewportRect.width;
    const overflowTop = pos.y < viewportRect.top;
    const overflowBottom = pos.y + overlayRect.height > viewportRect.top + viewportRect.height;

    let needsFlip = false;
    let oppositePlacement = currentPlacement;

    if (currentPlacement === 'top' && overflowTop) {
      oppositePlacement = 'bottom';
      needsFlip = true;
    } else if (currentPlacement === 'bottom' && overflowBottom) {
      oppositePlacement = 'top';
      needsFlip = true;
    } else if (currentPlacement === 'left' && overflowLeft) {
      oppositePlacement = 'right';
      needsFlip = true;
    } else if (currentPlacement === 'right' && overflowRight) {
      oppositePlacement = 'left';
      needsFlip = true;
    }

    if (needsFlip) {
      const flippedPos = getPosition(oppositePlacement);
      // Only commit flip if opposite side has less overflow or no overflow
      const flippedOverflowLeft = flippedPos.x < viewportRect.left;
      const flippedOverflowRight = flippedPos.x + overlayRect.width > viewportRect.left + viewportRect.width;
      const flippedOverflowTop = flippedPos.y < viewportRect.top;
      const flippedOverflowBottom = flippedPos.y + overlayRect.height > viewportRect.top + viewportRect.height;

      const currentOverflow = (overflowLeft ? 1 : 0) + (overflowRight ? 1 : 0) + (overflowTop ? 1 : 0) + (overflowBottom ? 1 : 0);
      const flippedOverflow = (flippedOverflowLeft ? 1 : 0) + (flippedOverflowRight ? 1 : 0) + (flippedOverflowTop ? 1 : 0) + (flippedOverflowBottom ? 1 : 0);

      if (flippedOverflow < currentOverflow) {
        pos = flippedPos;
        currentPlacement = oppositePlacement;
        flipped = true;
      }
    }
  }

  // Clamping within viewport
  if (clamp) {
    pos.x = Math.max(viewportRect.left, Math.min(pos.x, viewportRect.left + viewportRect.width - overlayRect.width));
    pos.y = Math.max(viewportRect.top, Math.min(pos.y, viewportRect.top + viewportRect.height - overlayRect.height));
  }

  // Pixel Snapping
  if (pixelSnap) {
    pos.x = Math.round(pos.x);
    pos.y = Math.round(pos.y);
  }

  return {
    x: pos.x,
    y: pos.y,
    placement: currentPlacement,
    flipped,
  };
}
