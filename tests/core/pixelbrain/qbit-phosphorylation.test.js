import { describe, it, expect, vi } from 'vitest';
import {
  COLLAPSE_THRESHOLD,
  buildKinase,
  phosphorylate,
} from '../../../codex/core/pixelbrain/qbit-phosphorylation.js';

const VALID_MATERIAL = {
  id: 'test_metal',
  anchors: { rim: '#111111', mid: '#888888', core: '#FFFFFF' },
  phosphorylationThreshold: undefined,
};

const VALID_SDF = {
  primitives: [{ type: 'circle', params: { center: { x: 8, y: 8 }, radius: 8 } }],
};

// A layer with no cells (template-grid-engine compatible)
function makeLayer() {
  return { cells: new Map(), visible: true, opacity: 1, locked: false };
}

describe('buildKinase', () => {
  it('returns invalid descriptor for null material', () => {
    const k = buildKinase(null, VALID_SDF);
    expect(k.valid).toBe(false);
    expect(k.reason).toBe('MISSING_SUBSTRATE');
    expect(k.call).toBeNull();
  });

  it('returns invalid descriptor for null sdfDescriptor', () => {
    const k = buildKinase(VALID_MATERIAL, null);
    expect(k.valid).toBe(false);
    expect(k.reason).toBe('MISSING_SUBSTRATE');
  });

  it('returns valid descriptor for real material + SDF', () => {
    const k = buildKinase(VALID_MATERIAL, VALID_SDF);
    expect(k.valid).toBe(true);
    expect(k.reason).toBeNull();
    expect(typeof k.call).toBe('function');
    expect(k.sdfDescriptor).toBe(VALID_SDF);
  });

  it('exposes material phosphorylationThreshold when defined', () => {
    const mat = { ...VALID_MATERIAL, phosphorylationThreshold: 0.8 };
    const k = buildKinase(mat, VALID_SDF);
    expect(k.threshold).toBe(0.8);
  });

  it('threshold is undefined when material does not define one', () => {
    const k = buildKinase(VALID_MATERIAL, VALID_SDF);
    expect(k.threshold).toBeUndefined();
  });
});

