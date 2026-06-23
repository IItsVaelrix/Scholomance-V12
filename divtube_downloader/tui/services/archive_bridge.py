import subprocess
import json
import threading
import os

GOLD    = "#FFD700"
PURPLE  = "#B388FF"
SUCCESS = "#7CFF8B"
WARNING = "#FFD166"
ERROR   = "#FF5C7A"
MUTED   = "#6B7280"


def _node_bin():
    n = "/home/deck/.nvm/versions/node/v20.20.2/bin/node"
    if os.path.exists(n):
        return n
    return "node"


def _bridge_script():
    d = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    return os.path.join(d, "scripts", "scholomance-bridge.mjs")


def _run(command, *args, timeout=30):
    script = _bridge_script()
    node = _node_bin()
    cmd = [node, script, command] + list(args)
    try:
        proc = subprocess.run(
            cmd, capture_output=True, text=True, timeout=timeout,
            cwd=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        )
        if proc.returncode != 0:
            return {"error": proc.stderr.strip() or f"exit code {proc.returncode}"}
        return json.loads(proc.stdout)
    except subprocess.TimeoutExpired:
        return {"error": "Command timed out"}
    except json.JSONDecodeError as e:
        return {"error": f"JSON parse error: {e}", "raw": proc.stdout[:500] if 'proc' in dir() else ""}
    except Exception as e:
        return {"error": str(e)}


class ArchiveBridge:
    def __init__(self):
        self.files_count = 0
        self.available = False
        try:
            result = _run("archive-files")
            if "error" not in result:
                self.files_count = result.get("count", 0)
                self.available = True
        except Exception:
            self.available = False

    def list_files(self, callback):
        def run():
            result = _run("archive-files")
            if "error" in result:
                callback(f"[{ERROR}]❖ ARCHIVE ERROR ❖[/]\n[{ERROR}]{result['error']}[/]")
                return
            count = result.get("count", 0)
            files = result.get("files", [])
            self.files_count = count
            lines = [f"\n[bold {GOLD}]❖ ARCHIVE — {count} FILES ❖[/]"]
            for f in files[:200]:
                lines.append(f"  [{PURPLE}]📜[/] {f}")
            if count > 200:
                lines.append(f"  [{MUTED}]... and {count - 200} more[/]")
            callback("\n".join(lines))
        threading.Thread(target=run).start()

    def search(self, query, callback):
        def run():
            result = _run("archive-search", query)
            if "error" in result:
                callback(f"[{ERROR}]❖ SEARCH ERROR ❖[/]\n[{ERROR}]{result['error']}[/]")
                return
            count = result.get("count", 0)
            results = result.get("results", [])
            lines = [f"\n[bold {GOLD}]❖ SEARCH — \"{query}\" ({count} matches) ❖[/]"]
            for r in results[:50]:
                icon = "📄" if r.get("match") == "path" else "🔍"
                lines.append(f"  [{PURPLE}]{icon}[/] {r['file_path']} [{MUTED}]({r.get('match', '?')})[/]")
            if count > 50:
                lines.append(f"  [{MUTED}]... and {count - 50} more[/]")
            callback("\n".join(lines))
        threading.Thread(target=run).start()

    def neighbors(self, file_path, callback):
        def run():
            result = _run("archive-neighbors", file_path)
            if "error" in result:
                callback(f"[{ERROR}]❖ NEIGHBORS ERROR ❖[/]\n[{ERROR}]{result['error']}[/]")
                return
            focus = result.get("focus", file_path)
            count = result.get("count", 0)
            neighbors = result.get("neighbors", [])
            lines = [f"\n[bold {GOLD}]❖ NEIGHBORS — {count} files near[/] [{PURPLE}]{focus}[/]"]
            for n in neighbors[:30]:
                rel = n.get("relation", "?")
                icon = "📎" if rel == "sibling" else "🔗"
                lines.append(f"  [{PURPLE}]{icon}[/] {n['file_path']} [{MUTED}]({rel})[/]")
            if count > 30:
                lines.append(f"  [{MUTED}]... and {count - 30} more[/]")
            callback("\n".join(lines))
        threading.Thread(target=run).start()

    def search_paths(self, query, limit=200):
        """Synchronous path search returning a plain list of file paths.

        Used by the @ file picker; runs on a worker thread so the caller is
        responsible for threading. Returns [] on error or empty query.
        """
        if not query or not query.strip():
            return []
        result = _run("archive-search", query.strip())
        if "error" in result:
            return []
        return [r["file_path"] for r in result.get("results", [])[:limit]
                if r.get("file_path")]

    def list_paths(self, limit=2000):
        """Synchronous full-archive listing returning a plain list of paths."""
        result = _run("archive-files")
        if "error" in result:
            return []
        return result.get("files", [])[:limit]

    def status(self, callback):
        callback(
            f"[{SUCCESS}]● ARCHIVE: [{PURPLE}]{self.files_count}[/] indexed files "
            f"| Bridge: [{'ONLINE' if self.available else 'OFFLINE'}][/]"
        )
