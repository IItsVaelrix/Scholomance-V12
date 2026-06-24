#!/usr/bin/env python3
"""
seed_scholomance.py — Ingest the FULL Scholomance Encyclopedia into the Substrate
=================================================================================
Loads every law, white paper, PDR, bug report, verdict, and document
into the 4-bit compressed substrate so the 1B model becomes a true
Scholomance expert.

Usage:
  python3 seed_scholomance.py                        # Full ingest
  python3 seed_scholomance.py --quick                 # LAW + White Papers + Personality only
  python3 seed_scholomance.py --db ~/custom/path.db   # Custom database
"""

import os
import sys
import json
import time
import argparse
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from substrate_engine import Substrate

# ─── Paths ────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent
ENCYCLOPEDIA = ROOT / "docs" / "scholomance-encyclopedia"
KNOWLEDGE_DIR = ROOT / "steamdeck_brain" / "knowledge"
DEFAULT_DB = "~/.substrate/memory.sqlite"


def tag_for_path(rel_path: str) -> dict:
    """Determine tag, tier, and source based on directory path."""
    p = rel_path.replace("\\", "/")
    
    # LAW
    if "Scholomance LAW" in p or p.startswith("VAELRIX_LAW") or p.startswith("RESONANCE_LAW"):
        return {"tag": "law", "tier": "core"}
    
    # White Papers
    if "Scholomance White Papers" in p or "White Papers" in p:
        return {"tag": "whitepaper", "tier": "foundation"}
    
    # PDR Archive
    if "PDR-archive" in p or p.endswith("-pdr.md") or p.endswith("-pdr.MD"):
        return {"tag": "pdr", "tier": "archive"}
    
    # Post-Implementation Reports
    if "post-implementation-reports" in p or p.startswith("PIR-"):
        return {"tag": "pir", "tier": "review"}
    
    # Verdicts
    if "Scholomance-Verdicts" in p or p.startswith("VERDICT-"):
        return {"tag": "verdict", "tier": "audit"}
    
    # Bug Reports
    if "Scholomance Bug Reports" in p or p.startswith("BUG-") or p.startswith("BUG-FIX-"):
        return {"tag": "bug", "tier": "incident"}
    
    # ARCH docs
    if "ARCH Scholomance Docs" in p or p.startswith("ARCH-"):
        return {"tag": "architecture", "tier": "design"}
    
    # Hand Offs
    if "Scholomance Hand Offs" in p or p.startswith("HANDOFF-"):
        return {"tag": "handoff", "tier": "transition"}
    
    # Changes
    if "Scholomance Changes" in p or p.startswith("CHANGE-"):
        return {"tag": "change", "tier": "log"}
    
    # Reports
    if "reports" in p or "post-implementation" in p:
        return {"tag": "report", "tier": "review"}
    
    # Bible
    if "scholomance-bible" in p or "BIBLE" in p or "bible" in p:
        return {"tag": "bible", "tier": "canon"}
    
    # Beginner's guide
    if "BEGINNER_GUIDE" in p:
        return {"tag": "guide", "tier": "reference"}
    
    # Fallback
    return {"tag": "reference", "tier": "ambient"}


def ingest_file_with_tag(substrate: Substrate, filepath: Path, chunk_size: int = 1024):
    """Read a file, chunk it, and store with appropriate tags."""
    try:
        text = filepath.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        print(f"  ⚠ Cannot read {filepath.name}: {e}")
        return []
    
    if not text.strip():
        return []
    
    # Determine relative path for tagging
    try:
        rel_path = str(filepath.relative_to(ROOT))
    except ValueError:
        rel_path = filepath.name
    tag_info = tag_for_path(rel_path)
    
    # Also try to extract a title from first line
    first_line = text.strip().split("\n")[0] if text.strip() else filepath.stem
    title = first_line.lstrip("#").strip() if first_line.startswith("#") else filepath.stem
    
    # Split into chunks
    chunks = text.split("\n\n")
    texts = []
    metadatas = []
    
    para_group = ""
    for para in chunks:
        para = para.strip()
        if not para:
            continue
        if len(para_group) + len(para) < chunk_size:
            para_group += para + "\n\n"
        else:
            if para_group.strip():
                texts.append(para_group.strip())
                metadatas.append({
                    **tag_info,
                    "source": rel_path,
                    "title": title,
                    "chunk": len(texts)
                })
            para_group = para + "\n\n"
    
    if para_group.strip():
        texts.append(para_group.strip())
        metadatas.append({
            **tag_info,
            "source": rel_path,
            "title": title,
            "chunk": len(texts)
        })
    
    if not texts:
        return []
    
    ids = substrate.store_batch(texts, metadatas)
    total_chars = sum(len(t) for t in texts)
    print(f"  ✓ {filepath.name} → {len(ids)} chunks ({total_chars} chars) [{tag_info['tag']}]")
    return ids


