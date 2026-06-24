"""
Vaelrix Cortex ForceField — Search Governor.

Blocks wasteful or redundant searches while allowing genuine unknowns.
"""

from __future__ import annotations

from copy import deepcopy
from typing import Any

from .types import (
    SearchBlock,
    SearchDecision,
    SearchRecord,
    VaelrixCortexForceField,
)

# Minimum confidence at which a matched gene can bypass broad search.
_SCDNA_SEARCH_BYPASS_CONFIDENCE = 0.75


def _emit_search_tiered_signal(
    reason_category: str,
    tier: str,
    query: str,
    detail: str,
) -> str:
    """Emit a tiered SCDNA-style signal for a search governor decision."""
    from .scdna import emit_health_signal

    return emit_health_signal(
        severity="yellow" if tier.startswith("Y") else "red",
        component="SEARCH_GOVERNOR",
        stable_id=reason_category,
        tier=tier,
        query=query[:120],
        detail=detail[:200],
    )


def normalize_query(query: str) -> str:
    return " ".join(query.strip().lower().split())


def _find_known_target(field: VaelrixCortexForceField, normalized_query: str) -> str | None:
    for label, path in field.context.confirmedFiles.items():
        if label.lower() in normalized_query:
            return path
    for symbol, path in field.context.confirmedSymbols.items():
        if symbol.lower() in normalized_query:
            return path
    return None


def should_allow_search(
    field: VaelrixCortexForceField,
    query: str,
    reason: str,
    phase: str = "default",
    gene_registry: Any | None = None,
) -> SearchDecision:
    """
    Decide whether a proposed search is allowed.

    Returns a SearchDecision with allowed=False and an explanation when the
    search is redundant, unreasoned, over-budget, or answerable from known
    targets or a high-confidence SCDNA gene.
    """
    from .scdna import DEFAULT_GENE_REGISTRY, detect_gene_matches

    normalized = normalize_query(query)

    if field.search.requireSearchReason and not reason.strip():
        return SearchDecision(
            allowed=False,
            reason="Search blocked because no reason was provided",
            tieredSignals=[
                _emit_search_tiered_signal(
                    "MISSING_REASON", "R2", query, "Search requested without reason"
                )
            ],
        )

    repeated = any(
        normalize_query(record.query) == normalized
        for record in field.search.searchHistory
    )
    if repeated:
        return SearchDecision(
            allowed=False,
            reason="Search blocked because this query was already searched",
            suggestedAlternative="Use the prior result or read a confirmed target",
            tieredSignals=[
                _emit_search_tiered_signal(
                    "REPEATED_SEARCH", "Y2", query, "Query already searched this phase"
                )
            ],
        )

    if field.search.searchCount >= field.search.maxSearchesPerPhase:
        return SearchDecision(
            allowed=False,
            reason="Search blocked because the current phase budget is exhausted",
            suggestedAlternative="Escalate to Council Arbiter only if a new unknown appeared",
            tieredSignals=[
                _emit_search_tiered_signal(
                    "SEARCH_BUDGET_EXHAUSTED", "Y3", query, "Phase search budget exhausted"
                )
            ],
        )

    known_target = _find_known_target(field, normalized)
    if field.search.preferKnownTargets and known_target:
        return SearchDecision(
            allowed=False,
            reason="Search blocked because a known target can answer this",
            suggestedAlternative=f"Read known target: {known_target}",
            tieredSignals=[
                _emit_search_tiered_signal(
                    "KNOWN_TARGET", "Y1", query, f"Known target available: {known_target}"
                )
            ],
        )

    # Check SCDNA genes before broad search. A high-confidence active gene
    # that directly resolves the query makes the search redundant.
    from .scdna import DEFAULT_GENE_REGISTRY, detect_gene_matches

    gene_registry = gene_registry or DEFAULT_GENE_REGISTRY
    gene_matches = detect_gene_matches(query, gene_registry)
    if gene_matches:
        top = gene_matches[0]
        if (
            top.retrieval.confidence >= _SCDNA_SEARCH_BYPASS_CONFIDENCE
            and top.retrieval.freshness >= 0.5
            and top.lifecycle.status != "deprecated"
            and top.lifecycle.status != "quarantined"
        ):
            return SearchDecision(
                allowed=False,
                reason=(
                    f"Search blocked because SCDNA gene {top.identity.stableId} "
                    f"(confidence={top.retrieval.confidence:.2f}) resolves this query"
                ),
                suggestedAlternative=(
                    f"Use decoded gene instruction: {top.instruction.imperative}"
                ),
                tieredSignals=[
                    _emit_search_tiered_signal(
                        "SCDNA_BYPASS",
                        "Y1",
                        query,
                        f"Gene {top.identity.stableId} bypasses broad search",
                    )
                ],
            )

    return SearchDecision(
        allowed=True,
        reason="Search allowed because it resolves a new unknown within budget",
    )


def record_search(
    field: VaelrixCortexForceField,
    query: str,
    reason: str,
    results_count: int = 0,
    confirmed_findings: list[str] | None = None,
    phase: str = "default",
) -> VaelrixCortexForceField:
    """Record an allowed search in the ForceField history."""
    new_field = deepcopy(field)
    new_field.search.searchCount += 1
    new_field.search.searchHistory.append(
        SearchRecord(
            query=query,
            phase=phase,
            reason=reason,
            resultsCount=results_count,
            confirmedFindings=confirmed_findings or [],
            timestampIndex=new_field.search.searchCount,
        )
    )
    return new_field


def block_search(
    field: VaelrixCortexForceField,
    query: str,
    reason: str,
    suggested_alternative: str | None = None,
) -> VaelrixCortexForceField:
    """Record a blocked search for diagnostics."""
    new_field = deepcopy(field)
    new_field.search.blockedSearches.append(
        SearchBlock(
            query=query,
            reason=reason,
            suggestedAlternative=suggested_alternative,
        )
    )
    return new_field
