# RESONANCE LAW

**Effective:** Scholomance V12
**Core Principle:** *When live perception is unreliable or expensive, compile perception into deterministic memory and replay it against an authoritative clock.*

## Rationale
The browser sandbox isolates cross-origin media to protect user data, rendering live spectral analysis (`AnalyserNode`) physically impossible for external streams (e.g. Suno embeds, SoundCloud iframes) without proxying the heavy audio streams through our own servers. 

Rather than treating this as a permanent architectural blockade, we recognize that our visual processors do not need to *hear* the audio; they only need to know what the audio *means* at any given millisecond.

## The Mandate
1. **Never fight the Sandbox for visual data.** If CORS blocks live perception, immediately fall back to a compiled bytecode sidecar (`[fingerprintId].resonance.json`).
2. **Playback Time is the Absolute Authority.** Never use an independently ticking interval or frame delta to guess what the audio is doing. The only source of truth for the Resonance Timeline is `audio.currentTime`. This makes the visualization immune to buffering drift, seeking, and tab suspension.
3. **Decouple Raw Audio from Meaning.** Spectral data is measured (RMS, frequency bins); Resonance data is interpreted (violence, luminosity, expansion). Store these layers separately so the mapper can evolve without re-compiling the universe.
4. **Resonance is a Descriptive Signal, Not the Audio.** The Bytecode Fingerprint tells the world "the bass is erupting now." It is not itself the bass. It drives lighting, particles, and atmosphere, but it cannot directly equalize the sandboxed audio.

## Implementation Standard
- **The Timeline:** A pure, deterministic `sampleAt(playbackTimeMs)` function that performs binary search across precomputed frames.
- **Interpolation Rules:** Continuous signals (`rms`, `luminosity`) must linearly interpolate. Discrete events (`onset`, `section_change`) must step-hold.
- **The Broadcast:** The player `rAF` loop emits an immutable `RESONANCE_TICK` exactly once per frame. All visual consumers subscribe to this decoupled event stream.
