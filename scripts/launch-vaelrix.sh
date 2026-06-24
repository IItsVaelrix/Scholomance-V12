#!/usr/bin/env bash
# ============================================================================
# launch-vaelrix.sh — start the Vaelrix (SteamDeck Brain) interactive session
# ============================================================================
# Wraps the python entry point so `npm run vaelrix [-- <brain-args>]` Just
# Works from a fresh shell. The brain needs three things to be in shape
# before its CLI can talk to the Ollama bridge:
#
#   1. OLLAMA_BIN — the ollama binary location (from
#      ~/.config/scholomance-brain.env, or fall back to the big-drive
#      install at /home/deck/ollama/bin/ollama).
#   2. PATH — must contain dirname(OLLAMA_BIN) so the brain can spawn
#      `ollama` for list/pull/show checks. The systemd unit gets this
#      for free; the interactive session needs it injected.
#   3. python3 — system /usr/bin/python3 is fine; the launcher is
#      intentionally tolerant of missing pip deps so a clean checkout
#      still launches (and the brain prints its own import error if
#      `rich` / `numpy` / `faiss` aren't installed).
#
# All extra args after `--` are passed through to steamdeck_brain.py
# unchanged, so `npm run vaelrix -- -q "what is soulfire?"` works.
# ============================================================================
set -euo pipefail

# Repo root = one level up from scripts/.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRAIN_DIR="${REPO_ROOT}/steamdeck_brain"

# Pull the persisted env if install.sh has run.
ENV_FILE="${HOME}/.config/scholomance-brain.env"
if [[ -f "${ENV_FILE}" ]]; then
    set -a
    # shellcheck disable=SC1090
    . "${ENV_FILE}"
    set +a
fi

# Resolve OLLAMA_BIN: env override → persisted env file → big-drive default.
if [[ -z "${OLLAMA_BIN:-}" ]] || [ ! -x "${OLLAMA_BIN}" ]; then
    for cand in \
        /home/deck/ollama/bin/ollama \
        "${HOME}/ollama/bin/ollama" \
        "/run/media/deck"/*/ollama/bin/ollama; do
        if [ -x "${cand}" ]; then
            OLLAMA_BIN="${cand}"
            break
        fi
    done
fi

if [[ -z "${OLLAMA_BIN:-}" ]] || [ ! -x "${OLLAMA_BIN}" ]; then
    echo "vaelrix: ollama binary not found." >&2
    echo "  Run scripts/install.sh on the systemd path, or:" >&2
    echo "  curl -fSL https://github.com/ollama/ollama/releases/latest/download/ollama-linux-amd64.tar.zst \\" >&2
    echo "    | tar --zstd -x -C /run/media/deck/<DRIVE>/" >&2
    echo "  export OLLAMA_BIN=/run/media/deck/<DRIVE>/ollama/bin/ollama" >&2
    exit 1
fi

# Prepend the ollama bin dir to PATH so the brain can spawn `ollama`.
export OLLAMA_BIN
export PATH="$(dirname "${OLLAMA_BIN}"):${PATH}"

# Vaelrix defaults: headmaster persona + the Qwen 3.5 9B model the brain
# service is configured for. Both can be overridden via env or by passing
# --personality / --model as brain args after `--`.
# Default to 1.5B for Steam Deck reliability. The 9B model works but the
# llama-server worker OOMs on subsequent loads with ~6.3 GB VRAM pressure
# on the 16 GB shared APU. Override with: VAELRIX_MODEL=qwen3.5:9b
: "${VAELRIX_MODEL:=qwen2.5:1.5b}"
export VAELRIX_MODEL

cd "${BRAIN_DIR}"
echo "vaelrix: ${OLLAMA_BIN} (model: ${VAELRIX_MODEL})"
exec python3 steamdeck_brain.py \
    --personality Vaelrix \
    --model "${VAELRIX_MODEL}" \
    "$@"
