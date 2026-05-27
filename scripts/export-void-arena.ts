import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { buildVoidArenaRestingScene } from "../src/lib/godot-export/voidArenaScene";
import { printFrameTimeline } from "../src/lib/godot/frame-printer";
import { toGodotRuntimeJson } from "../src/lib/godot/frame-printer/adapters/toGodotRuntimeJson";

const __dirname = dirname(fileURLToPath(import.meta.url));

const restingScene = buildVoidArenaRestingScene();

const timeline = printFrameTimeline([restingScene], {
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

console.log(`Exported void_arena.framepkt — ${restingScene.objects.length} objects, ${json.length} bytes`);
