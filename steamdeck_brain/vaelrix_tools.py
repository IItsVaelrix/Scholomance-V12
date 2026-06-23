#!/usr/bin/env python3
"""
vaelrix_tools.py — Full tool suite for Vaelrix Sentinel
=========================================================
Includes: file ops, code search, command execution, law/schema retrieval,
SQLite queries, Clerical RAID, BytecodeHealth, Diagnostic, Immunity,
Archive, Law Audit/Debug, Bug/Task/Agent CRUD, Healer, and TurboQuant.
"""

import os
import re
import json
import subprocess
import sqlite3
import time
from pathlib import Path
from typing import Dict, Any, List, Optional
import fnmatch

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIVTUBE_DIR = os.path.join(PROJECT_ROOT, "divtube_downloader")
BRIDGE_SCRIPT = os.path.join(DIVTUBE_DIR, "scripts", "scholomance-bridge.mjs")
TURBOQUANT_SCRIPT = os.path.join(DIVTUBE_DIR, "turboquant_plugin.js")
SUBSTRATE_DB = os.path.expanduser("~/.substrate/memory.sqlite")
COLLAB_DB = os.path.join(DIVTUBE_DIR, "divtube_memory.db")


class FileCache:
    """Persistent file content cache with mtime-based invalidation.
    Eliminates redundant disk reads when AIs re-reference the same files."""

    def __init__(self, max_entries=500):
        self._cache = {}  # path -> {content, mtime, atime, size}

    def read(self, path):
        try:
            mtime = os.path.getmtime(path)
        except OSError:
            self._cache.pop(path, None)
            return None
        if path in self._cache:
            entry = self._cache[path]
            if entry["mtime"] == mtime:
                entry["atime"] = time.time()
                return entry["content"]
        try:
            with open(path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
        except Exception:
            return None
        if len(self._cache) >= self.max_entries:
            oldest = min(self._cache, key=lambda k: self._cache[k].get("atime", 0))
            del self._cache[oldest]
        self._cache[path] = {
            "content": content,
            "mtime": mtime,
            "atime": time.time(),
            "size": len(content),
        }
        return content

    def stats(self):
        total = len(self._cache)
        size = sum(e["size"] for e in self._cache.values())
        return {"entries": total, "size_bytes": size, "size_mb": round(size / 1048576, 2)}


_file_cache = FileCache()


def resolve_path(path):
    if not os.path.isabs(path):
        return os.path.normpath(os.path.join(PROJECT_ROOT, path))
    return os.path.normpath(path)


def _node_bin():
    nvm_node = os.path.expanduser("/home/deck/.nvm/versions/node/v20.20.2/bin/node")
    if os.path.exists(nvm_node):
        return nvm_node
    for p in os.environ.get("PATH", "").split(os.pathsep):
        candidate = os.path.join(p, "node")
        if os.path.exists(candidate):
            return candidate
    return "node"


def _run_bridge(subcommand, *args, timeout=30, **flags):
    cmd = [_node_bin(), BRIDGE_SCRIPT, subcommand]
    cmd.extend(str(a) for a in args)
    for k, v in flags.items():
        if v is True:
            cmd.append(f"--{k}")
        elif v is not False and v is not None:
            cmd.append(f"--{k}={v}")
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout,
                              cwd=PROJECT_ROOT)
        stdout = proc.stdout.strip()
        stderr = proc.stderr.strip()
        if proc.returncode != 0:
            return f"[Bridge exit {proc.returncode}]\n{stdout}\n{stderr}"
        if not stdout:
            return f"[Bridge returned empty output. Stderr: {stderr}]"
        return stdout
    except subprocess.TimeoutExpired:
        return f"[Bridge timed out after {timeout}s]"
    except FileNotFoundError:
        return f"[Bridge script not found: {BRIDGE_SCRIPT}]"
    except Exception as e:
        return f"[Bridge error: {e}]"


