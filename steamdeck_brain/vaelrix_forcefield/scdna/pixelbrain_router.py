"""
SCDNA — PixelBrain Router integration.

SCDNA emits tiered health signals in the format:
    PB-YELLOW-v1:SCDNA:<component>:<stableId>:<tier>:<key>=<value>...
    PB-RED-v1:SCDNA:<component>:<stableId>:<tier>:<key>=<value>...

The existing PixelBrain health system only knows PB-OK-v1 (green/caution) and
PB-RED-v1 (distress). This module converts SCDNA yellow/red tier strings into
canonical PB-OK-v1 / PB-RED-v1 BytecodeHealth bytecodes so they can be parsed,
verified, and routed by the rest of the immune feed.
"""

from __future__ import annotations

from typing import Any

from ..pixelbrain.bytecode_health import (
    HEALTH_CODES,
    emit_health,
)


def parse_scdna_health_signal(signal: str) -> dict[str, Any]:
    """Parse a PB-YELLOW-v1 or PB-RED-v1 SCDNA signal into components."""
    if signal.startswith("PB-YELLOW-v1:"):
        prefix = "PB-YELLOW-v1"
        remainder = signal[len("PB-YELLOW-v1:") :]
        severity = "yellow"
    elif signal.startswith("PB-RED-v1:"):
        prefix = "PB-RED-v1"
        remainder = signal[len("PB-RED-v1:") :]
        severity = "red"
    else:
        raise ValueError(f"Unknown SCDNA health signal prefix: {signal}")

    parts = remainder.split(":")
    if len(parts) < 4:
        raise ValueError(f"Invalid SCDNA health signal shape: {signal}")

    component = parts[0]
    stable_id = parts[1]
    tier = parts[2]
    kv_pairs = parts[3:]

    context: dict[str, Any] = {"tier": tier, "stableId": stable_id}
    for kv in kv_pairs:
        if "=" in kv:
            key, value = kv.split("=", 1)
            context[key] = value

    return {
        "prefix": prefix,
        "severity": severity,
        "component": component,
        "stableId": stable_id,
        "tier": tier,
        "context": context,
    }


def scdna_signal_to_pixelbrain_health(signal: str) -> str:
    """
    Convert an SCDNA tiered signal into an existing PixelBrain health bytecode.

    Yellow tiers map to PB-OK-v1 archived/caution; red tiers map to PB-RED-v1 distress.
    """
    parsed = parse_scdna_health_signal(signal)
    severity = parsed["severity"]
    component = parsed["component"]
    stable_id = parsed["stableId"]
    tier = parsed["tier"]
    context = dict(parsed["context"])
    context["sourceSignal"] = signal

    cell_id = "SCDNA"
    check_id = f"{component}:{stable_id}"

    if severity == "red":
        code = HEALTH_CODES["TRUESIGHT_NODE_DISTRESS"]
    else:
        # Yellow is attention/warning, not a clean pass.
        code = HEALTH_CODES["WIP_STUB"]

    return emit_health(code, cell_id, check_id, context)


def route_scdna_signals_to_health(signals: list[str]) -> list[str]:
    """Convert a list of SCDNA tiered signals into PixelBrain health bytecodes."""
    health_signals: list[str] = []
    for signal in signals:
        try:
            health_signals.append(scdna_signal_to_pixelbrain_health(signal))
        except ValueError:
            # Malformed SCDNA signals must not break the immune feed.
            continue
    return health_signals
