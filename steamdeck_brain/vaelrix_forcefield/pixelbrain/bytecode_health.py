"""
Vaelrix Cortex ForceField — BytecodeHealth (PB-OK-v1) binding.

Implements the green-path / red-path diagnostic bytecode format used by the
JS BytecodeHealth system in codex/core/diagnostic/BytecodeHealth.js.

Format:
    PB-OK-v1-{MODULE}-{CHECK}-{CONTEXT_B64}-{CHECKSUM_8}

where CONTEXT_B64 is base64url(JSON(context)) and CHECKSUM_8 is the first 8
hex characters of SHA-256 over the stable fields.
"""

from __future__ import annotations

import base64
import hashlib
import json
from typing import Any

HEALTH_CODES = {
    "IMMUNE_PASS_COORD": "PB-OK-v1-IMMUNE-PASS-COORD",
    "LAYER_BOUNDARY_OK": "PB-OK-v1-LAYER-BOUNDARY-OK",
    "TEST_COVERAGE_PASS": "PB-OK-v1-TEST-COVERAGE-PASS",
    "FIXTURE_SHAPE_OK": "PB-OK-v1-FIXTURE-SHAPE-OK",
    "PROCESSOR_BRIDGE_CLEAN": "PB-OK-v1-PROCESSOR-BRIDGE-CLEAN",
    "CELL_SCAN_CLEAN": "PB-OK-v1-CELL-SCAN-CLEAN",
    "QUANT_FIDELITY_PASS": "PB-OK-v1-QUANT-FIDELITY-PASS",
    "TRUESIGHT_NODE_HEALTHY": "PB-OK-v1-TRUESIGHT-NODE-HEALTHY",
    "TRUESIGHT_NODE_DISTRESS": "PB-RED-v1-TRUESIGHT-NODE-DISTRESS",
    "TRUESIGHT_CHROMA_OK": "PB-OK-v1-TRUESIGHT-CHROMA-OK",
    "TRUESIGHT_CHROMA_BLEED": "PB-ERR-v1-TRUESIGHT-CHROMA-BLEED",
    "LOGIC_INCOMPLETE": "PB-OK-v1-LOGIC-INCOMPLETE",
    "WIP_STUB": "PB-OK-v1-WIP-STUB",
    "DEPRECATED_STASIS": "PB-OK-v1-DEPRECATED-STASIS",
}

CELL_IDS = {
    "IMMUNITY_SCAN": "IMMUNITY_SCAN",
    "LAYER_BOUNDARY": "LAYER_BOUNDARY",
    "TEST_COVERAGE": "TEST_COVERAGE",
    "FIXTURE_SHAPE": "FIXTURE_SHAPE",
    "PROCESSOR_BRIDGE": "PROCESSOR_BRIDGE",
    "CONNECTION_HEALTH": "CONNECTION_HEALTH",
    "LIFECYCLE": "LIFECYCLE",
    "DB_HEALTH": "DB_HEALTH",
    "VECTOR_FIDELITY": "VECTOR_FIDELITY",
    "TRUESIGHT_OVERLAY": "TRUESIGHT_OVERLAY",
    "VERSE_IR_RENDERER": "VERSE_IR_RENDERER",
    "FORCEFIELD": "FORCEFIELD",
}


def _canonical_json(context: dict[str, Any]) -> str:
    """Stable JSON for BytecodeHealth context (insertion order preserved)."""
    return json.dumps(context, ensure_ascii=False, separators=(",", ":"))


def _encode_context(context: dict[str, Any]) -> str:
    """Base64url encode a context dict."""
    return base64.urlsafe_b64encode(_canonical_json(context).encode("utf-8")).decode("ascii").rstrip("=")


def _decode_context(b64: str) -> Any:
    """Decode a base64url context segment."""
    pad = 4 - (len(b64) % 4)
    if pad != 4:
        b64 += "=" * pad
    return json.loads(base64.urlsafe_b64decode(b64).decode("utf-8"))


