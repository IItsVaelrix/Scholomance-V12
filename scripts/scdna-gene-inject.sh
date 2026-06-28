#!/usr/bin/env bash
# SCDNA proactive gene injection — Claude Code UserPromptSubmit hook.
# Reads the hook JSON on stdin; emits hookSpecificOutput.additionalContext JSON,
# or nothing. Always exits 0 so it can never block a prompt submission.
cd "$(dirname "$0")/../steamdeck_brain" 2>/dev/null || exit 0
exec python3 -m vaelrix_forcefield.scdna.inject
