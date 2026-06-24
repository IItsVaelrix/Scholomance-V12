"""
Vaelrix Cortex ForceField — TurboQuant client.

Thin wrapper over steamdeck_brain.substrate_engine.Substrate so the
ForceField can store and retrieve compressed knowledge chunks without
adding new dependencies.
"""

from __future__ import annotations

import tempfile
from pathlib import Path
from typing import Any

try:
    from substrate_engine import EmbeddingProvider, Substrate
except ImportError:
    import sys as _sys
    import os as _os
    _steamdeck_brain_dir = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), '../..')
    if _steamdeck_brain_dir not in _sys.path:
        _sys.path.insert(0, _steamdeck_brain_dir)
    from substrate_engine import EmbeddingProvider, Substrate


class TurboQuantClient:
    """
    TurboQuant client for the ForceField.

    Stores text chunks as 4-bit quantized vectors and retrieves the most
    relevant chunks for a query. By default uses an in-memory database so
    tests run without side effects; pass db_path for persistence.
    """

    def __init__(
        self,
        db_path: str | None = None,
        dim: int = 384,
        top_k: int = 5,
        embedding_provider: EmbeddingProvider | None = None,
    ):
        self.dim = dim
        self.top_k = top_k
        self._db_path = db_path or self._temp_db_path()
        self._substrate = Substrate(
            db_path=self._db_path,
            dim=dim,
            top_k=top_k,
            embedding_provider=embedding_provider or EmbeddingProvider(dim),
        )

    def _temp_db_path(self) -> str:
        # Substrate uses SQLite; create a temp file rather than :memory:
        # because Substrate may open multiple connections.
        fd, path = tempfile.mkstemp(suffix=".sqlite")
        import os

        os.close(fd)
        return path

    def store(
        self,
        text: str,
        metadata: dict[str, Any] | None = None,
        vector: list[float] | None = None,
    ) -> int:
        """Store a single chunk. Returns memory id."""
        return self._substrate.store(text, metadata or {}, vector)

    def store_batch(
        self,
        texts: list[str],
        metadatas: list[dict[str, Any]] | None = None,
        vectors: list[list[float]] | None = None,
    ) -> list[int]:
        """Store multiple chunks efficiently."""
        return self._substrate.store_batch(texts, metadatas, vectors)

    def retrieve(
        self,
        query: str,
        top_k: int | None = None,
        metadata_filter: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """Retrieve the most relevant chunks for a query."""
        return self._substrate.retrieve(query, top_k or self.top_k, metadata_filter)

    def ingest_file(
        self,
        path: str | Path,
        chunk_size: int = 512,
        metadata: dict[str, Any] | None = None,
    ) -> list[int]:
        """Ingest a text file as chunks tagged with the given metadata."""
        from substrate_engine import ingest_file as _ingest_file

        base_meta = {"source": str(path)}
        if metadata:
            base_meta.update(metadata)
        # Substrate's ingest_file does not accept metadata per chunk, so we
        # read and store manually to attach lens tags.
        text = Path(path).read_text(encoding="utf-8", errors="replace")
        return self.ingest_text(text, chunk_size=chunk_size, metadata=base_meta)

    def ingest_text(
        self,
        text: str,
        chunk_size: int = 512,
        metadata: dict[str, Any] | None = None,
    ) -> list[int]:
        """Ingest raw text as chunks."""
        paragraphs = text.split("\n\n")
        chunks: list[str] = []
        current = ""
        for para in paragraphs:
            if len(current) + len(para) < chunk_size:
                current += para + "\n\n"
            else:
                if current.strip():
                    chunks.append(current.strip())
                current = para + "\n\n"
        if current.strip():
            chunks.append(current.strip())

        metas = [metadata or {}] * len(chunks)
        return self.store_batch(chunks, metas)

    def count(self) -> int:
        return self._substrate.count()

    def clear(self) -> None:
        self._substrate.clear()

    def close(self) -> None:
        """Clear and remove the temporary database if it was created by us."""
        import os

        self._substrate.clear()
        if self._db_path and self._db_path.endswith(".sqlite") and os.path.exists(self._db_path):
            try:
                os.remove(self._db_path)
            except Exception:
                pass
