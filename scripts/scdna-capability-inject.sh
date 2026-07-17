#!/usr/bin/env bash
# SCDNA capability injection — PreToolUse(Write|Edit) hook.
# Serves the canonical-tools table for the domain whose surface is being edited.
# Never denies, never blocks, always exits 0.
cd "$(dirname "$0")/../steamdeck_brain" 2>/dev/null || exit 0
PYTHONPATH=. timeout 5 python3 -m vaelrix_forcefield.scdna.capability_inject
exit 0
