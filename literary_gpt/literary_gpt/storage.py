import sqlite3
import json
import numpy as np

class MemoryStorage:
    def __init__(self, db_path: str = "memory.sqlite"):
        self.conn = sqlite3.connect(db_path)
        self.create_tables()

    def create_tables(self):
        self.conn.execute('''
            CREATE TABLE IF NOT EXISTS cells (
                id TEXT PRIMARY KEY,
                type TEXT,
                source TEXT,
                raw_text TEXT,
                summary TEXT,
                compressed_embedding BLOB,
                importance REAL,
                created_at TEXT,
                updated_at TEXT,
                tags TEXT
            )
        ''')
        self.conn.commit()

    def insert(self, cell: dict):
        self.conn.execute('''
            INSERT OR REPLACE INTO cells
            (id, type, source, raw_text, summary, compressed_embedding, importance, created_at, updated_at, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            cell['id'], cell['type'], cell['source'], cell['raw_text'], cell['summary'],
            cell['compressed_embedding'].tobytes(), cell['importance'],
            cell['created_at'], cell['updated_at'], json.dumps(cell['tags'])
        ))
        self.conn.commit()

    def get_all(self):
        cursor = self.conn.execute('SELECT * FROM cells')
        rows = cursor.fetchall()
        cells = []
        for r in rows:
            cells.append({
                'id': r[0], 'type': r[1], 'source': r[2], 'raw_text': r[3],
                'summary': r[4], 'compressed_embedding': np.frombuffer(r[5], dtype=np.uint8),
                'importance': r[6], 'created_at': r[7], 'updated_at': r[8],
                'tags': json.loads(r[9])
            })
        return cells