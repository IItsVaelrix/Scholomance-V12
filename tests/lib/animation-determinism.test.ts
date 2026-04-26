import { describe, it, expect } from 'vitest';
import { getAllPresets } from '../../src/codex/animation/presets/presetRegistry';

describe('Animation Preset Determinism', () => {
  it('ensures all registered presets have stable, deterministic defaults', () => {
    const presets = getAllPresets();
    
    // We snapshot the entire registry to detect accidental changes to constants
    const simplified = presets.map(p => ({
        name: p.name,
        defaults: p.defaults,
        flags: p.flags,
    }));

    expect(simplified).toMatchSnapshot();
  });

  it('all presets must have a version and description', () => {
    const presets = getAllPresets();
    presets.forEach(p => {
        expect(p.version).toBeDefined();
        expect(p.description).toBeDefined();
        expect(p.name).toBeDefined();
    });
  });
});
