#!/usr/bin/env python3
"""Capability falsifier — does every path a packet names still exist?

A capability packet is a machine for producing confident wrong answers if it is
allowed to age. A packet that says cmudict.0.7a after someone moves that file is
worse than no packet at all. This is the gate that keeps the toolbox honest.

Usage:
  python scripts/verify_capabilities.py          # all packets
  npm run verify:capabilities

Exit code is non-zero if any capability names a path that no longer resolves.
"""
from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_ROOT / "steamdeck_brain"))

from vaelrix_forcefield.scdna.capability_store import REPO_ROOT, load_packets  # noqa: E402


def check_packets(packets: list[dict]) -> list[str]:
    """Dead-path errors, human-readable. Empty list means every claim resolves."""
    errors: list[str] = []
    for packet in packets:
        for cap in packet.get("capabilities", []):
            path = cap.get("path")
            if not path:
                continue
            if not (REPO_ROOT / path).exists():
                errors.append(
                    f"{packet['domain']}: '{cap['need']}' names {path!r}, which does not exist. "
                    f"The packet is claiming something untrue."
                )
    return errors


def main(argv: list[str] | None = None) -> int:
    packets, load_errors = load_packets()
    for err in load_errors:
        print(f"  LOAD  {err}")
    dead = check_packets(packets)
    for err in dead:
        print(f"  DEAD  {err}")
    print(f"\n{len(packets)} packet(s) loaded, "
          f"{sum(len(p['capabilities']) for p in packets)} capabilities, "
          f"{len(dead)} dead path(s), {len(load_errors)} load error(s)")
    return 1 if (dead or load_errors) else 0


if __name__ == "__main__":
    raise SystemExit(main())
