#!/usr/bin/env bash
# ============================================================================
# ensure-ollama.sh — install Ollama if its binary is missing, then exit
# ============================================================================
# Run as ExecStartPre of scholomance-ollama.service so the always-on stack
# self-heals: if the ollama binary isn't present (e.g. drive not mounted yet,
# wiped, fresh machine), download the official tarball and unpack it so the
# expected binary exists — then `ollama serve` (the unit's ExecStart) proceeds.
#
# Usage:  ensure-ollama.sh <path-to-ollama-binary>
#
# The tarball lays out <prefix>/bin/ollama + <prefix>/lib/ollama/... , so the
# install prefix is derived as two dirs up from the target binary. That keeps a
# self-contained, no-sudo install on whatever drive the binary lives on (the
# big-drive layout from the README: $BIG/ollama/bin/ollama).
# ============================================================================
set -euo pipefail

BIN="${1:?usage: ensure-ollama.sh <path-to-ollama-binary>}"
TARBALL_URL="https://ollama.com/download/ollama-linux-amd64.tgz"

# Already installed and runnable? Nothing to do — this is the common fast path.
if [ -x "$BIN" ] && "$BIN" --version >/dev/null 2>&1; then
    exit 0
fi

echo "ensure-ollama: '$BIN' missing — installing Ollama..."

# Need network to fetch the tarball; bail clearly if offline (Restart=always
# on the unit will retry once connectivity returns).
if ! curl -sf --max-time 5 https://ollama.com >/dev/null 2>&1; then
    echo "ensure-ollama: no network to ollama.com yet; will retry on next start." >&2
    exit 1
fi

PREFIX="$(dirname "$(dirname "$BIN")")"   # .../bin/ollama -> ...
if ! mkdir -p "$PREFIX" 2>/dev/null || [ ! -w "$PREFIX" ]; then
    echo "ensure-ollama: cannot write to install prefix '$PREFIX'." >&2
    echo "  Pick a writable location (big drive) and re-run install.sh with" >&2
    echo "  OLLAMA_BIN=<prefix>/bin/ollama, or install Ollama there manually." >&2
    exit 1
fi

TGZ="$(mktemp "${TMPDIR:-/tmp}/ollama-XXXXXX.tgz")"
trap 'rm -f "$TGZ"' EXIT
echo "ensure-ollama: downloading $TARBALL_URL ..."
curl -fSL "$TARBALL_URL" -o "$TGZ"
echo "ensure-ollama: unpacking into $PREFIX ..."
tar -xzf "$TGZ" -C "$PREFIX"

if [ -x "$BIN" ] && "$BIN" --version >/dev/null 2>&1; then
    echo "ensure-ollama: installed → $("$BIN" --version 2>/dev/null | head -1)"
    exit 0
fi
echo "ensure-ollama: install completed but '$BIN' still not runnable." >&2
exit 1
