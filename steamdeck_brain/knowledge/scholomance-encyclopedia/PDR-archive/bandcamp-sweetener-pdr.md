Scholomance Visualizer UI Kit
1. Design Principles
Core phrase

Arcane telemetry for sellable music artifacts.

This UI kit should always balance three layers:

Layer	Purpose
Music Platform	Listen, buy, download, share
Archive Interface	Metadata, credits, provenance, release info
Ritual Telemetry	Bytecode, sigils, semantic maps, visualizer logic

The rule:

Lore decorates the product. It must never bury the song.

2. Token System
NEW: scholomance-visualizer.tokens.css
:root {
  /* =========================
     Core M3-Compatible Colors
     ========================= */

  --scholo-surface: #0b0a10;
  --scholo-surface-veil: #100d17;
  --scholo-surface-container: #161320;
  --scholo-surface-container-high: #211b2f;
  --scholo-surface-glass: rgba(22, 19, 32, 0.72);

  --scholo-outline: #3d3855;
  --scholo-outline-soft: rgba(117, 102, 156, 0.24);
  --scholo-divider: rgba(0, 229, 255, 0.16);

  --scholo-primary: #d926a9;
  --scholo-primary-soft: rgba(217, 38, 169, 0.18);
  --scholo-primary-glow: rgba(217, 38, 169, 0.42);

  --scholo-secondary: #00e5ff;
  --scholo-secondary-soft: rgba(0, 229, 255, 0.16);
  --scholo-secondary-glow: rgba(0, 229, 255, 0.38);

  --scholo-tertiary: #ffb300;
  --scholo-tertiary-soft: rgba(255, 179, 0, 0.16);
  --scholo-tertiary-glow: rgba(255, 179, 0, 0.36);

  --scholo-danger: #ff4d7d;
  --scholo-success: #6df7c1;

  --scholo-on-surface: #ffffff;
  --scholo-on-surface-high: #f6f0ff;
  --scholo-on-surface-medium: #8a869d;
  --scholo-on-surface-low: #5f5a72;
  --scholo-on-primary: #ffffff;

  /* =========================
     Typography
     ========================= */

  --scholo-font-display: "Cinzel", "Playfair Display", Georgia, serif;
  --scholo-font-mono: "Fira Code", "Roboto Mono", "IBM Plex Mono", monospace;
  --scholo-font-ui: Inter, system-ui, sans-serif;

  --scholo-display-xl: clamp(2.75rem, 5vw, 5.25rem);
  --scholo-display-lg: clamp(2rem, 3vw, 3.75rem);
  --scholo-title-lg: clamp(1.5rem, 2vw, 2.4rem);
  --scholo-title-md: 1.1rem;
  --scholo-body: 0.92rem;
  --scholo-caption: 0.72rem;
  --scholo-micro: 0.62rem;

  --scholo-letter-display: 0.16em;
  --scholo-letter-overline: 0.28em;
  --scholo-letter-mono: 0.08em;

  /* =========================
     Spacing
     ========================= */

  --scholo-space-1: 0.25rem;
  --scholo-space-2: 0.5rem;
  --scholo-space-3: 0.75rem;
  --scholo-space-4: 1rem;
  --scholo-space-5: 1.25rem;
  --scholo-space-6: 1.5rem;
  --scholo-space-8: 2rem;
  --scholo-space-10: 2.5rem;
  --scholo-space-12: 3rem;

  /* =========================
     Radius + Elevation
     ========================= */

  --scholo-radius-xs: 4px;
  --scholo-radius-sm: 8px;
  --scholo-radius-md: 12px;
  --scholo-radius-lg: 18px;
  --scholo-radius-pill: 999px;

  --scholo-shadow-card:
    0 0 0 1px var(--scholo-outline-soft),
    0 20px 60px rgba(0, 0, 0, 0.34);

  --scholo-shadow-primary:
    0 0 18px var(--scholo-primary-glow),
    0 0 48px rgba(217, 38, 169, 0.16);

  --scholo-shadow-secondary:
    0 0 18px var(--scholo-secondary-glow),
    0 0 48px rgba(0, 229, 255, 0.12);

  --scholo-shadow-tertiary:
    0 0 16px var(--scholo-tertiary-glow),
    0 0 42px rgba(255, 179, 0, 0.12);

  /* =========================
     Motion
     ========================= */

  --scholo-ease-ritual: cubic-bezier(0.19, 1, 0.22, 1);
  --scholo-ease-snap: cubic-bezier(0.2, 0.8, 0.2, 1);
  --scholo-duration-fast: 140ms;
  --scholo-duration-medium: 260ms;
  --scholo-duration-slow: 680ms;

  /* =========================
     Layout
     ========================= */

  --scholo-shell-max: 1920px;
  --scholo-panel-min: 420px;
  --scholo-card-padding: clamp(1rem, 1.6vw, 1.5rem);
  --scholo-player-height: 88px;
}
3. Global Surface Treatment
NEW: scholomance-visualizer.base.css
.scholoVisualizer {
  min-height: 100dvh;
  color: var(--scholo-on-surface);
  background:
    radial-gradient(circle at 74% 24%, rgba(217, 38, 169, 0.18), transparent 34%),
    radial-gradient(circle at 18% 10%, rgba(255, 179, 0, 0.08), transparent 28%),
    radial-gradient(circle at 50% 100%, rgba(0, 229, 255, 0.08), transparent 38%),
    var(--scholo-surface);
  font-family: var(--scholo-font-ui);
  overflow: hidden;
}

