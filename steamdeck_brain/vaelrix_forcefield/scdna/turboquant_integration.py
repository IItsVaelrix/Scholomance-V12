"""
SCDNA — TurboQuant genome chunk integration.

Links SCDNA retrieval genes to compressed TurboQuant memory payloads so that
retrieved chunks carry operational meaning as well as content.
"""

from __future__ import annotations

from ..turboquant.substrate_client import TurboQuantClient
from .registry import DEFAULT_GENE_REGISTRY, GeneRegistry
from .types import RetrievalGene, TurboQuantGenomeChunk


_SCDNA_META_PREFIX = "scdna_"


def attach_gene_to_chunk(
    client: TurboQuantClient,
    gene: RetrievalGene,
    payload: str,
    summary: str,
    index: int,
) -> TurboQuantGenomeChunk:
    """
    Store a memory payload in TurboQuant and attach an SCDNA gene to it.

    Returns a TurboQuantGenomeChunk linking the gene to the stored payload.
    """
    metadata = {
        f"{_SCDNA_META_PREFIX}stable_id": gene.identity.stableId,
        f"{_SCDNA_META_PREFIX}content_hash": gene.identity.contentHash,
        f"{_SCDNA_META_PREFIX}domain": gene.domain.primary,
        "summary": summary,
    }
    chunk_id = client.store(payload, metadata=metadata)
    return TurboQuantGenomeChunk(
        gene=gene,
        compressedPayloadRef=str(chunk_id),
        summary=summary,
        createdAtIndex=index,
        updatedAtIndex=index,
    )


def retrieve_genome_chunks(
    client: TurboQuantClient,
    query: str,
    registry: GeneRegistry | None = None,
    top_k: int = 5,
) -> list[TurboQuantGenomeChunk]:
    """
    Retrieve TurboQuant chunks that have an attached SCDNA gene and resolve
    the gene reference through the registry.
    """
    if registry is None:
        registry = DEFAULT_GENE_REGISTRY

    results = client.retrieve(query, top_k=top_k)
    chunks: list[TurboQuantGenomeChunk] = []
    for result in results:
        meta = result.get("metadata", {})
        stable_id = meta.get(f"{_SCDNA_META_PREFIX}stable_id")
        content_hash = meta.get(f"{_SCDNA_META_PREFIX}content_hash")
        if not stable_id:
            continue

        gene = registry.get(stable_id)
        if gene is None or gene.identity.contentHash != content_hash:
            # Gene missing or hash mismatch — stale reference.
            continue

        chunks.append(
            TurboQuantGenomeChunk(
                gene=gene,
                compressedPayloadRef=str(result.get("id", "")),
                summary=meta.get("summary", result.get("text", "")[:200]),
                createdAtIndex=0,
                updatedAtIndex=0,
            )
        )

    return chunks
