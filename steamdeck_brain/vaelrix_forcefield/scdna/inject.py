"""
SCDNA — proactive gene injection.

Distills a task prompt to a compact intent query, matches it against the
gene registry via the existing detector, gates the results, and renders a
directive block for a Claude Code UserPromptSubmit hook.

The detector scores token overlap as ``overlap / len(query_tokens)``, so a
raw multi-sentence prompt dilutes every score below threshold. distill_query
shrinks the prompt to domain-salient tokens first.
"""

from __future__ import annotations

from .detector import normalize_text, tokenize

STOPWORDS: frozenset[str] = frozenset({
    "the", "and", "for", "with", "this", "that", "you", "your", "our", "can",
    "will", "please", "make", "made", "from", "into", "onto", "have", "has",
    "are", "was", "were", "any", "all", "but", "not", "use", "used", "using",
    "get", "got", "let", "now", "then", "than", "out", "off", "via", "per",
    "should", "would", "could", "about", "again", "also", "just", "like",
    "want", "need", "needs", "able", "easily", "turn", "turned",
})

DOMAIN_LEXICON: dict[str, frozenset[str]] = {
    "code": frozenset({"code", "function", "refactor", "bug", "debug", "compile",
                       "module", "import", "export", "lint", "runtime"}),
    "rhyme": frozenset({"rhyme", "lyric", "lyrics", "verse", "cadence", "chorus", "hook"}),
    "phoneme": frozenset({"phoneme", "syllable", "pronounce", "pronunciation", "sound", "ipa"}),
    "pixel": frozenset({"pixel", "pixelbrain", "sprite", "palette", "render", "color",
                        "colour", "voxel", "art", "claymore", "sword", "weapon", "shield",
                        "asset", "skeleton", "morph", "foundry", "pbrain", "pommel", "blade"}),
    "lore": frozenset({"lore", "canon", "myth", "symbolism", "mirrorborne", "story", "character"}),
    "audio": frozenset({"audio", "music", "beat", "synth", "mix", "ambience"}),
    "seo": frozenset({"seo", "title", "tags", "keywords", "description", "metadata"}),
    "memory": frozenset({"memory", "recall", "remember", "history", "prior", "gene"}),
    "testing": frozenset({"test", "tests", "regression", "assert", "coverage", "spec"}),
    "architecture": frozenset({"architecture", "design", "structure", "pattern", "schema",
                               "contract", "boundary"}),
    "risk": frozenset({"risk", "safety", "security", "dependency", "blast", "hazard"}),
}

_LEXICON_ALL: frozenset[str] = frozenset().union(*DOMAIN_LEXICON.values())


def distill_query(task: str) -> str:
    """Reduce a task prompt to de-duplicated, order-preserved salient tokens."""
    seen: set[str] = set()
    out: list[str] = []
    for token in tokenize(normalize_text(task)):
        if token in STOPWORDS or token not in _LEXICON_ALL:
            continue
        if token not in seen:
            seen.add(token)
            out.append(token)
    return " ".join(out)
