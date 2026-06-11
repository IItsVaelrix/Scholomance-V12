export const scholomanceVisualizerComponents = {
  layout: [
    "VisualizerShell",
    "ReleasePanel",
    "BytecodePanel",
    "PersistentPlayerBar"
  ],
  release: [
    "TrackHero",
    "AlbumArtifactTile",
    "MetadataMatrix",
    "ProvenanceCard",
    "CreditsCard",
    "LyricTracker",
    "CommerceCard"
  ],
  bytecode: [
    "VisualizerCore",
    "FingerprintCard",
    "SpectralAnalyzerCard",
    "CoordinatesCard",
    "SemanticMapCard",
    "EnergyMatrixCard",
    "RitualSyncCard"
  ],
  primitives: [
    "ArcaneCard",
    "OverlineLabel",
    "IconButton",
    "FormatBadge",
    "WaveformScrubber",
    "SigilGlyph"
  ]
} as const;