.scholoVisualizer::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.014) 1px, transparent 1px);
  background-size: 4px 4px;
  opacity: 0.38;
  mix-blend-mode: screen;
}

.scholoVisualizer::after {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at center, transparent 42%, rgba(0, 0, 0, 0.56) 100%);
}
What I added

I added a background material layer: grain, faint grid, radial glow, and vignette. This makes the UI feel less flat without turning it into galaxy wallpaper soup.

4. Layout Contract
Desktop
┌─────────────────────────────┬─────────────────────────────┐
│ Left Release Panel           │ Right Bytecode Panel         │
│ Metadata                     │ Visualizer Core              │
│ Provenance                   │ Telemetry Cards              │
│ Lyrics                       │ Semantic / Energy / Sync     │
├─────────────────────────────┴─────────────────────────────┤
│ Persistent Player / Buy / Waveform                         │
└─────────────────────────────────────────────────────────────┘
Mobile Order
1. Album cover + title
2. Player + waveform
3. Buy/support module
4. Track metadata
5. Lyrics
6. Visualizer
7. Telemetry cards
8. Provenance / credits / footer
NEW: Layout CSS
.scholoVisualizerShell {
  width: min(100%, var(--scholo-shell-max));
  min-height: 100dvh;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(var(--scholo-panel-min), 1fr) minmax(var(--scholo-panel-min), 1fr);
  padding-bottom: var(--scholo-player-height);
}

.scholoPanel {
  position: relative;
  min-width: 0;
  height: calc(100dvh - var(--scholo-player-height));
  overflow-y: auto;
  padding: clamp(1.25rem, 2vw, 2.5rem);
}

.scholoPanelLeft {
  border-right: 1px solid var(--scholo-divider);
}

@media (max-width: 980px) {
  .scholoVisualizer {
    overflow: auto;
  }

  .scholoVisualizerShell {
    display: flex;
    flex-direction: column;
    padding-bottom: 0;
  }

  .scholoPanel {
    height: auto;
    overflow: visible;
  }

  .scholoPanelLeft {
    border-right: 0;
    border-bottom: 1px solid var(--scholo-divider);
  }
}
5. Core Components
5.1 Arcane Card

This is the primitive everything else should use.

