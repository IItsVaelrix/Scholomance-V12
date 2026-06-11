import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { publishWandFill, readWandFill, clearWandFill } from '../../../src/lib/wandPixelbrainBridge.js';
import { BytecodeError, decodeBytecodeError } from '../../../codex/core/pixelbrain/bytecode-error.js';
import { Storage } from '../../../src/lib/platform/storage.js';

describe('Wand → PixelBrain Bridge Validation', () => {
  beforeEach(() => {
    clearWandFill();
  });

  afterEach(() => {
    clearWandFill();
  });

  it('successfully publishes a valid spec', () => {
    const validSpec = {
      bytecode: 'VW-VOID-COMMON-INERT',
      schoolId: 'VOID',
      rarity: 'COMMON',
      effect: 'INERT',
      role: 'test-role',
      material: 'test-material'
    };

    const result = publishWandFill(validSpec);
    expect(result).toBe(true);

    const read = readWandFill();
    expect(read).toBeDefined();
    expect(read.bytecode).toBe('VW-VOID-COMMON-INERT');
    expect(read.schoolId).toBe('VOID');
  });

  it('throws BytecodeError if spec is null or undefined', () => {
    expect(() => publishWandFill(null)).toThrow(BytecodeError);
    expect(() => publishWandFill(undefined)).toThrow(BytecodeError);
  });

  it('throws BytecodeError on missing required fields', () => {
    const missingBytecode = {
      schoolId: 'VOID',
      rarity: 'COMMON',
      effect: 'INERT'
    };
    try {
      publishWandFill(missingBytecode);
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(BytecodeError);
      expect(err.bytecode).toContain('PB-ERR-v1-VALUE-CRIT-IMGFOR-F001');
      const decoded = decodeBytecodeError(err.bytecode);
      expect(decoded.context.reason).toContain('bytecode" is missing');
    }

    const missingSchool = {
      bytecode: 'VW-VOID-COMMON-INERT',
      rarity: 'COMMON',
      effect: 'INERT'
    };
    try {
      publishWandFill(missingSchool);
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(BytecodeError);
      expect(err.bytecode).toContain('PB-ERR-v1-VALUE-CRIT-IMGFOR-F001');
      const decoded = decodeBytecodeError(err.bytecode);
      expect(decoded.context.reason).toContain('schoolId" is missing');
    }
  });

  it('throws BytecodeError on invalid enum values', () => {
    const invalidSchool = {
      bytecode: 'VW-VOID-COMMON-INERT',
      schoolId: 'INVALID_SCHOOL',
      rarity: 'COMMON',
      effect: 'INERT'
    };
    try {
      publishWandFill(invalidSchool);
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(BytecodeError);
      expect(err.bytecode).toContain('PB-ERR-v1-VALUE-CRIT-IMGFOR-F001');
      const decoded = decodeBytecodeError(err.bytecode);
      expect(decoded.context.reason).toContain('Invalid schoolId');
    }

    const invalidRarity = {
      bytecode: 'VW-VOID-COMMON-INERT',
      schoolId: 'VOID',
      rarity: 'MYSTICAL',
      effect: 'INERT'
    };
    try {
      publishWandFill(invalidRarity);
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(BytecodeError);
      expect(err.bytecode).toContain('PB-ERR-v1-VALUE-CRIT-IMGFOR-F001');
      const decoded = decodeBytecodeError(err.bytecode);
      expect(decoded.context.reason).toContain('Invalid rarity');
    }
  });

  it('throws BytecodeError on readWandFill if stored data is invalid', () => {
    const key = 'pixelbrain.wandFill.v1';
    
    // Test missing required fields on read
    Storage.setItem(key, JSON.stringify({
      schoolId: 'VOID',
      rarity: 'COMMON',
      effect: 'INERT'
    }));
    expect(() => readWandFill()).toThrow(BytecodeError);

    // Test invalid enums on read
    Storage.setItem(key, JSON.stringify({
      bytecode: 'VW-VOID-COMMON-INERT',
      schoolId: 'INVALID_SCHOOL',
      rarity: 'COMMON',
      effect: 'INERT'
    }));
    expect(() => readWandFill()).toThrow(BytecodeError);
  });
});
