"""
SCDNA — runtime contradiction detection and degradation.

Implements PDR §28.2: genes degrade when they contradict evidence, other genes,
or the task at hand.
"""

from __future__ import annotations

from typing import Any

from ..types import VaelrixCortexForceField
from .health import emit_health_signal
from .lifecycle import degrade_gene
from .registry import GeneRegistry
from .types import RetrievalGene


# Task classification -> compatible gene primary domains.
_CLASSIFICATION_DOMAIN_MAP: dict[str, set[str]] = {
    "cosmetic": {"ui", "pixel", "code"},
    "structural": {"architecture", "code", "risk"},
    "behavioral": {"code", "risk", "testing", "memory"},
    "architectural": {"architecture", "risk", "code"},
    "diagnostic": {"code", "risk", "testing", "memory", "architecture"},
    "creative": {"rhyme", "phoneme", "lore", "audio", "pixel"},
    "research": {"memory", "lore", "architecture", "seo"},
    "planning": {"architecture", "risk", "memory"},
}

# Action pairs that inherently conflict when they share a domain.
_CONFLICTING_ACTION_PAIRS: set[frozenset[str]] = {
    frozenset({"block", "route"}),
    frozenset({"block", "recall"}),
    frozenset({"warn", "block"}),
    frozenset({"patch", "audit"}),
}


class GeneContradiction:
    """Record of a contradiction event involving a gene."""

    def __init__(self, gene: RetrievalGene, reason: str, opposing: str | None = None):
        self.gene = gene
        self.reason = reason
        self.opposing = opposing


def _actions_conflict(a: str, b: str) -> bool:
    """Return True if two gene actions are considered conflicting."""
    return frozenset({a, b}) in _CONFLICTING_ACTION_PAIRS


def _domain_overlap(gene_a: RetrievalGene, gene_b: RetrievalGene) -> bool:
    """Return True if two genes share a primary or secondary domain."""
    domains_a = {gene_a.domain.primary, *gene_a.domain.secondary}
    domains_b = {gene_b.domain.primary, *gene_b.domain.secondary}
    return bool(domains_a & domains_b)


def detect_contradictions(
    field: VaelrixCortexForceField,
    matches: list[RetrievalGene],
) -> list[GeneContradiction]:
    """
    Detect contradiction events for matched genes against the ForceField state.

    Returns a list of GeneContradiction records; each record names the gene
    that should be degraded.
    """
    contradictions: list[GeneContradiction] = []

    # Rule 1: two matched genes have conflicting imperatives for the same query.
    for i, gene_a in enumerate(matches):
        for gene_b in matches[i + 1 :]:
            if _actions_conflict(gene_a.instruction.action, gene_b.instruction.action) and _domain_overlap(
                gene_a, gene_b
            ):
                contradictions.append(
                    GeneContradiction(
                        gene=gene_a,
                        reason=(
                            f"Action {gene_a.instruction.action} conflicts with "
                            f"{gene_b.instruction.action} from {gene_b.identity.stableId}"
                        ),
                        opposing=gene_b.identity.stableId,
                    )
                )
                contradictions.append(
                    GeneContradiction(
                        gene=gene_b,
                        reason=(
                            f"Action {gene_b.instruction.action} conflicts with "
                            f"{gene_a.instruction.action} from {gene_a.identity.stableId}"
                        ),
                        opposing=gene_a.identity.stableId,
                    )
                )

    # Rule 2: gene action conflicts with task classification.
    classification = field.task.classification
    expected_domains = _CLASSIFICATION_DOMAIN_MAP.get(classification, set())
    for gene in matches:
        if gene.domain.primary not in expected_domains:
            contradictions.append(
                GeneContradiction(
                    gene=gene,
                    reason=(
                        f"Primary domain {gene.domain.primary} is incompatible with "
                        f"task classification {classification}"
                    ),
                )
            )

    # Rule 3: gene activates a brain that the ForceField has suppressed.
    suppressed = set(field.routing.suppressedBrains.keys())
    for gene in matches:
        for brain_id in gene.domain.activationBrains:
            if brain_id in suppressed:
                contradictions.append(
                    GeneContradiction(
                        gene=gene,
                        reason=(
                            f"Activates suppressed brain {brain_id}"
                        ),
                    )
                )

    return contradictions


def resolve_scdna_contradictions(
    field: VaelrixCortexForceField,
    matches: list[RetrievalGene],
    contradiction_index: int,
    registry: GeneRegistry | None = None,
) -> tuple[list[RetrievalGene], list[GeneContradiction], list[str], GeneRegistry]:
    """
    Resolve contradictions by degrading the offending genes in the registry.

    The registry is mutated in place. Returns:
        (resolved_matches, contradictions, health_signals, updated_registry)
    """
    from .registry import DEFAULT_GENE_REGISTRY

    if registry is None:
        registry = DEFAULT_GENE_REGISTRY

    contradictions = detect_contradictions(field, matches)
    contradicted_ids = {c.gene.identity.stableId for c in contradictions}

    health_signals: list[str] = []
    for contradiction in contradictions:
        stable_id = contradiction.gene.identity.stableId
        if stable_id not in registry:
            continue

        degraded = degrade_gene(
            registry[stable_id],
            contradiction_index=contradiction_index,
            reason=contradiction.reason,
        )
        registry[stable_id] = degraded

        if degraded.lifecycle.status == "deprecated":
            health_signals.append(
                emit_health_signal(
                    severity="red",
                    component="GENE_CONTRADICTION",
                    stable_id=stable_id,
                    tier="R2",
                    conflict_with=contradiction.opposing or "task_state",
                    reason=contradiction.reason,
                )
            )
        else:
            health_signals.append(
                emit_health_signal(
                    severity="yellow",
                    component="GENE_CONTRADICTION",
                    stable_id=stable_id,
                    tier="Y2",
                    conflict_with=contradiction.opposing or "task_state",
                    reason=contradiction.reason,
                )
            )

    resolved = [
        registry[m.identity.stableId]
        for m in matches
        if m.identity.stableId not in contradicted_ids
        and registry[m.identity.stableId].lifecycle.status != "deprecated"
    ]

    return resolved, contradictions, health_signals, registry