def _run_turboquant(action_payload, timeout=15):
    if not os.path.exists(TURBOQUANT_SCRIPT):
        return json.dumps({"error": f"TurboQuant script not found: {TURBOQUANT_SCRIPT}"})
    try:
        proc = subprocess.run(
            [_node_bin(), TURBOQUANT_SCRIPT],
            input=json.dumps(action_payload) + "\n",
            capture_output=True, text=True, timeout=timeout,
            cwd=DIVTUBE_DIR
        )
        output = proc.stdout.strip()
        if output:
            return output
        return json.dumps({"error": "TurboQuant returned empty output", "stderr": proc.stderr.strip()})
    except subprocess.TimeoutExpired:
        return json.dumps({"error": f"TurboQuant timed out after {timeout}s"})
    except FileNotFoundError:
        return json.dumps({"error": f"TurboQuant script not found: {TURBOQUANT_SCRIPT}"})
    except Exception as e:
        return json.dumps({"error": str(e)})


# ═══════════════════════════════════════════════════════════════════════════════
#  CORE TOOLS (file, search, command, law, schema, sqlite)
# ═══════════════════════════════════════════════════════════════════════════════

def read_file(path: str, max_lines: int = 500) -> str:
    path = resolve_path(path)
    if not path.startswith(PROJECT_ROOT):
        return f"[Error: path outside project root]"
    content = _file_cache.read(path)
    if content is None:
        if not os.path.exists(path):
            return f"[Error: file not found: {path}]"
        return f"[Error: could not read {path}]"
    lines = content.split("\n")
    total = len(lines)
    if total > max_lines:
        return "\n".join(lines[:max_lines]) + f"\n[...truncated at {max_lines}/{total} lines]"
    return content


def search_code(pattern: str, include: str = "*.py,*.md,*.json,*.ts,*.mjs,*.js", max_results: int = 40) -> str:
    if shutil_exists("rg"):
        patterns = [p.strip() for p in include.split(",")]
        results = []
        for pat in patterns:
            try:
                proc = subprocess.run(
                    ["rg", "-n", "--no-heading", "-e", pattern, "--glob", pat, PROJECT_ROOT],
                    capture_output=True, text=True, timeout=30
                )
                for line in proc.stdout.strip().split("\n"):
                    if len(results) >= max_results:
                        break
                    if line:
                        results.append(line)
            except Exception:
                continue
        return "\n".join(results[:max_results]) if results else "[No matches]"
    return _fallback_search(pattern, include, max_results)


def _fallback_search(pattern: str, include: str, max_results: int) -> str:
    patterns = [p.strip() for p in include.split(",")]
    results = []
    for root, dirs, files in os.walk(PROJECT_ROOT):
        dirs[:] = [d for d in dirs if not d.startswith(".") and d not in ("node_modules", "__pycache__", ".venv", ".gradle", "build")]
        for fname in files:
            if any(fnmatch.fnmatch(fname, p) for p in patterns):
                try:
                    fpath = os.path.join(root, fname)
                    content = _file_cache.read(fpath)
                    if content is None:
                        continue
                    for i, line in enumerate(content.split("\n"), 1):
                        if pattern in line and len(results) < max_results:
                            results.append(f"{os.path.relpath(fpath, PROJECT_ROOT)}:{i}: {line.strip()[:200]}")
                except Exception:
                    continue
    return "\n".join(results) if results else "[No matches]"


def shutil_exists(name):
    for p in os.environ.get("PATH", "").split(os.pathsep):
        if os.path.exists(os.path.join(p, name)):
            return True
    return False


def run_command(cmd: str, timeout: int = 60) -> str:
    first_word = cmd.strip().split()[0] if cmd.strip() else ""
    if first_word not in ("python3", "pytest", "sqlite3", "git", "rg", "grep",
                          "sha256sum", "md5sum", "ls", "cat", "head", "tail",
                          "wc", "find", "npm", "node", "ruff", "mypy", "curl",
                          "compileall", "echo", "date"):
        return f"[Blocked: '{first_word}' not allowlisted]"
    if any(d in cmd for d in ["rm ", "sudo", "> /dev", "/etc/", "~/.ssh", "chmod", "chown"]):
        return "[Blocked: dangerous pattern]"
    try:
        proc = subprocess.run(cmd, shell=True, capture_output=True, text=True,
                              timeout=timeout, cwd=PROJECT_ROOT)
        out = (proc.stdout + proc.stderr).strip()
        return out if out else "[Empty output]"
    except subprocess.TimeoutExpired:
        return f"[Timed out after {timeout}s]"
    except Exception as e:
        return f"[Error: {e}]"


def retrieve_law(law_name: str) -> str:
    return _run_bridge("law-get", law_name, timeout=15)


