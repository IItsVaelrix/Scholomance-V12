#!/usr/bin/env python3
"""
brain_daemon.py — HTTP Server Daemon for SteamDeck Brain
========================================================
Keeps the Cortex + Ollama bridge alive in a persistent process.

Run this once at startup. The DivTube TUI connects via HTTP instead of
spawning fresh Python processes each query.

Architecture:
  - Cortex (L1/L2 substrate + multi-hop) stays warm
  - Ollama connection pooled
  - HTTP API on localhost:9090

Usage:
  python3 brain_daemon.py --model phi3:mini --port 9090   # foreground

To keep it on at all times (independent of DivTube, surviving crashes and
reboots), install it as a systemd --user service:
  ./systemd/install.sh

Clients use brain_bridge.BrainBridgeClient for transparent queries.
"""

import argparse
import json
import os
import sys
import signal
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Optional

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from steamdeck_brain import BrainBridge

# ─── Config ──────────────────────────────────────────────────────────────────

DEFAULT_PORT = 9090
DEFAULT_MODEL = "qwen2.5:1.5b"  # 1.5B fits Steam Deck 16 GB; 9B OOMs on subsequent loads

# Global bridge (single instance)
_bridge: Optional[BrainBridge] = None

# ─── HTTP Handler ────────────────────────────────────────────────────────────

class DaemonHandler(BaseHTTPRequestHandler):
    """HTTP handler for Cortex queries."""

    def log_message(self, format, *args):
        # Suppress default HTTP logs
        pass

    def _send_json(self, status: int, data: dict):
        try:
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(data).encode("utf-8"))
        except ConnectionError:
            print("⚠️  Warning: Client disconnected before response could be sent.")

    def do_GET(self):
        if self.path == "/health":
            from vaelrix_tools import TOOL_REGISTRY, _file_cache
            self._send_json(200, {
                "status": "ok",
                "model": _bridge.model.model if _bridge else "not ready",
                "tools": len(TOOL_REGISTRY),
                "file_cache": _file_cache.stats()
            })
        elif self.path == "/stats":
            if _bridge:
                self._send_json(200, _bridge.get_stats())
            else:
                self._send_json(503, {"error": "Bridge not initialized"})
        else:
            self._send_json(404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/ask":
            self._send_json(404, {"error": "not found"})
            return

        if not _bridge:
            self._send_json(503, {"error": "Bridge not initialized"})
            return

        try:
            length = int(self.headers.get("Content-Length", 0))
            if length > 10 * 1024 * 1024:
                self._send_json(413, {"error": "PB-ERR-v1-STATE-MAJOR-BRAIN-413--Payload Too Large"})
                return

            body = self.rfile.read(length)
            try:
                data = json.loads(body)
            except json.JSONDecodeError as e:
                self._send_json(400, {"error": f"PB-ERR-v1-STATE-MAJOR-BRAIN-400--Invalid JSON: {str(e)}"})
                return

            query = data.get("query", "")
            show_context = data.get("show_context", False)
            compare = data.get("compare", False)
            multi_hop = data.get("multi_hop", True)

            if not query:
                self._send_json(400, {"error": "empty query"})
                return

            if compare:
                response = _bridge.ask_direct(query)
            else:
                response = _bridge.ask(query, show_context=show_context)

            stats = _bridge.get_stats()
            self._send_json(200, {
                "response": response,
                "memories": stats.get("queries_served", stats.get("L2_substrate", {}).get("total", 0)),
                "model": _bridge.model.model if hasattr(_bridge, 'model') else DEFAULT_MODEL
            })

        except Exception as e:
            self._send_json(500, {"error": f"PB-ERR-v1-STATE-CRITICAL-BRAIN-500--{str(e)}"})


def run_server(port: int = DEFAULT_PORT, model: str = DEFAULT_MODEL, 
               substrate_db: str = "~/.substrate/memory.sqlite",
               top_k: int = 5, multi_hop: bool = True,
               ollama_host: str = "http://localhost:11434",
               personality: str = None):
    """Start the HTTP daemon."""
    global _bridge

    print("🧠 Initializing BrainBridge (daemon mode)...")
    _bridge = BrainBridge(
        model=model,
        substrate_db=substrate_db,
        top_k=top_k,
        multi_hop=multi_hop,
        ollama_host=ollama_host,
        personality=personality
    )

    server = HTTPServer(("127.0.0.1", port), DaemonHandler)
    print(f"🌐 Brain daemon listening on http://127.0.0.1:{port}")
    print(f"   Model: {model} | Substrate: {substrate_db}")
    print(f"   Ready: POST JSON to /ask with {{'query': '...'}}")

    # Handle graceful shutdown
    def shutdown(signum, frame):
        print("\n🛑 Shutting down daemon...")
        server.shutdown()

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


def main():
    parser = argparse.ArgumentParser(description="SteamDeck Brain HTTP Daemon")
    parser.add_argument("--port", "-p", type=int, default=DEFAULT_PORT)
    parser.add_argument("--model", "-m", default=DEFAULT_MODEL)
    parser.add_argument("--db", default="~/.substrate/memory.sqlite")
    parser.add_argument("--top-k", "-k", type=int, default=5)
    parser.add_argument("--ollama-host", default="http://localhost:11434")
    parser.add_argument("--personality", "-P", default=None, help="Persona to load (e.g. Vaelrix)")
    parser.add_argument("--no-multi-hop", action="store_true")
    args = parser.parse_args()

    run_server(
        port=args.port,
        model=args.model,
        substrate_db=args.db,
        top_k=args.top_k,
        multi_hop=not args.no_multi_hop,
        ollama_host=args.ollama_host,
        personality=args.personality
    )


if __name__ == "__main__":
    main()