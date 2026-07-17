import io
import json

from vaelrix_forcefield.scdna.capability_types import CONTRACT, checksum
from vaelrix_forcefield.scdna import capability_inject


def _packet(path="package.json"):
    p = {
        "contract": CONTRACT, "version": "1.0.0", "domain": "phonology",
        "surfaces": ["scripts/align_lyrics.py"],
        "capabilities": [{"need": "word duration", "canonical": "CmuPhonemeEngine",
                          "path": path, "forbidden": ["hand-rolled vowel counters"]}],
    }
    p["checksum"] = checksum(p)
    return p


def test_matching_path_produces_a_block(tmp_path, monkeypatch):
    monkeypatch.setattr(capability_inject, "_STATE_DIR", tmp_path)
    block = capability_inject.build_block("scripts/align_lyrics.py", "sess-1", [_packet()])
    assert "CmuPhonemeEngine" in block
    assert "hand-rolled vowel counters" in block


def test_unrelated_path_produces_nothing(tmp_path, monkeypatch):
    monkeypatch.setattr(capability_inject, "_STATE_DIR", tmp_path)
    assert capability_inject.build_block("src/pages/Watch/WatchPage.css", "sess-1", [_packet()]) == ""


def test_the_very_next_edit_is_quiet(tmp_path, monkeypatch):
    monkeypatch.setattr(capability_inject, "_STATE_DIR", tmp_path)
    first = capability_inject.build_block("scripts/align_lyrics.py", "sess-2", [_packet()])
    second = capability_inject.build_block("scripts/align_lyrics.py", "sess-2", [_packet()])
    assert first != ""
    assert second == "", "a packet must not nag on consecutive edits"


def test_it_re_arms_after_the_window(tmp_path, monkeypatch):
    """Fire-once is REFUTED by replay: on 2026-07-17 it would have served at
    edit #14 and the _span_weight duplication happened at #51 — 37 edits later,
    long stale. The packet must come back."""
    monkeypatch.setattr(capability_inject, "_STATE_DIR", tmp_path)
    packets = [_packet()]
    served = 0
    for _ in range(capability_inject.RE_ARM_EDITS + 1):
        if capability_inject.build_block("scripts/align_lyrics.py", "sess-3", packets):
            served += 1
    assert served == 2, f"expected a re-arm within the window, served {served}"


def test_a_different_session_gets_it_again(tmp_path, monkeypatch):
    monkeypatch.setattr(capability_inject, "_STATE_DIR", tmp_path)
    capability_inject.build_block("scripts/align_lyrics.py", "sess-4", [_packet()])
    assert capability_inject.build_block("scripts/align_lyrics.py", "sess-5", [_packet()]) != ""


def test_dead_path_is_marked_stale_not_served_as_fact(tmp_path, monkeypatch):
    monkeypatch.setattr(capability_inject, "_STATE_DIR", tmp_path)
    block = capability_inject.build_block("scripts/align_lyrics.py", "sess-5",
                                          [_packet(path="node_modules/GONE_AWAY")])
    assert "STALE" in block, "a dead path must not be recommended as if it were live"


def test_main_emits_additionalContext(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(capability_inject, "_STATE_DIR", tmp_path)
    monkeypatch.setattr(capability_inject, "load_packets", lambda *a, **k: ([_packet()], []))
    payload = {"tool_name": "Edit", "session_id": "sess-6",
               "tool_input": {"file_path": "scripts/align_lyrics.py"}}
    monkeypatch.setattr("sys.stdin", io.StringIO(json.dumps(payload)))
    rc = capability_inject.main([])
    assert rc == 0
    out = json.loads(capsys.readouterr().out)
    assert out["hookSpecificOutput"]["hookEventName"] == "PreToolUse"
    assert "CmuPhonemeEngine" in out["hookSpecificOutput"]["additionalContext"]


def test_main_never_denies(tmp_path, monkeypatch, capsys):
    """The hook must never cost the user work, whatever happens."""
    monkeypatch.setattr(capability_inject, "_STATE_DIR", tmp_path)
    monkeypatch.setattr("sys.stdin", io.StringIO("not json at all"))
    rc = capability_inject.main([])
    assert rc == 0
    assert "permissionDecision" not in capsys.readouterr().out


def test_internal_failure_is_reported_not_swallowed(tmp_path, monkeypatch, capsys):
    """The inverse of inject.py's `except Exception: block = ''`."""
    monkeypatch.setattr(capability_inject, "_STATE_DIR", tmp_path)

    def _boom(*a, **k):
        raise RuntimeError("store exploded")

    monkeypatch.setattr(capability_inject, "load_packets", _boom)
    payload = {"tool_name": "Edit", "session_id": "s", "tool_input": {"file_path": "scripts/align_lyrics.py"}}
    monkeypatch.setattr("sys.stdin", io.StringIO(json.dumps(payload)))
    rc = capability_inject.main([])
    assert rc == 0
    captured = capsys.readouterr()
    assert "store exploded" in (captured.out + captured.err)


def test_main_with_string_tool_input_does_not_raise(tmp_path, monkeypatch, capsys):
    """Finding 1: tool_input:"oops-a-string" -> AttributeError in current code."""
    monkeypatch.setattr(capability_inject, "_STATE_DIR", tmp_path)
    payload = {"tool_name": "Edit", "session_id": "s", "tool_input": "oops-a-string"}
    monkeypatch.setattr("sys.stdin", io.StringIO(json.dumps(payload)))
    rc = capability_inject.main([])
    assert rc == 0
    captured = capsys.readouterr()
    assert "permissionDecision" not in captured.out
    assert (captured.out + captured.err).strip() != "", \
        "malformed tool_input must be visible, not silently ignored"


def test_main_with_list_tool_input_does_not_raise(tmp_path, monkeypatch, capsys):
    """Finding 1: tool_input:[1,2,3] -> AttributeError in current code."""
    monkeypatch.setattr(capability_inject, "_STATE_DIR", tmp_path)
    payload = {"tool_name": "Edit", "session_id": "s", "tool_input": [1, 2, 3]}
    monkeypatch.setattr("sys.stdin", io.StringIO(json.dumps(payload)))
    rc = capability_inject.main([])
    assert rc == 0
    captured = capsys.readouterr()
    assert "permissionDecision" not in captured.out
    assert (captured.out + captured.err).strip() != "", \
        "malformed tool_input must be visible, not silently ignored"
