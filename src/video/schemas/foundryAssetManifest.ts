// Foundry asset packet schema — pixelbrain.asset.v1
// Every Foundry asset must satisfy this shape.
// PNG bridge assets are keyed by id and served from /pixelbrain/assets/<id>.png

export type AmpHintKey =
  | "shadowAMP"
  | "volumeAMP"
  | "tonationAMP"
  | "shaderAMP";

export type PartKind = "rect" | "border" | "motif" | "silhouette" | "accent";

export interface AssetPart {
  partId: string;
  kind: PartKind;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  motif?: string;
  material: string;
}

export interface AssetAnchor {
  x: number;
  y: number;
}

export interface FoundryAssetPacket {
  schema: "pixelbrain.asset.v1";
  id: string;
  dimensions: {
    width: number;
    height: number;
  };
  construction: {
    symmetry?: "vertical" | "horizontal" | "radial" | "none";
    parts: AssetPart[];
  };
  anchors: Record<string, AssetAnchor>;
  ampHints: Partial<Record<AmpHintKey, string>>;
}

export function validateFoundryAssetPacket(v: unknown): v is FoundryAssetPacket {
  if (!v || typeof v !== "object") return false;
  const p = v as Record<string, unknown>;
  if (p.schema !== "pixelbrain.asset.v1") return false;
  if (typeof p.id !== "string" || !p.id) return false;
  if (!p.dimensions || typeof p.dimensions !== "object") return false;
  if (!Array.isArray((p.construction as Record<string, unknown>)?.parts)) return false;
  return true;
}

// Foundry asset tier classification per Polarity spec
export type AssetTier = 1 | 2 | 3;

export interface FoundryAssetEntry {
  id: string;
  tier: AssetTier;
  packet?: FoundryAssetPacket;
  fallback?: "procedural-glyph" | "parallax-silhouette" | "expanding-circle" | "ribbon-trail";
}

// Polarity track asset manifest
export const POLARITY_ASSET_MANIFEST: FoundryAssetEntry[] = [
  // Tier 1 — must build first
  { id: "pb_polarity_emblem_final_v1", tier: 1 },
  { id: "pb_black_lotus_card_v1", tier: 1 },
  { id: "pb_golden_fist_gauntlet_v1", tier: 1 },
  { id: "pb_open_skull_shell_v1", tier: 1 },
  { id: "pb_skull_dragon_core_v1", tier: 1 },
  { id: "pb_fibonacci_lattice_spiral_v1", tier: 1 },
  { id: "pb_gold_mine_cavern_v1", tier: 1 },
  { id: "pb_recovery_rain_v1", tier: 1 },
  { id: "pb_black_hole_core_v1", tier: 1 },
  { id: "pb_dam_break_flood_v1", tier: 1 },
  // Tier 2 — strong enhancement
  { id: "pb_heart_parchment_cracked_v1", tier: 2 },
  { id: "pb_drought_fissure_set_v1", tier: 2 },
  { id: "pb_breath_text_stream_v1", tier: 2 },
  { id: "pb_pentabyte_pyramid_v1", tier: 2 },
  { id: "pb_sleet_puddle_name_v1", tier: 2 },
  { id: "pb_xo_grid_arena_v1", tier: 2 },
  { id: "pb_crt_wall_magnavox_v1", tier: 2 },
  // Tier 3 — procedural fallback acceptable in v1
  { id: "pb_battle_steed_v1", tier: 3, fallback: "parallax-silhouette" },
  { id: "pb_shadow_duelist_set_v1", tier: 3, fallback: "parallax-silhouette" },
  { id: "pb_cannonball_impact_v1", tier: 3, fallback: "expanding-circle" },
  { id: "pb_enemy_mask_leak_v1", tier: 3, fallback: "procedural-glyph" },
  { id: "pb_emotion_fabric_strip_v1", tier: 3, fallback: "ribbon-trail" },
];
