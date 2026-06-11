import React from "react";
import type { ScholomanceRelease, PlayerState } from "../types";
import { TrackHero } from "./TrackHero";
import { AlbumArtifactTile } from "./AlbumArtifactTile";
import { MetadataMatrix } from "./MetadataMatrix";
import { ProvenanceCard } from "./ProvenanceCard";
import { CreditsCard } from "./CreditsCard";
import { LyricTracker } from "./LyricTracker";
import { VisualizerCore } from "./VisualizerCore";
import { FingerprintCard } from "./FingerprintCard";
import { CoordinatesCard } from "./CoordinatesCard";
import { SpectralAnalyzerCard } from "./SpectralAnalyzerCard";
import { SemanticMapCard } from "./SemanticMapCard";
import { EnergyMatrixCard } from "./EnergyMatrixCard";
import { CommerceCard } from "./CommerceCard";
import { PersistentPlayerBar } from "./PersistentPlayerBar";
import { VisualizerShell } from "./VisualizerShell";
import { ReleasePanel } from "./ReleasePanel";
import { BytecodePanel } from "./BytecodePanel";
import { RitualSyncCard } from "./RitualSyncCard";

interface VisualizerKitProps {
  release?: ScholomanceRelease;
  isPlaying?: boolean;
  playerState?: PlayerState;
  signalLevel?: number;
  volume?: number;
  currentTime?: number;
  duration?: number;
  getByteFrequencyData?: (data: Uint8Array) => void;
  schoolColor?: string;
  schoolId?: string;
  activeLyricIndex?: number;
  onPlay?: () => void;
  onPause?: () => void;
  onRewind?: () => void;
  onFastForward?: () => void;
  onSeek?: (pct: number) => void;
  onBuy?: () => void;
  onTagClick?: (label: string) => void;
}

export function VisualizerKit({
  release,
  isPlaying = false,
  playerState = "standby",
  signalLevel = 0,
  volume = 0.5,
  currentTime = 0,
  duration = 100,
  getByteFrequencyData,
  schoolId = "SONIC",
  activeLyricIndex,
  onPlay,
  onPause,
  onRewind,
  onFastForward,
  onSeek,
  onBuy,
  onTagClick,
}: VisualizerKitProps) {
  const metadataRows = release
    ? [
        { key: "RELEASED", value: release.releaseDate },
        { key: "ARTIST", value: release.artist },
        { key: "BPM", value: String(release.audio.bpm) },
        { key: "KEY", value: release.audio.key },
        { key: "GENRE", value: release.audio.genre.join(", ") },
        { key: "FORMAT", value: `${release.audio.fileType} / ${release.audio.sampleRate} / ${release.audio.bitDepth}` },
      ]
    : [];

  const title = release?.title ?? schoolId;
  const subtitle = release?.artist;

  return (
    <div className="scholoVisualizer">
      <VisualizerShell>
        {/* ── Left Panel: Release ── */}
        <ReleasePanel>
          <TrackHero title={title} subtitle={subtitle} />

          {release && (
            <div style={{ display: "grid", gap: "var(--scholo-space-5)" }}>
              <AlbumArtifactTile
                fallbackGlyph={schoolId === "SONIC" ? "♫" : schoolId === "VOID" ? "◈" : schoolId === "ALCHEMY" ? "⚗" : schoolId === "WILL" ? "✦" : "⟡"}
                formatBadges={release.commerce.downloadFormats}
              />

              {metadataRows.length > 0 && (
                <div className="scholoCard">
                  <span className="scholoOverline">METADATA</span>
                  <MetadataMatrix rows={metadataRows} />
                </div>
              )}

              <ProvenanceCard
                humanIntent={release.provenance.humanIntent}
                tools={release.provenance.tools}
                assistance={release.provenance.assistance}
                masteringChain={release.provenance.masteringChain}
              />

              <CreditsCard
                credits={[
                  { role: "Artist", name: release.artist },
                  { role: "Release", name: release.album },
                ]}
              />

              {release.lyrics.length > 0 && (
                <LyricTracker
                  lyrics={release.lyrics}
                  activeIndex={activeLyricIndex}
                />
              )}

              <CommerceCard
                price={release.commerce.price}
                currency={release.commerce.currency}
                onBuy={onBuy}
                buyEnabled={release.commerce.buyEnabled}
                downloadFormats={release.commerce.downloadFormats}
              />
            </div>
          )}
        </ReleasePanel>

        {/* ── Right Panel: Bytecode ── */}
        <BytecodePanel>
          <VisualizerCore signalLevel={signalLevel} isPlaying={isPlaying} schoolId={schoolId} />

          {release && (
            <div style={{ display: "grid", gap: "var(--scholo-space-5)" }}>
              <FingerprintCard
                fingerprint={release.bytecode.fingerprint}
                checksum={release.bytecode.checksum}
              />

              <CoordinatesCard
                x={release.bytecode.coordinates.x}
                y={release.bytecode.coordinates.y}
                z={release.bytecode.coordinates.z}
              />

              <SpectralAnalyzerCard
                getByteFrequencyData={getByteFrequencyData}
                isPlaying={isPlaying}
              />

              {release.semantics.length > 0 && (
                <SemanticMapCard
                  tags={release.semantics}
                  onTagClick={onTagClick}
                />
              )}

              <EnergyMatrixCard />

              <RitualSyncCard data={release.bytecode.ritualSync} />
            </div>
          )}
        </BytecodePanel>
      </VisualizerShell>

      {/* ── Persistent Player Bar ── */}
      <PersistentPlayerBar
        title={title}
        artist={subtitle}
        isPlaying={isPlaying}
        playerState={playerState}
        currentTime={currentTime}
        duration={duration}
        onPlay={onPlay}
        onPause={onPause}
        onRewind={onRewind}
        onFastForward={onFastForward}
        onSeek={onSeek}
        onBuy={onBuy}
      />
    </div>
  );
}
