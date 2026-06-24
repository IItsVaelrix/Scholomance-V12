import subprocess
import json
import threading
import os

# ── Scholomance palette (mirrors tui/ui/app.py) ──────────────────────
GOLD    = "#FFD700"
PURPLE  = "#B388FF"
SUCCESS = "#7CFF8B"
WARNING = "#FFD166"
ERROR   = "#FF5C7A"
MUTED   = "#6A5A6A"


def _score_color(score):
    """Color-code a 0-100 match score against the palette."""
    if score > 75:
        return SUCCESS
    if score > 50:
        return WARNING
    return ERROR


class TurboQuantService:
    """Thin Python client for the Node.js TurboQuant microservice.

    Spawns turboquant_plugin.js once and talks to it over stdio using a
    JSON-lines protocol. All scoring stays local and sub-millisecond.
    Degrades gracefully (self.available == False) if Node is unavailable
    so the cockpit still launches.
    """

    def __init__(self):
        self.process = None
        self.available = False
        self.semantic = False
        self.embedder = None
        self.lock = threading.Lock()

        script_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        plugin_path = os.path.join(script_dir, "turboquant_plugin.js")

        # Resolve node via absolute path due to Steam Deck NVM env issues
        node_bin = "/home/deck/.nvm/versions/node/v20.20.2/bin/node"
        if not os.path.exists(node_bin):
            node_bin = "node"  # fallback to PATH

        try:
            self.process = subprocess.Popen(
                [node_bin, plugin_path],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                cwd=script_dir,
            )
            # Confirm the engine answers before declaring it available.
            resp = self._send({"action": "ping", "id": 0})
            self.available = resp.get("status") == "ok"
            self.semantic = bool(resp.get("semantic"))
            self.embedder = resp.get("embedder")
        except Exception:
            self.process = None
            self.available = False

    # ── transport ────────────────────────────────────────────────────
    def _send(self, payload):
        if self.process is None or self.process.poll() is not None:
            return {"status": "error", "error": "TurboQuant engine offline (Node not running)"}
        with self.lock:
            try:
                self.process.stdin.write(json.dumps(payload) + "\n")
                self.process.stdin.flush()
                line = self.process.stdout.readline()
                if line:
                    return json.loads(line)
                return {"status": "error", "error": "Node process died or returned empty"}
            except Exception as e:
                return {"status": "error", "error": str(e)}

    @staticmethod
    def _latency(resp):
        return f"{resp.get('latency_ms', 0):.2f}ms"

    # ── Golden Curve CRUD ─────────────────────────────────────────────
    def register_golden(self, name, text, callback):
        resp = self._send({"action": "register", "name": name, "text": text, "id": 1})
        if resp.get("status") == "ok":
            callback(
                f"[bold {SUCCESS}]✔ Registered Golden Curve:[/] [{GOLD}]{name}[/] "
                f"[{MUTED}]({resp.get('packed_bytes', '?')} bytes · {self._latency(resp)})[/]"
            )
        else:
            callback(f"[{ERROR}]Error:[/] {resp.get('error')}")

    def list_curves(self, callback):
        resp = self._send({"action": "list", "id": 3})
        if resp.get("status") == "ok":
            curves = resp.get("curves", [])
            if curves:
                body = "\n".join(f"  [{GOLD}]◆[/] {c}" for c in curves)
                callback(f"[bold {GOLD}]Golden Curves ({len(curves)}):[/]\n{body}")
            else:
                callback(f"[{MUTED}]No Golden Curves registered yet. Try /register-golden.[/]")
        else:
            callback(f"[{ERROR}]Error:[/] {resp.get('error')}")

    def delete_curve(self, name, callback):
        resp = self._send({"action": "delete", "name": name, "id": 8})
        if resp.get("status") == "ok":
            callback(f"[bold {SUCCESS}]✔ Deleted Golden Curve:[/] [{GOLD}]{name}[/]")
        else:
            callback(f"[{ERROR}]Error:[/] {resp.get('error')}")

    # ── scoring ───────────────────────────────────────────────────────
    def score_title(self, curve_name, title, callback):
        resp = self._send({"action": "score", "curve": curve_name, "text": title, "id": 2})
        if resp.get("status") == "ok":
            score = resp.get("match_percentage", 0)
            color = _score_color(score)
            callback(
                f"[{PURPLE}]{curve_name}[/] | '{title}' | "
                f"[bold {color}]{score}% match[/] [{MUTED}]({self._latency(resp)})[/]"
            )
        else:
            callback(f"[{ERROR}]Error:[/] {resp.get('error')}")

    def score_all_curves(self, title, callback):
        """Auto-score a title/URL against every curve, surfacing strong matches."""
        resp = self._send({"action": "search", "text": title, "k": 3, "id": 11})
        if resp.get("status") != "ok":
            return  # silent: this is a passive enrichment path
        for r in resp.get("results", []):
            score = r.get("match_percentage", 0)
            if score > 60:
                color = _score_color(score)
                callback(
                    f"[bold {GOLD}]❖ TurboQuant Match:[/] [bold {color}]{score}%[/] "
                    f"vs [{PURPLE}]{r['name']}[/]"
                )

    def test_titles(self, curve_name, titles, callback):
        results = []
        for t in titles:
            resp = self._send({"action": "score", "curve": curve_name, "text": t, "id": 4})
            if resp.get("status") == "ok":
                results.append((t, resp.get("match_percentage", 0)))
            else:
                callback(f"[{ERROR}]Error scoring '{t}':[/] {resp.get('error')}")
                return

        results.sort(key=lambda x: x[1], reverse=True)
        callback(f"[bold {GOLD}]A/B Title Rankings vs [{PURPLE}]{curve_name}[/]:[/]")
        for i, (t, score) in enumerate(results):
            color = _score_color(score)
            medal = ["①", "②", "③"][i] if i < 3 else f"{i+1}."
            callback(f"  {medal} [bold {color}]{score}%[/]  {t}")

    def search_similar(self, text, callback, k=5):
        resp = self._send({"action": "search", "text": text, "k": k, "id": 9})
        if resp.get("status") == "ok":
            results = resp.get("results", [])
            if not results:
                callback(f"[{MUTED}]No curves in registry to search.[/]")
                return
            callback(
                f"[bold {GOLD}]Top {len(results)} similar curves[/] "
                f"[{MUTED}](searched {resp.get('searched', 0)} · {self._latency(resp)}):[/]"
            )
            for i, r in enumerate(results):
                score = r.get("match_percentage", 0)
                color = _score_color(score)
                callback(f"  {i+1}. [bold {color}]{score}%[/]  [{PURPLE}]{r['name']}[/]")
        else:
            callback(f"[{ERROR}]Error:[/] {resp.get('error')}")

    # ── gap analysis ──────────────────────────────────────────────────
    def analyze_gaps(self, curve_name, text, callback):
        resp = self._send({"action": "analyze-gaps", "curve": curve_name, "text": text, "id": 5})
        if resp.get("status") == "ok":
            missing = resp.get("missing_clusters", [])
            if missing:
                tags = ", ".join(f"[{WARNING}]{m}[/]" for m in missing)
                callback(
                    f"[bold {GOLD}]Gap Analysis vs [{PURPLE}]{curve_name}[/]:[/]\n"
                    f"  [{MUTED}]Missing semantic concepts:[/] {tags}"
                )
            else:
                callback(
                    f"[bold {GOLD}]Gap Analysis vs [{PURPLE}]{curve_name}[/]:[/]\n"
                    f"  [bold {SUCCESS}]No major semantic gaps detected![/]"
                )
        else:
            callback(f"[{ERROR}]Error:[/] {resp.get('error')}")

    # ── pack import / export ──────────────────────────────────────────
    def export_pack(self, filename, callback):
        if not filename.endswith(".goldenpack"):
            filename += ".goldenpack"
        resp = self._send({"action": "export-pack", "filename": filename, "id": 6})
        if resp.get("status") == "ok":
            callback(f"[bold {SUCCESS}]✔ Pack Exported![/] Saved {resp.get('size')} curves to [{GOLD}]{filename}[/]")
        else:
            callback(f"[{ERROR}]Error exporting pack:[/] {resp.get('error')}")

    def import_pack(self, filename, callback):
        if not filename.endswith(".goldenpack"):
            filename += ".goldenpack"
        resp = self._send({"action": "import-pack", "filename": filename, "id": 7})
        if resp.get("status") == "ok":
            callback(f"[bold {SUCCESS}]✔ Pack Imported![/] Loaded {resp.get('imported')} curves from [{GOLD}]{filename}[/]")
        else:
            callback(f"[{ERROR}]Error importing pack:[/] {resp.get('error')}")

    # ── lifecycle ─────────────────────────────────────────────────────
    def shutdown(self):
        if self.process and self.process.poll() is None:
            try:
                self.process.terminate()
            except Exception:
                pass
