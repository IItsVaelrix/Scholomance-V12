import type { VideoSidecar } from "../schemas/videoScene";

export function validateVideoSidecarFull(video: VideoSidecar): void {
  if (video.schemaVersion !== "scholomance.video.v1") {
    throw new Error(`[video] Unsupported schemaVersion: ${video.schemaVersion}`);
  }

  if (!video.trackId) {
    throw new Error("[video] Missing trackId");
  }

  if (!Number.isFinite(video.bpm) || video.bpm <= 0) {
    throw new Error(`[video] Invalid bpm: ${video.bpm}`);
  }

  if (!Number.isFinite(video.offsetMs)) {
    throw new Error(`[video] Invalid offsetMs: ${video.offsetMs}`);
  }

  if (!video.lyricsHash) {
    throw new Error("[video] Missing lyricsHash");
  }

  if (!Array.isArray(video.scenes) || video.scenes.length === 0) {
    throw new Error("[video] Missing scenes");
  }

  for (let i = 0; i < video.scenes.length; i++) {
    const scene = video.scenes[i];

    if (scene.startMs >= scene.endMs) {
      throw new Error(`[video] Scene ${scene.id} has invalid time range`);
    }

    if (i > 0) {
      const previous = video.scenes[i - 1];
      if (scene.startMs < previous.endMs) {
        throw new Error(
          `[video] Scene ${scene.id} overlaps previous scene ${previous.id}`
        );
      }
    }

    if (!scene.assets.every(Boolean)) {
      throw new Error(`[video] Scene ${scene.id} has empty asset id`);
    }
  }
}