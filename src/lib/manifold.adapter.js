import { compileManifoldDsl, classifyManifoldEvents, loadManifoldPreset } from '../../codex/core/manifold/index.js';
import { getManifoldFactoryPresets } from '../../codex/core/manifold/factory-presets.js';

export {
  classifyManifoldEvents,
  compileManifoldDsl,
  loadManifoldPreset,
};

export function getFactoryManifoldPresets() {
  return getManifoldFactoryPresets();
}
