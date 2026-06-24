"""
SCDNA — tiered PixelBrain health signals.

Emits PB-YELLOW-v1 and PB-RED-v1 bytecodes so receivers can decide how
severely to react without parsing prose.
"""

from __future__ import annotations


def emit_health_signal(
    severity: str,
    component: str,
    stable_id: str,
    tier: str,
    **kwargs,
) -> str:
    """
    Emit a PixelBrain health bytecode.

    Args:
        severity: "yellow" or "red".
        component: e.g. "GENE_DEGRADED", "GENE_DEPRECATED", "REGISTRY_INTEGRITY".
        stable_id: the gene stableId, or a registry-level identifier.
        tier: Y1-Y4 or R1-R4.
        **kwargs: key=value pairs appended to the signal.

    Returns:
        The formatted health signal string.
    """
    if severity == "yellow":
        prefix = "PB-YELLOW-v1"
    elif severity == "red":
        prefix = "PB-RED-v1"
    else:
        raise ValueError(f"Unknown severity: {severity}")

    payload = ":".join(f"{key}={value}" for key, value in kwargs.items())
    signal = f"{prefix}:SCDNA:{component}:{stable_id}:{tier}"
    if payload:
        signal += f":{payload}"
    return signal