.scholoCard {
  position: relative;
  padding: var(--scholo-card-padding);
  border: 1px solid var(--scholo-outline-soft);
  border-radius: var(--scholo-radius-md);
  background:
    linear-gradient(180deg, rgba(255,255,255,0.035), transparent),
    var(--scholo-surface-glass);
  box-shadow: var(--scholo-shadow-card);
  backdrop-filter: blur(18px);
}

.scholoCard::before,
.scholoCard::after {
  content: "";
  position: absolute;
  width: 14px;
  height: 14px;
  pointer-events: none;
  opacity: 0.68;
}

.scholoCard::before {
  top: -1px;
  left: -1px;
  border-top: 1px solid var(--scholo-secondary);
  border-left: 1px solid var(--scholo-secondary);
}

.scholoCard::after {
  right: -1px;
  bottom: -1px;
  border-right: 1px solid var(--scholo-primary);
  border-bottom: 1px solid var(--scholo-primary);
}

.scholoCard[data-state="active"] {
  border-color: rgba(217, 38, 169, 0.46);
  box-shadow: var(--scholo-shadow-card), var(--scholo-shadow-primary);
}

.scholoCard[data-state="locked"] {
  filter: saturate(0.72);
  opacity: 0.72;
}
What I added

Corner brackets. This tiny thing makes the whole UI feel engineered, like a premium sci-fi device rather than plain cards.

5.2 Overline Label
.scholoOverline {
  font-family: var(--scholo-font-mono);
  font-size: var(--scholo-micro);
  letter-spacing: var(--scholo-letter-overline);
  color: var(--scholo-secondary);
  text-transform: uppercase;
}

.scholoGoldOverline {
  color: var(--scholo-tertiary);
}

.scholoMagentaOverline {
  color: var(--scholo-primary);
}
5.3 Hero Track Header
.scholoHero {
  display: grid;
  gap: var(--scholo-space-3);
  text-align: center;
  padding-block: var(--scholo-space-8);
}

.scholoHeroTitle {
  margin: 0;
  font-family: var(--scholo-font-display);
  font-size: var(--scholo-display-lg);
  letter-spacing: 0.045em;
  color: var(--scholo-on-surface-high);
  text-transform: uppercase;
  text-shadow: 0 0 24px rgba(255, 255, 255, 0.08);
}

.scholoHeroSubtitle {
  font-family: var(--scholo-font-mono);
  font-size: var(--scholo-caption);
  letter-spacing: var(--scholo-letter-mono);
  color: var(--scholo-on-surface-medium);
  text-transform: uppercase;
}
6. Album Artifact Tile

This replaces the current small sigil square with something closer to a sellable release object.

.scholoAlbumArtifact {
  display: grid;
  grid-template-columns: 112px 1fr;
  gap: var(--scholo-space-5);
  align-items: center;
}

.scholoCoverTile {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--scholo-radius-sm);
  border: 1px solid rgba(255, 179, 0, 0.28);
  background:
    radial-gradient(circle, rgba(255,179,0,0.18), transparent 34%),
    radial-gradient(circle at center, rgba(217,38,169,0.16), transparent 58%),
    #0c0912;
  box-shadow: var(--scholo-shadow-tertiary);
  overflow: hidden;
}

.scholoCoverTile::before {
  content: "◇";
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 2rem;
  color: var(--scholo-tertiary);
  text-shadow: 0 0 18px var(--scholo-tertiary-glow);
}

.scholoFormatBadges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--scholo-space-2);
}

.scholoFormatBadge {
  border: 1px solid var(--scholo-outline-soft);
  border-radius: var(--scholo-radius-pill);
  padding: 0.25rem 0.55rem;
  font-family: var(--scholo-font-mono);
  font-size: var(--scholo-micro);
  letter-spacing: var(--scholo-letter-mono);
  color: var(--scholo-on-surface-medium);
  background: rgba(255, 255, 255, 0.035);
}
Sweetener

The album tile becomes the commercial anchor. It can hold real cover art, but the fallback sigil still looks intentional.

