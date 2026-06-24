"""
Vaelrix Cortex ForceField — TurboQuant chunk dispatch.

Dispatches compressed knowledge chunks to active Amplifier brains through
per-brain lenses. Each brain receives only the chunks most relevant to its
domain, reducing noise and preventing context bloat.
"""

from __future__ import annotations

from typing import Any

from ..types import RetrievedChunk, VaelrixCortexForceField
from .lenses import DEFAULT_LENS, get_lens
from .substrate_client import TurboQuantClient


def _result_to_chunk(result: dict[str, Any], brain_id: str) -> RetrievedChunk:
    return RetrievedChunk(
        id=str(result.get("id", "")),
        source=result.get("metadata", {}).get("source", "unknown"),
        summary=result.get("text", "")[:240],
        relevance=float(result.get("similarity", 0.0)),
        usedByBrains=[brain_id],
    )


def dispatch_chunks_to_brains(
    field: VaelrixCortexForceField,
    client: TurboQuantClient,
    query: str | None = None,
) -> VaelrixCortexForceField:
    """
    Retrieve TurboQuant chunks for every active brain and store them in the
    ForceField memory field.

    The operation is immutable: it returns a new ForceField.
    """
    from copy import deepcopy

    new_field = deepcopy(field)
    q = query or field.task.rawUserRequest

    active_brains = field.routing.activeBrains or []
    if not active_brains:
        return new_field

    retrieved: list[RetrievedChunk] = []
    chunk_use_history: dict[str, int] = dict(field.memory.chunkUseHistory)

    for brain_id in active_brains:
        lens = get_lens(brain_id)
        search_query = lens.transform_query(q)
        top_k = lens.top_k or 3

        results = client.retrieve(
            query=search_query,
            top_k=top_k,
            metadata_filter=lens.metadata_filter,
        )

        for result in results:
            chunk = _result_to_chunk(result, brain_id)
            retrieved.append(chunk)
            chunk_use_history[chunk.id] = chunk_use_history.get(chunk.id, 0) + 1

    # Merge with existing chunks, deduplicating by id and keeping the highest
    # relevance score and the union of using brains.
    by_id: dict[str, RetrievedChunk] = {}
    for chunk in new_field.memory.retrievedChunks:
        by_id[chunk.id] = chunk

    for chunk in retrieved:
        existing = by_id.get(chunk.id)
        if existing is None:
            by_id[chunk.id] = chunk
        else:
            merged_brains = list(set(existing.usedByBrains + chunk.usedByBrains))
            best_relevance = max(existing.relevance, chunk.relevance)
            by_id[chunk.id] = RetrievedChunk(
                id=existing.id,
                source=existing.source,
                summary=existing.summary,
                relevance=best_relevance,
                usedByBrains=merged_brains,
            )

    new_field.memory.retrievedChunks = list(by_id.values())
    new_field.memory.chunkUseHistory = chunk_use_history
    new_field.memory.turboQuantRefs = [
        f"{c.source}#{c.id}" for c in new_field.memory.retrievedChunks
    ]

    return new_field
