// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLyricAlignment } from '../../src/kits/scholomance-visualizer-kit/hooks/useLyricAlignment';

const VALID = {
  version: 'alignment-v1',
  trackId: 't1',
  source: { aligner: 'torchaudio-mms_fa', separator: 'htdemucs', generatedAt: '2026-06-10T00:00:00Z' },
  lines: [{ index: 0, startS: 9.3, endS: 12.8 }],
  words: [{ line: 0, word: 0, text: 'I', startS: 9.3, endS: 9.4, confidence: 0.9, interpolated: false }],
};

const flush = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => vi.unstubAllGlobals());

describe('useLyricAlignment', () => {
  it('returns the parsed alignment when the artifact loads', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => VALID }));
    const { result } = renderHook(() => useLyricAlignment('t1'));
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current.words).toHaveLength(1);
    expect(fetch).toHaveBeenCalledWith('/data/alignment/t1.alignment-v1.json');
  });

  it('stays null on HTTP failure and reports it as a MISSING artifact', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }));
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const { result } = renderHook(() => useLyricAlignment('t1'));
    await flush();
    expect(result.current).toBeNull();
    expect(info).toHaveBeenCalledWith(expect.stringContaining('no artifact for t1 (HTTP 404)'));
    info.mockRestore();
  });

  it('stays null on schema mismatch and reports it as a REJECTED artifact (not missing)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ version: 'alignment-v2' }) }));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useLyricAlignment('t1'));
    await flush();
    expect(result.current).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('artifact for t1 rejected'));
    warn.mockRestore();
  });

  it('stays null when the artifact is for a different track', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...VALID, trackId: 'other' }) }));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useLyricAlignment('t1'));
    await flush();
    expect(result.current).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('rejected'));
    warn.mockRestore();
  });

  it('stays null on network error and reports a fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const { result } = renderHook(() => useLyricAlignment('t1'));
    await flush();
    expect(result.current).toBeNull();
    expect(info).toHaveBeenCalledWith(expect.stringContaining('artifact fetch failed for t1'));
    info.mockRestore();
  });
});
