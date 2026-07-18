from __future__ import annotations

import gzip
import hashlib
import sys
import xml.etree.ElementTree as ET
from dataclasses import dataclass

PINNED_OEWN_URLS = {
    "2024": "https://en-word.net/static/english-wordnet-2024.xml.gz",
}


def strip_ns(tag: str) -> str:
    return tag.rsplit("}", 1)[-1] if "}" in tag else tag


def open_maybe_gzip(path: str):
    with open(path, "rb") as probe:
        head = probe.read(4)

    if head.startswith(b"\x1f\x8b"):
        return gzip.open(path, "rb")

    if path.endswith(".gz") and head.lstrip().startswith(b"<"):
        print(
            f"Warning: {path} ends with .gz but appears to be plain XML; reading without decompression.",
            file=sys.stderr,
        )
        return open(path, "rb")

    if path.endswith(".gz"):
        preview = head.decode("utf-8", errors="replace").replace("\n", "\\n").replace("\r", "\\r")
        raise SystemExit(
            f"Expected a gzip-compressed XML file at '{path}', but it is not gzip. "
            f"File starts with: {preview!r}. "
            "This often means the download failed (for example: a 'Not Found' response)."
        )

    return open(path, "rb")


def file_sha256(path: str) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


@dataclass
class ParseResult:
    release: str
    sense_to_synset: dict[str, str]
    asserted: list[tuple[str, str, str]]


@dataclass
class ProjectionResult:
    asserted_count: int
    resolved_asserted_count: int
    unresolved_asserted_count: int
    resolution_ratio: float
    unresolved_ratio: float
    projected_pairs: set[tuple[str, str]]
    projected_count_after_closure: int


def parse_oewn_antonyms(path: str) -> ParseResult:
    """Parse an LMF file in two streaming passes without retaining its tree."""
    release = ""
    sense_to_synset: dict[str, str] = {}

    with open_maybe_gzip(path) as source:
        for _, elem in ET.iterparse(source, events=("end",)):
            tag = strip_ns(elem.tag)
            if tag == "Sense":
                sense_id = elem.get("id")
                synset_id = elem.get("synset")
                if sense_id and synset_id:
                    sense_to_synset[sense_id] = synset_id
            elif tag == "Lexicon":
                release = elem.get("version", release)
            if tag in {"Sense", "LexicalEntry", "Lexicon"}:
                elem.clear()

    asserted: list[tuple[str, str, str]] = []
    with open_maybe_gzip(path) as source:
        for _, elem in ET.iterparse(source, events=("end",)):
            tag = strip_ns(elem.tag)
            if tag == "Sense":
                source_id = elem.get("id")
                if source_id:
                    for child in elem:
                        if strip_ns(child.tag) == "SenseRelation" and child.get("relType") == "antonym":
                            target_id = child.get("target")
                            if target_id:
                                asserted.append(("sense", source_id, target_id))
            elif tag == "Synset":
                source_id = elem.get("id")
                if source_id:
                    for child in elem:
                        if strip_ns(child.tag) == "SynsetRelation" and child.get("relType") == "antonym":
                            target_id = child.get("target")
                            if target_id:
                                asserted.append(("synset", source_id, target_id))
            if tag in {"Sense", "Synset", "LexicalEntry", "Lexicon"}:
                elem.clear()

    return ParseResult(release, sense_to_synset, asserted)


def project_antonyms(parsed: ParseResult, existing_synsets: set[str]) -> ProjectionResult:
    """Resolve asserted edges, then add reciprocal pairs without affecting metrics."""
    projected_pairs: set[tuple[str, str]] = set()
    resolved_count = 0

    for endpoint_kind, source_id, target_id in parsed.asserted:
        if endpoint_kind == "sense":
            source_synset = parsed.sense_to_synset.get(source_id)
            target_synset = parsed.sense_to_synset.get(target_id)
        else:
            source_synset = source_id
            target_synset = target_id

        if (
            source_synset is None
            or target_synset is None
            or source_synset not in existing_synsets
            or target_synset not in existing_synsets
        ):
            continue

        resolved_count += 1
        projected_pairs.add((source_synset, target_synset))
        projected_pairs.add((target_synset, source_synset))

    asserted_count = len(parsed.asserted)
    unresolved_count = asserted_count - resolved_count
    resolution_ratio = resolved_count / asserted_count if asserted_count else 0.0
    unresolved_ratio = unresolved_count / asserted_count if asserted_count else 0.0

    return ProjectionResult(
        asserted_count=asserted_count,
        resolved_asserted_count=resolved_count,
        unresolved_asserted_count=unresolved_count,
        resolution_ratio=resolution_ratio,
        unresolved_ratio=unresolved_ratio,
        projected_pairs=projected_pairs,
        projected_count_after_closure=len(projected_pairs),
    )
