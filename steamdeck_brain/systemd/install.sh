#!/usr/bin/env bash
# ============================================================================
# install.sh — Install the SteamDeck Brain as always-on systemd --user services
# ============================================================================
# Keeps brain_daemon.py (and its Ollama dependency) running at all times,
# independent of the DivTube TUI, surviving crashes and reboots.
#
# Usage:
#   ./install.sh                 # detect paths, install + enable + start
#   ./install.sh --uninstall     # stop, disable, and remove the units
#   PYTHON=/path/to/python ./install.sh   # force a specific interpreter
#
# Idempotent: re-running re-renders the units from current paths and restarts.
# ============================================================================
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"          # steamdeck_brain/systemd
BRAIN_DIR="$(dirname "$SCRIPT_DIR")"                                # steamdeck_brain
PROJECT_ROOT="$(dirname "$BRAIN_DIR")"                              # repo root
BRAIN_DAEMON="$BRAIN_DIR/brain_daemon.py"
UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"

OLLAMA_UNIT="scholomance-ollama.service"
BRAIN_UNIT="scholomance-brain.service"

# ─── Uninstall path ──────────────────────────────────────────────────────────
if [[ "${1:-}" == "--uninstall" ]]; then
    echo -e "${YELLOW}Uninstalling Scholomance Brain services...${NC}"
    systemctl --user disable --now "$BRAIN_UNIT" 2>/dev/null || true
    systemctl --user disable --now "$OLLAMA_UNIT" 2>/dev/null || true
    rm -f "$UNIT_DIR/$BRAIN_UNIT" "$UNIT_DIR/$OLLAMA_UNIT"
    systemctl --user daemon-reload
    echo -e "${GREEN}✔ Removed.${NC} (linger left enabled; disable with: loginctl disable-linger $USER)"
    exit 0
fi

# ─── Detect a Python interpreter (prefer project venvs) ──────────────────────
detect_python() {
    if [[ -n "${PYTHON:-}" ]]; then echo "$PYTHON"; return; fi
    for cand in "$PROJECT_ROOT/.venv-align/bin/python3" \
                "$PROJECT_ROOT/.venv/bin/python3" \
                "$PROJECT_ROOT/divtube_downloader/.venv/bin/python3"; do
        [[ -x "$cand" ]] && { echo "$cand"; return; }
    done
    command -v python3
}
PYTHON="$(detect_python)"
ENSURE_OLLAMA="$SCRIPT_DIR/ensure-ollama.sh"

# Where Ollama (binary + models) must live. Resolution order:
#   1. OLLAMA_BIN env override on this invocation
#   2. OLLAMA_BIN= line persisted in ~/.config/scholomance-brain.env
#   3. fall back to whatever is on PATH (system drive — only if nothing set)
# Once set via (1), it is PERSISTED to the env file so future launches/reruns
# and the systemd units keep using the big drive without re-specifying it.
ENV_FILE="$HOME/.config/scholomance-brain.env"
_env_ollama_bin=""
[[ -f "$ENV_FILE" ]] && _env_ollama_bin="$(sed -n 's/^OLLAMA_BIN=//p' "$ENV_FILE" | tail -1)"
OLLAMA_BIN="${OLLAMA_BIN:-${_env_ollama_bin:-$(command -v ollama || true)}}"

if [[ -n "$OLLAMA_BIN" ]]; then
    # Persist the chosen location so it survives reruns and reboots.
    mkdir -p "$(dirname "$ENV_FILE")"
    if [[ -f "$ENV_FILE" ]] && grep -q '^OLLAMA_BIN=' "$ENV_FILE"; then
        sed -i "s|^OLLAMA_BIN=.*|OLLAMA_BIN=$OLLAMA_BIN|" "$ENV_FILE"
    else
        echo "OLLAMA_BIN=$OLLAMA_BIN" >> "$ENV_FILE"
    fi
    # Default model storage next to the binary (big drive) unless already set.
    if ! { [[ -f "$ENV_FILE" ]] && grep -q '^OLLAMA_MODELS=' "$ENV_FILE"; }; then
        echo "OLLAMA_MODELS=$(dirname "$(dirname "$OLLAMA_BIN")")/models" >> "$ENV_FILE"
    fi
