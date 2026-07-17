import importlib.util
import json
from pathlib import Path

from vaelrix_forcefield.scdna.capability_types import CONTRACT, checksum

_ROOT = Path(__file__).resolve().parents[3]
_spec = importlib.util.spec_from_file_location("replay_capabilities", _ROOT / "scripts/replay_capabilities.py")
replay = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(replay)


def _packet():
    p = {"contract": CONTRACT, "version": "1.0.0", "domain": "phonology",
         "surfaces": ["scripts/align_lyrics.py"],
         "capabilities": [{"need": "n", "canonical": "c", "path": "package.json"}]}
    p["checksum"] = checksum(p)
    return p


def _transcript(tmp_path, paths):
    f = tmp_path / "t.jsonl"
    lines = []
    for i, p in enumerate(paths):
        lines.append(json.dumps({
            "type": "assistant",
            "message": {"content": [{"type": "tool_use", "name": "Edit",
                                     "input": {"file_path": p}}]},
        }))
    f.write_text("\n".join(lines), encoding="utf-8")
    return f


def _transcript_rows(tmp_path, rows):
    """Like _transcript, but each row is a raw (name, input) tool_use pair —
    lets tests build NotebookEdit / malformed rows directly."""
    f = tmp_path / "t.jsonl"
    lines = []
    for name, tool_input in rows:
        lines.append(json.dumps({
            "type": "assistant",
            "message": {"content": [{"type": "tool_use", "name": name,
                                     "input": tool_input}]},
        }))
    f.write_text("\n".join(lines), encoding="utf-8")
    return f


def test_extracts_edits_in_order(tmp_path):
    t = _transcript(tmp_path, ["a.py", "scripts/align_lyrics.py", "b.css"])
    edits = replay.edits_from_transcript(t)
    assert [e["file_path"] for e in edits] == ["a.py", "scripts/align_lyrics.py", "b.css"]


def test_first_hit_finds_the_matching_edit(tmp_path):
    t = _transcript(tmp_path, ["a.py", "scripts/align_lyrics.py", "b.css"])
    edits = replay.edits_from_transcript(t)
    assert replay.first_hit(edits, [_packet()], "phonology") == 1


def test_first_hit_is_none_when_never_touched(tmp_path):
    t = _transcript(tmp_path, ["a.py", "b.css"])
    edits = replay.edits_from_transcript(t)
    assert replay.first_hit(edits, [_packet()], "phonology") is None


def test_notebook_edit_extracts_notebook_path(tmp_path):
    # NotebookEdit has no `file_path` — its schema uses `notebook_path`.
    # A row like this must be extracted, not silently dropped.
    t = _transcript_rows(tmp_path, [
        ("NotebookEdit", {"notebook_path": "analysis.ipynb", "cell_id": "1",
                          "new_source": "x = 1"}),
    ])
    edits = replay.edits_from_transcript(t)
    assert [e["file_path"] for e in edits] == ["analysis.ipynb"]


def test_edit_still_extracts_file_path(tmp_path):
    # Regression guard: Edit/Write/MultiEdit keep using `file_path`.
    t = _transcript_rows(tmp_path, [
        ("Edit", {"file_path": "a.py", "old_string": "x", "new_string": "y"}),
    ])
    edits = replay.edits_from_transcript(t)
    assert [e["file_path"] for e in edits] == ["a.py"]


def test_recognised_tool_with_no_usable_path_warns_not_silent(tmp_path, capsys):
    # A row IS one of _EDIT_TOOLS (NotebookEdit) but has no value under its
    # expected key (`notebook_path`). This is a schema assumption failing,
    # not a malformed row — it must not vanish without a trace.
    t = _transcript_rows(tmp_path, [
        ("NotebookEdit", {"cell_id": "1", "new_source": "x = 1"}),
    ])
    edits = replay.edits_from_transcript(t)
    assert edits == []
    captured = capsys.readouterr()
    assert "WARNING" in captured.err
    assert "NotebookEdit" in captured.err
