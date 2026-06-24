"""
Vaelrix Cortex ForceField — PixelBrain Language Binding.

This module implements the canonical encoder/decoder for the PixelBrain
bytecode families used by ForceField brains to communicate structurally.

Supported families:
- PB-ERR-v1  (error)
- PB-FIX-v1  (fix recipe)
- PB-RECURSE-v1 (recursion record)
- PB-XP-v1   (vaccine / antigen)
- PB-DIAG-v1 (diagnostic report)

See:
docs/scholomance-encyclopedia/Scholomance White Papers/PIXELBRAIN_LANGUAGE_WHITE_PAPER.md
"""

from __future__ import annotations

import base64
import json
import math
import re
import time
from typing import Any

FNV_OFFSET_BASIS = 0x811C9DC5
FNV_PRIME = 0x01000193


# ---------------------------------------------------------------------------
# Checksum discipline
# ---------------------------------------------------------------------------

def fnv1a32(text: str) -> int:
    """FNV-1a 32-bit hash, unsigned, as specified by PixelBrain."""
    data = text.encode("utf-8") if isinstance(text, str) else text
    hash_value = FNV_OFFSET_BASIS
    for byte in data:
        hash_value ^= byte
        hash_value = (hash_value * FNV_PRIME) & 0xFFFFFFFF
    return hash_value


def fnv1a8hex(text: str) -> str:
    """8-digit uppercase hex FNV-1a checksum."""
    return fnv1a32(text).to_bytes(4, "big").hex().upper()


# ---------------------------------------------------------------------------
# JSON canonicalization / context discipline
# ---------------------------------------------------------------------------

def _canonicalize(value: Any) -> str:
    """Canonical JSON: sorted keys, no extra whitespace, stable primitives."""
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        if isinstance(value, float):
            if math.isnan(value) or math.isinf(value):
                raise ValueError("Cannot canonicalize NaN or Infinity")
            # Strip trailing zeros and unnecessary decimal point.
            text = ("%f" % value).rstrip("0").rstrip(".")
            return text or "0"
        return str(value)
    if isinstance(value, str):
        return json.dumps(value, ensure_ascii=False)
    if isinstance(value, (list, tuple)):
        return "[" + ",".join(_canonicalize(v) for v in value) + "]"
    if isinstance(value, dict):
        keys = sorted(value.keys())
        return "{" + ",".join(_canonicalize(k) + ":" + _canonicalize(value[k]) for k in keys) + "}"
    raise TypeError(f"Unsupported canonicalization type: {type(value)}")


def canonicalize(value: Any) -> str:
    """Public canonical JSON serialization."""
    return _canonicalize(value)


def encode_context(context: dict[str, Any]) -> str:
    """Encode a context dict to canonical base64."""
    canonical = canonicalize(context)
    return base64.b64encode(canonical.encode("utf-8")).decode("ascii")


def decode_context(b64: str) -> Any:
    """Decode a base64 context segment back to the original object."""
    # URL-safe variants may use - and _; normalize to standard base64.
    standard = b64.replace("-", "+").replace("_", "/")
    pad = 4 - (len(standard) % 4)
    if pad != 4:
        standard += "=" * pad
    json_bytes = base64.b64decode(standard)
    return json.loads(json_bytes.decode("utf-8"))


# ---------------------------------------------------------------------------
# PB-ERR-v1 — error tongue
# ---------------------------------------------------------------------------

def emit_error(
    category: str,
    severity: str,
    module: str,
    code: str,
    context: dict[str, Any] | None = None,
) -> str:
    """Emit a PB-ERR-v1 bytecode string."""
    ctx = context or {}
    context_b64 = encode_context(ctx)
    partial = f"PB-ERR-v1-{category}-{severity}-{module}-{code}-{context_b64}"
    return f"{partial}-{fnv1a8hex(partial)}"


