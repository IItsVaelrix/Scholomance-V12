/**
 * Actor Forge Lab - Internal Lab Page
 * PDR: Pixel Lotus Actor Forge and Isometric Combat Runtime
 * 
 * Preview tool for Pixel Lotus-native actor builds.
 */

import React, { useState } from 'react';
import type { 
  PixelLotusActorBuild, 
  IsoFacing, 
  PixelLotusAnimationName,
} from '../../../pixel-lotus/actor-forge/pixelLotusActor.schema';
import './ActorForgeLab.css';

// Default native actor build for testing
const createDefaultActor = (): PixelLotusActorBuild => ({
  schemaVersion: 'pixel-lotus-actor-v1',
  id: 'native-wizard',
  displayName: 'Apprentice Wizard',
  rigId: 'humanoid_8dir_v1',
  schoolAffinity: 'PSYCHIC',
  layers: [
    { id: 'base', slot: 'base', assetId: 'body_base_01', visible: true, locked: false, zIndex: 0, opacity: 1, blendMode: 'normal' },
    { id: 'robe', slot: 'robe', assetId: 'robe_mage_01', visible: true, locked: false, zIndex: 10, opacity: 1, blendMode: 'normal', paletteId: 'school_psychic' },
    { id: 'hair', slot: 'hair', assetId: 'hair_simple_01', visible: true, locked: false, zIndex: 5, opacity: 1, blendMode: 'normal' },
    { id: 'weapon', slot: 'weapon', assetId: 'staff_oak_01', visible: true, locked: false, zIndex: 15, opacity: 1, blendMode: 'normal' },
    { id: 'shadow', slot: 'shadow', assetId: 'shadow_soft', visible: true, locked: true, zIndex: -1, opacity: 0.5, blendMode: 'multiply' },
  ],
  animationManifestId: 'default-8dir',
  provenanceId: 'native-internal',
});

export default function ActorForgeLab() {
  const [actor, setActor] = useState<PixelLotusActorBuild>(createDefaultActor());
  const [facing, setFacing] = useState<IsoFacing>('S');
  const [animation, setAnimation] = useState<PixelLotusAnimationName>('idle');
  const [showProvenance, setShowProvenance] = useState(false);

  const toggleLayerVisibility = (layerId: string) => {
    setActor(prev => ({
      ...prev,
      layers: prev.layers.map(l => 
        l.id === layerId ? { ...l, visible: !l.visible } : l
      ),
    }));
  };

  const facingOptions: IsoFacing[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const animationOptions: PixelLotusAnimationName[] = ['idle', 'walk', 'run', 'cast', 'attack', 'hurt', 'down'];

  return (
    <div className="actor-forge-lab">
      <header className="lab-header">
        <h1>Actor Forge Lab</h1>
        <p className="lab-subtitle">Pixel Lotus actor composition preview</p>
      </header>

      <div className="lab-container">
        <div className="panel preview-panel">
          <h2>Preview</h2>
          <div className="actor-preview" data-school={actor.schoolAffinity?.toLowerCase()}>
            <div className="actor-sprite-preview">
              <div className="actor-direction-indicator" data-facing={facing}>
                <span className="facing-label">{facing}</span>
              </div>
              <div className="actor-animation-label">{animation}</div>
              <div className="actor-layer-keys">
                {actor.layers.filter(l => l.visible).map(l => (
                  <span key={l.id} className="layer-key" title={l.slot}>
                    {l.slot}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="panel controls-panel">
          <h2>Controls</h2>
          
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
            <label htmlFor="animation-selector">Animation</label>
            <select 
              id="animation-selector"
              value={animation} 
              onChange={e => setAnimation(e.target.value as PixelLotusAnimationName)}
            >
              {animationOptions.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div className="control-group">
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- label for a button group via aria-labelledby */}
            <label id="layers-label">Layers</label>
            <div className="layer-toggles" role="group" aria-label="Layer visibility toggles" aria-labelledby="layers-label">
              {actor.layers.map(layer => (
                <button
                  key={layer.id}
                  type="button"
                  className={`layer-toggle ${layer.visible ? 'visible' : ''}`}
                  onClick={() => toggleLayerVisibility(layer.id)}
                  aria-pressed={layer.visible}
                  disabled={layer.locked}
                  title={layer.locked ? 'Locked layer' : `Toggle ${layer.slot} visibility`}
                >
                  {layer.slot}
                </button>
              ))}
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
        </div>

        <div className="panel manifest-panel">
          <h2>Manifest</h2>
          <pre className="manifest-display mono">
{JSON.stringify({
  id: actor.id,
  displayName: actor.displayName,
  rigId: actor.rigId,
  schoolAffinity: actor.schoolAffinity,
  animationManifestId: actor.animationManifestId,
  layerCount: actor.layers.length,
}, null, 2)}
          </pre>
        </div>
      </div>

      {showProvenance && (
        <div className="provenance-panel" aria-label="Provenance information">
          <h3>Provenance</h3>
          <p className="provenance-source">Source: Native internal actor</p>
          <p className="provenance-status">Production allowed: Yes</p>
        </div>
      )}
    </div>
  );
}