7. Metadata Matrix
.scholoMetadataMatrix {
  display: grid;
  gap: 0;
  border-top: 1px solid var(--scholo-outline-soft);
}

.scholoMetaRow {
  display: grid;
  grid-template-columns: 130px 1fr;
  gap: var(--scholo-space-4);
  padding: 0.58rem 0;
  border-bottom: 1px solid rgba(61, 56, 85, 0.36);
  font-family: var(--scholo-font-mono);
  font-size: var(--scholo-caption);
}

.scholoMetaKey {
  color: var(--scholo-on-surface-low);
  text-transform: uppercase;
  letter-spacing: var(--scholo-letter-mono);
}

.scholoMetaValue {
  color: var(--scholo-on-surface-high);
  text-align: right;
}
8. Provenance + Credits Stack
.scholoProvenanceBody {
  display: grid;
  gap: var(--scholo-space-3);
  font-family: var(--scholo-font-mono);
  font-size: var(--scholo-caption);
  color: var(--scholo-on-surface-medium);
  line-height: 1.75;
}

.scholoCreditGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--scholo-space-3);
}

.scholoCreditItem {
  padding: var(--scholo-space-3);
  border-radius: var(--scholo-radius-sm);
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid var(--scholo-outline-soft);
}
Sweetener

I added credits as a first-class module, because a Bandcamp replacement needs more than beauty. It needs legitimacy: who wrote it, what tools were used, what version, what release date, what formats.

9. Lyric Tracker
.scholoLyrics {
  display: grid;
  gap: var(--scholo-space-2);
  font-family: var(--scholo-font-mono);
  font-size: var(--scholo-caption);
  line-height: 1.7;
}

.scholoLyricLine {
  display: grid;
  grid-template-columns: 3ch 1fr;
  gap: var(--scholo-space-3);
  color: var(--scholo-on-surface-low);
  opacity: 0.62;
  transition:
    color var(--scholo-duration-fast) var(--scholo-ease-snap),
    opacity var(--scholo-duration-fast) var(--scholo-ease-snap),
    transform var(--scholo-duration-fast) var(--scholo-ease-snap);
}

.scholoLyricIndex {
  color: var(--scholo-on-surface-low);
}

.scholoLyricLine[data-active="true"] {
  color: var(--scholo-on-surface-high);
  opacity: 1;
  transform: translateX(3px);
}

.scholoLyricLine[data-active="true"] .scholoLyricIndex {
  color: var(--scholo-tertiary);
}

.scholoLyricLine[data-semantic="fracture"] {
  color: var(--scholo-primary);
  text-shadow: 0 0 16px rgba(217, 38, 169, 0.22);
}
Sweetener

Lyric lines can now carry semantic states, like:

<span className="scholoLyricLine" data-active="true" data-semantic="fracture">
  <span className="scholoLyricIndex">06</span>
  <span>FRACTURED LIGHT BEHIND IT ALL</span>
</span>

This turns annotations into live data instead of static commentary.

10. Bytecode Visualizer Core
.scholoVisualizerCore {
  position: relative;
  width: min(48vw, 520px);
  aspect-ratio: 1;
  margin: clamp(2rem, 5vh, 5rem) auto;
  display: grid;
  place-items: center;
}

.scholoVisualizerRing {
  position: absolute;
  inset: 8%;
  border: 1px solid rgba(255, 179, 0, 0.32);
  border-radius: 50%;
  box-shadow: 0 0 28px rgba(255, 179, 0, 0.08);
}

.scholoVisualizerRing:nth-child(2) {
  inset: 18%;
  border-color: rgba(0, 229, 255, 0.22);
}

.scholoVisualizerRing:nth-child(3) {
  inset: 28%;
  border-color: rgba(217, 38, 169, 0.34);
}

