#!/usr/bin/env python3
"""Replay: would a capability packet have fired BEFORE a known duplication?

The acceptance test for the artifact-keyed trigger, run against a real session
transcript. On 2026-07-17 a char-length syllable heuristic was hand-rolled into
scripts/align_lyrics.py while cmudict sat in node_modules. This answers whether
the phonology packet would have landed before that edit.

It also settles the dedupe cadence with data instead of intuition: fire-once
lands early and may be stale by the moment that matters; fire-always risks the
wallpaper effect. Every run prints both counts (fire-once vs fire-always)
alongside the full hit list so the two cadences can be compared by eye.

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

# Each edit tool's target lives under a different input key. NotebookEdit has
# no `file_path` — its schema uses `notebook_path`. Getting this mapping wrong
# for a tool must never look the same as that tool simply not appearing in
# the transcript (see the missing_by_tool warning below).
_PATH_KEYS = {
    "Edit": "file_path",
    "Write": "file_path",
    "MultiEdit": "file_path",
    "NotebookEdit": "notebook_path",
}


def edits_from_transcript(path: Path) -> list[dict]:
    """Ordered file targets from Write/Edit/MultiEdit/NotebookEdit tool_use rows."""
    edits: list[dict] = []
    missing_by_tool: dict[str, int] = {}
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
            name = item.get("name")
            if name not in _EDIT_TOOLS:
                continue
            key = _PATH_KEYS.get(name, "file_path")
            fp = (item.get("input") or {}).get(key)
            if fp:
                edits.append({"file_path": str(fp), "index": len(edits)})
            else:
                # A recognised edit tool with no value under its expected
                # path key is a schema assumption failing, not a malformed
                # row. Silently skipping it here would be indistinguishable
                # from that domain's surfaces never being touched at all —
                # exactly the confident-wrong-answer this script must never
                # produce. Count it and report it; do not vanish it.
                missing_by_tool[name] = missing_by_tool.get(name, 0) + 1
    if missing_by_tool:
        detail = ", ".join(f"{count}x {tool}" for tool, count in sorted(missing_by_tool.items()))
        total = sum(missing_by_tool.values())
        print(
            f"WARNING: {total} edit-tool tool_use row(s) had no value under their "
            f"expected path key and were excluded from the replay ({detail}). "
            f"This means _PATH_KEYS is wrong for that tool, not that the rows "
            f"were malformed — fix the key mapping before trusting a NO HIT.",
            file=sys.stderr,
        )
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
        print(f"NO HIT — no edit in this transcript touched a {args.domain!r} surface.")
        print("This is not evidence the surfaces are misconfigured: it is equally the "
              "expected result when this domain simply wasn't touched in this session.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
