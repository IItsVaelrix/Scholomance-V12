"""
Vaelrix Cortex ForceField — Code Brain.

Lightweight repo analysis: extracts keywords from the query, searches the
project for relevant files/symbols, and returns structured findings without
invoking a second LLM.

This brain is evidence-based: every finding is backed by a real file/search
call (ripgrep) and routed through the Search Governor so the ForceField
remains auditable and budget-aware.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

from ..search_governor import should_allow_search
from ..types import (
    AmplifierBrain,
    AmplifierResult,
    EvidenceRef,
    ResonanceScore,
    ToolCallRequest,
    VaelrixCortexForceField,
)


CODE_BRAIN = AmplifierBrain(
    id="CODE_BRAIN",
    domain=["code", "engineering", "refactor", "debug"],
    activationSignals=["code", "bug", "fix", "refactor", "test", "error", "function", "class", "import"],
    allowedTools=["search_code", "read_file", "replace_file_content", "run_tests"],
    defaultSearchBudget=5,
)


_IGNORED_DIRS = {
    "node_modules", ".git", "dist", "build", ".cache", "coverage",
    "__pycache__", ".gradle", ".venv", "venv", "env", ".pytest_cache",
}


def _find_ripgrep() -> str | None:
    vendored = Path("node_modules") / ".bin" / "rg"
    if vendored.exists():
        return str(vendored)
    return shutil.which("rg")


def _project_root() -> Path:
    here = Path(__file__).resolve()
    for _ in range(8):
        if here == here.parent:
            break
        if any((here / marker).exists() for marker in (".git", "package.json", "pyproject.toml")):
            return here
        here = here.parent
    return Path.cwd()


def _extract_keywords(text: str) -> list[str]:
    """Pull out likely code-related keywords from the query."""
    import re

    ids = re.findall(r"[A-Za-z_][A-Za-z0-9_]*", text)
    stop = {
        "the", "a", "an", "this", "that", "is", "are", "was", "were",
        "be", "been", "being", "have", "has", "had", "do", "does", "did",
        "will", "would", "could", "should", "may", "might", "must", "can",
        "i", "you", "he", "she", "it", "we", "they", "my", "your", "our",
        "in", "on", "at", "to", "for", "of", "with", "by", "from", "and",
        "or", "but", "not", "no", "yes", "how", "what", "why", "where",
        "when", "who", "which", "whose", "fix", "bug", "code", "error",
        "function", "class", "import", "refactor", "test", "file",
    }
    keywords = [w for w in ids if len(w) > 2 and w.lower() not in stop]
    seen: set[str] = set()
    out: list[str] = []
    for k in keywords:
        kl = k.lower()
        if kl not in seen:
            seen.add(kl)
            out.append(k)
    return out[:6]


def _read_known_target(path: str, root: Path) -> EvidenceRef | None:
    """Read a confirmed file path directly when the governor blocks a search."""
    target = root / path
    if not target.exists():
        return None
    try:
        text = target.read_text(encoding="utf-8", errors="ignore").splitlines()
        first_non_empty = next((line.strip() for line in text if line.strip()), "")
        return EvidenceRef(
            source=str(target.relative_to(root) if target.is_relative_to(root) else target),
            snippet=first_non_empty[:120],
            relevance=0.9,
        )
    except Exception:
        return None


def _ripgrep_keyword(keyword: str, root: Path) -> list[EvidenceRef]:
    rg = _find_ripgrep()
    if not rg:
        return []

    cmd = [rg, "--json", "--line-number", "--max-count", "3", keyword]
    for d in _IGNORED_DIRS:
        cmd.extend(["--glob", f"!{d}/**"])

    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=10,
            cwd=root,
        )
    except Exception:
        return []

    if proc.returncode not in (0, 1):
        return []

    refs: list[EvidenceRef] = []
    for line in proc.stdout.splitlines():
        try:
            obj = json.loads(line)
        except Exception:
            continue
        if obj.get("type") != "match":
            continue
        data = obj.get("data", {})
        path = data.get("path", {}).get("text", "")
        line_no = data.get("line_number", 0)
        text = data.get("lines", {}).get("text", "").strip()
        refs.append(
            EvidenceRef(
                source=f"{path}:{line_no}",
                snippet=text[:120],
                relevance=0.7,
            )
        )
        if len(refs) >= 3:
            break
    return refs


def run_code_brain(
    field: VaelrixCortexForceField,
    query: str | None = None,
) -> AmplifierResult:
    """Run the Code Brain against the current ForceField.

    Searches are governed by should_allow_search and executed via ripgrep.
    The returned AmplifierResult contains real EvidenceRef objects and
    ToolCallRequest entries so the caller can read the most relevant files.
    """
    q = query or field.task.rawUserRequest
    keywords = _extract_keywords(q)
    root = _project_root()

    findings: list[str] = []
    evidence: list[EvidenceRef] = []
    requested_tool_calls: list[ToolCallRequest] = []
    searched_keywords: list[str] = []

    if not keywords:
        findings.append("No specific code identifiers detected in the request.")
        return AmplifierResult(
            brainId=CODE_BRAIN.id,
            summary="No actionable code targets found.",
            findings=findings,
            resonance=ResonanceScore(intentMatch=0.3, actionability=0.2),
        )

    for keyword in keywords:
        reason = f"Searching for code references to '{keyword}'"
        decision = should_allow_search(field, keyword, reason)

        if not decision.allowed:
            if decision.suggestedAlternative and "Read known target" in decision.suggestedAlternative:
                known_path = decision.suggestedAlternative.split(":", 1)[-1].strip()
                known_evidence = _read_known_target(known_path, root)
                if known_evidence:
                    evidence.append(known_evidence)
                    findings.append(f"Used confirmed target for '{keyword}': {known_evidence.source}")
                    requested_tool_calls.append(
                        ToolCallRequest(
                            tool="read_file",
                            args={"path": known_evidence.source},
                            reason=f"Confirmed target for '{keyword}'",
                        )
                    )
                continue
            findings.append(f"Search for '{keyword}' blocked: {decision.reason}")
            continue

        refs = _ripgrep_keyword(keyword, root)
        searched_keywords.append(keyword)
        if refs:
            evidence.extend(refs)
            files = sorted({ref.source.split(":")[0] for ref in refs})
            findings.append(f"'{keyword}' found in {len(files)} file(s): {', '.join(files[:3])}")
            # Request a read of the top hit so downstream stages have the full source.
            top_file = files[0]
            requested_tool_calls.append(
                ToolCallRequest(
                    tool="read_file",
                    args={"path": top_file},
                    reason=f"Top evidence for '{keyword}'",
                )
            )

    if not findings:
        findings.append(f"No direct matches for keywords: {', '.join(keywords)}")

    has_evidence = bool(evidence)
    return AmplifierResult(
        brainId=CODE_BRAIN.id,
        summary=f"Analyzed {len(keywords)} keyword(s); searched {len(searched_keywords)} via real file calls.",
        findings=findings,
        evidence=evidence[:5],
        recommendedAction="Read the top evidence files and confirm the relevant code location.",
        requestedToolCalls=requested_tool_calls[:5],
        resonance=ResonanceScore(
            intentMatch=0.8 if has_evidence else 0.4,
            evidenceStrength=0.8 if has_evidence else 0.2,
            novelty=0.6,
            conflictRisk=0.1,
            actionability=0.8 if has_evidence else 0.3,
        ),
    )
