import { resolveActiveScene } from "../logic/resolveActiveScene";
import type { SceneCue } from "../schemas/videoScene";

// Thin hook wrapper so components import from hooks/ per spec file tree.
// In Remotion, all computation is pure per-frame — no memoization needed.
export function useActiveScene(
  timeMs: number,
  scenes: SceneCue[]
): SceneCue | null {
  return resolveActiveScene(timeMs, scenes);
}
