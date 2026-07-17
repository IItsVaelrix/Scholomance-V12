#!/usr/bin/env python3
"""Replay: would a capability packet have fired BEFORE a known duplication?

The acceptance test for the artifact-keyed trigger, run against a real session
transcript. On 2026-07-17 a char-length syllable heuristic was hand-rolled into
scripts/align_lyrics.py while cmudict sat in node_modules. This answers whether
the phonology packet would have landed before that edit.

It also settles the dedupe cadence with data instead of intuition: fire-once
lands early and may be stale by the moment that matters; fire-always risks the
wallpaper effect. Compare `--first-only` against the full hit list.

IMPORTANT: this proves PRESENCE, never ATTENTION. See spec §8.1 —
WAND_CHEMICAL_STROKE_PROPAGATION fired four times in that same session and was
acted on zero times.

Usage:
  python scripts/replay_capabilities.py --transcript <path.jsonl> [--domain phonology]
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_ROOT / "steamdeck_brain"))

from vaelrix_forcefield.scdna.capability_store import load_packets, packets_for_path  # noqa: E402

_EDIT_TOOLS = {"Edit", "Write", "MultiEdit", "NotebookEdit"}


def edits_from_transcript(path: Path) -> list[dict]:
    """Ordered Write/Edit file_paths from a Claude Code transcript JSONL."""
    edits: list[dict] = []
    for line in Path(path).read_text(encoding="utf-8", errors="replace").splitlines():
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            continue
        content = ((row.get("message") or {}).get("content")) or []
        if not isinstance(content, list):
            continue
        for item in content:
            if not isinstance(item, dict) or item.get("type") != "tool_use":
                continue
            if item.get("name") not in _EDIT_TOOLS:
                continue
            fp = (item.get("input") or {}).get("file_path")
            if fp:
                edits.append({"file_path": str(fp), "index": len(edits)})
    return edits


def first_hit(edits: list[dict], packets: list[dict], domain: str) -> int | None:
    """Index of the first edit that would have served `domain`, or None."""
    for edit in edits:
        for packet in packets_for_path(edit["file_path"], packets):
            if packet["domain"] == domain:
                return edit["index"]
    return None


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--transcript", required=True)
    ap.add_argument("--domain", default="phonology")
    args = ap.parse_args(argv)

    packets, errors = load_packets()
    for e in errors:
        print(f"  LOAD ERROR {e}")
    edits = edits_from_transcript(Path(args.transcript))
    hits = [e for e in edits
            if any(p["domain"] == args.domain for p in packets_for_path(e["file_path"], packets))]

    print(f"edits in transcript      : {len(edits)}")
    print(f"edits on {args.domain!r} surfaces: {len(hits)}")
    if hits:
        print(f"first hit                : edit #{hits[0]['index']} -> {hits[0]['file_path']}")
        print(f"fire-once would serve    : 1 time")
        print(f"fire-always would serve  : {len(hits)} times  <- noise budget")
        for h in hits[:12]:
            print(f"    #{h['index']:>3}  {h['file_path']}")
    else:
        print("NO HIT — the packet would never have fired. The surfaces are wrong.")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
