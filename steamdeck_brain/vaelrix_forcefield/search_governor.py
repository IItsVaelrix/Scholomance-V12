"""
Vaelrix Cortex ForceField — Search Governor.

Blocks wasteful or redundant searches while allowing genuine unknowns.
"""

from __future__ import annotations

from copy import deepcopy

from .types import (
    SearchBlock,
    SearchDecision,
    SearchRecord,
    VaelrixCortexForceField,
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
) -> SearchDecision:
    """
    Decide whether a proposed search is allowed.

    Returns a SearchDecision with allowed=False and an explanation when the
    search is redundant, unreasoned, over-budget, or answerable from known
    targets.
    """
    normalized = normalize_query(query)

    if field.search.requireSearchReason and not reason.strip():
        return SearchDecision(
            allowed=False,
            reason="Search blocked because no reason was provided",
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
        )

    if field.search.searchCount >= field.search.maxSearchesPerPhase:
        return SearchDecision(
            allowed=False,
            reason="Search blocked because the current phase budget is exhausted",
            suggestedAlternative="Escalate to Council Arbiter only if a new unknown appeared",
        )

    known_target = _find_known_target(field, normalized)
    if field.search.preferKnownTargets and known_target:
        return SearchDecision(
            allowed=False,
            reason="Search blocked because a known target can answer this",
            suggestedAlternative=f"Read known target: {known_target}",
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
