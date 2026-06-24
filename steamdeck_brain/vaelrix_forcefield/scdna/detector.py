"""
SCDNA — gene match detector.

Checks whether a user query should activate one or more retrieval genes.
"""

from __future__ import annotations

from .registry import DEFAULT_GENE_REGISTRY, GeneRegistry
from .types import RetrievalGene


DEFAULT_SCORE_THRESHOLD = 0.5
_BASE_SCORE_MINIMUM = 0.5


def detect_gene_matches(
    query: str,
    registry: GeneRegistry | None = None,
    score_threshold: float = DEFAULT_SCORE_THRESHOLD,
) -> list[RetrievalGene]:
    """
    Return active genes that match the query, sorted by relevance.

    Exact stableId match wins over semantic token overlap.
    Deprecated genes are skipped.
    """
    if registry is None:
        registry = DEFAULT_GENE_REGISTRY

    normalized_query = normalize_text(query)
    query_tokens = set(tokenize(normalized_query))

    scored: list[tuple[float, RetrievalGene]] = []
    for gene in registry.values():
        if gene.lifecycle.status == "deprecated":
            continue

        exact_match = gene.identity.stableId.lower() in normalized_query

        searchable = normalize_text(
            " ".join(
                [
                    gene.identity.stableId,
                    gene.domain.primary,
                    *gene.domain.secondary,
                    gene.english.shortMeaning,
                    gene.english.expandedMeaning,
                    gene.instruction.imperative,
                    *gene.instruction.forbiddenDrift,
                    *gene.instruction.requiredChecks,
                ]
            )
        )
        gene_tokens = set(tokenize(searchable))
        overlap = len(query_tokens & gene_tokens)
        score = overlap / max(1, len(query_tokens))

        if exact_match:
            score = 1.0

        priority_boost = gene.retrieval.priority * 0.15
        confidence_boost = gene.retrieval.confidence * 0.15
        final_score = score + priority_boost + confidence_boost

        if score >= _BASE_SCORE_MINIMUM and final_score >= score_threshold:
            scored.append((final_score, gene))

    scored.sort(key=lambda item: item[0], reverse=True)
    return [gene for _, gene in scored]


def tokenize(value: str) -> list[str]:
    """Tokenize text into lowercase words of at least 3 characters."""
    return [token for token in normalize_text(value).split(" ") if len(token) >= 3]


def normalize_text(value: str) -> str:
    """Normalize text for matching."""
    return value.strip().lower().replace("_", " ").replace("-", " ").replace("/", " ")
