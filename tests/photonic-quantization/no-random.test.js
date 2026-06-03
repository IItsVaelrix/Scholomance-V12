import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function collectJsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectJsFiles(fullPath);
    return entry.name.endsWith('.js') ? [fullPath] : [];
  });
}

describe('photonic-quantization determinism guard', () => {
  it('does not use Math.random', () => {
    const dir = path.resolve(process.cwd(), 'src/lib/photonic-quantization');
    const files = collectJsFiles(dir);

    const offenders = files.filter((file) => fs.readFileSync(file, 'utf8').includes('Math.random'));

    expect(offenders).toEqual([]);
  });
});
