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


def test_the_live_matcher_matches_the_tools_the_hook_can_read():
    """The harness/production agreement, made mechanical.

    replay_capabilities modelled NotebookEdit while the live matcher was
    Write|Edit|MultiEdit and main() read only `file_path` — so the harness
    could report a HIT for a tool production never sees, and its answer about
    production was unverifiable. Three things must agree: the settings.json
    matcher, EDIT_TOOL_PATH_KEYS, and what main() reads. This test is the
    thing that makes "they agree" checkable instead of asserted — if someone
    adds a tool to the matcher without teaching the hook its path key, this
    fails rather than going quietly blind.
    """
    import json as _json
    from pathlib import Path

    root = Path(__file__).resolve().parents[3]
    settings = _json.loads((root / ".claude/settings.json").read_text())
    pre = [h for h in settings["hooks"]["PreToolUse"]
           if "capability-inject" in _json.dumps(h)]
    assert len(pre) == 1, "expected exactly one capability-inject PreToolUse entry"
    matcher_tools = set(pre[0]["matcher"].split("|"))
    assert matcher_tools == set(capability_inject.EDIT_TOOL_PATH_KEYS), (
        f"the live matcher fires for {matcher_tools}, but the hook knows path keys "
        f"for {set(capability_inject.EDIT_TOOL_PATH_KEYS)}. A tool in the matcher "
        f"with no known path key serves nothing and says nothing."
    )


def test_notebook_edit_target_is_read_from_notebook_path(tmp_path, monkeypatch, capsys):
    """NotebookEdit carries `notebook_path`, not `file_path`. Now that the
    matcher fires for it, main() must be able to see its target."""
    monkeypatch.setattr(capability_inject, "_STATE_DIR", tmp_path)
    monkeypatch.setattr(capability_inject, "load_packets", lambda *a, **k: ([_packet()], []))
    payload = {"tool_name": "NotebookEdit", "session_id": "sess-nb",
               "tool_input": {"notebook_path": "scripts/align_lyrics.py",
                              "cell_id": "1", "new_source": "x = 1"}}
    monkeypatch.setattr("sys.stdin", io.StringIO(json.dumps(payload)))
    rc = capability_inject.main([])
    assert rc == 0
    out = json.loads(capsys.readouterr().out)
    assert "CmuPhonemeEngine" in out["hookSpecificOutput"]["additionalContext"]


def test_serve_log_records_both_serves_and_suppressions(tmp_path, monkeypatch):
    """The attention instrument. It must record the DECISION either way: a log
    of serves only could never distinguish 'served once, ignored' from
    'suppressed by re-arm' — the question it exists to make answerable."""
    monkeypatch.setattr(capability_inject, "_STATE_DIR", tmp_path / "state")
    packets = [_packet()]
    for _ in range(3):
        capability_inject.build_block("scripts/align_lyrics.py", "sess-log", packets)

    log = capability_inject.serve_log_path()
    rows = [json.loads(l) for l in log.read_text().splitlines() if l.strip()]
    assert len(rows) == 3
    assert [r["served"] for r in rows] == [True, False, False]
    assert {r["session_id"] for r in rows} == {"sess-log"}
    assert {r["domain"] for r in rows} == {"phonology"}
    assert [r["edit_index"] for r in rows] == [0, 1, 2]


def test_serve_log_failure_never_costs_the_user_work(tmp_path, monkeypatch, capsys):
    """The instrument may never break the hook. If the log cannot be written,
    the packet must still be served and the failure must still be visible."""
    monkeypatch.setattr(capability_inject, "_STATE_DIR", tmp_path / "state")

    def _boom():
        raise OSError("disk gone")

    monkeypatch.setattr(capability_inject, "serve_log_path", _boom)
    block = capability_inject.build_block("scripts/align_lyrics.py", "s-boom", [_packet()])
    assert "CmuPhonemeEngine" in block, "a broken log must not suppress the packet"
    assert "disk gone" in capsys.readouterr().err, "the failure must not be silent"


def test_serve_log_follows_the_state_dir(tmp_path, monkeypatch):
    """A log frozen at import time would write real rows into /tmp during the
    test suite — manufactured instrument readings."""
    monkeypatch.setattr(capability_inject, "_STATE_DIR", tmp_path / "state")
    assert tmp_path in capability_inject.serve_log_path().parents


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
