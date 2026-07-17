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

from vaelrix_forcefield.scdna.capability_inject import (  # noqa: E402
    EDIT_TOOL_PATH_KEYS, serve_log_path,
)
from vaelrix_forcefield.scdna.capability_store import load_packets, packets_for_path  # noqa: E402

# IMPORTED, never restated. A harness that models a different set of tools than
# the hook is wired to can report a HIT production would never have fired for —
# and a replay is only worth reading if it is a claim about production. This
# import is what makes the agreement checkable instead of asserted; the matcher
# in .claude/settings.json is generated from the same dict's keys.
_PATH_KEYS = EDIT_TOOL_PATH_KEYS
_EDIT_TOOLS = set(EDIT_TOOL_PATH_KEYS)


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


def summarise_serve_log(path: Path | None = None) -> str:
    """What the hook actually DID, from the serve log the hook appends to.

    Read this for what it is. It reports SERVES, not attention: it can say the
    phonology packet was served 3 times in a session, and cannot say anyone
    read it. That gap is the honest state of the art here — spec §8.1's
    4-fired/0-heeded is the measurement this instrument exists to make
    repeatable, not one it closes. Counting serves is the first half; pairing
    a session's serves against whether the duplication still happened is the
    second, and that needs sessions this log has not collected yet.
    """
    path = path or serve_log_path()
    if not path.exists():
        return (f"no serve log at {path} — the hook has not run since the "
                f"instrument was added, or it has never fired.")
    rows = []
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        if not line.strip():
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    if not rows:
        return f"serve log at {path} is empty."

    sessions = {r.get("session_id") for r in rows}
    served = [r for r in rows if r.get("served")]
    lines = [f"serve log            : {path}",
             f"decisions recorded   : {len(rows)}",
             f"sessions             : {len(sessions)}",
             f"served               : {len(served)}",
             f"suppressed (re-arm)  : {len(rows) - len(served)}"]
    by_domain: dict[str, list[int]] = {}
    for r in served:
        by_domain.setdefault(str(r.get("domain")), []).append(r.get("edit_index"))
    for domain, idxs in sorted(by_domain.items()):
        lines.append(f"  {domain}: served {len(idxs)}x  at edit-counter {idxs}")
    lines.append("NOTE: this counts SERVES, not attention. A served packet that "
                 "nobody read looks identical here to one that changed the outcome.")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--transcript")
    ap.add_argument("--domain", default="phonology")
    ap.add_argument("--serve-log", action="store_true",
                    help="summarise what the live hook actually served (no transcript needed)")
    args = ap.parse_args(argv)

    if args.serve_log:
        print(summarise_serve_log())
        return 0
    if not args.transcript:
        ap.error("--transcript is required unless --serve-log is given")

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
