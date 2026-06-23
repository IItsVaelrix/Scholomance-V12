import os
import re
from typing import Dict, List


class ReferenceBlock:
    def __init__(self, name, principle="", deterministic_checks=None,
                 failure_modes=None, critique_language=None, scoring_impact=""):
        self.name = name
        self.principle = principle
        self.deterministic_checks = deterministic_checks or []
        self.failure_modes = failure_modes or []
        self.critique_language = critique_language or {}
        self.scoring_impact = scoring_impact


def parse_reference_file(filepath: str) -> ReferenceBlock:
    with open(filepath, "r") as f:
        content = f.read()

    name_match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
    name = name_match.group(1).strip() if name_match else os.path.basename(filepath)

    sections = _split_sections(content)

    critique_language = {}
    cl_text = sections.get("critique language", "")
    for line in cl_text.strip().split("\n"):
        line = line.strip()
        if "|" in line and not line.startswith("|--") and not line.startswith("| Flag"):
            parts = [p.strip() for p in line.split("|")]
            parts = [p for p in parts if p]
            if len(parts) >= 2:
                critique_language[parts[0]] = parts[1]

    return ReferenceBlock(
        name=name,
        principle=sections.get("principle", "").strip(),
        deterministic_checks=[
            line.strip() for line in sections.get("deterministic checks", "").strip().split("\n") if line.strip()
        ],
        failure_modes=[
            line.strip() for line in sections.get("failure modes", "").strip().split("\n") if line.strip()
        ],
        critique_language=critique_language,
        scoring_impact=sections.get("scoring impact", "").strip(),
    )


def _split_sections(content: str) -> Dict[str, str]:
    sections = {}
    current_section = None
    current_lines = []

    for line in content.split("\n"):
        if line.startswith("## "):
            if current_section:
                sections[current_section] = "\n".join(current_lines)
            current_section = line[3:].strip().lower()
            current_lines = []
        else:
            current_lines.append(line)

    if current_section:
        sections[current_section] = "\n".join(current_lines)

    return sections


def load_all_references(ref_dir: str = None) -> List[ReferenceBlock]:
    if ref_dir is None:
        ref_dir = os.path.join(os.path.dirname(__file__), "..", "references", "seo")
    ref_dir = os.path.normpath(ref_dir)

    if not os.path.isdir(ref_dir):
        return []

    blocks = []
    for fname in sorted(os.listdir(ref_dir)):
        if fname.endswith(".md"):
            blocks.append(parse_reference_file(os.path.join(ref_dir, fname)))
    return blocks
