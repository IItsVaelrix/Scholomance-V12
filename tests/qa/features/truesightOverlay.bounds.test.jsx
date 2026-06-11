import { describe, it, expect } from 'vitest';
import { resolveOverlayPlacement } from '../../../src/lib/truesight/overlay-placement.js';

describe('TrueSight Overlay Placement & Boundaries', () => {
  const viewportRect = { top: 0, left: 0, width: 1000, height: 1000 };
  const overlayRect = { width: 200, height: 100 };

  it('tooltip near right edge flips or clamps to remain inside viewport', () => {
    // Anchor placed near right edge (950, 100)
    const anchorRect = { left: 950, top: 100, width: 20, height: 20, right: 970, bottom: 120 };
    
    // Placement right should flip to left
    const res = resolveOverlayPlacement(anchorRect, overlayRect, viewportRect, {
      placement: 'right',
      flip: true,
      clamp: true,
      margin: 10,
    });

    expect(res.flipped).toBe(true);
    expect(res.placement).toBe('left');
    expect(res.x + overlayRect.width).toBeLessThanOrEqual(viewportRect.width);
  });

  it('tooltip near bottom edge flips or clamps to remain inside viewport', () => {
    // Anchor placed near bottom edge (100, 950)
    const anchorRect = { left: 100, top: 950, width: 20, height: 20, right: 120, bottom: 970 };

    // Placement bottom should flip to top
    const res = resolveOverlayPlacement(anchorRect, overlayRect, viewportRect, {
      placement: 'bottom',
      flip: true,
      clamp: true,
      margin: 10,
    });

    expect(res.flipped).toBe(true);
    expect(res.placement).toBe('top');
    expect(res.y + overlayRect.height).toBeLessThanOrEqual(viewportRect.height);
  });

  it('clamping keeps overlay fully contained when flipping is not possible/disabled', () => {
    // Anchor at (900, 900), flipping disabled, placement bottom
    const anchorRect = { left: 900, top: 900, width: 50, height: 50, right: 950, bottom: 950 };

    const res = resolveOverlayPlacement(anchorRect, overlayRect, viewportRect, {
      placement: 'bottom',
      flip: false,
      clamp: true,
      margin: 10,
    });

    expect(res.flipped).toBe(false);
    expect(res.x + overlayRect.width).toBeLessThanOrEqual(viewportRect.width);
    expect(res.y + overlayRect.height).toBeLessThanOrEqual(viewportRect.height);
    expect(res.x).toBeGreaterThanOrEqual(0);
    expect(res.y).toBeGreaterThanOrEqual(0);
  });

  it('pixel snapping keeps coordinates integer-aligned', () => {
    const anchorRect = { left: 10.5, top: 20.3, width: 30, height: 30, right: 40.5, bottom: 50.3 };
    const res = resolveOverlayPlacement(anchorRect, overlayRect, viewportRect, {
      placement: 'bottom',
      pixelSnap: true,
    });

    expect(Number.isInteger(res.x)).toBe(true);
    expect(Number.isInteger(res.y)).toBe(true);
  });
});
