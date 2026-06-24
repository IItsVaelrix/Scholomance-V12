"""
SCDNA — English translation layer.

Converts machine-readable gene codes into stable operator instructions.
"""

from __future__ import annotations


KNOWN_FLAGS: dict[str, str] = {
    "NO_FRONTEND_FALLBACK": (
        "Do not let frontend fallback logic recompute truth when a stronger backend source exists."
    ),
    "RUN_REGRESSION_TESTS": "Run targeted regression tests before accepting the change.",
    "HIGH_BLAST_RADIUS": "Treat this memory as high-risk because multiple systems may consume it.",
    "CANONICAL": "Treat this memory as a canonical system rule unless fresher evidence overrides it.",
    "STALE_CHECK": "Check freshness before using this memory as an active instruction.",
    "NONE": "No special flags attached.",
}


def translate_gene_to_english(
    source_kind: str,
    domain: str,
    action: str,
    activation_brains: list[str],
    confidence: float,
    flags: list[str],
) -> str:
    """Translate decoded gene fields into a stable English instruction."""
    flag_meanings = [translate_flag(flag) for flag in flags]

    parts = [
        f"This is a {source_kind} gene in the {domain} domain.",
        f"Primary action: {action}.",
        f"Activate: {', '.join(activation_brains) if activation_brains else 'no specific brains'}.",
        f"Confidence: {confidence:.2f}.",
    ]
    parts.extend(flag_meanings)

    return " ".join(parts)


def translate_flag(flag: str) -> str:
    """Translate a single flag into English, surfacing unknown flags."""
    return KNOWN_FLAGS.get(flag, f"Unknown flag: {flag}. Do not silently ignore this flag.")
