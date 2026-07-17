#!/usr/bin/env python3
"""Tempo falsifier — does a track's declared bpm agree with its own audio?

The pacing block in a GrimoireTrack carries a bpm. Some are reported by Damien,
some were DEFAULT_PACING's 120 standing in for a number nobody measured — and
once written to the file the two look identical. That matters: bpm is not
decoration. computeFingerprint seeds the whole visual off `trackId|bpm|key`
(src/pages/Visualiser/bytecodeFingerprint.ts), so a fabricated tempo renders the
wrong artwork and nothing complains. This is how that gets caught.

Method: a singer places words against the metre, so the onsets of the words the
forced aligner was CONFIDENT about should concentrate in phase against a 16th
grid at the true tempo. Rayleigh's R measures that concentration (0 = uniform,
1 = perfectly locked). Scan tempo, take the peak.

The number is meaningless without its noise floor, so every verdict is measured
against a control: the same word onsets with their inter-word gaps SHUFFLED,
which preserves the timing distribution and destroys the metre. If the real R
does not clear that ceiling, this reports NOT ESTABLISHED rather than a tempo —
absence of evidence is not evidence, and a confident wrong answer here is worse
than no answer.

Measured when written (2026-07-17):
  Regret V3            peak 90.00  R=0.328  ceiling 0.154  -> confirmed Damien's 90
  Sonic Thaumaturgy V2 peak 90.00  R=0.177  ceiling 0.085  -> caught a fabricated 120
  Scholomancer         peak 94.00  R=0.142  ceiling 0.125  -> NOT ESTABLISHED (95 stands)

Usage:
  python scripts/scan_bpm.py --all
  python scripts/scan_bpm.py --artifact public/data/alignment/<id>.alignment-v1.json
  python scripts/scan_bpm.py --artifact <path> --expect 90
  python scripts/scan_bpm.py --selftest      # no dependencies

Exit code is non-zero only when a declared bpm is positively REFUTED — never for
NOT ESTABLISHED, which is an honest shrug and not a failure.
"""

import argparse
import json
import math
import random
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ALIGN_DIR = ROOT / "public/data/alignment"
TRACKS_DIR = ROOT / "src/pages/Visualiser/tracks"

# A 16th-note grid: fine enough for sung and rapped placement alike, and the
# subdivision both delivery styles measurably lock to on this catalogue.
SUBDIVISION = 4
BPM_LO, BPM_HI, BPM_STEP = 60.0, 200.0, 0.25
# How far above the shuffled-gap ceiling R must sit to count as evidence.
MARGIN = 1.3


def rayleigh(times, period):
    """Circular resultant length of phase within `period`. Offset-invariant, so
    no downbeat has to be guessed."""
    n = len(times)
    if n == 0:
        return 0.0
    c = sum(math.cos(2 * math.pi * (t % period) / period) for t in times) / n
    s = sum(math.sin(2 * math.pi * (t % period) / period) for t in times) / n
    return math.hypot(c, s)


def period_for(bpm):
    return (60.0 / bpm) / SUBDIVISION


def scan(times, lo=BPM_LO, hi=BPM_HI, step=BPM_STEP):
    out = []
    bpm = lo
    while bpm <= hi:
        out.append((rayleigh(times, period_for(bpm)), bpm))
        bpm = round(bpm + step, 6)
    out.sort(reverse=True)
    return out


def noise_ceiling(times, seeds=5):
    """Best R obtainable from the same onsets with the metre destroyed: shuffle
    the inter-word gaps, keeping their distribution. This is the bar."""
    if len(times) < 3:
        return 1.0
    gaps = [b - a for a, b in zip(times, times[1:])]
    ceiling = 0.0
    for seed in range(seeds):
        rnd = random.Random(seed)
        g = gaps[:]
        rnd.shuffle(g)
        t, acc = [times[0]], times[0]
        for x in g:
            acc += x
            t.append(acc)
        # coarse sweep is enough for a ceiling
        ceiling = max(ceiling, max(r for r, _ in scan(t, step=1.0)))
    return ceiling


def confident_onsets(artifact):
    return [w["startS"] for w in artifact["words"]
            if not w.get("interpolated") and w.get("startS") is not None]


