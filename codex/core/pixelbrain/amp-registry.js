// Minimal stub for amp-registry to allow character-foundry to load.
// The real implementation would register and manage AMP processors.
const REGISTRY = Object.create(null);

export function registerAmp(id, impl, meta = {}) {
  REGISTRY[id] = { impl, meta };
}

export function getAmp(id) {
  return REGISTRY[id] || null;
}

export function listAmps() {
  return Object.keys(REGISTRY);
}

export default { registerAmp, getAmp, listAmps };
