export function createBuiltinsRouter(sharedDependencies = {}) {
  const builtinRegistry = new Map();

  for (const [key, value] of Object.entries(sharedDependencies)) {
    builtinRegistry.set(key, value);
  }

  return {
    resolve(lookup) {
      if (typeof lookup !== 'function') {
        return () => lookup;
      }

      return (context = {}) => {
        const result = lookup(context);
        return result ?? null;
      };
    },
    register(name, value) {
      builtinRegistry.set(name, value);
    },
    get(name) {
      return builtinRegistry.get(name) ?? null;
    },
  };
}

export function createRouter(logger, dependencies = {}) {
  const sharedDependencies = { logger, ...dependencies };
  return createBuiltinsRouter(sharedDependencies);
}
