"""
SCDNA — compact gene decoder and encoder.

Deterministic parsing of SCDNA:v1:<SOURCE>:<DOMAIN>:<ACTION>:<BRAINS>:<CONF>:<FLAGS>
into structured DecodedGene objects, plus encoding of RetrievalGene records.
"""

from __future__ import annotations

from dataclasses import dataclass

from .types import RetrievalGene


@dataclass(frozen=True)
class DecodedGene:
    version: str
    sourceKind: str
    domain: str
    action: str
    activationBrains: tuple[str, ...]
    confidence: float
    flags: tuple[str, ...]
    englishInstruction: str

    def to_compact_string(self) -> str:
        """Serialize back to the compact SCDNA gene format."""
        return encode_retrieval_gene(
            source=self.sourceKind,
            domain=self.domain,
            action=self.action,
            activation_brains=list(self.activationBrains),
            confidence=int(round(self.confidence * 100)),
            flags=list(self.flags),
        )


def decode_retrieval_gene(gene: str) -> DecodedGene:
    """
    Parse a compact SCDNA gene string into a DecodedGene.

    Raises ValueError on malformed input.
    """
    from .translator import translate_gene_to_english

    parts = gene.split(":")
    if len(parts) != 8:
        raise ValueError(
            f"Invalid SCDNA gene shape. Expected 8 parts, received {len(parts)}."
        )

    prefix, version, source_kind, domain, action, brains, confidence, flags = parts

    if prefix != "SCDNA":
        raise ValueError("Invalid retrieval gene prefix.")

    if version != "v1":
        raise ValueError(f"Unsupported retrieval gene version: {version}.")

    try:
        raw_confidence = int(confidence)
    except ValueError as exc:
        raise ValueError(
            f"Invalid confidence value: {confidence}. Expected integer 0-100."
        ) from exc
    if raw_confidence < 0 or raw_confidence > 100:
        raise ValueError(
            f"Invalid confidence value: {confidence}. Expected integer 0-100."
        )
    parsed_confidence = raw_confidence / 100.0

    activation_brains = [b for b in brains.split("+") if b]
    parsed_flags = [f for f in flags.split("+") if f]

    english = translate_gene_to_english(
        source_kind=source_kind,
        domain=domain,
        action=action,
        activation_brains=activation_brains,
        confidence=parsed_confidence,
        flags=parsed_flags,
    )

    return DecodedGene(
        version=version,
        sourceKind=source_kind,
        domain=domain,
        action=action,
        activationBrains=tuple(activation_brains),
        confidence=parsed_confidence,
        flags=tuple(parsed_flags),
        englishInstruction=english,
    )


def encode_retrieval_gene(
    source: str,
    domain: str,
    action: str,
    activation_brains: list[str],
    confidence: int,
    flags: list[str] | None = None,
) -> str:
    """
    Build a compact SCDNA:v1 gene string from raw fields.

    Confidence must be an integer 0-100.
    """
    if not isinstance(confidence, int) or confidence < 0 or confidence > 100:
        raise ValueError(f"Invalid confidence value: {confidence}. Expected integer 0-100.")

    flags = flags or []
    return (
        f"SCDNA:v1:{source}:{domain}:{action}:"
        f"{'+'.join(activation_brains)}:{confidence}:{'+'.join(flags) if flags else 'NONE'}"
    )


def encode_gene_from_record(gene: RetrievalGene) -> str:
    """Build a compact SCDNA gene string from a full RetrievalGene record."""
    return encode_retrieval_gene(
        source=gene.identity.sourceKind,
        domain=gene.domain.primary,
        action=gene.instruction.action,
        activation_brains=gene.domain.activationBrains,
        confidence=int(round(gene.retrieval.confidence * 100)),
        flags=_flags_from_record(gene),
    )


def _flags_from_record(gene: RetrievalGene) -> list[str]:
    """Derive compact flags from a full gene record."""
    flags: list[str] = []
    if gene.retrieval.canonical:
        flags.append("CANONICAL")
    if gene.retrieval.freshness < 0.8:
        flags.append("STALE_CHECK")
    if gene.risk.blastRadius in ("cross_system", "global") or gene.risk.riskClass in (
        "high",
        "critical",
    ):
        flags.append("HIGH_BLAST_RADIUS")
    if "regression" in " ".join(gene.instruction.requiredChecks).lower():
        flags.append("RUN_REGRESSION_TESTS")
    for forbidden in gene.instruction.forbiddenDrift:
        lowered = forbidden.lower()
        if "frontend fallback" in lowered or "frontend-only" in lowered:
            flags.append("NO_FRONTEND_FALLBACK")
    return flags or ["NONE"]
