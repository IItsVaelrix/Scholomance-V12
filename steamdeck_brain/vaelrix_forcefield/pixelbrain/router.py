"""
Vaelrix Cortex ForceField — PixelBrain Router.

Bidirectional translation between PixelBrain error bytecodes (PB-ERR-v1)
and BytecodeHealth signals (PB-OK-v1 / PB-RED-v1).

Rules:
- PB-ERR-v1 with severity CRIT/FATAL → PB-RED-v1 distress signal.
- PB-ERR-v1 with severity WARN/INFO → PB-OK-v1 archived/caution signal.
- PB-OK-v1 clean signals are not converted to errors (lossy direction returns None).
- PB-RED-v1 distress signals → PB-ERR-v1 STATE-CRIT.
"""

from __future__ import annotations

from typing import Any

from . import parse_error, verify_error
from .bytecode_health import encode_archived_health, encode_red_distress, parse_health


# Delay import to avoid circular dependency at module load time.
AmplifierResult = Any


def route_amplifier_results_to_health(
    results: list[AmplifierResult],
    cell_id: str | None = None,
) -> list[str]:
    """
    Wire brain outputs through the PixelBrain Router into BytecodeHealth.

    Every PB-ERR-v1 bytecode emitted by an Amplifier brain is translated to
    a PB-OK-v1 / PB-RED-v1 health signal. Non-error bytecodes and malformed
    strings are ignored so that one bad signal cannot break the immune feed.
    """
    health_signals: list[str] = []
    for result in results:
        for bytecode in getattr(result, "bytecodes", []) or []:
            if not verify_error(bytecode):
                continue
            health_signals.append(
                error_to_health(
                    bytecode,
                    cell_id=cell_id or getattr(result, "brainId", None) or "FORCEFIELD",
                    check_id=f"brain_{getattr(result, 'brainId', 'UNKNOWN').lower()}",
                )
            )
    return health_signals


def error_to_health(error_bytecode: str, cell_id: str | None = None, check_id: str | None = None) -> str:
    """
    Convert a PB-ERR-v1 string into a BytecodeHealth signal.

    CRIT/FATAL become RED-path distress; WARN/INFO become archived caution.
    The original error bytecode is preserved inside the health context.
    """
    if not verify_error(error_bytecode):
        raise ValueError("Invalid PB-ERR-v1 bytecode")

    err = parse_error(error_bytecode)
    severity = err["severity"]
    module = err["module"]
    code = err["code"]
    category = err["category"]

    context: dict[str, Any] = {
        "sourceBytecode": error_bytecode,
        "category": category,
        "module": module,
        "errorCode": code,
        "originalContext": err["context"],
    }

    cell = cell_id or module or "FORCEFIELD"
    check = check_id or f"{category.lower()}_{code}"

    if severity in {"CRIT", "FATAL"}:
        return encode_red_distress(cell, check, context, module_id=module)
    return encode_archived_health(cell, check, context)


def health_to_error(health_bytecode: str) -> str | None:
    """
    Convert a BytecodeHealth signal back into a PB-ERR-v1 string.

    Only RED-path distress signals are converted. Clean/archived signals
    return None because they do not represent an error condition.
    """
    health = parse_health(health_bytecode)
    code = health["code"]

    if "PB-RED" not in code:
        return None

    ctx = health["context"]
    source = ctx.get("sourceBytecode")
    if source and verify_error(source):
        return source

    # Synthesize an error from the health payload.
    from . import emit_error

    return emit_error(
        category=ctx.get("category", "STATE"),
        severity="CRIT",
        module=ctx.get("module", health["cellId"]),
        code=ctx.get("errorCode", "0301"),
        context={
            "cellId": health["cellId"],
            "checkId": health["checkId"],
            "originalContext": ctx.get("originalContext", {}),
            "convertedFrom": health_bytecode,
        },
    )
