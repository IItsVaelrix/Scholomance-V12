"""
SCDNA — canonical gene registry.

Initial registry is intentionally small (three genes) to prove the system
without turning the registry into a memory swamp.
"""

from __future__ import annotations

import json
from pathlib import Path

from .types import (
    GeneDomain,
    GeneEnglish,
    GeneIdentity,
    GeneInstruction,
    GeneLifecycle,
    GeneRetrieval,
    GeneRisk,
    RetrievalGene,
)

_REGISTRY_JSON_PATH = Path(__file__).with_suffix(".json")


def _color_dragon_fallback_gene() -> RetrievalGene:
    return RetrievalGene(
        version="SCDNA-v1",
        identity=GeneIdentity(
            stableId="BUGPATTERN_COLOR_DRAGON_FRONTEND_FALLBACK",
            contentHash="scdna-cdragon-ui-phoneme-v1",
            sourceKind="bug",
        ),
        domain=GeneDomain(
            primary="code",
            secondary=["phoneme", "ui", "rhyme-coloring", "determinism"],
            activationBrains=[
                "CODE_BRAIN",
                "PHONEME_BRAIN",
                "UI_BRAIN",
                "RISK_BRAIN",
                "TEST_BRAIN",
            ],
        ),
        retrieval=GeneRetrieval(
            lookupMode="hybrid",
            priority=0.95,
            confidence=0.98,
            originalConfidence=0.98,
            freshness=0.9,
            canonical=True,
            minConfidence=0.45,
        ),
        lifecycle=GeneLifecycle(
            status="active",
            contradictionCount=0,
            lastContradictionAtIndex=None,
            degradationFactor=0.85,
            recoveryIncrement=0.02,
            deprecationThreshold=0.45,
        ),
        instruction=GeneInstruction(
            action="warn",
            imperative=(
                "Do not let frontend fallback logic recompute vowel-family truth "
                "when backend resonance data already exists."
            ),
            forbiddenDrift=[
                "Do not patch only the visual color palette",
                "Do not bypass backend resonance gates",
                "Do not trust frontend-only phoneme analysis over backend truth",
            ],
            requiredChecks=[
                "Verify backend resonance indices are passed to frontend",
                "Verify frontend renders confirmed indices only",
                "Run rhyme coloring regression tests",
            ],
        ),
        risk=GeneRisk(
            riskClass="high",
            blastRadius="cross_system",
            staleRisk=0.1,
            misuseRisk=0.75,
        ),
        english=GeneEnglish(
            shortMeaning=(
                "Frontend rhyme coloring bug caused by weaker local vowel-family fallback."
            ),
            expandedMeaning=(
                "This pattern indicates a desync between backend phoneme authority and "
                "frontend rendering logic. The backend should remain the source of truth "
                "for vowel-family and resonance decisions. The frontend may render "
                "confirmed indices but should not independently recalculate linguistic truth."
            ),
            operatorInstruction=(
                "When this gene activates, inspect backend-to-frontend resonance data flow "
                "before changing UI color logic."
            ),
        ),
    )


def _backend_truth_authority_gene() -> RetrievalGene:
    return RetrievalGene(
        version="SCDNA-v1",
        identity=GeneIdentity(
            stableId="ARCH_RULE_BACKEND_TRUTH_AUTHORITY",
            contentHash="scdna-arch-backend-truth-v1",
            sourceKind="architecture",
        ),
        domain=GeneDomain(
            primary="architecture",
            secondary=["determinism", "authority", "frontend", "backend"],
            activationBrains=[
                "ARCHITECTURE_BRAIN",
                "DETERMINISM_BRAIN",
                "RISK_BRAIN",
            ],
        ),
        retrieval=GeneRetrieval(
            lookupMode="exact",
            priority=0.9,
            confidence=0.97,
            originalConfidence=0.97,
            freshness=0.95,
            canonical=True,
            minConfidence=0.45,
        ),
        lifecycle=GeneLifecycle(
            status="active",
            contradictionCount=0,
            lastContradictionAtIndex=None,
            degradationFactor=0.85,
            recoveryIncrement=0.02,
            deprecationThreshold=0.45,
        ),
        instruction=GeneInstruction(
            action="route",
            imperative=(
                "Backend computation and canonical data are the source of truth. "
                "Frontend display must reflect backend state, never recompute it."
            ),
            forbiddenDrift=[
                "Do not implement duplicate logic in frontend",
                "Do not treat frontend cache as authoritative",
                "Do not bypass backend validation gates",
            ],
            requiredChecks=[
                "Confirm backend endpoint returns computed value",
                "Confirm frontend consumes value without transformation",
                "Verify no shadow computation exists in UI layer",
            ],
        ),
        risk=GeneRisk(
            riskClass="medium",
            blastRadius="cross_system",
            staleRisk=0.05,
            misuseRisk=0.6,
        ),
        english=GeneEnglish(
            shortMeaning=(
                "Backend truth authority: the server owns canonical state and computation."
            ),
            expandedMeaning=(
                "This architectural rule prevents frontend drift by declaring that "
                "authoritative logic lives in backend services. The UI layer renders "
                "and reacts; it does not independently calculate combat, scoring, "
                "or phoneme truth."
            ),
            operatorInstruction=(
                "When this gene activates, route authority questions to backend code and "
                "tests, not frontend components."
            ),
        ),
    )


