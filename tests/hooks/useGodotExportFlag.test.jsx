import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  GODOT_EXPORT_FLAG_CHANGED_EVENT,
  GODOT_EXPORT_FLAG_KEY,
  setGodotExportFlag,
  useGodotExportFlag,
} from '../../src/hooks/useGodotExportFlag.js';

describe('useGodotExportFlag', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('reacts to same-tab flag updates through the exported setter', () => {
    const { result } = renderHook(() => useGodotExportFlag());

    expect(result.current).toBe(false);

    act(() => {
      setGodotExportFlag(true);
    });

    expect(result.current).toBe(true);

    act(() => {
      setGodotExportFlag(false);
    });

    expect(result.current).toBe(false);
  });

  it('reacts when same-tab code dispatches the documented custom event', () => {
    const { result } = renderHook(() => useGodotExportFlag());

    act(() => {
      window.localStorage.setItem(GODOT_EXPORT_FLAG_KEY, 'enabled');
      window.dispatchEvent(new Event(GODOT_EXPORT_FLAG_CHANGED_EVENT));
    });

    expect(result.current).toBe(true);
  });
});
