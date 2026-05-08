import { describe, it, expect, vi } from 'vitest';
import { verseIRMicroprocessors } from '../../../codex/core/microprocessors/index.js';

describe('Animation Microprocessors', () => {
  describe('pixel.compileAnimation', () => {
    it('should compile a simple animation blueprint', async () => {
      const blueprint = `
        ANIM_START
        ID test-anim
        TARGET id player-orb
        DURATION 800
        EASE linear
        LOOP true
        SCALE BASE 1.0 PEAK 1.2
        ANIM_END
      `;

      const output = await verseIRMicroprocessors.execute('pixel.compileAnimation', {
        source: blueprint,
        targets: ['bytecode']
      });

      expect(output).toBeDefined();
      expect(output.targets.bytecode).toBeDefined();
    });

    it('should throw error if source is missing', async () => {
      try {
        await verseIRMicroprocessors.execute('pixel.compileAnimation', {});
        expect.fail('Should have thrown');
      } catch (error) {
        // PB-ERR-v1-HOOK-CRIT-EXTREG-0403 (HOOK_CHAIN_BREAK)
        expect(error.message).toContain('PB-ERR-v1-HOOK-CRIT');
        expect(error.message).toContain('0403');
      }
    });
  });

  describe('pixel.calculateRotation', () => {
    it('should calculate deterministic rotation based on BPM', async () => {
      const timeMs = 1000;
      const bpm = 60; // 1 beat per second
      const degreesPerBeat = 360; // full rotation per beat
      
      // Expected: 1 second * 1 beat/sec * 360 deg = 360 deg = 2pi radians = 0 radians (normalized)
      const rotation = await verseIRMicroprocessors.execute('pixel.calculateRotation', {
        absoluteTimeMs: timeMs,
        bpm,
        degreesPerBeat
      });

      expect(rotation).toBeCloseTo(0, 5);
    });

    it('should use default BPM if not provided', async () => {
      const rotation = await verseIRMicroprocessors.execute('pixel.calculateRotation', {
        absoluteTimeMs: 1000
      });
      expect(typeof rotation).toBe('number');
    });
  });
});