.scholoVisualizerWaveformHalo {
  position: absolute;
  inset: 24%;
  border-radius: 50%;
  background:
    conic-gradient(
      from 0deg,
      transparent,
      rgba(255, 179, 0, 0.24),
      rgba(217, 38, 169, 0.32),
      transparent
    );
  filter: blur(4px);
  opacity: 0.82;
}

.scholoVisualizerNode {
  position: relative;
  width: 132px;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  color: var(--scholo-on-surface-high);
  background:
    radial-gradient(circle, rgba(255,255,255,0.34), transparent 18%),
    radial-gradient(circle, rgba(217,38,169,0.56), transparent 64%);
  clip-path: polygon(50% 0%, 95% 25%, 86% 78%, 50% 100%, 14% 78%, 5% 25%);
  box-shadow: var(--scholo-shadow-primary);
}

.scholoVisualizerNode::before {
  content: "";
  position: absolute;
  inset: 18%;
  border: 1px solid rgba(255,255,255,0.72);
  clip-path: polygon(50% 0%, 95% 25%, 86% 78%, 50% 100%, 14% 78%, 5% 25%);
}
Sweetener

I separated the visualizer into named layers:

Ring
WaveformHalo
Node
Glow
Pulse
Glyph

This makes it possible to animate each layer independently without turning the component into a dragon made of spaghetti.

11. Telemetry Cards
.scholoTelemetryGrid {
  display: grid;
  grid-template-columns: 180px 1fr 180px;
  gap: var(--scholo-space-5);
  align-items: center;
}

.scholoTelemetryColumn {
  display: grid;
  gap: var(--scholo-space-5);
}

.scholoFingerprint {
  font-family: var(--scholo-font-mono);
  font-size: 1.1rem;
  line-height: 1.55;
  letter-spacing: 0.12em;
  color: var(--scholo-tertiary);
  text-shadow: 0 0 16px rgba(255, 179, 0, 0.24);
}

.scholoChecksum {
  margin-top: var(--scholo-space-3);
  font-family: var(--scholo-font-mono);
  font-size: var(--scholo-micro);
  line-height: 1.8;
  color: var(--scholo-on-surface-low);
  word-break: break-all;
}

.scholoCoordinates {
  display: grid;
  gap: var(--scholo-space-2);
  font-family: var(--scholo-font-mono);
  font-size: var(--scholo-caption);
}

.scholoCoordinateRow {
  display: flex;
  justify-content: space-between;
  gap: var(--scholo-space-4);
}

.scholoCoordinateAxis {
  color: var(--scholo-secondary);
}

.scholoCoordinateValue {
  color: var(--scholo-on-surface-high);
}
12. Spectral Analyzer Sparklines
.scholoSparklineStack {
  display: grid;
  gap: var(--scholo-space-3);
}

.scholoSparkline {
  width: 100%;
  height: 32px;
  overflow: visible;
}

.scholoSparkline path {
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  filter: drop-shadow(0 0 6px currentColor);
}

.scholoSparkline[data-band="low"] {
  color: var(--scholo-tertiary);
}

.scholoSparkline[data-band="mid"] {
  color: var(--scholo-primary);
}

.scholoSparkline[data-band="high"] {
  color: var(--scholo-secondary);
}
13. Semantic Map
.scholoSemanticList {
  display: grid;
  gap: var(--scholo-space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.scholoSemanticItem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--scholo-space-3);
  font-family: var(--scholo-font-mono);
  font-size: var(--scholo-caption);
  color: var(--scholo-on-surface-medium);
}

.scholoSemanticNode {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--scholo-primary);
  box-shadow: 0 0 10px var(--scholo-primary-glow);
}

.scholoSemanticItem[data-active="true"] {
  color: var(--scholo-on-surface-high);
}

.scholoSemanticItem[data-active="true"] .scholoSemanticNode {
  background: var(--scholo-tertiary);
  box-shadow: var(--scholo-shadow-tertiary);
}
Sweetener

