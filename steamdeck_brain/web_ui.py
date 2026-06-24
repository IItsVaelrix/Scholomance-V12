#!/usr/bin/env python3
"""
web_ui.py — SteamDeck Brain Web UI
===================================
Zero-dependency local web interface for the Cortex-augmented 1B model.
Designed for Steam Deck Gaming Mode browser (touch-friendly).

Usage:
  python3 web_ui.py --port 8080

Or from steamdeck_brain.py:
  python3 steamdeck_brain.py --web --port 8080
"""

import json
import os
import sys
import time
import argparse
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from steamdeck_brain.steamdeck_brain import BrainBridge


# ─── Static HTML (embedded, zero files) ──────────────────────────────────────

PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,user-scalable=no">
<title>🧠 SteamDeck Brain</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
       background:#0d1117;color:#c9d1d9;height:100vh;display:flex;flex-direction:column}
  header{background:#161b22;padding:12px 20px;border-bottom:1px solid #30363d;
         display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
  header h1{font-size:18px;font-weight:600}
  header span{font-size:12px;color:#8b949e}
  #stats-btn{background:#21262d;border:1px solid #30363d;color:#c9d1d9;
             padding:4px 12px;border-radius:6px;cursor:pointer;font-size:12px}
  #stats-panel{display:none;background:#161b22;border-bottom:1px solid #30363d;
               padding:12px 20px;font-size:13px;flex-shrink:0}
  #stats-panel.show{display:flex;gap:24px;flex-wrap:wrap}
  .stat-item{display:flex;flex-direction:column}
  .stat-label{color:#8b949e;font-size:11px;text-transform:uppercase}
  .stat-value{font-size:16px;font-weight:600}
  #chat{flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:12px}
  .msg{max-width:85%;padding:10px 14px;border-radius:12px;font-size:14px;line-height:1.5;
       word-wrap:break-word;white-space:pre-wrap}
  .msg.user{background:#1f6feb;color:#fff;align-self:flex-end;border-bottom-right-radius:4px}
  .msg.bot{background:#21262d;color:#c9d1d9;align-self:flex-start;border-bottom-left-radius:4px}
  .msg.error{background:#3d1f1f;color:#ff7b72;align-self:flex-start}
  .msg .meta{font-size:10px;color:#8b949e;margin-top:4px}
  .typing{color:#8b949e;font-style:italic;padding:10px 14px;font-size:14px}
  #input-row{display:flex;gap:8px;padding:12px 20px;background:#161b22;
             border-top:1px solid #30363d;flex-shrink:0}
  #input{flex:1;background:#0d1117;border:1px solid #30363d;border-radius:8px;
         padding:10px 14px;color:#c9d1d9;font-size:14px;outline:none}
  #input:focus{border-color:#1f6feb}
  #send-btn{background:#1f6feb;border:none;border-radius:8px;color:#fff;
            padding:10px 20px;font-size:14px;font-weight:600;cursor:pointer}
  #send-btn:disabled{opacity:0.5;cursor:not-allowed}
  @media(max-width:600px){header h1{font-size:15px}#chat{padding:12px}.msg{max-width:90%}}
</style>
</head>
<body>
<header>
  <div><h1>🧠 SteamDeck Brain</h1><span id="model-label">phi3:mini</span></div>
  <button id="stats-btn" onclick="toggleStats()">📊 Stats</button>
</header>
<div id="stats-panel">
  <div class="stat-item"><span class="stat-label">Memories</span><span class="stat-value" id="s-mem">-</span></div>
  <div class="stat-item"><span class="stat-label">L1 Cache</span><span class="stat-value" id="s-l1">-</span></div>
  <div class="stat-item"><span class="stat-label">Queries</span><span class="stat-value" id="s-q">-</span></div>
  <div class="stat-item"><span class="stat-label">Turns</span><span class="stat-value" id="s-t">-</span></div>
  <div class="stat-item"><span class="stat-label">Compression</span><span class="stat-value" id="s-c">-</span></div>
</div>
<div id="chat">
  <div class="msg bot">🧠 Cortex booted. Ask me anything — I have external memory.</div>
</div>
<div id="input-row">
  <input id="input" type="text" placeholder="Ask something..." autofocus>
  <button id="send-btn" onclick="send()">Send</button>
</div>
<script>
const modelLabel = document.getElementById('model-label');
let abortController = null;

document.getElementById('input').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}});

async function send(){
  const input=document.getElementById('input');
  const btn=document.getElementById('send-btn');
  const chat=document.getElementById('chat');
  const q=input.value.trim();
  if(!q)return;
  input.value='';
  btn.disabled=true;
  
  // user message
  const userDiv=document.createElement('div');
  userDiv.className='msg user';
  userDiv.textContent=q;
  chat.appendChild(userDiv);
  
  // typing indicator
  const typing=document.createElement('div');
  typing.className='typing';
  typing.textContent='🧠 thinking...';
  chat.appendChild(typing);
  chat.scrollTop=chat.scrollHeight;
  
  try{
    const res=await fetch('/api/ask',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({query:q})
    });
    const data=await res.json();
    typing.remove();
    const botDiv=document.createElement('div');
    botDiv.className=data.error?'msg error':'msg bot';
    botDiv.textContent=data.response||data.error;
    if(data.memories){
      const meta=document.createElement('div');
      meta.className='meta';
      meta.textContent=`${data.memories} memories injected`;
      botDiv.appendChild(meta);
    }
    chat.appendChild(botDiv);
  }catch(e){
    typing.remove();
    const errDiv=document.createElement('div');
    errDiv.className='msg error';
    errDiv.textContent='Network error';
    chat.appendChild(errDiv);
  }
  btn.disabled=false;
  chat.scrollTop=chat.scrollHeight;
  input.focus();
}

async function toggleStats(){
  const panel=document.getElementById('stats-panel');
  panel.classList.toggle('show');
  if(panel.classList.contains('show')){
    try{
      const res=await fetch('/api/stats');
      const d=await res.json();
      const l2=d.L2_substrate||{};
      const l1=d.L1_cache||{};
      document.getElementById('s-mem').textContent=l2.total||0;
      document.getElementById('s-l1').textContent=`${l1.size||0}/${l1.max_size||16}`;
      document.getElementById('s-q').textContent=d.queries_served||0;
      document.getElementById('s-t').textContent=d.conversation_turns||0;
      document.getElementById('s-c').textContent=l2.compression_ratio||'-';
    }catch(e){}
  }
}

// Connect stats toggle to keyboard shortcut
document.addEventListener('keydown',e=>{if(e.key==='s'&&e.ctrlKey){e.preventDefault();toggleStats()}});
</script>
</body>
</html>"""


# ─── HTTP Handler ────────────────────────────────────────────────────────────

class BrainHandler(BaseHTTPRequestHandler):
    """HTTP handler for the SteamDeck Brain web interface."""

    bridge: Optional[BrainBridge] = None

    def do_GET(self):
        if self.path == "/" or self.path == "/index.html":
            self._serve_page()
        elif self.path == "/api/stats":
            self._serve_stats()
        else:
            self._json(404, {"error": "not found"})

    def do_POST(self):
        if self.path == "/api/ask":
            self._handle_ask()
        else:
            self._json(404, {"error": "not found"})

    def _serve_page(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(PAGE.encode("utf-8"))

    def _serve_stats(self):
        if not self.bridge:
            self._json(200, {})
            return
        try:
            stats = self.bridge.get_stats()
            self._json(200, stats)
        except Exception as e:
            self._json(500, {"error": str(e)})

    def _handle_ask(self):
        if not self.bridge:
            self._json(503, {"error": "bridge not initialized"})
            return

        try:
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)
            data = json.loads(body)
            query = data.get("query", "").strip()
            if not query:
                self._json(400, {"error": "empty query"})
                return

            response = self.bridge.ask(query, show_context=False)
            # Get how many memories were used (from stats)
            stats = self.bridge.get_stats()

            self._json(200, {
                "response": response,
                "memories": stats.get("queries_served", 0),
                "model": self.bridge.model.model if hasattr(self.bridge, 'model') else "unknown"
            })
        except Exception as e:
            self._json(500, {"error": str(e)})

    def _json(self, status: int, data: dict):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def log_message(self, format, *args):
        """Suppress default HTTP logs for cleaner output."""
        pass


def run_web_ui(
    model: str = "phi3:mini",
    substrate_db: str = "~/.substrate/memory.sqlite",
    top_k: int = 5,
    temperature: float = 0.7,
    max_tokens: int = 512,
    personality: Optional[str] = None,
    multi_hop: bool = True,
    l1_size: int = 16,
    ollama_host: str = "http://localhost:11434",
    port: int = 8080
):
    """Start the web UI server."""

    # Build bridge
    print("🧠 Initializing BrainBridge for web UI...")
    bridge = BrainBridge(
        model=model,
        substrate_db=substrate_db,
        top_k=top_k,
        temperature=temperature,
        max_tokens=max_tokens,
        ollama_host=ollama_host,
        personality=personality,
        multi_hop=multi_hop,
        l1_size=l1_size
    )

    # Inject bridge into handler
    BrainHandler.bridge = bridge

    # Start server
    server = HTTPServer(("0.0.0.0", port), BrainHandler)
    print(f"🌐 Serving at http://localhost:{port}")
    print(f"   (Access from Steam Deck Gaming Mode browser)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
        server.server_close()


def main():
    parser = argparse.ArgumentParser(description="SteamDeck Brain Web UI")
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--model", default="phi3:mini")
    parser.add_argument("--personality", "-p", default=None)
    parser.add_argument("--no-multi-hop", action="store_true")
    args = parser.parse_args()

    run_web_ui(
        model=args.model,
        personality=args.personality,
        multi_hop=not args.no_multi_hop,
        port=args.port
    )


if __name__ == "__main__":
    main()