def parse_error(bytecode: str) -> dict[str, Any]:
    """Parse and verify a PB-ERR-v1 bytecode string."""
    parts = bytecode.split("-")
    if len(parts) < 8:
        raise ValueError(f"Invalid PB-ERR-v1 field count: {len(parts)}")
    checksum = parts[-1]
    context_b64 = parts[-2]
    body = parts[3:-2]
    if len(body) < 4:
        raise ValueError(f"Invalid PB-ERR-v1 body count: {len(body)}")
    category, severity, module, code = body[0], body[1], body[2], body[3]
    partial = f"PB-ERR-v1-{category}-{severity}-{module}-{code}-{context_b64}"
    context = decode_context(context_b64)
    return {
        "marker": parts[0],
        "family": parts[1],
        "version": parts[2],
        "category": category,
        "severity": severity,
        "module": module,
        "code": code,
        "context": context,
        "checksum": checksum,
        "checksumVerified": fnv1a8hex(partial) == checksum.upper(),
    }


def verify_error(bytecode: str) -> bool:
    """Return True if the PB-ERR-v1 checksum is valid."""
    try:
        return parse_error(bytecode)["checksumVerified"]
    except Exception:
        return False


# ---------------------------------------------------------------------------
# PB-FIX-v1 — fix tongue
# ---------------------------------------------------------------------------

def emit_fix(
    category: str,
    op: str,
    code: str,
    context: dict[str, Any] | None = None,
) -> str:
    """Emit a PB-FIX-v1 bytecode string."""
    ctx = context or {}
    context_b64 = encode_context(ctx)
    partial = f"PB-FIX-v1-{category}-{op}-{code}-{context_b64}"
    return f"{partial}-{fnv1a8hex(partial)}"


def parse_fix(bytecode: str) -> dict[str, Any]:
    """Parse a PB-FIX-v1 bytecode string."""
    parts = bytecode.split("-")
    if len(parts) < 7:
        raise ValueError(f"Invalid PB-FIX-v1 field count: {len(parts)}")
    checksum = parts[-1]
    context_b64 = parts[-2]
    category, op, code = parts[3], parts[4], parts[5]
    partial = f"PB-FIX-v1-{category}-{op}-{code}-{context_b64}"
    return {
        "marker": parts[0],
        "family": parts[1],
        "version": parts[2],
        "category": category,
        "op": op,
        "code": code,
        "context": decode_context(context_b64),
        "checksum": checksum,
        "checksumVerified": fnv1a8hex(partial) == checksum.upper(),
    }


# ---------------------------------------------------------------------------
# PB-RECURSE-v1 — recursion detector
# ---------------------------------------------------------------------------

def emit_recurse(entrypoint: str, depth: int, stack: list[str]) -> str:
    """Emit a PB-RECURSE-v1 bytecode string."""
    stack_hash = fnv1a8hex("|".join(stack))
    depth_str = str(max(1, int(depth))).zfill(5)
    partial = f"PB-RECURSE-v1-{entrypoint}-{depth_str}-{stack_hash}"
    return f"{partial}-{fnv1a8hex(partial)}"


def parse_recurse(bytecode: str) -> dict[str, Any]:
    parts = bytecode.split("-")
    if len(parts) != 6:
        raise ValueError(f"Invalid PB-RECURSE-v1 field count: {len(parts)}")
    checksum = parts[-1]
    entrypoint, depth_str, stack_hash = parts[3], parts[4], parts[5]
    partial = f"PB-RECURSE-v1-{entrypoint}-{depth_str}-{stack_hash}"
    return {
        "marker": parts[0],
        "family": parts[1],
        "version": parts[2],
        "entrypoint": entrypoint,
        "depth": int(depth_str),
        "stackHash": stack_hash,
        "checksum": checksum,
        "checksumVerified": fnv1a8hex(partial) == checksum.upper(),
    }


# ---------------------------------------------------------------------------
# PB-XP-v1 — vaccine / antigen tongue
# ---------------------------------------------------------------------------

SLUG_RE = re.compile(r"^[a-z0-9-]{3,64}$")
FINGERPRINT_RE = re.compile(r"^[0-9A-F]{16}$", re.IGNORECASE)


