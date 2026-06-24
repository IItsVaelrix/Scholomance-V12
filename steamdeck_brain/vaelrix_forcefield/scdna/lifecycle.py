"""
SCDNA — gene lifecycle and degradation.

Genes degrade on contradiction, recover slowly with correct use, and become
deprecated when confidence falls below the threshold.
"""

from __future__ import annotations

from copy import deepcopy

from .health import emit_health_signal
from .types import RetrievalGene


def degrade_gene(
    gene: RetrievalGene,
    contradiction_index: int,
    reason: str | None = None,
) -> RetrievalGene:
    """
    Apply one contradiction to a gene, degrading its confidence from
    originalConfidence deterministically.
    """
    new_gene = deepcopy(gene)
    lifecycle = new_gene.lifecycle

    retrieval = new_gene.retrieval
    lifecycle.contradictionCount += 1
    lifecycle.lastContradictionAtIndex = contradiction_index

    degraded = retrieval.originalConfidence * (
        lifecycle.degradationFactor ** lifecycle.contradictionCount
    )
    retrieval.confidence = max(retrieval.minConfidence, degraded)

    if retrieval.confidence <= lifecycle.deprecationThreshold:
        lifecycle.status = "deprecated"
        emit_health_signal(
            severity="red",
            component="GENE_DEPRECATED",
            stable_id=gene.identity.stableId,
            tier="R1",
            confidence=retrieval.confidence,
            count=lifecycle.contradictionCount,
            reason=reason or "Confidence fell below deprecation threshold",
        )
    else:
        lifecycle.status = "degraded"
        tier = _yellow_tier(new_gene)
        emit_health_signal(
            severity="yellow",
            component="GENE_DEGRADED",
            stable_id=gene.identity.stableId,
            tier=tier,
            confidence=retrieval.confidence,
            count=lifecycle.contradictionCount,
            reason=reason or "Contradiction detected",
        )

    return new_gene


def recover_gene(gene: RetrievalGene) -> RetrievalGene:
    """
    Apply one activation without contradiction, allowing slow recovery.
    """
    new_gene = deepcopy(gene)
    lifecycle = new_gene.lifecycle
    retrieval = new_gene.retrieval

    lifecycle.contradictionCount = max(0, lifecycle.contradictionCount - 0.5)
    retrieval.confidence = min(
        retrieval.originalConfidence,
        retrieval.confidence + lifecycle.recoveryIncrement,
    )

    if retrieval.confidence > lifecycle.deprecationThreshold:
        lifecycle.status = "active"

    return new_gene


def is_deprecated(gene: RetrievalGene) -> bool:
    """Return True if the gene is deprecated or quarantined."""
    return gene.lifecycle.status in ("deprecated", "quarantined")


def _yellow_tier(gene: RetrievalGene) -> str:
    """Pick a yellow tier based on current lifecycle state."""
    lifecycle = gene.lifecycle
    retrieval = gene.retrieval
    if retrieval.confidence <= lifecycle.deprecationThreshold + 0.05:
        return "Y3"
    if lifecycle.contradictionCount >= 2:
        return "Y2"
    if lifecycle.contradictionCount == 1:
        return "Y1"
    return "Y4"