describe('phosphorylate — gate logic', () => {
  it('commits and calls setCell on valid inputs inside the SDF shape', () => {
    const layer = makeLayer();
    const kinase = buildKinase(VALID_MATERIAL, VALID_SDF);
    // (4,8) is inside the circle (center 8,8 radius 8)
    const result = phosphorylate(layer, 4, 8, kinase);
    expect(result.committed).toBe(true);
    expect(result.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(layer.cells.has('4,8')).toBe(true);
  });

  it('rejects with MISSING_SUBSTRATE when kinase.valid is false (null material)', () => {
    const layer = makeLayer();
    const kinase = buildKinase(null, VALID_SDF);
    const result = phosphorylate(layer, 4, 8, kinase);
    expect(result.committed).toBe(false);
    expect(result.reason).toBe('MISSING_SUBSTRATE');
  });

  it('rejects with MISSING_SUBSTRATE when SDF is missing from descriptor', () => {
    const layer = makeLayer();
    const kinase = buildKinase(VALID_MATERIAL, null);
    const result = phosphorylate(layer, 4, 8, kinase);
    expect(result.committed).toBe(false);
    expect(result.reason).toBe('MISSING_SUBSTRATE');
  });

  it('rejects with MISSING_SUBSTRATE when cell is outside SDF shape (Infinity distance)', () => {
    const layer = makeLayer();
    const kinase = buildKinase(VALID_MATERIAL, VALID_SDF);
    // (100, 100) is far outside the circle
    const result = phosphorylate(layer, 100, 100, kinase);
    expect(result.committed).toBe(false);
    expect(result.reason).toBe('MISSING_SUBSTRATE');
  });

  it('rejects with INVALID_REACTION when kinase.call throws', () => {
    const layer = makeLayer();
    const kinase = {
      valid: true, reason: null, threshold: undefined, sdfDescriptor: VALID_SDF,
      call: () => { throw new Error('kaboom'); },
    };
    const result = phosphorylate(layer, 4, 8, kinase);
    expect(result.committed).toBe(false);
    expect(result.reason).toBe('INVALID_REACTION');
  });

  it('rejects with INVALID_REACTION when kinase returns invalid color', () => {
    const layer = makeLayer();
    const kinase = {
      valid: true, reason: null, threshold: undefined, sdfDescriptor: VALID_SDF,
      call: () => ({ color: 'not-a-color', confidence: 0.9 }),
    };
    const result = phosphorylate(layer, 4, 8, kinase);
    expect(result.committed).toBe(false);
    expect(result.reason).toBe('INVALID_REACTION');
  });

  it('rejects with LOW_CONFIDENCE when confidence is below threshold', () => {
    const layer = makeLayer();
    const kinase = {
      valid: true, reason: null, threshold: undefined, sdfDescriptor: VALID_SDF,
      call: () => ({ color: '#FF0000', confidence: 0.1 }),
    };
    const result = phosphorylate(layer, 4, 8, kinase);
    expect(result.committed).toBe(false);
    expect(result.reason).toBe('LOW_CONFIDENCE');
  });

  it('respects options.threshold over COLLAPSE_THRESHOLD', () => {
    const layer = makeLayer();
    const kinase = {
      valid: true, reason: null, threshold: undefined, sdfDescriptor: VALID_SDF,
      call: () => ({ color: '#FF0000', confidence: 0.3 }),
    };
    // confidence 0.3 would fail default threshold 0.5, but passes options.threshold 0.2
    const result = phosphorylate(layer, 4, 8, kinase, { threshold: 0.2 });
    expect(result.committed).toBe(true);
  });

  it('respects kinase.threshold over COLLAPSE_THRESHOLD', () => {
    const layer = makeLayer();
    const kinase = {
      valid: true, reason: null, threshold: 0.2, sdfDescriptor: VALID_SDF,
      call: () => ({ color: '#FF0000', confidence: 0.3 }),
    };
    const result = phosphorylate(layer, 4, 8, kinase);
    expect(result.committed).toBe(true);
  });

  it('rejects with INVALID_REACTION when material has no anchors', () => {
    const layer = makeLayer();
    const noAnchorMaterial = { id: 'empty', anchors: {} };
    const kinase = buildKinase(noAnchorMaterial, VALID_SDF);
    const result = phosphorylate(layer, 4, 8, kinase);
    expect(result.committed).toBe(false);
    expect(result.reason).toBe('INVALID_REACTION');
  });
});

import {
  createCommandStack,
  PhosphorylationCommand,
  createPhosphorylationCommand,
} from '../../../codex/core/pixelbrain/editor-command-stack.js';

describe('PhosphorylationCommand', () => {
  it('does not push to history on rejected phosphorylation', () => {
    const layer = makeLayer();
    const kinase = buildKinase(null, VALID_SDF); // invalid — will reject
    const stack = createCommandStack();
    const cmd = createPhosphorylationCommand(layer, 4, 8, kinase);
    stack.execute(cmd);
    expect(stack.canUndo()).toBe(false); // nothing was pushed
    expect(layer.cells.has('4,8')).toBe(false);
  });

  it('pushes to history on successful phosphorylation', () => {
    const layer = makeLayer();
    const kinase = buildKinase(VALID_MATERIAL, VALID_SDF);
    const stack = createCommandStack();
    stack.execute(createPhosphorylationCommand(layer, 4, 8, kinase));
    expect(stack.canUndo()).toBe(true);
    expect(layer.cells.has('4,8')).toBe(true);
  });

  it('undo restores previous cell state', () => {
    const layer = makeLayer();
    layer.cells.set('4,8', { x: 4, y: 8, color: '#AAAAAA', emphasis: 1 });
    const kinase = buildKinase(VALID_MATERIAL, VALID_SDF);
    const stack = createCommandStack();
    stack.execute(createPhosphorylationCommand(layer, 4, 8, kinase, '#AAAAAA'));
    const committedColor = layer.cells.get('4,8')?.color;
    stack.undo();
    expect(layer.cells.get('4,8')?.color).toBe('#AAAAAA');
    expect(layer.cells.get('4,8')?.color).not.toBe(committedColor);
  });

  it('undo on a rejected command does not mutate the layer', () => {
    const layer = makeLayer();
    layer.cells.set('4,8', { x: 4, y: 8, color: '#AAAAAA', emphasis: 1 });
    const kinase = buildKinase(null, VALID_SDF); // will reject
    const cmd = createPhosphorylationCommand(layer, 4, 8, kinase);
    const stack = createCommandStack();
    stack.execute(cmd);
    cmd.undo(); // must be a no-op
    expect(layer.cells.get('4,8')?.color).toBe('#AAAAAA');
  });

  it('redo replays captured color — kinase is NOT re-run', () => {
    const layer = makeLayer();
    let callCount = 0;
    const impureKinase = {
      valid: true, reason: null, threshold: undefined, sdfDescriptor: VALID_SDF,
      call: ({ sdfValue }) => {
        callCount++;
        return { color: '#FF0000', confidence: 0.9 };
      },
    };
    const stack = createCommandStack();
    stack.execute(createPhosphorylationCommand(layer, 4, 8, impureKinase));
    expect(callCount).toBe(1);
    stack.undo();
    stack.redo();
    expect(callCount).toBe(1); // kinase NOT re-run on redo
    expect(layer.cells.get('4,8')?.color).toBe('#FF0000');
  });
});
