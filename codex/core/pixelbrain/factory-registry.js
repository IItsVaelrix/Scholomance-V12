/**
 * Class Factory Registry
 * Centralizes microprocessor routing for different item classes.
 * Removes hardcoded if/else switches from the item foundry core.
 */

const REGISTRY = new Map();

/**
 * Register a factory function for an item class and archetype.
 * @param {string} itemClass - e.g., 'armor', 'weapon'
 * @param {string} archetype - e.g., 'chestplate', 'sword'. Pass '*' for wildcard/fallback.
 * @param {Function} factoryFn - The route factory function returning { routeDefinition, expansion }
 */
export function registerClassFactory(itemClass, archetype, factoryFn) {
  if (typeof itemClass !== 'string' || !itemClass) {
    throw new Error('registerClassFactory: itemClass must be a non-empty string');
  }
  if (typeof factoryFn !== 'function') {
    throw new Error('registerClassFactory: factoryFn must be a function');
  }
  const key = `${itemClass}:${archetype || '*'}`;
  REGISTRY.set(key, factoryFn);
}

/**
 * Get the most specific factory function for a class/archetype combination.
 */
export function getClassFactory(itemClass, archetype) {
  const specific = REGISTRY.get(`${itemClass}:${archetype}`);
  if (specific) return specific;
  return REGISTRY.get(`${itemClass}:*`) || null;
}