def checksum_health(
    code: str,
    cell_id: str,
    check_id: str,
    module_id: str | None,
    context: dict[str, Any],
) -> str:
    """Compute the 8-char SHA-256 checksum over stable fields."""
    stable = {
        "version": "v1",
        "code": code,
        "cellId": cell_id,
        "checkId": check_id,
        "moduleId": module_id,
        "context": context,
    }
    return hashlib.sha256(_canonical_json(stable).encode("utf-8")).hexdigest()[:8].upper()


def emit_health(
    code: str,
    cell_id: str,
    check_id: str,
    context: dict[str, Any] | None = None,
    module_id: str | None = None,
) -> str:
    """Emit a PB-OK-v1 / PB-RED-v1 BytecodeHealth string."""
    ctx = context or {}
    effective_module_id = module_id if module_id is not None else ctx.get("moduleId")
    checksum = checksum_health(code, cell_id, check_id, effective_module_id, ctx)
    context_b64 = _encode_context(ctx)
    return f"{code}-{cell_id}-{check_id}-{context_b64}-{checksum}"


def parse_health(bytecode: str) -> dict[str, Any]:
    """Parse a PB-OK-v1 / PB-RED-v1 BytecodeHealth string.

    Health codes are known constants; we match the longest prefix to find the
    boundary between code and cellId.
    """
    code = None
    for candidate in HEALTH_CODES.values():
        if bytecode.startswith(candidate + "-"):
            if code is None or len(candidate) > len(code):
                code = candidate
    if code is None:
        raise ValueError(f"Unknown health marker: {bytecode}")

    remainder = bytecode[len(code) + 1 :]
    parts = remainder.split("-")
    if len(parts) < 4:
        raise ValueError(f"Invalid BytecodeHealth field count: {len(parts) + 1}")
    checksum = parts[-1]
    context_b64 = parts[-2]
    check_id = parts[-3]
    cell_id = parts[-4]
    # Any extra hyphens between code and cell_id belong to cell_id.
    # (cellId may itself contain hyphens in theory.)
    if len(parts) > 4:
        cell_id = "-".join(parts[:-4]) + "-" + cell_id

    context = _decode_context(context_b64)
    module_id = context.get("moduleId") if isinstance(context, dict) else None
    expected = checksum_health(code, cell_id, check_id, module_id, context)
    return {
        "version": "v1",
        "code": code,
        "cellId": cell_id,
        "checkId": check_id,
        "moduleId": module_id,
        "context": context,
        "checksum": checksum,
        "checksumVerified": checksum.upper() == expected,
    }


def verify_health(bytecode: str) -> bool:
    try:
        return parse_health(bytecode)["checksumVerified"]
    except Exception:
        return False


def encode_clean_health(
    cell_id: str,
    check_id: str,
    context: dict[str, Any] | None = None,
    module_id: str | None = None,
) -> str:
    """Emit a passing green-path health signal."""
    ctx = dict(context or {})
    if module_id is not None:
        ctx["moduleId"] = module_id
    return emit_health(HEALTH_CODES["CELL_SCAN_CLEAN"], cell_id, check_id, ctx)


def encode_red_distress(
    cell_id: str,
    check_id: str,
    context: dict[str, Any] | None = None,
    module_id: str | None = None,
) -> str:
    """Emit a RED-path distress signal."""
    ctx = dict(context or {})
    if module_id is not None:
        ctx["moduleId"] = module_id
    return emit_health(HEALTH_CODES["TRUESIGHT_NODE_DISTRESS"], cell_id, check_id, ctx)


def encode_archived_health(
    cell_id: str,
    check_id: str,
    context: dict[str, Any] | None = None,
) -> str:
    """Emit an archived / stub health signal."""
    return emit_health(HEALTH_CODES["LOGIC_INCOMPLETE"], cell_id, check_id, context or {})
