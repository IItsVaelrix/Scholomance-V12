"""
Vaelrix Cortex ForceField — stub brains for domains not yet implemented.

These brains declare themselves present in the registry but return minimal,
non-actionable output until domain-specific logic is built.
"""

from __future__ import annotations

from ..types import AmplifierBrain, AmplifierResult, ResonanceScore, VaelrixCortexForceField


PIXEL_BRAIN = AmplifierBrain(
    id="PIXEL_BRAIN",
    domain=["visual", "pixel", "art", "sprite", "palette"],
    activationSignals=["pixel", "sprite", "art", "visual", "palette", "silhouette", "thumbnail"],
)

RHYME_BRAIN = AmplifierBrain(
    id="RHYME_BRAIN",
    domain=["lyrics", "rhyme", "cadence", "verse"],
    activationSignals=["lyric", "verse", "rhyme", "cadence", "poem", "song"],
)

PHONEME_BRAIN = AmplifierBrain(
    id="PHONEME_BRAIN",
    domain=["phoneme", "pronunciation", "syllable", "sound"],
    activationSignals=["phoneme", "pronunciation", "syllable", "sound", "vowel", "consonant"],
)

LORE_BRAIN = AmplifierBrain(
    id="LORE_BRAIN",
    domain=["lore", "canon", "mirrorborne", "symbolism", "myth"],
    activationSignals=["lore", "canon", "mirrorborne", "symbol", "myth", "vaelrix"],
)

SEO_BRAIN = AmplifierBrain(
    id="SEO_BRAIN",
    domain=["seo", "title", "tags", "description", "keywords"],
    activationSignals=["seo", "title", "tag", "description", "keyword", "curve", "golden"],
)

AUDIO_BRAIN = AmplifierBrain(
    id="AUDIO_BRAIN",
    domain=["audio", "music", "sound", "beat"],
    activationSignals=["audio", "music", "sound", "beat", "song", "track"],
)

UI_BRAIN = AmplifierBrain(
    id="UI_BRAIN",
    domain=["ui", "interface", "widget", "screen", "layout"],
    activationSignals=["ui", "interface", "widget", "screen", "layout", "component", "theme"],
)

DETERMINISM_BRAIN = AmplifierBrain(
    id="DETERMINISM_BRAIN",
    domain=["determinism", "stability", "reproducibility"],
    activationSignals=["deterministic", "stable", "reproducible", "stasis", "regression test"],
)

ARCHITECTURE_BRAIN = AmplifierBrain(
    id="ARCHITECTURE_BRAIN",
    domain=["architecture", "design", "structure", "pattern"],
    activationSignals=["architecture", "design", "structure", "pattern", "system", "organize"],
)


def run_stub_brain(
    field: VaelrixCortexForceField,
    query: str | None = None,
) -> AmplifierResult:
    """Generic stub runner: returns a placeholder finding."""
    return AmplifierResult(
        brainId="STUB_BRAIN",
        summary="Domain-specific brain not yet implemented.",
        findings=["This brain is registered but returns stub output in the current MVP."],
        resonance=ResonanceScore(
            intentMatch=0.2,
            evidenceStrength=0.1,
            novelty=0.1,
            actionability=0.1,
        ),
    )
