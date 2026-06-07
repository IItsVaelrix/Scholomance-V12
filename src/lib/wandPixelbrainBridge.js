/**
 * WAND → PIXELBRAIN HANDOFF
 *
 * A tiny cross-route handoff so WAND (one page) can emit a fill bytecode that
 * PixelBrain (another page) picks up for its template fill. Persisted via the
 * Storage abstraction so it survives navigation between the two routes.
 */

import { Storage } from './platform/storage.js';

const HANDOFF_KEY = 'pixelbrain.wandFill.v1';

/**
 * Publish a WAND-derived fill spec (and optionally its geometry) for PixelBrain.
 * @param {{ bytecode:string, schoolId:string, rarity:string, effect:string,
 *   role?:string, material?:string,
 *   coordinates?:Array<{x:number,y:number}>, canvas?:{width:number,height:number} }} spec
 */
export function publishWandFill(spec) {
  if (!spec?.bytecode) return false;
  const coordinates = Array.isArray(spec.coordinates)
    ? spec.coordinates.map((c) => ({ x: Number(c?.x) || 0, y: Number(c?.y) || 0 }))
    : null;
  return Storage.setItem(HANDOFF_KEY, JSON.stringify({
    bytecode: spec.bytecode,
    schoolId: spec.schoolId || 'VOID',
    rarity: spec.rarity || 'COMMON',
    effect: spec.effect || 'INERT',
    role: spec.role || null,
    material: spec.material || null,
    coordinates,
    canvas: spec.canvas ? { width: Number(spec.canvas.width) || 800, height: Number(spec.canvas.height) || 600 } : null,
    ts: Date.now(),
  }));
}

/**
 * Read the latest WAND fill spec, or null if none has been published.
 * @returns {Object|null}
 */
export function readWandFill() {
  const raw = Storage.getItem(HANDOFF_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed?.bytecode ? parsed : null;
  } catch {
    return null;
  }
}

export function clearWandFill() {
  Storage.removeItem(HANDOFF_KEY);
}
