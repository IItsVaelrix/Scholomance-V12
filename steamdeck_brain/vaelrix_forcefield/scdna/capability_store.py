"""SCDNA — capability packet store: load, verify, and match paths to packets.

The match is a glob against globs the packet declares about itself, so there is
no separate file->domain map to drift out of sync. A glob is true or false: it
cannot fire on an incidental token the way the word-based retriever fires on
"pixelbrain" appearing in a path (spec §2).
"""
from __future__ import annotations

import fnmatch
import json
from pathlib import Path

from .capability_types import checksum, validate_packet

_HERE = Path(__file__).resolve()
CAPABILITY_DIR = _HERE.parent / "capabilities"
# steamdeck_brain/vaelrix_forcefield/scdna/x.py -> repo root
REPO_ROOT = _HERE.parents[3]


def load_packets(directory: Path | None = None) -> tuple[list[dict], list[str]]:
    """Load every *.capability.json. Returns (valid_packets, errors).

    A packet that fails its checksum was hand-edited outside the compiler: it is
    uncurated content wearing a curated badge, so it is excluded, not served.
    """
    directory = directory or CAPABILITY_DIR
    packets: list[dict] = []
    errors: list[str] = []
    if not directory.is_dir():
        return packets, errors

    for path in sorted(directory.glob("*.capability.json")):
        try:
            packet = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            errors.append(f"{path.name}: unreadable ({exc!r})")
            continue

        problems = validate_packet(packet)
        if problems:
            errors.append(f"{path.name}: invalid — {'; '.join(problems)}")
            continue

        declared = packet.get("checksum")
        actual = checksum(packet)
        if declared != actual:
            errors.append(
                f"{path.name}: checksum mismatch (declared {declared}, computed {actual}) "
                f"— hand-edited outside the compiler; refusing to serve it"
            )
            continue

        packets.append(packet)
    return packets, errors


def _relativize(path: str) -> str:
    p = Path(path)
    if p.is_absolute():
        try:
            return str(p.relative_to(REPO_ROOT))
        except ValueError:
            return str(p)
    return str(p)


def matches_surface(rel_path: str, packet: dict) -> bool:
    rel = _relativize(rel_path)
    # fnmatch's `*` crosses separators, so "a/**" already matches "a/b/c" and
    # "a/b/c/d" while correctly rejecting "ab/c". No separator-aware special
    # case is needed; one was removed here after measurement refuted the
    # premise that it was.
    return any(fnmatch.fnmatch(rel, surface) for surface in packet.get("surfaces", []))


def packets_for_path(path: str, packets: list[dict]) -> list[dict]:
    return [p for p in packets if matches_surface(path, p)]
