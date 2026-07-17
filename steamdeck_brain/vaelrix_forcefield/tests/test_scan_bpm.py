import importlib.util
import subprocess
import sys

import pytest

_ROOT = __import__("pathlib").Path(__file__).resolve().parents[3]
_spec = importlib.util.spec_from_file_location("scan_bpm", _ROOT / "scripts/scan_bpm.py")
scan_bpm = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(scan_bpm)


# The track id shared by src/pages/Visualiser/tracks/polarity.ts (real,
# measured bpm: 93) and .../maze-screensaver.ts (an unfinished stub whose
# only `bpm:` line is commented out: `//   bpm: 0,  // <-- measure this`).
SHARED_ID = "0ff1c2ee-6951-4f65-9204-4cbb2baf16fa"


def test_declared_bpm_for_picks_the_real_track_not_the_commented_stub():
    """The id is claimed by both polarity.ts (real, bpm: 93) and
    maze-screensaver.ts (an unfinished stub whose only bpm: line is
    commented out). declared_bpm_for must always resolve to the real one."""
    bpm, origin = scan_bpm.declared_bpm_for(SHARED_ID)
    assert (bpm, origin) == (93.0, "polarity.ts")


class _ForcedOrderDir:
    """Stands in for TRACKS_DIR but yields glob() results in a fixed,
    deliberately adversarial order -- buggy file first. This is what an
    unlucky filesystem ordering looks like: Path.glob's real order is
    filesystem-dependent, so on THIS machine the naive old implementation
    happens to see polarity.ts before maze-screensaver.ts and gets the
    right answer by luck (see the finding's own measurement). Forcing the
    order removes the luck and makes the bug reproducible on any machine."""

    def __init__(self, real_dir, ordered_names):
        self._real_dir = real_dir
        self._ordered_names = ordered_names

    def glob(self, pattern):
        return [self._real_dir / name for name in self._ordered_names]


def test_declared_bpm_for_is_immune_to_filesystem_glob_order():
    """Regardless of the order Path.glob happens to hand files back in,
    declared_bpm_for must deterministically prefer the real declaration.
    This is the test that fails deterministically against the old code
    (which trusted raw glob order and matched the first bpm: it saw,
    comment or not) -- see the RED run captured in the task report."""
    real_dir = scan_bpm.TRACKS_DIR
    forced = _ForcedOrderDir(real_dir, ["maze-screensaver.ts", "polarity.ts"])
    scan_bpm.TRACKS_DIR = forced
    try:
        assert scan_bpm.declared_bpm_for(SHARED_ID) == (93.0, "polarity.ts")
    finally:
        scan_bpm.TRACKS_DIR = real_dir


def test_commented_out_bpm_is_never_returned(tmp_path):
    """A standalone fixture file whose only bpm: line is commented out must
    never be reported as a declaration -- there is nothing declared here."""
    track_id = "deadbeef-0000-0000-0000-000000000000"
    stub = tmp_path / "unfinished-stub.ts"
    stub.write_text(
        "export const STUB = {\n"
        f"  id: '{track_id}',\n"
        "  pacing: {\n"
        "  //   bpm: 0,         // <-- measure this\n"
        "  },\n"
        "};\n",
        encoding="utf-8",
    )
    orig_tracks_dir = scan_bpm.TRACKS_DIR
    scan_bpm.TRACKS_DIR = tmp_path
    try:
        assert scan_bpm.declared_bpm_for(track_id) == (None, None)
    finally:
        scan_bpm.TRACKS_DIR = orig_tracks_dir


def test_zero_bpm_is_never_returned_even_when_uncommented(tmp_path):
    """A real (uncommented) `bpm: 0` is still a placeholder, not a
    measurement -- declared_bpm_for must not hand it to period_for/assess,
    which would divide by zero."""
    track_id = "0badf00d-0000-0000-0000-000000000000"
    stub = tmp_path / "zero-bpm.ts"
    stub.write_text(
        "export const ZERO = {\n"
        f"  id: '{track_id}',\n"
        "  pacing: {\n"
        "    bpm: 0,\n"
        "  },\n"
        "};\n",
        encoding="utf-8",
    )
    orig_tracks_dir = scan_bpm.TRACKS_DIR
    scan_bpm.TRACKS_DIR = tmp_path
    try:
        assert scan_bpm.declared_bpm_for(track_id) == (None, None)
    finally:
        scan_bpm.TRACKS_DIR = orig_tracks_dir


def test_period_for_and_assess_never_see_a_zero_bpm():
    """declared_bpm_for's contract (positive or None) is what keeps assess()
    safe: period_for(0) is a ZeroDivisionError, so a 0 must never reach it."""
    with pytest.raises(ZeroDivisionError):
        scan_bpm.period_for(0)

    times = [0.1, 0.3, 0.7, 1.1, 1.5]
    bpm, _origin = scan_bpm.declared_bpm_for(SHARED_ID)
    assert bpm is not None and bpm > 0
    # assess() must be callable with the declared bpm without blowing up.
    verdict, *_rest = scan_bpm.assess(times, declared=bpm)
    assert verdict in {"CONSISTENT", "REFUTED", "NOT ESTABLISHED", "MEASURED"}


def test_selftest_still_passes_in_process():
    scan_bpm.selftest()


def test_selftest_still_passes_via_cli():
    result = subprocess.run(
        [sys.executable, str(_ROOT / "scripts/scan_bpm.py"), "--selftest"],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stderr
    assert "selftest OK" in result.stdout
