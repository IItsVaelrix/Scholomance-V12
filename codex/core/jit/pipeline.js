export function createPipeline(pipelineContext = {}) {
  const routeStore = [];
  const entries = new Map();

  return {
    register(route) {
      if (!route) return null;
      if (typeof route.routeKey !== 'string') return null;

      entries.set(route.routeKey, route);
      routeStore.push(route);
      return route;
    },
    resolve(routeKey) {
      const route = entries.get(routeKey);
      if (!route) return null;
      return route;
    },
    routeKeys() {
      return Array.from(entries.keys());
    },
  };
}

export function runPipeline(pipeline, shellContext) {
  if (!pipeline || typeof pipeline.resolve !== 'function') {
    return { passed: false, entries: [] };
  }

  const entries = [];
  for (const key of pipeline.routeKeys()) {
    const route = pipeline.resolve(key);
    entries.push(route);
  }

  return {
    passed: true,
    entries,
    status: 'completed',
  };
}
