"""
Search Governor — behavioral/architectural guardrail for agent search loops.

Provides:
  - Structured search findings and agent memory types
  - A governor that decides whether another search is worthwhile
  - A batched ripgrep primitive that fires one tool call for many queries

Usage:
    from tui.utils.search_governor import AgentMemory, SearchFinding, shouldSearchAgain, ripgrepMany

    memory = AgentMemory()
    findings = ripgrepMany(["login", "session", "auth", "middleware"])
    memory.searchHistory.extend(findings)

    if shouldSearchAgain(memory, "createLoginRoute"):
        ...
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable


@dataclass
class SearchFinding:
    """A single batched-search result for one query."""

    query: str
    files: list[str]
    symbols: list[str] = field(default_factory=list)
    confidence: float = 0.0
    reason: str = ""

    def __post_init__(self):
        # Confidence is derived from signal density: files + symbols.
        if self.confidence == 0.0 and (self.files or self.symbols):
            score = min(len(self.files), 10) * 0.05 + min(len(self.symbols), 10) * 0.03
            self.confidence = round(min(score + 0.1, 1.0), 2)
            self.reason = f"{len(self.files)} file(s), {len(self.symbols)} symbol(s) matched"


@dataclass
class AgentMemory:
    """Lightweight working memory used by the search governor."""

    confirmedFiles: dict[str, str] = field(default_factory=dict)
    confirmedSymbols: dict[str, str] = field(default_factory=dict)
    rejectedPaths: dict[str, str] = field(default_factory=dict)
    searchHistory: list[SearchFinding] = field(default_factory=list)


def shouldSearchAgain(memory: AgentMemory, next_query: str) -> bool:
    """
    Decide whether the agent should run another search.

    Rules:
      1. Never search the exact same query twice (case-insensitive).
      2. If we already have a high-confidence hit (>= 0.8) after 3+ searches,
         stop thrashing and use what we found.
    """
    normalized = next_query.strip().lower()
    if not normalized:
        return False

    repeated = any(
        item.query.strip().lower() == normalized for item in memory.searchHistory
    )
    if repeated:
        return False

    high_confidence_target = any(
        item.confidence >= 0.8 and item.files for item in memory.searchHistory
    )
    if high_confidence_target and len(memory.searchHistory) >= 3:
        return False

    return True


# Directories and files that should never pollute codebase search results.
_DEFAULT_IGNORED_DIRS = {
    "node_modules",
    ".git",
    "dist",
    "build",
    ".cache",
    "coverage",
    "__pycache__",
    ".gradle",
    ".venv",
    "venv",
    "env",
}


def _resolve_root(root: str | Path | None = None) -> Path:
    """Walk upward until we find a project root marker."""
    if root is None:
        here = Path(__file__).resolve()
        root = here.parent
        for _ in range(8):
            if root == root.parent:
                break
            if any((root / marker).exists() for marker in (".git", "package.json", "pyproject.toml")):
                break
            root = root.parent
    return Path(root).resolve()


def _find_ripgrep() -> str | None:
    """Locate the rg binary; prefers project-local node_modules copy."""
    project_root = _resolve_root()
    vendored = project_root / "node_modules" / ".bin" / "rg"
    if vendored.exists():
        return str(vendored)
    return shutil.which("rg")


def ripgrepMany(
    queries: Iterable[str],
    *,
    root: str | Path | None = None,
    include: str | None = None,
    max_results_per_query: int = 200,
    timeout: int = 30,
) -> list[SearchFinding]:
    """
    Fire a single ripgrep invocation for many queries and bucket the results.

    Example:
        findings = ripgrepMany([
            "login",
            "session",
            "auth",
            "middleware",
            "createLoginRoute",
        ])

    Returns one SearchFinding per input query.
    """
    cleaned_queries = [q.strip() for q in queries if q.strip()]
    if not cleaned_queries:
        return []

    rg_bin = _find_ripgrep()
    if rg_bin is None:
        raise RuntimeError(
            "ripgrep (rg) not found. Install it or run `npm install` to fetch @vscode/ripgrep."
        )

    search_root = _resolve_root(root)

    cmd = [rg_bin, "--json", "--line-number", "--no-heading"]
    for q in cleaned_queries:
        cmd.extend(["-e", q])

    for d in _DEFAULT_IGNORED_DIRS:
        cmd.extend(["--glob", f"!{d}/**"])

    if include:
        cmd.extend(["--glob", include])

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=timeout,
        cwd=search_root,
    )

    # ripgrep returns 1 when no matches are found; that is not a failure here.
    if result.returncode not in (0, 1):
        raise RuntimeError(f"ripgrep failed (code {result.returncode}): {result.stderr}")

    # Bucket matches by query.
    files_by_query: dict[str, set[str]] = {q: set() for q in cleaned_queries}
    symbols_by_query: dict[str, set[str]] = {q: set() for q in cleaned_queries}

    for line in result.stdout.splitlines():
        if not line.strip():
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue

        if obj.get("type") != "match":
            continue

        data = obj.get("data", {})
        path = data.get("path", {}).get("text", "")
        lines_data = data.get("lines", {})
        matched_text = lines_data.get("text", "")

        # ripgrep --json does not tell us which -e pattern matched directly,
        # so we re-test against our query list. This is cheap and keeps the
        # call as one subprocess invocation.
        lower_text = matched_text.lower()
        for q in cleaned_queries:
            if q.lower() in lower_text:
                files_by_query[q].add(path)
                # Treat a plausible symbol as anything identifier-like on the line.
                symbols_by_query[q].update(_extract_symbols(matched_text, q))

    findings: list[SearchFinding] = []
    for q in cleaned_queries:
        files = sorted(files_by_query[q])[:max_results_per_query]
        symbols = sorted(symbols_by_query[q])[:max_results_per_query]
        findings.append(
            SearchFinding(
                query=q,
                files=files,
                symbols=symbols,
                confidence=0.0,
                reason="",
            )
        )

    return findings


def _extract_symbols(line: str, query: str) -> list[str]:
    """Naive symbol extractor: pull identifier-like tokens containing the query."""
    import re

    tokens = re.findall(r"[A-Za-z_][A-Za-z0-9_]*", line)
    return [t for t in tokens if query.lower() in t.lower()]
