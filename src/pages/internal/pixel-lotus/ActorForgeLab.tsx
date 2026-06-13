/**
 * Actor Forge Lab - Internal Lab Page
 * PDR: Pixel Lotus Actor Forge and Isometric Combat Runtime
 * PDR: PixelBrain Deterministic Character Creator (2026-06-12)
 *
 * UI consumer of the PixelBrain character foundry. Builds a
 * CHARACTER-SPEC-v1 from the controls, forges deterministically,
 * and previews the directional sprites.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { IsoFacing } from '../../../pixel-lotus/actor-forge/pixelLotusActor.schema';
import { forgeCharacter } from '../../../lib/pixelbrain.adapter';
import { enhanceCharacter, EnhancementError } from '../../../lib/character-enhancement';
import './ActorForgeLab.css';

type CardinalDirection = 'south' | 'east' | 'north' | 'west';

const FACING_TO_DIRECTION: Record<IsoFacing, CardinalDirection> = {
  N: 'north', NE: 'east', E: 'east', SE: 'south',
  S: 'south', SW: 'west', W: 'west', NW: 'north',
};

const BODY_PROFILES = [
  { id: 'character.body.human.feminine', label: 'Feminine' },
  { id: 'character.body.human.masculine', label: 'Masculine' },
  { id: 'character.body.human.androgynous', label: 'Androgynous' },
];

const SKIN_MATERIALS = ['skin_light', 'skin_medium', 'skin_dark', 'skin_voidborne'];
const HAIR_MATERIALS = ['hair_black', 'hair_brown', 'hair_blonde', 'hair_red', 'hair_void'];
const EYE_MATERIALS = ['eye_brown', 'eye_blue', 'eye_green', 'eye_void_glow'];

const HAIR_PROFILES = [
  'character.hair.short',
  'character.hair.mediumStraight',
  'character.hair.longStraight',
  'character.hair.ponytail',
  'character.hair.buzzcut',
  'character.hair.curly',
  'character.hair.bald',
];

const EYE_PROFILES = [
  'character.face.eye.round',
  'character.face.eye.almond',
  'character.face.eye.narrow',
  'character.face.eye.voidTouched',
];

const TOP_PROFILES = [
  'character.clothing.top.beginnerRobe',
  'character.clothing.top.beginnerTunic',
  'character.clothing.top.beginnerShirt',
];

const BOTTOM_PROFILES = [
  'character.clothing.bottom.beginnerPants',
  'character.clothing.bottom.beginnerSkirt',
  'character.clothing.bottom.beginnerLeggings',
];

const SHOES_PROFILES = [
  'character.clothing.shoes.beginnerBoots',
  'character.clothing.shoes.beginnerSandals',
  'character.clothing.shoes.beginnerSlippers',
];

const profileLabel = (profileId: string) => {
  const tail = profileId.split('.').pop() || profileId;
  return tail.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
};

const materialLabel = (materialId: string) =>
  profileLabel(materialId.split('_').slice(1).join('_') || materialId);

function pngToDataUrl(bytes: Uint8Array): string {
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return `data:image/png;base64,${btoa(bin)}`;
}

// Deterministic LCG reroll — the forge itself never uses Math.random()
const nextSeed = (seed: number) => (seed * 1664525 + 1013904223) % 0x7fffffff;

export default function ActorForgeLab() {
  const [facing, setFacing] = useState<IsoFacing>('S');
  const [showProvenance, setShowProvenance] = useState(false);

  const [showCinematic, setShowCinematic] = useState(true);
  const [phase, setPhase] = useState<'falling' | 'impact' | 'whiteout'>('falling');

  const navigate = useNavigate();
  const [characterName, setCharacterName] = useState('Apprentice Scholar');

  const [bodyProfile, setBodyProfile] = useState(BODY_PROFILES[0].id);
  const [skin, setSkin] = useState('skin_light');
  const [hairProfile, setHairProfile] = useState('character.hair.longStraight');
  const [hairColor, setHairColor] = useState('hair_brown');
  const [eyeProfile, setEyeProfile] = useState('character.face.eye.almond');
  const [eyeColor, setEyeColor] = useState('eye_brown');
  const [top, setTop] = useState(TOP_PROFILES[0]);
  const [bottom, setBottom] = useState(BOTTOM_PROFILES[0]);
  const [shoes, setShoes] = useState(SHOES_PROFILES[0]);
  const [seed, setSeed] = useState(1337);

  type EnhancementState = 'idle' | 'forging' | 'enhancing' | 'enhanced' | 'error';
  const [enhancementState, setEnhancementState] = useState<EnhancementState>('idle');
  const [enhancementError, setEnhancementError] = useState<string | null>(null);

  useEffect(() => {
    if (showCinematic) {
      const t1 = setTimeout(() => setPhase('impact'), 3000);
      const t2 = setTimeout(() => setPhase('whiteout'), 4000);
      const t3 = setTimeout(() => setShowCinematic(false), 5500);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [showCinematic]);

  const forge = useMemo(() => {
    const spec = {
      contract: 'CHARACTER-SPEC-v1',
      id: `forge.custom.${bodyProfile.split('.').pop()}.v1`,
      class: 'character',
      archetype: 'human',
      canvas: { width: 32, height: 48, gridSize: 1 },
      seed,
      bytecode: 'VW-SCHOLAR-COMMON-RESONANT',
      presentation: { gender: 'feminine', heightClass: 'average', buildClass: 'average' },
      directions: ['south', 'east', 'north', 'west'],
      materials: { skin, hair: hairColor, eyes: eyeColor },
      body: { profile: bodyProfile },
      face: [
        { id: 'leftEye', profile: eyeProfile, attach: { parent: 'body', at: 'face.eyeLeft' } },
        { id: 'rightEye', profile: eyeProfile, attach: { parent: 'body', at: 'face.eyeRight' } },
        { id: 'nose', profile: 'character.face.nose.small', attach: { parent: 'body', at: 'face.nose' } },
        { id: 'mouth', profile: 'character.face.mouth.small', attach: { parent: 'body', at: 'face.mouth' } },
      ],
      hair: { profile: hairProfile, params: { color: hairColor }, attach: { parent: 'body', at: 'headTop' } },
      clothing: [
        { id: 'bottom', profile: bottom },
        { id: 'top', profile: top },
        { id: 'shoes', profile: shoes },
      ],
    };
    try {
      const character = forgeCharacter(spec, {});
      return { character, error: null as string | null };
    } catch (e) {
      return { character: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [bodyProfile, skin, hairProfile, hairColor, eyeProfile, eyeColor, top, bottom, shoes, seed]);

  const direction = FACING_TO_DIRECTION[facing];

  const spriteUrl = useMemo(() => {
    const png = forge.character?.sprites?.[direction];
    return png ? pngToDataUrl(png) : null;
  }, [forge, direction]);

  const sheetUrl = useMemo(() => {
    const sheet = forge.character?.spritesheet;
    return sheet ? pngToDataUrl(sheet) : null;
  }, [forge]);

  const svgPreviewUrl = useMemo(() => {
    if (!forge.character) return null;
    try {
      const spec = { ...forge.character.spec, directions: ['south'] };
      const result = forgeCharacter(spec, { renderer: 'illustrated', scale: 8 } as any) as any;
      if (!result.svg) return null;
      return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(result.svg)));
    } catch {
      return null;
    }
  }, [forge.character]);

  const facingOptions: IsoFacing[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

  const handleForgeAndEnhance = async () => {
    if (!forge.character) return;
    setEnhancementState('forging');
    setEnhancementError(null);

    try {
      const pngBytes = forge.character.sprites?.south;
      if (!pngBytes) throw new EnhancementError('No south sprite available');
      const baseDataUrl = pngToDataUrl(pngBytes);

      setEnhancementState('enhancing');

      const spec = forge.character.spec;
      const enhancements = await enhanceCharacter(baseDataUrl, spec);

      const stored = JSON.parse(localStorage.getItem('scholomance_active_actor') ?? '{}');
      stored.shaderEnhancements = enhancements;
      localStorage.setItem('scholomance_active_actor', JSON.stringify(stored));

      setEnhancementState('enhanced');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setEnhancementError(msg);
      setEnhancementState('error');
    }
  };

  return (
    <>
      <AnimatePresence>
        {showCinematic && (
          <motion.div
            className="cinematic-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            <div className="cinematic-sky"></div>
            <div className="cinematic-ground"></div>

            <motion.div
              className={`will-o-wisp ${phase}`}
              initial={{ y: -500, opacity: 0 }}
              animate={phase === 'falling' ? { y: '60vh', opacity: 1 } : { y: '60vh', opacity: 0 }}
              transition={{ duration: 3, ease: 'easeIn' }}
            />

            {phase === 'impact' && (
              <motion.div
                className="energy-vortex"
                initial={{ scale: 0, opacity: 0, rotate: 0 }}
                animate={{ scale: 6, opacity: 1, rotate: 180 }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            )}

            {phase === 'whiteout' && (
              <motion.div
                className="whiteout-flash"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="actor-forge-lab">
      <header className="lab-header">
        <h1>Actor Forge Lab</h1>
        <p className="lab-subtitle">PixelBrain deterministic character foundry — live preview</p>
      </header>

      <div className="lab-container">
        <div className="panel preview-panel">
          <h2>Preview</h2>
          <div className="actor-preview">
            <div className="actor-sprite-preview">
              {forge.error ? (
                <div className="forge-error" role="alert">
                  <strong>Forge failed loudly:</strong>
                  <pre className="mono">{forge.error}</pre>
                </div>
              ) : spriteUrl ? (
                <img
                  className="forged-sprite"
                  src={spriteUrl}
                  alt={`${characterName} facing ${direction}`}
                />
              ) : null}
              <div className="actor-animation-label">idle · {direction}</div>
            </div>
          </div>
          {sheetUrl && (
            <div className="sheet-strip">
              <span className="sheet-strip-label mono">S / E / N / W</span>
              <img src={sheetUrl} alt="4-direction spritesheet" />
            </div>
          )}
          {svgPreviewUrl && (
            <div className="svg-preview-panel">
              <div className="svg-preview-label">Illustrated ✦</div>
              <img
                src={svgPreviewUrl}
                alt="Illustrated character preview"
                className="svg-preview-img"
                style={{ imageRendering: 'auto' }}
              />
            </div>
          )}
        </div>

        <div className="panel controls-panel">
          <h2>Controls</h2>

          <div className="control-group">
            <label htmlFor="character-name">Character Name</label>
            <input
              id="character-name"
              type="text"
              className="forge-input"
              value={characterName}
              onChange={e => setCharacterName(e.target.value)}
            />
          </div>

          <div className="control-group">
            <label htmlFor="facing-selector">Facing</label>
            <select
              id="facing-selector"
              value={facing}
              onChange={e => setFacing(e.target.value as IsoFacing)}
            >
              {facingOptions.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label htmlFor="body-selector">Body</label>
            <select id="body-selector" value={bodyProfile} onChange={e => setBodyProfile(e.target.value)}>
              {BODY_PROFILES.map(b => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
          </div>

          <div className="control-row">
            <div className="control-group">
              <label htmlFor="skin-selector">Skin</label>
              <select id="skin-selector" value={skin} onChange={e => setSkin(e.target.value)}>
                {SKIN_MATERIALS.map(m => (
                  <option key={m} value={m}>{materialLabel(m)}</option>
                ))}
              </select>
            </div>
            <div className="control-group">
              <label htmlFor="eye-color-selector">Eye Color</label>
              <select id="eye-color-selector" value={eyeColor} onChange={e => setEyeColor(e.target.value)}>
                {EYE_MATERIALS.map(m => (
                  <option key={m} value={m}>{materialLabel(m)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="control-row">
            <div className="control-group">
              <label htmlFor="hair-selector">Hair Style</label>
              <select id="hair-selector" value={hairProfile} onChange={e => setHairProfile(e.target.value)}>
                {HAIR_PROFILES.map(p => (
                  <option key={p} value={p}>{profileLabel(p)}</option>
                ))}
              </select>
            </div>
            <div className="control-group">
              <label htmlFor="hair-color-selector">Hair Color</label>
              <select id="hair-color-selector" value={hairColor} onChange={e => setHairColor(e.target.value)}>
                {HAIR_MATERIALS.map(m => (
                  <option key={m} value={m}>{materialLabel(m)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="control-group">
            <label htmlFor="eye-shape-selector">Eye Shape</label>
            <select id="eye-shape-selector" value={eyeProfile} onChange={e => setEyeProfile(e.target.value)}>
              {EYE_PROFILES.map(p => (
                <option key={p} value={p}>{profileLabel(p)}</option>
              ))}
            </select>
          </div>

          <div className="control-row">
            <div className="control-group">
              <label htmlFor="top-selector">Top</label>
              <select id="top-selector" value={top} onChange={e => setTop(e.target.value)}>
                {TOP_PROFILES.map(p => (
                  <option key={p} value={p}>{profileLabel(p)}</option>
                ))}
              </select>
            </div>
            <div className="control-group">
              <label htmlFor="bottom-selector">Bottom</label>
              <select id="bottom-selector" value={bottom} onChange={e => setBottom(e.target.value)}>
                {BOTTOM_PROFILES.map(p => (
                  <option key={p} value={p}>{profileLabel(p)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="control-group">
            <label htmlFor="shoes-selector">Shoes</label>
            <select id="shoes-selector" value={shoes} onChange={e => setShoes(e.target.value)}>
              {SHOES_PROFILES.map(p => (
                <option key={p} value={p}>{profileLabel(p)}</option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label htmlFor="seed-input">Seed</label>
            <div className="seed-row">
              <input
                id="seed-input"
                type="number"
                className="forge-input"
                value={seed}
                onChange={e => setSeed(Number(e.target.value) || 0)}
              />
              <button type="button" className="layer-toggle" onClick={() => setSeed(s => nextSeed(s))}>
                Reroll
              </button>
            </div>
          </div>

          <div className="control-group">
            <button
              type="button"
              className="provenance-toggle"
              onClick={() => setShowProvenance(s => !s)}
            >
              Provenance: {showProvenance ? 'visible' : 'hidden'}
            </button>
          </div>

          {/* Before / after enhancement panels */}
          {(enhancementState === 'enhanced' || enhancementState === 'error') && spriteUrl && (
            <div className="enhancement-panels">
              <div className="enhancement-panel">
                <div className="enhancement-panel-label">BASE</div>
                <img className="forged-sprite" src={spriteUrl} alt="Base sprite" />
              </div>
              <div className="enhancement-panel enhanced">
                <div className="enhancement-panel-label">ENHANCED ✦</div>
                <img className="forged-sprite" src={spriteUrl} alt="Enhanced sprite" />
                {enhancementState === 'enhanced' && (
                  <div className="enhancement-badge">✦ Effects active in combat</div>
                )}
              </div>
            </div>
          )}
          {enhancementState === 'error' && enhancementError && (
            <div className="forge-error">Enhancement failed: {enhancementError}</div>
          )}

          {/* Forge & Enhance button */}
          <button
            type="button"
            className="forge-enhance-btn"
            onClick={handleForgeAndEnhance}
            disabled={!forge.character || enhancementState === 'forging' || enhancementState === 'enhancing'}
          >
            {enhancementState === 'forging'    ? 'Forging…'
             : enhancementState === 'enhancing' ? 'Enhancing…'
             : enhancementState === 'enhanced'  ? '✦ Re-Enhance'
             : '✦ Forge & Enhance'}
          </button>

          <button
            type="button"
            className="create-character-btn"
            disabled={!forge.character}
            onClick={() => {
              if (!forge.character) return;
              localStorage.setItem('scholomance_active_actor', JSON.stringify({
                ...forge.character.pixelLotusActor,
                displayName: characterName,
                spec: forge.character.spec,
              }));
              navigate('/combat');
            }}
          >
            Enter the Void
          </button>
        </div>

        <div className="panel manifest-panel">
          <h2>Manifest</h2>
          <pre className="manifest-display mono">
{JSON.stringify(forge.character ? {
  id: forge.character.spec.id,
  displayName: characterName,
  specHash: forge.character.specHash,
  totalCells: forge.character.diagnostics.totalCells,
  paletteSizes: forge.character.diagnostics.paletteSizes,
  frame: `${forge.character.canvas.width}×${forge.character.canvas.height}`,
  directions: forge.character.diagnostics.directions,
} : { error: forge.error }, null, 2)}
          </pre>
        </div>
      </div>

      {showProvenance && (
        <div className="provenance-panel" aria-label="Provenance information">
          <h3>Provenance</h3>
          <p className="provenance-source">Source: PixelBrain character foundry (deterministic, seed {seed})</p>
          <p className="provenance-status">Production allowed: Yes</p>
        </div>
      )}
    </div>
    </>
  );
}
