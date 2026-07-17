import json

from vaelrix_forcefield.scdna.capability_types import CONTRACT, checksum
from vaelrix_forcefield.scdna.capability_store import (
    load_packets, matches_surface, packets_for_path,
)


def _packet(domain="phonology", surfaces=None):
    p = {
        "contract": CONTRACT,
        "version": "1.0.0",
        "domain": domain,
        "surfaces": surfaces or ["scripts/align_lyrics.py", "codex/core/phonology/**"],
        "capabilities": [
            {"need": "word duration", "canonical": "CmuPhonemeEngine",
             "path": "node_modules/cmudict/lib/cmu/cmudict.0.7a",
             "forbidden": ["hand-rolled vowel-group counters"]},
        ],
    }
    p["checksum"] = checksum(p)
    return p


def _write(tmp_path, packet):
    f = tmp_path / f"{packet['domain']}.capability.json"
    f.write_text(json.dumps(packet), encoding="utf-8")
    return f


def test_exact_surface_matches():
    assert matches_surface("scripts/align_lyrics.py", _packet())


def test_glob_surface_matches_nested():
    assert matches_surface("codex/core/phonology/syllabifier.js", _packet())


def test_unrelated_path_does_not_match():
    """The anti-wallpaper test. A packet that fires on everything is furniture."""
    assert not matches_surface("src/pages/Watch/WatchPage.css", _packet())


def test_load_packets_reads_a_valid_packet(tmp_path):
    _write(tmp_path, _packet())
    packets, errors = load_packets(tmp_path)
    assert errors == []
    assert len(packets) == 1
    assert packets[0]["domain"] == "phonology"


def test_tampered_packet_is_refused_and_reported(tmp_path):
    p = _packet()
    p["capabilities"][0]["path"] = "somewhere/i/edited/by/hand"   # checksum now stale
    _write(tmp_path, p)
    packets, errors = load_packets(tmp_path)
    assert packets == [], "a packet failing its checksum must not be served"
    assert any("checksum" in e for e in errors)


def test_invalid_packet_is_refused_and_reported(tmp_path):
    p = _packet()
    del p["capabilities"][0]["path"]
    p["checksum"] = checksum(p)      # honestly re-checksummed, but still invalid
    _write(tmp_path, p)
    packets, errors = load_packets(tmp_path)
    assert packets == []
    assert any("path" in e for e in errors)


def test_packets_for_path_accepts_absolute_paths(tmp_path):
    packets = [_packet()]
    hits = packets_for_path("/home/deck/Downloads/Scholomance-V12-main/scripts/align_lyrics.py", packets)
    assert len(hits) == 1


def test_packets_for_path_returns_empty_for_unrelated(tmp_path):
    assert packets_for_path("/tmp/whatever.txt", [_packet()]) == []
