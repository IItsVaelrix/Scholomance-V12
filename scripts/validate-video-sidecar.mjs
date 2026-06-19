#!/usr/bin/env node
// validate-video-sidecar.mjs — CLI validator for polarity.video.json sidecars
// Usage: node scripts/validate-video-sidecar.mjs <path-to-video.json>
// Example: node scripts/validate-video-sidecar.mjs src/pages/Visualiser/tracks/polarity.video.json

import { readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node scripts/validate-video-sidecar.mjs <path-to-video.json>");
  process.exit(1);
}

const absolutePath = resolve(process.cwd(), inputPath);
let raw;

try {
  raw = JSON.parse(readFileSync(absolutePath, "utf8"));
} catch (err) {
  console.error(`[validate] Failed to read or parse file: ${absolutePath}`);
  console.error(err.message);
  process.exit(1);
}

const errors = [];

if (raw.schemaVersion !== "scholomance.video.v1") {
  errors.push(`schemaVersion must be "scholomance.video.v1", got: ${raw.schemaVersion}`);
}

if (!raw.trackId) errors.push("Missing trackId");
if (!Number.isFinite(raw.bpm) || raw.bpm <= 0) errors.push(`Invalid bpm: ${raw.bpm}`);
if (!Number.isFinite(raw.offsetMs)) errors.push(`Invalid offsetMs: ${raw.offsetMs}`);
if (!raw.lyricsHash) errors.push("Missing lyricsHash");

if (!Array.isArray(raw.scenes) || raw.scenes.length === 0) {
  errors.push("Missing or empty scenes array");
} else {
  for (let i = 0; i < raw.scenes.length; i++) {
    const scene = raw.scenes[i];
    const prefix = `Scene[${i}] (${scene.id ?? "no-id"})`;

    if (!scene.id) errors.push(`${prefix}: missing id`);
    if (!scene.mode) errors.push(`${prefix}: missing mode`);
    if (!Number.isFinite(scene.startMs)) errors.push(`${prefix}: invalid startMs`);
    if (!Number.isFinite(scene.endMs)) errors.push(`${prefix}: invalid endMs`);
    if (scene.startMs >= scene.endMs) {
      errors.push(`${prefix}: startMs (${scene.startMs}) >= endMs (${scene.endMs})`);
    }
    if (i > 0) {
      const prev = raw.scenes[i - 1];
      if (scene.startMs < prev.endMs) {
        errors.push(`${prefix}: overlaps previous scene ${prev.id} (${prev.endMs}ms)`);
      }
    }
    if (!Array.isArray(scene.assets) || scene.assets.length === 0) {
      errors.push(`${prefix}: no assets`);
    } else if (!scene.assets.every(Boolean)) {
      errors.push(`${prefix}: has empty asset id`);
    }
    if (!scene.camera?.kind) errors.push(`${prefix}: missing camera.kind`);
    if (!scene.atmosphere) errors.push(`${prefix}: missing atmosphere`);
    if (!scene.typography) errors.push(`${prefix}: missing typography`);
  }
}

if (errors.length > 0) {
  console.error(`[validate] FAILED — ${errors.length} error(s) in ${inputPath}:`);
  for (const err of errors) console.error(`  ✗ ${err}`);
  process.exit(1);
}

console.log(`[validate] OK — ${raw.scenes.length} scenes, trackId: ${raw.trackId}, bpm: ${raw.bpm}`);
console.log(`  lyricsHash: ${raw.lyricsHash}`);
console.log(`  scenes: ${raw.scenes.map((s) => s.id).join(", ")}`);
