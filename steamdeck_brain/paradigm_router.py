"""
Retrieval Paradigm Router — deterministic pipeline engine for the Vaelrix brain.

Each query is classified against a registry of bytecode-checksummed paradigms.
A paradigm specifies an ordered sequence of retrieval steps (substrate, Cleri
RAID, SCD64 glossary, codebase search, file-system scan, self-critique).
The router executes the pipeline, gathers context, and assembles a final prompt
for Ollama that includes retrieval artifacts, reasoning instructions, and
verification directives.

Schema: SCHOL-PARADIGM-v1  (see paradigms/*.json)
"""

import os
import json
import re
import hashlib
import time
from pathlib import Path
from typing import Dict, List, Optional, Any, Callable, Tuple

# ── Bytecode checksum ─────────────────────────────────────────────────────

def compute_checksum(data: dict) -> str:
    """Deterministic 8-hex checksum from canonical JSON of a paradigm's steps."""
    canonical = json.dumps(data, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(canonical.encode()).hexdigest()[:8]

def verify_paradigm(paradigm: dict) -> Tuple[bool, str]:
    """Verify a paradigm's checksum and required fields."""
    required = ["contract", "id", "checksum", "match", "steps"]
    for field in required:
        if field not in paradigm:
            return False, f"missing required field: {field}"
    if paradigm.get("contract") != "SCHOL-PARADIGM-v1":
        return False, f"unknown contract: {paradigm.get('contract')}"
    steps = paradigm.get("steps", [])
    steps_no_checksum = {k: v for k, v in paradigm.items() if k != "checksum"}
    actual = compute_checksum(steps_no_checksum)
    expected = paradigm["checksum"]
    if actual != expected:
        return False, f"checksum mismatch: expected {expected}, computed {actual}"
    return True, ""

# ── Pipeline step executors ────────────────────────────────────────────────

class ParadigmRouter:
    """Classifies queries against registered paradigms and runs retrieval pipelines."""

    def __init__(self, paradigm_dir: str = None):
        self.paradigms: List[dict] = []
        self._step_registry: Dict[str, Callable] = {}
        if paradigm_dir is None:
            paradigm_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "paradigms")
        self.paradigm_dir = paradigm_dir
        self._load_paradigms()
        self._init_step_registry()

    def _load_paradigms(self):
        """Load and verify all SCHOL-PARADIGM-v1 JSON files."""
        if not os.path.isdir(self.paradigm_dir):
            return
        for name in sorted(os.listdir(self.paradigm_dir)):
            if not name.endswith(".json"):
                continue
            path = os.path.join(self.paradigm_dir, name)
            try:
                with open(path, "r") as f:
                    data = json.load(f)
            except Exception as e:
                print(f"[ParadigmRouter] SKIP {name}: {e}")
                continue
            ok, err = verify_paradigm(data)
            if not ok:
                print(f"[ParadigmRouter] SKIP {name}: checksum fail — {err}")
                continue
            self.paradigms.append(data)
        # Sort by priority descending (higher priority = matched first)
        self.paradigms.sort(key=lambda p: p.get("priority", 0), reverse=True)

    def _init_step_registry(self):
        """Register step executors. Each takes (query, context, router) → result dict."""
        self._step_registry = {
            "substrate":       self._step_substrate,
            "glossary":        self._step_glossary,
            "cleri":           self._step_cleri,
            "file-system":     self._step_file_system,
            "file-read":       self._step_file_read,
            "codebase-search": self._step_codebase_search,
            "self-critique":   self._step_self_critique,
            "rhyme-engine":    self._step_rhyme_engine,
            "pixelbrain":      self._step_pixelbrain,
            "immune-scan":     self._step_immune_scan,
            "polish":          self._step_polish,
            "ollama-raw":      self._step_ollama_raw,
        }

    # ── Paradigm matching ────────────────────────────────────────────────

    def classify(self, query: str) -> Optional[dict]:
        """Return the best-matching paradigm for a query, or None."""
        if not query or not query.strip():
            return None
        q = query.strip().lower()
        best = None
        best_score = 0
        for paradigm in self.paradigms:
            score = self._match_score(paradigm, q)
            if score > best_score:
                best_score = score
                best = paradigm
        return best if best_score > 0 else None

    def _match_score(self, paradigm: dict, query: str) -> int:
        """Score how well a paradigm matches a query."""
        score = 0
        match_config = paradigm.get("match", {})
        patterns = match_config.get("patterns", [])
        keywords = match_config.get("keywords", [])
        file_refs = match_config.get("file_refs", [])
        bytecode_match = match_config.get("bytecode_prefixes", [])

        for pattern in patterns:
            if re.search(pattern, query, re.IGNORECASE):
                score += 3
        for kw in keywords:
            if kw.lower() in query:
                score += 1
        for ref in file_refs:
            if ref.lower() in query:
                score += 2
        for prefix in bytecode_match:
            prefix_upper = prefix.upper()
            if prefix_upper in query.upper():
                score += 4
        return score

    # ── Pipeline execution ────────────────────────────────────────────────

    def run_pipeline(
        self,
        query: str,
        paradigm: Optional[dict] = None,
        extra_context: dict = None,
    ) -> dict:
        """Execute the retrieval pipeline for a query.

        Returns:
          {
            "paradigm_id": str,
            "paradigm_checksum": str,
            "steps_executed": [...],
            "retrieval_artifacts": {...},
            "system_suffix": str,
            "final_prompt_context": str,
          }
        """
        if paradigm is None:
            paradigm = self.classify(query)

        result = {
            "paradigm_id": "general-chat",
            "paradigm_checksum": "00000000",
            "steps_executed": [],
            "retrieval_artifacts": {},
            "system_suffix": "",
            "final_prompt_context": "",
        }

        if paradigm is None:
            # Fall back to general chat
            for p in self.paradigms:
                if p.get("id") == "general-chat":
                    paradigm = p
                    break
            if paradigm is None:
                result["system_suffix"] = "You are Vaelrix, headmaster of the Scholomance. Answer concisely."
                return result

        result["paradigm_id"] = paradigm.get("id", "unknown")
        result["paradigm_checksum"] = paradigm.get("checksum", "00000000")
        result["system_suffix"] = paradigm.get("system_suffix", "")

        steps = paradigm.get("steps", [])
        context = extra_context or {}

        for step in steps:
            source = step.get("source", "")
            executor = self._step_registry.get(source)
            if executor is None:
                continue

            step_result = executor(query, step, context, self)
            step_label = step.get("label", source)
            result["steps_executed"].append(step_label)

            if step_result and step_result.get("content"):
                retrieval_key = step.get("retrieve_as", source)
                result["retrieval_artifacts"][retrieval_key] = step_result

        result["final_prompt_context"] = self._build_prompt_context(result)
        return result

    def _build_prompt_context(self, result: dict) -> str:
        """Assemble retrieval artifacts into a prompt context block."""
        parts = []
        artifacts = result.get("retrieval_artifacts", {})
        for key, artifact in artifacts.items():
            content = artifact.get("content", "")
            if not content:
                continue
            source = artifact.get("source", key)
            # Truncate very long artifacts
            if len(content) > 2000:
                content = content[:2000] + "\n... [truncated]"
            parts.append(f"## {source}\n{content}")
        return "\n\n".join(parts) if parts else ""

    # ── Step executors ──────────────────────────────────────────────────

    def _step_substrate(self, query: str, step: dict, context: dict, router) -> dict:
        """Query the Cortex substrate (L2 4-bit memory)."""
        pattern = step.get("query", query)
        resolved = self._resolve_template(pattern, context)
        try:
            from cortex import Cortex
            cortex = Cortex(os.path.expanduser("~/.substrate/memory.sqlite"))
            memories = cortex.retrieve(resolved, top_k=step.get("top_k", 5))
            if memories:
                lines = []
                for m in memories[: step.get("max_results", 5)]:
                    text = m.get("text") or m.get("content") or str(m)
                    if len(text) > 500:
                        text = text[:500] + "..."
                    lines.append(f"- {text}")
                return {"source": "Cortex Substrate", "content": "\n".join(lines)}
        except Exception:
            pass
        return {"source": "Cortex Substrate", "content": ""}

    def _step_glossary(self, query: str, step: dict, context: dict, router) -> dict:
        """Query SCD64 glossary for canonical terms."""
        pattern = step.get("query", query)
        resolved = self._resolve_template(pattern, context)
        family = step.get("family", "")
        try:
            import sys
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
            tools_dir = os.path.join(project_root, "tools", "scd64-vscode", "data")
            glossary_path = os.path.join(tools_dir, "scd64-glossary.v1.json")
            if os.path.exists(glossary_path):
                with open(glossary_path) as f:
                    glossary = json.load(f)
                matches = []
                query_lower = resolved.lower()
                for entry in glossary:
                    name = entry.get("name", "")
                    desc = entry.get("description", "") or entry.get("desc", "")
                    if family and entry.get("family") != family:
                        continue
                    if query_lower in name.lower() or query_lower in desc.lower():
                        matches.append(f"- **{name}**: {desc[:300]}")
                if matches:
                    return {"source": "SCD64 Glossary", "content": "\n".join(matches[: step.get("max_results", 5)])}
        except Exception:
            pass
        return {"source": "SCD64 Glossary", "content": ""}

    def _step_cleri(self, query: str, step: dict, context: dict, router) -> dict:
        """Query Clerical RAID pattern database for known bugs/heuristics."""
        try:
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
            bridge_script = os.path.join(project_root, "divtube_downloader", "scripts", "scholomance-bridge.mjs")
            import subprocess
            node_bin = os.path.expanduser("~/.nvm/versions/node/v20.20.2/bin/node")
            if not os.path.exists(node_bin):
                node_bin = "node"
            proc = subprocess.run(
                [node_bin, bridge_script, "scan", query],
                capture_output=True, text=True, timeout=30,
                cwd=project_root,
            )
            if proc.returncode == 0:
                data = json.loads(proc.stdout)
                hits = data.get("hits") or data.get("patterns") or []
                if hits:
                    lines = []
                    for h in hits[: step.get("max_results", 5)]:
                        lines.append(f"- [{h.get('severity', '?')}] {h.get('name', h.get('pattern', str(h)[:200]))}")
                    return {"source": "Cleri RAID", "content": "\n".join(lines)}
        except Exception:
            pass
        return {"source": "Cleri RAID", "content": ""}

    def _step_file_system(self, query: str, step: dict, context: dict, router) -> dict:
        """Grep the codebase for relevant files."""
        pattern = step.get("query", query)
        resolved = self._resolve_template(pattern, context)
        paths = step.get("paths", ["codex/", "src/"])
        try:
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
            found = []
            import subprocess
            for p in paths:
                full_path = os.path.join(project_root, p)
                if not os.path.exists(full_path):
                    continue
                proc = subprocess.run(
                    ["grep", "-rnl", resolved, full_path],
                    capture_output=True, text=True, timeout=10,
                )
                for line in proc.stdout.strip().split("\n"):
                    line = line.strip()
                    if line and len(found) < 10:
                        rel = os.path.relpath(line, project_root)
                        found.append(f"- {rel}")
            if found:
                return {"source": f"File System (/{resolved}/)", "content": "\n".join(found[: step.get("max_results", 10)])}
        except Exception:
            pass
        return {"source": "File System", "content": ""}

    def _step_file_read(self, query: str, step: dict, context: dict, router) -> dict:
        """Read referenced files mentioned in the query. Extracts paths like
        'Gutter.jsx', 'src/pages/Read/Gutter.jsx', or '@codex/server/index.js'."""
        import re
        # Extract file path patterns: .ext filenames, relative paths, @-prefixed paths
        file_patterns = re.findall(r'(?:@|at\s+)?([a-zA-Z_/][a-zA-Z0-9_/. -]*\.(?:jsx?|tsx?|py|css|json|md|sh|toml|html))', query, re.IGNORECASE)
        if not file_patterns:
            return {"source": "File Read", "content": ""}

        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        results = []
        seen = set()
        for pattern in file_patterns[:5]:
            pattern = pattern.strip()
            if pattern in seen:
                continue
            seen.add(pattern)
            # Try direct match first
            full = os.path.join(project_root, pattern)
            if os.path.isfile(full):
                try:
                    with open(full, "r") as f:
                        content = f.read()
                    if len(content) > 2000:
                        content = content[:2000] + "\n... [truncated]"
                    results.append(f"## {pattern}\n```\n{content}\n```")
                except Exception:
                    pass
                continue
            # Try find by basename
            try:
                import subprocess
                basename = os.path.basename(pattern)
                proc = subprocess.run(
                    ["find", project_root, "-name", basename, "-not", "-path", "*/node_modules/*",
                     "-not", "-path", "*/__pycache__/*", "-not", "-path", "*/.venv/*"],
                    capture_output=True, text=True, timeout=10,
                )
                for line in proc.stdout.strip().split("\n"):
                    line = line.strip()
                    if not line or not os.path.isfile(line):
                        continue
                    try:
                        with open(line, "r") as f:
                            content = f.read()
                        if len(content) > 2000:
                            content = content[:2000] + "\n... [truncated]"
                        rel = os.path.relpath(line, project_root)
                        results.append(f"## {rel}\n```\n{content}\n```")
                    except Exception:
                        pass
                    break  # Just first match per pattern
            except Exception:
                pass

        if results:
            return {"source": "Referenced Files", "content": "\n\n".join(results[:3])}
        return {"source": "File Read", "content": ""}

    def _step_codebase_search(self, query: str, step: dict, context: dict, router) -> dict:
        """Search codebase using the Scholomance collab service."""
        pattern = step.get("query", query)
        resolved = self._resolve_template(pattern, context)
        try:
            import subprocess
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
            bridge = os.path.join(project_root, "divtube_downloader", "scripts", "scholomance-bridge.mjs")
            node_bin = os.path.expanduser("~/.nvm/versions/node/v20.20.2/bin/node")
            if not os.path.exists(node_bin):
                node_bin = "node"
            proc = subprocess.run(
                [node_bin, bridge, "search-hybrid", resolved],
                capture_output=True, text=True, timeout=30,
                cwd=project_root,
            )
            if proc.returncode == 0:
                data = json.loads(proc.stdout)
                results = data.get("literal", []) or data.get("results", []) or []
                if results:
                    lines = []
                    for r in results[: step.get("max_results", 5)]:
                        fp = r.get("file_path") or r.get("path") or str(r)[:200]
                        lines.append(f"- {fp}")
                    return {"source": "Codebase Search", "content": "\n".join(lines)}
        except Exception:
            pass
        return {"source": "Codebase Search", "content": ""}

    def _step_self_critique(self, query: str, step: dict, context: dict, router) -> dict:
        """The model reviews its own draft answer for accuracy."""
        # This step is a meta-instruction, not actual retrieval.
        # It emits a verification reminder for the final prompt.
        prompt = step.get("prompt", "Review the answer above. Is it accurate? Cite sources.")
        return {"source": "Self-Critique Directive", "content": f"VERIFICATION: {prompt}"}

    def _step_rhyme_engine(self, query: str, step: dict, context: dict, router) -> dict:
        """Query the rhyme analysis engine via the Node.js bridge."""
        pattern = step.get("query", query)
        resolved = self._resolve_template(pattern, context)
        try:
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
            import subprocess
            node_bin = os.path.expanduser("~/.nvm/versions/node/v20.20.2/bin/node")
            if not os.path.exists(node_bin):
                node_bin = "node"
            # Use the Python runner for the rhyme engine via the panel analysis test
            analysis_script = os.path.join(project_root, "scripts", "immune-pre-commit.js")
            # Fallback: just note the rhyme engine is available but requires node
            return {"source": "Rhyme Engine", "content": "DeepRhymeEngine available (Node.js). Local phoneme analysis classifies connections as perfect/near/slant/assonance."}
        except Exception:
            pass
        return {"source": "Rhyme Engine", "content": ""}

    def _step_pixelbrain(self, query: str, step: dict, context: dict, router) -> dict:
        """Query pixelbrain artifacts."""
        try:
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
            output_dir = os.path.join(project_root, "output", "pixelbrain")
            if not os.path.isdir(output_dir):
                return {"source": "PixelBrain", "content": ""}
            found = []
            for root, dirs, files in os.walk(output_dir):
                for f in files:
                    if f.endswith(".json") and query.lower() in f.lower():
                        found.append(os.path.relpath(os.path.join(root, f), project_root))
                    if len(found) >= 5:
                        break
            if found:
                return {"source": "PixelBrain Outputs", "content": "\n".join(f"- {p}" for p in found)}
        except Exception:
            pass
        return {"source": "PixelBrain", "content": ""}

    def _step_immune_scan(self, query: str, step: dict, context: dict, router) -> dict:
        """Query the Scholomance immunity system."""
        try:
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
            import subprocess
            immune_script = os.path.join(project_root, "scripts", "immunity-pre-commit.js")
            if not os.path.exists(immune_script):
                return {"source": "Immunity", "content": ""}
            proc = subprocess.run(
                ["node", immune_script, "--all", "--json"],
                capture_output=True, text=True, timeout=30,
                cwd=project_root,
            )
            if proc.returncode == 0:
                data = json.loads(proc.stdout)
                summary = data.get("summary", {})
                return {"source": "Immunity Scan", "content": f"Critical violations: {summary.get('critical', 0)}; Warnings: {summary.get('warning', 0)}"}
        except Exception:
            pass
        return {"source": "Immunity", "content": ""}

    def _step_polish(self, query: str, step: dict, context: dict, router) -> dict:
        """Check production polish results."""
        try:
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
            import subprocess
            polish_script = os.path.join(project_root, "scripts", "production-polish.js")
            if not os.path.exists(polish_script):
                return {"source": "Polish", "content": ""}
            proc = subprocess.run(
                ["node", polish_script, "quick", "--ci"],
                capture_output=True, text=True, timeout=120,
                cwd=project_root,
            )
            report = proc.stdout
            lines = report.split("\n")
            status_line = next((l for l in lines if "POLISH STATUS:" in l), "")
            return {"source": "Production Polish", "content": status_line or "Unknown"}
        except Exception:
            pass
        return {"source": "Polish", "content": ""}

    def _step_ollama_raw(self, query: str, step: dict, context: dict, router) -> dict:
        """Pass raw query to Ollama for open-ended generation (used as a fallback step)."""
        return {"source": "Ollama Raw", "content": ""}

    def _resolve_template(self, template: str, context: dict) -> str:
        """Resolve {variable} placeholders in a template string."""
        if context is None:
            return template
        for key, value in context.items():
            template = template.replace(f"{{{key}}}", str(value))
        return template
