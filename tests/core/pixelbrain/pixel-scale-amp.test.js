// tests/core/pixelbrain/pixel-scale-amp.test.js
import { describe, it, expect } from 'vitest';
import { colorDist, applyXBR2x } from '../../../codex/core/pixelbrain/pixel-scale-amp.js';

function buildRGBA(grid) {
  const h = grid.length;
  const w = grid[0].length;
  const buf = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = grid[y][x];
      const off = (y * w + x) * 4;
      buf[off] = r; buf[off+1] = g; buf[off+2] = b; buf[off+3] = 255;
    }
  }
  return buf;
}

function px(buf, w, x, y) {
  const off = (y * w + x) * 4;
  return [buf[off], buf[off+1], buf[off+2]];
}

const W = [255, 255, 255];
const B = [  0,   0,   0];

describe('colorDist', () => {
  it('returns 0 for identical colours', () => {
    expect(colorDist([128, 64, 32], [128, 64, 32])).toBe(0);
  });

  it('returns a large value for black vs white', () => {
    expect(colorDist(B, W)).toBeGreaterThan(100);
  });

  it('is symmetric', () => {
    const a = [200, 100, 50];
    const b = [50, 200, 100];
    expect(colorDist(a, b)).toBe(colorDist(b, a));
  });
});

describe('applyXBR2x', () => {
  it('doubles width and height', () => {
    const src = buildRGBA([[W, B], [B, W]]);
    const out = applyXBR2x(src, 2, 2);
    expect(out.length).toBe(4 * 4 * 4);
  });

  it('preserves solid-colour regions — no blending on flat areas', () => {
    const src = buildRGBA([[W,W,W],[W,W,W],[W,W,W]]);
    const out = applyXBR2x(src, 3, 3);
    for (let i = 0; i < out.length; i += 4) {
      expect(out[i]).toBe(255);
      expect(out[i+1]).toBe(255);
      expect(out[i+2]).toBe(255);
    }
  });

  it('keeps straight horizontal edges sharp — no blur on the edge row', () => {
    const src = buildRGBA([
      [W, W, W],
      [W, W, W],
      [B, B, B],
      [B, B, B],
    ]);
    const out = applyXBR2x(src, 3, 4);
    const outW = 6;
    const [r3, g3, b3] = px(out, outW, 1, 3);
    expect(r3).toBe(255);
    expect(g3).toBe(255);
    expect(b3).toBe(255);
    const [r4, g4, b4] = px(out, outW, 1, 4);
    expect(r4).toBe(0);
    expect(g4).toBe(0);
    expect(b4).toBe(0);
  });

  it('blends the staircase corner on a 45° diagonal edge', () => {
    const src = buildRGBA([
      [W, W, W, W, B],
      [W, W, W, B, B],
      [W, W, W, B, B],
      [W, B, B, B, B],
      [B, B, B, B, B],
    ]);
    const out = applyXBR2x(src, 5, 5);
    const outW = 10;
    const [r, g, b] = px(out, outW, 5, 5);
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThan(255);
  });

  it('alpha channel is always 255', () => {
    const src = buildRGBA([[W, B], [B, W]]);
    const out = applyXBR2x(src, 2, 2);
    for (let i = 3; i < out.length; i += 4) {
      expect(out[i]).toBe(255);
    }
  });
});