def seed_law_files(substrate: Substrate):
    """Ingest all LAW files."""
    law_dir = ENCYCLOPEDIA / "Scholomance LAW"
    if not law_dir.exists():
        print("  ⚠ LAW directory not found")
        return []
    
    files = sorted(law_dir.glob("*.md")) + sorted(law_dir.glob("*.txt"))
    all_ids = []
    for f in files:
        ids = ingest_file_with_tag(substrate, f)
        all_ids.extend(ids)
    total = len(all_ids)
    print(f"\n  📜 LAW: {len(files)} files, {total} chunks\n")
    total = len(all_ids)
    return all_ids


def seed_white_papers(substrate: Substrate):
    """Ingest all white papers."""
    wp_dir = ENCYCLOPEDIA / "Scholomance White Papers"
    if not wp_dir.exists():
        print("  ⚠ White Papers directory not found")
        return []
    
    files = sorted(wp_dir.glob("*.md"))
    all_ids = []
    for f in files:
        ids = ingest_file_with_tag(substrate, f)
        all_ids.extend(ids)
    total = len(all_ids)
    print(f"\n  📄 White Papers: {len(files)} files, {total} chunks\n")
    total = len(all_ids)
    return all_ids


def seed_pdr_archive(substrate: Substrate):
    """Ingest PDR archive files."""
    pdr_dir = ENCYCLOPEDIA / "PDR-archive"
    if not pdr_dir.exists():
        print("  ⚠ PDR-archive directory not found")
        return []
    
    files = sorted(pdr_dir.glob("*.md")) + sorted(pdr_dir.glob("*.MD"))
    all_ids = []
    for f in files:
        ids = ingest_file_with_tag(substrate, f)
        all_ids.extend(ids)
    total = len(all_ids)
    print(f"\n  🏛 PDR Archive: {len(files)} files, {total} chunks\n")
    total = len(all_ids)
    return all_ids


def seed_pirs(substrate: Substrate):
    """Ingest post-implementation reports."""
    pir_dir = ENCYCLOPEDIA / "post-implementation-reports"
    if not pir_dir.exists():
        print("  ⚠ PIR directory not found")
        return []
    
    files = sorted(pir_dir.glob("*.md"))
    all_ids = []
    for f in files:
        ids = ingest_file_with_tag(substrate, f)
        all_ids.extend(ids)
    total = len(all_ids)
    print(f"\n  📋 PIRs: {len(files)} files, {total} chunks\n")
    total = len(all_ids)
    return all_ids


def seed_verdicts(substrate: Substrate):
    """Ingest verdict files."""
    verdict_dir = ENCYCLOPEDIA / "Scholomance-Verdicts"
    if not verdict_dir.exists():
        print("  ⚠ Verdicts directory not found")
        return []
    
    files = sorted(verdict_dir.glob("*.md"))
    all_ids = []
    for f in files:
        ids = ingest_file_with_tag(substrate, f)
        all_ids.extend(ids)
    total = len(all_ids)
    print(f"\n  ⚖ Verdicts: {len(files)} files, {total} chunks\n")
    total = len(all_ids)
    return all_ids


def seed_bug_reports(substrate: Substrate):
    """Ingest bug reports."""
    bug_dir = ENCYCLOPEDIA / "Scholomance Bug Reports"
    if not bug_dir.exists():
        print("  ⚠ Bug Reports directory not found")
        return []
    
    files = sorted(bug_dir.glob("*.md"))
    all_ids = []
    for f in files:
        ids = ingest_file_with_tag(substrate, f)
        all_ids.extend(ids)
    total = len(all_ids)
    print(f"\n  🐛 Bug Reports: {len(files)} files, {total} chunks\n")
    total = len(all_ids)
    return all_ids


