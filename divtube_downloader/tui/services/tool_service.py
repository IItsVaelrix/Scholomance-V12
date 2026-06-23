import json
import os
import subprocess

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
BRIDGE_SCRIPT = os.path.join(PROJECT_ROOT, "divtube_downloader", "scripts", "scholomance-bridge.mjs")


def _node_bin():
    n = "/home/deck/.nvm/versions/node/v20.20.2/bin/node"
    if os.path.exists(n):
        return n
    return "node"


def _run_bridge(command, *args, timeout=30, stdin=None):
    node = _node_bin()
    cmd = [node, BRIDGE_SCRIPT, command] + list(args)
    try:
        proc = subprocess.run(
            cmd, capture_output=True, text=True, timeout=timeout, cwd=PROJECT_ROOT, input=stdin
        )
        if proc.returncode != 0:
            return {"error": proc.stderr.strip() or f"exit code {proc.returncode}"}
        return json.loads(proc.stdout)
    except subprocess.TimeoutExpired:
        return {"error": "Command timed out"}
    except json.JSONDecodeError:
        return {"error": "Failed to parse bridge output"}
    except Exception as e:
        return {"error": str(e)}


def _safe_path(path):
    """Resolve a relative path and ensure it stays within PROJECT_ROOT."""
    joined = os.path.normpath(os.path.join(PROJECT_ROOT, path))
    if not joined.startswith(PROJECT_ROOT):
        return None
    return joined


SUCCESS_TAG = "[#7CFF8B]"


