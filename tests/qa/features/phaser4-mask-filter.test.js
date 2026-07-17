/**
 * Phaser 4 removed setMask under WebGL. It does not throw — it logs
 *
 *   "Mask.setMask: This method is not supported in WebGL. Create a Mask filter
 *    instead."
 *
 * and returns. So a scene that masks with the v3 API renders UNCLIPPED, with no
 * error, no test failure, and nothing but a console warning nobody reads. Both
 * Listen scenes did exactly that: four warnings from SignalChamberScene (four
 * targets) and three latent ones in CrystalBallScene, which only mounts when the
 * Station is ignited.
 *
 * These games are `type: 2` (Phaser.WEBGL), so the Canvas path that still
 * supports setMask is unreachable — there is no configuration in which those
 * calls did anything.
 *
 * A grep test, deliberately: the failure is that a call SILENTLY does nothing,
 * which no unit test of behaviour can catch without a real WebGL context.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const SCENES = [
  'src/pages/Listen/scenes/SignalChamberScene.js',
  'src/pages/Listen/scenes/CrystalBallScene.js',
];

const read = (p) => readFileSync(p, 'utf8');

describe('Phaser 4 — no display-list masks under WebGL', () => {
  for (const scene of SCENES) {
    it(`${scene.split('/').pop()} does not call the removed setMask API`, () => {
      const src = read(scene);
      expect(src).not.toMatch(/\.setMask\s*\(/);
    });

    it(`${scene.split('/').pop()} does not build a v3 geometry mask`, () => {
      const src = read(scene);
      expect(src).not.toMatch(/createGeometryMask\s*\(/);
      expect(src).not.toMatch(/createBitmapMask\s*\(/);
    });
  }

  it('both scenes mask via the v4 filter API instead', () => {
    for (const scene of SCENES) {
      expect(read(scene)).toMatch(/Phaser\.Actions\.AddMaskShape\s*\(/);
    }
  });

  it('the returned masks are RETAINED, or the shapes get collected', () => {
    // AddMaskShape removes the shape from the display list, so the Mask holds
    // the only reference to it. Assigning to a local would let it be collected
    // and the mask would quietly stop clipping — the same silent failure again.
    expect(read(SCENES[0])).toMatch(/this\._radarMasks\s*=\s*Phaser\.Actions\.AddMaskShape/);
    expect(read(SCENES[1])).toMatch(/this\._orbMasks\s*=\s*Phaser\.Actions\.AddMaskShape/);
  });

  it('the API this migrates to actually exists in the installed Phaser', () => {
    // Guards the migration against a Phaser bump that moves it again: if this
    // fails, the scenes are calling something that is gone and we are back to a
    // silent no-op.
    const dist = read('node_modules/phaser/dist/phaser.js');
    expect(dist).toMatch(/AddMaskShape:\s*__webpack_require__/);
    const types = read('node_modules/phaser/types/phaser.d.ts');
    expect(types).toMatch(/function AddMaskShape\(/);
  });
});
