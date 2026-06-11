/**
 * Pixel Lotus Actor Schema
 * PDR: Pixel Lotus Actor Forge and Isometric Combat Runtime
 */

export type PixelLotusActorLayerSlot =
  | 'base'
  | 'face'
  | 'hair'
  | 'robe'
  | 'armor'
  | 'relic'
  | 'weapon'
  | 'aura'
  | 'glyph'
  | 'shadow'
  | 'custom';

export type PixelLotusBlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay';

export type PixelLotusActorLayer = {
  id: string;
  slot: PixelLotusActorLayerSlot;
  assetId: string;
  visible: boolean;
  locked: boolean;
  zIndex: number;
  opacity: number;
  paletteId?: string;
  materialId?: string;
  blendMode: PixelLotusBlendMode;
};

export type PixelLotusActorBuild = {
  schemaVersion: 'pixel-lotus-actor-v1';
  id: string;
  displayName: string;
  rigId: 'humanoid_8dir_v1' | 'creature_4dir_v1' | string;
  schoolAffinity?: string;
  layers: PixelLotusActorLayer[];
  animationManifestId: string;
  provenanceId?: string;
};

export type IsoFacing =
  | 'N'
  | 'NE'
  | 'E'
  | 'SE'
  | 'S'
  | 'SW'
  | 'W'
  | 'NW';

export type PixelLotusAnimationName =
  | 'idle'
  | 'walk'
  | 'run'
  | 'cast'
  | 'attack'
  | 'hurt'
  | 'down';

export type PixelLotusAnimationManifest = {
  schemaVersion: 'pixel-lotus-animation-manifest-v1';
  id: string;
  frameWidth: number;
  frameHeight: number;
  directions: IsoFacing[];
  animations: Record<PixelLotusAnimationName, {
    frames: number;
    fps: number;
    loop: boolean;
    rowsByFacing: Partial<Record<IsoFacing, number>>;
  }>;
};

export type PixelLotusProvenance = {
  schemaVersion: 'pixel-lotus-provenance-v1';
  id: string;
  sourceKind:
    | 'native'
    | 'user-authored'
    | 'external-import'
    | 'generated'
    | 'unknown';
  sourceName?: string;
  sourceUrl?: string;
  license?: string;
  authors?: string[];
  requiredAttribution?: string[];
  productionAllowed: boolean;
  notes?: string[];
};