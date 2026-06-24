"""
Vaelrix Cortex ForceField — TurboQuant brain lenses.

A lens decides which stored chunks are relevant to a given brain. The
default lens uses the brain's query. Specialized lenses add brain-specific
filters or boosters so CODE_BRAIN sees code-heavy chunks, RISK_BRAIN sees
chunks about regressions, etc.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable


@dataclass
class BrainLens:
    """A lens that selects and ranks chunks for a specific brain."""

    brain_id: str
    query_transform: Callable[[str], str] | None = None
    metadata_filter: dict[str, Any] | None = None
    top_k: int | None = None

    def transform_query(self, query: str) -> str:
        if self.query_transform is None:
            return query
        return self.query_transform(query)


def _code_lens_query(query: str) -> str:
    """Boost code-related keywords without requiring the user to repeat them."""
    return f"{query} code function class import test refactor bug error"


def _test_lens_query(query: str) -> str:
    return f"{query} test coverage regression validate verify"


def _risk_lens_query(query: str) -> str:
    return f"{query} risk regression dependency blast radius dangerous unsafe"


def _memory_lens_query(query: str) -> str:
    return f"{query} prior history pattern known before memory"


def _critique_lens_query(query: str) -> str:
    return f"{query} weakness improvement review critique missing structure"


def _lore_lens_query(query: str) -> str:
    return f"{query} lore canon mirrorborne symbolism myth vaelrix"


def _rhyme_lens_query(query: str) -> str:
    return f"{query} rhyme phoneme cadence verse poem lyric syllable sound"


def _pixel_lens_query(query: str) -> str:
    return f"{query} pixel sprite art visual palette silhouette thumbnail"


def _seo_lens_query(query: str) -> str:
    return f"{query} seo title tag description keyword curve golden"


def _ui_lens_query(query: str) -> str:
    return f"{query} ui interface widget screen layout component theme"


def _architecture_lens_query(query: str) -> str:
    return f"{query} architecture design structure pattern system organize"


DEFAULT_LENS = BrainLens(brain_id="DEFAULT")

BRAIN_LENS_OVERRIDES: dict[str, BrainLens] = {
    "CODE_BRAIN": BrainLens(brain_id="CODE_BRAIN", query_transform=_code_lens_query, top_k=5),
    "TEST_BRAIN": BrainLens(brain_id="TEST_BRAIN", query_transform=_test_lens_query, top_k=4),
    "RISK_BRAIN": BrainLens(brain_id="RISK_BRAIN", query_transform=_risk_lens_query, top_k=4),
    "MEMORY_BRAIN": BrainLens(brain_id="MEMORY_BRAIN", query_transform=_memory_lens_query, top_k=3),
    "CRITIQUE_BRAIN": BrainLens(brain_id="CRITIQUE_BRAIN", query_transform=_critique_lens_query, top_k=3),
    "LORE_BRAIN": BrainLens(brain_id="LORE_BRAIN", query_transform=_lore_lens_query, top_k=5),
    "RHYME_BRAIN": BrainLens(brain_id="RHYME_BRAIN", query_transform=_rhyme_lens_query, top_k=5),
    "PHONEME_BRAIN": BrainLens(brain_id="PHONEME_BRAIN", query_transform=_rhyme_lens_query, top_k=5),
    "PIXEL_BRAIN": BrainLens(brain_id="PIXEL_BRAIN", query_transform=_pixel_lens_query, top_k=3),
    "SEO_BRAIN": BrainLens(brain_id="SEO_BRAIN", query_transform=_seo_lens_query, top_k=3),
    "UI_BRAIN": BrainLens(brain_id="UI_BRAIN", query_transform=_ui_lens_query, top_k=4),
    "ARCHITECTURE_BRAIN": BrainLens(
        brain_id="ARCHITECTURE_BRAIN", query_transform=_architecture_lens_query, top_k=5
    ),
}


def get_lens(brain_id: str) -> BrainLens:
    return BRAIN_LENS_OVERRIDES.get(brain_id, DEFAULT_LENS)
