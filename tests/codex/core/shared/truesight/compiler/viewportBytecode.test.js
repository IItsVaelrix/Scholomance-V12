import { describe, it, expect } from 'vitest';
import {
  DEFAULT_VIEWPORT_STATE,
  detectDeviceClass,
  detectOrientation,
  encodeViewportBytecode,
  ViewportChannel,
  createViewportChannel,
} from '../../../../../../codex/core/shared/truesight/compiler/viewportBytecode.ts';

describe('DEFAULT_VIEWPORT_STATE', () => {
  it('is desktop landscape at 1920×1080', () => {
    expect(DEFAULT_VIEWPORT_STATE.width).toBe(1920);
    expect(DEFAULT_VIEWPORT_STATE.height).toBe(1080);
    expect(DEFAULT_VIEWPORT_STATE.deviceClass).toBe('desktop');
    expect(DEFAULT_VIEWPORT_STATE.orientation).toBe('landscape');
    expect(DEFAULT_VIEWPORT_STATE.pixelRatio).toBe(1);
  });
});

describe('detectDeviceClass', () => {
  it('returns desktop for width >= 1024', () => {
    expect(detectDeviceClass(1920)).toBe('desktop');
    expect(detectDeviceClass(1024)).toBe('desktop');
  });

  it('returns tablet for 768 <= width < 1024', () => {
    expect(detectDeviceClass(768)).toBe('tablet');
    expect(detectDeviceClass(1023)).toBe('tablet');
  });

  it('returns mobile-ios for 375 <= width < 768', () => {
    expect(detectDeviceClass(375)).toBe('mobile-ios');
    expect(detectDeviceClass(767)).toBe('mobile-ios');
  });

  it('returns mobile-android for width < 375', () => {
    expect(detectDeviceClass(374)).toBe('mobile-android');
    expect(detectDeviceClass(0)).toBe('mobile-android');
  });
});

describe('detectOrientation', () => {
  it('returns landscape when width > height', () => {
    expect(detectOrientation(1920, 1080)).toBe('landscape');
  });

  it('returns portrait when height > width', () => {
    expect(detectOrientation(375, 812)).toBe('portrait');
  });

  it('returns square when width === height', () => {
    expect(detectOrientation(600, 600)).toBe('square');
  });
});

describe('encodeViewportBytecode', () => {
  it('produces a non-empty string', () => {
    const code = encodeViewportBytecode(DEFAULT_VIEWPORT_STATE);
    expect(typeof code).toBe('string');
    expect(code.length).toBeGreaterThan(0);
  });

  it('encodes width and height into the string', () => {
    const code = encodeViewportBytecode(DEFAULT_VIEWPORT_STATE);
    expect(code).toContain('1920');
    expect(code).toContain('1080');
  });

  it('is deterministic for the same state', () => {
    const a = encodeViewportBytecode(DEFAULT_VIEWPORT_STATE);
    const b = encodeViewportBytecode(DEFAULT_VIEWPORT_STATE);
    expect(a).toBe(b);
  });

  it('differs for different orientations', () => {
    const landscape = encodeViewportBytecode({ ...DEFAULT_VIEWPORT_STATE, orientation: 'landscape' });
    const portrait = encodeViewportBytecode({ ...DEFAULT_VIEWPORT_STATE, orientation: 'portrait' });
    expect(landscape).not.toBe(portrait);
  });
});

describe('ViewportChannel singleton', () => {
  it('getState returns a state with required fields', () => {
    const state = ViewportChannel.getState();
    expect(typeof state.width).toBe('number');
    expect(typeof state.height).toBe('number');
    expect(typeof state.deviceClass).toBe('string');
  });

  it('update mutates state', () => {
    ViewportChannel.update({ width: 800 });
    expect(ViewportChannel.getState().width).toBe(800);
    ViewportChannel.update({ width: 1920 }); // restore
  });
});

describe('createViewportChannel', () => {
  it('creates an independent channel instance', () => {
    const ch = createViewportChannel({ width: 500, height: 900 });
    expect(ch.getState().width).toBe(500);
    expect(ch.getState().height).toBe(900);
  });

  it('does not affect the global ViewportChannel', () => {
    createViewportChannel({ width: 100 });
    expect(ViewportChannel.getState().width).not.toBe(100);
  });
});
