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
    """Stands in for TRACKS_DIR but yields glob() results in a fixed order.
    Path.glob's real order is filesystem-dependent, so forcing it is the only
    way to make an ordering bug reproducible on any machine."""

    def __init__(self, real_dir, ordered_names):
        self._real_dir = real_dir
        self._ordered_names = ordered_names

    def glob(self, pattern):
        return [self._real_dir / name for name in self._ordered_names]


def test_declared_bpm_for_resolves_the_real_track_under_any_glob_order():
    """The real polarity.ts / maze-screensaver.ts pair, in BOTH glob orders.

    Note what this does and does not prove: because maze-screensaver.ts's only
    bpm: line is commented out, comment-stripping alone settles this pair, so
    the answer is 93 either way. That makes this a test of comment-stripping
    under adversarial order -- NOT a test of sorted(). The sorted() coverage
    lives in the next test, which needs two LIVE declarations to have anything
    for an ordering rule to decide between.
    """
    real_dir = scan_bpm.TRACKS_DIR
    for order in (["maze-screensaver.ts", "polarity.ts"],
                  ["polarity.ts", "maze-screensaver.ts"]):
        scan_bpm.TRACKS_DIR = _ForcedOrderDir(real_dir, order)
        try:
            assert scan_bpm.declared_bpm_for(SHARED_ID) == (93.0, "polarity.ts"), order
        finally:
            scan_bpm.TRACKS_DIR = real_dir


def test_declared_bpm_for_is_deterministic_when_two_files_both_declare(tmp_path):
    """Two files, same id, BOTH with a live positive bpm: only an ordering rule
    can decide which wins. This is the test the old 'adversarial glob order'
    one was meant to be: its order (["maze-screensaver.ts", "polarity.ts"]) was
    already sorted() order, so sorted() -- the actual determinism fix -- had
    zero coverage and could have been deleted with the suite still green.

    Here the answer is order-dependent by construction, so feeding glob() the
    REVERSED order fails unless declared_bpm_for imposes sorted() itself.
    """
    track_id = "aaaaaaaa-0000-0000-0000-000000000000"
    for name, bpm in (("a-first.ts", 93), ("z-last.ts", 145)):
        (tmp_path / name).write_text(
            f"export const T = {{ id: '{track_id}', pacing: {{ bpm: {bpm} }} }};\n",
            encoding="utf-8",
        )
    reversed_order = ["z-last.ts", "a-first.ts"]
    assert reversed_order != sorted(reversed_order), (
        "the forced order must NOT already equal sorted() order, or sorted() goes untested"
    )
    orig = scan_bpm.TRACKS_DIR
    scan_bpm.TRACKS_DIR = _ForcedOrderDir(tmp_path, reversed_order)
    try:
        # sorted() must beat the glob order it was handed: a-first.ts wins.
        assert scan_bpm.declared_bpm_for(track_id) == (93.0, "a-first.ts")
    finally:
        scan_bpm.TRACKS_DIR = orig


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


def _sung_at_96(seed=1, n=400):
    """Word onsets provably locked to a 16th grid at 96bpm, with human jitter,
    at irregular subdivisions (evenly-spaced words would lock to sub-harmonics
    just as hard and prove nothing). Mirrors scan_bpm.selftest's generator."""
    import random
    period = (60.0 / 96.0) / 4
    r = random.Random(seed)
    t, k = [], 0
    for _ in range(n):
        k += r.choice([1, 2, 2, 3, 4, 6])
        t.append(k * period + r.gauss(0, period * 0.12))
    return sorted(t)


def test_declared_harmonic_is_not_blessed_as_consistent():
    """The confirmation-bias bug: onsets provably at 96bpm, declared 192.

    192 is 96's harmonic, so it locks weakly but still clears the shuffled-gap
    noise ceiling (R=0.346 vs bar 0.299). The old assess() tested `declared`
    BEFORE `peak` and returned on the first hit, so it blessed 192 CONSISTENT
    while a peak more than twice as strong (96 at R=0.775) sat unexamined.
    bpm seeds computeFingerprint(trackId|bpm|key) -- 96 and 192 render
    different visuals -- so this was a confident wrong answer in the tool whose
    docstring calls that the worst possible outcome.
    """
    times = _sung_at_96()
    verdict, peak, peak_R, ceiling, r_dec = scan_bpm.assess(times, declared=192.0)

    # The premise must hold, or the test is not exercising what it claims.
    assert abs(peak - 96.0) < 1.0, f"generator did not produce a 96bpm peak: {peak}"
    assert r_dec > ceiling * scan_bpm.MARGIN, (
        "premise: the harmonic DOES clear the noise ceiling — that is exactly why "
        "clearing the ceiling cannot be sufficient on its own"
    )
    assert r_dec < peak_R * scan_bpm.DECLARED_SHARE, (r_dec, peak_R)
    assert verdict == "REFUTED", (
        f"a declared harmonic at R={r_dec:.3f} must not be blessed while the peak "
        f"sits at R={peak_R:.3f}; got {verdict}"
    )


def test_declared_true_tempo_is_still_consistent():
    """The other side of the fix: tightening assess() must not make it refuse
    the truth. The same onsets, declared 96, must still read CONSISTENT."""
    times = _sung_at_96()
    verdict, peak, peak_R, _ceiling, r_dec = scan_bpm.assess(times, declared=96.0)
    assert verdict == "CONSISTENT", (verdict, peak, peak_R, r_dec)


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
