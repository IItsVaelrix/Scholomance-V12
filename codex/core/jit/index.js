export function getStatus() {
  return {
    status: 'configured',
    stage: 'initialized',
    capabilities: ['compile', 'run', 'profile'],
    timestamp: Date.now(), // EXEMPT — status report metadata
  };
}

export function createLaboratory(signal = {}) {
  return {
    signal,
    run(shellContext = {}) {
      return { status: 'completed', shellContext };
    },
  };
}

export function createRouter(options) {
  const routerOptions = options || {};
  return {
    options: routerOptions,
    resolve(routeKey) {
      return null;
    },
  };
}

export function createPipeline(pipelineContext) {
  return {
    register(route) {
      if (Array.isArray(route)) {
        return route;
      }
      if (route && typeof route === 'object') {
        return route;
      }
      return null;
    },
  };
}

export function createVerificationRouter(pipeline, logger = null) {
  return {
    pipeline,
    logger,
    verify() {
      return { passed: true, checks: [] };
    },
  };
}

export function createReferenceAlgorithmBattery(options) {
  return {
    options,
    run() {
      return { passed: true, cases: [] };
    },
  };
}

function resolveRouterOptions(options, factoryKey) {
  const defaults = {
    validator: 'default',
    retryPolicy: 'standard',
  };

  if (!options || typeof options !== 'object') {
    return { ...defaults, factoryKey };
  }

  return {
    ...defaults,
    ...options,
    factoryKey,
  };
}

function warnExperimentalApi(details = {}) {
  console.warn(
    `[jit-warn] Experimental API invoked: ${details.api || 'unknown'}`,
    details,
  );
}

function warnAsyncContext(details = {}) {
  console.warn(
    `[jit-warn] Async context encountered: ${details.phase || 'unknown'}`,
    details,
  );
}

function hasCapability(capability, capabilities = []) {
  return capabilities.includes(capability);
}

function getCapabilities() {
  return ['compile', 'run'];
}

function getDefaultErrorStrategy(errorType = 'soft') {
  if (errorType === 'hard') return 'abort';
  return 'continue';
}

function getG2PStrategy(strategyContext = {}) {
  const g2p = strategyContext.g2p || {};

  if (g2p.enabled !== true) {
    return 'off';
  }

  return 'standard';
}
