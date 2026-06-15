import { mergeTrackAlignment } from "../../src/pages/Visualiser/tracks/loadTrackWithAlignment";
import type { GrimoireTrack } from "../../src/pages/Visualiser/tracks/types";
import type { AlignmentSidecar } from "../../src/video/types";

const track: GrimoireTrack = {
  id: "petrichor",
  title: "Petrichor",
  artist: "Vaelrix",
  model: "chirp-fenix",
  modelVersion: "v5.5",
  duration: 241,
  sunoUrl: "https://example.com",
  audioUrl: "https://example.com/audio.mp3",
  coverUrl: "https://example.com/cover.jpg",
  meta: [],
  provenance: { statement: "", tools: [], assistance: "" },
  lyrics: ["I just care that I miss you"],
  annotations: [],
};

const sidecar: AlignmentSidecar = {
  schemaVersion: "scholomance.align.v1",
  trackId: "petrichor",
  bpm: 123,
  offsetMs: 9000,
  lyricsHash: "abc123",
  generatedAt: "2026-06-15T00:00:00Z",
  wordTimings: [
    {
      word: "I",
      startMs: 9000,
      endMs: 9200,
      beat: { index: 0, phase: 0, bar: 0, barPhase: 0 },
      school: "PSYCHIC",
    },
  ],
};

describe("mergeTrackAlignment", () => {
  it("returns track unchanged when no sidecar", async () => {
    const result = await mergeTrackAlignment(track);
    expect(result).toBe(track);
    expect(result.wordTimings).toBeUndefined();
  });

  it("merges wordTimings from sidecar", async () => {
    const result = await mergeTrackAlignment(track, sidecar);
    expect(result.wordTimings).toHaveLength(1);
    expect(result.wordTimings![0].word).toBe("I");
  });

  it("separates alignmentMeta from wordTimings", async () => {
    const result = await mergeTrackAlignment(track, sidecar);
    expect(result.alignmentMeta?.bpm).toBe(123);
    expect(result.alignmentMeta?.trackId).toBe("petrichor");
    expect((result.alignmentMeta as any)?.wordTimings).toBeUndefined();
  });

  it("throws on schemaVersion mismatch", async () => {
    const bad = { ...sidecar, schemaVersion: "v0" } as unknown as AlignmentSidecar;
    await expect(mergeTrackAlignment(track, bad)).rejects.toThrow("Unsupported alignment schema");
  });

  it("throws on trackId mismatch", async () => {
    const bad: AlignmentSidecar = { ...sidecar, trackId: "bigFather" };
    await expect(mergeTrackAlignment(track, bad)).rejects.toThrow("Sidecar trackId mismatch");
  });
});