def retrieve_knowledge(query: str, cortex=None, top_k: int = 5) -> str:
    if cortex is None:
        return "[Error: cortex not available]"
    try:
        memories, context = cortex.retrieve(query, top_k=top_k, multi_hop=False)
        return context if context.strip() else "[No substrate memories]"
    except Exception as e:
        return f"[Error: {e}]"


def check_schema() -> str:
    schema_path = os.path.join(PROJECT_ROOT, "SCHEMA_CONTRACT.md")
    if not os.path.exists(schema_path):
        return "[Error: SCHEMA_CONTRACT.md not found]"
    try:
        with open(schema_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
        defs = re.findall(r'(?:```(?:typescript|ts|json)?\s*\n)?(?:type|interface|class|enum)\s+(\w+)', content)
        shapes = ", ".join(sorted(set(defs))) if defs else "none found"
        return f"Schema loaded ({len(content)} chars, {len(defs)} type defs)\nShapes: {shapes}"
    except Exception as e:
        return f"[Error: {e}]"


def sqlite_query(sql: str, db_path: str = None) -> str:
    if db_path is None:
        db_path = SUBSTRATE_DB
    db_path = os.path.expanduser(db_path)
    if not os.path.exists(db_path):
        return f"[Error: db not found: {db_path}]"
    sql_upper = sql.strip().upper()
    if not any(sql_upper.startswith(p) for p in ("SELECT", "PRAGMA", "EXPLAIN")):
        return "[Blocked: only SELECT/PRAGMA/EXPLAIN allowed]"
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cur = conn.execute(sql)
        rows = cur.fetchall()
        conn.close()
        if not rows:
            return "[0 rows]"
        cols = rows[0].keys()
        lines = [" | ".join(cols), "-" * 30]
        for row in rows[:25]:
            lines.append(" | ".join(str(row[c])[:60] for c in cols))
        if len(rows) > 25:
            lines.append(f"[...{len(rows) - 25} more rows]")
        return "\n".join(lines)
    except Exception as e:
        return f"[SQLite error: {e}]"


def list_files(directory: str = "", pattern: str = "*") -> str:
    target = os.path.join(PROJECT_ROOT, directory) if directory else PROJECT_ROOT
    target = os.path.normpath(target)
    if not target.startswith(PROJECT_ROOT):
        return "[Error: outside project root]"
    if not os.path.isdir(target):
        return "[Error: not a directory]"
    matches = []
    for root, dirs, files in os.walk(target):
        dirs[:] = [d for d in dirs if not d.startswith(".") and d not in ("node_modules", "__pycache__", ".venv", ".gradle", "build")]
        for fname in files:
            if fnmatch.fnmatch(fname, pattern):
                matches.append(os.path.relpath(os.path.join(root, fname), PROJECT_ROOT))
        if len(matches) > 100:
            break
    return "\n".join(sorted(matches)[:100]) if matches else "[No matches]"


def cache_stats() -> str:
    s = _file_cache.stats()
    return json.dumps(s, indent=2)


# ═══════════════════════════════════════════════════════════════════════════════
#  CLERICAL RAID TOOLS
# ═══════════════════════════════════════════════════════════════════════════════

def cleri_scan(symptoms: str) -> str:
    return _run_bridge("scan", symptoms, timeout=30)


def cleri_diagnose(report_file: str) -> str:
    path = resolve_path(report_file)
    return _run_bridge("diagnose", path, timeout=30)


def cleri_stats() -> str:
    return _run_bridge("stats", timeout=15)


def cleri_probe(text: str, mode: str = "prion", min_resonance: float = 0.75) -> str:
    return _run_bridge("probe", text, mode=mode, min_resonance=min_resonance, timeout=20)


def cleri_cluster(min_sim: float = 0.92) -> str:
    return _run_bridge("cluster", min_sim=min_sim, timeout=20)


def cleri_duplicates(min_sim: float = 0.97) -> str:
    return _run_bridge("duplicates", min_sim=min_sim, timeout=20)


def cleri_maintenance() -> str:
    return _run_bridge("maintenance", timeout=20)


def cleri_ingest(report_file: str, train: bool = True) -> str:
    path = resolve_path(report_file)
    flags = {"report": path}
    if not train:
        flags["no_train"] = True
    return _run_bridge("merlin-ingest", timeout=20, **flags)


def cleri_rebuild() -> str:
    return _run_bridge("rebuild-index", timeout=30)


def raid_query(symptoms: str, agent: str = "", layer_hint: str = "") -> str:
    flags = {}
    if agent:
        flags["agent"] = agent
    if layer_hint:
        flags["layer_hint"] = layer_hint
    return _run_bridge("raid-query", symptoms, timeout=30, **flags)


# ═══════════════════════════════════════════════════════════════════════════════
#  BYTECODE HEALTH TOOLS
# ═══════════════════════════════════════════════════════════════════════════════

def bytecode_health(cell_id: str, check_id: str, module_id: str = "") -> str:
    flags = {}
    if module_id:
        flags["module"] = module_id
    return _run_bridge("health", cell_id, check_id, timeout=15, **flags)


def bytecode_verify(cell_id: str, check_id: str) -> str:
    return _run_bridge("health-verify", cell_id, check_id, timeout=30)


# ═══════════════════════════════════════════════════════════════════════════════
#  DIAGNOSTIC TOOLS
# ═══════════════════════════════════════════════════════════════════════════════

def diagnostic_scan() -> str:
    return _run_bridge("diagnostic-scan", timeout=60)


def diagnostic_summary() -> str:
    return _run_bridge("diagnostic-summary", timeout=15)


def diagnostic_latest() -> str:
    return _run_bridge("diagnostic-latest", timeout=15)


def diagnostic_violations(severity: str = "", layer: str = "", limit: int = 100) -> str:
    flags = {"limit": limit}
    if severity:
        flags["severity"] = severity
    if layer:
        flags["layer"] = layer
    return _run_bridge("diagnostic-violations", timeout=15, **flags)


def diagnostic_health_checks(cell_id: str = "", check_id: str = "", limit: int = 100) -> str:
    flags = {"limit": limit}
    if cell_id:
        flags["cell_id"] = cell_id
    if check_id:
        flags["check_id"] = check_id
    return _run_bridge("diagnostic-health", timeout=15, **flags)


def diagnostic_hints(category: str, error_code: str) -> str:
    return _run_bridge("diagnostic-hints", category, error_code, timeout=10)


# ═══════════════════════════════════════════════════════════════════════════════
#  IMMUNITY TOOLS
# ═══════════════════════════════════════════════════════════════════════════════

def immunity_scan(file_path: str) -> str:
    return _run_bridge("immunity-scan", resolve_path(file_path), timeout=20)


def immunity_status() -> str:
    return _run_bridge("immunity-status", timeout=10)


# ═══════════════════════════════════════════════════════════════════════════════
#  ARCHIVE TOOLS
# ═══════════════════════════════════════════════════════════════════════════════

def archive_files() -> str:
    return _run_bridge("archive-files", timeout=15)


def archive_search(query: str) -> str:
    return _run_bridge("archive-search", query, timeout=15)


def archive_neighbors(file_path: str) -> str:
    return _run_bridge("archive-neighbors", resolve_path(file_path), timeout=10)


# ═══════════════════════════════════════════════════════════════════════════════
#  LAW AUDIT / DEBUG TOOLS
# ═══════════════════════════════════════════════════════════════════════════════

def law_audit(file_path: str, intent: str = "", focus: str = "") -> str:
    flags = {}
    if intent:
        flags["intent"] = intent
    if focus:
        flags["focus_laws"] = focus
    return _run_bridge("law-audit", resolve_path(file_path), timeout=30, **flags)


def law_debug(anomaly: str, symptoms: str, mode: str = "B", target_files: str = "") -> str:
    flags = {"mode": mode}
    if target_files:
        flags["target_files"] = target_files
    return _run_bridge("law-debug", anomaly, symptoms, timeout=30, **flags)


# ═══════════════════════════════════════════════════════════════════════════════
#  BUG / TASK / MEMORY CRUD
# ═══════════════════════════════════════════════════════════════════════════════

def bug_create(title: str, source_type: str = "agent", summary: str = "",
               priority: int = 1, reporter: str = "vaelrix", repro_steps: str = "") -> str:
    flags = {"summary": summary, "priority": priority, "reporter": reporter}
    if repro_steps:
        flags["repro_steps"] = repro_steps
    return _run_bridge("bug-create", title, source_type, timeout=15, **flags)


def bug_list(status: str = "", severity: str = "") -> str:
    flags = {}
    if status:
        flags["status"] = status
    if severity:
        flags["severity"] = severity
    return _run_bridge("bug-list", timeout=10, **flags)


def bug_get(bug_id: str) -> str:
    return _run_bridge("bug-get", bug_id, timeout=10)


def task_create(title: str, description: str = "", priority: int = 1,
                file_paths: str = "", note: str = "") -> str:
    flags = {"description": description, "priority": priority, "note": note}
    if file_paths:
        flags["file_paths"] = file_paths
    return _run_bridge("task-create", title, timeout=10, **flags)


def task_list(status: str = "") -> str:
    flags = {}
    if status:
        flags["status"] = status
    return _run_bridge("task-list", timeout=10, **flags)


def task_update(task_id: str, status: str = "", note: str = "", title: str = "",
                priority: int = -1) -> str:
    flags = {"note": note}
    if status:
        flags["status"] = status
    if title:
        flags["title"] = title
    if priority >= 0:
        flags["priority"] = priority
    return _run_bridge("task-update", task_id, timeout=10, **flags)


def memory_get(key: str, agent_id: str = "") -> str:
    flags = {}
    if agent_id:
        flags["agent_id"] = agent_id
    return _run_bridge("memory-get", key, timeout=10, **flags)


def memory_set(key: str, value: str, agent_id: str = "") -> str:
    flags = {}
    if agent_id:
        flags["agent_id"] = agent_id
    return _run_bridge("memory-set", key, value, timeout=10, **flags)


# ═══════════════════════════════════════════════════════════════════════════════
#  HEALER TOOLS
# ═══════════════════════════════════════════════════════════════════════════════

def healer_heal(symptoms: str, file_paths: str = "", max_iterations: int = 3,
                test_suite: str = "qa") -> str:
    flags = {"max_iterations": max_iterations, "test_suite": test_suite}
    if file_paths:
        flags["file_paths"] = file_paths
    return _run_bridge("heal", symptoms, timeout=60, **flags)


def healer_apply_patch(file_path: str, patch_content: str, backup: bool = True) -> str:
    flags = {"backup": backup, "patch": patch_content}
    return _run_bridge("apply-patch", resolve_path(file_path), timeout=15, **flags)


# ═══════════════════════════════════════════════════════════════════════════════
#  CODEBASE SEARCH TOOLS
# ═══════════════════════════════════════════════════════════════════════════════

def codebase_search(query: str) -> str:
    return _run_bridge("codebase-search", query, timeout=15)


def forensic_search(query: str, regex: bool = False, case_sensitive: bool = False,
                    include: str = "", limit: int = 75) -> str:
    flags = {"is_regex": regex, "case_sensitive": case_sensitive, "limit": limit}
    if include:
        flags["include"] = include
    return _run_bridge("forensic-search", query, timeout=20, **flags)


# ═══════════════════════════════════════════════════════════════════════════════
#  TURBOQUANT TOOLS
# ═══════════════════════════════════════════════════════════════════════════════

_tq_id = [0]
def _tq_next_id():
    _tq_id[0] += 1
    return _tq_id[0]


def turboquant_list() -> str:
    return _run_turboquant({"action": "list", "id": _tq_next_id()})


def turboquant_search(text: str, k: int = 5) -> str:
    return _run_turboquant({"action": "search", "text": text, "k": k, "id": _tq_next_id()})


def turboquant_score(curve: str, text: str) -> str:
    return _run_turboquant({"action": "score", "curve": curve, "text": text, "id": _tq_next_id()})


def turboquant_gaps(curve: str, text: str) -> str:
    return _run_turboquant({"action": "analyze-gaps", "curve": curve, "text": text, "id": _tq_next_id()})


def turboquant_register(name: str, text: str) -> str:
    return _run_turboquant({"action": "register", "name": name, "text": text, "id": _tq_next_id()})


def turboquant_export(filename: str) -> str:
    return _run_turboquant({"action": "export-pack", "filename": filename, "id": _tq_next_id()})


def turboquant_import(filename: str) -> str:
    return _run_turboquant({"action": "import-pack", "filename": filename, "id": _tq_next_id()})


# ═══════════════════════════════════════════════════════════════════════════════
#  GENERIC BRIDGE TOOL (catch-all for any subcommand)
# ═══════════════════════════════════════════════════════════════════════════════

def bridge(subcommand: str, args: str = "", flags_json: str = "{}") -> str:
    try:
        fl = json.loads(flags_json)
    except json.JSONDecodeError:
        fl = {}
    pos_args = args.split() if args.strip() else []
    return _run_bridge(subcommand, *pos_args, timeout=30, **fl)


# ═══════════════════════════════════════════════════════════════════════════════
#  TOOL REGISTRY
# ═══════════════════════════════════════════════════════════════════════════════

TOOL_REGISTRY: Dict[str, Dict] = {
    # ── Core ──
    "read_file": {
        "func": read_file,
        "description": "Read a project file. Returns contents (max 500 lines).",
        "params": {"path": "Relative path (e.g. SCHEMA_CONTRACT.md)"},
    },
    "search_code": {
        "func": search_code,
        "description": "Search codebase with ripgrep for a pattern.",
        "params": {"pattern": "Regex or literal", "include": "File globs (default: *.py,*.md,*.json,*.ts,*.mjs)"},
    },
    "run_command": {
        "func": run_command,
        "description": "Execute an allowlisted shell command. Blocked: rm, sudo, chmod.",
        "params": {"cmd": "Shell command"},
    },
    "retrieve_law": {
        "func": retrieve_law,
        "description": "Retrieve a Scholomance law from the encyclopedia.",
        "params": {"law_name": "Law name or keyword (e.g. 'Determinism', 'Schema Is Sovereign')"},
    },
    "retrieve_knowledge": {
        "func": retrieve_knowledge,
        "description": "Search Cortex substrate for relevant memories.",
        "params": {"query": "Natural language query"},
    },
    "check_schema": {
        "func": check_schema,
        "description": "Inspect SCHEMA_CONTRACT.md for type definitions.",
        "params": {},
    },
    "sqlite_query": {
        "func": sqlite_query,
        "description": "Run a read-only SQLite query (SELECT/PRAGMA only).",
        "params": {"sql": "SQL query", "db_path": "Optional DB path (default: substrate)"},
    },
    "list_files": {
        "func": list_files,
        "description": "List project files matching a glob pattern.",
        "params": {"directory": "Subdirectory under project root", "pattern": "Glob (default: *)"},
    },
    # ── Clerical RAID ──
    "cleri_scan": {
        "func": cleri_scan,
        "description": "RAID symptom scan against bug pattern database.",
        "params": {"symptoms": "Error message or symptom description"},
    },
    "cleri_diagnose": {
        "func": cleri_diagnose,
        "description": "Diagnose a JSON bug report against known patterns.",
        "params": {"report_file": "Path to bug report JSON"},
    },
    "cleri_stats": {
        "func": cleri_stats,
        "description": "Get Clerical RAID statistics (pattern count, hit rates).",
        "params": {},
    },
    "cleri_probe": {
        "func": cleri_probe,
        "description": "Deep anomaly probe with resonance scoring.",
        "params": {"text": "Symptom text", "mode": "Scan mode (default: prion)", "min_resonance": "Min resonance (default: 0.75)"},
    },
    "cleri_cluster": {
        "func": cleri_cluster,
        "description": "Cluster similar bug patterns by cosine similarity.",
        "params": {"min_sim": "Minimum similarity (default: 0.92)"},
    },
    "cleri_duplicates": {
        "func": cleri_duplicates,
        "description": "Find near-duplicate pattern pairs.",
        "params": {"min_sim": "Minimum similarity (default: 0.97)"},
    },
    "cleri_maintenance": {
        "func": cleri_maintenance,
        "description": "Deprecate stale patterns, compute effectiveness scores.",
        "params": {},
    },
    "cleri_ingest": {
        "func": cleri_ingest,
        "description": "Ingest a bug report into RAID and auto-train.",
        "params": {"report_file": "Path to bug report JSON", "train": "Auto-train (default: true)"},
    },
    "cleri_rebuild": {
        "func": cleri_rebuild,
        "description": "Re-quantize the RAID pattern index.",
        "params": {},
    },
    "raid_query": {
        "func": raid_query,
        "description": "Full RAID query with optional agent role hook.",
        "params": {"symptoms": "Symptom description", "agent": "Agent role (codex/claude/gemini/merlin)", "layer_hint": "Layer hint"},
    },
    # ── BytecodeHealth ──
    "bytecode_health": {
        "func": bytecode_health,
        "description": "Create a BytecodeHealth determinism signal.",
        "params": {"cell_id": "Cell ID (e.g. IMMUNITY_SCAN)", "check_id": "Check ID", "module_id": "Optional module"},
    },
    "bytecode_verify": {
        "func": bytecode_verify,
        "description": "Run 100-iteration determinism check on a cell.",
        "params": {"cell_id": "Cell ID", "check_id": "Check ID"},
    },
    # ── Diagnostic ──
    "diagnostic_scan": {
        "func": diagnostic_scan,
        "description": "Run full codebase diagnostic scan.",
        "params": {},
    },
    "diagnostic_summary": {
        "func": diagnostic_summary,
        "description": "Quick summary of the latest diagnostic report.",
        "params": {},
    },
    "diagnostic_latest": {
        "func": diagnostic_latest,
        "description": "Full latest diagnostic report with all findings.",
        "params": {},
    },
    "diagnostic_violations": {
        "func": diagnostic_violations,
        "description": "Query violations from the latest diagnostic scan.",
        "params": {"severity": "Filter: FATAL/CRIT/WARN/INFO", "layer": "Filter by layer", "limit": "Max results (default: 100)"},
    },
    "diagnostic_health": {
        "func": diagnostic_health_checks,
        "description": "Query health signals from the latest scan.",
        "params": {"cell_id": "Filter by cell", "check_id": "Filter by check", "limit": "Max results (default: 100)"},
    },
    "diagnostic_hints": {
        "func": diagnostic_hints,
        "description": "Get recovery hints for an error category/code.",
        "params": {"category": "Error category (e.g. TYPE)", "error_code": "4-digit hex code (e.g. 0105)"},
    },
    # ── Immunity ──
    "immunity_scan": {
        "func": immunity_scan,
        "description": "Run immunity scan on a specific file.",
        "params": {"file_path": "Path to file to scan"},
    },
    "immunity_status": {
        "func": immunity_status,
        "description": "Get immune system health status.",
        "params": {},
    },
    # ── Archive ──
    "archive_files": {
        "func": archive_files,
        "description": "List all indexed source files in the codebase.",
        "params": {},
    },
    "archive_search": {
        "func": archive_search,
        "description": "Search codebase archive by name/content.",
        "params": {"query": "Search query"},
    },
    "archive_neighbors": {
        "func": archive_neighbors,
        "description": "Find sibling/related files near a target file.",
        "params": {"file_path": "Target file path"},
    },
    # ── Law Audit/Debug ──
    "law_audit": {
        "func": law_audit,
        "description": "Audit a file against Vaelrix Law for violations.",
        "params": {"file_path": "File to audit", "intent": "Proposed change intent", "focus": "Comma-separated law names to emphasize"},
    },
    "law_debug": {
        "func": law_debug,
        "description": "High Inquisitor debug report (modes A-F).",
        "params": {"anomaly": "Anomaly name", "symptoms": "Symptom description", "mode": "Debug mode A-F (default: B)", "target_files": "Comma-separated file list"},
    },
    # ── Codebase Search ──
    "codebase_search": {
        "func": codebase_search,
        "description": "Semantic + literal hybrid codebase search.",
        "params": {"query": "Search query"},
    },
    "forensic_search": {
        "func": forensic_search,
        "description": "Advanced regex/literal file search with glob filtering.",
        "params": {"query": "Search pattern", "regex": "Treat as regex (default: false)", "case_sensitive": "Case sensitive (default: false)", "include": "File glob filter"},
    },
    # ── Bug/Task/Memory CRUD ──
    "bug_create": {
        "func": bug_create,
        "description": "Create a bug report in the persistence layer.",
        "params": {"title": "Bug title", "source_type": "Source (default: agent)", "summary": "Detail", "priority": "0-3 (default: 1)", "repro_steps": "Steps to reproduce"},
    },
    "bug_list": {
        "func": bug_list,
        "description": "List bug reports with optional filters.",
        "params": {"status": "Filter by status", "severity": "Filter by severity"},
    },
    "bug_get": {
        "func": bug_get,
        "description": "Get a specific bug report by ID.",
        "params": {"bug_id": "Bug report ID"},
    },
    "task_create": {
        "func": task_create,
        "description": "Create a task in the persistence layer.",
        "params": {"title": "Task title", "description": "Detail", "priority": "0-3 (default: 1)", "file_paths": "Comma-separated paths", "note": "Status note"},
    },
    "task_list": {
        "func": task_list,
        "description": "List tasks with optional status filter.",
        "params": {"status": "Filter by status"},
    },
    "task_update": {
        "func": task_update,
        "description": "Update task status, note, title, or priority.",
        "params": {"task_id": "Task ID", "status": "New status", "note": "Status note", "priority": "New priority"},
    },
    "memory_get": {
        "func": memory_get,
        "description": "Retrieve a value from persistent memory.",
        "params": {"key": "Memory key", "agent_id": "Optional agent scope"},
    },
    "memory_set": {
        "func": memory_set,
        "description": "Store a value in persistent memory.",
        "params": {"key": "Memory key", "value": "Value to store", "agent_id": "Optional agent scope"},
    },
    # ── Healer ──
    "healer_heal": {
        "func": healer_heal,
        "description": "Autonomous healing loop (up to N iterations with verification).",
        "params": {"symptoms": "Symptom description", "file_paths": "Comma-separated target files", "max_iterations": "Max iterations (default: 3)", "test_suite": "Verification suite (default: qa)"},
    },
    "healer_patch": {
        "func": healer_apply_patch,
        "description": "Apply a search/replace patch to a file (with .bak backup).",
        "params": {"file_path": "Target file", "patch_content": "Unified diff or search/replace block"},
    },
    # ── TurboQuant ──
    "turboquant_list": {
        "func": turboquant_list,
        "description": "List all registered Golden Curves.",
        "params": {},
    },
    "turboquant_search": {
        "func": turboquant_search,
        "description": "Semantic search across all Golden Curves.",
        "params": {"text": "Search text", "k": "Top K results (default: 5)"},
    },
    "turboquant_score": {
        "func": turboquant_score,
        "description": "Score a title against a specific Golden Curve.",
        "params": {"curve": "Curve name", "text": "Title text to score"},
    },
    "turboquant_gaps": {
        "func": turboquant_gaps,
        "description": "Analyze keyword/niche gaps in a title.",
        "params": {"curve": "Curve name", "text": "Title to analyze"},
    },
    "turboquant_register": {
        "func": turboquant_register,
        "description": "Register a new Golden Curve from text.",
        "params": {"name": "Curve name", "text": "Reference text"},
    },
    "turboquant_export": {
        "func": turboquant_export,
        "description": "Export Golden Curves to a .goldenpack file.",
        "params": {"filename": "Output filename"},
    },
    # ── Generic Bridge (catch-all) ──
    "bridge": {
        "func": bridge,
        "description": "Execute any scholomance-bridge.mjs subcommand directly.",
        "params": {"subcommand": "Subcommand name", "args": "Positional args (space-separated)", "flags_json": "Flags as JSON object (e.g. {\"mode\": \"B\"})"},
    },
    "cache_stats": {
        "func": cache_stats,
        "description": "Show file cache hit stats (entries cached, memory used).",
        "params": {},
    },
}


def get_tool_definitions() -> str:
    lines = []
    for name, info in TOOL_REGISTRY.items():
        params_str = ", ".join(f"{k}: {v}" for k, v in info["params"].items())
        suffix = f" (params: {params_str})" if params_str else ""
        lines.append(f"  {name} — {info['description']}{suffix}")
    return "\n".join(lines)


def dispatch_tool(name: str, args: dict, cortex=None) -> str:
    if name not in TOOL_REGISTRY:
        return f"[Error: unknown tool '{name}'. Available: {', '.join(sorted(TOOL_REGISTRY.keys()))}]"
    tool = TOOL_REGISTRY[name]
    try:
        if name == "retrieve_knowledge":
            return tool["func"](args.get("query", ""), cortex=cortex)
        return tool["func"](**args)
    except TypeError as e:
        return f"[Error: invalid arguments for '{name}': {e}]"
    except Exception as e:
        return f"[Error executing '{name}': {e}]"
