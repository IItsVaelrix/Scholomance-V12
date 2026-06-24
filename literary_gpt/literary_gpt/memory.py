import uuid
from datetime import datetime
from typing import List, Dict, Any
from literary_gpt.turboquant import TurboQuant
from literary_gpt.embeddings import EmbeddingService
from literary_gpt.storage import MemoryStorage

class VectorMemory:
    def __init__(self, db_path: str = "memory.sqlite"):
        self.storage = MemoryStorage(db_path)
        self.embedder = EmbeddingService()
        self.tq = TurboQuant()

    def add_memory(self, text: str, m_type: str, summary: str, source: str = "user", importance: float = 1.0, tags: List[str] = None):
        vec = self.embedder.embed(text)
        compressed = self.tq.encode(vec)
        
        cell = {
            "id": str(uuid.uuid4()),
            "type": m_type,
            "source": source,
            "raw_text": text,
            "summary": summary,
            "compressed_embedding": compressed,
            "importance": importance,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "tags": tags or []
        }
        self.storage.insert(cell)
        return cell['id']

    def search(self, query: str, top_k: int = 3, threshold: float = 0.4) -> List[Dict[str, Any]]:
        query_vec = self.embedder.embed(query)
        all_cells = self.storage.get_all()
        
        results = []
        for cell in all_cells:
            sim = self.tq.similarity(query_vec, cell['compressed_embedding'])
            # Score factors in importance
            score = sim * cell['importance']
            if sim >= threshold:
                results.append((score, cell))
                
        results.sort(key=lambda x: x[0], reverse=True)
        return [r[1] for r in results[:top_k]]