/**
 * JIT Piece Sprite Cache
 *
 * Cache key: `${pieceId}:${materialId}`
 * Equipment swap invalidates one piece entry. Everything else hits cache.
 * fill() is called at most once per (pieceId, materialId) pair until invalidated.
 */

export function createSpriteCache() {
  const store = new Map();

  function key(pieceId, materialId) {
    return `${pieceId}:${materialId}`;
  }

  return {
    async get(pieceId, materialId, fill) {
      const k = key(pieceId, materialId);
      if (store.has(k)) return store.get(k);
      const promise = fill();
      store.set(k, promise);
      return promise;
    },

    // pieceId must not contain ':' — the key separator — to avoid false-positive invalidation
    invalidatePiece(pieceId) {
      for (const k of store.keys()) {
        if (k.startsWith(`${pieceId}:`)) store.delete(k);
      }
    },

    clear() {
      store.clear();
    },
  };
}
