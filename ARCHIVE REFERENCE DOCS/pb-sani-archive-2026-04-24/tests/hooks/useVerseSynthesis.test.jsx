import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useVerseSynthesis } from '../../src/hooks/useVerseSynthesis';

// Mock the microprocessor runner
vi.mock('../../codex/core/microprocessors/index.js', () => ({
  verseIRMicroprocessors: {
    run: vi.fn().mockImplementation(async (id, payload) => {
      if (id === 'nlu.synthesizeVerse') {
        return {
          timestamp: Date.now(),
          verseIR: { metadata: { syllableCount: 5 } },
          syntaxLayer: { allConnections: [] },
          scheme: { id: 'COUPLET' },
          meter: null,
          vowelSummary: { families: [] },
          literaryDevices: [],
          emotion: 'Neutral',
          tokenByIdentity: new Map(),
          tokenByCharStart: new Map(),
          tokenByNormalizedWord: new Map(),
          totalSyllables: 5,
          scoreData: { totalScore: 77 },
        };
      }
      return null;
    })
  }
}));

describe('useVerseSynthesis hook', () => {
  it('initializes with null artifact', () => {
    const { result } = renderHook(() => useVerseSynthesis(''));
    expect(result.current.artifact).toBeNull();
    expect(result.current.isSynthesizing).toBe(false);
  });

  it('triggers synthesis after debounce', async () => {
    const { result, rerender } = renderHook(({ text }) => useVerseSynthesis(text), {
      initialProps: { text: 'Flame and name' }
    });

    // Should be synthesizing after a brief delay (simulated by waitFor)
    await waitFor(() => {
      expect(result.current.artifact).not.toBeNull();
    }, { timeout: 2000 });

    expect(result.current.totalSyllables).toBe(5);
    expect(result.current.artifact.scoreData.totalScore).toBe(77);
  });

  it('clears artifact when text is empty', async () => {
    const { result, rerender } = renderHook(({ text }) => useVerseSynthesis(text), {
      initialProps: { text: 'Some text' }
    });

    await waitFor(() => expect(result.current.artifact).not.toBeNull());

    rerender({ text: '' });
    expect(result.current.artifact).toBeNull();
  });
});
