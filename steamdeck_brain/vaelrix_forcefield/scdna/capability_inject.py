"""SCDNA — capability injection on PreToolUse(Write|Edit).

The inversion: the query is the FILE BEING EDITED, not the words being typed.
You cannot name what you do not know exists — that is what made the word-based
retriever unable to reduce repeated search (spec §2.1) — but you do touch files.

Verified contract (spike 2026-07-17): PreToolUse CAN inject via
hookSpecificOutput.additionalContext. systemMessage does NOT reach the model.
"""
from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

from .capability_store import REPO_ROOT, load_packets, packets_for_path

_STATE_DIR = Path(tempfile.gettempdir()) / "scdna-capability-served"

# The edit tools this hook is wired to, and the tool_input key each one carries
# its target under. NotebookEdit has no `file_path` — its schema uses
# `notebook_path`.
#
# THIS IS THE CONTRACT, and three things must agree with it or the system lies:
#   - .claude/settings.json's PreToolUse matcher (which tools invoke the hook)
#   - main() below (which key it reads the target from)
#   - scripts/replay_capabilities.py (which tools the harness replays)
# The harness imports this dict rather than restating it, because a harness
# that models a tool production never sees can report a HIT the hook would
# never have fired for — an unverifiable claim rotting into a confident wrong
# answer, which is the failure this whole branch exists to prevent.
EDIT_TOOL_PATH_KEYS = {
    "Edit": "file_path",
    "Write": "file_path",
    "MultiEdit": "file_path",
    "NotebookEdit": "notebook_path",
}

# Edits on a domain's surface that must pass before the packet may speak again.
# MEASURED, not chosen: replaying session 56188e89 (2026-07-17), the first
# align_lyrics.py edit was #14 and the _span_weight duplication was #51 — so
# fire-once is refuted, it misses by 37 edits. Fire-always serves 14 times in a
# 74-edit session (wallpaper: the existing genes fired 4x and were heeded 0x).
# A window of 10 serves at #14/#33/#51 — three times, and it lands on the
# duplication. Re-measure with scripts/replay_capabilities.py before changing.
RE_ARM_EDITS = 10


def _state_file(session_id: str, domain: str) -> Path:
    safe = "".join(c for c in f"{session_id}-{domain}" if c.isalnum() or c in "-_")
    return _STATE_DIR / safe


# One JSONL row per decision, next to the state dir. This is the ATTENTION
# instrument, and it exists because of a self-refutation: this branch's own
# argument is that unverifiable claims rot into confident wrong answers, and it
# concedes it fixes reachability, not attention (the existing genes fired 4x in
# one session and were heeded 0x) — then shipped with no way to ever find out
# whether serving helped. That is the same shape as the failure it diagnoses.
# It is an instrument, not a feature: it records what was decided, never why,
# and answers nothing on its own. read_serve_log() is where it becomes evidence.
_SERVE_LOG_NAME = "scdna-capability-serves.jsonl"


def serve_log_path() -> Path:
    """Derived from _STATE_DIR at call time, not frozen at import: tests
    redirect _STATE_DIR, and a log that ignored that would write real rows
    into /tmp during a test run — instrument readings manufactured by the
    test suite are exactly the kind of evidence this branch is against."""
    return _STATE_DIR.parent / _SERVE_LOG_NAME


def _log_serve(session_id: str, domain: str, counter: int, served: bool) -> None:
    """Append one decision. Never raises: the instrument may never cost the
    user work, and a logger that can break the hook is worse than no logger."""
    try:
        log = serve_log_path()
        log.parent.mkdir(parents=True, exist_ok=True)
        with log.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps({"session_id": session_id, "domain": domain,
                                 "edit_index": counter, "served": served}) + "\n")
    except Exception as exc:
        # Report, never swallow — but never propagate either.
        print(f"[scdna] serve log unwritable: {exc!r}", file=sys.stderr)


