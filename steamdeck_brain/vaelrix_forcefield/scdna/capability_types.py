"""SCDNA — capability packet data model.

A capability packet answers "what already does this, and what must I not
rebuild?" for one domain. Modelled on codex/core/pixelbrain/scdna-gene-packet.js
(PB-SCDNA-GENE-v1): a named contract, canonical ordering, and a checksum over a
stable stringification, so a hand-edited packet is detectable.

Every capability MUST name a `path`. A claim that cannot be checked against the
repo is worse than no claim — it is a confident wrong answer that ages into a
lie. See docs/superpowers/specs/2026-07-17-tool-substrate-design.md §7.
"""
from __future__ import annotations

import hashlib
import json

CONTRACT = "SCDNA-CAPABILITY-v1"
_REQUIRED_PACKET = ("contract", "version", "domain", "surfaces", "capabilities")
_REQUIRED_CAPABILITY = ("need", "canonical", "path")


def stable_stringify(value: object) -> str:
    """Deterministic JSON: keys sorted at every depth, no incidental whitespace."""
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def checksum(packet: dict) -> str:
    """scd64 checksum over the packet MINUS its own checksum field."""
    bare = {k: v for k, v in packet.items() if k != "checksum"}
    digest = hashlib.sha256(stable_stringify(bare).encode("utf-8")).hexdigest()
    return f"scd64:{digest[:64]}"


def validate_packet(packet: dict) -> list[str]:
    """Structural errors, human-readable. Empty list means valid."""
    errors: list[str] = []
    if not isinstance(packet, dict):
        return ["packet is not an object"]

    for field in _REQUIRED_PACKET:
        if field not in packet:
            errors.append(f"missing required field: {field}")

    if packet.get("contract") != CONTRACT:
        errors.append(f"contract must be {CONTRACT!r}, got {packet.get('contract')!r}")

    surfaces = packet.get("surfaces")
    if not isinstance(surfaces, list) or not surfaces:
        errors.append("surfaces must be a non-empty list of globs")
    elif not all(isinstance(s, str) and s for s in surfaces):
        errors.append("every surface must be a non-empty string")

    caps = packet.get("capabilities")
    if not isinstance(caps, list) or not caps:
        errors.append("capabilities must be a non-empty list")
    else:
        for i, cap in enumerate(caps):
            if not isinstance(cap, dict):
                errors.append(f"capabilities[{i}] is not an object")
                continue
            for field in _REQUIRED_CAPABILITY:
                if not cap.get(field):
                    errors.append(f"capabilities[{i}] missing required field: {field}")
    return errors
