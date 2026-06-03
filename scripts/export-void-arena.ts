import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { buildVoidArenaRestingScene } from "../src/lib/godot-export/voidArenaScene";
import { buildSingularityTriggerFrames } from "../src/lib/godot-export/voidSingularityTrigger";
import { printFrameTimeline } from "../src/lib/godot/frame-printer";
import { toGodotRuntimeJson } from "../src/lib/godot/frame-printer/adapters/toGodotRuntimeJson";

const __dirname = dirname(fileURLToPath(import.meta.url));

const restingScene = buildVoidArenaRestingScene();
// Phase 2 starts at frame 60 (1 second at 60 fps) — singularity trigger animation
const triggerFrames = buildSingularityTriggerFrames(restingScene, 60);

const timeline = printFrameTimeline([restingScene, ...triggerFrames], {
  sceneId: "void_arena",
  fps: 60,
  seed: "void_arena_v1",
  sourceSystem: "manual",
  bytecodeContract: "framePacket",
  validate: true,
});

const json = toGodotRuntimeJson(timeline);

const outDir = join(__dirname, "../godot_project/assets");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "void_arena.framepkt"), json, "utf-8");

console.log(`Exported void_arena.framepkt — ${timeline.frames.length} packets (Phase 1: resting + Phase 2: singularity trigger), ${json.length} bytes`);
