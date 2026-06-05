import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the heavy engine: a Phaser.Game stand-in that records destroy() calls.
const destroyCalls = { count: 0 };
class FakeGame {
  constructor(config) {
    this.config = config;
    this.destroyed = false;
  }
  destroy() {
    this.destroyed = true;
    destroyCalls.count += 1;
  }
}
vi.mock('phaser', () => ({ default: { Game: FakeGame } }));

const { mountPhaserGame } = await import('../../src/lib/phaser/phaser-runtime.adapter.js');

const buildScenes = [(Phaser) => ({ phaser: Phaser, kind: 'scene' })];

beforeEach(() => {
  destroyCalls.count = 0;
});

describe('mountPhaserGame — abort safety', () => {
  it('returns a live game + destroy() on a normal mount', async () => {
    const controller = new AbortController();
    const handle = await mountPhaserGame({ parent: {}, buildScenes, signal: controller.signal });
    expect(handle).not.toBeNull();
    expect(handle.game).toBeInstanceOf(FakeGame);
    expect(handle.game.destroyed).toBe(false);
  });

  it('builds nothing if the signal is already aborted before load resolves', async () => {
    const controller = new AbortController();
    controller.abort();
    const handle = await mountPhaserGame({ parent: {}, buildScenes, signal: controller.signal });
    expect(handle).toBeNull();
    expect(destroyCalls.count).toBe(0); // never constructed -> never destroyed
  });

  it('destroys the game if the signal aborts AFTER construction (the host race)', async () => {
    const controller = new AbortController();
    // Abort the instant the game is constructed: the abort listener must tear it down even
    // though the host would early-return without destroying.
    const handle = await mountPhaserGame({
      parent: {},
      buildScenes,
      signal: controller.signal,
    });
    // Simulate the host's cleanup firing after the handle resolved.
    controller.abort();
    expect(handle.game.destroyed).toBe(true);
    expect(destroyCalls.count).toBe(1);
  });

  it('destroy() is idempotent — abort + explicit destroy do not double-destroy', async () => {
    const controller = new AbortController();
    const handle = await mountPhaserGame({ parent: {}, buildScenes, signal: controller.signal });
    controller.abort(); // listener -> destroy (1)
    handle.destroy(); // explicit cleanup -> no-op
    handle.destroy(); // again -> no-op
    expect(destroyCalls.count).toBe(1);
  });

  it('works with no signal (destroy still functions)', async () => {
    const handle = await mountPhaserGame({ parent: {}, buildScenes });
    expect(handle.game.destroyed).toBe(false);
    handle.destroy();
    expect(handle.game.destroyed).toBe(true);
  });

  it('passes the Phaser instance into each scene factory', async () => {
    const handle = await mountPhaserGame({ parent: {}, buildScenes, signal: new AbortController().signal });
    expect(handle.game.config.scene[0]).toMatchObject({ kind: 'scene' });
    expect(handle.game.config.scene[0].phaser).toEqual({ Game: FakeGame });
  });
});
