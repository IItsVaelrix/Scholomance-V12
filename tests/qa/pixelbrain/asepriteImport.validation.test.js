import { describe, it, expect } from 'vitest';
import { validateAsepriteImportPayload, importFromAseprite } from '../../../codex/core/pixelbrain/template-grid-engine.js';

describe('PixelBrain — Aseprite Import Validation', () => {
  const validPayload = {
    width: 32,
    height: 32,
    cellSize: 8,
    gridType: 'rectangular',
    snapStrength: 0.85,
    frames: [
      {
        duration: 100,
        layers: [
          {
            name: 'Layer 1',
            cells: [{ x: 8, y: 8, color: '#ffffff', emphasis: 1 }]
          }
        ]
      }
    ]
  };

  it('valid fixture imports successfully', () => {
    const res = validateAsepriteImportPayload(validPayload);
    expect(res.ok).toBe(true);

    const importRes = importFromAseprite(validPayload);
    expect(importRes.ok).toBe(true);
    expect(importRes.width).toBe(32);
  });

  it('missing frames fails', () => {
    const invalid = { ...validPayload };
    delete invalid.frames;

    const res = validateAsepriteImportPayload(invalid);
    expect(res.ok).toBe(false);
    expect(res.error).toBe('INVALID_SCHEMA');
  });

  it('width > 512 fails', () => {
    const invalid = { ...validPayload, width: 513 };
    const res = validateAsepriteImportPayload(invalid);
    expect(res.ok).toBe(false);
    expect(res.error).toBe('DIMENSIONS_OUT_OF_BOUNDS');
  });

  it('height > 512 fails', () => {
    const invalid = { ...validPayload, height: 1024 };
    const res = validateAsepriteImportPayload(invalid);
    expect(res.ok).toBe(false);
    expect(res.error).toBe('DIMENSIONS_OUT_OF_BOUNDS');
  });

  it('negative cell coordinates fail', () => {
    const invalid = JSON.parse(JSON.stringify(validPayload));
    invalid.frames[0].layers[0].cells[0].x = -5;

    const res = validateAsepriteImportPayload(invalid);
    expect(res.ok).toBe(false);
    expect(res.error).toBe('CELL_OUT_OF_BOUNDS');
  });

  it('unknown optional fields warn but do not fail', () => {
    const payload = { ...validPayload, someCustomMetadataField: 42 };
    const res = validateAsepriteImportPayload(payload);
    expect(res.ok).toBe(true);
    expect(res.warnings.length).toBeGreaterThan(0);
    expect(res.warnings[0]).toContain('someCustomMetadataField');
  });

  it('unknown critical fields fail', () => {
    const payload = { ...validPayload, critical_custom_engine_v1: true };
    const res = validateAsepriteImportPayload(payload);
    expect(res.ok).toBe(false);
    expect(res.error).toBe('INVALID_SCHEMA');
  });
});
