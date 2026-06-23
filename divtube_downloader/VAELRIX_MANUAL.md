# Vaelrix — SteamDeck Brain Manual

Vaelrix is the AI headmaster of the Scholomance, running locally on your Steam Deck.
It answers questions, executes tools (53 registered), and maintains persona-consistent
memory via the Cortex substrate engine.

---

## Architecture

```
┌──────────────┐     POST /ask     ┌───────────────┐     HTTP /api/generate    ┌──────────────┐
│  DivTube TUI  │ ────────────────→ │  Brain Daemon  │ ────────────────────────→ │    Ollama     │
│  /vaelrix hi  │                  │  :9090 (HTTP)   │                           │   :11434      │
└──────────────┘                   │  Python 3.13    │                           │  llama-server │
                                   └───────┬─────────┘                           └──────┬───────┘
                                           │                                            │
                                           │  Cortex (L1/L2 cache)                      │
                                           │  10,316 substrate memories                 │
                                           │  Multi-hop retrieval                       │
                                           │  Action Engine (53 tools)                  │
                                           └────────────────────────────────────────────┘
```

**Entry points:**

| Command | What it does |
|---|---|
| `npm run vaelrix` | Interactive Vaelrix CLI session |
| `npm run vaelrix -- -q "question"` | One-shot query |
| `npm run vaelrix:web` | Web UI on `:8080` |
| `/vaelrix <question>` | Ask from DivTube TUI's Vaelrix tab |
| `curl -X POST :9090/ask -d '{"query":"..."}'` | Raw HTTP to daemon |

---

## Prerequisites

### 1. Ollama — installed on a big drive, never on the system SSD

The Steam Deck's internal 5 GB `/.ROOTFS_RW` fills instantly with model blobs.
Always install Ollama to `/home/deck/ollama/` (the 458 GB deck home drive) or
`/run/media/deck/<DRIVE>/ollama/` (SD card).

**Preferred: systemd auto-installer (handles everything)**

```bash
cd steamdeck_brain/systemd
OLLAMA_BIN=/home/deck/ollama/bin/ollama ./install.sh
```

This writes systemd user units (`scholomance-ollama.service`,
`scholomance-brain.service`) that auto-install Ollama on first boot, keep the
daemon alive, and survive reboots.

**Manual: one-shot tarball install**

```bash
curl -fSL https://github.com/ollama/ollama/releases/latest/download/ollama-linux-amd64.tar.zst \
  -o /tmp/ollama.tar.zst
mkdir -p /home/deck/ollama-tmp
cd /home/deck/ollama-tmp
tar --zstd -xf /tmp/ollama.tar.zst
mkdir -p /home/deck/ollama
mv bin lib /home/deck/ollama/
rm -rf /home/deck/ollama-tmp /tmp/ollama.tar.zst
```

### 2. Models

Any Ollama-compatible GGUF model works. The smaller the model, the faster the
load and the less RAM pressure.

| Model | Size | Load time | Steam Deck fit |
|---|---|---|---|
| `qwen2.5:1.5b` | 986 MB | ~2s | Comfortable (default) |
| `phi3:mini` | 2.2 GB | ~5s | Works |
| `qwen3.5:9b` | 6.3 GB | ~20s | OOMs on subsequent loads |

**Default is `qwen2.5:1.5b`.** The 9B model _can_ generate but the Steam Deck's
16 GB shared RAM runs out of headroom after 1-2 loads, causing the llama-server
worker to receive SIGTERM and the daemon to return "Internal Server Error."

Pull a model:

```bash
ollama pull qwen2.5:1.5b
```

### 3. Python dependencies

The brain daemon needs `rich`, `numpy`, and `faiss`. If they aren't installed
system-wide, the daemon prints import errors at startup.

---

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `OLLAMA_BIN` | `/home/deck/ollama/bin/ollama` | Path to ollama binary |
| `OLLAMA_MODELS` | `/home/deck/.ollama/models` | Model storage directory |
| `OLLAMA_HOST` | `http://127.0.0.1:11434` | Ollama server address |
| `VAELRIX_MODEL` | `qwen2.5:1.5b` | Model for `npm run vaelrix` |
| `BRAIN_MODEL` | `qwen3.5:9b` (old default) | Model for the systemd daemon unit |
| `BRAIN_PORT` | `9090` | Port for the brain daemon |
| `BRAIN_DB` | `~/.substrate/memory.sqlite` | Cortex substrate database |

These are persisted to `~/.config/scholomance-brain.env` by `install.sh` and
sourced by `scripts/launch-vaelrix.sh` so `npm run vaelrix` picks them up
without re-exporting.

---

## Usage

### npm run vaelrix (interactive session)

```bash
npm run vaelrix
```

Boots Cortex (10,316 memories), loads the Vaelrix persona, connects to Ollama,
and opens an interactive prompt. Type `/help` inside the session for brain
commands.

```bash
# One-shot query
npm run vaelrix -- -q "What is the Crucible?"

# Custom temp + token limit
npm run vaelrix -- -q "Explain soulfire" --temp 0.3 --max-tokens 256

# Override model for one run
VAELRIX_MODEL=qwen3.5:9b npm run vaelrix -- -q "Deep analysis of chronomancy"
```

### DivTube TUI /vaelrix

1. Open DivTube
2. Click the **Vaelrix** tab
3. Type `/vaelrix What is soulfire?`

The daemon must be running on `:9090`. If DivTube can't reach it, it prints a
helpful error message with the port and connection details.

