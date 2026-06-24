"""
Vaelrix Cortex ForceField — Amplifier Brain implementations.

Each brain is a callable that accepts a VaelrixCortexForceField and an optional
query override, and returns an AmplifierResult.
"""

from .architecture_brain import ARCHITECTURE_BRAIN, run_architecture_brain
from .audio_brain import AUDIO_BRAIN, run_audio_brain
from .code_brain import CODE_BRAIN, run_code_brain
from .critique_brain import CRITIQUE_BRAIN, run_critique_brain
from .determinism_brain import DETERMINISM_BRAIN, run_determinism_brain
from .lore_brain import LORE_BRAIN, run_lore_brain
from .memory_brain import MEMORY_BRAIN, run_memory_brain
from .phoneme_brain import PHONEME_BRAIN, run_phoneme_brain
from .pixel_brain import PIXEL_BRAIN, run_pixel_brain
from .rhyme_brain import RHYME_BRAIN, run_rhyme_brain
from .risk_brain import RISK_BRAIN, run_risk_brain
from .seo_brain import SEO_BRAIN, run_seo_brain
from .test_brain import TEST_BRAIN, run_test_brain
from .ui_brain import UI_BRAIN, run_ui_brain

BRAIN_RUNNERS = {
    "CODE_BRAIN": run_code_brain,
    "TEST_BRAIN": run_test_brain,
    "MEMORY_BRAIN": run_memory_brain,
    "RISK_BRAIN": run_risk_brain,
    "CRITIQUE_BRAIN": run_critique_brain,
    "PIXEL_BRAIN": run_pixel_brain,
    "RHYME_BRAIN": run_rhyme_brain,
    "PHONEME_BRAIN": run_phoneme_brain,
    "LORE_BRAIN": run_lore_brain,
    "SEO_BRAIN": run_seo_brain,
    "AUDIO_BRAIN": run_audio_brain,
    "UI_BRAIN": run_ui_brain,
    "DETERMINISM_BRAIN": run_determinism_brain,
    "ARCHITECTURE_BRAIN": run_architecture_brain,
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
    "run_pixel_brain",
    "run_rhyme_brain",
    "run_phoneme_brain",
    "run_lore_brain",
    "run_seo_brain",
    "run_audio_brain",
    "run_ui_brain",
    "run_determinism_brain",
    "run_architecture_brain",
]