def _search_before_assume_gene() -> RetrievalGene:
    return RetrievalGene(
        version="SCDNA-v1",
        identity=GeneIdentity(
            stableId="TOOL_RULE_SEARCH_BEFORE_ASSUME",
            contentHash="scdna-tool-search-before-assume-v1",
            sourceKind="tool",
        ),
        domain=GeneDomain(
            primary="memory",
            secondary=["search", "retrieval", "governance", "evidence"],
            activationBrains=[
                "MEMORY_BRAIN",
                "RISK_BRAIN",
                "DETERMINISM_BRAIN",
            ],
        ),
        retrieval=GeneRetrieval(
            lookupMode="symbolic",
            priority=0.85,
            confidence=0.96,
            originalConfidence=0.96,
            freshness=0.9,
            canonical=True,
            minConfidence=0.45,
        ),
        lifecycle=GeneLifecycle(
            status="active",
            contradictionCount=0,
            lastContradictionAtIndex=None,
            degradationFactor=0.85,
            recoveryIncrement=0.02,
            deprecationThreshold=0.45,
        ),
        instruction=GeneInstruction(
            action="warn",
            imperative=(
                "Do not assume memory state. Search the codebase or memory substrate "
                "before declaring a fact about implementation."
            ),
            forbiddenDrift=[
                "Do not answer from model memory alone when code truth is available",
                "Do not skip search because the answer feels obvious",
                "Do not cite unverified assumptions as facts",
            ],
            requiredChecks=[
                "Run a targeted search for the symbol or pattern",
                "Cross-check with at least one source file or memory record",
                "Record the evidence reference in the context ledger",
            ],
        ),
        risk=GeneRisk(
            riskClass="medium",
            blastRadius="module",
            staleRisk=0.2,
            misuseRisk=0.5,
        ),
        english=GeneEnglish(
            shortMeaning=(
                "Search before assume: verify claims against substrate before acting."
            ),
            expandedMeaning=(
                "This rule guards against hallucinated implementation details by "
                "requiring evidence retrieval before confident statements about code, "
                "memory, or system behavior."
            ),
            operatorInstruction=(
                "When this gene activates, require a search step and record evidence "
                "before accepting the task's premises."
            ),
        ),
    )


GeneRegistry = dict[str, RetrievalGene]

DEFAULT_GENE_REGISTRY: GeneRegistry = {
    gene.identity.stableId: gene
    for gene in (
        _color_dragon_fallback_gene(),
        _backend_truth_authority_gene(),
        _search_before_assume_gene(),
    )
}


def _load_json_registry(path: Path = _REGISTRY_JSON_PATH) -> GeneRegistry:
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    return {
        stable_id: RetrievalGene.from_dict(record)
        for stable_id, record in data.get("genes", {}).items()
    }


# Merge canonical built-in genes with any committed JSON registry entries.
DEFAULT_GENE_REGISTRY.update(_load_json_registry())


def get_gene_by_id(stable_id: str, registry: GeneRegistry | None = None) -> RetrievalGene | None:
    """Return a gene by stableId from the given registry (defaults to canonical)."""
    if registry is None:
        registry = DEFAULT_GENE_REGISTRY
    return registry.get(stable_id)
