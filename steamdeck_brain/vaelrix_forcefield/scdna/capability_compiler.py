"""SCDNA — capability packet compiler.

A manual, review-driven tool for authoring, validating, and committing capability
packets. Packets are curated, not auto-generated (PDR 7.1: "detection assists,
curation decides"). This tool may reject, warn, or emit — it may not decide that
a memory deserves to be a packet. A human does that.

It refuses to compile a capability whose path does not already exist: you cannot
author a claim that is false at the moment you write it.

Usage:
  python -m vaelrix_forcefield.scdna.capability_compiler --draft <draft.json> [--commit]
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .capability_store import CAPABILITY_DIR, REPO_ROOT
from .capability_types import CONTRACT, checksum, validate_packet


def compile_packet(draft: dict) -> tuple[dict, list[str]]:
    """Validate a draft and stamp its checksum. Returns (packet, errors)."""
    errors = list(validate_packet(draft))
    for cap in draft.get("capabilities", []) or []:
        path = cap.get("path") if isinstance(cap, dict) else None
        if path and not (REPO_ROOT / path).exists():
            errors.append(f"capability {cap.get('need')!r} names {path!r}, which does not exist")
    if errors:
        return draft, errors
    packet = {k: v for k, v in draft.items() if k != "checksum"}
    packet["checksum"] = checksum(packet)
    return packet, []


def commit_packet(packet: dict, directory: Path | None = None) -> Path:
    """Write a compiled packet. Raises ValueError if it is not valid."""
    packet, errors = compile_packet(packet)
    if errors:
        raise ValueError("; ".join(errors))
    directory = directory or CAPABILITY_DIR
    directory.mkdir(parents=True, exist_ok=True)
    out = directory / f"{packet['domain']}.capability.json"
    out.write_text(json.dumps(packet, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return out


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--draft", required=True, help="path to a draft packet JSON")
    ap.add_argument("--commit", action="store_true",
                    help="write it into the registry (a human decides this, not the tool)")
    args = ap.parse_args(argv)

    draft = json.loads(Path(args.draft).read_text(encoding="utf-8"))
    packet, errors = compile_packet(draft)
    if errors:
        for e in errors:
            print(f"  REJECT  {e}")
        return 1
    print(f"  OK  {packet['domain']}  checksum={packet['checksum']}")
    if not args.commit:
        print("  (dry run — pass --commit to register it)")
        return 0
    out = commit_packet(packet)
    print(f"  committed -> {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
