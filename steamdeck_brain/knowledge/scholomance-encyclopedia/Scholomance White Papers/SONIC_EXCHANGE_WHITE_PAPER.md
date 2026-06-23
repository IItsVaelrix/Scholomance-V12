# The Sonic Exchange: Scholomance-Native Listening Platform
## A Reactive, AI-Transparent Music Marketplace

The Sonic Exchange is an audio-reactive marketplace built natively for the Scholomance platform. It addresses the catalog limitations of traditional players by implementing a database-backed artist-release-track model and pairing it with a deterministic, frame-synced visual rendering engine. 

---

## 1. Architectural Foundations

The platform consists of a versioned catalog schema integrated into the local SQLite database, public REST APIs, a robust Web Audio pipeline, and a deterministic visual engine.

### 1.1 Content Taxonomy (The Schools)
All music on the platform is aligned with the five Scholomance arcane schools:
*   **SONIC**: High-energy, punchy, percussive transients.
*   **VOID**: Deep ambient, drone-like structures, and sub-bass anchors.
*   **WILL**: High-intent, complex melodies and vocal lines.
*   **ALCHEMY**: Modulated textures, synthetic filters, and hybrid elements.
*   **PSYCHIC**: Micro-tonal variations, spatial delays, and shifting reverbs.

These schools act as the primary tag axis for search, catalog discovery, and visual theme selection.

### 1.2 The Database Schema (Migrations v15–v20)
*   **v15 (Catalog Core)**: Defines `artists`, `releases`, `tracks`, and `track_tags`.
*   **v16 (Provenance Ledger)**: Cryptographically binds signed AI provenance rows to tracks.
*   **v17 (Resonance Registry)**: Maps track content hashes to precompiled visual sidecars.
*   **v18 (Lyrics & Annotations)**: timed lyric lines (karaoke) and line-anchored annotations.
*   **v19 (Commerce)**: Ledger for name-your-price `purchases` and artist `payouts`.
*   **v20 (Social & Analytics)**: Follow connections, timestamped comments, and play tracking.

---

## 2. Core Features

### 2.1 The Resonance Sidecar (Deterministic Moat)
In traditional players, visuals require real-time Web Audio API FFT analysis. This breaks inside sandboxed frames, on iOS Safari, and under CORS restrictions. 

The Sonic Exchange bypasses this by compiling a **Resonance Sidecar** (`ResonanceTimeline` JSON) once upon upload. The sidecar contains pre-analyzed transient onsets, energy bands, and BPM mappings. During playback, the player samples this timeline at `audio.currentTime`, emitting a high-frequency `RESONANCE_TICK` that updates Phaser visualizers frame-synced on any device, even when microphone/audio context access is sandboxed.

### 2.2 Deterministic Visual Genome
Every track has a checksum fingerprint (`tracks.fingerprint_id`). When rendering the visualizer, this hash seeds a deterministic generator (`GlyphCore`) to generate concentric geometry rings, coordinate sync grids, and runic forms. Because the seed is derived directly from the file content, the visual experience is byte-identical and reproducible across all clients.

### 2.3 The Provenance Ledger
Instead of hiding AI assistance as contraband, the Sonic Exchange features a signed **Provenance Ledger**. Surfaced in the UI as a **Glass Box** badge, listeners can inspect:
*   The exact AI model used (e.g. `Suno v3.5`).
*   The prompt lineage and generation parameters.
*   The human-to-AI editing/curation ratio.
*   Cryptographic HMAC signatures certifying authenticity.

---

## 3. How to Use the Platform

### 3.1 Immersive Cockpit (`/listen`)
The ambient station cockpit (`ListenPage.tsx`) offers an immersive discovery experience:
1.  **Tuning Dial**: Cycle through the five schools.
2.  **Visual Orb**: Renders real-time audio reactions driven by the selected school config.
3.  **Frequency Matrix**: Shows the current broadcast status and signal levels.
4.  **Enter the Storm Button**: The central black hole button. When clicked, it queries the backend resolver:
    ```
    GET /api/catalog/tracks/resolve?streamUrl={currentPlayUrl}
    ```
    Upon receiving the database `trackId`, it routes the UI directly to the Grimoire page.

### 3.2 The Grimoire Spread (`/grimoire/:trackId`)
The Grimoire is the listening centerpiece, split into two facing parchment pages:
*   **Left Page (Verses & Veritas)**:
    *   **Verses**: Displays the song's lyrics. The currently sung line is highlighted in warm gold using timed lyric data.
    *   **Veritas (Provenance)**: Displays the signed provenance manifest, certifying tools, licenses, and verified cryptographic signatures.
    *   **Annotations**: Expandable, line-anchored marginal notes providing lore or musical context.
*   **Right Page (Bytecode Visualiser)**:
    *   Exposes the deterministic visual genome.
    *   Displays the SHA-256 fingerprint, semantic map (vibe tags), and energy matrix.
    *   Renders the central sacred-geometry sigil, driven by the resonance sidecar tick.

### 3.3 Dynamic Seeding on Boot
The platform operates on a "non-empty catalog on day one" constraint. On server startup, the database checks for the system station (`scholomance-station`). If absent, it automatically runs `catalog.seed.js` using legacy audio configs to populate the catalog with default tracks, ensuring immediate playback availability.
