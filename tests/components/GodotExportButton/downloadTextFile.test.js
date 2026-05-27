import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadTextFile } from '../../../src/components/GodotExportButton/downloadTextFile.js';

describe('downloadTextFile', () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('removes the anchor and revokes the object URL if click throws', () => {
    URL.createObjectURL = vi.fn(() => 'blob:scholomance-export');
    URL.revokeObjectURL = vi.fn();
    const clickError = new Error('blocked click');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      throw clickError;
    });

    expect(() => downloadTextFile('artifact.pbrain', '{}')).toThrow(clickError);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(document.body.querySelectorAll('a')).toHaveLength(0);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:scholomance-export');
  });
});