Semantic map nodes can become clickable. Clicking Veil, Bleed, or Drift could highlight relevant lyrics, visualizer geometry, and provenance notes.

14. Energy Matrix
.scholoEnergyMatrix {
  --matrix-size: 7;
  display: grid;
  grid-template-columns: repeat(var(--matrix-size), 1fr);
  gap: 0.45rem;
}

.scholoEnergyDot {
  width: 8px;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--scholo-secondary);
  opacity: var(--energy, 0.36);
  box-shadow: 0 0 calc(12px * var(--energy, 0.36)) var(--scholo-secondary-glow);
}

.scholoEnergyDot[data-critical="true"] {
  background: var(--scholo-primary);
  box-shadow: 0 0 14px var(--scholo-primary-glow);
}

Example data:

const energyMatrix = [
  0.2, 0.4, 0.7, 1.0, 0.6, 0.3, 0.2,
  0.3, 0.8, 0.5, 0.4, 0.9, 0.6, 0.2
];
15. Persistent Player Bar
.scholoPlayerBar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: var(--scholo-player-height);
  z-index: 30;
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(360px, 1.6fr) minmax(260px, 1fr);
  gap: var(--scholo-space-5);
  align-items: center;
  padding: 0 var(--scholo-space-6);
  background:
    linear-gradient(180deg, rgba(11, 10, 16, 0.64), rgba(11, 10, 16, 0.96)),
    rgba(11, 10, 16, 0.9);
  border-top: 1px solid var(--scholo-divider);
  backdrop-filter: blur(18px);
}

.scholoPlayerTitle {
  font-family: var(--scholo-font-display);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.scholoPlayerMeta {
  font-family: var(--scholo-font-mono);
  font-size: var(--scholo-micro);
  color: var(--scholo-on-surface-medium);
  letter-spacing: var(--scholo-letter-mono);
}

.scholoPlayerControls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--scholo-space-3);
}

.scholoIconButton {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid var(--scholo-outline-soft);
  border-radius: 50%;
  color: var(--scholo-on-surface-medium);
  background: rgba(255, 255, 255, 0.035);
  transition:
    color var(--scholo-duration-fast) var(--scholo-ease-snap),
    border-color var(--scholo-duration-fast) var(--scholo-ease-snap),
    box-shadow var(--scholo-duration-fast) var(--scholo-ease-snap);
}

.scholoIconButton:hover,
.scholoIconButton:focus-visible {
  color: var(--scholo-tertiary);
  border-color: rgba(255, 179, 0, 0.42);
  box-shadow: var(--scholo-shadow-tertiary);
}

.scholoPlayButton {
  width: 48px;
  height: 48px;
  color: var(--scholo-surface);
  background: var(--scholo-tertiary);
  box-shadow: var(--scholo-shadow-tertiary);
}

.scholoBuyButton {
  justify-self: end;
  border: 1px solid rgba(217, 38, 169, 0.46);
  border-radius: var(--scholo-radius-pill);
  padding: 0.75rem 1.2rem;
  color: var(--scholo-on-surface-high);
  background: linear-gradient(135deg, rgba(217,38,169,0.32), rgba(255,179,0,0.12));
  font-family: var(--scholo-font-mono);
  font-size: var(--scholo-caption);
  letter-spacing: var(--scholo-letter-mono);
  text-transform: uppercase;
}

@media (max-width: 980px) {
  .scholoPlayerBar {
    position: sticky;
    height: auto;
    grid-template-columns: 1fr;
    padding: var(--scholo-space-4);
  }

  .scholoBuyButton {
    justify-self: stretch;
    text-align: center;
  }
}
Sweetener

I added a persistent commercial player. This is the biggest Bandcamp replacement move.

It gives you:

Song identity.
Playback control.
Waveform center.
Buy/support CTA.

No one should hunt for the play button in a haunted server cathedral.

16. Waveform Scrubber
.scholoWaveform {
  display: grid;
  gap: var(--scholo-space-2);
}

