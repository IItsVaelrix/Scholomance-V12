import subprocess
import json
import threading
import os

GOLD    = "#FFD700"
PURPLE  = "#B388FF"
SUCCESS = "#7CFF8B"
WARNING = "#FFD166"
ERROR   = "#FF5C7A"
MUTED   = "#6A5A6A"


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


class CleriBridge:
    def __init__(self):
        self.available = False
        try:
            result = _run("stats")
            self.available = "error" not in result
        except Exception:
            self.available = False

    def scan(self, text, callback):
        def run():
            result = _run("scan", text)
            self._format_result("SCAN", result, callback)
        threading.Thread(target=run).start()

    def diagnose(self, report_path, callback):
        def run():
            result = _run("diagnose", report_path)
            self._format_result("DIAGNOSE", result, callback)
        threading.Thread(target=run).start()

    def train(self, pattern_path, callback):
        def run():
            result = _run("train", pattern_path)
            self._format_result("TRAIN", result, callback)
        threading.Thread(target=run).start()

    def stats(self, callback):
        def run():
            result = _run("stats")
            self._format_result("STATS", result, callback)
        threading.Thread(target=run).start()

    def agent_query(self, agent_key, report_path, callback):
        def run():
            result = _run("agent-query", agent_key, report_path)
            self._format_result(f"AGENT-QUERY ({agent_key})", result, callback)
        threading.Thread(target=run).start()

    def merlin_ingest(self, report_path, callback, no_train=False):
        def run():
            args = ["--report", report_path]
            if no_train:
                args.append("--no-train")
            result = _run("merlin-ingest", *args)
            self._format_result("MERLIN-INGEST", result, callback)
        threading.Thread(target=run).start()

    def cluster(self, callback, min_sim=0.92):
        def run():
            result = _run("cluster", f"--min-sim={min_sim}")
            self._format_result("CLUSTER", result, callback)
        threading.Thread(target=run).start()

    def duplicates(self, callback, min_sim=0.97):
        def run():
            result = _run("duplicates", f"--min-sim={min_sim}")
            self._format_result("DUPLICATES", result, callback)
        threading.Thread(target=run).start()

    def maintenance(self, callback):
        def run():
            result = _run("maintenance")
            self._format_result("MAINTENANCE", result, callback)
        threading.Thread(target=run).start()

    def feedback(self, pattern_id, confirm, callback):
        def run():
            flag = "--confirm" if confirm else "--reject"
            result = _run("feedback", "--pattern", pattern_id, flag)
            self._format_result("FEEDBACK", result, callback)
        threading.Thread(target=run).start()

    def probe(self, text, callback, mode="prion", min_resonance=0.75):
        def run():
            result = _run("probe", text, f"--mode={mode}", f"--min-resonance={min_resonance}")
            self._format_result("PROBE", result, callback)
        threading.Thread(target=run).start()

    def rebuild_index(self, callback):
        def run():
            result = _run("rebuild-index")
            self._format_result("REBUILD-INDEX", result, callback)
        threading.Thread(target=run).start()

    def _format_result(self, label, result, callback):
        if "error" in result:
            callback(f"[{ERROR}]❖ {label} ERROR ❖[/]\n[{ERROR}]{result['error']}[/]")
            return
        try:
            formatted = json.dumps(result, indent=2, default=str)
            if len(formatted) > 3000:
                formatted = formatted[:3000] + "\n... [truncated]"
            callback(f"\n[bold {GOLD}]❖ {label} ❖[/]\n[#{PURPLE}]{formatted}[/]")
        except Exception as e:
            callback(f"[{ERROR}]❖ {label} — display error: {e}[/]")

    def raw_query(self, command, args_list, callback):
        def run():
            result = _run(command, *args_list)
            if "error" in result:
                callback(f"[{ERROR}]❖ {command.upper()} ERROR ❖[/]\n[{ERROR}]{result['error']}[/]")
            else:
                formatted = json.dumps(result, indent=2, default=str)
                if len(formatted) > 3000:
                    formatted = formatted[:3000] + "\n... [truncated]"
                callback(f"\n[bold {GOLD}]❖ {command.upper()} ❖[/]\n[#{PURPLE}]{formatted}[/]")
        threading.Thread(target=run).start()
