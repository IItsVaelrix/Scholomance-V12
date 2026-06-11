import { describe, it, expect } from 'vitest';
import { style16Bit } from '../../../codex/core/pixelbrain/extensions/style-extensions.js';

describe('PixelBrain — Mode 7 Clock Binding', () => {
  const coords = [
    { x: 100, y: 100 },
    { x: 200, y: 200 }
  ];

  const testContext = {
    config: {
      resolution: { width: 512, height: 448 },
      colorCount: 256,
      mode7: true,
      rotation: 0,
      rotationSpeed: 45
    }
  };

  it('same time returns same rotation and coordinates', () => {
    const context = { time: 5.0 };
    const res1 = style16Bit.hooks.onCoordinateMap.call(testContext, coords, context);
    const res2 = style16Bit.hooks.onCoordinateMap.call(testContext, coords, context);
    expect(res1).toEqual(res2);
  });

  it('later time returns advanced rotation', () => {
    const res1 = style16Bit.hooks.onCoordinateMap.call(testContext, coords, { time: 0.0 });
    const res2 = style16Bit.hooks.onCoordinateMap.call(testContext, coords, { time: 2.0 });
    expect(res1).not.toEqual(res2);
  });

  it('default rotation returned when no context time', () => {
    const res1 = style16Bit.hooks.onCoordinateMap.call(testContext, coords, {});
    const res2 = style16Bit.hooks.onCoordinateMap.call(testContext, coords, null);
    expect(res1).toEqual(res2);
  });
});
