/**
 * PixelBrain Shader Uniform Registry
 *
 * Manages uniform providers so spelling, time, and game state can be
 * injected modularly into shader preview/export steps.
 */

const providers = new Map();

/**
 * Register a new uniform provider
 * @param {string} providerId - Unique provider ID
 * @param {Object} provider - Provider object { uniforms: string[], resolve: Function }
 */
export function registerUniformProvider(providerId, provider) {
  if (!providerId || typeof providerId !== 'string') {
    throw new Error('Provider ID must be a non-empty string');
  }
  if (!provider || typeof provider.resolve !== 'function') {
    throw new Error('Provider must have a resolve function');
  }

  providers.set(providerId, {
    id: providerId,
    uniforms: Array.isArray(provider.uniforms) ? [...provider.uniforms] : [],
    resolve: provider.resolve,
  });
}

/**
 * Get all registered uniform providers
 * @returns {Array} List of registered providers
 */
export function getUniformProviders() {
  return Array.from(providers.values());
}

/**
 * Clear all registered uniform providers (except default core-time)
 */
export function clearUniformRegistry() {
  providers.clear();
  registerDefaultProviders();
}

/**
 * Resolve all shader uniforms deterministically from registered providers
 * @param {Object} context - Resolution context (time, spell state, etc.)
 * @returns {Object} Resolution result matching registry contract
 */
export function resolveShaderUniforms(context = {}) {
  const resolvedUniforms = {};
  const appliedProviders = [];
  const warnings = [];

  // Sort providers alphabetically by ID to guarantee deterministic merge order
  const sortedProviders = Array.from(providers.entries())
    .sort((a, b) => a[0].localeCompare(b[0]));

  for (const [providerId, provider] of sortedProviders) {
    try {
      const result = provider.resolve(context);
      if (result && typeof result === 'object') {
        for (const [key, val] of Object.entries(result)) {
          if (key in resolvedUniforms) {
            warnings.push(`Duplicate uniform name '${key}' from provider '${providerId}'`);
          }
          resolvedUniforms[key] = val;
        }
        appliedProviders.push(providerId);
      }
    } catch (err) {
      return {
        ok: false,
        error: 'PROVIDER_RESOLUTION_FAILED',
        providerId,
        uniforms: {},
        providers: [],
        warnings: [err.message],
      };
    }
  }

  return {
    ok: true,
    uniforms: resolvedUniforms,
    providers: appliedProviders,
    warnings,
  };
}

function registerDefaultProviders() {
  // Pre-register standard `core-time` provider
  registerUniformProvider('core-time', {
    uniforms: ['u_time'],
    resolve(context) {
      // Abstain when the context carries no time signal: a fabricated 0 would
      // shadow declared dot-notation sources (e.g. clock.elapsedSeconds) in
      // downstream resolvers, which own the default-value fallback.
      if (typeof context.time === 'number') return { u_time: context.time };
      if (context.u_time !== undefined) return { u_time: context.u_time };
      return {};
    },
  });
}

// Initialize default providers
registerDefaultProviders();
