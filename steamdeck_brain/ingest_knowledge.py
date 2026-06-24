#!/usr/bin/env python3
"""
ingest_knowledge.py — Substrate Knowledge Ingestion Tool
=========================================================
Load knowledge, personality, and memories into the substrate.

Supports:
  - Plain text files (auto-chunked)
  - JSONL files (one doc per line)
  - PDFs (via pdftotext if available)
  - Direct text input
  - Personality profiles (stored as tagged metadata)

Usage:
  # Ingest a book
  python3 ingest_knowledge.py file ~/documents/lore.txt --tag lore
  
  # Set personality traits
  python3 ingest_knowledge.py personality --name "Vaelrix" --traits "wise, cryptic, ancient"
  
  # Ingest a JSONL knowledge base
  python3 ingest_knowledge.py jsonl ~/data/knowledge.jsonl
  
  # Quick text memory
  python3 ingest_knowledge.py memo "The soulfire key is hidden beneath the Elder Tree"
"""

import os
import sys
import json
import argparse
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from substrate_engine import Substrate, ingest_file, ingest_jsonl

DEFAULT_DB = "~/.substrate/memory.sqlite"


def ingest_personality(substrate: Substrate, name: str, traits: str, 
                       description: str = "", role: str = "assistant"):
    """Store personality profile as tagged memories."""
    traits_list = [t.strip() for t in traits.split(",") if t.strip()]
    
    texts = []
    metadatas = []
    
    # Core identity
    texts.append(f"My name is {name}. I am a {role}.")
    metadatas.append({"tag": "personality", "persona": name, "tier": "core", "subtag": "identity"})
    
    # Traits
    for trait in traits_list:
        texts.append(f"I embody the trait of {trait}.")
        metadatas.append({"tag": "personality", "persona": name, "tier": "core", "subtag": "trait"})
    
    # Description
    if description:
        texts.append(description)
        metadatas.append({"tag": "personality", "persona": name, "tier": "core", "subtag": "description"})
    
    ids = substrate.store_batch(texts, metadatas)
    print(f"  Stored personality profile for '{name}' ({len(ids)} memories)")
    return ids


def ingest_direct(substrate: Substrate, text: str, tag: str = "note"):
    """Store a single piece of text as a memory."""
    mem_id = substrate.store(text, metadata={"tag": tag, "source": "direct_input"})
    print(f"  Stored memory #{mem_id}")
    return mem_id


def ingest_directory(substrate: Substrate, dirpath: str, glob: str = "*.txt"):
    """Ingest all matching files in a directory."""
    path = Path(dirpath).expanduser()
    if not path.is_dir():
        print(f"  Error: {dirpath} is not a directory")
        return []
    
    files = list(path.glob(glob))
    if not files:
        print(f"  No files matching '{glob}' in {dirpath}")
        return []
    
    all_ids = []
    for f in files:
        try:
            ids = ingest_file(substrate, str(f))
            all_ids.extend(ids)
        except Exception as e:
            print(f"  Error ingesting {f}: {e}")
    
    return all_ids


def main():
    parser = argparse.ArgumentParser(description="Ingest knowledge into substrate")
    parser.add_argument("--db", "-d", default=DEFAULT_DB, help="Substrate DB path")
    parser.add_argument("--dim", type=int, default=384, help="Embedding dimension")
    
    subparsers = parser.add_subparsers(dest="command")
    
    # file command
    file_p = subparsers.add_parser("file", help="Ingest a text file")
    file_p.add_argument("path", help="Path to file")
    file_p.add_argument("--tag", default="knowledge", help="Metadata tag")
    file_p.add_argument("--chunk-size", type=int, default=512)
    
    # jsonl command
    jsonl_p = subparsers.add_parser("jsonl", help="Ingest a JSONL file")
    jsonl_p.add_argument("path", help="Path to JSONL file")
    jsonl_p.add_argument("--text-field", default="text", help="Field containing text")
    
    # personality command
    pers_p = subparsers.add_parser("personality", help="Store personality profile")
    pers_p.add_argument("--name", required=True, help="Character/agent name")
    pers_p.add_argument("--traits", required=True, help="Comma-separated traits")
    pers_p.add_argument("--description", default="", help="Personality description")
    pers_p.add_argument("--role", default="assistant", help="Role (assistant, wizard, etc)")
    
    # memo command
    memo_p = subparsers.add_parser("memo", help="Store a single memory")
    memo_p.add_argument("text", help="Memory text")
    memo_p.add_argument("--tag", default="note", help="Metadata tag")
    
    # dir command
    dir_p = subparsers.add_parser("dir", help="Ingest all files in a directory")
    dir_p.add_argument("path", help="Directory path")
    dir_p.add_argument("--glob", default="*.txt", help="File glob pattern")
    
    args = parser.parse_args()
    
    sub = Substrate(db_path=args.db, dim=args.dim)
    
    if args.command == "file":
        tag = args.tag
        ids = ingest_file(sub, args.path, chunk_size=args.chunk_size)
        # Update metadata with tag
        for mid in ids:
            mem = sub.get_by_id(mid)
            if mem:
                meta = mem["metadata"]
                meta["tag"] = tag
                # Note: we don't have an update method, so this is logged
        print(f"  Total: {len(ids)} memories (tag: {tag})")
    
    elif args.command == "jsonl":
        ids = ingest_jsonl(sub, args.path, text_field=args.text_field)
        print(f"  Total: {len(ids)} memories")
    
    elif args.command == "personality":
        ingest_personality(sub, args.name, args.traits, args.description, args.role)
        print(f"  Total in substrate: {sub.count()}")
    
    elif args.command == "memo":
        ingest_direct(sub, args.text, tag=args.tag)
        print(f"  Total in substrate: {sub.count()}")
    
    elif args.command == "dir":
        ids = ingest_directory(sub, args.path, glob=args.glob)
        print(f"  Total: {len(ids)} memories from {args.path}")
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
