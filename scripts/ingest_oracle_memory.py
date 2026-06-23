#!/usr/bin/env python3
"""
Oracle TurboQuant Memory Cell Ingestion
Downloads classic texts, extracts dialogue, quantizes to a Markov transition matrix,
and stores them in oracle_memory.sqlite.

Usage:
  python scripts/ingest_oracle_memory.py --db oracle_memory.sqlite
"""

import argparse
import re
import sqlite3
import urllib.request
import string
from collections import defaultdict
from pathlib import Path

DEFAULT_DB_PATH = "oracle_memory.sqlite"

# A curated list of highly conversational classic texts
GUTENBERG_SOURCES = [
    {"pg_id": 1524, "title": "Hamlet", "author": "William Shakespeare"},
    {"pg_id": 11, "title": "Alice's Adventures in Wonderland", "author": "Lewis Carroll"},
    {"pg_id": 1342, "title": "Pride and Prejudice", "author": "Jane Austen"},
    {"pg_id": 84, "title": "Frankenstein", "author": "Mary Shelley"},
    {"pg_id": 2701, "title": "Moby Dick", "author": "Herman Melville"},
    {"pg_id": 4300, "title": "Ulysses", "author": "James Joyce"},
    {"pg_id": 1497, "title": "The Republic", "author": "Plato"},
    {"pg_id": 28054, "title": "The Brothers Karamazov", "author": "Fyodor Dostoyevsky"}
]

START_MARKERS = [
    "*** START OF THIS PROJECT GUTENBERG EBOOK",
    "*** START OF THE PROJECT GUTENBERG EBOOK",
]

END_MARKERS = [
    "*** END OF THIS PROJECT GUTENBERG EBOOK",
    "*** END OF THE PROJECT GUTENBERG EBOOK",
]

# Regex to capture text within double quotes
DIALOGUE_RE = re.compile(r'["“”]([^"“”]+)["“”]')

def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS memory_cells (
            w1 TEXT,
            w2 TEXT,
            w3 TEXT,
            weight INTEGER,
            PRIMARY KEY (w1, w2, w3)
        );
        CREATE INDEX IF NOT EXISTS idx_w1_w2 ON memory_cells(w1, w2);
    """)

def fetch_gutenberg_text(pg_id: int) -> str:
    url = f"https://www.gutenberg.org/cache/epub/{pg_id}/pg{pg_id}.txt"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req) as response:
            text = response.read().decode("utf-8-sig")
            return text
    except Exception as e:
        print(f"Failed to fetch {pg_id}: {e}")
        return ""

def strip_gutenberg_boilerplate(text: str) -> str:
    start_idx = 0
    end_idx = len(text)
    
    for marker in START_MARKERS:
        idx = text.find(marker)
        if idx != -1:
            start_idx = text.find("\n", idx) + 1
            break
            
    for marker in END_MARKERS:
        idx = text.find(marker, start_idx)
        if idx != -1:
            end_idx = idx
            break
            
    return text[start_idx:end_idx].strip()

def tokenize(text: str) -> list[str]:
    # Lowercase, strip punctuation except basic sentence enders
    text = text.lower()
    text = re.sub(f"[{re.escape(string.punctuation.replace('.', '').replace('?', '').replace('!', ''))}]", "", text)
    tokens = text.split()
    return tokens

def build_turboquant_matrix(dialogues: list[str]) -> dict:
    # Bigram Markov Chain with frequencies
    transitions = defaultdict(int)
    
    for dialogue in dialogues:
        tokens = tokenize(dialogue)
        if len(tokens) < 3:
            continue
        # Add START markers
        tokens = ["__START1__", "__START2__"] + tokens + ["__END__"]
        
        for i in range(len(tokens) - 2):
            w1 = tokens[i]
            w2 = tokens[i+1]
            w3 = tokens[i+2]
            transitions[(w1, w2, w3)] += 1
            
    # TurboQuant Pruning: Minimal pruning to allow long chains
    pruned = {k: v for k, v in transitions.items()}
    return pruned

def ingest_all(db_path: str):
    conn = sqlite3.connect(db_path)
    init_db(conn)
    
    all_dialogues = []
    
    for source in GUTENBERG_SOURCES:
        print(f"Fetching '{source['title']}' ({source['pg_id']})...")
        raw_text = fetch_gutenberg_text(source["pg_id"])
        if not raw_text:
            continue
            
        clean_text = strip_gutenberg_boilerplate(raw_text)
        
        # In a play like Hamlet, there aren't many quotes, dialogue is the whole text minus stage directions.
        # But for novels, we extract explicit quotes.
        if source["pg_id"] == 1524: # Hamlet
            # Split by line and treat most spoken lines as dialogue
            lines = [l.strip() for l in clean_text.split("\n") if len(l.strip()) > 10 and not l.isupper()]
            dialogues = lines
        else:
            dialogues = DIALOGUE_RE.findall(clean_text)
            
        all_dialogues.extend(dialogues)
        print(f"  Extracted {len(dialogues)} memory fragments.")
        
    print(f"\nBuilding TurboQuant Transition Matrix for {len(all_dialogues)} fragments...")
    matrix = build_turboquant_matrix(all_dialogues)
    print(f"Condensed to {len(matrix)} active transition cells.")
    
    print("Writing to SQLite...")
    cursor = conn.cursor()
    cursor.execute("BEGIN TRANSACTION")
    
    # Upsert
    for (w1, w2, w3), weight in matrix.items():
        cursor.execute("""
            INSERT INTO memory_cells (w1, w2, w3, weight)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(w1, w2, w3) DO UPDATE SET weight = weight + excluded.weight
        """, (w1, w2, w3, weight))
        
    conn.commit()
    conn.close()
    print("TurboQuant Memory Cell infusion complete.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest Gutenberg Dialogue into TurboQuant Memory Cells")
    parser.add_argument("--db", default=DEFAULT_DB_PATH, help="Path to SQLite DB")
    args = parser.parse_args()
    ingest_all(args.db)