.scholoWaveformBars {
  height: 34px;
  display: flex;
  align-items: end;
  gap: 2px;
}

.scholoWaveBar {
  flex: 1;
  min-width: 2px;
  height: calc(var(--bar, 0.3) * 100%);
  border-radius: 2px 2px 0 0;
  background: rgba(138, 134, 157, 0.42);
}

.scholoWaveBar[data-played="true"] {
  background: linear-gradient(180deg, var(--scholo-tertiary), var(--scholo-primary));
  box-shadow: 0 0 8px rgba(255, 179, 0, 0.18);
}

.scholoWaveformTime {
  display: flex;
  justify-content: space-between;
  font-family: var(--scholo-font-mono);
  font-size: var(--scholo-micro);
  color: var(--scholo-on-surface-low);
}
17. Commerce Module
.scholoCommerceCard {
  display: grid;
  gap: var(--scholo-space-4);
}

.scholoPrice {
  font-family: var(--scholo-font-display);
  font-size: 2rem;
  color: var(--scholo-on-surface-high);
}

.scholoCommerceActions {
  display: grid;
  gap: var(--scholo-space-3);
}

.scholoPrimaryAction,
.scholoSecondaryAction {
  border-radius: var(--scholo-radius-pill);
  padding: 0.85rem 1rem;
  font-family: var(--scholo-font-mono);
  font-size: var(--scholo-caption);
  letter-spacing: var(--scholo-letter-mono);
  text-transform: uppercase;
}

.scholoPrimaryAction {
  border: 1px solid rgba(255, 179, 0, 0.52);
  background: var(--scholo-tertiary);
  color: #171009;
  box-shadow: var(--scholo-shadow-tertiary);
}

.scholoSecondaryAction {
  border: 1px solid var(--scholo-outline-soft);
  background: rgba(255,255,255,0.035);
  color: var(--scholo-on-surface-medium);
}
Recommended copy
Own this release
$7 or more

Includes unlimited streaming, high-quality FLAC/WAV download, and archive access.
18. Procedural Sigil Asset Contract

This is where your page becomes unmistakably Scholomance.

export type ScholomanceSigilSeed = {
  trackId: string;
  title: string;
  bpm: number;
  key: string;
  semanticTags: string[];
  checksum: string;
};

export type ScholomanceSigilOutput = {
  seed: string;
  polygonSides: number;
  ringCount: number;
  glyphCount: number;
  primaryHue: "magenta" | "cyan" | "amber";
  motionProfile: "still" | "pulse" | "orbit" | "fracture";
};

Example mapping:

export function createSigilProfile(seed: ScholomanceSigilSeed): ScholomanceSigilOutput {
  const semanticWeight = seed.semanticTags.length;
  const checksumValue = seed.checksum
    .slice(0, 6)
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return {
    seed: `${seed.trackId}:${seed.checksum.slice(0, 8)}`,
    polygonSides: 5 + (checksumValue % 4),
    ringCount: 2 + (semanticWeight % 4),
    glyphCount: 6 + (checksumValue % 9),
    primaryHue: checksumValue % 3 === 0 ? "magenta" : checksumValue % 3 === 1 ? "cyan" : "amber",
    motionProfile: semanticWeight > 5 ? "fracture" : "orbit"
  };
}
Sweetener

Every track can now generate its own:

Cover fallback.
Small track glyph.
Visualizer geometry.
Semantic node style.
Motion personality.

That gives you scalable identity without manually designing every little relic.

