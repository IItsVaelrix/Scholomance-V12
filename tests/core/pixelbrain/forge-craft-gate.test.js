import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { runForgeCraftGate } from '../../../codex/core/pixelbrain/forge-craft-gate.js';
import { BytecodeError, ERROR_CODES } from '../../../codex/core/pixelbrain/bytecode-error.js';
import * as itemFoundryMod from '../../../codex/core/pixelbrain/item-foundry.js';
import { vi } from 'vitest';

const PICKAXE_SPEC = JSON.parse(readFileSync('specs/voidmetal-pickaxe.v1.json', 'utf8'));

describe('PixelBrain Craft Gate', () => {
  it('passes the golden voidmetal pickaxe spec and emits PB-XP-v1', () => {
    const result = runForgeCraftGate(PICKAXE_SPEC);
    expect(result.ok).toBe(true);
    expect(result.vaccine).toMatch(/^PB-XP-v1-HLTH-/);
    expect(result.bundle.assetPacket).toBeDefined();
    expect(result.bundle.routeDiagnostics.ok).toBe(true);
  });

  it('fails if pickaxe anatomy is missing (e.g. head_core)', () => {
    const mutated = JSON.parse(JSON.stringify(PICKAXE_SPEC));
    mutated.parts = mutated.parts.filter(p => p.id !== 'head_core');
    try {
      runForgeCraftGate(mutated);
      expect.fail('Should have thrown BytecodeError');
    } catch (error) {
      expect(error).toBeInstanceOf(BytecodeError);
      expect(error.errorCode).toBe(ERROR_CODES.IMMUNE_INNATE_BLOCK);
      expect(error.context.reason).toMatch(/(routeDiagnostics failed|forgeItemAsset threw exception)/);
    }
  });

  it('fails if material color is illegal (off-palette material id)', () => {
    const mutated = JSON.parse(JSON.stringify(PICKAXE_SPEC));
    mutated.parts[0].fill.material = 'unauthorized_glow';
    try {
      runForgeCraftGate(mutated);
      expect.fail('Should have thrown BytecodeError');
    } catch (error) {
      expect(error).toBeInstanceOf(BytecodeError);
      expect([ERROR_CODES.INVALID_VALUE, ERROR_CODES.IMMUNE_INNATE_BLOCK]).toContain(error.errorCode);
      expect(error.context.reason).toMatch(/(illegal material|forgeItemAsset threw exception)/);
    }
  });
  
  it('fails if handle is jagged diagonal (mutating params to induce failure)', () => {
    const mutated = JSON.parse(JSON.stringify(PICKAXE_SPEC));
    const handle = mutated.parts.find(p => p.id === 'handle');
    handle.params.dx = -10; // Breaks 45-degree angle required by tool.pickaxe.handle.diagonal
    try {
      runForgeCraftGate(mutated);
      expect.fail('Should have thrown BytecodeError');
    } catch (error) {
      expect(error).toBeInstanceOf(BytecodeError);
      expect(error.errorCode).toBe(ERROR_CODES.IMMUNE_INNATE_BLOCK);
      expect(error.context.reason).toContain('jagged diagonal handle');
    }
  });

  it('fails if coordinates are off-grid', () => {
    const mutated = JSON.parse(JSON.stringify(PICKAXE_SPEC));
    const core = mutated.parts.find(p => p.id === 'head_core');
    core.params.cx = 32.5; // Off-grid float
    try {
      runForgeCraftGate(mutated);
      expect.fail('Should have thrown BytecodeError');
    } catch (error) {
      expect(error).toBeInstanceOf(BytecodeError);
      expect(error.errorCode).toBe(ERROR_CODES.IMMUNE_INNATE_BLOCK);
      expect(error.context.reason).toContain('off-grid coordinate');
    }
  });
  
  it('fails if voxelPacket determinism check fails', () => {
    // Mock the second call to forgeItemAsset to return a mutated voxelPacket
    const originalForge = itemFoundryMod.forgeItemAsset;
    let callCount = 0;
    const mockForge = vi.fn((spec) => {
      const result = originalForge(spec);
      callCount++;
      if (callCount === 2) {
        // Mutate the second output
        result.voxelPacket.materials['1'].colorHint = '#FFFFFF';
      }
      return result;
    });
    
    vi.spyOn(itemFoundryMod, 'forgeItemAsset').mockImplementation(mockForge);

    try {
      runForgeCraftGate(PICKAXE_SPEC);
      expect.fail('Should have thrown non-determinism error');
    } catch (error) {
      expect(error).toBeInstanceOf(BytecodeError);
      expect(error.errorCode).toBe(ERROR_CODES.IMMUNE_INNATE_BLOCK);
      expect(error.context.reason).toContain('non-deterministic forge output');
    } finally {
      vi.restoreAllMocks();
    }
  });
});
