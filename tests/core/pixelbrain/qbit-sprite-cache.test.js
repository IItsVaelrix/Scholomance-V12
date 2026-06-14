import { describe, it, expect, vi } from 'vitest';
import { createSpriteCache } from '../../../codex/core/pixelbrain/qbit-sprite-cache.js';

describe('createSpriteCache', () => {
  it('calls fill on cache miss and returns sprite', async () => {
    const cache = createSpriteCache();
    const fill = vi.fn().mockResolvedValue({ pixels: new Uint8ClampedArray(4) });
    const sprite = await cache.get('torso', 'iron', fill);
    expect(fill).toHaveBeenCalledOnce();
    expect(sprite).toBeDefined();
  });

  it('returns cached sprite on second get without calling fill', async () => {
    const cache = createSpriteCache();
    const fill = vi.fn().mockResolvedValue({ pixels: new Uint8ClampedArray(4) });
    await cache.get('torso', 'iron', fill);
    await cache.get('torso', 'iron', fill);
    expect(fill).toHaveBeenCalledOnce();
  });

  it('invalidates only the swapped piece on equipment swap', async () => {
    const cache = createSpriteCache();
    const fill = vi.fn().mockResolvedValue({ pixels: new Uint8ClampedArray(4) });
    await cache.get('torso', 'iron', fill);
    await cache.get('pauldrons', 'iron', fill);
    cache.invalidatePiece('torso');
    await cache.get('torso', 'iron', fill);
    await cache.get('pauldrons', 'iron', fill);
    // torso re-filled (2 calls), pauldrons still cached (1 call) = 3 total
    expect(fill).toHaveBeenCalledTimes(3);
  });

  it('different material = different cache entry', async () => {
    const cache = createSpriteCache();
    const fill = vi.fn().mockResolvedValue({ pixels: new Uint8ClampedArray(4) });
    await cache.get('torso', 'iron', fill);
    await cache.get('torso', 'gold', fill);
    expect(fill).toHaveBeenCalledTimes(2);
  });

  it('clear removes all entries', async () => {
    const cache = createSpriteCache();
    const fill = vi.fn().mockResolvedValue({ pixels: new Uint8ClampedArray(4) });
    await cache.get('torso', 'iron', fill);
    cache.clear();
    await cache.get('torso', 'iron', fill);
    expect(fill).toHaveBeenCalledTimes(2);
  });
});