19. Component Registry
NEW: scholomanceVisualizer.registry.ts
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
20. Data Schema
NEW: scholomanceRelease.schema.ts
export type ScholomanceRelease = {
  id: string;
  title: string;
  artist: string;
  album: string;
  releaseDate: string;

  audio: {
    duration: string;
    bpm: number;
    key: string;
    genre: string[];
    fileType: string;
    sampleRate: string;
    bitDepth: string;
  };

  commerce: {
    price: string;
    currency: "USD";
    buyEnabled: boolean;
    downloadFormats: string[];
  };

  provenance: {
    humanIntent: string;
    tools: string[];
    assistance: string[];
    masteringChain?: string[];
  };

  bytecode: {
    fingerprint: string;
    checksum: string;
    seed: string;
    glyphcoreVersion: string;
    coordinates: {
      x: number;
      y: number;
      z: number;
    };
    ritualSync: {
      phase: string;
      cycle: string;
      bpm: number;
      key: string;
    };
  };

  semantics: Array<{
    label: string;
    description: string;
    active?: boolean;
  }>;

  lyrics: Array<{
    index: number;
    text: string;
    timestamp?: string;
    semanticTag?: string;
  }>;
};
21. Accessibility + Motion Governance
@media (prefers-reduced-motion: reduce) {
  .scholoVisualizer *,
  .scholoVisualizer *::before,
  .scholoVisualizer *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }

  .scholoVisualizerWaveformHalo {
    filter: none;
  }
}

.scholoIconButton:focus-visible,
.scholoBuyButton:focus-visible,
.scholoPrimaryAction:focus-visible,
.scholoSecondaryAction:focus-visible {
  outline: 2px solid var(--scholo-secondary);
  outline-offset: 3px;
}
Sweetener

The kit now has motion safety built in. Neon interfaces can become visual bees in a jar fast. This keeps it usable for real people.

22. What I Added Beyond Your PDR
Addition	Why it sweetens the kit
Album artifact tile	Makes the release feel like a product
Commerce card	Converts visualizer into Bandcamp replacement
Persistent player bar	Makes listening primary
Waveform scrubber	Adds music-platform legitimacy
Credits card	Adds trust and release context
Procedural sigil contract	Scales identity across songs
Semantic lyric states	Turns lore into interactive UX
Card primitive with corner brackets	Creates a manufactured design language
Motion safety layer	Prevents visual fatigue
Responsive content order	Makes mobile usable
Checksum/archive footer concept	Reinforces Scholomance as a music archive system
QA Checklist
Visual
 Cards share the same border, radius, and padding language.
 The album cover is visually stronger than secondary cards.
 Player controls are visible within 2 seconds.
 Buy/support CTA is obvious without reading lore.
 The visualizer core does not overpower the song title.
 Cyan, magenta, and amber each have distinct meaning.
UX
 User can play the song from hero, tracklist, and player bar.
 User can buy/download without scrolling on desktop.
 Lyrics remain readable at 1366px width.
 Right panel telemetry remains secondary to listening.
 Mobile order starts with cover, song, player, commerce.
Accessibility
 Focus states visible.
 Reduced motion disables pulse/orbit effects.
 Text contrast is acceptable on all cards.
 Buttons have labels, not just icons.
 Semantic nodes are not color-only indicators.
Regression
 Current scrolling still works.
 Split panel does not double-scroll awkwardly.
 Player bar does not hide lyrics.
 Visualizer canvas does not block clicks.
 Layout survives long titles and long genre names.
Next Risks
1. Too much ornament

The kit gives you a lot of visual weapons. Do not fire every cannon at once. The hierarchy should be:

Song > Player > Buy > Lyrics > Visualizer > Lore
2. Commerce module must be boringly clear

The buy button should not require decoding the Grimoire of Visa. Make it obvious.

3. Canvas/WebGL can become a dependency trap

Keep the visualizer core isolated behind one component:

VisualizerCore receives audioState + bytecodeState.
It should not own release metadata, player state, or commerce state.
4. Sigils need deterministic seeds

Do not generate random sigils at render time. Track identity should remain stable across reloads.

Final Verdict

This UI kit upgrades the page from:

beautiful occult visualizer

to:

professional music release platform with a proprietary bytecode mythology layer

That is the real move. The spell becomes a store, the store becomes an archive, and the archive still looks like it was carved into a machine that dreams in hex. 🜁
