/**
 * LPC Import Manifest Schema
 * PDR: Pixel Lotus Actor Forge and Isometric Combat Runtime
 */

export type LPCImportSource = {
  sourceKind: 'lpc-spritesheet' | 'lpc-individual';
  sourceUrl?: string;
  sheetPath?: string;
};

export type LPCAnimationMap = {
  lpcRow: number;
  pixelLotusAnimation: string;
  pixelLotusFacing: string;
};

export type LPCImportManifest = {
  schemaVersion: 'lpc-import-manifest-v1';
  id: string;
  source: LPCImportSource;
  paletteMapping?: Record<string, string>;
  animationMap: LPCAnimationMap[];
};