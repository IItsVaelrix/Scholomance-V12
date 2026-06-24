"""
Vaelrix Cortex ForceField — Amplifier Brain implementations.

Each brain is a callable that accepts a VaelrixCortexForceField and an optional
query override, and returns an AmplifierResult.
"""

from .code_brain import CODE_BRAIN, run_code_brain
from .critique_brain import CRITIQUE_BRAIN, run_critique_brain
from .memory_brain import MEMORY_BRAIN, run_memory_brain
from .risk_brain import RISK_BRAIN, run_risk_brain
from .stub_brains import (
    ARCHITECTURE_BRAIN,
    AUDIO_BRAIN,
    DETERMINISM_BRAIN,
    LORE_BRAIN,
    PHONEME_BRAIN,
    PIXEL_BRAIN,
    RHYME_BRAIN,
    SEO_BRAIN,
    UI_BRAIN,
    run_stub_brain,
)
from .test_brain import TEST_BRAIN, run_test_brain

BRAIN_RUNNERS = {
    "CODE_BRAIN": run_code_brain,
    "TEST_BRAIN": run_test_brain,
    "MEMORY_BRAIN": run_memory_brain,
    "RISK_BRAIN": run_risk_brain,
    "CRITIQUE_BRAIN": run_critique_brain,
    "PIXEL_BRAIN": run_stub_brain,
    "RHYME_BRAIN": run_stub_brain,
    "PHONEME_BRAIN": run_stub_brain,
    "LORE_BRAIN": run_stub_brain,
    "SEO_BRAIN": run_stub_brain,
    "AUDIO_BRAIN": run_stub_brain,
    "UI_BRAIN": run_stub_brain,
    "DETERMINISM_BRAIN": run_stub_brain,
    "ARCHITECTURE_BRAIN": run_stub_brain,
}

__all__ = [
    "BRAIN_RUNNERS",
    "CODE_BRAIN",
    "TEST_BRAIN",
    "MEMORY_BRAIN",
    "RISK_BRAIN",
    "CRITIQUE_BRAIN",
    "PIXEL_BRAIN",
    "RHYME_BRAIN",
    "PHONEME_BRAIN",
    "LORE_BRAIN",
    "SEO_BRAIN",
    "AUDIO_BRAIN",
    "UI_BRAIN",
    "DETERMINISM_BRAIN",
    "ARCHITECTURE_BRAIN",
    "run_code_brain",
    "run_test_brain",
    "run_memory_brain",
    "run_risk_brain",
    "run_critique_brain",
    "run_stub_brain",
]
