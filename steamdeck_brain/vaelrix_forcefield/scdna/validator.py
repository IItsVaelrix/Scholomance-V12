"""
SCDNA — gene validator.

Every gene must pass validation before it can be committed to the registry.
"""

from __future__ import annotations

from .types import RetrievalGene


def validate_gene(gene: RetrievalGene) -> list[str]:
    """Return a list of validation errors; empty list means valid."""
    errors: list[str] = []

    if not gene.version:
        errors.append("Missing gene version.")

    if not gene.identity.stableId:
        errors.append("Missing stable ID.")

    if not gene.identity.contentHash:
        errors.append("Missing content hash.")

    if not gene.domain.primary:
        errors.append("Missing primary domain.")

    if len(gene.domain.activationBrains) == 0:
        errors.append("Gene must activate at least one brain.")

    if gene.retrieval.confidence < 0 or gene.retrieval.confidence > 1:
        errors.append("Confidence must be between 0 and 1.")

    if gene.retrieval.freshness < 0 or gene.retrieval.freshness > 1:
        errors.append("Freshness must be between 0 and 1.")

    if gene.retrieval.minConfidence < 0 or gene.retrieval.minConfidence > 1:
        errors.append("minConfidence must be between 0 and 1.")

    if gene.retrieval.originalConfidence < gene.retrieval.minConfidence:
        errors.append("originalConfidence must be >= minConfidence.")

    if not gene.instruction.imperative:
        errors.append("Gene must include an imperative instruction.")

    if not gene.english.shortMeaning:
        errors.append("Gene must include short English meaning.")

    if gene.lifecycle.degradationFactor <= 0 or gene.lifecycle.degradationFactor > 1:
        errors.append("degradationFactor must be in (0, 1].")

    if gene.lifecycle.recoveryIncrement < 0:
        errors.append("recoveryIncrement must be non-negative.")

    if gene.lifecycle.deprecationThreshold < 0 or gene.lifecycle.deprecationThreshold > 1:
        errors.append("deprecationThreshold must be between 0 and 1.")

    return errors