def seed_arch_docs(substrate: Substrate):
    """Ingest architecture docs."""
    arch_dir = ENCYCLOPEDIA / "ARCH Scholomance Docs"
    if not arch_dir.exists():
        print("  ⚠ ARCH docs directory not found")
        return []
    
    files = sorted(arch_dir.glob("*.md"))
    all_ids = []
    for f in files:
        ids = ingest_file_with_tag(substrate, f)
        all_ids.extend(ids)
    total = len(all_ids)
    print(f"\n  🏗 ARCH Docs: {len(files)} files, {total} chunks\n")
    total = len(all_ids)
    return all_ids


def seed_handoffs(substrate: Substrate):
    """Ingest handoff documents."""
    ho_dir = ENCYCLOPEDIA / "Scholomance Hand Offs"
    if not ho_dir.exists():
        print("  ⚠ Hand Offs directory not found")
        return []
    
    files = sorted(ho_dir.glob("*.md"))
    all_ids = []
    for f in files:
        ids = ingest_file_with_tag(substrate, f)
        all_ids.extend(ids)
    total = len(all_ids)
    print(f"\n  🤝 Handoffs: {len(files)} files, {total} chunks\n")
    total = len(all_ids)
    return all_ids


def seed_changes(substrate: Substrate):
    """Ingest change logs."""
    change_dir = ENCYCLOPEDIA / "Scholomance Changes"
    if not change_dir.exists():
        print("  ⚠ Changes directory not found")
        return []
    
    files = sorted(change_dir.glob("*.md"))
    all_ids = []
    for f in files:
        ids = ingest_file_with_tag(substrate, f)
        all_ids.extend(ids)
    total = len(all_ids)
    print(f"\n  📝 Changes: {len(files)} files, {total} chunks\n")
    total = len(all_ids)
    return all_ids


def seed_top_level(substrate: Substrate):
    """Ingest top-level markdown files in the encyclopedia root."""
    files = sorted(ENCYCLOPEDIA.glob("*.md"))
    all_ids = []
    for f in files:
        ids = ingest_file_with_tag(substrate, f)
        all_ids.extend(ids)
    total = len(all_ids)
    print(f"\n  📚 Encyclopedia root: {len(files)} files, {total} chunks\n")
    total = len(all_ids)
    return all_ids