fi

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   🧠  Installing Scholomance Brain — always-on systemd units  ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo "  Python:      $PYTHON"
echo "  Brain daemon:$BRAIN_DAEMON"
echo "  Ollama:      ${OLLAMA_BIN:-<not found on PATH>}"
echo "  Unit dir:    $UNIT_DIR"
echo ""

[[ -f "$BRAIN_DAEMON" ]] || { echo -e "${RED}Error: $BRAIN_DAEMON not found.${NC}"; exit 1; }
if [[ -z "$OLLAMA_BIN" ]]; then
    echo -e "${RED}Error: no Ollama install location set.${NC}"
    echo -e "${YELLOW}Ollama must live on your big drive — specify where, e.g.:${NC}"
    echo    "    OLLAMA_BIN=/run/media/deck/<DRIVE>/ollama/bin/ollama $0"
    echo -e "${YELLOW}It is persisted afterward, and ensure-ollama.sh will auto-install${NC}"
    echo -e "${YELLOW}Ollama there (binary + models) on first launch if it's missing.${NC}"
    exit 1
fi
# Guard against an install pointed at the small system/partitioned drive.
case "$OLLAMA_BIN" in
    /usr/*|/bin/*|/sbin/*)
        echo -e "${YELLOW}⚠  OLLAMA_BIN is on the system drive ($OLLAMA_BIN).${NC}"
        echo -e "${YELLOW}   You asked for the big drive — pass OLLAMA_BIN=/run/media/deck/<DRIVE>/ollama/bin/ollama${NC}"
        echo -e "${YELLOW}   Continuing in 4s (Ctrl-C to abort)…${NC}"; sleep 4 ;;
esac

mkdir -p "$UNIT_DIR"

render() {  # render <template> <dest>
    sed -e "s|@PYTHON@|$PYTHON|g" \
        -e "s|@SCRIPT_DIR@|$BRAIN_DIR|g" \
        -e "s|@BRAIN_DAEMON@|$BRAIN_DAEMON|g" \
        -e "s|@OLLAMA_BIN@|$OLLAMA_BIN|g" \
        -e "s|@ENSURE_OLLAMA@|$ENSURE_OLLAMA|g" \
        "$1" > "$2"
}

render "$SCRIPT_DIR/$OLLAMA_UNIT" "$UNIT_DIR/$OLLAMA_UNIT"
render "$SCRIPT_DIR/$BRAIN_UNIT"  "$UNIT_DIR/$BRAIN_UNIT"
echo -e "${GREEN}✔ Rendered units into $UNIT_DIR${NC}"

# Enable linger so the services run without an active graphical/login session
# (i.e. on boot, headless, after the deck wakes) — the crux of "on at all times".
if command -v loginctl >/dev/null 2>&1; then
    loginctl enable-linger "$USER" 2>/dev/null \
        && echo -e "${GREEN}✔ Linger enabled for $USER (services run without login)${NC}" \
        || echo -e "${YELLOW}⚠  Could not enable linger; services run only while logged in.${NC}"
fi

systemctl --user daemon-reload
# enable for autostart, then restart so re-runs pick up edited units/models
# (enable --now is a no-op on an already-running unit and would keep the old config).
systemctl --user enable "$OLLAMA_UNIT" "$BRAIN_UNIT"
systemctl --user restart "$OLLAMA_UNIT"
systemctl --user restart "$BRAIN_UNIT"

echo ""
echo -e "${GREEN}✔ Installed and started.${NC}"
echo "  Status:  systemctl --user status $BRAIN_UNIT"
echo "  Logs:    journalctl --user -u $BRAIN_UNIT -f"
echo "  Health:  curl -s http://127.0.0.1:9090/health"
echo "  Stop:    systemctl --user stop $BRAIN_UNIT"
echo "  Remove:  $SCRIPT_DIR/install.sh --uninstall"
