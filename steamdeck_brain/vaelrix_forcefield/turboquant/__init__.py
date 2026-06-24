"""
Vaelrix Cortex ForceField — TurboQuant chunk dispatch.

Lightweight Python binding around the existing Substrate engine.
Provides per-brain lenses so each Amplifier receives only the compressed
knowledge chunks relevant to its domain.
"""

from .dispatch import dispatch_chunks_to_brains
from .lenses import BRAIN_LENS_OVERRIDES, DEFAULT_LENS, BrainLens
from .substrate_client import TurboQuantClient

__all__ = [
    "BrainLens",
    "DEFAULT_LENS",
    "BRAIN_LENS_OVERRIDES",
    "TurboQuantClient",
    "dispatch_chunks_to_brains",
]
