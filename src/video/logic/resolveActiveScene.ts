import type { SceneCue } from "../schemas/videoScene";

export function resolveActiveScene(
  timeMs: number,
  scenes: SceneCue[]
): SceneCue | null {
  return scenes.find(
    (scene) => timeMs >= scene.startMs && timeMs < scene.endMs
  ) ?? null;
}