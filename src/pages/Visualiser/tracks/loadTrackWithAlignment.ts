import type { GrimoireTrack } from "./types";
import type { AlignmentSidecar } from "../../../video/types";

export interface GrimoireTrackWithAlignment extends GrimoireTrack {
  wordTimings?: AlignmentSidecar["wordTimings"];
  alignmentMeta?: Omit<AlignmentSidecar, "wordTimings">;
}

export async function mergeTrackAlignment(
  track: GrimoireTrack,
  sidecar?: AlignmentSidecar
): Promise<GrimoireTrackWithAlignment> {
  if (!sidecar) {
    return track;
  }

  if (sidecar.schemaVersion !== "scholomance.align.v1") {
    throw new Error(
      `[align] Unsupported alignment schema for ${track.id}: ${sidecar.schemaVersion}`
    );
  }

  if (sidecar.trackId !== track.id) {
    throw new Error(
      `[align] Sidecar trackId mismatch. Expected ${track.id}, got ${sidecar.trackId}`
    );
  }

  const { wordTimings, ...alignmentMeta } = sidecar;

  return {
    ...track,
    wordTimings,
    alignmentMeta,
  };
}
