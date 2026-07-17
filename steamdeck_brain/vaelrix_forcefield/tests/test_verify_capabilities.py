import importlib.util
from pathlib import Path

from vaelrix_forcefield.scdna.capability_types import CONTRACT, checksum

_ROOT = Path(__file__).resolve().parents[3]
_spec = importlib.util.spec_from_file_location("verify_capabilities", _ROOT / "scripts/verify_capabilities.py")
verify_capabilities = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(verify_capabilities)


def _packet(path):
    p = {
        "contract": CONTRACT, "version": "1.0.0", "domain": "t",
        "surfaces": ["x/**"],
        "capabilities": [{"need": "n", "canonical": "c", "path": path}],
    }
    p["checksum"] = checksum(p)
    return p


def test_live_path_passes():
    assert verify_capabilities.check_packets([_packet("package.json")]) == []


def test_dead_path_is_an_error():
    errs = verify_capabilities.check_packets([_packet("node_modules/cmudict/MOVED_AWAY")])
    assert len(errs) == 1
    assert "MOVED_AWAY" in errs[0]


def test_the_real_shipped_packets_all_resolve():
    """The seed packet must not be born stale."""
    from vaelrix_forcefield.scdna.capability_store import load_packets
    packets, errors = load_packets()
    assert errors == [], f"packets failed to load: {errors}"
    assert packets, "no capability packets found"
    assert verify_capabilities.check_packets(packets) == []
    assert verify_capabilities.check_surfaces(packets) == []
    assert verify_capabilities.check_symbols(packets) == []


# ---------------------------------------------------------------- surfaces

def _surface_packet(surfaces):
    p = {
        "contract": CONTRACT, "version": "1.0.0", "domain": "t",
        "surfaces": surfaces,
        "capabilities": [{"need": "n", "canonical": "c", "path": "package.json"}],
    }
    p["checksum"] = checksum(p)
    return p


def test_live_surface_glob_passes():
    assert verify_capabilities.check_surfaces(
        [_surface_packet(["codex/core/phonology/**"])]) == []


def test_live_literal_surface_passes():
    assert verify_capabilities.check_surfaces(
        [_surface_packet(["scripts/align_lyrics.py"])]) == []


def test_rotted_surface_glob_is_an_error():
    """The silent killer: surfaces are the packet's ONLY trigger, so a renamed
    directory does not make the packet wrong — it makes it mute, which looks
    exactly like a packet that correctly does not apply."""
    errs = verify_capabilities.check_surfaces(
        [_surface_packet(["codex/core/phonology_RENAMED/**"])])
    assert len(errs) == 1
    assert "phonology_RENAMED" in errs[0]


def test_rotted_literal_surface_is_an_error():
    errs = verify_capabilities.check_surfaces(
        [_surface_packet(["scripts/align_lyrics_MOVED.py"])])
    assert len(errs) == 1


def test_surface_glob_does_not_resolve_via_a_prefix_sibling():
    """'codex/core/phon/**' must not be satisfied by codex/core/phonology/ —
    a surface that resolves by accident is worse than one that fails."""
    assert len(verify_capabilities.check_surfaces(
        [_surface_packet(["codex/core/phon/**"])])) == 1


# ---------------------------------------------------------------- symbols

def _symbol_packet(canonical, path):
    p = {
        "contract": CONTRACT, "version": "1.0.0", "domain": "t",
        "surfaces": ["scripts/align_lyrics.py"],
        "capabilities": [{"need": "n", "canonical": canonical, "path": path}],
    }
    p["checksum"] = checksum(p)
    return p


def test_live_symbol_passes():
    assert verify_capabilities.check_symbols(
        [_symbol_packet("Syllabifier", "codex/core/phonology/syllabifier.js")]) == []


def test_missing_symbol_is_an_error_even_though_the_file_exists():
    """The verifier stats the FILE; the packet claims the SYMBOL. This is the
    gap: the path check is green because syllabifier.js is right there."""
    errs = verify_capabilities.check_symbols(
        [_symbol_packet("SyllabifierDeleted9000", "codex/core/phonology/syllabifier.js")])
    assert len(errs) == 1
    assert "SyllabifierDeleted9000" in errs[0]


def test_symbol_is_found_in_a_file_named_by_the_prose_not_the_path():
    """The real packet's shape: `path` is a cmudict DATA file, and the symbols
    live in the .js/.py files the prose points at. Searching only `path` here
    would fail every capability written this way."""
    assert verify_capabilities.check_symbols([_symbol_packet(
        "CmuPhonemeEngine (codex/core/phonology/cmu.phoneme.engine.js) reads this "
        "file; align_lyrics.py _span_weight reads it directly",
        "node_modules/cmudict/lib/cmu/cmudict.0.7a")]) == []


def test_prose_words_are_not_mistaken_for_symbols():
    """A false alarm trains people to ignore the gate, so plain English must
    contribute no candidates at all."""
    assert verify_capabilities._candidate_symbols(
        "reads this file directly and returns the grid") == set()


def test_symbol_extraction_is_conservative_about_unreadable_paths():
    """No searchable source file -> say nothing rather than guess."""
    assert verify_capabilities.check_symbols(
        [_symbol_packet("SomeName", "node_modules/cmudict/lib/cmu/cmudict.0.7a")]) == []