def seed_personality(substrate: Substrate):
    """Ingest personality profiles."""
    jsonl_file = KNOWLEDGE_DIR / "personality_vaelrix.jsonl"
    if not jsonl_file.exists():
        print("  ⚠ Personality file not found")
        return []
    
    texts = []
    metadatas = []
    with open(jsonl_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            text = obj.pop("text", "")
            if text:
                texts.append(text)
                metadatas.append({
                    **obj,
                    "tag": obj.get("tag", "personality"),
                    "tier": obj.get("tier", "core"),
                    "source": "personality_vaelrix.jsonl"
                })
    
    if not texts:
        return []
    
    ids = substrate.store_batch(texts, metadatas)
    print(f"\n  🧠 Personality: {len(ids)} memories stored\n")
    return ids


def seed_knowledge_txt(substrate: Substrate):
    """Ingest the scholomance_knowledge.txt file."""
    txt_file = KNOWLEDGE_DIR / "scholomance_knowledge.txt"
    if txt_file.exists():
        return ingest_file_with_tag(substrate, txt_file)
    return []


def seed_bible(substrate: Substrate):
    """Ingest the Scholomance Bible and related verdicts."""
    bible_dir = ROOT / "docs" / "scholomance-bible"
    if not bible_dir.exists():
        print("  ⚠ Bible directory not found")
        return []
    
    files = sorted(bible_dir.glob("*.md"))
    all_ids = []
    for f in files:
        ids = ingest_file_with_tag(substrate, f)
        all_ids.extend(ids)
    total = len(all_ids)
    print(f"\n  📖 Bible: {len(files)} files, {total} chunks\n")
    
    # Also ingest Bible-related files
    skill_file = ROOT / "docs" / "skills" / "scholomance.bible.synthesis.skill.md"
    if skill_file.exists():
        ids = ingest_file_with_tag(substrate, skill_file)
        all_ids.extend(ids)
        print(f"  📖 Bible skill: {len(ids)} chunks")
    
    return all_ids

def get_stats(substrate: Substrate) -> dict:
    """Get substrate statistics."""
    import sqlite3
    conn = sqlite3.connect(substrate.db_path)
    cursor = conn.execute("SELECT COUNT(*), COALESCE(SUM(LENGTH(text)), 0) FROM memories")
    count, total_chars = cursor.fetchone()
    conn.close()
    
    # Get tag distribution
    conn = sqlite3.connect(substrate.db_path)
    cursor = conn.execute(
        "SELECT json_extract(metadata, '$.tag') as tag, COUNT(*) as cnt "
        "FROM memories GROUP BY tag ORDER BY cnt DESC"
    )
    tags = {row[0] or "none": row[1] for row in cursor.fetchall()}
    conn.close()
    
    # Estimate size (4-bit compressed)
    emb_size_mb = count * 384 * 0.5 / (1024 * 1024)  # 384 dims × 0.5 bytes per dim (4-bit)
    
    return {
        "total_memories": count,
        "total_chars": total_chars,
        "estimated_emb_size_mb": round(emb_size_mb, 2),
        "tags": tags
    }


def main():
    parser = argparse.ArgumentParser(description="Seed Scholomance knowledge into substrate")
    parser.add_argument("--db", "-d", default=DEFAULT_DB, help="Substrate DB path")
    parser.add_argument("--dim", type=int, default=384, help="Embedding dimension")
    parser.add_argument("--quick", "-q", action="store_true", help="Quick mode: LAW + White Papers + Personality only")
    parser.add_argument("--force", "-f", action="store_true", help="Recreate database from scratch")
    args = parser.parse_args()
    
    db_path = os.path.expanduser(args.db)
    
    if args.force:
        if os.path.exists(db_path):
            os.remove(db_path)
            print("  🗑 Removed existing database\n")
    
    print(f"  ⚡ Initializing substrate at: {db_path}")
    substrate = Substrate(db_path=db_path, dim=args.dim)
    
    total_start = time.time()
    all_ids = []
    
    print("\n" + "=" * 60)
    print("  📚 SEEDING SCHOLOMANCE ENCYCLOPEDIA")
    print("=" * 60 + "\n")
    
    # Always seed personality & knowledge base
    all_ids.extend(seed_personality(substrate))
    all_ids.extend(seed_knowledge_txt(substrate))
    
    if args.quick:
        # Quick mode: LAW + White Papers only
        print("\n  ⚡ QUICK MODE — LAW + White Papers only\n")
        all_ids.extend(seed_law_files(substrate))
        all_ids.extend(seed_white_papers(substrate))
    else:
        # Full mode: everything
        print("\n  📜 1/8 LAW Files...")
        all_ids.extend(seed_law_files(substrate))
        
        print("  📄 2/8 White Papers...")
        all_ids.extend(seed_white_papers(substrate))
        
        print("  🏛 3/8 PDR Archive...")
        all_ids.extend(seed_pdr_archive(substrate))
        
        print("  📋 4/8 Post-Implementation Reports...")
        all_ids.extend(seed_pirs(substrate))
        
        print("  ⚖ 5/8 Verdicts...")
        all_ids.extend(seed_verdicts(substrate))
        
        print("  🐛 6/8 Bug Reports...")
        all_ids.extend(seed_bug_reports(substrate))
        
        print("  🏗 7/8 Architecture Docs...")
        all_ids.extend(seed_arch_docs(substrate))
        
        print("  🤝 8/8 Handoffs, Changes & Root Docs...")
        all_ids.extend(seed_handoffs(substrate))
        all_ids.extend(seed_changes(substrate))
        all_ids.extend(seed_top_level(substrate))
        
        print("  📖 9/9 Bible & Skills...")
        all_ids.extend(seed_bible(substrate))
    
    elapsed = time.time() - total_start
    stats = get_stats(substrate)
    
    print("\n" + "=" * 60)
    print("  ✅ SEED COMPLETE")
    print("=" * 60)
    print(f"  ⏱  Time: {elapsed:.1f}s")
    print(f"  🧠 Total memories stored: {stats['total_memories']}")
    print(f"  📊 Total text: {stats['total_chars']:,} chars (~{stats['total_chars']/2500:.0f} tokens)")
    print(f"  💾 Estimated embedding storage: {stats['estimated_emb_size_mb']} MB (4-bit)")
    print(f"\n  🏷  Tag distribution:")
    for tag, count in stats['tags'].items():
        print(f"      {tag}: {count}")
    print()


if __name__ == "__main__":
    main()