def emit_xp(source_kind: str, slug: str, fingerprint: str) -> str:
    """Emit a PB-XP-v1 bytecode string."""
    if source_kind not in {"error", "health", "cccb"}:
        raise ValueError(f"Invalid source_kind: {source_kind}")
    if not SLUG_RE.match(slug):
        raise ValueError(f"Invalid slug: {slug}")
    if not FINGERPRINT_RE.match(fingerprint):
        raise ValueError(f"Invalid fingerprint: {fingerprint}")
    partial = f"PB-XP-v1-{source_kind}-{slug}-{fingerprint.upper()}"
    return f"{partial}-{fnv1a8hex(partial)}"


def parse_xp(bytecode: str) -> dict[str, Any]:
    parts = bytecode.split("-")
    if len(parts) != 6:
        raise ValueError(f"Invalid PB-XP-v1 field count: {len(parts)}")
    checksum = parts[-1]
    source_kind, slug, fingerprint = parts[3], parts[4], parts[5]
    partial = f"PB-XP-v1-{source_kind}-{slug}-{fingerprint.upper()}"
    return {
        "marker": parts[0],
        "family": parts[1],
        "version": parts[2],
        "sourceKind": source_kind,
        "slug": slug,
        "fingerprint": fingerprint.upper(),
        "checksum": checksum,
        "checksumVerified": fnv1a8hex(partial) == checksum.upper(),
    }


# ---------------------------------------------------------------------------
# PB-DIAG-v1 — diagnostic report tongue
# ---------------------------------------------------------------------------

def emit_diag(context: dict[str, Any], timestamp: int | None = None, rand: str | None = None) -> str:
    """Emit a PB-DIAG-v1 bytecode string."""
    ts = timestamp if timestamp is not None else int(time.time() * 1000)
    r = rand if rand is not None else fnv1a8hex(str(ts))[:4]
    if len(r) != 4 or not all(c in "0123456789ABCDEFabcdef" for c in r):
        raise ValueError("rand must be 4 hex characters")
    context_b64 = encode_context(context)
    partial = f"PB-DIAG-v1-{ts}-{r.upper()}-{context_b64}"
    return f"{partial}-{fnv1a8hex(partial)}"


def parse_diag(bytecode: str) -> dict[str, Any]:
    parts = bytecode.split("-")
    if len(parts) < 7:
        raise ValueError(f"Invalid PB-DIAG-v1 field count: {len(parts)}")
    checksum = parts[-1]
    context_b64 = parts[-2]
    timestamp_str, rand = parts[3], parts[4]
    partial = f"PB-DIAG-v1-{timestamp_str}-{rand}-{context_b64}"
    return {
        "marker": parts[0],
        "family": parts[1],
        "version": parts[2],
        "timestamp": int(timestamp_str),
        "rand": rand.upper(),
        "context": decode_context(context_b64),
        "checksum": checksum,
        "checksumVerified": fnv1a8hex(partial) == checksum.upper(),
    }


# ---------------------------------------------------------------------------
# Generic verifier
# ---------------------------------------------------------------------------

from .bytecode_health import (  # noqa: F401
    CELL_IDS,
    HEALTH_CODES,
    checksum_health,
    emit_health,
    encode_archived_health,
    encode_clean_health,
    encode_red_distress,
    parse_health,
    verify_health,
)
from .router import error_to_health, health_to_error  # noqa: F401

FAMILY_PARSERS = {
    "PB-ERR-v1": parse_error,
    "PB-FIX-v1": parse_fix,
    "PB-RECURSE-v1": parse_recurse,
    "PB-XP-v1": parse_xp,
    "PB-DIAG-v1": parse_diag,
}


def parse(bytecode: str) -> dict[str, Any]:
    """Auto-detect family and parse a bytecode string."""
    if bytecode.startswith(("PB-OK-v1", "PB-RED-v1")):
        return parse_health(bytecode)
    parts = bytecode.split("-")
    if len(parts) < 3:
        raise ValueError("Bytecode too short")
    family = f"{parts[0]}-{parts[1]}-{parts[2]}"
    parser = FAMILY_PARSERS.get(family)
    if not parser:
        raise ValueError(f"Unknown PixelBrain family: {family}")
    return parser(bytecode)


def verify(bytecode: str) -> bool:
    """Auto-detect family and verify checksum."""
    try:
        return parse(bytecode)["checksumVerified"]
    except Exception:
        return False
