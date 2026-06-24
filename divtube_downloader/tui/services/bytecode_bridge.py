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


class BytecodeHealthBridge:
    def __init__(self):
        self.last_signal = None
        self.signal_count = 0
        self.available = False
        try:
            result = _run("health-verify", "IMMUNE_CELL", "BRIDGE_INIT")
            self.available = "error" not in result
        except Exception:
            self.available = False

    def emit(self, cell_id, check_id, callback, module_id=None):
        def run():
            args = [cell_id, check_id]
            if module_id:
                args.extend(["--module", module_id])
            result = _run("health", *args)
            if "error" not in result:
                self.last_signal = result
                self.signal_count += 1
            self._format_health(result, callback)
        threading.Thread(target=run).start()

    def verify_determinism(self, cell_id, check_id, callback):
        def run():
            result = _run("health-verify", cell_id, check_id)
            self._format_verify(result, callback)
        threading.Thread(target=run).start()

    def status(self, callback):
        def run():
            lines = []
            lines.append(f"\n[bold {GOLD}]❖ BYTECODE HEALTH STATUS ❖[/]")
            if self.last_signal:
                bc = self.last_signal.get("bytecode", "N/A")
                code = self.last_signal.get("code", "N/A")
                lines.append(f"  [{SUCCESS}]●[/] Last Signal: [{PURPLE}]{code}[/]")
                lines.append(f"  [{MUTED}]   Bytecode:[/] [{PURPLE}]{bc}[/]")
            else:
                lines.append(f"  [{WARNING}]○[/] No signals emitted yet")
            lines.append(f"  [{SUCCESS}]●[/] Signal Count: [{PURPLE}]{self.signal_count}[/]")
            lines.append(f"  [{SUCCESS}]●[/] Bridge: [{PURPLE}]{'ONLINE' if self.available else 'OFFLINE'}[/]")
            callback("\n".join(lines))
        threading.Thread(target=run).start()

    def _format_health(self, result, callback):
        if "error" in result:
            callback(f"[{ERROR}]❖ HEALTH ERROR ❖[/]\n[{ERROR}]{result['error']}[/]")
            return
        bc = result.get("bytecode", "N/A")
        code = result.get("code", "N/A")
        cell = result.get("cellId", "N/A")
        check = result.get("checkId", "N/A")
        checksum = result.get("checksum", "N/A")
        lines = [
            f"\n[bold {SUCCESS}]❖ BYTECODE HEALTH ❖[/]",
            f"  [{SUCCESS}]●[/] Code: [{PURPLE}]{code}[/]",
            f"  [{SUCCESS}]●[/] Cell: [{PURPLE}]{cell}[/]  Check: [{PURPLE}]{check}[/]",
            f"  [{SUCCESS}]●[/] Bytecode: [{MUTED}]{bc}[/]",
            f"  [{SUCCESS}]●[/] Checksum: [{MUTED}]{checksum}[/]",
        ]
        callback("\n".join(lines))

    def _format_verify(self, result, callback):
        if "error" in result:
            callback(f"[{ERROR}]❖ HEALTH VERIFY ERROR ❖[/]\n[{ERROR}]{result['error']}[/]")
            return
        det = result.get("deterministic", False)
        drift = result.get("checksumDrift", "?")
        sample = result.get("sampleChecksum", "N/A")
        color = SUCCESS if det else ERROR
        lines = [
            f"\n[bold {GOLD}]❖ BYTECODE DETERMINISM ❖[/]",
            f"  [{color}]●[/] Deterministic: [{'YES' if det else 'NO'}][/]",
            f"  [{color}]●[/] Iterations: [{PURPLE}]{result.get('iterations', 100)}[/]",
            f"  [{color}]●[/] Checksum Drift: [{PURPLE}]{drift}[/]",
            f"  [{color}]●[/] Sample: [{MUTED}]{sample}[/]",
        ]
        callback("\n".join(lines))