def should_serve(session_id: str, domain: str) -> bool:
    """True on first sight, then once every RE_ARM_EDITS matching edits.

    Counts edits, not wall-clock: the risk is going stale across a long task, and
    edits are what measure that distance.
    """
    path = _state_file(session_id, domain)
    _STATE_DIR.mkdir(parents=True, exist_ok=True)
    try:
        since = int(path.read_text(encoding="utf-8").strip())
    except Exception:
        path.write_text("0", encoding="utf-8")   # first sight -> serve, reset
        _log_serve(session_id, domain, 0, True)
        return True
    if since + 1 >= RE_ARM_EDITS:
        path.write_text("0", encoding="utf-8")
        _log_serve(session_id, domain, since + 1, True)
        return True
    path.write_text(str(since + 1), encoding="utf-8")
    _log_serve(session_id, domain, since + 1, False)
    return False


def render_packet(packet: dict, stale: set[str]) -> str:
    """A table, not an essay. Long directives become wallpaper: the existing
    genes are paragraphs, and WAND_CHEMICAL_STROKE_PROPAGATION fired four times
    in one session and was acted on zero times."""
    lines = [f"## Canonical tools for `{packet['domain']}` — already in this repo",
             "_Matched because the file you are editing is this domain's surface._", ""]
    for cap in packet["capabilities"]:
        mark = "  **[STALE — path missing, do not trust]**" if cap["path"] in stale else ""
        lines.append(f"- **{cap['need']}** → `{cap['canonical']}`{mark}")
        lines.append(f"  - path: `{cap['path']}`")
        if cap.get("coverage"):
            lines.append(f"  - coverage: {cap['coverage']}")
        if cap.get("evidence"):
            lines.append(f"  - evidence: {cap['evidence']}")
        for f in cap.get("forbidden", []):
            lines.append(f"  - DO NOT: {f}")
    return "\n".join(lines)


def build_block(file_path: str, session_id: str, packets: list[dict] | None = None) -> str:
    if packets is None:
        packets, _ = load_packets()
    hits = packets_for_path(file_path, packets)
    blocks: list[str] = []
    for packet in hits:
        if not should_serve(session_id, packet["domain"]):
            continue
        # stat() the path we are about to recommend, every single time. The
        # packet carries the means of its own refutation and checks it at the
        # only moment that matters — a dead path is marked, never asserted.
        stale = {c["path"] for c in packet["capabilities"]
                 if not (REPO_ROOT / c["path"]).exists()}
        blocks.append(render_packet(packet, stale))
    return "\n\n".join(blocks)


def main(argv: list[str] | None = None) -> int:
    """PreToolUse entrypoint. Never raises, never denies, always exits 0."""
    try:
        raw = sys.stdin.read()
    except Exception as exc:
        # Report, never swallow — shipping inject.py's bug inside the module
        # built to invert it would be indefensible. stderr keeps it out of the
        # hook's JSON contract while still leaving a trace.
        print(f"[scdna] stdin unreadable: {exc!r}", file=sys.stderr)
        raw = ""
    try:
        payload = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError as exc:
        print(f"[scdna] hook payload was not JSON: {exc!r}", file=sys.stderr)
        payload = {}
    if not isinstance(payload, dict):
        payload = {}

    tool_input = payload.get("tool_input")
    if not isinstance(tool_input, dict):
        if tool_input is not None:
            # A crash disguised as "nothing to serve" is the exact bug this
            # module exists to invert — say so on stderr, then proceed as if
            # tool_input were absent. Still exits 0: never costs the user work.
            print(f"[scdna] tool_input was {type(tool_input).__name__}, not an "
                  f"object — skipping capability injection for this call",
                  file=sys.stderr)
        tool_input = {}

    # Read every key the contract knows about, not just `file_path`: a
    # NotebookEdit reaching this hook and finding nothing under `file_path`
    # would serve silently nothing, which is the anti-wallpaper result and the
    # blind result wearing the same face.
    file_path = ""
    for key in dict.fromkeys(EDIT_TOOL_PATH_KEYS.values()):
        value = tool_input.get(key)
        if value:
            file_path = str(value)
            break
    session_id = str(payload.get("session_id", "") or "nosession")
    if not file_path:
        return 0

    try:
        block = build_block(file_path, session_id)
    except Exception as exc:
        # Never swallow. A broken toolbox says it is broken rather than
        # impersonating an empty one — the exact inversion of inject.py's
        # `except Exception: block = ""`.
        block = f"**capability retrieval failed:** `{exc!r}` — the toolbox is broken, not empty."

    if block.strip():
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "additionalContext": block,
            }
        }))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
