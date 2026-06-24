"""
SCDNA — Council Arbiter integration.

Convert decoded SCDNA genes into AmplifierResult objects so the Council
Arbiter can merge gene-derived findings with brain-derived findings.
"""

from __future__ import annotations

from ..types import AmplifierResult, EvidenceRef, ResonanceScore
from .decoder import DecodedGene


_SCDNA_BRAIN_ID = "SCDNA_BRAIN"


def scdna_matches_to_amplifier_results(decoded_genes: list[DecodedGene]) -> list[AmplifierResult]:
    """
    Produce one AmplifierResult per decoded gene.

    The result carries the gene's imperative and operator instruction as
    findings, plus a high-confidence resonance score so the arbiter treats
    canonical genes as strong evidence.
    """
    results: list[AmplifierResult] = []
    for gene in decoded_genes:
        findings = [gene.englishInstruction]
        evidence = [
            EvidenceRef(
                source=f"SCDNA:{gene.sourceKind}:{gene.domain}",
                snippet=gene.englishInstruction,
                relevance=gene.confidence,
            )
        ]
        results.append(
            AmplifierResult(
                brainId=_SCDNA_BRAIN_ID,
                findings=findings,
                evidence=evidence,
                recommendedAction=f"Follow SCDNA gene instruction: {gene.action}",
                resonance=ResonanceScore(
                    intentMatch=gene.confidence,
                    evidenceStrength=gene.confidence,
                    novelty=0.0,
                    conflictRisk=0.0,
                    actionability=0.9,
                ),
            )
        )
    return results
