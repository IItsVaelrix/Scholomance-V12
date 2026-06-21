import { describe, it, expect, beforeEach } from 'vitest';
import { applyDecoded, removeDecoded } from '../../../src/lib/lexical/TruesightNode.js';

// Guards the bytecode-glow shape fix: decodeBytecode returns { style, className },
// where style holds --vb-* custom properties and className the vb-effect tier.
// The old code iterated the whole object as inline styles and dropped all of it.
describe('TruesightNode applyDecoded', () => {
  let dom;
  beforeEach(() => { dom = document.createElement('span'); });

  const decoded = {
    style: { '--vb-glow-intensity': 0.8, '--vb-saturation-boost': 0.5, '--vb-syllable-depth': 2 },
    className: 'vb-effect--resonant vb-school--sonic vb-anchor',
    color: '#1980e6',
  };

  it('applies --vb-* custom properties and vb-* effect classes', () => {
    applyDecoded(dom, decoded);
    expect(dom.style.getPropertyValue('--vb-glow-intensity')).toBe('0.8');
    expect(dom.style.getPropertyValue('--vb-saturation-boost')).toBe('0.5');
    expect(dom.classList.contains('vb-effect--resonant')).toBe(true);
    expect(dom.classList.contains('vb-school--sonic')).toBe(true);
    expect(dom.classList.contains('vb-anchor')).toBe(true);
  });

  it('does NOT create bogus inline keys (the old bug)', () => {
    applyDecoded(dom, decoded);
    expect(dom.style.style).toBeUndefined();
    expect(dom.getAttribute('style')).not.toMatch(/className/);
  });

  it('removeDecoded clears the props and classes it added', () => {
    applyDecoded(dom, decoded);
    removeDecoded(dom, decoded);
    expect(dom.style.getPropertyValue('--vb-glow-intensity')).toBe('');
    expect(dom.classList.contains('vb-effect--resonant')).toBe(false);
    expect(dom.classList.contains('vb-anchor')).toBe(false);
  });

  it('is a no-op for null decoded', () => {
    expect(() => applyDecoded(dom, null)).not.toThrow();
    expect(() => removeDecoded(dom, undefined)).not.toThrow();
  });
});
