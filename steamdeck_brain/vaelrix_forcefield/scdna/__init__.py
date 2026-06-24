"""
SCDNA — Scholomance Cognitive DNA / Retrieval Genome Protocol.

A machine-parseable genetic code system for Vaelrix memory retrieval.
Each important retrievable object receives a compact retrieval gene that
decodes into routing, confidence, instruction, and English meaning.

Public API:
  - RetrievalGene, DecodedGene, GeneRegistry
  - decode_retrieval_gene, encode_retrieval_gene
  - translate_gene_to_english, translate_flag
  - validate_gene
  - detect_gene_matches
  - degrade_gene, recover_gene, is_deprecated
  - apply_decoded_gene_to_force_field
  - compile_gene, compiler_cli_main
"""

from .compiler import AcceptanceChecklistError, CompilationError, compile_gene, compiler_cli_main
from .contradictions import GeneContradiction, detect_contradictions, resolve_scdna_contradictions
from .council_integration import scdna_matches_to_amplifier_results
from .decoder import DecodedGene, decode_retrieval_gene, encode_gene_from_record, encode_retrieval_gene
from .detector import detect_gene_matches
from .forcefield_integration import apply_decoded_gene_to_force_field, apply_scdna_to_force_field
from .health import emit_health_signal
from .lifecycle import degrade_gene, is_deprecated, recover_gene
from .pixelbrain_router import (
    parse_scdna_health_signal,
    route_scdna_signals_to_health,
    scdna_signal_to_pixelbrain_health,
)
from .registry import DEFAULT_GENE_REGISTRY, GeneRegistry, get_gene_by_id
from .translator import translate_flag, translate_gene_to_english
from .turboquant_integration import attach_gene_to_chunk, retrieve_genome_chunks
from .types import (
    GeneDomain,
    GeneEnglish,
    GeneIdentity,
    GeneInstruction,
    GeneLifecycle,
    GeneRetrieval,
    GeneRisk,
    RetrievalGene,
    TurboQuantGenomeChunk,
)
from .validator import validate_gene

__all__ = [
    "RetrievalGene",
    "GeneIdentity",
    "GeneDomain",
    "GeneRetrieval",
    "GeneInstruction",
    "GeneRisk",
    "GeneEnglish",
    "GeneLifecycle",
    "TurboQuantGenomeChunk",
    "DecodedGene",
    "GeneRegistry",
    "DEFAULT_GENE_REGISTRY",
    "get_gene_by_id",
    "decode_retrieval_gene",
    "encode_retrieval_gene",
    "encode_gene_from_record",
    "translate_gene_to_english",
    "translate_flag",
    "validate_gene",
    "detect_gene_matches",
    "degrade_gene",
    "recover_gene",
    "is_deprecated",
    "apply_decoded_gene_to_force_field",
    "apply_scdna_to_force_field",
    "attach_gene_to_chunk",
    "retrieve_genome_chunks",
    "emit_health_signal",
    "compile_gene",
    "CompilationError",
    "AcceptanceChecklistError",
    "compiler_cli_main",
    "GeneContradiction",
    "detect_contradictions",
    "resolve_scdna_contradictions",
    "scdna_matches_to_amplifier_results",
    "parse_scdna_health_signal",
    "route_scdna_signals_to_health",
    "scdna_signal_to_pixelbrain_health",
]

