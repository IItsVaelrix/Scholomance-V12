import copy

from vaelrix_forcefield.scdna.capability_types import (
    CONTRACT, checksum, stable_stringify, validate_packet,
)

VALID = {
    "contract": CONTRACT,
    "version": "1.0.0",
    "domain": "phonology",
    "surfaces": ["scripts/align_lyrics.py"],
    "capabilities": [
        {
            "need": "word duration",
            "canonical": "CmuPhonemeEngine",
            "path": "node_modules/cmudict/lib/cmu/cmudict.0.7a",
            "forbidden": ["hand-rolled vowel-group counters"],
        }
    ],
}


def test_stable_stringify_is_key_order_independent():
    a = stable_stringify({"b": 1, "a": [2, {"d": 3, "c": 4}]})
    b = stable_stringify({"a": [2, {"c": 4, "d": 3}], "b": 1})
    assert a == b


def test_checksum_ignores_the_checksum_field():
    p = copy.deepcopy(VALID)
    bare = checksum(p)
    p["checksum"] = "scd64:" + "0" * 64
    assert checksum(p) == bare, "a packet's checksum must not depend on itself"


def test_checksum_changes_when_content_changes():
    p = copy.deepcopy(VALID)
    q = copy.deepcopy(VALID)
    q["capabilities"][0]["path"] = "somewhere/else"
    assert checksum(p) != checksum(q)


def test_valid_packet_has_no_errors():
    assert validate_packet(VALID) == []


def test_missing_required_field_is_an_error():
    p = copy.deepcopy(VALID)
    del p["surfaces"]
    assert any("surfaces" in e for e in validate_packet(p))


def test_capability_without_a_path_is_rejected():
    """A capability that names no path cannot be verified, and an unverifiable
    claim is exactly the confident-wrong-answer this design exists to prevent."""
    p = copy.deepcopy(VALID)
    del p["capabilities"][0]["path"]
    assert any("path" in e for e in validate_packet(p))


def test_wrong_contract_is_rejected():
    p = copy.deepcopy(VALID)
    p["contract"] = "SOMETHING-ELSE-v9"
    assert any("contract" in e for e in validate_packet(p))
