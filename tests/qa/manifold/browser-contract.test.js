import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  MANIFOLD_WORKLET_MESSAGES,
  createManifoldMessage,
} from '../../../src/audio/manifold/manifold.messages.js';
import { compileManifoldDsl, loadManifoldPreset } from '../../../codex/core/manifold/index.js';

const ROOT = path.resolve(__dirname, '../../..');
const PRESET_DIR = path.join(ROOT, 'presets/manifold');

describe('Cochlear Manifold browser contract', () => {
  it('defines stable message names for the main thread and AudioWorklet', () => {
    expect(MANIFOLD_WORKLET_MESSAGES).toEqual({
      PREPARE: 'MANIFOLD_PREPARE',
      LOAD_PROGRAM: 'MANIFOLD_LOAD_PROGRAM',
      SET_MACROS: 'MANIFOLD_SET_MACROS',
      FREEZE: 'MANIFOLD_FREEZE',
      PANIC: 'MANIFOLD_PANIC',
      EVENT_BATCH: 'MANIFOLD_EVENT_BATCH',
      STATUS: 'MANIFOLD_STATUS',
    });
    expect(createManifoldMessage(MANIFOLD_WORKLET_MESSAGES.PANIC)).toEqual({
      type: 'MANIFOLD_PANIC',
      payload: {},
    });
  });

  it('ships factory presets with cached bytecode that matches the current compiler', () => {
    const files = fs.readdirSync(PRESET_DIR).filter((file) => file.endsWith('.json')).sort();

    expect(files).toEqual([
      'ash-lung.json',
      'cathedral-of-teeth.json',
      'ice-circuit.json',
      'substrate-maw.json',
      'void-glass.json',
    ]);

    for (const file of files) {
      const preset = JSON.parse(fs.readFileSync(path.join(PRESET_DIR, file), 'utf8'));
      const compiled = compileManifoldDsl(preset.dslSource);
      const loaded = loadManifoldPreset(preset);

      expect(compiled.ok, file).toBe(true);
      expect(loaded.ok, file).toBe(true);
      expect(loaded.recompiled, file).toBe(false);
      expect(preset.bytecode.contentHash, file).toBe(compiled.program.contentHash);
      expect(preset.bytecode.safety.hasUnsafeCycles, file).toBe(false);
    }
  });
});
