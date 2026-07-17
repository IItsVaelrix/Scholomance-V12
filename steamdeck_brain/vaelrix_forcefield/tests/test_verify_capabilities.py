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
