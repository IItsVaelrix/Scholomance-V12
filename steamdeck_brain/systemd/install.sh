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
OLLAMA_BIN="$(command -v ollama || true)"

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
    echo -e "${YELLOW}⚠  ollama not on PATH. Install it first (see chip_boot.sh) — the${NC}"
    echo -e "${YELLOW}   ollama unit will fail to start until it is available.${NC}"
    OLLAMA_BIN="ollama"
fi

mkdir -p "$UNIT_DIR"

render() {  # render <template> <dest>
    sed -e "s|@PYTHON@|$PYTHON|g" \
        -e "s|@SCRIPT_DIR@|$BRAIN_DIR|g" \
        -e "s|@BRAIN_DAEMON@|$BRAIN_DAEMON|g" \
        -e "s|@OLLAMA_BIN@|$OLLAMA_BIN|g" \
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
systemctl --user enable --now "$OLLAMA_UNIT"
systemctl --user enable --now "$BRAIN_UNIT"

echo ""
echo -e "${GREEN}✔ Installed and started.${NC}"
echo "  Status:  systemctl --user status $BRAIN_UNIT"
echo "  Logs:    journalctl --user -u $BRAIN_UNIT -f"
echo "  Health:  curl -s http://127.0.0.1:9090/health"
echo "  Stop:    systemctl --user stop $BRAIN_UNIT"
echo "  Remove:  $SCRIPT_DIR/install.sh --uninstall"
