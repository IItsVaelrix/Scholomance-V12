// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BytecodeVisualiserPage from '../../src/pages/Visualiser/BytecodeVisualiserPage';

beforeEach(() => {
  // No alignment artifacts in jsdom — the hook must fall back silently.
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }));
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('library shelf', () => {
  it('renders a tile per registry track with the active one pressed', () => {
    render(<BytecodeVisualiserPage />);
    const shelf = screen.getByRole('region', { name: /library/i });
    const tiles = shelf.querySelectorAll('button[aria-pressed]');
    expect(tiles.length).toBeGreaterThanOrEqual(2);
    expect(tiles[0].getAttribute('aria-pressed')).toBe('true');
  });

  it('switches the grimoire to Big Father and deep-links it', () => {
    render(<BytecodeVisualiserPage />);
    fireEvent.click(screen.getByRole('button', { name: /Big Father/i }));
    expect(screen.getByRole('heading', { level: 1, name: /Big Father/i })).toBeTruthy();
    expect(window.location.search).toContain('track=eaba93dc');
  });

  it('honours ?track= on mount', () => {
    window.history.replaceState(null, '', '/?track=eaba93dc-bf75-4319-a67e-ddcedafc1c43');
    render(<BytecodeVisualiserPage />);
    expect(screen.getByRole('heading', { level: 1, name: /Big Father/i })).toBeTruthy();
  });
});
