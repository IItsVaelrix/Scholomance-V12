"""
SCDNA — ForceField injection.

Apply decoded genes to a VaelrixCortexForceField, updating routing and context.
"""

from __future__ import annotations

from copy import deepcopy
from typing import Any

from ..types import VaelrixCortexForceField
from .decoder import DecodedGene, encode_gene_from_record
from .detector import detect_gene_matches
from .registry import DEFAULT_GENE_REGISTRY, GeneRegistry


def apply_decoded_gene_to_force_field(
    field: VaelrixCortexForceField,
    gene: DecodedGene,
) -> VaelrixCortexForceField:
    """
    Merge a decoded gene into the ForceField.

    Adds activated brains and records the English instruction as a confirmed fact.
    """
    new_field = deepcopy(field)

    active = list(new_field.routing.activeBrains)
    reasons = dict(new_field.routing.activationReasons)

    for brain in gene.activationBrains:
        if brain not in active:
            active.append(brain)
        reasons[brain] = f"Activated by SCDNA gene in {gene.domain} domain"

    new_field.routing.activeBrains = active
    new_field.routing.activationReasons = reasons
    new_field.context.confirmedFacts = [
        *new_field.context.confirmedFacts,
        gene.englishInstruction,
    ]

    return new_field


def apply_scdna_to_force_field(
    field: VaelrixCortexForceField,
    registry: GeneRegistry | None = None,
    contradiction_index: int = 0,
    min_freshness: float = 0.5,
    max_genes_per_request: int = 5,
) -> tuple[
    VaelrixCortexForceField,
    list[DecodedGene],
    list[Any],
    list[str],
    GeneRegistry,
]:
    """
    Detect matching SCDNA genes, resolve contradictions, and apply them.

    Args:
        min_freshness: Genes with freshness below this threshold require
            validation and are not applied automatically.
        max_genes_per_request: Cap on how many genes can activate per request.

    Returns:
        (updated_field, decoded_genes_applied, contradictions,
         health_signals, updated_registry)
    """
    from .contradictions import resolve_scdna_contradictions
    from .decoder import decode_retrieval_gene

    if registry is None:
        registry = DEFAULT_GENE_REGISTRY

    query = " ".join(
        [
            field.task.rawUserRequest,
            field.task.normalizedGoal,
            field.task.classification,
        ]
    )
    matches = detect_gene_matches(query, registry)

    resolved, contradictions, health_signals, registry = resolve_scdna_contradictions(
        field,
        matches,
        contradiction_index=contradiction_index,
        registry=registry,
    )

    # Freshness gate: stale genes require validation before action.
    fresh_enough = [g for g in resolved if g.retrieval.freshness >= min_freshness]

    # Gene match cap per request (PDR §25 ForceField QA).
    capped = fresh_enough[:max_genes_per_request]

    decoded: list[DecodedGene] = []
    new_field = field
    for gene in capped:
        if gene.retrieval.confidence < gene.retrieval.minConfidence:
            continue
        compact = encode_gene_from_record(gene)
        decoded_gene = decode_retrieval_gene(compact)
        new_field = apply_decoded_gene_to_force_field(new_field, decoded_gene)
        new_field.memory.workingMemory.append(
            f"SCDNA gene matched: {gene.identity.stableId}"
        )
        new_field.memory.turboQuantRefs.append(
            f"scdna:{gene.identity.stableId}:{gene.identity.contentHash}"
        )
        decoded.append(decoded_gene)

    return new_field, decoded, contradictions, health_signals, registry
