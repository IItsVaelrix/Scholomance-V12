import json

import pytest

from vaelrix_forcefield.scdna.capability_types import CONTRACT, checksum
from vaelrix_forcefield.scdna import capability_compiler as cc


def _draft():
    return {
        "contract": CONTRACT, "version": "1.0.0", "domain": "testdomain",
        "surfaces": ["scripts/**"],
        "capabilities": [{"need": "n", "canonical": "c", "path": "package.json"}],
    }


def test_compile_adds_a_checksum():
    packet, errors = cc.compile_packet(_draft())
    assert errors == []
    assert packet["checksum"] == checksum(packet)


def test_compile_rejects_an_invalid_draft():
    d = _draft()
    del d["surfaces"]
    _, errors = cc.compile_packet(d)
    assert errors


def test_compile_rejects_a_capability_naming_a_dead_path():
    """The compiler will not let you author a claim that is already false."""
    d = _draft()
    d["capabilities"][0]["path"] = "node_modules/DEFINITELY_NOT_HERE"
    _, errors = cc.compile_packet(d)
    assert any("does not exist" in e for e in errors)


def test_commit_writes_a_loadable_packet(tmp_path):
    packet, _ = cc.compile_packet(_draft())
    out = cc.commit_packet(packet, tmp_path)
    from vaelrix_forcefield.scdna.capability_store import load_packets
    packets, errors = load_packets(tmp_path)
    assert errors == []
    assert len(packets) == 1


def test_commit_refuses_an_invalid_packet(tmp_path):
    d = _draft()
    del d["capabilities"]
    with pytest.raises(ValueError):
        cc.commit_packet(d, tmp_path)
