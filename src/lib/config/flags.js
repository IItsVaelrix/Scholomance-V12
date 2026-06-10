function createFeatureFlags(overrides = {}) {
  const defaults = {
    ENABLE_G2P_JURY: false,
  };

  return {
    ...defaults,
    ...overrides,
  };
}

export const FEATURE_FLAGS = createFeatureFlags();

export function getFeatureFlag(name) {
  return FEATURE_FLAGS[name] ?? false;
}