class _FileCache:
    """In-memory file content cache with mtime invalidation.
    Prevents redundant disk reads when AIs re-reference the same files."""

    def __init__(self, max_entries=300):
        self._entries = {}

    def read(self, path):
        try:
            mtime = os.path.getmtime(path)
        except OSError:
            self._entries.pop(path, None)
            return None
        if path in self._entries:
            e = self._entries[path]
            if e["mtime"] == mtime:
                e["atime"] = __import__("time").time()
                return e["content"]
        try:
            with open(path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
        except Exception:
            return None
        if len(self._entries) >= self.max_entries:
            oldest = min(self._entries, key=lambda k: self._entries[k].get("atime", 0))
            del self._entries[oldest]
        self._entries[path] = {
            "content": content,
            "mtime": mtime,
            "atime": __import__("time").time(),
        }
        return content

    def stats(self):
        return {"entries": len(self._entries)}


_tui_file_cache = _FileCache()

def _safe_cmd(cmd_str):
    """Reject dangerous shell operators."""
    dangerous = [";", "&&", "||", "|", "`", "$(", "${", ">", "<", "&"]
    for d in dangerous:
        if d in cmd_str:
            return False
    return True


# ── CLI Gate Keeper ───────────────────────────────────
# Prevents rapid-fire tool calls and file re-reads
try:
    from ..core.gate_keeper import gate as _gate
except ImportError:
    try:
        from divtube_downloader.tui.core.gate_keeper import gate as _gate
    except ImportError:
        _gate = None


def _gate_check(tool_name, kwargs, callback=None):
    """Run gate check. Returns True if allowed, False if blocked."""
    if _gate is None:
        return True
    verdict = _gate.check(tool_name, kwargs)
    if verdict.is_blocked:
        if callback:
            callback(f"  [#FF5C7A]⛔ GATE BLOCKED[/] [{verdict.reason}] {verdict.message}")
        return False
    return True


class ToolService:
    def __init__(self):
        self._persistence = self._init_persistence()
        self.tools = [
            {
                "type": "function",
                "function": {
                    "name": "read_file",
                    "description": "Read the contents of a file in the codebase. Path is relative to project root.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "path": {
                                "type": "string",
                                "description": "Relative file path (e.g. 'src/pages/Combat/CombatPage.jsx')"
                            },
                            "max_lines": {
                                "type": "integer",
                                "description": "Max lines to return (default 100, max 500)",
                                "default": 100
                            }
                        },
                        "required": ["path"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "tui_inspect",
                    "description": "Like Playwright for the TUI! Capture the live UI layout and DOM tree of the DivTube app. Returns a JSON representation of all currently rendered widgets and their IDs to let you see your changes in real time.",
                    "parameters": {
                        "type": "object",
                        "properties": {}
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "git_diff",
                    "description": "View accumulated changes since the last commit (git diff HEAD).",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "path": {
                                "type": "string",
                                "description": "Optional specific file or directory path to diff (default: all)"
                            }
                        }
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "search_code",
                    "description": "Grep the codebase for a pattern. Searches file contents recursively.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "pattern": {
                                "type": "string",
                                "description": "Search pattern (literal or regex)"
                            },
                            "include": {
                                "type": "string",
                                "description": "File glob pattern (e.g. '*.js', '*.{ts,tsx}')",
                                "default": ""
                            },
                            "max_results": {
                                "type": "integer",
                                "description": "Max results (default 30)",
                                "default": 30
                            }
                        },
                        "required": ["pattern"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "list_directory",
                    "description": "List files and directories in a path relative to project root.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "path": {
                                "type": "string",
                                "description": "Relative directory path (e.g. 'src/pages')",
                                "default": "."
                            },
                            "recursive": {
                                "type": "boolean",
                                "description": "Set to true to recursively list all files in subdirectories",
                                "default": False
                            }
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "find_file",
                    "description": "Find files by name or glob pattern recursively in the project.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "File name or glob pattern (e.g. 'deepRhyme.engine.js', '*.jsx')"
                            },
                            "max_results": {
                                "type": "integer",
                                "description": "Max results to return (default 200)",
                                "default": 200
                            }
                        },
                        "required": ["query"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "run_command",
                    "description": "Run an arbitrary shell command in the project root. You have full access to git, npm, vitest, and bash pipes/redirects.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "command": {
                                "type": "string",
                                "description": "Command to run (e.g. 'git log', 'npm run test')"
                            }
                        },
                        "required": ["command"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "replace_file_content",
                    "description": "Edit a file by replacing a unique block of text.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "path": {
                                "type": "string",
                                "description": "Relative file path"
                            },
                            "target_content": {
                                "type": "string",
                                "description": "Exact text block to replace"
                            },
                            "replacement_content": {
                                "type": "string",
                                "description": "New text block"
                            }
                        },
                        "required": ["path", "target_content", "replacement_content"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "search_youtube",
                    "description": "Searches the web for current trends, competitor thumbnails, and title performance in a specific YouTube niche.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "The search query, e.g., 'recent viral minecraft videos 2026'"
                            }
                        },
                        "required": ["query"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "cleri_scan",
                    "description": "Scan a symptom description against the Clerical RAID pattern corpus. Returns the best-matching bug pattern, confidence score, verdict, and fix path.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "symptoms": {
                                "type": "string",
                                "description": "Natural-language symptom description (e.g. 'null pointer in combat update loop')"
                            }
                        },
                        "required": ["symptoms"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "cleri_stats",
                    "description": "Get Clerical RAID engine statistics: total pattern count, query/confirm/deny counts, memory footprint.",
                    "parameters": {
                        "type": "object",
                        "properties": {}
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "cleri_probe",
                    "description": "Run a structural prion scan against the codebase. Walks source files looking for code-level structural misfolds matching a hypothesis.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "hypothesis": {
                                "type": "string",
                                "description": "Code smell or structural hypothesis (e.g. 'unseeded Math.random in combat logic')"
                            }
                        },
                        "required": ["hypothesis"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "health_emit",
                    "description": "Emit a BytecodeHealth green-path signal (PB-OK-v1). Creates a deterministic, checksummed health payload.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "cell_id": {
                                "type": "string",
                                "description": "Diagnostic cell that produced this signal (e.g. 'IMMUNE_CELL')"
                            },
                            "check_id": {
                                "type": "string",
                                "description": "Specific check that passed (e.g. 'PATTERN_LOADED')"
                            },
                            "module_id": {
                                "type": "string",
                                "description": "Affected module path (optional)",
                                "default": ""
                            }
                        },
                        "required": ["cell_id", "check_id"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "health_verify",
                    "description": "Run the 100-iteration BytecodeHealth determinism verification. Confirms all identical inputs produce identical checksums.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "cell_id": {
                                "type": "string",
                                "description": "Cell ID to test (default 'IMMUNE_CELL')",
                                "default": "IMMUNE_CELL"
                            },
                            "check_id": {
                                "type": "string",
                                "description": "Check ID to test (default 'VERIFY')",
                                "default": "VERIFY"
                            }
                        }
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "archive_search",
                    "description": "Search the codebase by file path or content. Returns matching file paths.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "Search term — case-insensitive match against file paths and content"
                            }
                        },
                        "required": ["query"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "archive_neighbors",
                    "description": "Find files near a given file path — sibling files in the same directory, then name-based matches.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "path": {
                                "type": "string",
                                "description": "Relative file path (e.g. 'src/pages/Combat/CombatPage.jsx')"
                            }
                        },
                        "required": ["path"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "scd64_decode",
                    "description": "Decode an SCD64 checksum hash into its component bytes, bug family, meaning, and remediation hints.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "checksum": {
                                "type": "string",
                                "description": "The 64-character hex string of the SCD64."
                            }
                        },
                        "required": ["checksum"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "scd64_scan",
                    "description": "Scan a source file for architectural mutations to predict SCD64 hashes using AST intellisense.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "path": {
                                "type": "string",
                                "description": "Relative file path to scan (e.g. 'src/core/scd64/RuleRegistry.ts')"
                            }
                        },
                        "required": ["path"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "law_get",
                    "description": "Query the Vaelrix Law document for a specific section, number, or keyword. Returns the matching excerpt with bytecode metadata.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "section": {
                                "type": "string",
                                "description": "Law name, number, or keyword (e.g. 'Determinism', 'Bug Fix Documentation', '5', 'escalation')"
                            },
                            "max_chars": {
                                "type": "integer",
                                "description": "Max characters to return (200-16000)",
                                "default": 4000
                            }
                        },
                        "required": ["section"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "law_audit",
                    "description": "Audit a file or intent against Vaelrix Law. Checks for determinism violations, render-adjacent imports in core layers, and other law breaches.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "file_path": {
                                "type": "string",
                                "description": "Relative file path to audit (e.g. 'src/core/combat/CombatSystem.ts')"
                            },
                            "intent": {
                                "type": "string",
                                "description": "Proposed change intent for pre-emptive audit (if no file_path)"
                            }
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "law_debug",
                    "description": "Generate a structured High Inquisitor debug report following the Vaelrix Law Debug ritual. Produces a 15-section report with DebugTraceIR.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "anomaly_name": {
                                "type": "string",
                                "description": "Name of the anomaly or bug (e.g. 'Chroma Drift in VerseIR')"
                            },
                            "symptoms": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Observed symptoms or error messages"
                            },
                            "target_files": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Files suspected or involved"
                            },
                            "mode": {
                                "type": "string",
                                "enum": ["A", "B", "C", "D", "E", "F"],
                                "description": "Debug mode: A=DiagnosticOnly, B=PatchReady, C=AutonomousRepairSpec, D=SeniorReviewer, E=PostUpdateAuditor, F=RedTeam",
                                "default": "B"
                            }
                        },
                        "required": ["anomaly_name", "symptoms"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "diagnostic_scan",
                    "description": "Run a full codebase diagnostic scan. Executes all diagnostic cells (innate, adaptive, bridge, fixture, coverage) against the entire codebase and persists the report.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "trigger": {
                                "type": "string",
                                "description": "Trigger source identifier (default 'mcp')",
                                "default": "mcp"
                            }
                        }
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "diagnostic_summary",
                    "description": "Get a quick at-a-glance summary from the latest diagnostic report. Cheaper than fetching the full report.",
                    "parameters": {
                        "type": "object",
                        "properties": {}
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "diagnostic_violations",
                    "description": "Query violations from the latest diagnostic report. All filters are optional and AND-combined.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "cell": {
                                "type": "string",
                                "description": "Filter by cellId or layer name (e.g. IMMUNITY_SCAN, LAYER_BOUNDARY, bridge)"
                            },
                            "severity": {
                                "type": "string",
                                "enum": ["FATAL", "CRIT", "WARN", "INFO"],
                                "description": "Filter by severity"
                            },
                            "layer": {
                                "type": "string",
                                "description": "Filter by context.layer (e.g. innate, adaptive, bridge, fixture, coverage)"
                            },
                            "rule_id": {
                                "type": "string",
                                "description": "Filter by rule ID (e.g. QUANT-0101, LING-0F03)"
                            },
                            "limit": {
                                "type": "integer",
                                "description": "Max results (default 50)",
                                "default": 50
                            }
                        }
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "diagnostic_health",
                    "description": "Query health signals from the latest diagnostic report.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "cell_id": {
                                "type": "string",
                                "description": "Filter by emitting cell"
                            },
                            "check_id": {
                                "type": "string",
                                "description": "Filter by check name"
                            },
                            "module_id": {
                                "type": "string",
                                "description": "Filter by module path"
                            },
                            "limit": {
                                "type": "integer",
                                "description": "Max results (default 50)",
                                "default": 50
                            }
                        }
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "diagnostic_hints",
                    "description": "Get recovery hints for a specific bytecode error by category and error code.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "category": {
                                "type": "string",
                                "description": "Error category (e.g. TYPE, LINGUISTIC, RANGE, STATE, VALUE)"
                            },
                            "error_code": {
                                "type": "string",
                                "description": "4-digit hex error code (e.g. 0105, 0F03, 0A01)"
                            }
                        },
                        "required": ["category", "error_code"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "immunity_scan",
                    "description": "Scan a source file through the Scholomance immune system. Checks Innate Layer (fixed rules) and Adaptive Layer (pathogen registry) for violations.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "file_path": {
                                "type": "string",
                                "description": "Relative file path to scan (e.g. 'src/pages/Combat/CombatPage.jsx')"
                            }
                        },
                        "required": ["file_path"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "immunity_status",
                    "description": "Get the immune system health status — pathogen registry size, ruleset version, memory usage.",
                    "parameters": {
                        "type": "object",
                        "properties": {}
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "raid_query",
                    "description": "Full Clerical RAID query with optional agent hook for role-specific playbook. Matches symptoms against 50+ seeded bug patterns.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "symptoms": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Symptom lines or error descriptions"
                            },
                            "file_paths": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Affected file paths"
                            },
                            "agent_role": {
                                "type": "string",
                                "enum": ["codex", "claude", "gemini", "merlin"],
                                "description": "Agent role for hook-based analysis with charter playbook"
                            }
                        },
                        "required": ["symptoms"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "codebase_search",
                    "description": "Semantic + literal + phonetic hybrid codebase search. Much more thorough than basic grep — finds content matches even with different wording.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "Search query for literal, semantic, and phonetic matching"
                            }
                        },
                        "required": ["query"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "forensic_search",
                    "description": "Advanced regex/literal search across the codebase with file filtering options.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "The literal string or regex pattern to find"
                            },
                            "is_regex": {
                                "type": "boolean",
                                "description": "Treat query as a regular expression",
                                "default": False
                            },
                            "case_sensitive": {
                                "type": "boolean",
                                "description": "Case-sensitive search",
                                "default": False
                            },
                            "include_pattern": {
                                "type": "string",
                                "description": "Glob pattern for files to include (e.g. '*.js')"
                            },
                            "limit": {
                                "type": "integer",
                                "description": "Max results (default 75)",
                                "default": 75
                            }
                        },
                        "required": ["query"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "bug_create",
                    "description": "Create a bug report in the collab database. Requires the collab server to be running.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "title": {
                                "type": "string",
                                "description": "Short title of the bug"
                            },
                            "source_type": {
                                "type": "string",
                                "enum": ["human", "runtime", "qa", "pipeline", "agent"],
                                "description": "Source of the report"
                            },
                            "summary": {
                                "type": "string",
                                "description": "Detailed summary"
                            },
                            "priority": {
                                "type": "integer",
                                "description": "Priority (0-3)",
                                "default": 1
                            }
                        },
                        "required": ["title", "source_type"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "bug_list",
                    "description": "List bug reports from the collab database. Optional filter by status.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "status": {
                                "type": "string",
                                "description": "Filter by status (e.g. 'open', 'triaged', 'fixed')"
                            }
                        }
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "task_create",
                    "description": "Create a task in the collab database. Requires the collab server to be running.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "title": {
                                "type": "string",
                                "description": "Task ritual title"
                            },
                            "description": {
                                "type": "string",
                                "description": "Detailed task purpose"
                            },
                            "priority": {
                                "type": "integer",
                                "description": "Priority level (0-3)",
                                "default": 1
                            },
                            "file_paths": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Relevant file paths"
                            }
                        },
                        "required": ["title"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "task_list",
                    "description": "List tasks from the collab database. Optional filter by status.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "status": {
                                "type": "string",
                                "description": "Filter by status (e.g. 'backlog', 'in_progress', 'done')"
                            }
                        }
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "agent_list",
                    "description": "List registered agents in the collab control plane.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "role": {
                                "type": "string",
                                "enum": ["ui", "backend", "qa"],
                                "description": "Filter by agent role"
                            }
                        }
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "memory_get",
                    "description": "Retrieve a value from persistent memory by key. Memories persist across sessions.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "key": {
                                "type": "string",
                                "description": "Memory key to retrieve (max 128 chars)"
                            },
                            "agent_id": {
                                "type": "string",
                                "description": "Agent-specific memory (default: global)"
                            }
                        },
                        "required": ["key"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "memory_set",
                    "description": "Store a value in persistent memory by key. Values persist across sessions. Use this to remember user preferences, project context, decisions, or anything worth recalling later.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "key": {
                                "type": "string",
                                "description": "Memory key (max 128 chars)"
                            },
                            "value": {
                                "type": "string",
                                "description": "Value to store (JSON-serializable)"
                            },
                            "agent_id": {
                                "type": "string",
                                "description": "Agent-specific memory (default: global)"
                            }
                        },
                        "required": ["key", "value"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "heal",
                    "description": "Run the autonomous healing loop: diagnose bug via RAID → apply patch → run tests → learn from result. Use when you have a bug report and want the system to attempt automatic repair.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "symptoms": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Bug symptom descriptions"
                            },
                            "file_paths": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Affected file paths"
                            },
                            "error_messages": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Error messages or log lines"
                            },
                            "layer_hint": {
                                "type": "string",
                                "description": "CODEx layer hint (e.g. 'core', 'service', 'runtime', 'server')"
                            },
                            "task_id": {
                                "type": "string",
                                "description": "Existing task ID to link results to"
                            },
                            "test_suite": {
                                "type": "string",
                                "enum": ["lint", "typecheck", "test", "qa", "backend", "build"],
                                "description": "Verification suite to run after applying patch (default: qa)"
                            },
                            "max_iterations": {
                                "type": "integer",
                                "description": "Max heal iterations (default: 3)"
                            },
                            "patch_content": {
                                "type": "string",
                                "description": "Optional explicit patch content (search/replace block). If omitted, the healer loads the fix template from the matched RAID pattern."
                            },
                            "target_file": {
                                "type": "string",
                                "description": "Target file for the patch (relative to project root)"
                            }
                        },
                        "required": ["symptoms"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "apply_patch",
                    "description": "Apply a search/replace patch or unified diff to a file. Use this when you have a ready patch and want to write it to disk immediately.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "file_path": {
                                "type": "string",
                                "description": "Relative path of the file to patch"
                            },
                            "patch": {
                                "type": "string",
                                "description": "Search/replace block (SEARCH\\n---\\nREPLACE), unified diff, or full file content"
                            },
                            "backup": {
                                "type": "boolean",
                                "description": "Create .bak before applying (default: true)"
                            }
                        },
                        "required": ["file_path", "patch"]
                    }
                }
            }
        ]
 
    def _init_persistence(self):
        result = _run_bridge("init-persistence", timeout=10)
        if isinstance(result, dict) and result.get("available"):
            return result
        return None


    def execute_tool(self, tool_name, kwargs, callback=None):
        # ── CLI Gate: cooldown + redundancy check ────────────
        if not _gate_check(tool_name, kwargs, callback):
            return f"⛔ Gate blocked '{tool_name}': check your cadence."
        # ──────────────────────────────────────────────────────
        if tool_name == "read_file":
            return self._read_file(kwargs, callback)
        elif tool_name == "search_code":
            return self._search_code(kwargs, callback)
        elif tool_name == "list_directory":
            return self._list_directory(kwargs, callback)
        elif tool_name == "find_file":
            return self._find_file(kwargs, callback)
        elif tool_name == "run_command":
            return self._run_command(kwargs, callback)
        elif tool_name == "tui_inspect":
            return self._tui_inspect(kwargs, callback)
        elif tool_name == "git_diff":
            return self._git_diff(kwargs, callback)
        elif tool_name == "replace_file_content":
            return self._replace_file_content(kwargs, callback)
        elif tool_name == "search_youtube":
            return self._search_youtube(kwargs, callback)
        elif tool_name == "cleri_scan":
            return self._cleri_scan(kwargs, callback)
        elif tool_name == "cleri_stats":
            return self._cleri_stats(kwargs, callback)
        elif tool_name == "cleri_probe":
            return self._cleri_probe(kwargs, callback)
        elif tool_name == "health_emit":
            return self._health_emit(kwargs, callback)
        elif tool_name == "health_verify":
            return self._health_verify(kwargs, callback)
        elif tool_name == "archive_search":
            return self._archive_search(kwargs, callback)
        elif tool_name == "archive_neighbors":
            return self._archive_neighbors(kwargs, callback)
        elif tool_name == "scd64_decode":
            return self._scd64_decode(kwargs, callback)
        elif tool_name == "scd64_scan":
            return self._scd64_scan(kwargs, callback)
        elif tool_name == "law_get":
            return self._law_get(kwargs, callback)
        elif tool_name == "law_audit":
            return self._law_audit(kwargs, callback)
        elif tool_name == "law_debug":
            return self._law_debug(kwargs, callback)
        elif tool_name == "diagnostic_scan":
            return self._diagnostic_scan(kwargs, callback)
        elif tool_name == "diagnostic_summary":
            return self._diagnostic_summary(kwargs, callback)
        elif tool_name == "diagnostic_violations":
            return self._diagnostic_violations(kwargs, callback)
        elif tool_name == "diagnostic_health":
            return self._diagnostic_health(kwargs, callback)
        elif tool_name == "diagnostic_hints":
            return self._diagnostic_hints(kwargs, callback)
        elif tool_name == "immunity_scan":
            return self._immunity_scan(kwargs, callback)
        elif tool_name == "immunity_status":
            return self._immunity_status(kwargs, callback)
        elif tool_name == "raid_query":
            return self._raid_query(kwargs, callback)
        elif tool_name == "codebase_search":
            return self._codebase_search(kwargs, callback)
        elif tool_name == "forensic_search":
            return self._forensic_search(kwargs, callback)
        elif tool_name == "bug_create":
            return self._bug_create(kwargs, callback)
        elif tool_name == "bug_list":
            return self._bug_list(kwargs, callback)
        elif tool_name == "task_create":
            return self._task_create(kwargs, callback)
        elif tool_name == "task_list":
            return self._task_list(kwargs, callback)
        elif tool_name == "agent_list":
            return self._agent_list(kwargs, callback)
        elif tool_name == "memory_get":
            return self._memory_get(kwargs, callback)
        elif tool_name == "memory_set":
            return self._memory_set(kwargs, callback)
        elif tool_name == "heal":
            return self._heal(kwargs, callback)
        elif tool_name == "apply_patch":
            return self._apply_patch(kwargs, callback)
        return "Tool not found."

    def _read_file(self, kwargs, callback):
        raw_path = kwargs.get("path", "")
        max_lines = min(kwargs.get("max_lines", 100), 500)
        safe = _safe_path(raw_path)
        if not safe or not os.path.isfile(safe):
            return f"Error: File not found or path escapes project root: {raw_path}"
        try:
            content = _tui_file_cache.read(safe)
            if content is None:
                return f"Error: could not read {raw_path}"
            lines = content.split("\n")
            total = len(lines)
            shown = lines[:max_lines]
            result = "\n".join(shown)
            if total > max_lines:
                result += f"\n... ({total - max_lines} more lines, use --max-lines to increase)"
            if callback:
                callback(f"  [#7CFF8B]✓[/] read_file({raw_path}): {total} lines")
            return f"--- {raw_path} ({total} lines, showing {min(max_lines, total)}) ---\n{result}"
        except Exception as e:
            return f"Error reading {raw_path}: {e}"

    def _replace_file_content(self, kwargs, callback):
        raw_path = kwargs.get("path", "")
        target = kwargs.get("target_content", "")
        replacement = kwargs.get("replacement_content", "")
        safe = _safe_path(raw_path)
        if not safe or not os.path.isfile(safe):
            return f"Error: File not found or invalid path: {raw_path}"
        try:
            with open(safe, "r", errors="replace") as f:
                content = f.read()
            if target not in content:
                return "Error: target_content not found exactly in the file."
            if content.count(target) > 1:
                return "Error: target_content appears multiple times. Provide more context to make it unique."
            new_content = content.replace(target, replacement)
            with open(safe, "w", encoding="utf-8") as f:
                f.write(new_content)
            if callback:
                callback(f"  [#7CFF8B]✓[/] replace_file_content({raw_path})")
            return f"Successfully updated {raw_path}."
        except Exception as e:
            return f"Error modifying {raw_path}: {e}"

    def _search_code(self, kwargs, callback):
        pattern = kwargs.get("pattern", "")
        include = kwargs.get("include", "")
        max_results = kwargs.get("max_results", 200)
        if not pattern:
            return "Error: No search pattern provided."

        cmd = ["grep", "-r", "-n", pattern, PROJECT_ROOT]
        ignore_dirs = ["node_modules", ".git", "dist", "build", ".cache",
                       "coverage", "__pycache__", ".gradle", ".venv"]
        for d in ignore_dirs:
            cmd.extend(["--exclude-dir", d])

        if include:
            cmd.extend(["--include", include])

        try:
            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=15, cwd=PROJECT_ROOT
            )
            output = result.stdout.strip()
            if not output:
                return f"No matches found for '{pattern}'."

            lines = output.split("\n")
            truncated = lines[:max_results]
            body = "\n".join(truncated)
            if len(lines) > max_results:
                body += f"\n... ({len(lines) - max_results} more matches)"
            if callback:
                callback(f"  [#7CFF8B]✓[/] search_code('{pattern}'): {len(lines)} matches")
            return body
        except subprocess.TimeoutExpired:
            return f"Search timed out for '{pattern}'. Try a more specific pattern."
        except Exception as e:
            return f"Search error: {e}"

    def _list_directory(self, kwargs, callback):
        raw_path = kwargs.get("path", ".")
        recursive = kwargs.get("recursive", False)
        safe = _safe_path(raw_path)
        if not safe or not os.path.isdir(safe):
            return f"Error: Directory not found or path escapes project root: {raw_path}"
        try:
            if not recursive:
                entries = os.listdir(safe)
                dirs = []
                files = []
                for e in sorted(entries):
                    full = os.path.join(safe, e)
                    if os.path.isdir(full):
                        dirs.append(f"[DIR]  {e}/")
                    else:
                        size = os.path.getsize(full)
                        files.append(f"[FILE] {e}  ({size} bytes)")
                result = "\n".join(dirs + files)
                total = len(dirs) + len(files)
            else:
                lines = []
                for root, dirnames, filenames in os.walk(safe):
                    # ignore some common hidden dirs to prevent massive output
                    dirnames[:] = [d for d in dirnames if not d.startswith('.') and d not in ('node_modules', '__pycache__', 'venv', 'env')]
                    
                    rel_root = os.path.relpath(root, PROJECT_ROOT)
                    if rel_root == ".":
                        rel_root = ""
                    else:
                        rel_root += "/"
                    for f in sorted(filenames):
                        full = os.path.join(root, f)
                        size = os.path.getsize(full)
                        lines.append(f"[FILE] {rel_root}{f}  ({size} bytes)")
                        if len(lines) > 500:
                            lines.append("... (truncated at 500 files)")
                            break
                    if len(lines) > 500:
                        break
                result = "\n".join(lines)
                total = len(lines)
            
            if callback:
                callback(f"  [#7CFF8B]✓[/] list_directory({raw_path}, recursive={recursive}): {total} entries")
            return f"--- {raw_path} ({total} entries) ---\n{result}"
        except Exception as e:
            return f"Error listing {raw_path}: {e}"

    def _find_file(self, kwargs, callback):
        query = kwargs.get("query", "")
        max_results = kwargs.get("max_results", 200)
        
        if not query:
            return "Error: No query provided."
            
        try:
            cmd = ["find", PROJECT_ROOT, "-type", "f", "-name", query]
            ignore_dirs = ["node_modules", ".git", "dist", "build", ".cache",
                           "coverage", "__pycache__", ".gradle", ".venv"]
            
            # Use basic find without -prune for simplicity, then filter in python
            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=15, cwd=PROJECT_ROOT
            )
            output = result.stdout.strip()
            
            if not output:
                return f"No files found matching '{query}'."
                
            lines = output.split("\n")
            
            # Filter ignored directories
            filtered_lines = []
            for line in lines:
                skip = False
                for d in ignore_dirs:
                    if f"/{d}/" in line or line.endswith(f"/{d}"):
                        skip = True
                        break
                if not skip:
                    filtered_lines.append(line)
                    
            if not filtered_lines:
                return f"No files found matching '{query}' (excluding ignored dirs)."
                
            # Convert to relative paths
            rel_lines = [os.path.relpath(line, PROJECT_ROOT) for line in filtered_lines]
            
            truncated = rel_lines[:max_results]
            body = "\n".join(truncated)
            if len(rel_lines) > max_results:
                body += f"\n... ({len(rel_lines) - max_results} more matches)"
                
            if callback:
                callback(f"  [#7CFF8B]✓[/] find_file('{query}'): {len(rel_lines)} matches")
            return body
            
        except subprocess.TimeoutExpired:
            return f"Find timed out for '{query}'."
        except Exception as e:
            return f"Find error: {e}"


    def _run_command(self, kwargs, callback):
        cmd_str = kwargs.get("command", "").strip()
        if not cmd_str:
            return "Error: No command provided."
        try:
            result = subprocess.run(
                cmd_str, capture_output=True, text=True, timeout=15,
                shell=True, cwd=PROJECT_ROOT
            )
            out = result.stdout.strip()
            err = result.stderr.strip()
            output = ""
            if out:
                output += out[:3000]
                if len(out) > 3000:
                    output += "\n... [output truncated]"
            if err:
                if output:
                    output += "\n--- stderr ---\n"
                output += err[:1000]
                if len(err) > 1000:
                    output += "\n... [stderr truncated]"
            if not output:
                output = "(no output, exit code: {})".format(result.returncode)
            if callback:
                callback(f"  [#7CFF8B]✓[/] run_command('{cmd_str}'): exit {result.returncode}")
            return output
        except subprocess.TimeoutExpired:
            return "Command timed out after 15s."
        except Exception as e:
            return f"Command error: {e}"

    def _git_diff(self, kwargs, callback):
        import subprocess
        path = kwargs.get("path", "")
        cmd = ["git", "diff", "HEAD"]
        if path:
            cmd.append(path)
        if callback:
            callback(f"  [bold #FFD700]⚡[/] git_diff({path})")
        try:
            result = subprocess.run(cmd, cwd=PROJECT_ROOT, capture_output=True, text=True)
            if result.returncode != 0:
                return f"Git error: {result.stderr}"
            return result.stdout if result.stdout else "No changes."
        except Exception as e:
            return f"Command error: {e}"

    def _tui_inspect(self, kwargs, callback):
        if callback and hasattr(callback, "__self__"):
            app = callback.__self__
            def _dump_widget(w):
                d = {
                    "type": w.__class__.__name__,
                    "id": w.id,
                    "classes": list(w.classes),
                }
                if hasattr(w, "renderable") and isinstance(w.renderable, str):
                    d["text"] = w.renderable[:100]
                if w.children:
                    d["children"] = [_dump_widget(c) for c in w.children]
                return d
            
            try:
                tree = _dump_widget(app.screen)
                import json
                res = json.dumps(tree, indent=2)
                if callback:
                    callback("  [bold #FFD700]⚡[/] tui_inspect() -> captured live DOM")
                return res
            except Exception as e:
                return f"Error building DOM tree: {e}"
        return "Error: Cannot access TUI application context."

    def _fmt_bridge(self, label, result, callback):
        if isinstance(result, dict) and "error" in result:
            return f"{label} error: {result['error']}"
        try:
            text = json.dumps(result, indent=2, default=str)
            if len(text) > 4000:
                text = text[:4000] + "\n... [truncated]"
            if callback:
                callback(f"  [#7CFF8B]✓[/] {label}")
            return text
        except Exception as e:
            return f"Format error: {e}"

    def _cleri_scan(self, kwargs, callback):
        text = kwargs.get("symptoms", "")
        if not text:
            return "Error: No symptom text provided."
        result = _run_bridge("scan", text)
        return self._fmt_bridge("cleri_scan", result, callback)

    def _cleri_stats(self, kwargs, callback):
        result = _run_bridge("stats")
        return self._fmt_bridge("cleri_stats", result, callback)

    def _cleri_probe(self, kwargs, callback):
        text = kwargs.get("hypothesis", "")
        if not text:
            return "Error: No hypothesis provided."
        result = _run_bridge("probe", text, "--mode=prion")
        return self._fmt_bridge("cleri_probe", result, callback)

    def _health_emit(self, kwargs, callback):
        cell = kwargs.get("cell_id", "")
        check = kwargs.get("check_id", "")
        module = kwargs.get("module_id", "")
        if not cell or not check:
            return "Error: cell_id and check_id are required."
        args = [cell, check]
        if module:
            args.extend(["--module", module])
        result = _run_bridge("health", *args)
        if isinstance(result, dict) and "error" not in result:
            bc = result.get("bytecode", "")
            if callback:
                callback(f"  [#7CFF8B]✓[/] health_emit: {bc}")
            return (
                f"BytecodeHealth signal emitted:\n"
                f"  Code: {result.get('code')}\n"
                f"  Cell: {result.get('cellId')}  Check: {result.get('checkId')}\n"
                f"  Checksum: {result.get('checksum')}\n"
                f"  Bytecode: {bc}"
            )
        return self._fmt_bridge("health_emit", result, callback)

    def _health_verify(self, kwargs, callback):
        cell = kwargs.get("cell_id", "IMMUNE_CELL")
        check = kwargs.get("check_id", "VERIFY")
        result = _run_bridge("health-verify", cell, check)
        if isinstance(result, dict) and "error" not in result:
            det = result.get("deterministic", False)
            drift = result.get("checksumDrift", "?")
            status = "PASS" if det else "FAIL"
            if callback:
                callback(f"  [#7CFF8B]✓[/] health_verify: {status} (drift={drift})")
            return (
                f"BytecodeHealth Determinism Verification:\n"
                f"  Status: {'✅ PASS' if det else '❌ FAIL'}\n"
                f"  Iterations: {result.get('iterations', 100)}\n"
                f"  Checksum Drift: {drift}\n"
                f"  Sample Checksum: {result.get('sampleChecksum', 'N/A')}"
            )
        return self._fmt_bridge("health_verify", result, callback)

    def _archive_search(self, kwargs, callback):
        query = kwargs.get("query", "")
        if not query:
            return "Error: No search query provided."
        result = _run_bridge("archive-search", query)
        if isinstance(result, dict) and "error" not in result:
            count = result.get("count", 0)
            results = result.get("results", [])
            lines = [f"Codebase search for '{query}': {count} matches"]
            for r in results[:30]:
                lines.append(f"  {r['file_path']} ({r.get('match', '?')})")
            if count > 30:
                lines.append(f"  ... and {count - 30} more")
            if callback:
                callback(f"  [#7CFF8B]✓[/] archive_search('{query}'): {count} matches")
            return "\n".join(lines)
        return self._fmt_bridge("archive_search", result, callback)

    def _archive_neighbors(self, kwargs, callback):
        path = kwargs.get("path", "")
        if not path:
            return "Error: No file path provided."
        result = _run_bridge("archive-neighbors", path)
        if isinstance(result, dict) and "error" not in result:
            focus = result.get("focus", path)
            count = result.get("count", 0)
            neighbors = result.get("neighbors", [])
            lines = [f"Neighbors of {focus}: {count} files"]
            for n in neighbors[:20]:
                lines.append(f"  {n['file_path']} ({n.get('relation', '?')})")
            if count > 20:
                lines.append(f"  ... and {count - 20} more")
            if callback:
                callback(f"  [#7CFF8B]✓[/] archive_neighbors('{path}'): {count} neighbors")
            return "\n".join(lines)
        return self._fmt_bridge("archive_neighbors", result, callback)

    def _search_youtube(self, kwargs, callback):
        query = kwargs.get("query", "")
        if callback:
            callback(
                f"  [bold #FFD700]⚡[/] search_youtube(query='{query}')")
        return (
            f"Search Results for '{query}':\n"
            "- High retention videos in this space currently use fast-paced 3-second hooks.\n"
            "- The top 5 competing thumbnails use high contrast (Crimson/Gold).\n"
            "- Average duration of competing viral hits is 12 minutes.\n"
            "- Titles currently dominating the algorithm use words like 'Banned', 'Secret', or 'Overpowered'.\n"
        )

    def _scd64_decode(self, kwargs, callback):
        checksum = kwargs.get("checksum", "")
        if not checksum:
            return "Error: No checksum provided."
        
        cmd = ["npx", "tsx", "scripts/scd64-decode.ts", checksum]
        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=15, cwd=PROJECT_ROOT)
            if proc.returncode != 0:
                return f"Error decoding SCD64:\n{proc.stderr.strip() or proc.stdout.strip()}"
            
            result = json.loads(proc.stdout)
            if callback:
                callback(f"  [#7CFF8B]✓[/] scd64_decode: {result.get('bugFamily', 'UNKNOWN')}")
            return json.dumps(result, indent=2)
        except subprocess.TimeoutExpired:
            return "Error: scd64-decode.ts timed out."
        except json.JSONDecodeError:
            return f"Error parsing scd64-decode output: {proc.stdout}"
        except Exception as e:
            return f"Error: {e}"

    def _scd64_scan(self, kwargs, callback):
        file_path = kwargs.get("path", "")
        if not file_path:
            return "Error: No file path provided."
        safe = _safe_path(file_path)
        if not safe:
            return "Error: Invalid path."
        
        cmd = ["npx", "tsx", "scripts/scd64-intellisense.ts", "--json", file_path]
        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=30, cwd=PROJECT_ROOT)
            
            # The script might exit with 1 if there are errors but still outputs JSON if --json is passed
            out = proc.stdout.strip()
            if not out:
                return f"Error running scd64 scan:\n{proc.stderr.strip()}"
                
            try:
                result = json.loads(out)
            except json.JSONDecodeError:
                return f"Error parsing scd64-intellisense output:\n{out}\n{proc.stderr.strip()}"

            if callback:
                count = len(result) if isinstance(result, list) else 0
                callback(f"  [#7CFF8B]✓[/] scd64_scan({file_path}): {count} mutations found")
            return json.dumps(result, indent=2)
        except subprocess.TimeoutExpired:
            return "Error: scd64-intellisense.ts timed out."
        except Exception as e:
            return f"Error: {e}"

    def _law_get(self, kwargs, callback):
        section = kwargs.get("section", "")
        if not section:
            return "Error: No section provided. Usage: law_get(section='Determinism')"
        max_chars = min(kwargs.get("max_chars", 4000), 16000)
        result = _run_bridge("law-get", section, "--max-chars", str(max_chars))
        if isinstance(result, dict) and "error" not in result:
            excerpt = result.get("excerpt", "")
            if callback:
                callback(f"  [#7CFF8B]✓[/] law_get('{section}'): {result.get('full_length', 0)} chars available")
            return (
                f"--- Law: {section} ({result.get('source', 'VAELRIX_LAW')}) ---\n"
                f"{excerpt}\n"
                f"--- ({len(excerpt)} chars shown, {result.get('full_length', '?')} total ---"
            )
        return self._fmt_bridge("law_get", result, callback)

    def _law_audit(self, kwargs, callback):
        file_path = kwargs.get("file_path", "")
        intent = kwargs.get("intent", "")
        if not file_path and not intent:
            return "Error: Provide either file_path to audit or intent for pre-emptive audit."
        args = []
        if file_path:
            args.append(file_path)
        if intent:
            args.extend(["--intent", intent])
        result = _run_bridge("law-audit", *args)
        if isinstance(result, dict) and "error" not in result:
            violations = result.get("violations", [])
            if callback:
                callback(f"  [#7CFF8B]✓[/] law_audit: {len(violations)} violations found")
            lines = [f"--- Law Audit: {file_path or intent} ---"]
            if violations:
                lines.append(f"\nViolations ({len(violations)}):")
                for v in violations:
                    lines.append(f"  [{v.get('severity', 'INFO')}] {v.get('law')}")
                    lines.append(f"    {v.get('note', '')}")
            else:
                lines.append("\nNo violations detected.")
            return "\n".join(lines)
        return self._fmt_bridge("law_audit", result, callback)

    def _law_debug(self, kwargs, callback):
        anomaly = kwargs.get("anomaly_name", "")
        symptoms = kwargs.get("symptoms", [])
        if not anomaly or not symptoms:
            return "Error: anomaly_name and symptoms are required."
        target_files = kwargs.get("target_files", [])
        mode = kwargs.get("mode", "B")
        args = [anomaly, *symptoms, "--mode", mode]
        if target_files:
            args.extend(["--target-files", ",".join(target_files)])
        result = _run_bridge("law-debug", *args)
        if isinstance(result, dict) and "error" not in result:
            report = result.get("report", "")
            if callback:
                callback(f"  [#7CFF8B]✓[/] law_debug('{anomaly}'): mode {mode}")
            return report[:4000]
        return self._fmt_bridge("law_debug", result, callback)

    def _diagnostic_scan(self, kwargs, callback):
        trigger = kwargs.get("trigger", "mcp")
        result = _run_bridge("diagnostic-scan", "--trigger", trigger)
        if isinstance(result, dict) and "error" not in result:
            violations = result.get("violations", [])
            if callback:
                callback(f"  [#7CFF8B]✓[/] diagnostic_scan: {len(violations)} violations")
            return (
                f"--- Diagnostic Scan Complete ---\n"
                f"  Report: {result.get('reportId', 'N/A')}\n"
                f"  Cells: {result.get('cells', [])}\n"
                f"  Violations: {len(violations)}\n"
                f"  Checksum: {result.get('checksum', 'N/A')}"
            )
        return self._fmt_bridge("diagnostic_scan", result, callback)

    def _diagnostic_summary(self, kwargs, callback):
        result = _run_bridge("diagnostic-summary")
        if isinstance(result, dict) and "error" not in result:
            summary = result.get("summary", {})
            if callback:
                callback(f"  [#7CFF8B]✓[/] diagnostic_summary: report {result.get('reportId', 'none')}")
            if not result.get("reportId"):
                return "No diagnostic reports found. Run diagnostic_scan first."
            return (
                f"--- Diagnostic Summary ---\n"
                f"  Report: {result.get('reportId')}\n"
                f"  Timestamp: {result.get('timestamp', 'N/A')}\n"
                f"  Cells: {result.get('cells', [])}\n"
                f"  Summary: {json.dumps(summary, indent=2, default=str)[:1500]}"
            )
        return self._fmt_bridge("diagnostic_summary", result, callback)

    def _diagnostic_violations(self, kwargs, callback):
        args = []
        if kwargs.get("cell"):
            args.extend(["--cell", kwargs["cell"]])
        if kwargs.get("severity"):
            args.extend(["--severity", kwargs["severity"]])
        if kwargs.get("layer"):
            args.extend(["--layer", kwargs["layer"]])
        rule_id = kwargs.get("rule_id")
        if rule_id:
            args.extend(["--rule", rule_id])
        args.extend(["--limit", str(kwargs.get("limit", 200))])
        result = _run_bridge("diagnostic-violations", *args)
        if isinstance(result, dict) and "error" not in result:
            violations = result.get("violations", [])
            if callback:
                callback(f"  [#7CFF8B]✓[/] diagnostic_violations: {len(violations)} matches")
            if not violations:
                return "No violations match the given filters."
            lines = [f"--- Violations ({result.get('count', len(violations))} total) ---"]
            for v in violations[:20]:
                ctx = v.get("context", {})
                lines.append(f"  [{v.get('severity', '?')}] {ctx.get('ruleId', v.get('cell', '?'))} - {v.get('message', v.get('checkId', ''))}")
            if len(violations) > 20:
                lines.append(f"  ... and {len(violations) - 20} more")
            return "\n".join(lines)
        return self._fmt_bridge("diagnostic_violations", result, callback)

    def _diagnostic_health(self, kwargs, callback):
        args = []
        if kwargs.get("cell_id"):
            args.extend(["--cell-id", kwargs["cell_id"]])
        if kwargs.get("check_id"):
            args.extend(["--check-id", kwargs["check_id"]])
        module_id = kwargs.get("module_id")
        if module_id:
            args.extend(["--module", module_id])
        args.extend(["--limit", str(kwargs.get("limit", 200))])
        result = _run_bridge("diagnostic-health", *args)
        if isinstance(result, dict) and "error" not in result:
            health = result.get("health", [])
            if callback:
                callback(f"  [#7CFF8B]✓[/] diagnostic_health: {len(health)} signals")
            if not health:
                return "No health signals match the given filters."
            lines = [f"--- Health Signals ({result.get('count', len(health))} total) ---"]
            for h in health[:20]:
                lines.append(f"  {h.get('cellId', '?')} / {h.get('checkId', '?')} [{h.get('checksum', '')[:16]}...]")
            if len(health) > 20:
                lines.append(f"  ... and {len(health) - 20} more")
            return "\n".join(lines)
        return self._fmt_bridge("diagnostic_health", result, callback)

    def _diagnostic_hints(self, kwargs, callback):
        category = kwargs.get("category", "")
        code = kwargs.get("error_code", "")
        if not category or not code:
            return "Error: category and error_code are required."
        result = _run_bridge("diagnostic-hints", category, code)
        if isinstance(result, dict) and "error" not in result:
            if callback:
                callback(f"  [#7CFF8B]✓[/] diagnostic_hints({category}/{code})")
            return json.dumps(result, indent=2, default=str)[:2000]
        return self._fmt_bridge("diagnostic_hints", result, callback)

    def _immunity_scan(self, kwargs, callback):
        file_path = kwargs.get("file_path", "")
        if not file_path:
            return "Error: file_path is required."
        result = _run_bridge("immunity-scan", file_path)
        if isinstance(result, dict) and "error" not in result:
            status = result.get("status", "UNKNOWN")
            report = result.get("report", "")
            if callback:
                callback(f"  [#7CFF8B]✓[/] immunity_scan({file_path}): {status}")
            return report or json.dumps(result, indent=2, default=str)[:3000]
        return self._fmt_bridge("immunity_scan", result, callback)

    def _immunity_status(self, kwargs, callback):
        result = _run_bridge("immunity-status")
        if isinstance(result, dict) and "error" not in result:
            if callback:
                callback("  [#7CFF8B]✓[/] immunity_status")
            return json.dumps(result, indent=2, default=str)[:2000]
        return self._fmt_bridge("immunity_status", result, callback)

    def _raid_query(self, kwargs, callback):
        symptoms = kwargs.get("symptoms", [])
        if not symptoms:
            return "Error: symptoms are required."
        args = list(symptoms)
        if kwargs.get("file_paths"):
            args.extend(["--file-paths", ",".join(kwargs["file_paths"])])
        if kwargs.get("agent_role"):
            args.extend(["--agent", kwargs["agent_role"]])
        result = _run_bridge("raid-query", *args)
        if isinstance(result, dict) and "error" not in result:
            verdict = result.get("verdict", result.get("match", "NO_MATCH"))
            if callback:
                callback(f"  [#7CFF8B]✓[/] raid_query: {verdict}")
            return json.dumps(result, indent=2, default=str)[:3000]
        return self._fmt_bridge("raid_query", result, callback)

    def _codebase_search(self, kwargs, callback):
        query = kwargs.get("query", "")
        if not query:
            return "Error: query is required."
        result = _run_bridge("codebase-search", query)
        if isinstance(result, dict) and "error" not in result:
            if callback:
                count = len(result.get("results", []))
                callback(f"  [#7CFF8B]✓[/] codebase_search('{query}'): {count} results")
            return json.dumps(result, indent=2, default=str)[:3000]
        return self._fmt_bridge("codebase_search", result, callback)

    def _forensic_search(self, kwargs, callback):
        query = kwargs.get("query", "")
        if not query:
            return "Error: query is required."
        args = [query]
        if kwargs.get("is_regex"):
            args.append("--is-regex")
        if kwargs.get("case_sensitive"):
            args.append("--case-sensitive")
        include = kwargs.get("include_pattern")
        if include:
            args.extend(["--include", include])
        args.extend(["--limit", str(kwargs.get("limit", 500))])
        result = _run_bridge("forensic-search", *args)
        if isinstance(result, dict) and "error" not in result:
            if callback:
                count = len(result.get("results", []))
                callback(f"  [#7CFF8B]✓[/] forensic_search: {count} matches")
            return json.dumps(result, indent=2, default=str)[:3000]
        return self._fmt_bridge("forensic_search", result, callback)

    def _bug_create(self, kwargs, callback):
        title = kwargs.get("title", "")
        source_type = kwargs.get("source_type", "agent")
        if not title:
            return "Error: title is required."
        args = [title, source_type]
        if kwargs.get("summary"):
            args.extend(["--summary", kwargs["summary"]])
        if kwargs.get("priority") is not None:
            args.extend(["--priority", str(kwargs["priority"])])
        result = _run_bridge("bug-create", *args)
        if isinstance(result, dict) and "error" not in result:
            bug_id = result.get("id", "N/A")
            if callback:
                callback(f"  [#7CFF8B]✓[/] bug_create: id={bug_id}")
            return f"Bug report created: id={bug_id}, title='{title}'"
        return self._fmt_bridge("bug_create", result, callback)

    def _bug_list(self, kwargs, callback):
        args = []
        if kwargs.get("status"):
            args.extend(["--status", kwargs["status"]])
        result = _run_bridge("bug-list", *args)
        if isinstance(result, dict) and "error" not in result:
            bugs = result if isinstance(result, list) else result.get("bug_reports", result.get("data", []))
            if callback:
                callback(f"  [#7CFF8B]✓[/] bug_list: {len(bugs)} reports")
            if not bugs:
                return "No bug reports found."
            lines = [f"--- Bug Reports ({len(bugs)}) ---"]
            for b in bugs[:20]:
                lines.append(f"  [{b.get('id', '?')}] {b.get('title', '?')} - {b.get('status', '?')}")
            if len(bugs) > 20:
                lines.append(f"  ... and {len(bugs) - 20} more")
            return "\n".join(lines)
        return self._fmt_bridge("bug_list", result, callback)

    def _task_create(self, kwargs, callback):
        title = kwargs.get("title", "")
        if not title:
            return "Error: title is required."
        args = [title]
        if kwargs.get("description"):
            args.extend(["--description", kwargs["description"]])
        if kwargs.get("priority") is not None:
            args.extend(["--priority", str(kwargs["priority"])])
        if kwargs.get("file_paths"):
            args.extend(["--file-paths", ",".join(kwargs["file_paths"])])
        result = _run_bridge("task-create", *args)
        if isinstance(result, dict) and "error" not in result:
            task_id = result.get("id", "N/A")
            if callback:
                callback(f"  [#7CFF8B]✓[/] task_create: id={task_id}")
            return f"Task created: id={task_id}, title='{title}'"
        return self._fmt_bridge("task_create", result, callback)

    def _task_list(self, kwargs, callback):
        args = []
        if kwargs.get("status"):
            args.extend(["--status", kwargs["status"]])
        result = _run_bridge("task-list", *args)
        if isinstance(result, dict) and "error" not in result:
            tasks = result if isinstance(result, list) else result.get("tasks", result.get("data", []))
            if callback:
                callback(f"  [#7CFF8B]✓[/] task_list: {len(tasks)} tasks")
            if not tasks:
                return "No tasks found."
            lines = [f"--- Tasks ({len(tasks)}) ---"]
            for t in tasks[:20]:
                lines.append(f"  [{t.get('id', '?')}] {t.get('title', '?')} - {t.get('status', '?')} (P{t.get('priority', 1)})")
            if len(tasks) > 20:
                lines.append(f"  ... and {len(tasks) - 20} more")
            return "\n".join(lines)
        return self._fmt_bridge("task_list", result, callback)

    def _agent_list(self, kwargs, callback):
        args = []
        if kwargs.get("role"):
            args.extend(["--role", kwargs["role"]])
        result = _run_bridge("agent-list", *args)
        if isinstance(result, dict) and "error" not in result:
            agents = result if isinstance(result, list) else result.get("agents", result.get("data", []))
            if callback:
                callback(f"  [#7CFF8B]✓[/] agent_list: {len(agents)} agents")
            if not agents:
                return "No agents registered."
            lines = [f"--- Agents ({len(agents)}) ---"]
            for a in agents[:20]:
                lines.append(f"  [{a.get('id', '?')}] {a.get('name', '?')} ({a.get('role', '?')}) - {a.get('status', '?')}")
            return "\n".join(lines)
        return self._fmt_bridge("agent_list", result, callback)

    def _memory_get(self, kwargs, callback):
        key = kwargs.get("key", "")
        if not key:
            return "Error: key is required."
        args = [key]
        if kwargs.get("agent_id"):
            args.extend(["--agent-id", kwargs["agent_id"]])
        result = _run_bridge("memory-get", *args)
        if isinstance(result, dict) and "error" not in result:
            result.get("value", result.get("data", ""))
            if callback:
                callback(f"  [#7CFF8B]✓[/] memory_get('{key}')")
            return json.dumps(result, indent=2, default=str)
        return self._fmt_bridge("memory_get", result, callback)

    def _memory_set(self, kwargs, callback):
        key = kwargs.get("key", "")
        raw = kwargs.get("value", "")
        if not key or raw == "":
            return "Error: key and non-empty value are required."
        value = json.dumps(raw) if not isinstance(raw, str) else raw
        args = [key, value]
        if kwargs.get("agent_id"):
            args.extend(["--agent-id", kwargs["agent_id"]])
        result = _run_bridge("memory-set", *args)
        if isinstance(result, dict) and "error" not in result:
            if callback:
                preview = raw if isinstance(raw, str) else json.dumps(raw)[:80]
                callback(f"  [#7CFF8B]✓[/] memory_set('{key}') = {preview}")
            return f"Memory set: key='{key}'"
        return self._fmt_bridge("memory_set", result, callback)

    def _heal(self, kwargs, callback):
        symptoms = kwargs.get("symptoms", [])
        if not symptoms:
            return "Error: symptoms are required."
        args = ["--bug-report", json.dumps({
            "symptoms": symptoms,
            "filePaths": kwargs.get("file_paths", []),
            "errorMessages": kwargs.get("error_messages", []),
            "layerHint": kwargs.get("layer_hint"),
        })]
        if kwargs.get("task_id"):
            args.extend(["--task-id", kwargs["task_id"]])
        if kwargs.get("test_suite"):
            args.extend(["--test-suite", kwargs["test_suite"]])
        if kwargs.get("max_iterations"):
            args.extend(["--max-iterations", str(kwargs["max_iterations"])])
        if kwargs.get("patch_content"):
            args.extend(["--patch", kwargs["patch_content"]])
        if kwargs.get("target_file"):
            args.extend(["--target-file", kwargs["target_file"]])
        result = _run_bridge("heal", *args, timeout=600)
        if isinstance(result, dict) and "error" not in result:
            status = result.get("status", "?")
            iters = result.get("iterations", "?")
            verdict = result.get("verdict", "?")
            pattern_name = result.get("pattern", {}).get("name", "none")
            if callback:
                callback(f"  [#7CFF8B]✓[/] Heal complete: {status} ({iters} iters, verdict={verdict}, pattern={pattern_name})")
            return f"Heal result: status={status}, iterations={iters}, verdict={verdict}, pattern={pattern_name}\n" + json.dumps(result, indent=2, default=str)
        return self._fmt_bridge("heal", result, callback)

    def _apply_patch(self, kwargs, callback):
        file_path = kwargs.get("file_path", "")
        patch = kwargs.get("patch", "")
        if not file_path or not patch:
            return "Error: file_path and patch are required."
        backup = kwargs.get("backup", True)
        backup_flag = "--backup" if backup else "--no-backup"
        args = [file_path, "--patch-file", "/dev/stdin"] if "\n" in patch else [file_path, patch, backup_flag]
        if "\n" in patch:
            result = _run_bridge("apply-patch", *args, timeout=30, stdin=patch)
        else:
            result = _run_bridge("apply-patch", *args, timeout=30)
        if isinstance(result, dict) and result.get("success"):
            if callback:
                callback(f"  [#7CFF8B]✓[/] Applied patch to {file_path}")
            return f"Patch applied to {file_path}: method={result.get('method', '?')}"
        return self._fmt_bridge("apply_patch", result, callback)
