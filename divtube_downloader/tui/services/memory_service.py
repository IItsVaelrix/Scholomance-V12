import sqlite3
import os
from datetime import datetime

class MemoryService:
    def __init__(self, db_path="divtube_memory.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            c = conn.cursor()
            c.execute('''CREATE TABLE IF NOT EXISTS critiques (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            timestamp TEXT,
                            file_path TEXT,
                            content TEXT,
                            critique TEXT
                         )''')
            conn.commit()

    def save_critique(self, file_path, content, critique):
        with sqlite3.connect(self.db_path) as conn:
            c = conn.cursor()
            c.execute("INSERT INTO critiques (timestamp, file_path, content, critique) VALUES (?, ?, ?, ?)",
                      (datetime.now().isoformat(), file_path, content, critique))
            conn.commit()

    def get_recent_critiques(self, limit=2):
        with sqlite3.connect(self.db_path) as conn:
            c = conn.cursor()
            c.execute("SELECT file_path, critique FROM critiques ORDER BY id DESC LIMIT ?", (limit,))
            rows = c.fetchall()
            if not rows:
                return "No previous critiques in memory."
            
            history = "PAST CRITIQUES MEMORY CONTEXT (Use this to compare against the user's past work):\n"
            for row in reversed(rows):
                history += f"- Past File: {row[0]}\n  Past Critique Summary: {row[1][:300]}...\n\n"
            return history

    def count(self):
        with sqlite3.connect(self.db_path) as conn:
            c = conn.cursor()
            c.execute("SELECT COUNT(*) FROM critiques")
            return c.fetchone()[0]