def assess(times, declared=None):
    """-> (verdict, peak_bpm, peak_R, ceiling, R_at_declared)"""
    ranked = scan(times)
    peak_R, peak_bpm = ranked[0]
    ceiling = noise_ceiling(times)
    r_declared = rayleigh(times, period_for(declared)) if declared else None

    if declared is not None and r_declared > ceiling * MARGIN:
        return "CONSISTENT", peak_bpm, peak_R, ceiling, r_declared
    if peak_R > ceiling * MARGIN:
        return ("REFUTED" if declared is not None else "MEASURED",
                peak_bpm, peak_R, ceiling, r_declared)
    return "NOT ESTABLISHED", peak_bpm, peak_R, ceiling, r_declared


def declared_bpm_for(track_id):
    """The bpm a track module declares, if any track module claims this id."""
    for ts in TRACKS_DIR.glob("*.ts"):
        src = ts.read_text(encoding="utf-8")
        if f"'{track_id}'" not in src:
            continue
        m = re.search(r"\bbpm:\s*([0-9.]+)", src)
        if m:
            return float(m.group(1)), ts.name
    return None, None


def report(path, expect=None):
    art = json.loads(Path(path).read_text())
    times = confident_onsets(art)
    track_id = art.get("trackId", "")
    declared, origin = (expect, "--expect") if expect else declared_bpm_for(track_id)

    verdict, peak, peak_R, ceiling, r_dec = assess(times, declared)
    print(f"\n{Path(path).name}")
    print(f"  confident onsets : {len(times)}")
    print(f"  peak tempo       : {peak:g} bpm   R={peak_R:.3f}")
    print(f"  noise ceiling    : R={ceiling:.3f}  (shuffled gaps; R must exceed "
          f"{ceiling * MARGIN:.3f} to count)")
    if declared:
        print(f"  declared         : {declared:g} bpm  R={r_dec:.3f}  ({origin})")
    print(f"  VERDICT          : {verdict}")
    if verdict == "REFUTED":
        print(f"    the audio supports {peak:g} bpm, not the declared {declared:g}. "
              f"bpm seeds computeFingerprint, so this track renders the wrong visual.")
    elif verdict == "NOT ESTABLISHED":
        print("    no tempo evidence either way — the declared value is neither "
              "confirmed nor refuted. Not a failure.")
    return verdict


def selftest():
    rnd = random.Random(0)
    period = (60.0 / 96.0) / 4

    def sung(seed, n=400):
        """Words on a 16th grid at 96bpm with human jitter, at IRREGULAR
        subdivisions. Evenly-spaced words would be degenerate — a word every
        3rd 16th locks just as hard to 64bpm, since that spacing is a whole
        number of grid steps there too."""
        r = random.Random(seed)
        t, k = [], 0
        for _ in range(n):
            k += r.choice([1, 2, 2, 3, 4, 6])
            t.append(k * period + r.gauss(0, period * 0.12))
        return sorted(t)

    times = sung(1)
    verdict, peak, R, ceiling, _ = assess(times)
    assert verdict == "MEASURED", verdict
    assert abs(peak - 96.0) < 0.6 or abs(peak - 192.0) < 0.6, peak  # or its harmonic
    assert R > ceiling * MARGIN, (R, ceiling)

    # Uniformly random onsets have no tempo: reporting one would be a lie.
    times = sorted(rnd.uniform(0, 200) for _ in range(400))
    verdict, peak, R, ceiling, _ = assess(times)
    assert verdict == "NOT ESTABLISHED", (verdict, R, ceiling)

    # A declared tempo that matches the grid is CONSISTENT...
    times = sung(2)
    assert assess(times, declared=96.0)[0] == "CONSISTENT"
    # ...and one that does not is REFUTED, not quietly accepted. This is the
    # case that caught the fabricated 120 on Sonic Thaumaturgy V2.
    assert assess(times, declared=137.0)[0] == "REFUTED"

    # Rayleigh is offset-invariant: shifting every onset must not change R.
    a = rayleigh(times, period)
    b = rayleigh([t + 3.21 for t in times], period)
    assert abs(a - b) < 1e-9, (a, b)
    print("selftest OK")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--artifact", help="alignment-v1 json to scan")
    ap.add_argument("--all", action="store_true", help="scan every artifact")
    ap.add_argument("--expect", type=float, help="bpm to test instead of the declared one")
    ap.add_argument("--selftest", action="store_true")
    args = ap.parse_args()

    if args.selftest:
        selftest()
        return 0
    targets = ([args.artifact] if args.artifact
               else sorted(ALIGN_DIR.glob("*.alignment-v1.json")) if args.all else [])
    if not targets:
        ap.print_help()
        return 2
    verdicts = [report(t, args.expect) for t in targets]
    return 1 if "REFUTED" in verdicts else 0


if __name__ == "__main__":
    sys.exit(main())
