/**
 * Wires the React host to the Phaser arena scene's tile events.
 *
 * Why this exists: scenes passed through the Phaser game config are queued in
 * the SceneManager's `_pending` list and are only moved into the keyed
 * registry during `bootQueue`, which runs on the game's `ready` event. So
 * `game.scene.getScene(key)` returns `null` synchronously right after
 * `new Phaser.Game(...)`. Wiring listeners at that moment silently attaches
 * nothing — right-click then emits `tile-inspect` into the void and the
 * inspect tooltip never renders. Defer the wiring to `ready`, matching the
 * working IDEAmbientCanvas / SigilChamber pattern.
 *
 * Pure and Phaser-free so the boot-race contract stays unit-testable.
 *
 * @param {object} game - Phaser.Game instance.
 * @param {string} sceneKey - Registered scene key, e.g. 'CombatArenaScene'.
 * @param {(action: object) => void} handler - Receives tile-inspect/tile-error payloads.
 */
export function bridgeArenaScene(game, sceneKey, handler) {
  const wire = () => {
    const scene = game?.scene?.getScene?.(sceneKey);
    if (!scene?.events) return false;

    // Drop any prior listeners so a hot reload / remount can't double-fire.
    scene.events.off('tile-inspect');
    scene.events.off('tile-error');
    scene.events.on('tile-inspect', handler);
    scene.events.on('tile-error', handler);
    return true;
  };

  if (game?.isRunning) {
    // Already past boot (fast remount) — the scene is in the registry now.
    wire();
  } else {
    game?.events?.once?.('ready', wire);
  }
}