### Raw HTTP to the daemon

```bash
# Health check
curl -s http://localhost:9090/health

# Ask a question
curl -s --max-time 60 -X POST http://localhost:9090/ask \
  -H "Content-Type: application/json" \
  -d '{"query": "What is soulfire?"}'

# Stats
curl -s http://localhost:9090/stats
```

---

## Starting / Stopping

### From DivTube

```
/daemon-start    # Start the brain daemon on :9090
/daemon-stop     # Stop the brain daemon
```

### Manually

```bash
# Start daemon
cd steamdeck_brain
python3 brain_daemon.py --model qwen2.5:1.5b --port 9090 &
disown

# Start ollama
OLLAMA_MODELS=/home/deck/.ollama/models \
  /home/deck/ollama/bin/ollama serve &
disown

# Kill everything
pkill -9 -f 'brain_daemon.py'
pkill -9 -f 'ollama serve'
```

### Systemd (always-on)

```bash
systemctl --user start scholomance-ollama scholomance-brain
systemctl --user status scholomance-ollama scholomance-brain
```

---

## Files Reference

| Path | Purpose |
|---|---|
| `steamdeck_brain/brain_daemon.py` | HTTP daemon, /ask endpoint, health check |
| `steamdeck_brain/steamdeck_brain.py` | Interactive CLI brain session |
| `steamdeck_brain/brain_bridge_client.py` | Python HTTP client for the daemon |
| `steamdeck_brain/cortex.py` | L1/L2 memory hierarchy + substrate |
| `steamdeck_brain/action_engine.py` | Tool dispatch (53 tools registered) |
| `steamdeck_brain/embed_providers.py` | Hybrid embedding provider |
| `steamdeck_brain/substrate_engine.py` | Substrate knowledge store |
| `steamdeck_brain/chip_boot.sh` | One-shot bootstrap (Ollama + model + substrate seed) |
| `steamdeck_brain/systemd/install.sh` | Systemd unit installer |
| `steamdeck_brain/systemd/ensure-ollama.sh` | Auto-download Ollama if missing |
| `scripts/launch-vaelrix.sh` | `npm run vaelrix` entry point |
| `divtube_downloader/tui/ui/app.py` | `/vaelrix` command handler |
| `divtube_downloader/tui/ui/layout.py` | Vaelrix tab layout |
| `divtube_downloader/tui/services/brain_bridge_service.py` | Brain daemon control (start/stop) |
| `divtube_downloader/tui/services/brain_bridge_service.py` | Brain daemon management |

---

## Troubleshooting

### "Internal Server Error" on every request

The Ollama llama-server worker is dying. Causes:

1. **9B model on 16 GB RAM.** Switch to `qwen2.5:1.5b`. The 9B model loads but
   the worker OOMs on the second or third invocation when memory fragmentation
   prevents re-allocation.
2. **Stale `/usr/local/lib/ollama/llama-server`.** If a previous Ollama install
   left a broken binary at `/usr/local/lib/ollama/`, symlink it to the working
   install:
   ```bash
   sudo rm -rf /usr/local/lib/ollama
   sudo ln -sf /home/deck/ollama/lib/ollama /usr/local/lib/ollama
   ```
3. **systemd restart loop.** The `scholomance-ollama.service` is SIGTERM-ing and
   restarting the Ollama process in a loop, killing every model load. Stop it:
   ```bash
   systemctl --user stop scholomance-ollama
   ```

### "Daemon unavailable" in DivTube

1. Restart the DivTube TUI after code changes.
2. Verify the daemon is on `:9090`:
   ```bash
   curl -s http://localhost:9090/health
   ```

### Port already in use (OSError 98)

Something is squatting on the port — usually a previous daemon instance or a
TIME_WAIT socket from a killed process.

```bash
pkill -9 -f 'brain_daemon.py'
sleep 3
# If still blocked, use a different port:
python3 brain_daemon.py --model qwen2.5:1.5b --port 9092 &
```

### Cold boot / slow first response

When the model hasn't been loaded recently, the first request includes a ~2s
model load (qwen2.5:1.5b) or ~20s (qwen3.5:9b). Subsequent requests are fast
as long as the model stays in RAM (Ollama `keep_alive` default: 5 minutes).

### Model not found

You pulled models to `/home/deck/.ollama/models` but Ollama can't find them.
Set `OLLAMA_MODELS` to match:

```bash
# Check where models actually are
ollama list
# If empty, set the path and re-pull
OLLAMA_MODELS=/home/deck/.ollama/models ollama pull qwen2.5:1.5b
```

### Missing Python dependencies

```
ModuleNotFoundError: No module named 'rich'
```

```bash
pip3 install --user rich numpy faiss-cpu
```

---

## Tips

- The daemon exposes `/health` and `/stats` for monitoring. Wire these to your
  dashboard or heartbeat.
- The daemon's `POST /ask` body accepts `{"query": "...", "show_context": true}`
  to include the full Cortex retrieval chain in the response.
- Set `VAELRIX_MODEL=qwen3.5:9b` for one-shot deep analysis (expect ~30s
  response time and watch for OOM). Switch back to `1.5b` for daily use.
- The 53-tool Action Engine lets Vaelrix execute shell commands, read files,
  and interact with the codebase. Tools are defined in `vaelrix_tools.py`.
- `DISPLAY=:0` is needed if running outside the normal desktop session;
  systemd units handle this automatically.
